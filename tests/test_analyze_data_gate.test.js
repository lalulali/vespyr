'use strict';

/**
 * tests/test_analyze_data_gate.test.js — /analyze-data finally has a gate.
 *
 * The skill declared two output artifacts and nothing checked either: no gate script, no test, and
 * `artifacts/output/07-iteration/` did not exist. It also referenced neither of the two templates
 * that already describe its artifacts — while `/design` and `/iterate` both pointed at them — and it
 * wrote to `data-analysis-report.md`, a path **nothing read**.
 *
 * The gate checks template conformance, not analysis quality. Its own output says so, and the tests
 * below pin both directions, because a gate that only ever passes is the defect this file exists to
 * prevent.
 *
 * NOT tested here, and stated so nobody reads a green as more than it is: whether the North Star is
 * the right metric, whether the analysis is sound, or whether the recommendation follows from the
 * data. Those need an analyst.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/analyze_data_check.js');

function check(kind, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-'));
  const f = path.join(dir, 'artifact.md');
  fs.writeFileSync(f, body);
  const r = spawnSync('node', [GATE, 'check', '--kind', kind, '--file', f, '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

// --- fixtures ---------------------------------------------------------------------------------

const PLAN = ({ target = '62%', funnel = true, ph = false, numbered = true } = {}) => {
  const n = (i) => (numbered ? `${i}. ` : '');
  return [
    '# Measurement Plan — Checkout',
    `## ${n(1)}Measurement Overview`,
    ph ? 'Purpose: [Feature Name]' : 'Purpose: reduce abandonment at the address step.',
    `## ${n(2)}Success Metrics (North Star)`,
    '| Metric | Definition | Target |',
    '|---|---|---|',
    `| Checkout completion | orders / sessions | ${target} |`,
    `## ${n(3)}Event Tracking Plan`,
    '| Event | Trigger | Properties |',
    '|---|---|---|',
    '| checkout_step_completed | step submit | step_number |',
    funnel ? `## ${n(4)}Funnel Analysis` : '## Notes',
    'Cart to address to payment.',
    `## ${n(5)}Dashboard Specifications`,
    'Daily completion view.',
    `## ${n(7)}Data Dictionary`,
    '| Field | Type |',
    '|---|---|',
    '| step_number | int |',
    `## ${n(8)}Privacy & Compliance`,
    'No PII in event properties.',
  ].join('\n');
};

const INSIGHTS = ({ map = true, ph = false } = {}) => [
  '# Analytics Insights: Checkout',
  '## 1. Executive Summary',
  'Abandonment concentrates on mobile.',
  '## 2. Success Metrics vs. Targets',
  '| Metric | Target | Actual |',
  '|---|---|---|',
  '| completion | 62% | 54% |',
  '## 3. User Behavior Analysis',
  'Mobile users drop at the address step.',
  '## 4. Error and Performance Data',
  'Address lookup p95 is 1.2s.',
  '## 6. Qualitative Feedback',
  'Five users mentioned the keyboard.',
  '## 7. Iteration Hypotheses',
  'Autofocus will recover three points.',
  '## 8. Recommendations',
  ph ? 'Observation: [Feature Name] dropped.' : (map
    ? 'Observation: completion drops 45% at step 2 on mobile.\nInsight: the keyboard overlaps the address field.\nAction: autofocus and auto-advance on mobile step 2.'
    : 'Observation: mobile is worse.\nObservation: desktop is fine.'),
  '## 9. Next Steps',
  'Ship the fix and re-measure in two weeks.',
].join('\n');

// --- measurement plan -------------------------------------------------------------------------

test('a conformant measurement plan passes', () => {
  const r = check('measurement-plan', PLAN());
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures, null, 2));
});

test('a plan missing a required template section fails and names it', () => {
  const r = check('measurement-plan', PLAN({ funnel: false }));
  assert.ok(has(r, /Missing 1 of the 7 required template sections/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /Funnel Analysis/), 'the failure must name the section');
});

test('a metric row with a blank target fails — a target with no number is a wish', () => {
  const r = check('measurement-plan', PLAN({ target: '' }));
  assert.ok(has(r, /name a metric and no target/), JSON.stringify(r.json.failures));
});

test('the target column is found by header name, not by position', () => {
  // The first version required every cell after the metric name to be blank, so a `Definition`
  // column rescued a blank `Target`. This fixture is the one that caught it.
  const body = PLAN({ target: '' }).replace(
    '| Metric | Definition | Target |\n|---|---|---|\n| Checkout completion | orders / sessions |  |',
    '| Metric | Definition | Target | Notes |\n|---|---|---|---|\n| Checkout completion | orders / sessions |  | see appendix |'
  );
  const r = check('measurement-plan', body);
  assert.ok(has(r, /name a metric and no target/), JSON.stringify(r.json.failures));
});

test('an "n/a with a reason" target is accepted — the gate does not demand invention', () => {
  const r = check('measurement-plan', PLAN({ target: 'n/a — no cohort is old enough yet' }));
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

test('NUMBERED template headings resolve — `## 2. Success Metrics` is the same section', () => {
  // The fourth time this trap has fired in this repo: an anchored heading pattern that requires the
  // text to start immediately after `## ` finds nothing in a numbered template, and reports clean.
  const numbered = check('measurement-plan', PLAN({ numbered: true }));
  const plain = check('measurement-plan', PLAN({ numbered: false }));
  assert.strictEqual(numbered.code, 0, `numbered headings must resolve: ${JSON.stringify(numbered.json.failures)}`);
  assert.strictEqual(plain.code, 0, `plain headings must resolve: ${JSON.stringify(plain.json.failures)}`);
});

test('a plan still carrying template placeholders fails', () => {
  const r = check('measurement-plan', PLAN({ ph: true }));
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

// --- insights ---------------------------------------------------------------------------------

test('a conformant insights report passes', () => {
  const r = check('insights', INSIGHTS());
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures, null, 2));
});

test('observations with no insight or action fail — three observations decide nothing', () => {
  const r = check('insights', INSIGHTS({ map: false }));
  assert.ok(has(r, /missing \d+ of the three map labels/), JSON.stringify(r.json.failures));
});

test('an insight with NO action fails on its own — the action half is covered', () => {
  // FIXED after the QA seat proved the test above passed for the wrong reason: its fixture removed
  // both halves, so it only ever reached "no insight", and the ACTION rule could have been deleted
  // from the gate without this file noticing. This fixture keeps the insight and drops only the
  // action, which is the behaviour the rule names.
  const r = check('insights', INSIGHTS().replace(
    'Action: autofocus and auto-advance on mobile step 2.',
    'Observation: mobile is where it happens.'
  ));
  assert.ok(has(r, /missing 1 of the three map labels: `Action:`/),
    `an insight with nothing to do must fail on the action: ${JSON.stringify(r.json.failures)}`);
});

test('the action map is read in the recommendations section, not anywhere in the document', () => {
  // "We have no observation, no insight, and no action to take" contains all three words. Lexicon
  // presence is not a decision, and the first version of the rule counted words.
  const body = INSIGHTS({ map: false }).replace(
    'Abandonment concentrates on mobile.',
    'We have no observation, no insight, and no action to take.'
  );
  const r = check('insights', body);
  assert.ok(has(r, /missing \d+ of the three map labels/), 'prose denying all three is not an action map');
});

test('an insights report missing required sections fails', () => {
  const r = check('insights', INSIGHTS().replace('## 7. Iteration Hypotheses\nAutofocus will recover three points.\n', ''));
  assert.ok(has(r, /Missing 1 of the 8 required template sections/), JSON.stringify(r.json.failures));
});

test('an insights report still carrying placeholders fails', () => {
  const r = check('insights', INSIGHTS({ ph: true }));
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

// --- the crash that both seats found ------------------------------------------------------------

test('the templates\' own conditional sections do not crash the gate', () => {
  // CRITICAL, found independently by both seats. `section()` guards against an ungrouped alternation
  // by THROWING, and the empty-conditional check passed `re.source` — a bare `a\/?b test|experiment
  // design` — straight into it. The gate therefore threw a stack trace on any artifact containing
  // `## 6. A/B Test Design`, `## 9. ML Model Monitoring` or `## 5. A/B Test Results`: it failed on
  // MAXIMAL CONFORMANCE, and on both template files themselves. Nothing pinned it, because the
  // conditional test below only ever exercised the OMITTED direction.
  for (const [kind, body] of [
    ['measurement-plan', PLAN() + '\n## 6. A/B Test Design\nTwo variants, four weeks, n=2000.'],
    ['measurement-plan', PLAN() + '\n## 9. ML Model Monitoring\nNot applicable — no model in this feature.'],
    ['insights', INSIGHTS() + '\n## 5. A/B Test Results\nVariant B won by 3.1 points over 14 days.'],
  ]) {
    const r = check(kind, body);
    assert.notStrictEqual(r.code, 2, `a conditional section must not crash the gate: ${JSON.stringify(r.json)}`);
    assert.strictEqual(r.code, 0, `a filled conditional section must pass: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a target that is a label, not a number, fails — Q3 is a when, not a threshold', () => {
  const r = check('measurement-plan', PLAN({ target: 'Q3' }));
  assert.ok(has(r, /name a metric and no target/), JSON.stringify(r.json.failures));
});

test('junk targets fail and honest ones pass — the rule tests for a number, not a stop-list', () => {
  for (const junk of ['improve', 'increase substantially', 'higher than baseline', 'soon', '???']) {
    const r = check('measurement-plan', PLAN({ target: junk }));
    assert.ok(has(r, /name a metric and no target/), `"${junk}" is not a target: ${JSON.stringify(r.json.failures)}`);
  }
  for (const ok of ['62%', '> 20', '90 seconds', '4', 'n/a — no cohort is old enough yet']) {
    const r = check('measurement-plan', PLAN({ target: ok }));
    assert.strictEqual(r.code, 0, `"${ok}" is a target: ${JSON.stringify(r.json.failures)}`);
  }
});

// --- the holes the SECOND review found, now pinned ----------------------------------------------

test('a map label with an empty value is a heading, not a decision', () => {
  for (const [label, body] of [
    ['all three empty', INSIGHTS().replace(/Observation: .*/, 'Observation:').replace(/Insight: .*/, 'Insight:').replace(/Action: .*/, 'Action:')],
    ['declared as none', INSIGHTS().replace(/Observation: .*/, 'Observation: none.').replace(/Insight: .*/, 'Insight: none.').replace(/Action: .*/, 'Action: none.')],
    ['action pending', INSIGHTS().replace(/Action: .*/, 'Action: pending')],
  ]) {
    const r = check('insights', body);
    assert.strictEqual(r.code, 1, `${label} must fail — a label with no value decides nothing: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a target that is a label carrying a digit still fails', () => {
  // `Q3` alone was rejected, but `Q3 2026`, `sprint 4` and `v3.1` each carry a digit and passed.
  for (const junk of ['Q3 2026', 'sprint 4', 'v3.1', 'phase 2']) {
    const r = check('measurement-plan', PLAN({ target: junk }));
    assert.ok(has(r, /name a metric and no target/), `"${junk}" is a when, not a threshold: ${JSON.stringify(r.json.failures)}`);
  }
});

test('`real time` with a space is the same value as `real-time`', () => {
  // The alert requirement keyed on the hyphen, so `Refresh: real time` skipped it entirely.
  for (const v of ['`real time`', '`real-time`', '`realtime`', '`Real-Time`']) {
    const r = check('dashboard-specs', DASH({ refresh: v }));
    assert.ok(has(r, /real-time.*no alert rows/), `${v} must require alerts: ${JSON.stringify(r.json.failures)}`);
  }
});

test('an alert row with no threshold or no channel is not an alert', () => {
  const blankThreshold = DASH({ refresh: '`real-time`', alerts: true })
    .replace('| P1 | > 0.5% for 5m | PagerDuty | on-call |', '| P1 |  | PagerDuty | on-call |');
  const blankChannel = DASH({ refresh: '`real-time`', alerts: true })
    .replace('| P1 | > 0.5% for 5m | PagerDuty | on-call |', '| P1 | > 0.5% for 5m |  | on-call |');
  for (const [label, body] of [['no threshold', blankThreshold], ['no channel', blankChannel]]) {
    const r = check('dashboard-specs', body);
    assert.ok(has(r, /no threshold or no channel/), `${label} must fail: ${JSON.stringify(r.json.failures)}`);
  }
});

test('omitting the Data sources section is a failure, not a skipped rule', () => {
  // It was a note, so dropping the section skipped the access check it exists to perform.
  const body = DASH().replace(/## Data sources[\s\S]*$/, '');
  const r = check('dashboard-specs', body);
  assert.ok(has(r, /No data sources table/), JSON.stringify(r.json.failures));
});

test('a bracketed VALUE is not a template slot — [18-24] is an age band', () => {
  const plan = check('measurement-plan', PLAN().replace('| Checkout completion | orders / sessions | 62% |', '| Checkout completion | orders / sessions | 62% |\n| Admin age band | modal bucket | [18-24] |'));
  assert.strictEqual(plan.code, 0, `[18-24] must not read as a placeholder: ${JSON.stringify(plan.json.failures)}`);
  const slot = check('measurement-plan', PLAN().replace('| Checkout completion | orders / sessions | 62% |', '| Checkout completion | orders / sessions | [2-3 sentences] |'));
  assert.ok(has(slot, /unfilled template placeholder/), 'a slot with a word in it is still a slot');
});

test('the template declares the map the gate requires — a template-faithful report can pass', () => {
  // The gate required an Observation/Insight/Action map and the template's §8 had none, so following
  // the template could not satisfy the checker. The skill, the template and the gate must agree.
  const tpl = fs.readFileSync(path.join(REPO, '.agents/templates/quality/analytics-insights-template.md'), 'utf8');
  for (const label of ['Observation:', 'Insight:', 'Action:']) {
    assert.ok(tpl.includes(label), `the template must print the label the gate requires: ${label}`);
  }
});

// --- conditional sections ---------------------------------------------------------------------

test('a conditional "if applicable" section is never required', () => {
  // Demanding an A/B design from a team that ran no A/B test is demanding a fabrication. The
  // template labels those sections "if applicable"; the gate honours the label.
  const plan = check('measurement-plan', PLAN());
  const insights = check('insights', INSIGHTS());
  assert.strictEqual(plan.code, 0, 'A/B Test Design and ML Model Monitoring must not be required');
  assert.strictEqual(insights.code, 0, 'A/B Test Results must not be required');
});

// --- the dashboard wire ------------------------------------------------------------------------
// Found by the owner asking "do we have the wire from data to dashboard?" — the answer was no. The
// measurement plan's §5 named WHICH metrics to watch, the insights report said what the data showed,
// and the Encoding Matrix said which chart shape fits — and none of the three could be built from.
// `dashboard-specs.md` was named in exactly one place, as an optional aside, and nothing read it.

// The tables are built from COLUMN ARRAYS so the header and every row are guaranteed to have the same
// cell count. The first version interpolated an `access` string containing its own pipes, which made
// the default fixture itself ragged — five header cells against a four-cell row — and the ragged-row
// check correctly failed it. A fixture that cannot pass the rule it tests is a broken fixture, not a
// broken rule.
function mdTable(columns, rows) {
  const h = '| ' + columns.join(' | ') + ' |';
  const sep = '|' + '---|'.repeat(columns.length);
  const body = rows.map((r) => '| ' + r.join(' | ') + ' |');
  return [h, sep, ...body].join('\n');
}

const DASH = ({ target = '`grafana`', live = '**Live object:** `not yet built`', chart = 'line',
                refresh = '`daily`', alerts = false, sourceCols, sourceRow } = {}) => {
  const panels = mdTable(
    ['#', 'Panel', 'Metric', 'Source', 'Query / definition', 'Chart', 'Layout', 'Owner'],
    [['P1', 'Error rate', 'errors / requests', '`events`', '`sum(errors)/sum(requests)`', chart, 'row 1', '@devops-engineer']]
  );
  const sources = mdTable(
    sourceCols || ['Source', 'What it is', 'Access', 'Refresh'],
    [sourceRow || ['`events`', 'telemetry', 'read-only role analytics_ro', 'streaming']]
  );
  return [
    '# Dashboard Specs — Checkout',
    `**Target:** ${target}`,
    `**Refresh:** ${refresh}`,
    '**Built by:** `@devops-engineer`',
    live,
    '## Panels', panels,
    ...(alerts ? ['## Alerts', mdTable(['Panel', 'Threshold', 'Channel', 'Owner'], [['P1', '> 0.5% for 5m', 'PagerDuty', 'on-call']])] : []),
    '## Data sources', sources,
  ].join('\n');
};

test('a conformant dashboard spec passes', () => {
  const r = check('dashboard-specs', DASH());
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures, null, 2));
});

test('an undeclared target fails — an unnamed target cannot be built from', () => {
  const r = check('dashboard-specs', DASH({ target: '' }).replace('**Target:** \n', ''));
  assert.ok(has(r, /No `\*\*Target:\*\*`/), JSON.stringify(r.json.failures));
});

test('an unrecognized target fails, and the `other:` escape hatch is accepted', () => {
  const bad = check('dashboard-specs', DASH({ target: '`excel`' }));
  assert.ok(has(bad, /is not one of grafana/), JSON.stringify(bad.json.failures));
  const other = check('dashboard-specs', DASH({ target: '`other: internal-react-page`' }));
  assert.strictEqual(other.code, 0, `the escape hatch must work: ${JSON.stringify(other.json.failures)}`);
});

test('a missing Live object field fails — a spec with nowhere to record the finished object is lost', () => {
  const r = check('dashboard-specs', DASH({ live: '' }).replace('\n\n## Panels', '\n## Panels'));
  assert.ok(has(r, /No `\*\*Live object:\*\*` field/), JSON.stringify(r.json.failures));
});

test('a panel missing its chart is not buildable', () => {
  const r = check('dashboard-specs', DASH({ chart: '' }));
  assert.ok(has(r, /not buildable/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /chart/), 'the failure must name the missing column');
});

test('the panels table must carry all four buildable columns', () => {
  const body = DASH().replace('| # | Panel | Metric | Source | Query / definition | Chart | Layout | Owner |', '| # | Panel | Metric | Chart | Layout | Owner |')
    .replace('|---|---|---|---|---|---|---|---|', '|---|---|---|---|---|')
    .replace('| P1 | Error rate | errors / requests | `events` | `sum(errors)/sum(requests)` | line | row 1 | @devops-engineer |', '| P1 | Error rate | errors / requests | line | row 1 | @devops-engineer |');
  const r = check('dashboard-specs', body);
  assert.ok(has(r, /no "source" column/), JSON.stringify(r.json.failures));
});

test('a real-time spec with no alerts fails — a screen nobody watches', () => {
  const r = check('dashboard-specs', DASH({ refresh: '`real-time`' }));
  assert.ok(has(r, /real-time.*no alert rows/), JSON.stringify(r.json.failures));
});

test('a real-time spec WITH alerts passes — the check is not a blanket rejection', () => {
  const r = check('dashboard-specs', DASH({ refresh: '`real-time`', alerts: true }));
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

test('a data sources table with no access column fails', () => {
  const r = check('dashboard-specs', DASH({ sourceCols: ['Source', 'What it is', 'Refresh'], sourceRow: ['`events`', 'telemetry', 'streaming'] }));
  assert.ok(has(r, /no access column|name no access level/), JSON.stringify(r.json.failures));
});

test('EVERY buildable column is required — the query column included', () => {
  // The QA seat proved the suite had no test for the query column: deleting that requirement from
  // the gate left every test green. One test per column, so no single column can be dropped silently.
  const drop = (name) => {
    const header = '| # | Panel | Metric | Source | Query / definition | Chart | Layout | Owner |';
    const sep = '|---|---|---|---|---|---|---|---|';
    const row = '| P1 | Error rate | errors / requests | `events` | `sum(errors)/sum(requests)` | line | row 1 | @devops-engineer |';
    const cells = ['#', 'Panel', 'Metric', 'Source', 'Query / definition', 'Chart', 'Layout', 'Owner'];
    const rowCells = ['P1', 'Error rate', 'errors / requests', '`events`', '`sum(errors)/sum(requests)`', 'line', 'row 1', '@devops-engineer'];
    const keep = cells.map((c, i) => (c === name ? null : i)).filter((i) => i !== null);
    const h = '| ' + keep.map((i) => cells[i]).join(' | ') + ' |';
    const r = '| ' + keep.map((i) => rowCells[i]).join(' | ') + ' |';
    return DASH().replace(header, h).replace(sep, '|' + '---|'.repeat(keep.length)).replace(row, r);
  };
  for (const col of ['Metric', 'Source', 'Query / definition', 'Chart']) {
    const r = check('dashboard-specs', drop(col));
    assert.ok(has(r, new RegExp(`no "${col.split(' ')[0].toLowerCase()}" column`)),
      `dropping the ${col} column must fail: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a RAGGED row fails — a dropped cell shifts every column after it', () => {
  // Measured before the fix: a panel row with the Query cell missing passed with ZERO failures,
  // because `Chart` read the value that belonged to Query and every named column still read
  // non-empty. A builder reading a shifted row configures the wrong field.
  const header = '| # | Panel | Metric | Source | Query / definition | Chart | Layout | Owner |';
  const row = '| P1 | Error rate | errors / requests | `events` | `sum(errors)/sum(requests)` | line | row 1 | @devops-engineer |';
  const dropped = '| P1 | Error rate | errors / requests | `events` | line | row 1 | @devops-engineer |';
  const r = check('dashboard-specs', DASH().replace(header, header).replace(row, dropped));
  assert.ok(has(r, /different cell count from the header/), JSON.stringify(r.json.failures));
});

test('a ragged DATA SOURCE row fails — the Refresh value must not answer for Access', () => {
  const r = check('dashboard-specs', DASH().replace(
    '| `events` | telemetry | read-only role analytics_ro | streaming |',
    '| `events` | telemetry | streaming |'
  ));
  assert.ok(has(r, /different cell count from the header/), JSON.stringify(r.json.failures));
});

test('a ragged ALERT row fails', () => {
  const body = DASH({ refresh: '`real-time`', alerts: true }).replace(
    '| P1 | > 0.5% for 5m | PagerDuty | on-call |',
    '| P1 | > 0.5% for 5m | on-call |'
  );
  const r = check('dashboard-specs', body);
  assert.ok(has(r, /different cell count from the header/), JSON.stringify(r.json.failures));
});

test('a header-only Data sources table is the same skip as omitting it', () => {
  // The confirmation review measured this: `| Source | What it is | Access | Refresh |` with zero
  // rows exited 0, so the access rule was skipped by a table that was present and empty. Panels and
  // Alerts already rejected the zero-row shape; sources did not.
  const body = DASH().replace('| `events` | telemetry | read-only role analytics_ro | streaming |', '');
  const r = check('dashboard-specs', body);
  assert.ok(has(r, /header and no rows/), JSON.stringify(r.json.failures));
});

test('the whole time-label family fails as a target, and honest values still pass', () => {
  // The first version named quarters, sprints and versions; confirmation then passed `H2 2026`,
  // `FY2026`, `by end of 2026` and `end of 2026` — the same class of label. `FY2026` needed a
  // separate pattern because a trailing \b cannot follow a letter immediately followed by a digit.
  // The confirmation rounds kept producing rewordings: 'end of 2026', then 'year-end 2026'. The
  // class is open-ended in English and the gate records that as a limit rather than claiming closure.
  for (const junk of ['H2 2026', 'FY2026', 'FY24', 'by end of 2026', 'end of 2026', '2026', 'next quarter', 'sprint 4', 'v3.1', 'year-end 2026', 'year end 2026', 'EOY 2026', '2nd quarter', '2026 year-end']) {
    const r = check('measurement-plan', PLAN({ target: junk }));
    assert.ok(has(r, /name a metric and no target/), `"${junk}" is a when, not a threshold: ${JSON.stringify(r.json.failures)}`);
  }
  for (const ok of ['62%', '> 20', '90 seconds', '4', '2x current', 'under 5%', 'n/a — no cohort old enough yet']) {
    const r = check('measurement-plan', PLAN({ target: ok }));
    assert.strictEqual(r.code, 0, `"${ok}" is a target: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a dashboard spec still carrying placeholders fails', () => {
  const r = check('dashboard-specs', DASH().replace('# Dashboard Specs — Checkout', '# Dashboard Specs — [Feature Name]'));
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

test('the wire is documented end to end — skill, template, plan section and contracts agree', () => {
  const skill = fs.readFileSync(path.join(REPO, '.agents/skills/analyze-data/SKILL.md'), 'utf8');
  assert.ok(skill.includes('dashboard-specs-template.md'), 'the skill must name the template');
  assert.ok(skill.includes('artifacts/output/03-strategy/dashboard-specs.md'), 'and the artifact path');

  const plan = fs.readFileSync(path.join(REPO, '.agents/templates/quality/measurement-plan-template.md'), 'utf8');
  assert.ok(plan.includes('dashboard-specs.md'), 'the measurement plan must point at the buildable spec');

  const persona = fs.readFileSync(path.join(REPO, '.agents/agents/data-analyst.md'), 'utf8');
  assert.ok(persona.includes('dashboard-specs.md'), 'the persona must own it as a named artifact');

  const contracts = fs.readFileSync(path.join(REPO, '.agents/references/agent-contracts.md'), 'utf8');
  assert.ok(contracts.includes('dashboard-specs-template.md'), 'the dashboards capability must home on it');

  assert.ok(fs.existsSync(path.join(REPO, '.agents/templates/quality/dashboard-specs-template.md')),
    'the template must exist — a reference to a missing file is the phantom-resource defect');
});

// --- fail-closed ------------------------------------------------------------------------------

test('a missing file, an unknown kind, no arguments, and an empty file all fail closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-missing-'));
  const missing = spawnSync('node', [GATE, 'check', '--kind', 'insights', '--file', path.join(dir, 'nope.md'), '--json'], { encoding: 'utf8' });
  assert.strictEqual(missing.status, 2, 'a missing artifact is a missing deliverable, never a pass');

  const good = path.join(dir, 'a.md');
  fs.writeFileSync(good, INSIGHTS());
  const kind = spawnSync('node', [GATE, 'check', '--kind', 'bogus', '--file', good, '--json'], { encoding: 'utf8' });
  assert.strictEqual(kind.status, 2);
  assert.match(kind.stderr + kind.stdout, /expected measurement-plan, insights or dashboard-specs/);

  assert.strictEqual(spawnSync('node', [GATE, 'check'], { encoding: 'utf8' }).status, 2);

  const empty = path.join(dir, 'empty.md');
  fs.writeFileSync(empty, '  \n');
  assert.strictEqual(spawnSync('node', [GATE, 'check', '--kind', 'insights', '--file', empty, '--json'], { encoding: 'utf8' }).status, 2);

  fs.rmSync(dir, { recursive: true, force: true });
});

// --- the contract the skill and the pipeline share ---------------------------------------------

test('the skill writes the path the rest of the pipeline reads', () => {
  // The skill used to write `data-analysis-report.md`, which NOTHING read — the template's own
  // header, the iteration backlog, the iteration results template, /iterate and the agent contracts
  // all consume `analytics-insights.md`. The analysis was done and the next skill could not find it.
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/analyze-data/SKILL.md'), 'utf8');
  assert.ok(src.includes('artifacts/output/07-iteration/analytics-insights.md'), 'must write the consumed path');
  // The skill mentions the old path once, to explain why it changed. What must not survive is the
  // write LOCATION — so the assertion reads the Output table, not the whole file.
  const locations = src.split('\n').filter((l) => /Location:|analytics-insights\.md|data-analysis-report\.md/.test(l));
  assert.ok(!locations.some((l) => /^\s*\|.*data-analysis-report\.md/.test(l)),
    'the orphaned path must not survive as a table row');
  assert.ok(locations.some((l) => /analytics-insights\.md/.test(l)),
    'the consumed path must appear as the write target');

  const backlog = fs.readFileSync(path.join(REPO, '.agents/templates/planning/iteration-backlog-template.md'), 'utf8');
  assert.ok(backlog.includes('analytics-insights.md'), 'the downstream consumer must agree');
});

test('the skill points at both templates — it referenced neither before', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/analyze-data/SKILL.md'), 'utf8');
  for (const t of ['analytics-insights-template.md', 'measurement-plan-template.md']) {
    assert.ok(src.includes(t), `the skill must name its template: ${t}`);
  }
});

test('the skill names this gate — an undocumented gate is never run', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/analyze-data/SKILL.md'), 'utf8');
  assert.ok(src.includes('analyze_data_check.js'), 'the skill must document the gate that checks it');
});

test('the catalog no longer lists an INPUT as an output', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(REPO, '.agents/skills/help-me/skills-catalog.json'), 'utf8'));
  const found = [];
  (function walk(o) {
    if (o && typeof o === 'object') {
      if (o.name === 'analyze-data') found.push(o);
      for (const v of Object.values(o)) walk(v);
    }
  })(cat);
  assert.strictEqual(found.length, 1, 'expected exactly one analyze-data catalog entry');
  const e = found[0];

  // REWRITTEN 2026-10-16. The first version asserted the catalog did NOT list requirements.md as an
  // output. That is unachievable: the catalog is GENERATED by `compile_skills.js`, whose harvest is a
  // whole-body regex over `artifacts/...` paths — it cannot tell a read from a write, so regenerating
  // reverted the manual correction and turned this test red. The compiler's limit is now documented
  // there instead of papered over here.
  //
  // What IS stable and checkable is the SKILL's own framing: the path is introduced as a LOAD.
  const skill = fs.readFileSync(path.join(REPO, '.agents/skills/analyze-data/SKILL.md'), 'utf8');
  const intro = skill.split('\n').find((l) => l.includes('03-strategy/requirements.md')) || '';
  assert.ok(/load|input/i.test(intro),
    `requirements.md must be introduced as a load, not an output: "${intro.slice(0, 80)}"`);

  // And the entry the compiler can get right: the artifacts this skill genuinely writes.
  for (const out of ['analytics-insights.md', 'measurement-plan.md', 'dashboard-specs.md']) {
    assert.ok((e.outputs || []).some((o) => o.includes(out)),
      `the catalog must list ${out}, which the skill writes`);
  }
});

// --- the limit, asserted rather than described -------------------------------------------------

test('a green result says it is not a judgement on the analysis', () => {
  const r = check('insights', INSIGHTS());
  assert.strictEqual(r.code, 0);
  assert.match(r.json.note, /not that the analysis is correct/);
  assert.ok(r.json.notes.some((n) => /NOT CHECKED/.test(n)), 'the limit must be on the page');
});
