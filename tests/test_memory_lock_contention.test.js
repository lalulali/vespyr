/**
 * active-decisions.md has ONE lock — prove it.
 *
 * THE DEFECT THIS SUITE LOCKS. Before this fix, two lock files guarded the same file:
 *   memory_write.js  append/reclassify  -> .agents/state/memory.lock
 *   orchestrator_state.js compact/flush  -> .agents/state/orchestrator.lock
 * Neither excluded the other. Compaction snapshots active-decisions.md and later rewrites
 * it; an append that landed inside that window was overwritten by the stale snapshot and
 * vanished. The window is short, which is exactly why it survived review: it cannot be
 * reproduced by racing two commands and hoping.
 *
 * HOW THE RACE IS MADE DETERMINISTIC. A test-only fs shim (tests/fixtures/
 * slow-decisions-read.js) snapshots the file, writes a marker, then blocks for 2s before
 * returning the bytes. The test waits for the marker — so the compactor is provably
 * holding a stale snapshot — then runs a real memory_write append. With the lock, the
 * append waits and survives. Without it, the compactor writes stale content over it.
 *
 * These tests deliberately spawn real processes. In-process calls would share the test's
 * module state and could not exercise cross-process locking at all.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const ORCH = path.join(ROOT, '.agents/scripts/orchestrator_state.js');
const MEMWRITE = path.join(ROOT, '.agents/scripts/memory_write.js');
const HOOK = path.join(__dirname, 'fixtures/slow-decisions-read.js');

const TODAY = new Date().toISOString().split('T')[0];

function entry(domain, title, status) {
  return `### [${domain}] ${title} [date: ${TODAY}] [agent: @tester]\n` +
    `Body for ${title}.\n**Status:** ${status}\n`;
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-lock-'));
  fs.mkdirSync(path.join(dir, 'artifacts', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts', 'output'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.agents', 'state'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'),
    '# Active Decisions\n\nCritical active design choices.\n\n---\n\n' +
    entry('DECISION', 'Standing decision alpha', 'active') + '\n---\n\n' +
    entry('PROCESS', 'Finished work log', 'resolved') + '\n');
  fs.writeFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'), '# Lessons Learned\n');
  return dir;
}

function cleanEnv() {
  const { NODE_OPTIONS, VESPYR_SLOW_READ_MS, VESPYR_SLOW_READ_MARKER, ...rest } = process.env;
  return rest;
}

function startSlow(script, args, dir, marker, delayMs = 2000) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: dir,
    env: {
      ...cleanEnv(),
      NODE_OPTIONS: `--require ${HOOK}`,
      VESPYR_SLOW_READ_MS: String(delayMs),
      VESPYR_SLOW_READ_MARKER: marker,
      VESPYR_LOCK_TIMEOUT_MS: '10000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const done = new Promise((resolve) => {
    child.on('close', (code, signal) => resolve({ code, signal, stderr }));
  });
  return { child, done };
}

function waitForMarker(marker, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(marker)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
  throw new Error(`slow-read marker never appeared: ${marker}`);
}

function appendDecision(dir, title) {
  return spawnSync(process.execPath, [
    MEMWRITE,
    '--file', 'active-decisions.md',
    '--agent', '@tester',
    '--domain', 'DECISION',
    '--title', title,
    '--content', 'Written while a compactor held a stale snapshot of the file.'
  ], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...cleanEnv(), VESPYR_LOCK_TIMEOUT_MS: '10000' }
  });
}

function read(dir, file) {
  return fs.readFileSync(path.join(dir, 'artifacts/memory', file), 'utf8');
}

function cleanup(dir, child) {
  if (child && child.exitCode === null && child.signalCode === null) {
    try { child.kill('SIGKILL'); } catch { /* already gone */ }
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

test('compaction cannot drop an append made while it holds a stale snapshot', async () => {
  const dir = fixture();
  const marker = path.join(dir, 'compact.marker');
  const { child, done } = startSlow(ORCH, ['compact'], dir, marker);
  try {
    waitForMarker(marker);

    // The compactor has read the file and is blocked. Appending NOW is the race.
    const append = appendDecision(dir, 'Appended while compacting');
    assert.strictEqual(append.status, 0, append.stderr);

    const result = await done;
    assert.strictEqual(result.code, 0, result.stderr);

    const src = read(dir, 'active-decisions.md');
    assert.ok(src.includes('Appended while compacting'),
      'the append MUST survive compaction — this is the lost-update bug');
    assert.ok(src.includes('Standing decision alpha'),
      'pre-existing active entries must survive too');
    assert.ok(!src.includes('Finished work log'),
      'the resolved entry still retires (compaction itself must keep working)');
  } finally {
    cleanup(dir, child);
  }
});

test('flush-decisions cannot drop an append made while it holds a stale snapshot', async () => {
  const dir = fixture();
  const marker = path.join(dir, 'flush.marker');
  const { child, done } = startSlow(ORCH, ['flush-decisions'], dir, marker);
  try {
    waitForMarker(marker);

    const append = appendDecision(dir, 'Appended while flushing');
    assert.strictEqual(append.status, 0, append.stderr);

    const result = await done;
    assert.strictEqual(result.code, 0, result.stderr);

    const src = read(dir, 'active-decisions.md');
    assert.ok(src.includes('Appended while flushing'),
      'the append MUST survive flush-decisions — same lost-update shape as compaction');
    assert.ok(src.includes('Standing decision alpha'),
      'pre-existing active entries must survive too');

    const lessons = read(dir, 'lessons-learned.md');
    assert.ok(lessons.includes('Finished work log'),
      'the resolved decision still translates to a lesson');
  } finally {
    cleanup(dir, child);
  }
});
