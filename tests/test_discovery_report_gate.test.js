/**
 * tests/test_discovery_report_gate.test.js — the last ungated link in the discovery chain.
 *
 * `/discovery-report` compiles five discovery artifacts into one stakeholder-facing report. Four were
 * gated and the fifth was gated recently. The COMPILER had zero gate references — the worst place
 * for a gap, because it consumed verified inputs and emitted an unverified output. A reader of the
 * consolidated report had no assurance that any underlying artifact conformed; the report laundered
 * their status.
 *
 * The measured case: a report whose Sources row claimed `PASS` for an `empathy-map.md` that was
 * verbatim its own unfilled template — 8 placeholder failures — reached a stakeholder as a verified
 * finding.
 *
 * Also pinned: absent inputs must be DISCLOSED. An undisclosed absence means a reader cannot tell
 * missing research from research that found nothing.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/discovery_report_check.js');
const RESEARCH = 'artifacts/output/02-research';

const ALL_INPUTS = [
  'root-cause-analysis.md',
  'empathy-map.md',
  'journey-map.md',
  'jtbd-hmw.md',
  'research-plan.md',
  'problem-space-brief.md',
];

const GOOD_PLAN = fs.readFileSync(
  path.join(__dirname, 'fixtures-good-research-plan.md'), 'utf8'
);

const GOOD_EMPATHY = `# Empathy Map — billing admin, refund workflow
**Date:** 2026-10-09
**Evidence basis:** interviewed (6 admins, 45 min each)
**Inferred quadrants:** Thinks, Feels

## User & Scenario
- **Segment:** Operations admin, 5-50 person team, no analyst
- **Scenario:** Monday morning, building the weekly report their team reads

## Empathy Canvas
| Says | Thinks |
|------|--------|
| "I stopped trusting the number after week three." | Inference: if it is wrong in the first report, nobody checks the rest. |

| Does | Feels |
|------|-------|
| Screenshots the report into the team channel first | Inference: anxious about being the source of a wrong number |

## Pains
1. Has no way to tell whether a number is right before it leaves their hands — high, hit by 6 of 6

## Gains
1. A visible check step would let them share without hedging in the message.
`;

/** A report listing every declared input, with `pass` controlling the research-plan verdict. */
/** The two sections the gate now requires — SKILL.md says never to drop them. */
const METHODS_AND_OPEN = `\n## Research Methods Used\n\nSix 45-minute interviews with operations admins.\n\n## Open Questions\n\n1. Does the admin trust the preview as much as their own eye?\n`;


function report({ rows = {}, caveat = true } = {}) {
  const table = ALL_INPUTS.map((f) => {
    const verdict = rows[f] || 'absent';
    return `| \`${f}\` | ${verdict} |`;
  }).join('\n');
  const note = caveat
    ? '\nNote: usability testing not yet conducted. Recommend running usability tests before finalizing design specs.\n'
    : '';
  return `# Discovery Report — checkout abandonment\n\nNarrative synthesis of what we learned.\n${METHODS_AND_OPEN}\n## Sources\n| Input | Status |\n|---|---|\n${table}\n${note}`;
}

function fixture({ files = {}, rows, caveat } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreport-'));
  for (const [name, body] of Object.entries(files)) {
    const full = path.join(dir, RESEARCH, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
  fs.writeFileSync(path.join(dir, 'user-research-report.md'), report({ rows, caveat }));
  return dir;
}

function run(dir) {
  const r = spawnSync('node', [GATE, 'check', '--root', dir, '--report', 'user-research-report.md', '--json'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

test('a compliant report over one passing input passes', () => {
  const dir = fixture({
    files: { 'research-plan.md': GOOD_PLAN },
    rows: { 'research-plan.md': 'PASS' },
  });
  const r = run(dir);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  assert.strictEqual(r.json.verified, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

// --- the laundering this gate exists to stop ------------------------------------------------------

test('THE DEFECT: a report claiming PASS on a canvas that is its own unfilled template fails', () => {
  const template = fs.readFileSync(path.join(REPO, '.agents/skills/empathy-map/SKILL.md'), 'utf8')
    .match(/```markdown\n([\s\S]*?)```/)[1];
  const dir = fixture({
    files: { 'empathy-map.md': template },
    rows: { 'empathy-map.md': 'PASS' },   // the report asserts it was verified
  });
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /present but FAILS its own gate/),
    `the compiler must re-verify rather than trust the report: ${JSON.stringify(r.json.failures)}`);
  assert.ok(has(r, /discovery_canvas_check\.js/), 'the failure must name which gate rejected it');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('an input that PASSES is accepted — the gate is not a blanket rejection', () => {
  const dir = fixture({
    files: { 'empathy-map.md': GOOD_EMPATHY },
    rows: { 'empathy-map.md': 'PASS' },
  });
  const r = run(dir);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('re-verification happens at COMPILE time, not from an earlier run', () => {
  // The failure message must say why: an artifact can change after it was written, so a green result
  // from an earlier run is not evidence about the file on disk now.
  const dir = fixture({
    files: { 'research-plan.md': GOOD_PLAN },
    rows: { 'research-plan.md': 'PASS' },
  });
  fs.writeFileSync(path.join(dir, RESEARCH, 'research-plan.md'),
    GOOD_PLAN.replace('**Sample size:** 8', '**Sample size:** 2'));
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'an artifact mutated after its last green run must be caught');
  assert.ok(has(r, /Re-verify inputs at COMPILE time/), JSON.stringify(r.json.failures));
  fs.rmSync(dir, { recursive: true, force: true });
});

// --- disclosure -----------------------------------------------------------------------------------

test('an undisclosed absent input fails — a reader cannot tell missing research from no findings', () => {
  const dir = fixture({ files: {}, rows: {} });
  const p = path.join(dir, 'user-research-report.md');
  fs.writeFileSync(p, report({}).replace('| `empathy-map.md` | absent |\n', ''));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /is absent and that is undisclosed/), JSON.stringify(r.json.failures));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a Sources row with no verification verdict fails', () => {
  const dir = fixture({ files: {}, rows: {} });
  const p = path.join(dir, 'user-research-report.md');
  fs.writeFileSync(p, report({}).replace('| `empathy-map.md` | absent |', '| `empathy-map.md` | looked at |'));
  const r = run(dir);
  assert.ok(has(r, /states no verification verdict/), JSON.stringify(r.json.failures));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('no Sources section at all fails', () => {
  const dir = fixture({ files: {}, rows: {} });
  fs.writeFileSync(path.join(dir, 'user-research-report.md'),
    '# Discovery Report\n\nEverything we learned.\n');
  const r = run(dir);
  assert.ok(has(r, /no `## Sources` section/), JSON.stringify(r.json.failures));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('no usability caveat fails when no usability data was compiled', () => {
  // The skill instructs the author to note this in prose; nothing checked it, so a stakeholder
  // reading the report could not distinguish a validated finding from an unvalidated one.
  const dir = fixture({ files: {}, rows: {}, caveat: false });
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /carries no caveat saying so/), JSON.stringify(r.json.failures));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a report compiled from no inputs at all fails', () => {
  const dir = fixture({ files: {}, rows: {} });
  const p = path.join(dir, 'user-research-report.md');
  fs.writeFileSync(p, report({}).replace(/\| `[^`]+` \| absent \|\n?/g, ''));
  const r = run(dir);
  assert.ok(has(r, /No discovery inputs found|No `## Sources`/), JSON.stringify(r.json.failures));
  fs.rmSync(dir, { recursive: true, force: true });
});

// --- contract -------------------------------------------------------------------------------------

test('absent inputs are DISCLOSED, not required — no hard requirement without a producer', () => {
  // problem-space-brief.md and usability data have no producer in this repo. Requiring them would
  // make the skill permanently unsatisfiable — the qa-signoff.md deadlock.
  const dir = fixture({ files: {}, rows: {} });
  const r = run(dir);
  assert.ok(!has(r, /problem-space-brief.*(absent|missing)/),
    'a declared-but-unproduced input must not be a hard failure');
  assert.ok(r.json.knownGap && /no producer/i.test(r.json.knownGap),
    'the gap must be recorded in the result, not quietly tolerated');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the skill names its gate', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/discovery-report/SKILL.md'), 'utf8');
  assert.ok(src.includes('discovery_report_check.js'), 'an undocumented gate is never run');
  assert.ok(/no producer/i.test(src), 'the known gap must be documented where the author will read it');
});

test('a missing report is fail-closed, never a pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreport-missing-'));
  const r = spawnSync('node', [GATE, 'check', '--root', dir, '--report', 'nope.md', '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  assert.match(r.stdout, /cannot read/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a green result says it cannot verify the synthesis', () => {
  const dir = fixture({
    files: { 'research-plan.md': GOOD_PLAN },
    rows: { 'research-plan.md': 'PASS' },
  });
  const r = spawnSync('node', [GATE, 'check', '--root', dir, '--report', 'user-research-report.md', '--json'], { encoding: 'utf8' });
  assert.match(r.stdout, /cannot verify the synthesis|does not check/i,
    'a green provenance gate must not read as a validated report');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// BLIND RUN 8-10 (@code-reviewer seat): `## Research Methods Used` and `## Open Questions` were
// declared inputs that SKILL.md says NEVER to drop, and the gate's own Done-when said "It requires:"
// while omitting them. Measured: a report with a passing input, a complete `## Sources` table, and
// both sections absent exited 0 clean. They are the report's reviewability — the provenance and the
// unresolved-questions record.
// ---------------------------------------------------------------------------------------------

test('BLIND RUN 8-10: a report missing either required section fails and names it', () => {
  for (const missing of ['Research Methods Used', 'Open Questions']) {
    const dir = fixture({ files: { 'research-plan.md': GOOD_PLAN }, rows: { 'research-plan.md': 'PASS' } });
    const f = path.join(dir, 'user-research-report.md');
    const body = report({ rows: { 'research-plan.md': 'PASS' } });
    fs.writeFileSync(f, body.replace(
      new RegExp('\\n## ' + missing + '[\\s\\S]*?(?=\\n## )'), '\n'
    ));
    const r = run(dir);
    const named = (r.json.failures||[]).some((x) => x.indexOf('## ' + missing) !== -1);
    assert.ok(named,
      `a report without ${missing} must fail and name it: ${JSON.stringify(r.json.failures)}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('BLIND RUN 8-10: an empty required section is a failure, not a record', () => {
  const rows = { 'research-plan.md': 'PASS' };
  const dir = fixture({ files: { 'research-plan.md': GOOD_PLAN }, rows });
  const f = path.join(dir, 'user-research-report.md');
  fs.writeFileSync(f, report({ rows })
    .replace(/## Open Questions\n\n1\. Does the admin trust[^\n]*\n/, '## Open Questions\n'));
  const r = run(dir);
  assert.ok((r.json.failures||[]).some((x) => /Open Questions` section is empty/.test(x)),
    `an empty section is a heading, not a record: ${JSON.stringify(r.json.failures)}`);
  fs.rmSync(dir, { recursive: true, force: true });
});
