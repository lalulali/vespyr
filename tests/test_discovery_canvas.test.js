/**
 * tests/test_discovery_canvas.test.js — the four discovery canvases finally have a gate.
 *
 * `/root-cause`, `/empathy-map`, `/journey-map` and `/jtbd` each ship a SKILL.md and nothing else:
 * no step files, no gate, no tests. Each defines its output as an inline markdown template of
 * `{placeholder}` fields, and nothing stopped that template being written to disk verbatim.
 *
 * That is the `/design` defect — a template satisfying a blocking gate — except there is no gate at
 * all, so it is strictly worse. `empathy-map.md` could ship as `{direct quotes}` and `{pain point}`
 * and no reader could tell.
 *
 * The second defect is the one that matters more. These artifacts assert what people SAY, THINK,
 * FEEL and want. None required a pointer to a single real source, so a document of entirely invented
 * but plausible content satisfied every structural rule in its own template. Hence `Evidence basis:`.
 *
 * Each test pins one kind. Every kind gets a conformant fixture, because a gate that rejects
 * everything is not a gate.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const CHECK = path.join(REPO, '.agents/scripts/discovery_canvas_check.js');

function check(kind, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-'));
  const file = path.join(dir, 'canvas.md');
  fs.writeFileSync(file, body);
  const r = spawnSync('node', [CHECK, 'check', '--kind', kind, '--file', file, '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(r.stdout); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j, out: `${r.stdout || ''}${r.stderr || ''}` };
}

const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

// --- /root-cause -------------------------------------------------------------------------------

const GOOD_ROOT_CAUSE = `# Root Cause Analysis — checkout abandonment
**Date:** 2026-10-09
**Evidence basis:** analytics (412 sessions, 7 days)

## Problem Statement
Users abandon checkout after entering shipping details.

## 5 Whys Chain
1. **Why?** Users abandon after shipping details.
   → The address form rejects rural postcodes silently.
2. **Why?** The form rejects rural postcodes silently.
   → Validation runs against a UK-only postcode table.
3. **Why?** Validation runs against a UK-only postcode table.
   → The table shipped in 2024 and was never extended past the UK market.
4. **Why?** It was never extended.
   → No test covers a non-UK postcode, so no failure surfaced.

## Root Cause
Address validation is bound to a single-market postcode table, caused by having no market-agnostic
validation test, so every new market inherits the same silent rejection.

## Validation
Ship a non-UK postcode fixture through the form. If it is accepted and the abandonment rate for
non-UK sessions drops, this is the cause. If not, the next candidate is the payment step.
`;

test('root-cause: a complete analysis passes', () => {
  const r = check('root-cause', GOOD_ROOT_CAUSE);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  assert.strictEqual(r.json.ok, true);
});

test('root-cause: a chain that stops short of 3 levels fails', () => {
  const weak = GOOD_ROOT_CAUSE.replace(/2\. \*\*Why\?\*\*/s, 'X. **Why?**')
    .replace(/3\. \*\*Why\?\*\*/s, 'Y. **Why?**')
    .replace(/4\. \*\*Why\?\*\*/s, 'Z. **Why?**');
  const r = check('root-cause', weak);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /has 2 level\(s\)|has 1 level\(s\)/), JSON.stringify(r.json.failures));
});

test('root-cause: a root cause that states no cause fails (the "someone was careless" ending)', () => {
  const r = check('root-cause', GOOD_ROOT_CAUSE.replace(
    /Address validation is bound[^]*?inherits the same silent rejection\./,
    'The team was not careful enough about international markets.'
  ));
  assert.ok(has(r, /never states a cause/), JSON.stringify(r.json.failures));
});

test('root-cause: no validation section fails — an uncheckable cause is a belief', () => {
  const r = check('root-cause', GOOD_ROOT_CAUSE.replace(/## Validation[\s\S]*$/, ''));
  assert.ok(has(r, /No validation section/), JSON.stringify(r.json.failures));
});

// --- /empathy-map ------------------------------------------------------------------------------

const GOOD_EMPATHY = `# Empathy Map — first-time trial admin in the weekly reporting workflow
**Date:** 2026-10-09
**Evidence basis:** interviewed (6 admins, 45 min each)
**Inferred quadrants:** Thinks, Feels

## User & Scenario
- **Segment:** Operations admin, 5–50 person team, no analyst
- **Scenario:** Monday morning, building the weekly report their team reads

## Empathy Canvas
| Says | Thinks |
|------|--------|
| "I stopped trusting the number after week three." | Inference: if it is wrong in the first report, nobody will check the rest. |

| Does | Feels |
|------|-------|
| Screenshots the report into the team channel before sharing | Inference: anxious about being the source of a wrong number |

## Pains
1. Has no way to tell whether a number is right before it leaves their hands — high, hit by 6 of 6

## Gains
1. A visible check step would let them share without hedging in the message.
`;

test('empathy-map: a complete map with quoted material passes', () => {
  const r = check('empathy-map', GOOD_EMPATHY);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
});

test('empathy-map: a Says quadrant with no quote and no link fails', () => {
  const r = check('empathy-map', GOOD_EMPATHY.replace(
    '| "I stopped trusting the number after week three." |',
    '| Users say the numbers are hard to trust. |'
  ));
  assert.ok(has(r, /no quoted material/), JSON.stringify(r.json.failures));
});

test('empathy-map: a missing Thinks quadrant fails — it is the one that gets skipped', () => {
  const r = check('empathy-map', GOOD_EMPATHY.replace('| Says | Thinks |', '| Says | |'));
  assert.ok(has(r, /no Thinks quadrant/), JSON.stringify(r.json.failures));
});

test('empathy-map: empty Pains fails', () => {
  const r = check('empathy-map', GOOD_EMPATHY.replace(/## Pains[\s\S]*$/, '## Pains\n1. \n'));
  assert.ok(has(r, /`## Pains` section is empty/), JSON.stringify(r.json.failures));
});

// --- /journey-map ------------------------------------------------------------------------------

const GOOD_JOURNEY = `# Journey Map — trial signup to first shared report
**Date:** 2026-10-09
**Evidence basis:** interviewed (6 admins) + observed (3 sessions)

**User segment:** Operations admin, no analyst
**Scope:** signup → first report shared with the team

## Journey Stages
| Stage | Touchpoint | Action | Emotion | Friction | Opportunity |
|-------|-----------|--------|---------|----------|-------------|
| 1. Awareness | Search + peer referral | Looks for a reporting tool | 😐 Uncertain where to start | No clear entry point for non-analysts | Template gallery by role |
| 2. Decision | Pricing page | Compares three vendors | 😟 Overwhelmed by tiers | Seat pricing forces a headcount guess | Per-seat preview calculator |
| 3. Onboarding | App, first login | Connects a data source | 😟 Fails on first try | Connection error does not say why | Name the failing credential |
| 4. Ongoing use | App, Monday | Builds the weekly report | 😐 Confident until export | Export silently drops filtered rows | Warn before a filtered export |

## Emotional Arc
| Stage | Emotion | Intensity (1-5) | Driver |
|-------|---------|------------------|--------|
| Awareness | 😐 | 2 | Uncertainty about fit |
| Decision | 😟 | 4 | Tier complexity |
| Onboarding | 😟 | 4 | Opaque connection failure |
| Ongoing use | 😐 | 2 | Silent export truncation |

**Arc summary:** Intensity peaks at decision and onboarding, both driven by opacity rather than by the
product being hard, and fixing the onboarding error message alone flattens the whole middle.

## Key Friction Points
1. **Onboarding:** connection error gives no reason — Impact: High

## Priority Opportunities
1. **Onboarding:** name the failing credential — Effort: Low, Impact: High
`;

test('journey-map: a complete map passes', () => {
  const r = check('journey-map', GOOD_JOURNEY);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
});

test('journey-map: a stage row with an empty column fails — padding reads as coverage', () => {
  const r = check('journey-map', GOOD_JOURNEY.replace(
    '| 4. Ongoing use | App, Monday | Builds the weekly report | 😐 Confident until export | Export silently drops filtered rows | Warn before a filtered export |',
    '| 4. Ongoing use | App, Monday | Builds the weekly report | 😐 | Export silently drops filtered rows | Warn before a filtered export |'
  ));
  assert.ok(has(r, /empty column\(s\)/), JSON.stringify(r.json.failures));
});

test('journey-map: fewer than 3 stages fails — it hides the middle where friction lives', () => {
  const twoStage = GOOD_JOURNEY
    .split('\n')
    .filter((l) => !/^\| [34]\./.test(l))
    .join('\n');
  const r = check('journey-map', twoStage);
  assert.ok(has(r, /has 2 stage\(s\)/), JSON.stringify(r.json.failures));
});

test('journey-map: a missing arc summary fails', () => {
  const r = check('journey-map', GOOD_JOURNEY.replace(/\*\*Arc summary:\*\*.*/, ''));
  assert.ok(has(r, /no summary sentence/), JSON.stringify(r.json.failures));
});

// --- /jtbd -------------------------------------------------------------------------------------

const GOOD_JTBD = `# Jobs-to-be-Done + HMW Canvas — weekly reporting for operations admins
**Date:** 2026-10-09
**Evidence basis:** interviewed (6 admins)

## Job Stories
| # | When | I want to | So I can | Type |
|---|---------------|---------------------------|-------------------|------|
| 1 | Monday morning before the team standup | build the weekly report without asking an analyst | send a number I am confident in | Functional |
| 2 | A stakeholder questions a figure in the channel | trace where that number came from | correct it before it spreads | Emotional |
| 3 | New hire joins and asks how reports are made | give them the same view of the data | stop answering the same question | Social |

## How Might We Opportunities
| JTBD # | HMW Question | Opportunity Size |
|--------|-------------|-----------------|
| 1 | How might we make a report trustworthy without leaving the tool? | Large |
| 2 | How might we make every figure traceable back to its source? | Med |
| 3 | How might we hand over a report definition without a meeting? | Small |

## Priority Matrix
| | High Impact | Low Impact |
|---|---|---|
| **Low Effort** | source links on every figure | export presets |
| **High Effort** | self-serve report builder | scheduled digests |
`;

test('jtbd: a complete canvas passes', () => {
  const r = check('jtbd', GOOD_JTBD);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
});

test('jtbd: a job with a trivial clause fails — it fits the template and says nothing', () => {
  const r = check('jtbd', GOOD_JTBD.replace(
    '| 1 | Monday morning before the team standup | build the weekly report without asking an analyst | send a number I am confident in | Functional |',
    '| 1 | whenever | to work | to be happy | Functional |'
  ));
  assert.ok(has(r, /empty or trivial clause/), JSON.stringify(r.json.failures));
});

test('jtbd: untyped job statements fail — without Type the canvas becomes a feature list', () => {
  const r = check('jtbd', GOOD_JTBD.replace(/\| Functional \|| \| Emotional \|| \| Social \|/g, '| |'));
  assert.ok(has(r, /carry no Type/), JSON.stringify(r.json.failures));
});

test('jtbd: jobs with no HMW rows fail', () => {
  const r = check('jtbd', GOOD_JTBD.replace(/## How Might We Opportunities[\s\S]*$/, '## How Might We Opportunities\n| JTBD # | HMW Question | Opportunity Size |\n|--------|-------------|-----------------|\n'));
  assert.ok(has(r, /No `## How Might We Opportunities` rows/), JSON.stringify(r.json.failures));
});

// --- shared rules -----------------------------------------------------------------------------

/** The decisive one: the template, shipped verbatim, must never pass. */
test('SHARED: a canvas that is still the template fails every kind', () => {
  const templates = {
    'empathy-map': path.join(REPO, '.agents/skills/empathy-map/SKILL.md'),
    'journey-map': path.join(REPO, '.agents/skills/journey-map/SKILL.md'),
    'root-cause': path.join(REPO, '.agents/skills/root-cause/SKILL.md'),
    'jtbd': path.join(REPO, '.agents/skills/jtbd/SKILL.md'),
  };
  for (const [kind, skillPath] of Object.entries(templates)) {
    const src = fs.readFileSync(skillPath, 'utf8');
    const m = src.match(/```markdown\n([\s\S]*?)```/);
    assert.ok(m, `${kind}/SKILL.md has no markdown template to extract`);
    const r = check(kind, m[1]);
    assert.strictEqual(r.code, 1, `${kind}: the shipped template passed the gate`);
    assert.ok(
      r.json.failures.some((f) => /unfilled template placeholder/.test(f)),
      `${kind}: expected a placeholder failure, got ${JSON.stringify(r.json.failures)}`
    );
  }
});

test('SHARED: a canvas with no Evidence basis fails — a finding must be distinguishable from a guess', () => {
  const r = check('empathy-map', GOOD_EMPATHY.replace(/^\*\*Evidence basis:\*\*.*$/m, ''));
  assert.ok(has(r, /No `\*\*Evidence basis:\*\*` declaration/), JSON.stringify(r.json.failures));
});

test('SHARED: an unrecognised Evidence basis is rejected, not guessed at', () => {
  const r = check('empathy-map', GOOD_EMPATHY.replace(/^\*\*Evidence basis:\*\*.*$/m, '**Evidence basis:** vibes'));
  assert.ok(has(r, /is not one of/), JSON.stringify(r.json.failures));
});

test('SHARED: a hypothesis basis must be labelled in the body, not only in the header', () => {
  const hypo = GOOD_EMPATHY.replace(/^\*\*Evidence basis:\*\*.*$/m, '**Evidence basis:** hypothesis')
    .replace(/## Pains[\s\S]*$/, '## Pains\n1. Probably cannot tell whether a number is right in advance.\n');
  const unlabelled = check('empathy-map', hypo);
  assert.ok(has(unlabelled, /nothing in the body says so/), JSON.stringify(unlabelled.json.failures));
});

test('SHARED: a hypothesis basis IS accepted when the body labels it', () => {
  const hypo = GOOD_EMPATHY.replace(/^\*\*Evidence basis:\*\*.*$/m, '**Evidence basis:** hypothesis — no interviews conducted yet, to validate')
    .replace(/\| "I stopped trusting the number after week three\." \|/, '| Hypothesised: "I stopped trusting the number." |')
    .replace(/^\*\*Date:\*\* 2026-10-09$/m, '**Date:** 2026-10-09');
  const r = check('empathy-map', hypo);
  assert.strictEqual(r.code, 0, `an honestly labelled hypothesis must pass: ${JSON.stringify(r.json.failures, null, 2)}`);
});

test('SHARED: a missing file and an empty file both fail — never a silent pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-missing-'));
  const missing = spawnSync('node', [CHECK, 'check', '--kind', 'jtbd', '--file', path.join(dir, 'nope.md'), '--json'], { encoding: 'utf8' });
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stdout, /cannot read/);

  const empty = path.join(dir, 'empty.md');
  fs.writeFileSync(empty, '   \n');
  const r = spawnSync('node', [CHECK, 'check', '--kind', 'jtbd', '--file', empty, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  assert.match(r.stdout, /is empty/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('SHARED: an unknown --kind fails closed rather than silently passing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-kind-'));
  const file = path.join(dir, 'c.md');
  fs.writeFileSync(file, '# anything\n');
  const r = spawnSync('node', [CHECK, 'check', '--kind', 'not-a-skill', '--file', file, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2, 'an unknown kind must be a usage error, never a green');
  assert.match(r.stdout, /unknown --kind/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the gate always states that form is not truth', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-note-'));
  const file = path.join(dir, 'c.md');
  fs.writeFileSync(file, GOOD_JTBD);
  const r = spawnSync('node', [CHECK, 'check', '--kind', 'jtbd', '--file', file, '--json'], { encoding: 'utf8' });
  assert.match(r.stdout, /not a research finding/, 'a green gate must not read as a research result');
  fs.rmSync(dir, { recursive: true, force: true });
});
