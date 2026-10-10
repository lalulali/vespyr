/**
 * tests/test_empathy_map_re_audit.test.js — the four defects the first empathy-map gate missed.
 *
 * `/empathy-map` received `discovery_canvas_check.js` earlier in this session, and that gate passed
 * a map that was simultaneously dishonest and useless downstream. It is reproduced verbatim in
 * `PROBE` below; before this file it returned 0 failures.
 *
 * The four defects, in order of how much damage they do:
 *
 *   1. The canvas erases the distinction the skill itself draws. Step 2 defines `Says` as what the
 *      user verbalises and `Thinks` as what they *do not say aloud, inferred* — then renders all
 *      four quadrants as one table with identical formatting. A quoted sentence and the author's
 *      imagination of what someone felt are indistinguishable to the reader.
 *   2. `Segment: admins` / `Scenario: general` is not a persona. A role name with nothing
 *      distinguishing it describes a population, and every downstream decision inherits the vagueness.
 *   3. `interviewed 1` was accepted as a full segment map.
 *   4. Four pains, no order of importance — handing the decision of what to fix to whoever reads
 *      the list first.
 *
 * AND THE ONE THAT MATTERS MOST: a check that can only be satisfied by inventing something is worse
 * than no check. That is F-13, learned the expensive way in blind /launch run 6, and it is pinned
 * here from BOTH sides — see the anti-fabrication block at the bottom.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/discovery_canvas_check.js');

function check(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'empathy-reaudit-'));
  const f = path.join(dir, 'empathy-map.md');
  fs.writeFileSync(f, body);
  const r = spawnSync('node', [GATE, 'check', '--kind', 'empathy-map', '--file', f, '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));
const cav = (r, re) => r.json.caveats && r.json.caveats.some((c) => re.test(c));

/**
 * The map that greened the first gate: 0 failures, from a single interview, with a persona of
 * "admins" in a scenario of "general", unlabelled inference, and four unranked pains.
 */
const PROBE = `# Empathy Map — admins in billing
**Date:** 2026-10-09
**Evidence basis:** interviewed 1

## User & Scenario
- **Segment:** admins
- **Scenario:** general

## Empathy Canvas
| Says | Thinks |
|------|--------|
| "This is fine, nothing to report." | They are quietly convinced the tool was built for someone else. |

| Does | Feels |
|------|-------|
| Opens the export menu, then closes it | Resigned. Defeated. Slightly ashamed of needing help. |

## Pains
1. The export is slow.
2. The report is ugly.
3. Nobody explained the numbers.
4. Support is slow.

## Gains
1. Faster export.
2. Better looking reports.
`;

const GOOD = `# Empathy Map — operations admins at 5-50 person SaaS companies in weekly billing close
**Date:** 2026-10-09
**Evidence basis:** interviewed 6
**Inferred quadrants:** Thinks, Feels

## User & Scenario
- **Segment:** Operations admins at 5-50 person SaaS companies, no analyst on staff, billing close every Friday
- **Scenario:** Friday 4pm, the weekly invoice run, finance lead waiting on the number before a customer call

## Empathy Canvas
| Says | Thinks |
|------|--------|
| "I stopped trusting the number after week three." (P3, 2026-09-28) | Inference: if the first report is wrong, nobody checks the rest, so they pre-verify every figure by hand. |

| Does | Feels |
|------|-------|
| Screenshots the report into the team channel before sharing it | Inference: anxious about being the source of a wrong number in front of a customer. |

## Pains
1. Has no way to tell whether a number is right before it leaves their hands — high, hit by 6 of 6
2. Cannot trace a figure back to the invoice it came from — medium, hit by 4 of 6
3. The export takes four minutes and shows nothing until it finishes — low, hit by 5 of 6

## Gains
1. A visible check step would let them share without hedging in the message.
`;

/** A hypothesis canvas that invents nothing: no quote, no severity, no segment claims. */
const HONEST_HYPOTHESIS = `# Empathy Map — billing admin
**Date:** 2026-10-09
**Evidence basis:** hypothesis — no interviews conducted yet, to validate
**Inferred quadrants:** all four — nothing here is observed

## User & Scenario
- **Segment:** Billing admin at a 20-person ecommerce company (assumed, not validated)
- **Scenario:** Mid-shift, handling a refund request from a customer waiting on chat

## Empathy Canvas
| Says | Thinks |
|------|--------|
| Not observed. No interviews conducted. | Hypothesised: may worry about blame. |

| Does | Feels |
|------|-------|
| Not observed. | Hypothesised: frustrated |

## Pains
1. Hypothesised: refund reasons are hard to find. Severity unknown — not validated.

## Gains
1. Hypothesised: a visible reason field would help. Not validated.
`;

// --- the headline: the map that used to pass ------------------------------------------------------

test('THE DEFECT: the probe that greened the first gate now fails on all four counts', () => {
  const r = check(PROBE);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /never marks which quadrants are INFERENCE/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /too broad to design for/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /stand-in for having one/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /not one carries a severity, frequency, or priority marker/), JSON.stringify(r.json.failures));
  assert.ok(cav(r, /rests on 1 interview/), `N=1 must be a named limit: ${JSON.stringify(r.json.caveats)}`);
});

test('a conformant map passes with no caveats', () => {
  const r = check(GOOD);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  assert.deepStrictEqual(r.json.caveats, [], 'six interviews should raise no limit');
});

// --- 1. observation vs inference -----------------------------------------------------------------

test('unlabelled inference fails — the map cannot tell a quote from a guess', () => {
  // Strip BOTH signals. The fixture marks its inferred cells inline as well as in the header, so
  // removing only the header left the inline markers and the map was still honestly labelled — the
  // test asserted a failure that the fixture did not deserve.
  const r = check(GOOD
    .replace(/^\*\*Inferred quadrants:\*\*.*$/m, '')
    .replace(/Inference: /g, 'They think that ')
    .replace('Inference: anxious', 'Anxious'));
  assert.ok(has(r, /never marks which quadrants are INFERENCE/), JSON.stringify(r.json.failures));
});

test('marking inference inline in the canvas cells is accepted', () => {
  // The declaration is not the only honest way to do it — a canvas that marks its inferred cells
  // directly has told the reader the same thing. Requiring one exact syntax would be the gate
  // imposing formatting, which is not what this check is for.
  const r = check(GOOD
    .replace(/^\*\*Inferred quadrants:\*\*.*$/m, '')
    .replace('Inference: if the first report is wrong', 'Inferred: if the first report is wrong'));
  assert.ok(!has(r, /never marks which quadrants are INFERENCE/),
    'an inline inference marker tells the reader the same thing a declaration does');
});

// --- 2. the persona ------------------------------------------------------------------------------

test('a one-word segment fails — a role name describes a population, not a person', () => {
  const r = check(GOOD.replace(
    '- **Segment:** Operations admins at 5-50 person SaaS companies, no analyst on staff, billing close every Friday',
    '- **Segment:** admins'
  ));
  assert.ok(has(r, /too broad to design for/), JSON.stringify(r.json.failures));
});

test('a vacuous scenario fails — "general" is not a moment', () => {
  for (const vacuous of ['general', 'whenever', 'various', 'typical']) {
    const r = check(GOOD.replace(
      '- **Scenario:** Friday 4pm, the weekly invoice run, finance lead waiting on the number before a customer call',
      `- **Scenario:** ${vacuous}`
    ));
    assert.ok(has(r, /stand-in for having one/), `"${vacuous}" must be rejected: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a real scenario that merely contains a vacuous word is not rejected', () => {
  // Over-fitting guard: the check must match the WHOLE field, not a substring. "everyday" appears
  // inside plenty of legitimate scenarios ("the everyday close"), and rejecting those would push
  // authors toward vague language to satisfy the gate.
  const r = check(GOOD.replace(
    '- **Scenario:** Friday 4pm, the weekly invoice run, finance lead waiting on the number before a customer call',
    '- **Scenario:** The everyday Friday close, finance lead waiting on the number before a customer call'
  ));
  assert.ok(!has(r, /stand-in for having one/),
    `a scenario containing "everyday" is still a scenario: ${JSON.stringify(r.json.failures)}`);
});

test('a canvas with NO User & Scenario section fails on that specifically', () => {
  // Added because disabling the section-exists check did NOT change any test's verdict: the segment
  // check fired on the empty persona either way, so the revert survived. This asserts the message
  // the section check alone produces, which is the only thing that can tell the two apart.
  const r = check(GOOD.replace(/## User & Scenario[\s\S]*?(?=## Empathy Canvas)/, ''));
  assert.ok(has(r, /No `## User & Scenario` section/),
    `the missing-section failure must be reported in its own right: ${JSON.stringify(r.json.failures)}`);
});

// --- 3. sample size, as a limit and not a failure --------------------------------------------------

test('an interviewed basis with no count fails — the count is the whole basis', () => {
  const r = check(GOOD.replace('interviewed 6', 'interviewed'));
  assert.ok(has(r, /states no count/), JSON.stringify(r.json.failures));
});

test('a low N is a named limit, NOT a failure', () => {
  // The interviews already happened. Failing here would only push an author to misstate the number,
  // which is strictly worse than stating a small one honestly.
  const r = check(GOOD.replace('interviewed 6', 'interviewed 2'));
  assert.strictEqual(r.code, 0, `a small N must not fail the gate: ${JSON.stringify(r.json.failures)}`);
  assert.ok(cav(r, /rests on 2 interviews/), JSON.stringify(r.json.caveats));
});

test('the count is read from the parenthetical form too — "interviewed (6 admins)"', () => {
  const r = check(GOOD.replace('interviewed 6', 'interviewed (6 admins, 45 min each)'));
  assert.ok(!has(r, /states no count/),
    `a parenthetical count is a count: ${JSON.stringify(r.json.failures)}`);
  assert.ok(!cav(r, /rests on/), 'six is six, whatever the surrounding prose');
});

// --- 4. pain ranking ------------------------------------------------------------------------------

test('an entirely unranked pain list fails — document order is not priority', () => {
  const r = check(GOOD.replace(/( — (?:high|medium|low)[^\n]*)/g, ''));
  assert.ok(has(r, /not one carries a severity/), JSON.stringify(r.json.failures));
});

test('a partially ranked list fails — a half-decided ordering is still undecided', () => {
  const r = check(GOOD.replace(' — medium, hit by 4 of 6', ''));
  assert.ok(has(r, /pain\(s\) carry no severity|pains carry no severity/), JSON.stringify(r.json.failures));
});

test('frequency counts as a ranking without a severity word', () => {
  const r = check(GOOD
    .replace(' — high', ' — 6 of 6')
    .replace(' — medium, hit by 4 of 6', ' — 4 of 6')
    .replace(' — low, hit by 5 of 6', ' — 5 of 6'));
  assert.ok(!has(r, /severity/), '"6 of 6" is a frequency and answers the same question');
});

// --- the anti-fabrication property: this gate must never reward inventing something ----------------

test('F-13 HELD: an honest hypothesis canvas passes without inventing a quote or a severity', () => {
  // Learned in blind /launch run 6: a check whose cheapest passing answer is a fabrication is
  // worse than no check. Every rule added in this file must be satisfiable honestly, and this is
  // the test that says so for the whole skill.
  const r = check(HONEST_HYPOTHESIS);
  assert.strictEqual(r.code, 0,
    `the honest path must pass: ${JSON.stringify(r.json.failures, null, 2)}`);
  assert.ok(cav(r, /severity unknown/),
    'an unranked pain should be named as a limit, not demanded as a number');
});

test('an honest "unknown" severity is accepted — the check must not force a guess', () => {
  const r = check(GOOD
    .replace(' — high, hit by 6 of 6', ' — severity unknown')
    .replace(' — medium, hit by 4 of 6', ' — severity unknown, not yet ranked')
    .replace(' — low, hit by 5 of 6', ' — not yet ranked'));
  assert.strictEqual(r.code, 0, `"unknown" is an honest answer: ${JSON.stringify(r.json.failures)}`);
  assert.ok(cav(r, /marked severity unknown/), JSON.stringify(r.json.caveats));
});

test('"severity unknown" is a limit even though it is not a real ranking', () => {
  // Pin the distinction: the check asks "have you ranked this at all?", and the caveat carries the
  // consequence of answering "not yet" — so a map full of unknowns cannot quietly read as ranked.
  const r = check(HONEST_HYPOTHESIS);
  assert.ok(cav(r, /has not decided what matters most/), JSON.stringify(r.json.caveats));
});

// --- contract -------------------------------------------------------------------------------------

test('caveats are JSON-only: stdout must stay parseable in --json mode', () => {
  // An earlier version printed caveats to stderr unconditionally. Harmless to a human at a terminal,
  // corrupting to anything parsing stdout — and the caveats were already in the JSON payload, so it
  // duplicated them into the wrong channel instead of surfacing anything new.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'empathy-json-'));
  const f = path.join(dir, 'empathy-map.md');
  fs.writeFileSync(f, GOOD.replace('interviewed 6', 'interviewed 2'));
  const r = spawnSync('node', [GATE, 'check', '--kind', 'empathy-map', '--file', f, '--json'],
    { encoding: 'utf8' });
  assert.doesNotThrow(() => JSON.parse(r.stdout),
    `stdout must be pure JSON in --json mode, got: ${r.stdout.slice(0, 200)}`);
  assert.strictEqual(JSON.parse(r.stdout).caveats.length, 1, 'the caveat belongs in the payload');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a bare TBD severity still fails — this gate does not contradict its own placeholder detector', () => {
  // `TBD` is an honest thing to write and also this file's placeholder marker. Accepting it as a
  // severity would mean one rule passes the document while another rejects it, with no input that
  // satisfies both. TBD is therefore not an accepted severity; `unknown` and `not yet ranked` are.
  const r = check(GOOD.replace(/ — (?:high|medium|low)[^\n]*/g, ' — TBD'));
  assert.ok(has(r, /unfilled template placeholder/),
    'TBD must be caught by the placeholder rule rather than accepted as a severity');
});

test('the shipped template, written verbatim, fails', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/empathy-map/SKILL.md'), 'utf8');
  const m = src.match(/```markdown\n([\s\S]*?)```/);
  assert.ok(m, 'SKILL.md has no markdown template');
  const r = check(m[1]);
  assert.strictEqual(r.code, 1, 'the shipped template must never satisfy its own gate');
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

test('the skill documents the four new minimums and the fabrication limit', () => {
  const src = fs.readFileSync(path.join(REPO, '.agents/skills/empathy-map/SKILL.md'), 'utf8');
  assert.ok(/Inferred quadrants/.test(src), 'the template must carry the inference field');
  assert.ok(/severity/i.test(src), 'the template must show pains carrying a severity');
  assert.ok(/Four defects the first version of this gate missed/.test(src),
    'a gate whose reasoning is undocumented gets re-broken by the next person to widen it');
  assert.ok(/judge whether an inference is \*correct\*/i.test(src),
    'the gate must still say what it cannot do');
});

test('the other three canvas kinds are unaffected by the empathy-map work', () => {
  // The shared helper refactor touched all four kinds. A kind check may now return a bare array or a
  // richer { failures, caveats } — anything else silently loses its failures.
  for (const kind of ['root-cause', 'journey-map', 'jtbd']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-kind-'));
    const f = path.join(dir, 'canvas.md');
    fs.writeFileSync(f, '# Scratch\n**Date:** 2026-10-09\n');
    const r = spawnSync('node', [GATE, 'check', '--kind', kind, '--file', f, '--json'],
      { encoding: 'utf8' });
    const j = JSON.parse(r.stdout);
    assert.ok(Array.isArray(j.failures) && j.failures.length,
      `${kind} must still report its failures — the normaliser dropped them`);
    assert.deepStrictEqual(j.caveats, [], `${kind} declares no caveats yet`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('list_items is a single shared helper, not a per-script copy', () => {
  // Two slightly different extractors drift, and a gate's verdict then depends on which copy it
  // called. This existed before: discovery_canvas_check.js reached for an `items` that did not exist
  // and died with a ReferenceError at runtime rather than at parse time.
  for (const s of ['discovery_canvas_check.js', 'research_plan_check.js']) {
    const src = fs.readFileSync(path.join(REPO, '.agents/scripts', s), 'utf8');
    assert.ok(src.includes("require('./lib/list_items')"), `${s} must use the shared helper`);
    assert.ok(!/^\s*function items\s*\(/m.test(src), `${s} must not carry a private copy`);
  }
  assert.ok(fs.existsSync(path.join(REPO, '.agents/scripts/lib/list_items.js')),
    'the shared helper must exist');
});