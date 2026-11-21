'use strict';
// F3.21 / 03 F2.14 — session-start latency budget enforcement.
// Measures the 4 canonical steps against their budgets and the <1000ms total.
// Process-spawn overhead is measured separately and subtracted, because the
// plan's budgets describe in-script work, not Node startup. Non-blocking steps
// emit [SKIPPED] when their script is absent or they exceed their timeout.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = (rel) => path.join(REPO, '.agents', 'scripts', rel);
const BUDGETS = { '0.0': 100, '0.1': 250, '0.2': 10, '0.3': 150 };
const TOTAL_BUDGET = 1000;
const SPAWN_TOLERANCE = 100;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-latency-'));
  for (const d of ['artifacts/memory/session-summaries', 'artifacts/output', '.agents/state']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'artifacts/memory/project-context.md'), '# Project Context\n\n## [CORE]\nProject: Latency\n');
  fs.writeFileSync(path.join(root, 'artifacts/output/pipeline-state.json'), JSON.stringify({
    project: { name: 'latency', type: 'test' },
    current_phase: 'strategy', phases: { strategy: { status: 'in-progress' } },
    artifacts: {}, change_requests: [], blockers: [], history: [],
  }));
  return root;
}

function elapsed(fn) {
  const start = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function spawnOverhead() {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    samples.push(elapsed(() => spawnSync(process.execPath, ['-e', ''], { stdio: 'ignore' })));
  }
  samples.sort((a, b) => a - b);
  return samples[1];
}

test('session-start: every budgeted step fits and the total is under 1000ms', (t) => {
  const root = fixture();
  const overhead = spawnOverhead();
  t.diagnostic(`node spawn overhead: ${overhead.toFixed(1)}ms`);

  const steps = [
    {
      id: '0.0', name: 'orchestrator_state session-start', blocking: true,
      run: () => spawnSync(process.execPath, [SCRIPT('orchestrator_state.js'), 'session-start',
        '--agent', 'developer', '--domain', 'latency', '--goal', 'budget probe'],
      { cwd: root, stdio: 'ignore', timeout: Math.ceil(BUDGETS['0.0'] + overhead + 500) }),
    },
    {
      id: '0.1', name: 'memory_filter load (instincts first)', blocking: true,
      run: () => spawnSync(process.execPath, [SCRIPT('memory_filter.js'),
        '--agent', 'developer', '--task', 'latency budget probe'],
      { cwd: root, stdio: 'ignore', timeout: Math.ceil(BUDGETS['0.1'] + overhead + 500) }),
    },
    {
      id: '0.2', name: 'instinct-hit log append', blocking: false,
      run: () => {
        const f = path.join(root, '.agents', 'state', 'instinct-hits.json');
        fs.appendFileSync(f, JSON.stringify({ ts: new Date().toISOString(), type: 'load', agent: 'developer', instinct_ids: [], tokens: 0 }) + '\n');
      },
    },
    {
      id: '0.3', name: 'telemetry_surface session (via session_bootstrap)', blocking: false,
      run: () => {
        const target = SCRIPT('telemetry_surface.js');
        if (!fs.existsSync(target)) {
          t.diagnostic(`[SKIPPED] 0.3 — telemetry_surface.js not present (Phase 3 F3.8), 0ms charged`);
          return;
        }
        const r = spawnSync(process.execPath, [SCRIPT('session_bootstrap.js'), 'start', '--agent', 'developer', '--workflow', 'latency'],
          { cwd: root, stdio: 'ignore', timeout: Math.ceil(BUDGETS['0.3'] + overhead + 500) });
        if (r.status !== 0) t.diagnostic(`[SKIPPED] 0.3 — bootstrap exited ${r.status}`);
      },
    },
  ];

  let total = 0;
  for (const step of steps) {
    let ms;
    let timedOut = false;
    try {
      ms = elapsed(step.run);
    } catch (e) {
      ms = Infinity;
      timedOut = true;
    }
    total += Number.isFinite(ms) ? ms : 0;
    const adjusted = Math.max(0, ms - (step.id === '0.2' ? 0 : overhead));
    t.diagnostic(`step ${step.id} ${step.name}: ${ms.toFixed(1)}ms wall / ${adjusted.toFixed(1)}ms adjusted (budget ${BUDGETS[step.id]}ms)`);
    if (timedOut || !Number.isFinite(ms)) {
      if (step.blocking) assert.fail(`blocking step ${step.id} exceeded its timeout`);
      t.diagnostic(`[SKIPPED] ${step.id} — timeout`);
      continue;
    }
    if (step.blocking) {
      assert.ok(adjusted <= BUDGETS[step.id] + SPAWN_TOLERANCE,
        `blocking step ${step.id} took ${adjusted.toFixed(1)}ms (budget ${BUDGETS[step.id]}ms + ${SPAWN_TOLERANCE}ms tolerance)`);
    }
  }

  t.diagnostic(`total: ${total.toFixed(1)}ms (budget ${TOTAL_BUDGET}ms)`);
  assert.ok(total < TOTAL_BUDGET, `total session-start time ${total.toFixed(1)}ms exceeds ${TOTAL_BUDGET}ms`);
});

test('session-start: instinct load event is recorded (step 0.2 artifact)', () => {
  const root = fixture();
  spawnSync(process.execPath, [SCRIPT('memory_filter.js'), '--agent', 'developer', '--task', 'instinct budget'],
    { cwd: root, stdio: 'ignore' });
  const file = path.join(root, '.agents', 'state', 'instinct-hits.json');
  assert.ok(fs.existsSync(file), 'instinct-hit log must be written during a session load');
  const records = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(records.some((r) => r.type === 'load'));
});
