/**
 * tests/test_orchestrator_dryrun.test.js — `complete --dry-run` must write NOTHING.
 *
 * Found by a blind /launch run (2026-10-08) whose agent was probing the tooling it was told to use.
 * `complete --dry-run` wrote to five files: pipeline-state.json, sprint-status.yaml, three telemetry
 * NDJSON streams, and artifacts/memory/project-context.md — SHARED memory. The flag was accepted and
 * ignored, so an agent rehearsing a command corrupted live state and nothing said so.
 *
 * The same run exposed the cause. The argument parser stepped `i += 2`, assuming every flag carries a
 * value, so any unrecognised flag silently ate the argument after it: `--dry-run --agent x` lost
 * `--agent` and reported "Missing --agent". That is how a flag ends up looking accepted while being
 * ignored, and it is the same defect class already found in step_tracker --root and design --spec.
 *
 * Every test here runs against a COPY of the repo's artifacts tree, so a regression writes into the
 * copy rather than into live state.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const ORCH = path.join(REPO, '.agents/scripts/orchestrator_state.js');

/** A sandbox with just enough artifacts for `complete` to find a state file. */
function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-dry-'));
  const out = path.join(dir, 'artifacts/output');
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts/memory'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/memory/project-context.md'), '# Project\n\n<!-- memory -->\n');
  fs.writeFileSync(
    path.join(out, 'pipeline-state.json'),
    JSON.stringify({
      current_phase: 'validation',
      phases: {},
      artifacts: {},
      history: [],
      change_requests: [],
      blockers: [],
      stories: {},
      completed_phases: [],
    }, null, 2)
  );
  return dir;
}

function run(dir, args) {
  const r = spawnSync('node', [ORCH, 'complete', ...args], {
    encoding: 'utf8',
    cwd: dir,
    maxBuffer: 32 * 1024 * 1024,
  });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

/** Every file under artifacts/, with mtime and content, so ANY write is detectable. */
function snapshot(dir) {
  const root = path.join(dir, 'artifacts');
  const acc = {};
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else acc[path.relative(root, full)] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(root);
  return acc;
}

test('--dry-run writes nothing at all, and says what it would have written', () => {
  const dir = sandbox();
  const before = snapshot(dir);
  const r = run(dir, ['--agent', 'a', '--artifact', 'x/y.md', '--dry-run']);
  const after = snapshot(dir);
  assert.deepStrictEqual(Object.keys(after).sort(), Object.keys(before).sort(),
    'a dry run created or removed files');
  for (const k of Object.keys(before)) {
    assert.strictEqual(after[k], before[k], `a dry run modified ${k}`);
  }
  assert.match(r.out, /"dry_run": true/);
  assert.match(r.out, /would_write/, 'a dry run must report what it would have done');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flag order does not matter: --dry-run before --agent must still parse', () => {
  const dir = sandbox();
  const before = snapshot(dir);
  // The old step-by-2 parser consumed `--dry-run` together with `--agent` and printed
  // "Missing --agent" while silently running the LIVE path.
  const r = run(dir, ['--dry-run', '--agent', 'a', '--artifact', 'x/y.md']);
  assert.doesNotMatch(r.out, /Missing --agent/);
  assert.match(r.out, /"dry_run": true/);
  assert.deepStrictEqual(snapshot(dir), before, 'a dry run must not write regardless of flag order');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('an unknown flag is reported rather than swallowing the next argument', () => {
  const dir = sandbox();
  const r = run(dir, ['--agent', 'a', '--bogus', '--artifact', 'x/y.md', '--dry-run']);
  assert.match(r.out, /Unknown flag for 'complete': --bogus/);
  assert.match(r.out, /"artifact": "x\/y\.md"/, 'the artifact flag must still be read');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a value flag with no value is a usage error (exit 2), not a confusing message', () => {
  const dir = sandbox();
  const r = run(dir, ['--agent']);
  assert.strictEqual(r.code, 2);
  assert.match(r.out, /Missing value for --agent/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('CONTROL: without --dry-run the artifact IS recorded (the test can detect writes)', () => {
  const dir = sandbox();
  const r = run(dir, ['--agent', 'a', '--artifact', 'x/y.md']);
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'artifacts/output/pipeline-state.json'), 'utf8'));
  assert.ok('x/y.md' in state.artifacts, 'the live path must record the artifact, or these tests prove nothing');
  assert.ok(!/"dry_run": true/.test(r.out));
  fs.rmSync(dir, { recursive: true, force: true });
});
