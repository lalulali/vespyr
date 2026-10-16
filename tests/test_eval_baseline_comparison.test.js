'use strict';

/**
 * tests/test_eval_baseline_comparison.test.js — measuring the DIFFERENCE a skill makes.
 *
 * A benchmark that only asks "did the output contain X?" cannot say whether the SKILL did anything —
 * the agent produces output either way. A benchmark may therefore declare a `baseline`, and the runner
 * executes the same prompt a second time WITHOUT the skill and compares Tier-0 (where `assertContains`
 * lives).
 *
 * Three states, and the middle one is the finding:
 *   discriminating     — the assertions hold WITH the skill and fail without it. Healthy.
 *   nonDiscriminating  — they hold EITHER WAY. They measure the output, not the skill. Decoration.
 *   inconclusive       — they fail even WITH the skill. Fix the benchmark before its baseline means
 *                        anything; reporting this as a clean zero would read as "pulling its weight".
 */

const test = require('node:test');
const assert = require('node:assert');

const { runEvaluation } = require('../tools/eval/runner.js');

/** Two benchmarks: one whose assertion is satisfied either way, one that only the skill satisfies. */
const BENCHMARKS = [
  {
    id: 'PROBE-NON-DISCRIMINATING',
    skill: 'iterate',
    name: 'probe — assertion satisfied by any output',
    dimension: 'prd_completeness',
    prompt: 'Run /iterate.',
    assertContains: ['MOCK'],
    baseline: { variant: 'without-skill', note: 'probe' },
  },
  {
    id: 'PROBE-DISCRIMINATING',
    skill: 'iterate',
    name: 'probe — assertion only the skill satisfies',
    dimension: 'prd_completeness',
    prompt: 'Run /iterate.',
    assertContains: ['Feature Iteration Plan'],
    baseline: { variant: 'without-skill', note: 'probe' },
  },
  {
    id: 'PROBE-INCONCLUSIVE',
    skill: 'iterate',
    name: 'probe — assertion no output satisfies',
    dimension: 'prd_completeness',
    prompt: 'Run /iterate.',
    assertContains: ['a string that appears nowhere at all'],
    baseline: { variant: 'without-skill', note: 'probe' },
  },
];

async function run() {
  return runEvaluation({ mock: true, concurrency: 1, benchmarks: BENCHMARKS });
}

test('a benchmark may declare a baseline and the runner executes a control', async () => {
  const r = await run();
  assert.strictEqual(r.baseline.compared, 3, 'all three probes declared a baseline');
  for (const b of r.benchmarks) {
    assert.ok(b.baseline, `${b.id} must carry a comparison record`);
    assert.strictEqual(b.baseline.variant, 'without-skill');
  }
});

test('assertions satisfied EITHER WAY are reported non-discriminating — the finding', async () => {
  const r = await run();
  const b = r.benchmarks.find((x) => x.id === 'PROBE-NON-DISCRIMINATING');
  assert.strictEqual(b.baseline.withSkillTier0Passed, true, 'the assertion holds with the skill');
  assert.strictEqual(b.baseline.tier0Passed, true, 'and holds without it');
  assert.strictEqual(b.baseline.nonDiscriminating, true);
  assert.match(b.baseline.reason, /measure the output, not the skill/);
  assert.deepStrictEqual(r.baseline.nonDiscriminatingIds, ['PROBE-NON-DISCRIMINATING']);
});

test('assertions only the skill satisfies are reported discriminating — the healthy case', async () => {
  const r = await run();
  const b = r.benchmarks.find((x) => x.id === 'PROBE-DISCRIMINATING');
  assert.strictEqual(b.baseline.withSkillTier0Passed, true);
  assert.strictEqual(b.baseline.tier0Passed, false, 'the control must NOT satisfy it');
  assert.strictEqual(b.baseline.discriminating, true);
  assert.strictEqual(b.baseline.nonDiscriminating, false);
  assert.deepStrictEqual(r.baseline.discriminatingIds, ['PROBE-DISCRIMINATING']);
});

test('assertions nothing satisfies are INCONCLUSIVE, never a clean zero', async () => {
  // The state found while wiring the worked example: the benchmark does not pass on its own, so the
  // comparison was never possible. Reporting it as `nonDiscriminating: 0` would read as "this
  // baseline is pulling its weight".
  const r = await run();
  const b = r.benchmarks.find((x) => x.id === 'PROBE-INCONCLUSIVE');
  assert.strictEqual(b.baseline.withSkillTier0Passed, false);
  assert.strictEqual(b.baseline.inconclusive, true);
  assert.strictEqual(b.baseline.nonDiscriminating, false, 'inconclusive is not the same finding');
  assert.match(b.baseline.reason, /do not hold even WITH the skill/);
  assert.deepStrictEqual(r.baseline.inconclusiveIds, ['PROBE-INCONCLUSIVE']);
});

test('the control does not enter the pass-rate denominator', async () => {
  // It is evidence ABOUT a benchmark, not a benchmark. Three probes declared a baseline; the run
  // still reports three benchmarks.
  const r = await run();
  assert.strictEqual(r.total, 3, 'the controls must not inflate the total');
  assert.strictEqual(r.benchmarks.length, 3);
});

test('a benchmark without a baseline is untouched — the feature is opt-in', async () => {
  const r = await runEvaluation({
    mock: true,
    concurrency: 1,
    benchmarks: [{
      id: 'PROBE-NO-BASELINE', skill: 'iterate', name: 'probe', dimension: 'prd_completeness',
      prompt: 'Run /iterate.', assertContains: ['MOCK'],
    }],
  });
  assert.strictEqual(r.benchmarks[0].baseline, undefined);
  assert.strictEqual(r.baseline.compared, 0);
});

test('the worked example in the real suite declares a baseline', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const suite = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'evals', 'suites', 'skills', 'operations.json'), 'utf8'));
  const withBaseline = suite.benchmarks.filter((b) => b.baseline);
  assert.ok(withBaseline.length >= 1,
    'at least one real benchmark must carry a baseline — otherwise the format is documented and unused');
  for (const b of withBaseline) {
    assert.ok(b.baseline.variant, `${b.id}: variant is required`);
    assert.ok(b.baseline.note, `${b.id}: a baseline needs a reason a human can read`);
  }
});
