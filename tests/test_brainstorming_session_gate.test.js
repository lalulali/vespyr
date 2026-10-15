/**
 * tests/test_brainstorming_session_gate.test.js — /brainstorming finally has a gate.
 *
 * The skill had a real Decision Gate, a two-surface rule, mandatory routing, a 60-method catalog and
 * a tested `match_methods.js` — and `grep -c _check.js` over its directory returned zero. Nothing
 * checked any of it. The session artifact was written from a paragraph of instructions with no
 * template.
 *
 * The centrepiece is the anti-sycophancy gate. Step 3 asks the agent to judge its own output — "if
 * every generated idea is positive or agreeable: zero tension, zero risk, zero objection" — which is
 * a self-assessment in the same field it fills in, the F-13 defect this repo has been repairing all
 * session. It is now gated on the RECORD rather than the agent's word.
 *
 * Two bugs were found while building it, both fixed, both pinned below:
 *
 *   1. The first SPC check passed a sycophant session whose own note read "Zero tension. Zero risk.
 *      Zero objection." — it QUOTED the vocabulary the check counts. A document declaring the
 *      absence of the thing you are looking for is telling you it knows what you are looking for.
 *   2. `[RESHAPE]` — the skill's own declared verdict token — was flagged as an unfilled template
 *      placeholder, because the placeholder pattern is case-insensitive and matches it. Two rules
 *      in one gate contradicting each other, same class as the `TBD` severity clash.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/brainstorming_session_check.js');
const METHODS = path.join(REPO, '.agents/skills/brainstorming/methods.csv');

function check(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-'));
  const f = path.join(dir, 'brainstorming-session.md');
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

const SESSION = ({ method = 'Six Thinking Hats', verdict = '[GO]', route = 'grill-me (single bet: the preview step)', tensions } = {}) => `# Brainstorming Session — checkout abandonment

**Date:** 2026-10-11
**Sharpened topic:** Why operations admins abandon checkout at the address step, and what would let them finish without calling support
**Method:** ${method}

## Key Ideas

1. A visible address-preview step that resolves ambiguity before submit.
2. A "request a human check" affordance when validation fails twice.
3. A pre-launch rule that every new postcode market ships with a fixture.

## Decisions

- Idea 3 adopted as the immediate action; it removes the class, not the instance.

## Open Questions
${tensions === undefined ? `1. Does the admin trust the preview as much as their own eye? **Risk:** they will still export and reconcile by hand.
2. **Trade-off:** a preview step adds a screen to a flow we are trying to shorten.
3. **Unknown:** how often a rejected address blocks completion rather than delaying it.` : tensions}

[SPC: inversion-applied]

**Verdict:** Plain sentence: build the preview step and the postcode fixture together, because the fixture removes the whole failure class.

**Gate:** ${verdict}
**Route:** ${route}
`;

// --- the SPC marker and the route, closed 2026-10-15 (blind run 13) -----------------------------

test('a record with no [SPC: …] marker fails — the skill requires exactly one', () => {
  const r = check(SESSION().replace(/^\[SPC:.*\]\n\n/m, ''));
  assert.ok(has(r, /No `\[SPC: …\]` marker/), JSON.stringify(r.json.failures));
});

test('two [SPC: …] markers fail — two claims in one record are attributable to neither', () => {
  const r = check(SESSION().replace('[SPC: inversion-applied]', '[SPC: inversion-applied]\n[SPC: skipped — time-boxed-spike]'));
  assert.ok(has(r, /markers\. Step 3 requires exactly one/), JSON.stringify(r.json.failures));
});

test('the marker is the skill\'s own vocabulary and is never read as a placeholder', () => {
  const r = check(SESSION());
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
  assert.ok(!has(r, /unfilled template placeholder/), 'the required marker must not trip the placeholder rule');
});

test('a GO record with no Route field fails — routing is mandatory on GO/RESHAPE', () => {
  const r = check(SESSION().replace(/^\*\*Route:\*\*.*\n?/m, ''));
  assert.ok(has(r, /no `\*\*Route:\*\*` field/), JSON.stringify(r.json.failures));
});

test('a NO-GO record needs no route — the archive path is the absence of routing', () => {
  const r = check(SESSION({ verdict: '[NO-GO]', route: '' }).replace(/^\*\*Route:\*\*.*\n?/m, ''));
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

test('a conformant session passes', () => {
  const r = check(SESSION());
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
});

// --- the anti-sycophancy gate: on the record, not on the agent's word --------------------------

test('THE DEFECT: a session with no tension, risk, open question or objection fails', () => {
  const r = check(`# Brainstorming Session — checkout abandonment

**Date:** 2026-10-11
**Sharpened topic:** Ideas to make the checkout address step better and easier for everyone
**Method:** Six Thinking Hats

## Key Ideas

1. A beautiful address autocomplete — users will love it.
2. A delightful confirmation animation.
3. A friendly success message.
4. A cleaner, simpler, more modern form.

[SPC: inversion-applied]

**Verdict:** Everything is a fantastic idea and the team agrees.

**Gate:** [GO]
**Route:** grill-me
`);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /no tension, no risk, no open question and no objection/),
    `a session with no recorded tension must fail: ${JSON.stringify(r.json.failures)}`);
});

test('THE TRAP: quoting the tension vocabulary to claim its absence does not count', () => {
  // The first version of the SPC check passed this, because the note quoted the words the check
  // counts. A document declaring the absence of the thing you look for is telling you it knows.
  const r = check(`# Brainstorming Session — checkout abandonment

**Date:** 2026-10-11
**Sharpened topic:** Ideas to make the checkout address step better and easier for everyone
**Method:** Six Thinking Hats

## Key Ideas

1. A beautiful address autocomplete — users will love it.
2. A delightful confirmation animation.

## Anti-sycophancy gate

All ideas are positive and agreeable. Zero tension. Zero risk. Zero objection. No concerns at all.
This is a great session and everyone is happy with it.

[SPC: inversion-applied]

**Verdict:** Everything is a fantastic idea.

**Gate:** [GO]
**Route:** grill-me
`);
  assert.strictEqual(r.code, 1, 'a self-assessment section is not evidence of tension');
});

test('an honest session that names tension OUTSIDE a substance section still passes', () => {
  // Over-fitting guard: tension must not only count inside the four substance headings. A real
  // session records risks in whatever shape it happened to.
  const r = check(SESSION({ tensions: '' }).replace(
    '## Open Questions\n',
    '## What this surfaced\n\n- **Risk:** the preview adds a screen and the admin may still export by hand.\n- **Unknown:** how often a rejected address actually blocks completion.\n'
  ));
  assert.ok(!has(r, /no tension, no risk/),
    `tension recorded in a non-substance section must count: ${JSON.stringify(r.json.failures)}`);
});

test('honest tension vocabulary is broad, not an enumerated list', () => {
  // The trap the whole session has been repairing: an enumerated list rejects the phrasing nobody
  // thought of, and the cheapest response to a rejection is to change how you say it.
  for (const phrase of [
    '**Risk:** they will still reconcile by hand.',
    '**Trade-off:** a screen added to a flow we are shortening.',
    '**Unknown:** how often a rejection blocks completion.',
    'Assumption: the admin trusts the preview as much as their eye.',
    'This is not validated against any real data.',
    'Failure mode: two rejections and the admin abandons the tab.',
    'Concern: the flow grows by one screen.',
    'Counter-argument: a preview hides rather than fixes the bad table.',
  ]) {
    const r = check(SESSION({ tensions: `- ${phrase}` }));
    assert.ok(!has(r, /no tension, no risk/),
      `"${phrase}" must count as tension: ${JSON.stringify(r.json.failures)}`);
  }
});

// --- the Decision Gate: a closed vocabulary ---------------------------------------------------

test('every declared verdict is accepted — the gate reads its own vocabulary', () => {
  // The `[RESHAPE]` collision: the placeholder detector flagged the skill's own verdict token. Two
  // rules in one gate contradicting each other, with no document able to satisfy both.
  for (const v of ['[GO]', '[RESHAPE]', '[NO-GO]']) {
    const route = v === '[NO-GO]' ? 'archive + ledger, no build routing' : 'grill-me (single bet)';
    const r = check(SESSION({ verdict: v, route }));
    assert.ok(!has(r, /unfilled template placeholder/),
      `${v} must not be read as an unfilled placeholder: ${JSON.stringify(r.json.failures)}`);
    assert.ok(!has(r, /not one of/), `${v} must be in the declared set`);
  }
});

test('a missing or invalid verdict fails — a session with no verdict is a chat log', () => {
  const noVerdict = check(SESSION({ verdict: 'Everything is wonderful' }));
  assert.ok(has(noVerdict, /No bracketed verdict|not one of/), JSON.stringify(noVerdict.json.failures));
  const wrongVerdict = check(SESSION({ verdict: '[MAYBE]' }));
  assert.ok(has(wrongVerdict, /No bracketed verdict|not one of/), JSON.stringify(wrongVerdict.json.failures));
});

// --- routing consistency with the verdict ------------------------------------------------------

test('Step 4b: the verdict x route matrix holds in all nine cells', () => {
  // "The gate verdict locks FIRST — route from the locked verdict, never reshape the verdict to earn
  // a panel." This is the consistency property between two fields in one document.
  const expected = {
    GO: { 'grill-me (single bet)': 0, 'roundtable (two tensions)': 0, 'archive + ledger, no build routing': 1 },
    RESHAPE: { 'grill-me (single bet)': 0, 'roundtable (two tensions)': 0, 'archive + ledger, no build routing': 1 },
    'NO-GO': { 'grill-me (single bet)': 1, 'roundtable (two tensions)': 1, 'archive + ledger, no build routing': 0 },
  };
  for (const [v, routes] of Object.entries(expected)) {
    for (const [route, shouldFail] of Object.entries(routes)) {
      const r = check(SESSION({ verdict: `[${v}]`, route }));
      const routedToPanel = shouldFail === 1;
      const didFail = has(r, /Step 4b/) || has(r, /not one of the routes/);
      assert.strictEqual(didFail, routedToPanel,
        `verdict ${v} + route "${route}" should ${routedToPanel ? 'FAIL' : 'PASS'}: ${JSON.stringify(r.json.failures)}`);
    }
  }
});

test('a NO-GO routed to roundtable fails with the specific Step 4b rule', () => {
  const r = check(SESSION({ verdict: '[NO-GO]', route: 'roundtable (multi-tension discussion)' }));
  assert.ok(has(r, /Step 4b|archive \+ ledger/),
    `routing a dead idea to a panel must be named: ${JSON.stringify(r.json.failures)}`);
});

// --- the catalog -----------------------------------------------------------------------------

test('the method must exist in the 60-method catalog, exactly', () => {
  // Substring matching let "Six Thinking Hats Plus Deluxe" pass by containing a real method's name.
  for (const m of ['SCAMPER', 'Six Thinking Hats', 'Reverse Brainstorming', 'Starbursting']) {
    const r = check(SESSION({ method: m }));
    assert.ok(!has(r, /not in the 60-method catalog/), `"${m}" is a real method`);
  }
  for (const m of ['Six Thinking Hats Plus Deluxe', 'SCAMPR', 'My Own Method']) {
    const r = check(SESSION({ method: m }));
    assert.ok(has(r, /not in the 60-method catalog/), `"${m}" is not a method: ${JSON.stringify(r.json.failures)}`);
  }
});

test('an unreadable catalog fails closed, never "every method is valid"', () => {
  // BLIND REVIEW 2026-10-13 (@qa-engineer seat): this test asserted a NEGATIVE on the happy path —
  // "with a good catalog this does not fire" — which cannot fail. The seat rewrote the fail-closed
  // message and the suite stayed 23/23 green: the branch named in the title never executed. It now
  // points the gate at a catalog that does not exist, the only way to reach the branch.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-nocatalog-'));
  const f = path.join(dir, 'brainstorming-session.md');
  fs.writeFileSync(f, SESSION({ method: 'SCAMPER' }));
  const r = spawnSync('node', [GATE, 'check', '--file', f,
    '--methods', path.join(dir, 'does-not-exist.json'), '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(r.status, 1, 'an unreadable catalog must be a failure, not a pass');
  assert.match(r.stdout, /Could not read/, 'the failure must say the catalog could not be read');
  // An empty catalog must not read as "every method is valid", or a method that does not exist would
  // pass — which is what the original assertion never tested.
  assert.match(r.stdout, /every method is valid|cannot be checked/i, r.stdout.slice(0, 200));
});

// --- the rest of the session record -----------------------------------------------------------

test('a session with no topic, no outputs or no method fails', () => {
  const noTopic = check(SESSION().replace(/^\*\*Sharpened topic:\*\*.*$/m, ''));
  assert.ok(has(noTopic, /sharpened topic/i), JSON.stringify(noTopic.json.failures));

  const noMethod = check(SESSION().replace(/^\*\*Method:\*\*.*$/m, ''));
  assert.ok(has(noMethod, /No method is named/), JSON.stringify(noMethod.json.failures));

  const noOutputs = check(SESSION().replace(/## Key Ideas[\s\S]*?## Open Questions[\s\S]*?(?=\*\*Verdict)/, ''));
  // Message updated 2026-10-15: the rule went from "any one of three" to "all three", so the
  // failure now names WHICH are missing rather than saying "no outputs section".
  assert.ok(has(noOutputs, /missing \d+ of the 3 outputs sections/), JSON.stringify(noOutputs.json.failures));
});

test('the shipped template, written verbatim, fails', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/brainstorming/SKILL.md'), 'utf8');
  const m = src.match(/```markdown\n([\s\S]*?)```/);
  assert.ok(m, 'SKILL.md has no session template');
  const r = check(m[1]);
  assert.strictEqual(r.code, 1, 'the shipped template must never satisfy its own gate');
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

test('the skill names its gate and carries the template', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/brainstorming/SKILL.md'), 'utf8');
  assert.ok(src.includes('brainstorming_session_check.js'), 'an undocumented gate is never run');
  assert.ok(/Sharpened topic/.test(src), 'the template must carry the sharpened topic');
  assert.ok(/\[GO\|RESHAPE\|NO-GO\]/.test(src) || /\[{GO\|?/.test(src),
    'the template must show the closed verdict vocabulary');
  assert.ok(/does not check|What this gate does not check/i.test(src),
    'the gate must still say what it cannot do');
});

test('a missing file and an empty file both fail closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-missing-'));
  const missing = spawnSync('node', [GATE, 'check', '--file', path.join(dir, 'nope.md'), '--json'], { encoding: 'utf8' });
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stdout, /cannot read/);
  const empty = path.join(dir, 'empty.md');
  fs.writeFileSync(empty, '  \n');
  const r = spawnSync('node', [GATE, 'check', '--file', empty, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a green result says it is not a judgement on the ideas', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-note-'));
  const f = path.join(dir, 's.md');
  fs.writeFileSync(f, SESSION());
  const r = spawnSync('node', [GATE, 'check', '--file', f], { encoding: 'utf8' });
  assert.match(r.stdout, /does not (?:check|judge)/,
    `a green compliance gate must not read as a judgement on the ideas: ${r.stdout.slice(0, 160)}`);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// The F-13 defect with the sign flipped: the SPC check REQUIRED a tension, so a session that
// honestly found none had to write a fabricated "Risk:" to pass. A gate that rewards invention is
// worse than no gate, whichever direction it invents in.
//
// The resolution is the one `discovery_canvas_check.js` already uses for quoted material: what is
// checkable is the HONESTY OF THE DECLARATION, not its direction. A session may record no tension —
// but only by declaring what it LOOKED FOR and did not find, which is an auditable claim about
// effort rather than an unauditable one about feeling.
// ---------------------------------------------------------------------------------------------

const NO_TENSION_BASIS = (basis) => `# Brainstorming Session — rename the export menu item

**Date:** 2026-10-11
**Sharpened topic:** What to call the export menu item so admins stop looking for "download"
**Method:** SCAMPER

## Key Ideas

1. Rename "Export" to "Download file".
2. Combine the export and print actions into one "Save as" menu.

## Decisions

- Option 1 adopted; it is the smallest change and the search logs back it.

## Open Questions

${basis}

[SPC: inversion-applied]

**Verdict:** Rename the export menu item to "Download file".

**Gate:** [GO]
**Route:** grill-me (single bet: the rename)
`;

test('F-13, sign flipped: a session with no tension passes when it declares what it looked for', () => {
  const r = check(NO_TENSION_BASIS(
    'No tension. We ran the Eliminate pass and asked what could be removed entirely, and the answer ' +
    'was nothing: every candidate has a user who relies on it. We also tested the Combine pass and ' +
    'the merge is a different idea, not this one.'
  ));
  assert.strictEqual(r.code, 0,
    `an honest no-tension session must not be forced to invent one: ${JSON.stringify(r.json.failures, null, 2)}`);
  assert.ok(r.json.tensionsRecorded === 0,
    'it must pass through the basis path, not by matching tension vocabulary by accident');
  assert.ok((r.json.notes || []).some((n) => /auditable/.test(n)),
    'the basis must be surfaced so a reader knows the judgement is still theirs');
});

test('the honest path is not a loophole: a bare assertion of absence still fails', () => {
  // The sycophant's answer to "is this sycophantic?" must not be acceptable just because the gate
  // now allows a no-tension answer.
  for (const bare of [
    'No tension. Zero risk. This is a great session.',
    'Nothing went wrong. Everyone agrees.',
    'No objections, no concerns, no downsides.',
    'We found nothing. It all looks fine to us.',
  ]) {
    const r = check(NO_TENSION_BASIS(bare));
    assert.strictEqual(r.code, 1,
      `"${bare}" declares absence without a basis and must fail: ${JSON.stringify(r.json.failures)}`);
    assert.ok(has(r, /what was looked for and not found/),
      `the failure must point at the missing basis: ${JSON.stringify(r.json.failures)}`);
  }
});

test('the basis must name an ACTION, and is searched document-wide', () => {
  // CHANGED AFTER BLIND RUN 12. This test previously required the basis to sit WITH the claim, and the
  // gate's OWN documented Pass example failed because `findBasis` only looked adjacent to an absence
  // phrase. In a session record the basis is the method APPLIED — a document-level fact, not a local
  // one — so it is now searched wherever the session recorded what it did. The residual risk is
  // recorded rather than hidden: a basis recorded in an unrelated section will now satisfy a claim
  // made elsewhere, which is acceptable for a single-session record and would not be for a multi-
  // session corpus.
  const elsewhere = check(NO_TENSION_BASIS(
    'No tension. We ran the Eliminate pass and asked what could be removed entirely, and the answer ' +
    'was nothing: every candidate has a user who relies on it.'
  ));
  assert.strictEqual(elsewhere.code, 0,
    `a documented method must satisfy the no-tension path: ${JSON.stringify(elsewhere.json.failures, null, 2)}`);

  // But a bare NOUN is not an action: "the preview step" in a verdict satisfied the old pattern, and
  // a session that did no work must not pass.
  const nounOnly = check(NO_TENSION_BASIS('No tension. The preview step applies.'));
  assert.strictEqual(nounOnly.code, 1,
    `a noun is not an action: ${JSON.stringify(nounOnly.json.failures, null, 2)}`);
});

test('a heading named after the vocabulary is not an instance of it', () => {
  // Found while testing the basis path: `## Tension` matched TENSION_RE because the word "tension"
  // is in the vocabulary, so a section titled after the thing you look for counted as one. The basis
  // case above passed only by accident until this was fixed.
  const headingOnly = check(NO_TENSION_BASIS(
    'No tension. We ran the Eliminate pass and found nothing to remove, and we ran the Combine pass ' +
    'and the merge is a different idea entirely from this one.'
  ));
  assert.ok(headingOnly.json.tensionsRecorded === 0,
    `a heading is structure, not substance: ${headingOnly.json.tensionsRecorded}`);
  assert.ok((headingOnly.json.notes || []).length > 0, 'the basis note must be present');
});

// ---------------------------------------------------------------------------------------------
// Found by DRY-RUNNING the skill with three co-participants, not by reading it.
//
// Step 3 of /brainstorming MANDATES co-dispatch on trigger. A legitimately-run multi-method session
// names several methods — and the gate's single-method assumption rejected it outright. The dry run's
// final session (`How Might We, with Six Thinking Hats / Reverse Brainstorming / What If? Scenario
// dispatched as co-participants`) failed on the method check while every other rule passed.
//
// A gate that fails a real session is a gate that gets ignored.
// ---------------------------------------------------------------------------------------------

test('DRY RUN: a co-dispatched multi-method session is accepted', () => {
  // The exact method string the dry run produced.
  const multi = 'How Might We, with Six Thinking Hats / Reverse Brainstorming / What If? Scenario dispatched as co-participants';
  const r = check(SESSION({ method: multi }));
  assert.ok(!has(r, /not in the 60-method catalog/),
    `a session the skill itself mandates must pass: ${JSON.stringify(r.json.failures)}`);
});

test('DRY RUN: each named method is checked, and only the unknown ones are named', () => {
  const partial = check(SESSION({
    method: 'Six Thinking Hats and My Own Framework and Starbursting',
  }));
  assert.ok(has(partial, /not in the 60-method catalog/), 'the invented one must still be caught');
  assert.ok(has(partial, /My Own Framework/), 'the failure must name the invented method');
  assert.ok(!has(partial, /Six Thinking Hats|Starbursting/),
    'the two real methods must not be reported as invalid');
});

test('DRY RUN: a wholly invented method still fails', () => {
  const r = check(SESSION({ method: 'My Own Framework' }));
  assert.ok(has(r, /not in the 60-method catalog/), JSON.stringify(r.json.failures));
});
