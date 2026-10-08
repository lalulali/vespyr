'use strict';
/**
 * test_develop_completion.test.js — the terminal gate of `/develop`.
 *
 * WHY THIS FILE EXISTS
 * `/plan` shipped no gate (fixed), `/design` shipped two, `/motion` shipped three. `/develop` —
 * the largest workflow in the engine, the one every downstream skill depends on — shipped
 * **zero**, and its Done-when was three lines of prose, one of them literally mechanical:
 *
 *     - `qa-signoff.md` exists with GO/CONDITIONAL
 *
 * Nothing performed that check. And measured across the whole repo: **no step file, no script,
 * and no template produced `qa-signoff.md` at all.** `/launch` halts when it is "missing or is
 * not `GO`/`CONDITIONAL`". The pipeline's own terminal gate was a file with no producer —
 * `/develop` reports completion, then `/launch` halts on a document nobody was asked to write.
 *
 * Structure is built from `signoff()` rather than a fixture file, so no test asserts against a
 * document that itself describes the subject.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/develop_completion_check.js');

function signoff({ verdict = 'GO', conditions = [], findings = [], citations = ['coverage-report.md', 'test-report.md'] } = {}) {
  const cond = conditions.length
    ? conditions.map((c, i) => `| C${i + 1} | ${c.text} | ${c.owner} | ${c.due} | yes |`).join('\n')
    : '| — | — | — | — | — |';
  const find = findings.length
    ? findings.map((f) => `| ${f} | High | @developer | known |`).join('\n')
    : '| — | — | — | — |';
  const cite = citations.map((c) => `| Evidence | \`05-execution/quality/${c}\` | result |`).join('\n');
  return `---
feature: "x"
---

# QA Sign-off

**Verdict:** \`VERDICT: [${verdict}]\`

One sentence: the feature ships.

## Evidence

| Evidence | Path | Result |
|---|---|---|
${cite}

## Conditions

| # | Condition | Owner | Due | Blocking? |
|---|---|---|---|---|
${cond}

## Open findings carried forward

| Finding | Severity | Owner | Notes |
|---|---|---|---|
${find}

## Sign-off

| Reviewer | Disposition | Date |
|---|---|---|
| @qa-engineer | \`SATISFIED\` | 2026-10-08 |
`;
}

function run(text, { requireSignoff = false, withEvidence = true, stale = false, codeRoot = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devcomplete-'));
  const q = path.join(dir, 'artifacts', 'output', '05-execution', 'quality');
  fs.mkdirSync(q, { recursive: true });
  if (withEvidence) {
    for (const f of ['coverage-report.md', 'test-report.md']) fs.writeFileSync(path.join(q, f), '# report\n');
  }
  if (text !== null) fs.writeFileSync(path.join(q, 'qa-signoff.md'), text, 'utf8');
  if (stale) {
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'new.js'), '// newer\n');
    if (fs.existsSync(path.join(q, 'coverage-report.md'))) {
      const old = new Date(Date.now() - 86400000 * 3);
      fs.utimesSync(path.join(q, 'coverage-report.md'), old, old);
    }
  }
  const args = [SCRIPT, 'check', '--root', dir, '--json'];
  if (requireSignoff) args.push('--require-signoff');
  if (codeRoot) args.push('--code-root', codeRoot);
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', args, { encoding: 'utf8' });
  } catch (e) { code = e.status; out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  let json = {};
  try { json = JSON.parse(out); } catch { /* non-JSON */ }
  return { code, json, failures: json.failures || [] };
}

// --- the happy path ---------------------------------------------------------------------------

test('a plain GO sign-off with present evidence passes', () => {
  const r = run(signoff());
  assert.strictEqual(r.code, 0, JSON.stringify(r.failures));
  assert.strictEqual(r.json.signoff.verdict, 'GO');
});

test('a CONDITIONAL sign-off passes when every condition has an owner and a date', () => {
  const r = run(signoff({
    verdict: 'CONDITIONAL',
    conditions: [{ text: 'PDF export fails above 500 rows', owner: '@developer', due: '2026-10-20' }],
  }));
  assert.strictEqual(r.code, 0, JSON.stringify(r.failures));
});

// --- the verdict enum -------------------------------------------------------------------------

test('[NO-GO] cannot complete a cycle — it is a verdict, not a completion', () => {
  const r = run(signoff({ verdict: 'NO-GO' }));
  assert.strictEqual(r.code, 1);
  assert(r.failures.some((f) => /\[NO-GO\]/.test(f)), JSON.stringify(r.failures));
});

test('a bare sentence is not a verdict — the bracketed form is the machine-readable one', () => {
  const r = run('# QA Sign-off\n\nI think this is probably fine to ship.\n');
  assert.strictEqual(r.code, 1);
  assert(r.failures.some((f) => /bracketed verdict/.test(f)), JSON.stringify(r.failures));
});

// --- the contradictions ------------------------------------------------------------------------

test('[GO] with a named condition is a contradiction', () => {
  // A condition is a blocking finding by definition, so that state is [CONDITIONAL]. Allowing
  // it would make the condition decorative.
  const r = run(signoff({
    verdict: 'GO',
    conditions: [{ text: 'something outstanding', owner: '@developer', due: '2026-10-20' }],
  }));
  assert.strictEqual(r.code, 1);
  assert(r.failures.some((f) => /a condition is a blocking finding by definition/i.test(f)), JSON.stringify(r.failures));
});

test('[GO] with an open finding carried forward is a contradiction', () => {
  const r = run(signoff({ verdict: 'GO', findings: ['flaky integration test'] }));
  assert.strictEqual(r.code, 1);
  assert(r.failures.some((f) => /open finding/.test(f)), JSON.stringify(r.failures));
});

test('[CONDITIONAL] with no conditions named is a GO wearing a caveat', () => {
  const r = run(signoff({ verdict: 'CONDITIONAL' }));
  assert.strictEqual(r.code, 1);
  assert(r.failures.some((f) => /no conditions named/.test(f)), JSON.stringify(r.failures));
});

test('a condition with no owner, and one with no date, are both rejected', () => {
  const noOwner = run(signoff({
    verdict: 'CONDITIONAL',
    conditions: [{ text: 'outstanding', owner: 'someone', due: '2026-10-20' }],
  }));
  assert(noOwner.failures.some((f) => /no named owner/.test(f)), JSON.stringify(noOwner.failures));

  const noDate = run(signoff({
    verdict: 'CONDITIONAL',
    conditions: [{ text: 'outstanding', owner: '@developer', due: 'soon' }],
  }));
  assert(noDate.failures.some((f) => /no date/.test(f)), JSON.stringify(noDate.failures));
});

// --- citations must resolve ---------------------------------------------------------------------

test('a sign-off citing evidence that does not exist is rejected', () => {
  const r = run(signoff({ citations: ['coverage-report.md', 'imagination-report.md'] }));
  assert.strictEqual(r.code, 1);
  assert(r.failures.some((f) => /imagination-report\.md/.test(f)), JSON.stringify(r.failures));
});

// --- staleness -----------------------------------------------------------------------------------

test('a coverage report older than the newest source change is stale and fails', () => {
  // qa-engineer.md already required the refresh before sign-off. Nothing enforced it.
  const r = run(signoff(), { stale: true });
  assert.strictEqual(r.code, 1);
  assert(r.failures.some((f) => /stale/.test(f)), JSON.stringify(r.failures));
});

test('staleness is not guessed when there is no code to compare against', () => {
  const r = run(signoff(), { stale: false });
  assert.strictEqual(r.code, 0, 'an absent code root must not invent a staleness failure');
});

// --- absence: the contract that bit the motion and plan gates -------------------------------------

test('an absent sign-off is a SKIP by default', () => {
  const r = run(null);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.json.skipped, true);
});

test('--require-signoff turns absence into a FAILURE and never reports ok:true', () => {
  // The bug measured in motion_spec_check.js: ok:true with nothing on disk.
  const r = run(null, { requireSignoff: true });
  assert.strictEqual(r.code, 1);
  assert.strictEqual(r.json.ok, false);
  assert.notStrictEqual(r.json.skipped, true);
  assert(r.failures.length > 0, 'a required-but-absent sign-off must still populate failures');
});

// --- the wiring defects this audit found ------------------------------------------------------------

test('step-10 invokes the gate with --require-signoff', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-10-completion.md'), 'utf8');
  assert.match(s, /develop_completion_check\.js check --require-signoff/,
    'without the flag an absent sign-off is a skip and the gate reports ok:true with nothing on disk');
});

test('step-07 produces the sign-off — the artifact nothing produced', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-07-quality-gates.md'), 'utf8');
  assert.match(s, /qa-signoff\.md/, 'no step produced the file `/launch` halts on');
  assert.match(s, /complete --agent qa-engineer --artifact 05-execution\/quality\/qa-signoff\.md/);
});

test('a template exists for the sign-off', () => {
  const p = path.join(ROOT, '.agents/skills/develop/templates/qa-signoff.md');
  assert.ok(fs.existsSync(p), 'the terminal artifact had no template');
  const t = fs.readFileSync(p, 'utf8');
  assert.match(t, /VERDICT: \[GO\]/, 'the template must show the bracketed form');
  assert.match(t, /\[CONDITIONAL\]/);
  assert.match(t, /\[NO-GO\]/);
});

test('/develop declares its two surfaces', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/SKILL.md'), 'utf8');
  assert.match(s, /## Two surfaces/);
  assert.match(s, /Document surface/);
  assert.match(s, /Chat surface/);
});

test('the Done-when names the gate instead of asserting prose', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/SKILL.md'), 'utf8');
  assert.match(s, /develop_completion_check\.js check --require-signoff` exits 0/);
});

// --- Blind run 1 (dispatch router, brownfield) — what it found beyond the gate ----------------
// The run completed the whole cycle and the new sign-off gate accepted its artifact on the first
// attempt. The findings below are what it hit on the way, including a false message in the
// story-count floor this audit added one round earlier.

test('the story-count floor does not claim "no user story" when stories exist in another layout', () => {
  // Measured: a brownfield handover used `## US-001 — Route a parcel` headings with seven
  // acceptance criteria. The gate said "no user story is defined" — correct rejection (neither
  // supported layout is used) with a false reason, and a false reason sends the author to fix
  // the wrong thing.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flatstories-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output/03-strategy'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/requirements.md'), '# PRD\n');
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/user-stories.md'),
    '# User stories\n\n## US-001 — Route a parcel\n\n**Acceptance criteria:**\n- **AC-H1:** given a parcel, then one carrier.\n');
  let out = '';
  try {
    out = execFileSync('node', [path.join(ROOT, '.agents/scripts/template_conformance.js'),
      'check', '--mode', 'create', '--root', dir, '--json'], { encoding: 'utf8' });
  } catch (e) { out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  const j = JSON.parse(out);
  const f = (j.userStories.failures || []).find((x) => /US-###/.test(x) || /no user story is defined/.test(x));
  assert.ok(f, 'expected a story-layout failure');
  assert.match(f, /no supported story layout was found/i,
    'the message must describe the real problem: a layout this gate cannot read');
  assert.ok(!/no user story is defined/.test(f),
    'the file defines US-001; saying otherwise is false and misdirects the fix');
});

test('--root is honoured by step_tracker, not parsed and discarded', () => {
  // `args.root` appeared zero times in step_tracker.js while PROJECT_ROOT was fixed to
  // process.cwd(). Every gate script in the engine honours --root, so passing it here is the
  // natural thing to do — and it silently did nothing.
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/step_tracker.js'), 'utf8');
  assert.match(src, /ROOT_FLAG_INDEX/, 'the flag must be read');
  assert.match(src, /--root/, 'and documented in the constant that reads it');
  assert.ok(!/^const PROJECT_ROOT = process\.cwd\(\);$/m.test(src),
    'PROJECT_ROOT is still hard-wired to cwd');
});

test('a parent step is satisfied by its lettered sub-steps', () => {
  // develop-state.md documents `"3" means both 3a+3b done`. Without this, completing 3a and 3b
  // left "3" unmet and every subsequent step warned — 13 accumulated warnings, which is exactly
  // the noise that trains a reader to ignore warnings.
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/step_tracker.js'), 'utf8');
  assert.match(src, /done\.replace\(\/\[a-z\]\/i, ''\) === String\(prevStepNum\)/);
});

test('an explicitly skipped step satisfies the prerequisite, and a skip needs a reason', () => {
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/step_tracker.js'), 'utf8');
  assert.match(src, /e\.skipped === true/, 'a recorded skip is not drift');
  assert.match(src, /--skipped requires a reason of at least 8 characters/,
    'a skip with no reason is indistinguishable from an omission');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skipreason-'));
  fs.mkdirSync(path.join(dir, '.agents'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, '.agents/config.yaml'), path.join(dir, '.agents/config.yaml'));
  let code = 0;
  try {
    execFileSync('node', [path.join(ROOT, '.agents/scripts/step_tracker.js'), 'complete',
      '--skill', 'develop', '--step', '2', '--skipped', '--root', dir], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) { code = e.status; }
  fs.rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(code, 1, '--skipped with no reason must be rejected');
});

test('step 7 has no duplicate section letters and is in order', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-07-quality-gates.md'), 'utf8');
  const heads = [...s.matchAll(/^#{2,4}\s+(7[a-g])\./gm)].map((m) => m[1]);
  assert.ok(heads.length >= 6, `expected the 7a-7g sections, found ${heads.length}`);
  assert.deepStrictEqual(heads, [...new Set(heads)],
    `duplicate section letters: ${heads.join(', ')} — following "7c" landed on Performance Review when Accessibility was meant`);
  assert.deepStrictEqual(heads, [...heads].sort(), `out of order: ${heads.join(' ')}`);
});

test('step 8 names its output path', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-08-pm-verification.md'), 'utf8');
  assert.match(s, /## Output/);
  assert.match(s, /05-execution\/pm-verification\.md/,
    'the path was unnamed, so a blind run had to invent the filename');
});

test('the kanban lost-write is called out in both writers', () => {
  // 3b writes a Task Assignment table; 4 populates the same file from a template and runs later.
  const s3b = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-03b-backlog-prep.md'), 'utf8');
  const s4 = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-04-kanban-activation.md'), 'utf8');
  assert.match(s3b, /may not exist yet/i, '3b runs before the board is created');
  assert.match(s4, /Do not clobber step 3b's Task Assignment table/i,
    'a template copy that overwrites it silently discards the worktree allocation');
  assert.match(s4, /must \*\*merge\*\*|must merge/i);
});

test('step 1 has a brownfield escape instead of a dead end', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-01-spec-alignment.md'), 'utf8');
  assert.match(s, /Brownfield escape/i);
  assert.match(s, /halt on the format but not on the work/i,
    'followed literally, an inherited spec ends the run at step 1 with the owner\'s request unanswered');
  assert.match(s, /labelled deviation/i);
});

test('step 10 never forces a phase advance to satisfy its own sentence', () => {
  const s = fs.readFileSync(path.join(ROOT, '.agents/skills/develop/steps/step-10-completion.md'), 'utf8');
  assert.match(s, /Confirm it advanced — or record why it did not/i);
  assert.match(s, /Do not force it/i,
    'running advance repeatedly would walk the pipeline backwards to satisfy a token');
});
