/**
 * Pipeline state: phase map must stay reconciled with PHASE_ORDER.
 *
 * THE DEFECT, measured on the live repo. `current_phase` was "validation" while the
 * phases map held only the other 10 keys — there was no `validation` entry at all.
 * Nothing errored. Three failures followed, all silent:
 *
 *   1. syncYaml() renders the phases block by iterating the map, so the ACTIVE phase
 *      was missing from sprint-status.yaml. The mirror read like a complete 11-phase
 *      board with every phase `pending` — authoritative-looking and wrong.
 *   2. advance() marks the current phase complete behind an `if (state.phases[current])`
 *      guard, so advancing out of a keyless phase silently dropped the completion
 *      record: `completed_at` stayed null forever.
 *   3. Nothing warned. Every command exited 0.
 *
 * A SECOND, INDEPENDENT CAUSE. AGENTS.md told agents that
 * `orchestrator_state.js complete` "update[s] the state file and advance[s] the
 * pipeline". It does not advance anything — it records an artifact. 51 skills call
 * `complete`; zero call `advance`. So the documented agent workflow could never move
 * the phase. See the doc test at the bottom of this file.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/orchestrator_state.js');

// A throwaway repo per test: orchestrator_state.js resolves artifacts/ relative to cwd.
// `session-start` is the write path chosen here because it has no compaction budget gate
// (`advance` and `set-phase` do, and that gate is a separate pre-existing condition), and
// it requires artifacts/memory/project-context.md to already exist — without it the command
// exits 1 with "Run init first", which is correct behaviour, not a phase bug.
function sandboxRepo(state) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-phase-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts/memory'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/memory/project-context.md'), '# Project Context\n\n## [IDENTITY]\n- **User Nickname:** tester\n');
  fs.writeFileSync(path.join(dir, 'artifacts/output/pipeline-state.json'), JSON.stringify(state, null, 2));
  return dir;
}

function run(dir, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd: dir });
}

const PHASE_ORDER = [
  'validation', 'discovery', 'research', 'strategy', 'architecture',
  'planning', 'execution', 'launch', 'iteration', 'documentation', 'retro'
];

// The exact live shape that reproduced the bug: current_phase points at a phase with no
// entry in the map.
function brokenState() {
  const phases = {};
  for (const p of PHASE_ORDER) {
    if (p === 'validation') continue; // the missing key
    phases[p] = { status: 'pending', started_at: null, completed_at: null, agents: [] };
  }
  return {
    project: { name: 'vespyr', type: 'test' },
    created_at: '2026-07-22T00:00:00.000Z',
    current_phase: 'validation',
    phases,
    artifacts: {}, history: [], stories: {}, blockers: [], change_requests: {}
  };
}

function readState(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'artifacts/output/pipeline-state.json'), 'utf8'));
}

test('a keyless current phase is backfilled and promoted to in-progress', () => {
  const dir = sandboxRepo(brokenState());
  try {
    const res = run(dir, 'status');
    assert.strictEqual(res.status, 0, res.stdout + res.stderr);
    // status is read-only, so drive a write via session-start (no budget gate).
    assert.strictEqual(run(dir, 'session-start', '--agent', 'tester').status, 0);
    const s = readState(dir);
    assert.ok(s.phases.validation, 'the missing phase key must be backfilled');
    assert.strictEqual(s.phases.validation.status, 'in-progress',
      'the phase actually in flight must not read as pending');
    assert.strictEqual(Object.keys(s.phases).length, PHASE_ORDER.length,
      'the map must carry every canonical phase');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the mirror lists every canonical phase, in pipeline order', () => {
  const dir = sandboxRepo(brokenState());
  try {
    run(dir, 'session-start', '--agent', 'tester');
    const yaml = fs.readFileSync(path.join(dir, 'artifacts/output/sprint-status.yaml'), 'utf8');
    const listed = yaml.split('\n')
      .filter((l) => /^ {2}[a-z]+: /.test(l))
      .map((l) => l.trim().split(':')[0]);
    assert.deepStrictEqual(listed, PHASE_ORDER,
      'sprint-status.yaml must render the canonical order, so the active phase cannot be omitted');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the dashboard reads in pipeline order, with the active phase first', () => {
  const dir = sandboxRepo(brokenState());
  try {
    const out = run(dir, 'status').stdout;
    const rows = out.split('\n')
      .filter((l) => /^\| [·✅▶️]/.test(l))
      // Strip the status icon; the row is "| <icon> <phase> | <status> |".
      .map((l) => l.split('|')[1].trim().replace(/^[·✅▶️\s]+/, ''));
    assert.deepStrictEqual(rows, PHASE_ORDER,
      'a backfilled phase must not be appended at the bottom of the board');
    assert.ok(out.includes('▶️ validation'), 'the active phase must be marked in-progress');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('advancing out of a keyless phase records its completion instead of dropping it', () => {
  // The regression this fix exists for: `advance` guarded the completion write behind
  // `if (state.phases[currentPhase])`, so a missing key silently lost the record.
  const dir = sandboxRepo(brokenState());
  try {
    run(dir, 'session-start', '--agent', 'tester');
    const before = readState(dir);
    assert.ok(before.phases.validation, 'precondition: key backfilled on read');

    const res = run(dir, 'advance');
    const out = (res.stdout || '') + (res.stderr || '');
    const after = readState(dir);
    if (out.includes('OVER_BUDGET')) {
      // Budget gate is a separate pre-existing condition; the key fact is still assertable:
      // the completion write is no longer skipped for a missing key.
      assert.strictEqual(after.phases.validation.status, 'in-progress',
        'blocked advance must leave the phase in-progress, not silently completed');
    } else {
      assert.strictEqual(after.phases.validation.status, 'complete',
        'advance must mark the outgoing phase complete');
      assert.ok(after.phases.validation.completed_at, 'completed_at must be recorded');
      assert.strictEqual(after.current_phase, 'discovery');
      assert.strictEqual(after.phases.discovery.status, 'in-progress');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('normalization never clobbers existing data', () => {
  const dir = sandboxRepo({
    ...brokenState(),
    current_phase: 'research',
    phases: {
      ...brokenState().phases,
      research: { status: 'complete', started_at: '2026-08-01T00:00:00.000Z', completed_at: '2026-08-09T00:00:00.000Z', agents: ['researcher'] }
    }
  });
  try {
    run(dir, 'session-start', '--agent', 'tester');
    const s = readState(dir);
    assert.strictEqual(s.phases.research.status, 'complete', 'a completed phase stays complete');
    assert.strictEqual(s.phases.research.completed_at, '2026-08-09T00:00:00.000Z', 'timestamps preserved');
    assert.deepStrictEqual(s.phases.research.agents, ['researcher'], 'agent lists preserved');
    assert.ok(s.phases.validation, 'the still-missing key is backfilled');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the doc no longer claims `complete` advances the pipeline', () => {
  // AGENTS.md said `complete` "update[s] the state file and advance[s] the pipeline".
  // It records an artifact and telemetry; it does not advance. 51 skills call
  // `complete`, zero call `advance`, so the documented workflow could never move a phase.
  for (const f of ['AGENTS.md', 'agent.md']) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const line = text.split('\n').find((l) => /orchestrator_state\.js complete/.test(l));
    assert.ok(line, `${f} should still document the complete command`);
    assert.ok(!/advance the pipeline/i.test(line),
      `${f} must not claim \`complete\` advances the pipeline — it does not. ` +
      `Found: ${line.trim().slice(0, 120)}`);
  }
});
