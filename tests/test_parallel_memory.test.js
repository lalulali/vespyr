'use strict';
/**
 * 02o.6 — Parallel memory-write safety (DoD #1 + #5)
 *
 * DoD #1: 8 concurrent memory_write.js processes against the same file in a
 * sandbox → zero loss, exact-once membership, intact structure, session
 * attribution, complete ledger. Spawn-parallel per test_memory_fixes F4
 * precedent (all children started in one tick, never an execFileSync loop).
 *
 * DoD #5 (falsifiability — the intent-routing lesson): the sandbox scripts
 * are copied with lib/lock.js stubbed to pass-through and the probe is
 * re-run on a MISSING target file (header-race path). The probe MUST
 * reproduce ≥1 corruption mode within 5 rounds; if it never does, the lock
 * is not load-bearing and this test fails loudly.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const SCRIPTS = path.join(REPO, '.agents', 'scripts');
const MW = path.join(SCRIPTS, 'memory_write.js');

const TITLES = [
  'postgres index strategy', 'kanban column rename', 'login rate limiter',
  'docs citation format', 'cache eviction policy', 'onboarding email copy',
  'test fixture cleanup', 'span telemetry schema'
];

function makeSandbox(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `02o-${name}-`));
  fs.mkdirSync(path.join(dir, 'artifacts', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.agents', 'state'), { recursive: true });
  return dir;
}

function spawnWriters(dir, mwPath, file, titles) {
  const procs = titles.map(t => spawn(process.execPath, [
    mwPath, '--file', file, '--agent', '@test', '--domain', 'CODE',
    '--title', t, '--content', `unique body for ${t} with distinctive vocabulary`
  ], { cwd: dir, stdio: 'ignore' }));
  return Promise.all(procs.map(p => new Promise(res => p.on('exit', res))));
}

function readHeads(dir, file) {
  const raw = fs.readFileSync(path.join(dir, 'artifacts', 'memory', file), 'utf8');
  return { raw, heads: raw.match(/^### \[CODE\] .*$/gm) || [] };
}

test('02o DoD#1: 8 concurrent memory writers — zero loss, exact-once, attributed', async () => {
  const dir = makeSandbox('main');
  await spawnWriters(dir, MW, 'active-decisions.md', TITLES);

  const { raw, heads } = readHeads(dir, 'active-decisions.md');
  assert.match(raw, /^# Active Decisions\n/, 'file header intact (torn-structure mode absent)');
  assert.strictEqual(heads.length, TITLES.length, `entry count (lost/duplicate mode): got ${heads.length}`);
  assert.strictEqual(new Set(heads).size, TITLES.length, 'exact-once membership mode absent');
  for (const t of TITLES) {
    assert.ok(heads.some(h => h.includes(`] ${t} `)), `missing entry: ${t}`);
  }
  assert.strictEqual((raw.match(/\*\*Session:\*\* /g) || []).length, TITLES.length, 'session attribution present on every entry');

  const ledger = fs.readFileSync(path.join(dir, '.agents', 'state', 'memory-write-ledger.jsonl'), 'utf8')
    .trim().split('\n').map(l => JSON.parse(l));
  assert.strictEqual(ledger.length, TITLES.length, 'ledger completeness');
  assert.strictEqual(new Set(ledger.map(l => l.session_id)).size, 1, 'one window resolves to one session id');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('02o DoD#5: falsifiability — lock bypass reproduces corruption (planted-bypass probe)', async () => {
  const dir = makeSandbox('bypass');
  const sdir = path.join(dir, '.agents', 'scripts');
  fs.mkdirSync(path.join(sdir, 'lib'), { recursive: true });
  for (const f of ['memory_write.js', 'dedupe_validator.js', 'compaction_guard.js']) {
    fs.copyFileSync(path.join(SCRIPTS, f), path.join(sdir, f));
  }
  for (const f of ['fs_atomic.js', 'session.js']) {
    fs.copyFileSync(path.join(SCRIPTS, 'lib', f), path.join(sdir, 'lib', f));
  }
  // Planted bypass: pass-through lock (R0.2 planted-violation pattern) PLUS
  // a widened header-rename window (200ms busy-wait inside the sandbox's
  // fs_atomic). This makes the exists-check→rename race STRUCTURAL rather
  // than timing-dependent: all 8 writers pass exists-check before the first
  // rename lands, so every rename clobbers the previous writer's append.
  fs.writeFileSync(path.join(sdir, 'lib', 'lock.js'),
    "module.exports = { withLock: (_lockPath, fn) => fn() };\n");
  fs.writeFileSync(path.join(sdir, 'lib', 'fs_atomic.js'), [
    "'use strict';",
    "const fs = require('fs');",
    "function writeFileSync(p, data, enc) {",
    "  const end = Date.now() + 200;",
    "  while (Date.now() < end) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); }",
    "  const tmp = p + '.tmp.' + process.pid;",
    "  fs.writeFileSync(tmp, data, enc);",
    "  fs.renameSync(tmp, p);",
    "}",
    "module.exports = { writeFileSync };",
    ""
  ].join('\n'));
  const MW2 = path.join(sdir, 'memory_write.js');

  const target = path.join(dir, 'artifacts', 'memory', 'active-decisions.md');
  let corrupted = null;
  for (let round = 0; round < 3 && corrupted === null; round++) {
    fs.rmSync(target, { force: true }); // force every writer through header-init
    await spawnWriters(dir, MW2, 'active-decisions.md', TITLES);
    const { raw, heads } = readHeads(dir, 'active-decisions.md');
    const modes = [];
    if (!/^# Active Decisions\n/.test(raw)) modes.push('torn-structure');
    if (heads.length !== TITLES.length) modes.push(`lost/duplicate (${heads.length}/${TITLES.length})`);
    if (new Set(heads).size !== heads.length) modes.push('duplicate-membership');
    if (modes.length > 0) corrupted = { round, modes };
  }
  assert.ok(corrupted,
    'bypass probe did NOT reproduce corruption in 5 rounds — the memory lock is not provably load-bearing; investigate before shipping');
  fs.rmSync(dir, { recursive: true, force: true });
});
