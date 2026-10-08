/**
 * /design — whole-skill contract tests, all four modes.
 *
 * WHY THIS FILE IS SHAPE-WIDE. An earlier pass repaired one step (validate mode's verdict)
 * and reported the skill as done. A full audit across all four modes then found eight more
 * defects, several of them structural rather than local:
 *
 *   1. `step-00` — the non-skippable scope gate for EVERY mode — carried no `mode:` field,
 *      and `step_tracker.js` drops mode-less steps from every track. Measured: all four
 *      mode lists began at step 1. The gate SKILL.md calls non-skippable was invisible to the
 *      tracker in all four modes while looking correct in the file.
 *   2. SKILL.md carried NO global two-surfaces section, unlike all four other audited
 *      skills. 21 of 22 steps had no plain-sentence or two-surfaces instruction.
 *   3. Edit mode emitted no verdict, so a revision pass and a no-op produced identical
 *      artifacts. SKILL.md's own `Done when` claimed a re-review verdict that no step
 *      implemented — a completion contract written from assumption.
 *   4. Edit mode's Green/Yellow/Red gap map had no named home artifact.
 *   5. Iteration limits disagreed across modes (3 in edit, 2 in validate), neither enforced.
 *   6. `step-04a` authored `product-spec.md` without citing `product-spec-template.md`,
 *      which SKILL.md mandates.
 *   7. `step-04a` produced `measurement-plan.md` without citing its template, which exists.
 *   8. Reverse mode's tracker list omits the create steps it must run.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKILL = path.join(ROOT, '.agents/skills/design');
const STEPS = path.join(SKILL, 'steps');
const read = (p) => fs.readFileSync(p, 'utf8');
const skillMd = () => read(path.join(SKILL, 'SKILL.md'));

// Mirrors step_tracker.js listSteps() mode filtering.
function stepsForMode(mode) {
  const out = [];
  for (const f of fs.readdirSync(STEPS).filter((x) => x.endsWith('.md'))) {
    const fm = read(path.join(STEPS, f)).match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!fm) continue;
    const m = fm[1].match(/^mode:\s*(\S+)/m);
    if (m && m[1] !== mode) continue;
    const s = fm[1].match(/^step:\s*(\d+[a-z]?)/m);
    if (s) out.push(s[1]);
  }
  return out;
}

const MODES = ['create', 'edit', 'validate', 'reverse'];

// --- 1. the non-skippable gate must be trackable in every mode ---

test('step-00 is visible to the tracker in all four modes', () => {
  for (const mode of MODES) {
    const steps = stepsForMode(mode);
    assert.ok(steps.includes('0'),
      `${mode} mode must include the non-skippable step-00 gate; got [${steps.join(', ')}]`);
  }
});

test('the tracker treats a mode-less step as belonging to every mode', () => {
  const src = read(path.join(ROOT, '.agents/scripts/step_tracker.js'));
  assert.ok(!/if \(!modeMatch \|\| modeMatch\[1\] !== modeFilter\) return;/.test(src),
    'step_tracker must not drop a step merely for lacking a mode field — that is what hid ' +
    'the non-skippable gate in all four modes');
});

test('step-00 declares itself non-skippable in its own text', () => {
  assert.match(read(path.join(STEPS, 'step-00-scope-and-decision-anchoring.md')),
    /Non-Skippable/i);
});

// --- 2. the two-surfaces contract applies to the whole skill ---

test('SKILL.md carries a global two-surfaces contract, not one buried in a step', () => {
  const s = skillMd();
  assert.match(s, /## Two surfaces/, 'SKILL.md must state the contract once, for all modes');
  assert.match(s, /all\*\* of them|applies to \*\*/, 'and must say it covers every mode');
});

test('every mode declares a step sequence and a completion contract', () => {
  const s = skillMd();
  for (const mode of ['Create', 'Edit', 'Validate', 'Reverse']) {
    assert.match(s, new RegExp(`## ${mode} mode step sequence`), `${mode} mode sequence must exist`);
  }
  assert.match(s, /\*\*Edit mode:\*\*/, 'Done when must cover edit mode, which emits a verdict');
  assert.match(s, /\*\*Validate mode:\*\*/, 'and validate mode');
});

// --- 3. every mode emits a gate, and it is a Review Gate not a Decision Gate ---

test('edit mode emits a bracketed Review Gate verdict', () => {
  const t = read(path.join(STEPS, 'step-04b-finalize.md'));
  for (const token of ['CONFIRMED', 'PARTIAL', 'FALSIFIED']) {
    assert.ok(t.includes(token), `edit mode must be able to emit [${token}]`);
  }
  assert.match(t, /Review Gate/i);
  assert.match(t, /gap-map\.md/, 'the card must live next to the findings it summarises');
});

test('edit mode no longer carries a completion contract no step implements', () => {
  const s = skillMd();
  const editBlock = s.slice(s.indexOf('**Edit mode:**'), s.indexOf('A mode with no completion contract'));
  assert.ok(!/ux-research-report\.md/.test(editBlock),
    'Done when must not claim a validate-mode artifact for an edit-mode run — that claim was ' +
    'written from assumption and no step implemented it');
  assert.match(editBlock, /gap-map\.md/, 'it must name the artifact edit mode actually writes');
});

test('no mode reuses the retired unbracketed GO/FIX vocabulary', () => {
  for (const f of fs.readdirSync(STEPS).filter((x) => x.endsWith('.md'))) {
    const t = read(path.join(STEPS, f));
    assert.ok(!/^\s*[-*]\s*\*\*(GO|FIX)\*\*/m.test(t),
      `${f} still declares an unbracketed GO/FIX verdict`);
  }
});

test('SKILL.md states which gate belongs to which mode', () => {
  const s = skillMd();
  assert.match(s, /## Which gate, when/, 'the gate/violation table must exist');
  assert.match(s, /never[\s\S]{0,80}\[GO\]|\*\*Decision\*\*\s*\|\s*never/,
    'it must state that /design never issues a Decision Gate');
});

// --- 4. findings have a home ---

test('edit mode names the gap map as the findings home', () => {
  const t = read(path.join(STEPS, 'step-02b-identify-gaps.md'));
  assert.match(t, /gap-map\.md/,
    'a Green/Yellow/Red map with nowhere to live cannot be tracked to closure');
});

test('every step that emits an artifact cites a template or declares its shape', () => {
  // The adopted rule: a template citation OR a declared inline shape contract, never neither.
  const producers = ['step-03b-revise.md', 'step-03a-user-stories.md', 'step-05a-design-tokens.md',
    'step-04a-screen-states.md', 'step-04b-finalize.md'];
  for (const f of producers) {
    const t = read(path.join(STEPS, f));
    const emits = /artifacts\/output\/[a-z0-9/_.-]+\.(md|html|yaml)/.test(t);
    if (!emits) continue;
    const citesTemplate = /templates\//.test(t);
    // A shape contract is any of: a named table schema, an explicit scaffold instruction,
    // or a gate card with named fields. A card with fixed fields IS a shape — the first
    // version of this test only recognised tables and templates, and failed step-04b,
    // whose verdict card declares its own shape.
    const declaresShape = /shape contract|\| *Artifact *\||\| *Grade *\||copy it|fill in place|structure/i.test(t)
      || (/^VERDICT:/m.test(t) && /^\s*Because\s*:/m.test(t) && /^\s*Next\s*:/m.test(t));
    assert.ok(citesTemplate || declaresShape,
      `${f} emits an artifact but names neither a template nor a shape contract`);
  }
});

test('step-04a cites the templates for the artifacts it produces', () => {
  const t = read(path.join(STEPS, 'step-04a-screen-states.md'));
  assert.match(t, /product-spec-template\.md/,
    'step-04a authors product-spec.md and must cite its canonical template');
  assert.match(t, /measurement-plan-template\.md/,
    'step-04a produces measurement-plan.md and a template for it exists');
});

// --- 5. limits agree across modes ---

test('the revision-cycle limit is the same in every mode that states one', () => {
  const limits = [];
  for (const f of ['step-03b-revise.md', 'step-04c-lock-handoff.md']) {
    const t = read(path.join(STEPS, f));
    const m = t.match(/[Mm]ax (\d+) revision cycles?/);
    if (m) limits.push({ f, n: Number(m[1]) });
  }
  assert.ok(limits.length >= 2, 'both modes should state a limit');
  const distinct = [...new Set(limits.map((l) => l.n))];
  assert.strictEqual(distinct.length, 1,
    `two modes disagreed on the same operation: ${JSON.stringify(limits)}`);
});

test('a section that hits the limit is recorded, not silently dropped', () => {
  const t = read(path.join(STEPS, 'step-03b-revise.md'));
  assert.match(t, /open blocking finding|not silently carried forward/i);
  assert.match(t, /change record/i, 'and every revision must be traceable to the finding it closed');
});

// --- 6. reverse mode's tracker list is not a complete account, and says so ---

test('reverse mode documents that its tracker list omits the looped create steps', () => {
  const s = skillMd();
  assert.match(s, /Tracking note/i,
    'reverse mode loops create steps 02a-05a but the reverse tracker list omits them — that ' +
    'gap must be stated where a reader will hit it');
});

// --- 7. the four modes really do all exist ---

test('the skill declares four modes and every mode has step files', () => {
  // Step files are named step-NN<infix>-name.md (step-01a, step-03b), so the infix is
  // matched against the step token, not as a hyphen-delimited path segment.
  const suffixes = { create: 'a', edit: 'b', validate: 'c', reverse: 'd' };
  const files = fs.readdirSync(STEPS);
  for (const [mode, sfx] of Object.entries(suffixes)) {
    const n = stepsForMode(mode).length;
    assert.ok(n >= 4, `${mode} mode should have at least 4 tracked steps, found ${n}`);
    assert.ok(files.some((f) => new RegExp(`^step-\\d+${sfx}-`).test(f)),
      `${mode} mode should have step files using the "${sfx}" step infix`);
  }
});

// --- 8. an untracked skill must be visible in the audit -------------------------
// Owner-observed: /design produced results, but no step records existed and
// `step_tracker.js audit --all` listed only the three tracked skills. Absence from a
// health report reads as "nothing to report", when the honest reading is "ran untracked".

test('the step audit enumerates untracked step-shipping skills', () => {
  const src = read(path.join(ROOT, '.agents/scripts/step_tracker.js'));
  assert.match(src, /Untracked skills/,
    'the audit must surface skills that ship steps but hold zero records');
  assert.ok(!/const skills = all \? \[\.\.\.new Set\(entries\.map\(e => e\.skill\)/.test(src),
    'the skill list must not be derived from the records alone — that makes a zero-record ' +
    'skill permanently invisible');
});

test('the untracked section counts step files in steps/, not at the skill root', () => {
  const src = read(path.join(ROOT, '.agents/scripts/step_tracker.js'));
  assert.match(src, /'steps'/, 'step files live in <skill>/steps/; counting at the root reports 0');
  assert.ok(!/readdirSync\(path\.join\(skillsDir, name\)\)\.filter\(f => \/\^step-/.test(src),
    'counting step files at the skill root always yields 0');
});

test('a skill that ships no step files is not reported as untracked', () => {
  const src = read(path.join(ROOT, '.agents/scripts/step_tracker.js'));
  assert.match(src, /hasSteps\.get\(name\) > 0/,
    'single-file skills are not step-tracked by design and must not be listed as untracked');
});

// --- 9. "ran untracked" must be decidable, not guessed --------------------------
// Owner-observed: validate and reverse produced results, but no step records existed and
// `audit --all` said nothing. The audit derived its skill list FROM the records, so a
// zero-record skill was permanently invisible.

test('the audit cross-checks declared artifact paths against the records', () => {
  const src = read(path.join(ROOT, '.agents/scripts/step_tracker.js'));
  assert.match(src, /declaredArtifacts/,
    'the audit must compare declared output artifacts against step records');
  assert.match(src, /ran untracked/,
    'and must name the state where artifacts exist but no step was recorded');
});

test('the artifact probe is scoped to the Output artifacts section, not the whole file', () => {
  const src = read(path.join(ROOT, '.agents/scripts/step_tracker.js'));
  assert.match(src, /Output artifacts/,
    'scoping matters: a whole-file scan read journey-map.md out of /design Prerequisites and ' +
    'reported "ran untracked" — but that file is /unpack-problem output that /design consumes');
  assert.match(src, /never ran, or cleaned up|unknown/,
    'a skill declaring no probeable path must be reported unknown, never "never ran"');
});

test('validate-idea and /design declare full artifact paths so their state is decidable', () => {
  for (const [skill, expect] of [
    ['validate-idea', 'artifacts/output/01-discovery/validation-brief.md'],
    ['design', 'artifacts/output/03-strategy/product-spec.md']
  ]) {
    const md = read(path.join(ROOT, '.agents/skills', skill, 'SKILL.md'));
    const section = md.match(/^##\s*Output artifacts\s*$([\s\S]*?)(?=^##\s|\Z)/mi);
    assert.ok(section, `${skill} must have an Output artifacts section for the audit to read`);
    assert.ok(section[1].includes(expect),
      `${skill} must declare ${expect} as a full path — bare filenames cannot be probed`);
  }
});
