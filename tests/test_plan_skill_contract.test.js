'use strict';
/**
 * test_plan_skill_contract.test.js — `/plan`'s written contract.
 *
 * WHY THIS FILE EXISTS
 * `/plan` shipped 135 lines, one step file, and **no mechanical gate at all** — its entire
 * Done-when was prose. A blind run on a freight-portal brief then found six further gaps that
 * no gate would ever catch, all of them in the instructions: it never asked whether there was a
 * codebase to plan against, its dependency graph had three notations and named none canonical,
 * "every task is independently runnable" contradicted "a dependency graph is required", the
 * only remedy for an orphan acceptance criterion meant silently editing an upstream file
 * `/design` owns, Step 1 no-ops silently when its subagent is unavailable, and Step 4 — the
 * actual planning work — was a single sentence with no decomposition method.
 *
 * Each test below names the run finding it locks down. Reverting the fix must fail it; a test
 * that passes while the instruction is gone is a test asserting its own absence.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILL = path.join(ROOT, '.agents/skills/plan/SKILL.md');
const raw = fs.readFileSync(SKILL, 'utf8');

/** Collapse wrapping so a sentence broken across lines still matches one regex. */
const flat = (s) => s.replace(/\s+/g, ' ');
const skill = flat(raw);
const step = (n, title) => {
  const start = raw.indexOf(`### Step ${n}:`);
  assert.notStrictEqual(start, -1, `Step ${n} (${title}) not found in SKILL.md`);
  const rest = raw.slice(start);
  const next = rest.slice(1).search(/\n### Step \d+:/);
  return flat(next === -1 ? rest : rest.slice(0, next + 1));
};

// --- the gate exists at all -----------------------------------------------------------------

test('/plan ships a mechanical gate, and it is not optional', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, '.agents/scripts/execution_plan_check.js')),
    '/plan shipped no gate while /design shipped two and /motion shipped two — every rule in ' +
      'the skill was enforced only by an agent choosing to read it carefully'
  );
  assert.match(skill, /execution_plan_check\.js check --require-plan/);
});

// --- greenfield vs brownfield ----------------------------------------------------------------

test('the plan must state greenfield or brownfield before estimating', () => {
  const s3 = step(3, 'Architecture check');
  assert.match(s3, /greenfield or brownfield/i,
    'a blind run planned 25 tasks of migrations, middleware and a status-write path against a ' +
      'repository that did not exist, and named the assumed-modifiable system as the plan\'s ' +
      'weakest link');
  assert.match(s3, /Estimate only from code you have read/i,
    'an estimate for a file you have not opened is a guess wearing a number');
  assert.match(s3, /blocker, not a\s+detail/i,
    '"is this code ours?" was unasked, and 13 hours depended on the answer');
});

// --- dependency graph syntax --------------------------------------------------------------------

test('the dependency graph names one canonical form and says the diagram is not parsed', () => {
  assert.match(skill, /Canonical form/i);
  assert.match(skill, /left must finish first/i, 'direction must be unambiguous — `←` and `→` are the usual misreading');
  assert.match(skill, /edge list is the machine-readable part/i,
    'a blind run drew an ASCII diagram, was told the graph had no parseable edge, and reported ' +
      'the skill\'s own example as "probably also failing"');
  assert.match(skill, /not\* parsed/i);
});

// --- the independently-runnable contradiction ------------------------------------------------

test('independently-runnable is reconciled with the dependency graph', () => {
  const done = flat(raw.slice(raw.indexOf('## Done when')));
  assert.ok(
    !/Every task is independently runnable and sized/.test(done),
    'Done when demanded both "every task is independently runnable" and a dependency graph, ' +
      'which cannot both hold — a blind run stopped on exactly this'
  );
  assert.match(done, /no dependency you have not\s+written down/i);
  assert.match(done, /the two agree/i);
});

// --- planning-time stories --------------------------------------------------------------------

test('an orphan acceptance criterion has a sanctioned remedy that does not hide provenance', () => {
  const t = skill;
  assert.match(t, /planning-time stories/i);
  assert.match(t, /Confirm or reassign/i,
    'a blind run invented US-007/US-008 inside /design\'s user-stories.md with no provenance, ' +
      'so a reader could not tell planning\'s stories from the PM\'s');
  assert.match(t, /constraint story/i,
    'a non-functional criterion (accessibility, load) needs a real user, not a task labelled ' +
      '"fix accessibility" — a criterion with no user has no story');
  assert.match(t, /Do not silently edit the upstream file/i);
});

// --- Step 1 fallback ---------------------------------------------------------------------------

test('Step 1 states what happens when the memory subagent is unavailable', () => {
  const s1 = step(1, 'Load memory');
  assert.match(s1, /unavailable/i);
  assert.match(s1, /no-ops silently/i,
    'in a blind run no memory-controller was invocable, Step 1 did nothing, and both tracker ' +
      'calls still exited 0 — a no-op that looked like a pass');
});

// --- Step 4 has a method -----------------------------------------------------------------------

test('Step 4 carries an actual decomposition method', () => {
  const s4 = step(4, 'Break down tasks');
  assert.match(s4, /How to decompose/i, 'Step 4 was one sentence and was the hardest step in the skill');
  assert.match(s4, /acceptance criterion, not by feature/i);
  assert.match(s4, /Shared setup is a task/i,
    'migrations, tenancy, auth scaffolding and CI are real work; hidden inside other tasks ' +
      'they are unbudgeted');
  assert.match(s4, /A task you cannot start is not a task/i);
});

// --- wiring defects the audit found mechanically ----------------------------------------------

test('user-stories.md is a required prerequisite, because Step 2 reads it', () => {
  assert.match(skill, /user-stories\.md`? exists[\s\S]{0,6}\*\*required, not optional/i);
});

test('the audit can see steps 2-5, not just 0 and 1', () => {
  for (const n of [2, 3, 4, 5]) {
    assert.match(skill, new RegExp(`begin --skill plan --step ${n}`));
  }
});

test('the completion record points at the real path', () => {
  assert.match(skill, /--artifact 05-planning\/execution-plan\.md/);
  assert.ok(!/--artifact execution-plan\.md/.test(skill));
});

// --- Two surfaces ------------------------------------------------------------------------------

test('/plan declares its two surfaces', () => {
  assert.match(skill, /## Two surfaces/);
  assert.match(skill, /Document surface/);
  assert.match(skill, /Chat surface/);
  assert.match(skill, /18 tasks. is not an answer|"18 tasks" is not an answer/i,
    'a count is not an answer; the consequence and the blocker are');
});
// --- the template must pass its own gate ------------------------------------------------------
// The most direct regression guard in this file: extract the template from SKILL.md, fill its
// placeholders the way an author would, and run the real gate over the result. This caught the
// template shipping with no `Story` column at all (so traceability could not be expressed) and
// a dependency graph naming a task the task list did not contain.

test("the Execution plan template, filled in, passes the skill's own gate", () => {
  const { execFileSync } = require('child_process');
  const os = require('os');

  const i = raw.indexOf('## Execution plan template');
  assert.notStrictEqual(i, -1, 'template section not found');
  const open = raw.indexOf('```markdown', i);
  const close = raw.indexOf('```', open + 3);
  const tpl = raw.slice(open + '```markdown'.length, close).trim();
  assert.ok(tpl.includes('## Task list') && tpl.includes('## Dependency graph'), 'template truncated');

  const filled = tpl
    .replace('{feature name}', 'Shipment list')
    .replace('YYYY-MM-DD', '2026-10-07')
    .replace(/\{brownfield[^}]*\}/, 'brownfield — meridian/portal')
    .replace('{N} hours', '7')
    .replace('{N} of {total}', '3 of 3')
    .replace(/\{none[^}]*\}/, 'none')
    .replace(/\| T001 \| \.\.\. \|/, '| T001 | Scaffold tenancy |')
    .replace(/\| T002 \| \.\.\. \|/, '| T002 | Shipment list query |')
    .replace(/\| T003 \| \.\.\. \|/, '| T003 | Status polling |');
  // The header keeps `{N}` as illustration; only the Task list is gate input, so that is the
  // part that must be fully resolvable.
  const taskList = filled.slice(filled.indexOf('## Task list'), filled.indexOf('## Dependency graph'));
  const leftover = taskList.match(/\{[A-Za-z][^}]*\}/g) || [];
  assert.deepStrictEqual(leftover, [], `unfilled placeholder in the Task list: ${leftover}`);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plantpl-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output/05-planning'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts/output/03-strategy'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/output/05-planning/execution-plan.md'), filled);
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/user-stories.md'),
    '# User stories\n## US-001\n**Acceptance:** AC-01\n## US-002\n**Acceptance:** AC-02\n');
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/product-spec.md'),
    '# Spec\n- **AC-01** tenant scoping\n- **AC-02** live status\n');

  let code = 0;
  let out = '';
  try {
    out = execFileSync('node',
      [path.join(ROOT, '.agents/scripts/execution_plan_check.js'), 'check', '--require-plan', '--root', dir, '--json'],
      { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
    out = `${e.stdout || ''}${e.stderr || ''}`;
  }
  fs.rmSync(dir, { recursive: true, force: true });

  const j = JSON.parse(out);
  assert.strictEqual(code, 0,
    `the skill's own template fails its own gate: ${JSON.stringify(j.failures, null, 2)}`);
});

test('the Task list table carries a mandatory Story column', () => {
  const { execFileSync } = require('child_process');
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plancol-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output/05-planning'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/output/05-planning/execution-plan.md'),
    '# P\n\n## Task list\n\n| ID | Task | Est. (h) | Depends On |\n|---|---|---|---|\n' +
    '| T001 | A | 2 | — |\n\n## Dependency graph\n\n## Risk register\n\n' +
    '| Risk | Likelihood | Impact | Mitigation |\n|---|---|---|---|\n| X | Low | Low | Y |\n');
  let code = 0;
  let out = '';
  try {
    execFileSync('node',
      [path.join(ROOT, '.agents/scripts/execution_plan_check.js'), 'check', '--root', dir, '--json'],
      { encoding: 'utf8' });
  } catch (e) { code = e.status; out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  const j = JSON.parse(out);
  assert.strictEqual(code, 1);
  assert(j.failures.some((f) => /no "Story" column/.test(f)), JSON.stringify(j.failures));
});

// --- Blind verification run 2 (same brief, repaired skill) ------------------------------------
// The repaired skill passed its gate first try with zero fix-iterations, forced the greenfield
// statement, and caught the orphan criteria with a message naming both. The findings below are
// what that run found instead — including two caused by my own repair wording.

test('the canonical arrow is a mandate, not one option among accepted alternatives', () => {
  // I wrote "the gate accepts six forms, write →". A verification run read the acceptance list
  // as an offer. On a plan where a reversed edge silently builds the wrong thing, five
  // tolerated alternatives beside one safe one is a trap dressed as flexibility.
  assert.match(skill, /Write `→` and nothing else/i);
  assert.ok(
    !/but do not use them/.test(skill) === false,
    'the mandate must say outright that the other accepted forms are not to be used'
  );
});

test('multi-value Depends On and Parallel With cells are documented', () => {
  assert.match(skill, /Multi-value cells are comma-separated/i,
    'a run used one ID per cell out of fear of a parse failure it could not verify without ' +
      'weakening the gate — the examples showed one ID and never said the cell held one');
  assert.match(skill, /T001, T003/);
});

test('a criteria-vs-criteria conflict is a halt condition', () => {
  // AC-02 (status within 5s, no refresh) versus AC-06 (500 users, no degradation) — halt
  // conditions covered spec-vs-stories and spec-vs-ADRs and never the case where the
  // expensive conflicts live.
  assert.match(skill, /Two acceptance criteria cannot both hold/i);
  assert.match(skill, /The gate cannot catch\s+this/i,
    'the gate checks plan shape; it cannot tell that two requirements are unsatisfiable ' +
      'together, and pretending otherwise would be the over-fitted gate this audit rejects');
});

test('the estate the brief assumes is a separate question from greenfield', () => {
  const s3 = step(3, 'Architecture check');
  assert.match(s3, /estate the brief assumes/i,
    'the verification run\'s actual blocker: the brief asserted four systems exist that were ' +
      'never named as deliverables, and 10 of its 69 hours went into discovering that');
  assert.match(s3, /Discovery first, then plan/i);
  assert.match(s3, /discovery task/i);
  assert.match(s3, /Never write a task that depends on a system you merely assumed was modifiable/i);
});

test('step_tracker announces an absent config instead of silently recording nothing', () => {
  // A run found `begin --step N` from a tree with no .agents/config.yaml exit 0, print
  // nothing, and write no breadcrumb — the caller read that as "step recorded". Behaviour is
  // unchanged (still `off`); the degradation is announced.
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/step_tracker.js'), 'utf8');
  assert.match(src, /configMissing/);
  assert.match(src, /recorded NOTHING, despite exiting 0/);
  assert.match(
    src,
    /if \(!fs\.existsSync\(CONFIG_FILE\)\) return \{ step_tracking: 'off', configMissing: true \}/,
    'an absent config is not the same instruction as step_tracking: off'
  );
});

test('from the project root the tracker stays silent — the warning must not fire on config present', () => {
  const { execFileSync } = require('child_process');
  let err = '';
  let code = 0;
  try {
    execFileSync('node', [path.join(ROOT, '.agents/scripts/step_tracker.js'), 'begin', '--skill', 'plan', '--step', '2'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT });
  } catch (e) { code = e.status; err = `${e.stdout || ''}${e.stderr || ''}`; }
  assert.ok(!/recorded NOTHING/.test(err),
    `config.yaml exists at the root, so the degradation warning must not appear: ${err}`);
  // The exit code is deliberately NOT asserted: `begin --step 2` with no scope lock exits 1 via
  // the Step-0 scope gate, which is correct and unrelated to this warning. Asserting 0 here
  // would have been a test that passes only when an unrelated gate is disabled.
  assert.ok(code === 0 || code === 1, `unexpected exit ${code}: ${err}`);
});

test('the delegation claim matches what the delegate actually contains', () => {
  // /plan said "@tech-lead provides the reasoning, decision tree, and memory contract". Checked
  // against tech-lead.md: it had persona stance and a memory contract, but zero decomposition
  // guidance and no estimation method. An audit that trusts the skill's own description of its
  // delegate would never have found this.
  const lead = flat(fs.readFileSync(path.join(ROOT, '.agents/agents/tech-lead.md'), 'utf8'));
  assert.match(lead, /Estimation method/i);
  assert.match(lead, /No code read, no prior, no spike → you do not have an estimate/i,
    '"about 3 hours" with no base is a guess with a decimal point');
  assert.match(lead, /rounding up to fit the band/i,
    'a 6h task relabelled 4h does not become smaller');
  assert.match(skill, /What each side actually provides/i,
    'the over-promise must be corrected on the page that made it');
});

test('the failure message is grammatical for one orphan criterion', () => {
  const { execFileSync } = require('child_process');
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plangram-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output/05-planning'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts/output/03-strategy'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/output/05-planning/execution-plan.md'),
    '# P\n\n## Task list\n\n| ID | Task | Est. (h) | Depends On | Parallel With | Story |\n|---|---|---|---|---|---|\n' +
    '| T001 | A | 2 | — | — | US-101 |\n\n## Dependency graph\n\n## Risk register\n\n' +
    '| Risk | Likelihood | Impact | Mitigation |\n|---|---|---|---|\n| X | Low | Low | Y |\n');
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/user-stories.md'),
    '# User stories\n## US-101\nAs someone I want it.\n');
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/product-spec.md'), '# Spec\n- **AC-01** a\n');
  let out = '';
  try {
    execFileSync('node', [path.join(ROOT, '.agents/scripts/execution_plan_check.js'), 'check', '--root', dir, '--json'],
      { encoding: 'utf8' });
  } catch (e) { out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  const j = JSON.parse(out);
  assert(j.failures.some((f) => /Acceptance criterion AC-01 is claimed/.test(f)),
    `singular case must read correctly: ${JSON.stringify(j.failures)}`);
  assert.ok(!/criteria AC-01 are/.test(out), 'plural verb with a singular subject');
});
