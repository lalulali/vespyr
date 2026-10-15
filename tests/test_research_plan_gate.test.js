/**
 * tests/test_research_plan_gate.test.js — /research-plan finally has a gate.
 *
 * The skill shipped a SKILL.md and nothing else: no steps, no gate, no tests. Three of its own
 * rules were self-certification:
 *
 *   - goals recorded as `falsifiable? Yes/No`, filled in by the plan's own author
 *   - a "Mom Test Validation" checkbox block, ticked by the same author
 *   - "minimum 5 for qualitative, 30+ for quantitative", which nothing read
 *
 * And a gap: the skill exists to validate hypotheses but never referenced one, so a plan could
 * validate nothing at all.
 *
 * The centrepiece is the Mom Test enforced on the QUESTIONS. Ticking all four boxes while asking
 * "would you use a tool that warned you about address errors" is the exact failure the skill exists
 * to prevent, and it is mechanically detectable — so the boxes are verified against the questions
 * rather than trusted.
 *
 * It is also the last unguarded discovery artefact: /discovery-report compiles research-plan.md
 * alongside the four canvases that got discovery_canvas_check.js.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/research_plan_check.js');

function check(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplan-'));
  const f = path.join(dir, 'research-plan.md');
  fs.writeFileSync(f, body);
  const r = spawnSync('node', [GATE, 'check', '--file', f, '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

// Shared with test_discovery_report_gate.js — one conforming plan, one source. Two hand-maintained
// copies drift, and a drifted fixture silently re-points a test at a shape the gate rejects.
const GOOD = fs.readFileSync(path.join(__dirname, 'fixtures-good-research-plan.md'), 'utf8');

test('a conformant plan passes', () => {
  const r = check(GOOD);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
});

test('the shipped template, written verbatim, fails', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/research-plan/SKILL.md'), 'utf8');
  const m = src.match(/```markdown\n([\s\S]*?)```/);
  assert.ok(m, 'SKILL.md has no markdown template');
  const r = check(m[1]);
  assert.strictEqual(r.code, 1, 'the shipped template must never satisfy its own gate');
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /sample size|Interview Guide|Mom Test box/),
    `the template must fail on substance, not only on placeholders: ${JSON.stringify(r.json.failures)}`);
});

// --- the self-certification defects -------------------------------------------------------------

test('THE DEFECT: all Mom Test boxes ticked, questions ask future intent — still fails', () => {
  const r = check(GOOD
    .replace('1. "Tell me about the last time you abandoned a checkout."',
             '1. "Would you use a tool that warned you about address errors?"')
    .replace('2. "Walk me through what you saw at the address step."',
             '2. "Do you think you would notice a validation error at checkout?"')
    .replace('3. "How have you tried to solve a rejected address before?"',
             '3. "How much would you pay for automatic address checking?"'));
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /ask about future intent rather than past behaviour/),
    `ticking the boxes must not buy a pass: ${JSON.stringify(r.json.failures)}`);
  assert.ok(has(r, /no past-behaviour probe/), JSON.stringify(r.json.failures));
});

test('a self-declared `falsifiable? Yes` with no observable fails — self-certification', () => {
  // Deliberately NOT phrased as "Understand whether..." — that wording trips the exploratory-goal
  // rule, so the test passed even with the self-certification check disabled, and the revert
  // survived. This phrasing isolates the rule: self-certified, no observable, and not exploratory.
  const r = check(GOOD.replace(
    '1. More than 30% of admins who abandon checkout hit a silent field validation error',
    '1. Admins find the checkout intuitive — falsifiable? Yes'
  ).replace(
    '2. At least half of those errors involve a non-US postcode',
    '2. Admins notice address errors when they happen — falsifiable? Yes'
  ));
  assert.ok(has(r, /self-declared/),
    `a goal the plan grades itself must fail: ${JSON.stringify(r.json.failures)}`);
});

test('a purely exploratory goal is caught by its own rule, not by self-certification', () => {
  const r = check(GOOD.replace(
    '1. More than 30% of admins who abandon checkout hit a silent field validation error',
    '1. Understand whether admins find checkout intuitive'
  ));
  assert.ok(has(r, /phrased as exploration/), JSON.stringify(r.json.failures));
});

test('a goal that ALSO carries an observable is not rejected for saying `falsifiable? Yes`', () => {
  const r = check(GOOD.replace(
    '1. More than 30% of admins who abandon checkout hit a silent field validation error',
    '1. More than 30% of admins who abandon checkout hit a silent field validation error — falsifiable? Yes'
  ));
  assert.ok(!has(r, /no observable/), 'redundant self-certification is not the defect; the missing observable is');
});

test('a goal declared NOT falsifiable fails', () => {
  const r = check(GOOD.replace(
    '2. At least half of those errors involve a non-US postcode',
    '2. At least half of those errors involve a non-US postcode — falsifiable? No'
  ));
  assert.ok(has(r, /declared NOT falsifiable/), JSON.stringify(r.json.failures));
});

test('an unticked Mom Test box fails', () => {
  const r = check(GOOD.replace('- [x] Commitment signals are probed', '- [ ] Commitment signals are probed'));
  assert.ok(has(r, /Mom Test box\(es\) are unticked/), JSON.stringify(r.json.failures));
});

// --- the missing hypothesis and the missing bias statement --------------------------------------

test('a plan that never says what it validates fails', () => {
  const r = check(GOOD.replace(/^\*\*Hypothesis:\*\*.*$/m, '')
    .replace(' (validation-brief.md)', ''));
  assert.ok(has(r, /never states WHAT IT VALIDATES/), JSON.stringify(r.json.failures));
});

test('an explicit exploratory admission is accepted — planning before a claim is legitimate', () => {
  const r = check(GOOD.replace(/^\*\*Hypothesis:\*\*.*$/m,
    '**Hypothesis:** none — no prior hypothesis; this is exploratory problem mapping.'));
  assert.ok(!has(r, /never states WHAT IT VALIDATES/),
    'exploratory research is a real mode and must not be forced to invent a hypothesis');
});

test('no sampling-bias statement fails — the failure the Mom Test exists to prevent', () => {
  const r = check(GOOD.replace(/## Sampling Bias[\s\S]*$/, ''));
  assert.ok(has(r, /deliberately NOT BEING ASKED/i), JSON.stringify(r.json.failures));
});

// --- cohort --------------------------------------------------------------------------------------

test('a sample size below the skill own floor fails', () => {
  const r = check(GOOD.replace('**Sample size:** 8', '**Sample size:** 3'));
  assert.ok(has(r, /Sample size is 3/), JSON.stringify(r.json.failures));
});

test('a quantitative plan is held to the higher floor', () => {
  const r = check(GOOD.replace('**Methodology:** qualitative interviews', '**Methodology:** survey')
    .replace('**Sample size:** 8', '**Sample size:** 12'));
  assert.ok(has(r, /Sample size is 12/), 'a survey needs 30+, not the qualitative floor of 5');
});

test('a cohort with no numeric sample size fails', () => {
  const r = check(GOOD.replace('**Sample size:** 8', '**Sample size:** enough to be useful'));
  assert.ok(has(r, /no numeric \*\*sample size\*\*/), JSON.stringify(r.json.failures));
});

test('no recruitment method fails — recruitment is where cohorts go to die', () => {
  const r = check(GOOD.replace('- **Recruitment:** In-app intercept plus a panel of trial admins from partner communities', ''));
  assert.ok(has(r, /no \*\*recruitment\*\* method/), JSON.stringify(r.json.failures));
});

// --- guide ---------------------------------------------------------------------------------------

test('a missing Part 2 fails — that half carries the evidence', () => {
  const r = check(GOOD.replace(/### Part 2: Behavioral Questions[\s\S]*?(?=### Mom Test)/, ''));
  assert.ok(has(r, /Part 2 \(behavioural questions\)/), JSON.stringify(r.json.failures));
});

test('solution pitching in a question fails', () => {
  const r = check(GOOD.replace(
    '1. "Tell me about the last time you abandoned a checkout."',
    '1. "Tell me about the last time our solution failed you."'
  ));
  assert.ok(has(r, /pitch the solution/), JSON.stringify(r.json.failures));
});

test('a Method section is recognised — the heading regex must not double-anchor', () => {
  // Regression: `section(text, '^(?:Method|Methodology)')` produced two `^` anchors in sequence and
  // could never match, so every plan with a perfectly good Method section was told it had none.
  const r = check(GOOD);
  assert.ok(!has(r, /No `## Method` section/), 'a real Method section must satisfy the check');
});

// --- wiring and contract -------------------------------------------------------------------------

test('the skill names its gate, and the template carries the two new fields', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/research-plan/SKILL.md'), 'utf8');
  assert.ok(src.includes('research_plan_check.js'), 'an undocumented gate is never run');
  assert.ok(/^\*\*Hypothesis:\*\*/m.test(src), 'the template must carry a Hypothesis field');
  assert.ok(/Sampling Bias/.test(src), 'the template must carry a Sampling Bias section');
});

test('a missing file and an empty file both fail closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplan-missing-'));
  const missing = spawnSync('node', [GATE, 'check', '--file', path.join(dir, 'nope.md'), '--json'], { encoding: 'utf8' });
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stdout, /cannot read/);
  const empty = path.join(dir, 'empty.md');
  fs.writeFileSync(empty, '   \n');
  const r = spawnSync('node', [GATE, 'check', '--file', empty, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a green result says it is not a research judgement', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplan-note-'));
  const f = path.join(dir, 'research-plan.md');
  fs.writeFileSync(f, GOOD);
  const r = spawnSync('node', [GATE, 'check', '--file', f, '--json'], { encoding: 'utf8' });
  assert.match(r.stdout, /need a researcher|does not judge/i,
    'a green compliance gate must not read as a research finding');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// BLIND RUNS 8-10 (@code-reviewer seat): the Mom Test block was DELETABLE, and deleting it passed
// (exit 0) while leaving it unticked failed (exit 1). The cheapest passing answer was to remove the
// section the skill declares as its verification step. Found by re-checking the implementation.
// ---------------------------------------------------------------------------------------------

test('BLIND RUN 8-10: the Mom Test block is required, not deletable', () => {
  const noBlock = GOOD.replace(/### Mom Test Validation[\s\S]*?(?=## Sampling Bias)/, '');
  const r = check(noBlock);
  assert.strictEqual(r.code, 1, 'deleting the verification block must not be the cheapest pass');
  assert.ok(has(r, /No `## Mom Test Validation` block/), JSON.stringify(r.json.failures));
});

test('BLIND RUN 8-10: an unticked box still fails, so the check is not a blanket rejection', () => {
  const r = check(GOOD.replace('- [x] Commitment signals are probed', '- [ ] Commitment signals are probed'));
  assert.ok(has(r, /Mom Test box\(es\) are unticked/), JSON.stringify(r.json.failures));
});

test('BLIND RUN 8-10: a fully ticked block still passes', () => {
  const r = check(GOOD);
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});
