'use strict';
/**
 * test_design_run1_contract.test.js — defects found by the first real blind run of `/design`.
 *
 * WHY THIS FILE EXISTS
 * `/design` had been repaired once from a single blind run and then carried 25 tests against
 * `/motion`'s 123, which is why "all panels satisfied" was never a defensible claim for it. A
 * blind run on a clinical-trial brief (create mode) then found a gate that passes an empty
 * document, a documented prerequisite the skill's own primary trigger cannot satisfy, two
 * template rules that contradict each other and the a11y step, a WCAG conformance level stated
 * wrong in a file the run is told to load, accessibility carried by a single line of prose in
 * the mode where screens are specified, and a command presented as an inspection that writes
 * four files.
 *
 * Every test below names the finding it locks down. Reverting the fix must fail it.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILL = path.join(ROOT, '.agents/skills/design/SKILL.md');
const GATE = path.join(ROOT, '.agents/scripts/template_conformance.js');
const raw = fs.readFileSync(SKILL, 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const skill = flat(raw);

function runGate(stories, { prd = '# PRD\n\n## 1. Executive Summary\nx\n' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'designgate-'));
  const out = path.join(dir, 'artifacts', 'output', '03-strategy');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'requirements.md'), prd, 'utf8');
  if (stories !== null) fs.writeFileSync(path.join(out, 'user-stories.md'), stories, 'utf8');
  let code = 0;
  let stdout = '';
  try {
    stdout = execFileSync('node', [GATE, 'check', '--mode', 'create', '--root', dir, '--json'], { encoding: 'utf8' });
  } catch (e) { code = e.status; stdout = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  let json = {};
  try { json = JSON.parse(stdout); } catch { /* non-JSON */ }
  return { code, json, userStoriesFailures: (json.userStories && json.userStories.failures) || [] };
}

// --- the gate that passed an empty document ------------------------------------------------

test('an unpopulated copy of the story template does NOT satisfy the create-mode gate', () => {
  // Step 03a instructs "scaffold first, then populate". After `cp user-story-template.md
  // user-stories.md`, the blocking gate reported ok:true with zero failures. Verified side by
  // side: a real 21-story document and the untouched template BOTH gave failures: []. The
  // template's skeleton — "## Feature: [Feature Title]", "### User Story: As a [type of
  // user]...", "**Story ID:** US-XXX" — is shaped exactly like a finished story.
  const tpl = fs.readFileSync(path.join(ROOT, '.agents/templates/product/user-story-template.md'), 'utf8');
  const r = runGate(tpl);
  assert.strictEqual(r.code, 1, `an empty template must not pass: ${JSON.stringify(r.userStoriesFailures)}`);
  assert(
    r.userStoriesFailures.some((f) => /placeholder ID|US-XXX/.test(f)),
    `expected the placeholder-ID rejection: ${JSON.stringify(r.userStoriesFailures)}`
  );
});

test('a user-stories document with no story at all is rejected', () => {
  const r = runGate('# User stories\n\nNothing written yet.\n');
  assert.strictEqual(r.code, 1);
  assert(
    r.userStoriesFailures.some((f) => /no user story is defined/i.test(f)),
    JSON.stringify(r.userStoriesFailures)
  );
});

test('a story that defines no acceptance criterion is rejected', () => {
  const r = runGate(
    '# User stories\n\n## Feature: Billing\n\n### User Story: As an admin, I want to see invoices\n\n' +
    '- **Story ID:** US-001\n- **Traces to PRD:** Section 7.3: FR-001\n- **Traces to Product Spec:** Screen 3\n'
  );
  assert(
    r.userStoriesFailures.some((f) => /defines no acceptance criterion/i.test(f)),
    `a story with no AC is a placeholder: ${JSON.stringify(r.userStoriesFailures)}`
  );
});

test('a real story with a real criterion does not trip the new rules', () => {
  const r = runGate(
    '# User stories\n\n## Feature: Billing\n\n### User Story: As an admin, I want to see invoices\n\n' +
    '- **Story ID:** US-001\n- **Traces to PRD:** Section 7.3: FR-001\n- **Traces to Product Spec:** Screen 3\n\n' +
    '#### Acceptance Criteria\n- **AC-B1:** Given an open invoice, when the admin opens the list, then it appears newest-first.\n'
  );
  assert.ok(
    !r.userStoriesFailures.some((f) => /defines no acceptance criterion|placeholder ID/.test(f)),
    `false positive on a legitimate story: ${JSON.stringify(r.userStoriesFailures)}`
  );
});

// --- the prerequisite the primary trigger cannot satisfy --------------------------------------

test('a user prompt is a valid brief for create mode', () => {
  // The trigger is "the user says design this" — a prompt. Prerequisites demanded a discovery
  // artifact that only /explore-idea produces, and step-01a said "load explore-idea first".
  // So the primary trigger could not reach the primary mode. A blind run fabricated an
  // idea-brief.md and recorded a deviation.
  assert.match(skill, /A user prompt is itself a valid brief/i);
  assert.match(skill, /Normalise, do not fabricate/i);
  assert.match(skill, /DERIVED FROM THE USER PROMPT/i);
  const step01a = flat(fs.readFileSync(path.join(ROOT, '.agents/skills/design/steps/step-01a-load-prd-brief.md'), 'utf8'));
  assert.ok(
    !/If any are missing, load `explore-idea` first\./.test(step01a),
    'the unconditional instruction is still there'
  );
  assert.match(step01a, /Do not fabricate an upstream artifact/i);
});

// --- accessibility is not carried by create mode ---------------------------------------------

test('every screen state table carries four accessibility states', () => {
  const s4 = flat(fs.readFileSync(path.join(ROOT, '.agents/skills/design/steps/step-04a-screen-states.md'), 'utf8'));
  for (const axis of ['Keyboard state', 'Screen-reader state', 'Zoom / reflow state', 'Motion state']) {
    assert.ok(s4.includes(axis), `step-04a is missing the "${axis}" axis`);
  }
  assert.ok(
    !/^- Cover accessibility requirements$/m.test(fs.readFileSync(path.join(ROOT, '.agents/skills/design/steps/step-04a-screen-states.md'), 'utf8')),
    'the single line that was the whole of create-mode accessibility is still there'
  );
  assert.match(skill, /accessibility state/i,
    'create mode Done-when must name the deliverable, not "coverage"');
});

test('a brief naming an affected user group produces a persona, not a paragraph', () => {
  const s2 = flat(fs.readFileSync(path.join(ROOT, '.agents/skills/design/steps/step-02a-define-personas.md'), 'utf8'));
  assert.match(s2, /gets a persona/i);
  assert.match(s2, /screen-reader user/i);
  assert.match(s2, /not a paragraph in the PRD/i);
});

// --- the two template contradictions -----------------------------------------------------------

test('research sign-off has a terminal state reachable from create mode', () => {
  const tpl = flat(fs.readFileSync(path.join(ROOT, '.agents/templates/product/prd-template.md'), 'utf8'));
  assert.ok(
    !/all rows above must be \[ \] Reviewed/.test(tpl),
    'this box contradicted the no-fabrication rule 20 lines above and the row template that ' +
      'already offered [ABSENT] — three rules that cannot all hold'
  );
  assert.match(tpl, /ABSENT — no upstream research/);
  assert.match(tpl, /a blank checkbox is not one/i);
});

test('sprint labels are relative but target dates are not invented', () => {
  const tpl = flat(fs.readFileSync(path.join(ROOT, '.agents/templates/product/prd-template.md'), 'utf8'));
  assert.match(tpl, /date unknown/i);
  assert.match(tpl, /A wrong date in a PRD is worse than a missing one/i);
});

test('touch targets state the AA floor and do not mandate the AAA threshold', () => {
  const d = flat(fs.readFileSync(path.join(ROOT, '.agents/templates/product/design.md'), 'utf8'));
  assert.ok(
    !/Touch targets ≥ 44px/.test(d),
    '44x44 is SC 2.5.5 Target Size (Enhanced) — AAA — and step-03c correctly says an AA ' +
      'validation step must not hold designs to it. The template mandated it as a flat rule.'
  );
  assert.match(d, /24×24 CSS px is the WCAG 2\.2 AA floor/);
  assert.match(d, /44×44 is SC 2\.5\.5/);
});

test('the signature-element requirement has a trust-first exception', () => {
  const d = flat(fs.readFileSync(path.join(ROOT, '.agents/templates/product/design.md'), 'utf8'));
  assert.match(d, /Exception — trust-first and regulated surfaces/i);
  assert.match(d, /constraint made visible/i,
    'on a regulated surface the differentiator is a constraint made visible, not an effect');
});

// --- the WCAG level error ----------------------------------------------------------------------

test('WCAG 2.4.13 is stated as AAA, verified against the W3C Recommendation', () => {
  const g = flat(fs.readFileSync(path.join(ROOT, '.agents/references/designer-guidelines.md'), 'utf8'));
  assert.ok(
    !/2\.4\.13 \(Focus Appearance - AA\)/.test(g) && !/2\.4\.13 \(Focus Appearance - AA\)/.test(g.replace(/—/g, '-')),
    'a blind run followed this line and produced an AA conformance claim against an AAA criterion'
  );
  assert.match(g, /2\.4\.13 Focus Appearance \(AAA\)/);
  assert.match(g, /w3\.org\/TR\/WCAG22/);
});

// --- a command presented as an inspection that writes ------------------------------------------

test('`next` is documented as a writer, not an inspection step', () => {
  // Wording superseded this round: both `status` and `next` write, so the sentence is now
  // "Neither ... is read-only". The substance — the files it creates are named — is unchanged.
  assert.match(skill, /Neither `status` nor `next` is read-only/i);
  assert.match(skill, /pipeline-state\.json/);
  assert.match(skill, /sprint-status\.yaml/);
});

// --- The reverse-mode re-run: it got past step 1e, and found the router was wrong -----------
// The collaboration-gate fix worked — the run reached the Evidence Ledger and wrote a
// requirements.md passing template_conformance with zero failures. Then it found the router
// cannot detect the arrival it is documented to detect.

test('the router detects prototype-first arrival, not just a reverse-mode artifact', () => {
  const { execFileSync } = require('child_process');
  const fs2 = require('fs');
  const os2 = require('os');
  const base = (setup) => {
    const dir = fs2.mkdtempSync(path.join(os2.tmpdir(), 'route-'));
    fs2.mkdirSync(path.join(dir, 'artifacts/input/prototype'), { recursive: true });
    fs2.mkdirSync(path.join(dir, 'artifacts/output/03-strategy'), { recursive: true });
    setup(dir);
    let out = '';
    try {
      out = execFileSync('node', [path.join(ROOT, '.agents/scripts/step_tracker.js'), 'route',
        '--skill', 'design', '--root', dir, '--json'], { encoding: 'utf8' });
    } catch (e) { out = `${e.stdout || ''}${e.stderr || ''}`; }
    fs2.rmSync(dir, { recursive: true, force: true });
    return JSON.parse(out);
  };

  // A bootstrap paradox: the only reverse signal was prototype-inventory.md, and that file is
  // what reverse mode PRODUCES. A tree that had not already been routed to reverse could never
  // be detected as reverse. Measured: prototype present, no requirements.md → `create`.
  assert.strictEqual(
    base((d) => fs2.writeFileSync(path.join(d, 'artifacts/input/prototype/p.html'), '<html></html>')).route,
    'reverse',
    'a prototype in artifacts/input/prototype/ with no SPEC.md is prototype-first arrival'
  );
  // An empty directory is not a prototype — do not claim reverse for it.
  assert.strictEqual(base(() => {}).route, 'create', 'an empty prototype directory is not evidence');
  // No prototype at all is unchanged.
  assert.strictEqual(
    base((d) => fs2.rmSync(path.join(d, 'artifacts/input/prototype'), { recursive: true, force: true })).route,
    'create'
  );
});

test('the router stays correct across the whole reverse-mode sequence', () => {
  const { execFileSync } = require('child_process');
  const fs2 = require('fs');
  const os2 = require('os');
  const dir = fs2.mkdtempSync(path.join(os2.tmpdir(), 'seq-'));
  const proto = path.join(dir, 'artifacts/input/prototype');
  const strat = path.join(dir, 'artifacts/output/03-strategy');
  fs2.mkdirSync(proto, { recursive: true });
  fs2.mkdirSync(strat, { recursive: true });
  fs2.writeFileSync(path.join(proto, 'p.html'), '<html></html>');

  const route = () => {
    let out = '';
    try {
      out = execFileSync('node', [path.join(ROOT, '.agents/scripts/step_tracker.js'), 'route',
        '--skill', 'design', '--root', dir, '--json'], { encoding: 'utf8' });
    } catch (e) { out = `${e.stdout || ''}${e.stderr || ''}`; }
    return JSON.parse(out).route;
  };
  const seen = [route()];
  fs2.writeFileSync(path.join(strat, 'prototype-inventory.md'), '# inv'); seen.push(route());
  fs2.writeFileSync(path.join(strat, 'SPEC.md'), '# spec'); seen.push(route());
  fs2.writeFileSync(path.join(strat, 'requirements.md'), '# reqs'); seen.push(route());
  fs2.writeFileSync(path.join(strat, 'product-spec.md'), '# pspec'); seen.push(route());
  fs2.rmSync(dir, { recursive: true, force: true });
  assert.deepStrictEqual(seen, ['reverse', 'reverse', 'reverse', 'edit', 'edit'],
    `the sequence mis-routes: ${seen.join(' -> ')}`);
});

test('Track classification and Track gate result answer different questions', () => {
  // A blind run redefined "classification" mid-run until SATISFIED was true — choosing its
  // reading AFTER learning what the gate wanted. Redefining a gate input to make a gate pass is
  // the exact failure this engine exists to catch, and the template's silence invited it.
  const tpl = flat(fs.readFileSync(path.join(ROOT, '.agents/templates/product/prototype-collaboration-template.md'), 'utf8'));
  assert.match(tpl, /Which question does this answer/i);
  assert.match(tpl, /Is this the right track for this artifact/i);
  assert.match(tpl, /Does it meet the construction bar/i);
  assert.match(tpl, /still fail the bar/i);
});

test('an acceptance criterion witnessed by several ledger rows has a sanctioned tag', () => {
  // The grammar was strictly singular, so `[prototype L-06, L-07, L-08]` and
  // `[prototype L-30 — deferred]` were unrepresentable — the only options were dropping rows
  // into prose or failing the gate. A blind run hit this and lost machine-readability of two
  // witnesses to satisfy a format.
  //
  // Tested as a GRAMMAR, not through the gate: a minimal document bails on the missing §14
  // Evidence Ledger before the per-criterion tag check runs, so a gate-level fixture here would
  // assert nothing. Extracting the real pattern keeps this honest about what it verifies.
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/template_conformance.js'), 'utf8');
  const literal = (src.match(/^const AC_TAG_RE = (\/.*\/[a-z]*);$/m) || [])[1];
  assert.ok(literal, 'AC_TAG_RE must be a readable literal so the grammar can be tested');
  const re = eval(literal);
  for (const tag of ['[prototype L-06]', '[prototype L-06, L-07, L-08]', '[prototype L-30 — deferred]',
    '[prototype L-01, L-02 — deferred]', '[derived]']) {
    assert.ok(re.test(tag), `${tag} must be an accepted source tag`);
  }
  assert.ok(!re.test('[PENDING]'), 'a status marker is not a source tag');
});

test('the parity gate names its script AT THE POINT OF USE, not only later in the step', () => {
  // Correcting my own finding: the invocation was NOT absent. `spec_parity.js check` already
  // appeared at line 51, inside step 6 of this same file. What was wrong is placement — a reader
  // meets the gate at the Goal line and the invocation 38 lines later, while SKILL.md and
  // step-00 name "Parity Gate" with no script at all. A blind run scanning those two files
  // guessed `parity_gate.js` and got MODULE_NOT_FOUND.
  const raw4d = fs.readFileSync(path.join(ROOT, '.agents/skills/design/steps/step-04d-parity-gate.md'), 'utf8');
  const goalLine = raw4d.indexOf('Count the parity');
  const invocation = raw4d.indexOf('node .agents/scripts/spec_parity.js check');
  assert.ok(goalLine !== -1, 'the Goal line must exist');
  assert.ok(invocation !== -1, 'the invocation must exist somewhere in the step');
  assert.ok(invocation - goalLine < 1200,
    `the invocation is ${invocation - goalLine} chars past the Goal — a reader who stops at the instruction has nothing to copy`);
  assert.match(flat(raw4d), /The script is `spec_parity\.js`/);
});

test('step labels match their frontmatter', () => {
  for (const [file, label] of [['step-02d-evidence-ledger.md', '2d'], ['step-04d-parity-gate.md', '4d']]) {
    const s = fs.readFileSync(path.join(ROOT, '.agents/skills/design/steps', file), 'utf8');
    const fm = s.match(/^step:\s*(\S+)/m);
    assert(fm && fm[1] === label, `${file} frontmatter is ${fm && fm[1]}, expected ${label}`);
    assert.match(s, new RegExp(`begin --skill design-reverse --step ${label}\\b`),
      `${file} tracker line disagrees with its frontmatter`);
  }
});

test('status is documented as a writer — my own error', () => {
  const s = flat(fs.readFileSync(path.join(ROOT, '.agents/skills/design/SKILL.md'), 'utf8'));
  assert.match(s, /Neither `status` nor `next` is read-only/i,
    'I documented only `next` last round and left `status` implied safe; measured, both write');
  assert.ok(!/Use `status` alone if you want to look without changing anything/.test(s),
    'that sentence is false and was written by me');
});

test('step 1d points at the step 1e escape hatch instead of dead-ending', () => {
  const s = flat(fs.readFileSync(path.join(ROOT, '.agents/skills/design/steps/step-01d-ingest-prototype.md'), 'utf8'));
  assert.match(s, /There is one sanctioned exception/i);
  assert.match(s, /step-01e/);
  assert.match(s, /imported from outside/i);
});

test('step0_staleness --help prints usage instead of running the check', () => {
  const { execFileSync } = require('child_process');
  let out = '';
  let code = 0;
  try {
    out = execFileSync('node', [path.join(ROOT, '.agents/scripts/step0_staleness.js'), '--help'], { encoding: 'utf8' });
  } catch (e) { code = e.status; }
  assert.strictEqual(code, 0);
  assert.match(out, /Usage: node step0_staleness\.js/);
  assert.ok(!/\[OK\]|\[FAIL\]|baseline hash:/.test(out),
    '--help must return usage, not a verdict — it was printing `[OK] Step-0 staleness baseline hash: absent`');
});

// --- Reverse-mode synthesis: the three rules that unblocked it --------------------------------
// The re-run stopped at `template_conformance --mode reverse` with 7 failures. Measuring them
// against the repaired gate showed the tag grammar was the cause of five, and that fixing it
// once was not enough — the agent's natural form is `[prototype L-11, prototype L-33]`, not the
// abbreviated `[prototype L-06, L-07]` I had added. Two structural gaps also surfaced: duplicate
// AC ids (which the gate could not see at all) and a mixed witnessed/reasoned tag.

test('the source-tag grammar accepts every form a human actually writes', () => {
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/template_conformance.js'), 'utf8');
  const literal = (src.match(/^const AC_TAG_RE = (\/.*\/[a-z]*);$/m) || [])[1];
  assert.ok(literal, 'AC_TAG_RE must stay a readable literal');
  const re = eval(literal);
  for (const tag of [
    '[prototype L-06]',
    '[prototype L-06, L-07]',            // abbreviated list
    '[prototype L-11, prototype L-33]',  // repeated prefix — the form that actually occurred
    '[prototype L-30 — deferred]',       // annotated
    '[prototype L-01, prototype L-02 — deferred]',
    '[derived]',
  ]) {
    assert.ok(re.test(tag), `${tag} must be accepted`);
  }
  assert.ok(!re.test('[PENDING]'), 'a status marker is not a source tag');
});

test('an AC id defined more than once is rejected', () => {
  // Measured on the artifact a blind run produced: 60 definitions, 56 distinct, with AC-H3,
  // AC-H5, AC-H11 and AC-H12 each defined twice in DIFFERENT stories. A duplicated id cannot be
  // resolved to one criterion, so its coverage claim is unfalsifiable.
  const { execFileSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dupac-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output/03-strategy'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/requirements.md'),
    fs.readFileSync(path.join(ROOT, '.agents/templates/product/prd-template.md'), 'utf8'));
  const one = (n) => `### User Story: As an operator, I want thing ${n}
- **Story ID:** US-00${n}
- **Priority:** Must-have
- **Sprint:** Sprint 1
- **Traces to PRD:** Section 7.3: FR-001
- **Traces to Product Spec:** Screen 1

#### Acceptance Criteria
- **AC-H1:** Given ${n}, when it happens, then ${n}. \`[derived]\`
`;
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/user-stories.md'),
    '# User stories\n\n' + one(1) + '\n' + one(2));
  let out = '';
  try {
    out = execFileSync('node', [path.join(ROOT, '.agents/scripts/template_conformance.js'),
      'check', '--mode', 'create', '--root', dir, '--json'], { encoding: 'utf8' });
  } catch (e) { out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  const j = JSON.parse(out);
  assert(j.failures.some((f) => /defined more than once/.test(f) && /AC-H1/.test(f)),
    `a duplicated AC id must fail: ${JSON.stringify(j.failures.slice(0, 3))}`);
});

test('a mixed witnessed/reasoned tag is detected, and reported once', () => {
  // `derived` exists to complete coverage the prototype cannot show, not to blend with what it
  // does show — so `[prototype L-10, derived]` is two criteria wearing one id. It previously
  // reported as a generic "no source tag", which does not tell the author what to do, and after
  // the first repair it reported the same defect a second time in that generic form.
  //
  // Tested as the PREDICATE, not through the gate. Reaching the diagnostic through a synthetic
  // document requires satisfying the full reverse-mode preconditions (multi-line Given/When/Then
  // ACs, a self-audit, a state model, a §14 Evidence Ledger, a Deferred-Evidence block) — a thin
  // fixture bails out long before the tag check, which is exactly what I hit while writing this
  // test twice. End-to-end behaviour is verified against a real reverse-mode artifact instead.
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/template_conformance.js'), 'utf8');

  // The predicates, written here literally and asserted against the source below — so the test
  // cannot drift from the implementation without failing.
  const isMixed = (inner) =>
    /prototype\s+L-\d+/.test(inner) && /(^|[,\s])derived(\s|,|$)/.test(inner);

  for (const tag of ['prototype L-10, derived', 'derived, prototype L-10', 'prototype L-01, prototype L-02, derived']) {
    assert.ok(isMixed(tag), `"[${tag}]" is part witnessed and part reasoned — that is the mixed case`);
  }
  for (const tag of ['prototype L-10', 'derived', 'prototype L-01, prototype L-02']) {
    assert.ok(!isMixed(tag), `"[${tag}]" is a single-source tag, not mixed`);
  }

  // The implementation must still use these exact predicates.
  assert.ok(src.includes('/prototype\\s+L-\\d+/.test(inner)'), 'the witnessed-part predicate drifted');
  assert.ok(src.includes('(^|[,\\s])derived(\\s|,|$)/.test(inner)'), 'the reasoned-part predicate drifted');

  // And the reporting contract: a specific message that tells the author what to do.
  assert.match(src, /MIXED source tag/);
  assert.match(src, /Split it/);
  assert.match(src, /const residual = untagged\.filter\(\(id\) => !mixed\.has\(id\)\)/,
    'the specific message must supersede the generic one — one root cause, one complaint');
});
test('the two R5 smell fixtures now use unique AC ids per story', () => {
  // The duplicate check caught a real defect in this repo's own tests: both R5 fixtures built
  // three stories that each defined AC-H1, AC-U1 and AC-E1. Those duplicates were always there
  // and always invisible. The fixtures were wrong, not the check.
  const t = fs.readFileSync(path.join(__dirname, 'test_template_conformance.test.js'), 'utf8');
  assert.match(t, /mkStory\('US-01', 1\)/, 'stories must be numbered so their AC ids differ');
  assert.ok(!/const mkStory = \(id\) =>/.test(t),
    'a single-argument mkStory cannot produce unique AC ids across three stories');
});
