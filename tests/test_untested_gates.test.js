/**
 * tests/test_untested_gates.test.js — two shipped gates that no test exercised.
 *
 * FOUND BY BLIND /LAUNCH RUN 8 (@qa-engineer seat). `memory_check.js` and `motion_intent_check.js`
 * are both wired into live skills — `/retro` step-05 and `/shape-up`, and `/design` step-01a
 * respectively — and both are registered in `.agents/manifest.json`, so `bin/cli.js verify` vouches
 * for their bytes while a 1351-green suite says nothing whatsoever about their behaviour.
 *
 * That combination is the defect: a manifest that "verifies" bytes and a suite that never runs the
 * thing produce a shared sense of coverage that neither has. A gate wired into a skill with no test
 * is a claim with nothing behind it.
 *
 * These tests are deliberately minimal and black-box: they call the gate as a skill would and assert
 * on exit codes and reported failures. They do not assert that the checks are GOOD, only that the
 * gate responds — which is what was missing.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

function runGate(script, args) {
  const r = spawnSync('node', [path.join(REPO, '.agents/scripts', script), ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  let j = null;
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* human mode */ }
  return { code: r.status, json: j, stdout: r.stdout, stderr: r.stderr };
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'untested-gate-'));
}

// --- both gates exist, are wired, and respond -----------------------------------------------

test('the two run-8 gates are registered in the manifest that vouches for them', () => {
  // FIXED AFTER BLIND RUN 9: the original decided this with
  // `Object.keys(manifest.skills || {}).length ? … : true`, and the manifest has no `skills` key, so
  // the ternary always took `: true`. The assertion could never fail. Now it checks the real thing.
  const manifestText = fs.readFileSync(path.join(REPO, '.agents/manifest.json'), 'utf8');
  for (const script of ['memory_check.js', 'motion_intent_check.js']) {
    assert.ok(fs.existsSync(path.join(REPO, '.agents/scripts', script)), `${script} must exist`);
    assert.ok(manifestText.includes(script),
      `${script} must be listed in .agents/manifest.json — a manifest that vouches for bytes it never`);
  }
});

test('both gates are wired into a live skill — the runner is not orphaned', () => {
  const wiring = {
    'memory_check.js': ['.agents/skills/retro/SKILL.md', '.agents/skills/retro/steps/step-05-compact.md'],
    'motion_intent_check.js': ['.agents/skills/design/steps/step-01a-load-prd-brief.md'],
  };
  for (const [script, where] of Object.entries(wiring)) {
    let wired = false;
    for (const w of where) {
      const full = path.join(REPO, w);
      if (fs.existsSync(full) && fs.readFileSync(full, 'utf8').includes(script.replace(/\.js$/, ''))) wired = true;
    }
    assert.ok(wired, `${script} must still be invoked by a skill — an unwired gate is dead code`);
  }
});

// --- memory_check.js -----------------------------------------------------------------------

test('memory_check: runs against the memory tree and reports a verdict per file', () => {
  // INVOCATION NOTE, found by running it — not assumed. `memory_check.js` takes `--dir`, not
  // `--file`, and it DOES NOT SUPPORT `--json`: it prints human `[PASS]/[FAIL]` lines regardless and
  // exits on the worst file. Assuming the common `--file`+`--json` interface here was my own error,
  // and it is recorded because every gate has its own CLI and the only way to learn it is to run it.
  // A FIXTURE, not the repository's own memory tree. `artifacts/` is gitignored, so it does not
  // exist in a fresh checkout — running the gate against it made this test fail on a clean clone.
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'project-context.md'), '# Project Context\n\n## [CORE]\nProject: Test\n');
  fs.writeFileSync(path.join(dir, 'active-decisions.md'), '# Active Decisions\n');
  const r = runGate('memory_check.js', ['check', '--dir', dir]);
  assert.ok(/\[PASS\]|\[FAIL\]/.test(r.stdout),
    `it must report a verdict per file, got: ${(r.stdout || r.stderr).slice(0, 160)}`);
  assert.match(r.stdout, /Summary: \d+ file\(s\) checked/, 'it must summarise what it checked');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('memory_check: a missing memory directory is a failure, not a pass', () => {
  const r = runGate('memory_check.js', ['check', '--dir', '/definitely/not/here', '--json']);
  assert.notStrictEqual(r.code, 0, 'a memory tree that cannot be read must never read as conformant');
});

// --- motion_intent_check.js -----------------------------------------------------------------

test('motion_intent_check: a missing file is fail-closed, never a pass', () => {
  const dir = tmp();
  const r = runGate('motion_intent_check.js', ['check', '--brief', path.join(dir, 'nope.md'), '--root', dir, '--json']);
  assert.notStrictEqual(r.code, 0,
    `a brief that cannot be read must not read as conformant: exit ${r.code}`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('motion_intent_check: an empty brief is a failure, not a pass', () => {
  const dir = tmp();
  const f = path.join(dir, 'intent.md');
  fs.writeFileSync(f, '   \n');
  const r = runGate('motion_intent_check.js', ['check', '--brief', f, '--root', dir, '--json']);
  assert.notStrictEqual(r.code, 0, 'an empty artifact must never read as conformant');
  fs.rmSync(dir, { recursive: true, force: true });
});

// --- the guard that keeps this from recurring ------------------------------------------------

test('every gate WIRED INTO A SKILL has at least one test that names it', () => {
  // This is the actual fix. The two gates above went untested because nothing ever asked.
  //
  // Scope correction found while writing it: `.agents/scripts/` also holds `test_anti_generic_check.js`
  // and `test_motion_intent_check.js`, which are SELF-TEST HARNESSES — running them prints a test
  // report ("Testing: compliant design.md passes... PASS"). They are tests, not gates, and are wired
  // into nothing. Filtering every `_check.js` conflated the two and produced two false positives.
  //
  // The meaningful scope is therefore: a gate that a skill actually invokes.
  // WALK EVERY FILE under .agents/skills/**, not just each SKILL.md.
  //
  // FIXED AFTER BLIND RUN 9: the SKILL.md-only scan could not see the very gate it was written for.
  // `motion_intent_check.js` is wired from `design/steps/step-01a-load-prd-brief.md`, so deleting its
  // behavioural tests left the meta-test green. A guard that cannot see its own subject is not a guard.
  const skillRoot = path.join(REPO, '.agents/skills');
  const skillSources = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md')) skillSources.push(full);
    }
  };
  walk(skillRoot);

  const selfTest = new Set(['test_anti_generic_check.js', 'test_motion_intent_check.js']);
  const wired = [];
  for (const s of fs.readdirSync(path.join(REPO, '.agents/scripts'))) {
    if (!s.endsWith('_check.js') || selfTest.has(s)) continue;
    const used = skillSources.some((p) => fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes(s.replace(/\.js$/, '')));
    if (used) wired.push(s);
  }

  // Executable, not textual — and PER GATE.
  //
  // FIXED AFTER BLIND RUN 9, three times over, and the two wrong versions are recorded because both
  // passed while the gate they guarded was uncovered:
  //
  //   v1: `testFiles.includes(stem)` — satisfied by a PROSE COMMENT. `anti_generic_check.js` is
  //       wired into /design and executed by nothing; the string appears in a comment at
  //       `tests/test_execution_plan_check.test.js:6`.
  //   v2: one regex alternation over every wired gate — answered "does some test spawn SOME gate",
  //       so one gate being spawned satisfied all of them. `anti_generic_check.js` still passed.
  //   v3: required an inline spawn naming the script — too strict, because most gates are spawned
  //       through a `GATE = path.join(REOT, …)` variable, so 12 real gates were reported uncovered.
  //
  // v4 requires, in the same test FILE, a real spawn call AND the gate named in executable CODE —
  // comments and docstrings stripped first, which is the specific defect v1 missed.
  //
  // KNOWN LIMIT, recorded rather than hidden: this is per-FILE, not per-call, so a file that spawns
  // one gate and merely names another in code would count the second as covered. Tightening it to
  // per-call needs dataflow analysis, and a per-file guard that catches the real failure is worth
  // more than a per-call guard that only looks precise.
  const INVOKE = /(?:spawnSync|execFileSync|execSync|spawn|runGate|runCheck)\s*\(/;
  const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 ');

  const testDir = path.join(REPO, 'tests');
  const testFiles = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.js'));

    const uncovered = wired.filter((s) => {
    const stem = s.replace(/\.js$/, '');
    return !testFiles.some((f) => {
      const code = stripComments(fs.readFileSync(path.join(testDir, f), 'utf8'));
      // v4 requires, in the same test FILE, a real spawn call AND the gate named in executable CODE —
      // comments and docstrings stripped first, which is the specific defect v1 missed.
      //
      // KNOWN GAP, recorded rather than closed. @qa-engineer's blind review (2026-10-13) measured this
      // guard certifying `research_plan_check.js` as covered while
      // `tests/test_research_plan_gate.test.js` — the only suite that spawns it — was deleted:
      // `test_empathy_map_re_audit.test.js` names the gate inside a readFileSync assertion loop, and a
      // per-file "names it" predicate accepts that as coverage.
      //
      // A stricter predicate was tried and REVERTED in the same session, because it flagged six
      // genuinely-covered gates (anti_generic, cycle_state, develop_completion, incident_record,
      // motion_assets, motion_spec) — each invoked through a helper function or a wrapped multi-line
      // spawnSync that a same-line scan cannot see. A guard that fires on real coverage is worse than
      // one with a hole: it gets ignored, and then neither works. Closing this properly needs
      // argument-position matching or one-level variable resolution done correctly, not a line
      // heuristic, and that was not finished.
      //
      // Until then, do not read a green line here as proof that a gate has tests. The check that
      // matters is the one this file exists to encourage: grep for the gate under tests/ and read the
      // file that matches.
      const invokes = INVOKE.test(code);
      if (!invokes) return false;
      // The gate itself, OR its own harness `test_<stem>`, which really does execute it. Counting the
      // harness is not a loophole: `test_anti_generic_check.js` and `test_motion_intent_check.js` run
      // the gate's checks directly, so spawning them is coverage.
      return new RegExp(String.raw`\b${stem}\b`).test(code)
        || new RegExp(String.raw`\btest_${stem}\b`).test(code);
    });
  });
assert.deepStrictEqual(uncovered, [],
    `these skill-wired gates have zero tests: ${uncovered.join(', ')}. A gate wired into a skill with ` +
    'no test is a claim with nothing behind it.');
});

// ---------------------------------------------------------------------------------------------
// `anti_generic_check.js` — the last skill-wired gate with no test that executed it.
//
// FOUND BY BLIND RUN 9 (@qa-engineer seat): it is wired into `/design` (SKILL.md, step-05a, step-06a)
// and executed by nothing under tests/. The meta-test above previously passed because the string
// appears in a PROSE COMMENT at `tests/test_execution_plan_check.test.js:6` — textual coverage, not
// coverage. The seat verified this by removing the comment and watching the guard fire.
//
// Note it ships its own harness (`test_anti_generic_check.js`, 10/10) but that harness is NOT wired
// into `npm test`, so CI never ran it.
// ---------------------------------------------------------------------------------------------

// Run the gate's OWN harness.
//
// I first wrote three behavioural tests against `anti_generic_check.js` and had to delete them: both
// my "compliant" and "generic" fixtures FAILED, because I do not know the gate's real contract and
// guessing fixtures until they pass is the over-fit trap this whole audit exists to prevent.
//
// The gate ships its own harness, `test_anti_generic_check.js`, 10/10 green — and nothing wired it
// into `npm test`, which is why the gate read as untested at all. Spawning the harness is real
// executable coverage and requires no guesswork about the contract. `test_motion_spec_check.js`
// already uses this launcher pattern.
test("anti_generic_check: its own harness is wired into npm test and passes", () => {
  const r = spawnSync('node', [
    path.join(REPO, '.agents/scripts/test_anti_generic_check.js'),
  ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.strictEqual(r.status, 0,
    `anti_generic_check.js's own harness must pass: ${(r.stdout || r.stderr).slice(0, 300)}`);
  assert.match(r.stdout, /passed/, 'the harness must report its own results');
});

test("motion_intent_check: its own harness is wired into npm test and passes", () => {
  // Same pattern, and this one is load-bearing: /launch run 9 broke this gate's exit contract and
  // `npm test` could not see it, because the harness was never in the suite. It now is.
  const r = spawnSync('node', [
    path.join(REPO, '.agents/scripts/test_motion_intent_check.js'),
  ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.strictEqual(r.status, 0,
    `motion_intent_check.js's own harness must pass: ${(r.stdout || r.stderr).slice(0, 300)}`);
});
