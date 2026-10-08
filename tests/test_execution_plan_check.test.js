'use strict';
/**
 * test_execution_plan_check.test.js — the execution-plan gate.
 *
 * WHY THIS FILE EXISTS
 * `/design` shipped `template_conformance.js` and `anti_generic_check.js`; `/motion` shipped
 * `motion_spec_check.js` and `motion_assets_check.js`. `/plan` shipped **nothing** — its whole
 * Done-when was prose, so "1–4h per task", "spikes capped at 2h", "mark parallelizable tasks"
 * and "every task is independently runnable" were enforced only by an agent choosing to read
 * them carefully. A checklist is not a gate.
 *
 * It also reproduces the traceability hole this session found in `/motion`: a prompt could be
 * fully specified while the user story it claimed to serve did not exist — work designed,
 * never built. Here the same failure is silent in BOTH directions, so both are checked:
 * a story no task serves, and a task that serves nothing.
 *
 * Structure is built from `plan()`/`stories()` helpers, not fixture files, so no test asserts
 * against a document that itself describes the subject.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/execution_plan_check.js');

/** rows: [id, task, est, dependsOn, parallelWith, story] */
function plan(rows, { graph = null, sections = true } = {}) {
  const table = rows
    .map(([id, task, est, dep, par, story]) =>
      `| ${id} | ${task} | ${est} | ${dep} | ${par} | ${story} |`)
    .join('\n');
  const edges = graph === null ? '' : graph;
  return `# Execution Plan

One sentence in plain language: what gets built, and the constraint that matters.

${sections ? '' : ''}## Task list

| ID | Task | Est. (h) | Depends On | Parallel With | Story |
|---|---|---|---|---|---|
${table}

## Dependency graph

${edges}

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Something | Medium | High | Something else |
`;
}

function stories(ids) {
  return `# User stories\n${ids.map((i) => `## ${i}\nAs someone I want it.\n`).join('\n')}`;
}

function run(planText, storiesText, { requirePlan = false, spec = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'execplan-'));
  const outDir = path.join(dir, 'artifacts', 'output', '05-planning');
  const sd = path.join(dir, 'artifacts', 'output', '03-strategy');
  fs.mkdirSync(outDir, { recursive: true });
  if (planText !== null) fs.writeFileSync(path.join(outDir, 'execution-plan.md'), planText, 'utf8');
  if (storiesText !== null) {
    fs.mkdirSync(sd, { recursive: true });
    fs.writeFileSync(path.join(sd, 'user-stories.md'), storiesText, 'utf8');
  }
  if (spec !== null) {
    fs.mkdirSync(sd, { recursive: true });
    fs.writeFileSync(path.join(sd, 'product-spec.md'), spec, 'utf8');
  }
  const args = [SCRIPT, 'check', '--root', dir, '--json'];
  if (requirePlan) args.push('--require-plan');
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', args, { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
    out = `${e.stdout || ''}${e.stderr || ''}`;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  let json = {};
  try { json = JSON.parse(out); } catch { /* non-JSON error path */ }
  return { code, json, out };
}

const GOOD_ROWS = [
  ['T001', 'Extract station table to CSV', '2', '—', 'T002', 'US-101'],
  ['T002', 'Build the offset table component', '3', '—', 'T001', 'US-101'],
  ['T003', 'Add the download route', '2', 'T001', '—', 'US-102'],
  ['T004', 'Wire the comparison drawer', '3', 'T003', '—', 'US-103'],
  ['T005', 'Spike: Next.js vs Vite', '2', '—', '—', 'US-104'],
];
const GOOD_GRAPH = 'T001 -> T003\nT003 -> T004';
const GOOD_STORIES = stories(['US-101', 'US-102', 'US-103', 'US-104']);

// --- the happy path -------------------------------------------------------------------

test('a conformant plan passes', () => {
  const r = run(plan(GOOD_ROWS, { graph: GOOD_GRAPH }), GOOD_STORIES);
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
  assert.strictEqual(r.json.ok, true);
});

// --- estimates -----------------------------------------------------------------------

test('estimates outside 1-4h are rejected, and spikes are capped at 2h', () => {
  const cases = [
    [['T001', 'Big', '6', '—', '—', 'US-101'], /above the 4h cap/],
    [['T001', 'Spike: tool choice', '4', '—', '—', 'US-101'], /2h cap for a spike/],
    [['T001', 'Tiny', '0.5', '—', '—', 'US-101'], /below 1h/],
    [['T001', 'Vague', 'a while', '—', '—', 'US-101'], /not numeric/],
    [['T001', 'Unfilled', '{N}', '—', '—', 'US-101'], /still a placeholder/],
  ];
  for (const [row, re] of cases) {
    const r = run(plan([row]), stories(['US-101']));
    assert.strictEqual(r.code, 1, `${row[2]} should fail`);
    assert(r.json.failures.some((f) => re.test(f)), `${row[2]} → ${JSON.stringify(r.json.failures)}`);
  }
});

// --- identity ------------------------------------------------------------------------

test('duplicate and malformed task IDs are rejected', () => {
  const dup = run(plan([...GOOD_ROWS.slice(0, 1), ['T001', 'Second T001', '1', '—', '—', 'US-101']]), GOOD_STORIES);
  assert(dup.json.failures.some((f) => /Duplicate task ID/.test(f)), JSON.stringify(dup.json.failures));

  const bad = run(plan([['task-one', 'Malformed', '2', '—', '—', 'US-101']]), stories(['US-101']));
  assert(bad.json.failures.some((f) => /unusable ID/.test(f)), JSON.stringify(bad.json.failures));
});

// --- dependency integrity ------------------------------------------------------------

test('a dependency on a task that does not exist is rejected', () => {
  const r = run(plan([['T001', 'A', '2', 'T099', '—', 'US-101']], { graph: '' }), stories(['US-101']));
  assert(r.json.failures.some((f) => /references T099, which is not a task/.test(f)), JSON.stringify(r.json.failures));
});

test('a dependency cycle is rejected — a plan that looks complete and can be run in no order', () => {
  const r = run(
    plan(
      [['T001', 'A', '2', 'T003', '—', 'US-101'], ['T003', 'B', '2', 'T001', '—', 'US-101']],
      { graph: 'T001 -> T003\nT003 -> T001' }
    ),
    stories(['US-101'])
  );
  assert(r.json.failures.some((f) => /Dependency cycle/.test(f)), JSON.stringify(r.json.failures));
});

test('table and dependency graph must agree', () => {
  // The table says T003 depends on T001; the graph omits it. One of the two is wrong and an
  // implementer cannot tell which — which is the whole reason both sources are parsed.
  const r = run(plan(GOOD_ROWS, { graph: 'T003 -> T004' }), GOOD_STORIES);
  assert(r.json.failures.some((f) => /the table says it depends on T001/.test(f)), JSON.stringify(r.json.failures));
});

test('both arrow forms SKILL.md documents parse, because both point prerequisite → dependent', () => {
  // `T001 ← T003` is the reverse-dependency notation; `T001 → T003` is the data/artifact edge.
  // The skill's own template must pass its own gate.
  for (const graph of ['T001 ← T003\nT003 ← T004', 'T001 -> T003\nT003 -> T004', 'T001 --> T003\nT003 --> T004']) {
    const r = run(plan(GOOD_ROWS, { graph }), GOOD_STORIES);
    assert.strictEqual(r.code, 0, `"${graph}" should pass: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a task listing itself as a dependency is rejected', () => {
  const r = run(plan([['T001', 'A', '2', 'T001', '—', 'US-101']]), stories(['US-101']));
  assert(r.json.failures.some((f) => /lists itself/.test(f)), JSON.stringify(r.json.failures));
});

// --- the traceability hole, both directions --------------------------------------------

test('a user story that no task serves is rejected — work designed and never built', () => {
  const r = run(plan(GOOD_ROWS, { graph: GOOD_GRAPH }), stories([...GOOD_STORIES, '## US-999\nAs a ghost I want nothing.\n']));
  assert(r.json.failures.some((f) => /Coverage: .*US-999/.test(f)), JSON.stringify(r.json.failures));
});

test('a task that traces to no user story is rejected — speculative scope', () => {
  const r = run(plan([...GOOD_ROWS, ['T006', 'Refactor for vibes', '1', '—', '—', '']]), GOOD_STORIES);
  assert(r.json.failures.some((f) => /T006: traces to no US-###/.test(f)), JSON.stringify(r.json.failures));
});

test('a task citing a story user-stories.md never defines is rejected — a dangling reference', () => {
  const rows = GOOD_ROWS.map((r) => (r[0] === 'T003' ? [...r.slice(0, 5), 'US-777'] : r));
  const r = run(plan(rows, { graph: GOOD_GRAPH }), GOOD_STORIES);
  assert(r.json.failures.some((f) => /US-777, which user-stories\.md does not define/.test(f)), JSON.stringify(r.json.failures));
});

// --- structure ------------------------------------------------------------------------

test('a missing required section is rejected', () => {
  for (const heading of ['Task list', 'Dependency graph', 'Risk register']) {
    const broken = plan(GOOD_ROWS, { graph: GOOD_GRAPH }).replace(`## ${heading}`, '## Renamed');
    const r = run(broken, GOOD_STORIES);
    assert.strictEqual(r.code, 1, `missing "${heading}" should fail`);
    assert(r.json.failures.some((f) => f.includes(`## ${heading}`)), JSON.stringify(r.json.failures));
  }
});

// --- absence: the contract that bit both motion gates ----------------------------------

test('an absent plan is a SKIP by default, because planning can be out of scope', () => {
  const r = run(null, GOOD_STORIES);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.json.skipped, true);
});

test('--require-plan turns an absent plan into a FAILURE and never reports ok:true', () => {
  // The exact bug measured in motion_spec_check.js: `ok: true` with nothing on disk. Reaching
  // Step 5 means a plan IS in scope, so absence is a missing deliverable.
  const r = run(null, GOOD_STORIES, { requirePlan: true });
  assert.strictEqual(r.code, 1);
  assert.strictEqual(r.json.ok, false);
  assert.notStrictEqual(r.json.skipped, true);
  assert(r.json.failures.length > 0, 'a required-but-absent plan must still populate failures');
});

// --- the wiring defect the audit found -------------------------------------------------

test('Step 5 invokes the gate with --require-plan, which is load-bearing', () => {
  const skill = fs.readFileSync(path.join(ROOT, '.agents/skills/plan/SKILL.md'), 'utf8');
  assert.match(
    skill,
    /execution_plan_check\.js check --require-plan/,
    'without the flag an absent plan is a skip and the gate reports ok:true with nothing on disk'
  );
});

test('the completion record points at the real path, 05-planning/execution-plan.md', () => {
  // `complete` resolves --artifact against artifacts/output/ and captures a version and hash
  // only if the file is found. The bare filename resolved to artifacts/output/execution-plan.md,
  // which never exists, so the completion record silently captured no artifact at all.
  const skill = fs.readFileSync(path.join(ROOT, '.agents/skills/plan/SKILL.md'), 'utf8');
  assert.match(skill, /complete --agent tech-lead --artifact 05-planning\/execution-plan\.md/);
  assert.ok(
    !/--artifact execution-plan\.md/.test(skill),
    'the bare filename resolves outside 05-planning/ and captures nothing'
  );
});

test('every step carries a tracker call, so the audit can see steps 2-5', () => {
  const skill = fs.readFileSync(path.join(ROOT, '.agents/skills/plan/SKILL.md'), 'utf8');
  for (const n of [2, 3, 4, 5]) {
    assert.match(
      skill,
      new RegExp(`begin --skill plan --step ${n}`),
      `step ${n} had no tracker call, so the audit could only ever show steps 0 and 1`
    );
  }
});
// --- Blind run 1 (freight portal) — the gate could not see its own halt condition ---------
// The halt condition said an acceptance criterion with no story "cannot be traced to a task,
// so it silently ships unbuilt". The gate traced US-### in both directions and never read
// AC-###. `--spec` was accepted, parsed, and never used. Measured: a plan covering all six
// stories with zero accessibility and zero load work passed `--require-plan` while AC-05
// (WCAG 2.2 AA) and AC-06 (500 concurrent shippers) sat in the spec unserved.

test('an acceptance criterion no user story claims is rejected — the halt condition, enforced', () => {
  const spec = '# Spec\n- **AC-01** tenant scoping\n- **AC-02** live status\n- **AC-05** WCAG 2.2 AA\n- **AC-06** 500 concurrent shippers\n';
  const r = run(plan(GOOD_ROWS, { graph: GOOD_GRAPH }), stories(['US-101']), { spec });
  assert.strictEqual(r.code, 1, JSON.stringify(r.json.failures));
  assert(
    r.json.failures.some((f) => /AC-05, AC-06 are claimed by no user story/.test(f)),
    JSON.stringify(r.json.failures)
  );
});

test('a non-functional criterion still needs a constraint story, not a silent deletion', () => {
  const spec = '# Spec\n- **AC-06** handles 500 concurrent users without degrading ops latency\n';
  const r = run(plan([['T001', 'Ship the list', '2', '—', '—', 'US-101']]), stories(['US-101']), { spec });
  assert(r.json.failures.some((f) => /AC-06/.test(f)), JSON.stringify(r.json.failures));
});

test('a story claiming an acceptance criterion the spec never declares is rejected', () => {
  const spec = '# Spec\n- **AC-01** tenant scoping\n- **AC-02** live status\n';
  const st = stories(['US-101']) + '\n## US-104\n**Acceptance:** AC-77\n';
  const r = run(plan([['T001', 'A', '2', '—', '—', 'US-101'], ['T002', 'B', '2', '—', '—', 'US-104']]), st, { spec });
  assert(r.json.failures.some((f) => /AC-77, which product-spec\.md never declares/.test(f)), JSON.stringify(r.json.failures));
});

test('--spec is load-bearing and its absence is reported rather than silently tolerated', () => {
  const r = run(plan(GOOD_ROWS, { graph: GOOD_GRAPH }), GOOD_STORIES);
  assert.strictEqual(r.json.plan.specFound, false);
  const withSpec = run(plan(GOOD_ROWS, { graph: GOOD_GRAPH }), GOOD_STORIES, { spec: '# Spec\n- **AC-01** a\n' });
  assert.strictEqual(withSpec.json.plan.specFound, true);
});

test('an empty dependency graph is legitimate when no task declares a dependency', () => {
  // A false positive this audit introduced: the check fired on `rows.length > 1` alone and
  // reported "the table says tasks depend on each other" about a table that declared none.
  const rows = [
    ['T001', 'A', '2', '—', '—', 'US-101'],
    ['T002', 'B', '2', '—', 'T001', 'US-102'],
    ['T003', 'C', '2', '—', 'T002', 'US-103'],
  ];
  const r = run(plan(rows, { graph: '' }), stories(['US-101', 'US-102', 'US-103']));
  assert.strictEqual(r.code, 0, `an empty graph with no dependencies must pass: ${JSON.stringify(r.json.failures)}`);
});

test('the ASCII "<-" edge form is accepted — a blind run used it and it failed', () => {
  for (const arrow of ['<-', '<--', '→', '->', '←', '-->']) {
    const graph = `T001 ${arrow} T003\nT003 ${arrow} T004`;
    const r = run(plan(GOOD_ROWS, { graph }), GOOD_STORIES);
    assert.strictEqual(r.code, 0, `"${graph}" should parse: ${JSON.stringify(r.json.failures)}`);
  }
});

test('one unparseable graph yields one failure, not one per task', () => {
  const rows = [];
  for (let i = 1; i <= 12; i++) {
    const id = `T${String(i).padStart(3, '0')}`;
    const prev = `T${String(i - 1).padStart(3, '0')}`;
    rows.push([id, `Task ${i}`, '2', i > 1 ? prev : '—', '—', 'US-101']);
  }
  const r = run(plan(rows, { graph: '' }), stories(['US-101']));
  const cascades = r.json.failures.filter((f) => /no parseable edge/.test(f));
  assert(cascades.length <= 1, `expected at most one graph complaint, got ${cascades.length}`);
});
