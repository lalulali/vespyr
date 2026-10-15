/**
 * tests/test_validation_record_gate.test.js — /validation-patterns finally has a gate.
 *
 * The skill ships a catalog and a tested `match_methods.js`, and **no gate of any kind**: no Decision
 * Gate step, no gate script, and nothing checks the verdict `@founder` is said to provide. The record
 * format is the entire artifact contract and it is written from five lines of prose.
 *
 * The centrepiece is the SIGNAL. Step 3 says "define the signal (what result validates the
 * hypothesis?)" and nothing ever checked it, so the cheapest passing record defined success and
 * stopped. A test that cannot fail is not a test, and a verdict reached by one is not a judgement —
 * it is a preference. Same family as `research-plan`'s `{goal} — falsifiable? Yes/No`.
 *
 * Three bugs were found while building it, all the same shape and all fixed:
 *   1. `[VALIDATION]` — the record marker the skill's own format MANDATES — was flagged as an unfilled
 *      template placeholder, so no conformant record could exist.
 *   2. `` `[RESHAPE]` `` was matched with its brackets and compared against the bare word, so a
 *      conformant verdict read as out-of-set.
 *   3. The method check used substring matching, so "Concierge MVP Extreme" passed by containing a real
 *      method's name. (This is now the third gate in this session to need that fix.)
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/validation_record_check.js');
const METHODS = path.join(REPO, '.agents/skills/validation-patterns/methods.csv');

function check(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'valrec-'));
  const f = path.join(dir, 'validation-results.md');
  fs.writeFileSync(f, body);
  const r = spawnSync('node', [GATE, 'check', '--file', f, '--methods', METHODS, '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

const RECORD = ({ method = 'Concierge MVP', verdict = 'RESHAPE', signal, measure, confound } = {}) => `@memory-controller write active-decisions.md
### [VALIDATION] ${method} — admins abandon checkout at the address step [date: 2026-10-11] [agent: @founder]

**Hypothesis:** At least 30% of operations admins who abandon checkout at the address step would accept a human-checked address.

**Method used:** ${method}. Test: recruit 12 abandoning admins by in-app intercept over 3 weeks and offer a manual address check within 30 minutes.

**Signal.** ${signal === undefined
    ? 'This validates the hypothesis if 6 or more of the 12 accept and 4 complete checkout within 48 hours. It invalidates the hypothesis if fewer than 2 accept, or if acceptance is driven by impatience with a slow page rather than by the address problem — in which case we are wrong about the cause.'
    : signal}

**Measure.** 12 participants over 3 weeks.

**Confounds.** ${confound === undefined
    ? 'A selected sample: these users already contacted support once, so they may be more willing than the population. A promo credit would also explain acceptance, so none is offered.'
    : confound}

**Verdict:** \`[${verdict}]\` — the mechanism is validated but the segment is narrower than the hypothesis claims.

**Status:** active
`;


const BARE = ({ signal, measure, confound } = {}) => `@memory-controller write active-decisions.md
### [VALIDATION] Concierge MVP — admins abandon checkout at the address step [date: 2026-10-11] [agent: @founder]

**Hypothesis:** Operations admins who abandon checkout would accept a human-checked address if we offered one.

**Method used:** Concierge MVP. Test: offer a manual address check to abandoning admins.

**Signal.** ${signal}

**Measure.** ${measure}

**Confounds.** ${confound}

**Verdict:** \`[GO]\`

**Status:** active
`;

test('a conformant record passes', () => {
  const r = check(RECORD());
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
});

// --- the centrepiece: the signal must be able to fail --------------------------------------------

test('THE DEFECT: a signal defined only in the success direction fails', () => {
  // The record that Step 3's own wording invites: define what success looks like, and stop.
  const r = check(RECORD({
    signal: 'This validates the hypothesis if the click rate exceeds 15%. Demand exists for a human '
      + 'address check, and we proceed to build the concierge flow.',
  }));
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /never what would INVALIDATE/),
    `a test that cannot fail is not a test: ${JSON.stringify(r.json.failures)}`);
});

test('a record with no signal at all fails', () => {
  // Isolated: the default verdict prose says "the mechanism is validated", which incidentally
  // satisfies the validate direction. Strip it so this test measures the signal, not the verdict.
  const r = check(RECORD({ signal: 'ran the test and looked at the results.' })
    .replace(/ — the mechanism is validated but the segment is narrower than the hypothesis claims\./, ' — pending.'));

  assert.ok(has(r, /No signal is defined in either direction/), JSON.stringify(r.json.failures));
});

test('honest invalidation phrasings are accepted — the vocabulary is not a list', () => {
  // The trap this session has repaired repeatedly: an enumerated list rejects the phrasing nobody
  // thought of, and the cheapest response to a rejection is to change how you say it.
  for (const s of [
    'Validated if 6 of 12 accept. Invalidated if fewer than 2 accept.',
    'Confirmed if the rate exceeds 15%; this fails if it stays under 5%.',
    'We are wrong about the cause if acceptance tracks page slowness, so we do not proceed.',
    'Supports the hypothesis if 4 complete; falsified if none complete.',
    'If it falls below 2 of 12 we kill the idea and stop building.',
  ]) {
    const r = check(RECORD({ signal: s }));
    assert.ok(!has(r, /never what would INVALIDATE|No signal is defined/),
      `"${s.slice(0, 40)}…" must be an acceptable two-directional signal: ${JSON.stringify(r.json.failures)}`);
  }
});

test('the measure must contain a number — a denominator is not optional', () => {
  for (const m of ['', 'a handful of users', 'some admins', 'enough to be confident']) {
    const r = check(BARE({
      signal: 'validates if most accept; invalidates if almost none accept.',
      measure: m,
      confound: 'these users already contacted support once, so they may be more willing',
    }));
    assert.ok(has(r, /duration or sample size with a number/),
      `"${m}" is not a measure: ${JSON.stringify(r.json.failures)}`);
  }
  const withNumber = check(RECORD({ measure: '12 participants over 3 weeks' }));
  assert.ok(!has(withNumber, /duration or sample size with a number/), 'a number is a number');
});

// --- the signal must be IN the signal field, closed 2026-10-15 (blind run 13, BLOCKING) ----------
// The check read the label-stripped WHOLE BODY, so a record with the `**Signal.**` field deleted
// passed whenever the Verdict or Method-used prose contained both directions. The old "no signal at
// all" test kept the field and removed only a phrase, so it never exercised this.

test('a missing Signal field fails even when Verdict prose carries both directions', () => {
  const body = BARE({
    signal: undefined,
    measure: '12 participants over 3 weeks',
    confound: 'Selection bias.',
  }).replace(/\*\*Signal\.\*\*[^\n]*\n?/, '');
  const r = check(body);
  assert.strictEqual(r.code, 1, `a signal written into the verdict is not a test design: ${JSON.stringify(r.json.failures)}`);
  assert.ok(has(r, /No signal field/), JSON.stringify(r.json.failures));
});

test('an empty Signal field is not rescued by the Method used field', () => {
  const r = check(BARE({
    signal: '',
    measure: '12 participants over 3 weeks',
    confound: 'Selection bias.',
  }).replace('**Method used:** Concierge MVP.', '**Method used:** Concierge MVP. Validates if 4 of 12 convert; invalidates if fewer than 2 convert.'));
  assert.strictEqual(r.code, 1, `borrowed signal must not pass: ${JSON.stringify(r.json.failures)}`);
});

test('honest threshold phrasings in the Signal field are accepted', () => {
  // The architect seat measured this exact sentence rejected with "No signal is defined in either
  // direction" — an explicit success threshold AND an explicit stop condition. Rejecting it pushes
  // the author to reword a correct experiment, which is the failure mode this audit keeps finding.
  for (const s of [
    '6/12 completing is enough to proceed; fewer than 2/12 means the address problem is not the cause.',
    'We proceed at 4 or more of 12; we stop below 2.',
    'At least 15% must convert, or we abandon it.',
    'It validates if 4 accept. It invalidates if the rate stays below 5%.',
  ]) {
    const r = check(BARE({ signal: s, measure: '12 participants over 3 weeks', confound: 'Selection bias.' }));
    assert.strictEqual(r.code, 0, `rejected an honest two-sided signal: "${s.slice(0, 50)}" — ${JSON.stringify(r.json.failures)}`);
  }
});

test('a plan to observe is not a confound', () => {
  const none = check(BARE({
    signal: 'validates if 6 of 12 accept; invalidates if fewer than 2 accept.',
    measure: '12 participants over 3 weeks',
    confound: 'We will see how it goes and learn from the result.',
  }));
  assert.ok(has(none, /plan to observe, not a confound/), JSON.stringify(none.json.failures));
});

// --- the confound rule, closed 2026-10-15 (run 12's F1/HIGH known gap) ---------------------------
// Two bugs, two different shapes. The SCOPE bug: the rule scanned the whole body, so the word "paid"
// in a Test line satisfied it with the field deleted. The VOCABULARY bug: the first fix then demanded
// causal vocabulary and rejected a third of honest confounds. These tests pin both ends — the field
// must be read, and honest phrasing must survive.

test('the confound field is READ — a confound word elsewhere does not satisfy it', () => {
  // The Test line says "track conversion to paid"; `paid` is in the confound vocabulary. Before the
  // fix, that alone made a record with no confound field pass.
  for (const [label, confound] of [
    ['field removed', undefined],
    ['field renamed to Notes', undefined],
    ['field says None', 'None.'],
    ['field says not assessed', 'Not assessed.'],
    ['field says n/a', 'N/A'],
    ['field says TBD', 'TBD'],
    ['field says unknown', 'Unknown.'],
    ['field says a dash', '—'],
  ]) {
    let body = BARE({
      signal: 'validates if 6 of 12 accept; invalidates if fewer than 2 accept.',
      measure: '12 participants over 3 weeks',
      confound,
    });
    if (label === 'field removed') body = body.replace(/\*\*Confounds\.\*\* .*\n/, '');
    if (label === 'field renamed to Notes') body = body.replace('**Confounds.**', '**Notes.**');
    const r = check(body);
    assert.strictEqual(r.code, 1, `${label}: expected FAIL, got ${JSON.stringify(r.json.failures)}`);
  }
});

test('honest confounds survive — the rejection rate is the thing that must stay at zero', () => {
  // Phrasings a vocabulary-based rule rejected. Measured at 33% rejection before this rule was
  // narrowed; a gate that rejects honest work is worse than a vacuous one, because the cheapest
  // response is to rewrite the sentence until it passes.
  for (const confound of [
    'We have no control group.',
    'The window overlapped a partner campaign.',
    'Nobody has confirmed the 14-day window matches the buying cycle.',
    'Support volume rose that week for unrelated reasons.',
    'Awareness of the trial came from an internal announcement.',
    'The measure was recorded by the same person who ran the sessions.',
    'The success threshold of 4 was chosen after seeing the data.',
    'Selection bias.',
  ]) {
    const r = check(BARE({
      signal: 'validates if 6 of 12 accept; invalidates if fewer than 2 accept.',
      measure: '12 participants over 3 weeks',
      confound,
    }));
    assert.strictEqual(r.code, 0, `rejected an honest confound: "${confound}" — ${JSON.stringify(r.json.failures)}`);
  }
});

test('an unrecognized confound is a disclosed note, never a silent pass', () => {
  // The gate cannot read for meaning. When it does not recognize the vocabulary it says so rather
  // than either failing the record or quietly accepting it.
  const r = check(BARE({
    signal: 'validates if 6 of 12 accept; invalidates if fewer than 2 accept.',
    measure: '12 participants over 3 weeks',
    confound: 'We have no control group.',
  }));
  assert.strictEqual(r.code, 0);
  assert.ok(r.json.notes.some((n) => /names no term the gate recognizes/.test(n)),
    `the limitation must be disclosed: ${JSON.stringify(r.json.notes)}`);
});

// --- the catalogue -------------------------------------------------------------------------------

test('the method must exist in the 30-method catalog, exactly', () => {
  for (const m of ['Concierge MVP', 'Smoke Test Design', 'Fake Door Test', 'Wizard of Oz MVP']) {
    const r = check(RECORD({ method: m }));
    assert.ok(!has(r, /not in the 30-method catalog/), `"${m}" is a real method`);
  }
  for (const m of ['Concierge MVP Extreme', 'Smoke Tes', 'My Own Framework']) {
    const r = check(RECORD({ method: m }));
    assert.ok(has(r, /not in the 30-method catalog/),
      `"${m}" is not a method: ${JSON.stringify(r.json.failures)}`);
  }
});

// --- the gate's own vocabulary must not trip the gate --------------------------------------------

test('the gate reads its own record format — [VALIDATION] is not an unfilled placeholder', () => {
  // Bug 1: `[VALIDATION]`, the marker the skill's OWN format mandates, was flagged as an unfilled
  // template placeholder, so no conformant record could exist. Two rules in one gate contradicting
  // each other. Now the third time this session.
  const r = check(RECORD());
  assert.ok(!has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

test('every declared verdict is accepted, bracketed or bare', () => {
  // Bug 2: `` `[RESHAPE]` `` was matched with its brackets and compared against the bare word.
  for (const v of ['GO', 'RESHAPE', 'NO-GO']) {
    const r = check(RECORD({ verdict: v }));
    assert.ok(!has(r, /not one of/), `\`[${v}]\` must be in the declared set: ${JSON.stringify(r.json.failures)}`);
    assert.strictEqual(r.json.verdict, v, `the parsed verdict must be ${v}`);
  }
  const wrong = check(RECORD({ verdict: 'MAYBE' }));
  assert.ok(has(wrong, /No verdict|not one of/), JSON.stringify(wrong.json.failures));
});

// --- record hygiene ------------------------------------------------------------------------------

test('a record with no hypothesis or no date fails', () => {
  const noHyp = check(RECORD().replace(
    '### [VALIDATION] Concierge MVP — admins abandon checkout at the address step',
    '### [VALIDATION] Concierge MVP — thing'
  ));
  assert.ok(has(noHyp, /hypothesis is not stated/), JSON.stringify(noHyp.json.failures));

  const noDate = check(RECORD().replace('[date: 2026-10-11]', '[date: ???]'));
  assert.ok(has(noDate, /No date/), JSON.stringify(noDate.json.failures));
});

test('the shipped template, written verbatim, fails', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/validation-patterns/SKILL.md'), 'utf8');
  const m = src.match(/```markdown\n([\s\S]*?)```/);
  assert.ok(m, 'SKILL.md has no record template');
  const r = check(m[1]);
  assert.strictEqual(r.code, 1, 'the shipped template must never satisfy its own gate');
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

test('the skill names its gate and carries the template', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/validation-patterns/SKILL.md'), 'utf8');
  assert.ok(src.includes('validation_record_check.js'), 'an undocumented gate is never run');
  assert.ok(/It invalidates the hypothesis if/.test(src),
    'the template must show the invalidation direction — it is the whole point');
  assert.ok(/What this gate does not check/i.test(src), 'the gate must still say what it cannot do');
});

test('a missing file and an empty file both fail closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'valrec-missing-'));
  const missing = spawnSync('node', [GATE, 'check', '--file', path.join(dir, 'nope.md'), '--json'], { encoding: 'utf8' });
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stdout, /cannot read/);
  const empty = path.join(dir, 'empty.md');
  fs.writeFileSync(empty, '  \n');
  const r = spawnSync('node', [GATE, 'check', '--file', empty, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a green result says it is not a judgement on the design', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'valrec-note-'));
  const f = path.join(dir, 'validation-results.md');
  fs.writeFileSync(f, RECORD());
  const r = spawnSync('node', [GATE, 'check', '--file', f], { encoding: 'utf8' });
  assert.match(r.stdout, /not that the design was any good|DESIGNED/i,
    `a green compliance gate must not read as a validated design: ${r.stdout.slice(0, 160)}`);
  fs.rmSync(dir, { recursive: true, force: true });
});
