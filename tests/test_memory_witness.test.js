'use strict';
// F2.16–F2.18 — witness behavior in memory_check.js (03e §8).
// Spawn-based CLI tests: the gate is invoked by agents and /retro as a command,
// so exit codes and stdout are part of the contract, not implementation details.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, '.agents', 'scripts', 'memory_check.js');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-witness-'));
  fs.mkdirSync(path.join(root, 'artifacts', 'memory'), { recursive: true });
  const target = path.join(root, 'artifacts', 'memory', 'active-decisions.md');
  fs.writeFileSync(target, '# Active Decisions\n\n### [DECISION] First [date: 2026-11-19] [agent: @developer]\n\n**Status:** active\n');
  return { root, target, rel: 'artifacts/memory/active-decisions.md' };
}

function run(root, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8', cwd: root });
}

test('witness: sign then check is clean', () => {
  const f = fixture();
  const signed = run(f.root, ['sign', f.rel]);
  assert.equal(signed.status, 0, signed.stdout + signed.stderr);
  assert.match(signed.stdout, /\[SIGNED\]/);
  assert.ok(fs.existsSync(path.join(f.root, '.agents', 'state', 'witness.json')));

  const checked = run(f.root, ['check', '--dir', 'artifacts/memory']);
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.match(checked.stdout, /Summary: \d+ file\(s\) checked/);
  assert.match(checked.stdout, /Witness: 1 OK/);
});

test('witness: first modification warns but does not block', () => {
  const f = fixture();
  run(f.root, ['sign', f.rel]);
  fs.appendFileSync(f.target, '\nfirst drift\n');
  const r = run(f.root, ['check', '--dir', 'artifacts/memory']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\[INTEGRITY-WARNING\]/);
  assert.doesNotMatch(r.stdout, /\[INTEGRITY-BLOCK\]/);
});

test('witness: second modification of the same file blocks (exit 1)', () => {
  const f = fixture();
  run(f.root, ['sign', f.rel]);
  fs.appendFileSync(f.target, '\nfirst drift\n');
  run(f.root, ['check', '--dir', 'artifacts/memory']);
  fs.appendFileSync(f.target, '\nsecond drift\n');
  const r = run(f.root, ['check', '--dir', 'artifacts/memory']);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /\[INTEGRITY-BLOCK\]/);
});

test('witness: re-signing resets the occurrence counter', () => {
  const f = fixture();
  run(f.root, ['sign', f.rel]);
  fs.appendFileSync(f.target, '\nfirst drift\n');
  run(f.root, ['check', '--dir', 'artifacts/memory']);
  fs.appendFileSync(f.target, '\nsecond drift\n');
  assert.equal(run(f.root, ['check', '--dir', 'artifacts/memory']).status, 1);

  assert.equal(run(f.root, ['sign', f.rel]).status, 0);
  const after = run(f.root, ['check', '--dir', 'artifacts/memory']);
  assert.equal(after.status, 0, after.stdout + after.stderr);
  assert.match(after.stdout, /Witness: 1 OK/);
});

test('witness: verify of an unsigned file is informational, not a failure', () => {
  const f = fixture();
  const r = run(f.root, ['verify', f.rel]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\[UNSIGNED\]/);
});

test('witness: list shows signed entries and their warning counts', () => {
  const f = fixture();
  run(f.root, ['sign', f.rel]);
  const r = run(f.root, ['list']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(f.rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(r.stdout, /warnings=0/);
});

test('F2.17: memory_write auto-signs the file it wrote', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-autowitness-'));
  fs.mkdirSync(path.join(root, 'artifacts', 'memory'), { recursive: true });
  const writer = path.join(REPO, '.agents', 'scripts', 'memory_write.js');
  const r = spawnSync(process.execPath, [writer,
    '--file', 'active-decisions.md',
    '--agent', '@developer',
    '--domain', 'DECISION',
    '--title', 'Auto-sign the canonical write path',
    '--content', 'Witness fingerprints must be created without relying on agent memory.',
  ], { encoding: 'utf8', cwd: root });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const registryPath = path.join(root, '.agents', 'state', 'witness.json');
  assert.ok(fs.existsSync(registryPath), 'canonical writes must populate the registry');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  assert.ok(registry['artifacts/memory/active-decisions.md'], 'signed path is the canonical rel path');
  assert.ok(registry['artifacts/memory/active-decisions.md'].sha256);
});

test('witness: a corrupt registry fails closed', () => {
  const f = fixture();
  const state = path.join(f.root, '.agents', 'state');
  fs.mkdirSync(state, { recursive: true });
  fs.writeFileSync(path.join(state, 'witness.json'), '{not json');
  const r = run(f.root, ['check', '--dir', 'artifacts/memory']);
  // 2 = usage/IO fail-closed (a corrupt registry is an unreadable input, not
  // a gate verdict). Any non-zero is the contract; 2 is the specific code.
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /WITNESS-CORRUPT/);
});
