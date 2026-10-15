/**
 * tests/test_critique_session_gate.test.js — the gate a skill documented and nobody had built.
 *
 * `/elicitation` carried a "Done when — checked mechanically" section naming
 * `critique_session_check.js`. The script did not exist: `grep -c` returned 0 in the repo, the
 * install copies were 27 and 22 lines ahead documenting it, and `git log --all` showed it had never
 * been committed. A documented gate with no implementation is worse than no gate — a reader trusts a
 * check that was never run.
 *
 * The centrepiece is elicitation's Sharpening Ledger, in the skill's own words:
 *   "A bare `discarded` is not allowed."
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/critique_session_check.js');

function check(kind, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'critique-'));
  const f = path.join(dir, 'session.md');
  fs.writeFileSync(f, body);
  const r = spawnSync('node', [GATE, 'check', '--kind', kind, '--file', f, '--json'], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

const GOOD_EL = `# Elicitation Session — the PRD's risk section

[ELICITATION: Pre-mortem -> applied]
[ELICITATION: Devil's advocate -> discarded — user-rejected]
[ELICITATION-SKIPPED: Steelman — time-boxed]

## Sharpening Ledger
1. "review the PRD" → critique the risk section of the checkout PRD for unstated failure modes
2. Pre-mortem → applied; Devil's advocate → discarded — user-rejected
3. Added a rollback trigger and a named owner to the top risk
4. Critique coverage: 4/4 points
5. Residual open questions: none
`;

// --- elicitation: the Sharpening Ledger and the closed vocabularies ---------------------------

test('a conformant elicitation session passes', () => {
  const r = check('elicitation', GOOD_EL);
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures, null, 2));
});

test('a ledger with the wrong number of lines fails — the skill requires exactly five', () => {
  const r = check('elicitation', GOOD_EL.replace('5. Residual open questions: none\n', ''));
  assert.ok(has(r, /has 4 line\(s\); the skill requires exactly five/), JSON.stringify(r.json.failures));
});

test('no coverage count fails', () => {
  const r = check('elicitation', GOOD_EL.replace('4. Critique coverage: 4/4 points', '4. Coverage: see above'));
  assert.ok(has(r, /No `\{covered\}\/\{total\} points` count/), JSON.stringify(r.json.failures));
});

test('a bare `discarded` fails — the skill is explicit about this', () => {
  const r = check('elicitation', GOOD_EL.replace(
    "[ELICITATION: Devil's advocate -> discarded — user-rejected]", "[ELICITATION: Devil's advocate -> discarded]"));
  assert.ok(has(r, /discarded.*no reason and no payload/), JSON.stringify(r.json.failures));
});

test('a discard carrying only a reason word is not a payload', () => {
  const r = check('elicitation', GOOD_EL.replace(
    "[ELICITATION: Devil's advocate -> discarded — user-rejected]", "[ELICITATION: Devil's advocate -> discarded — because]"));
  assert.ok(has(r, /no reason and no payload/), JSON.stringify(r.json.failures));
});

test('a discard can carry a quoted boundary instead of a reason', () => {
  const r = check('elicitation', GOOD_EL.replace(
    "[ELICITATION: Devil's advocate -> discarded — user-rejected]",
    "[ELICITATION: Devil's advocate -> discarded — out-of-scope — \"the pricing section\"]"));
  assert.ok(!has(r, /no reason and no payload/), JSON.stringify(r.json.failures));
});

test('an unparseable outcome marker fails', () => {
  const r = check('elicitation', GOOD_EL.replace('[ELICITATION: Pre-mortem -> applied]', '[ELICITATION: Pre-mortem -> went well]'));
  assert.ok(has(r, /Cannot parse the outcome marker/), JSON.stringify(r.json.failures));
});

test('a skip outside the closed taxonomy fails — parity with brainstorming SPC skips', () => {
  const r = check('elicitation', GOOD_EL.replace('[ELICITATION-SKIPPED: Steelman — time-boxed]', '[ELICITATION-SKIPPED: Steelman — because I said so]'));
  assert.ok(has(r, /names no reason from the closed taxonomy/), JSON.stringify(r.json.failures));
});

test('no outcome markers at all fails', () => {
  const r = check('elicitation', GOOD_EL.replace(/\[ELICITATION:[^\]]*\]\n/g, ''));
  assert.ok(has(r, /No `\[ELICITATION: …\]` outcome marker/), JSON.stringify(r.json.failures));
});

// --- contract ---------------------------------------------------------------------------------

test('a missing file and an empty file both fail closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'critique-missing-'));
  const missing = spawnSync('node', [GATE, 'check', '--kind', 'elicitation', '--file', path.join(dir, 'nope.md'), '--json'], { encoding: 'utf8' });
  assert.strictEqual(missing.status, 2);
  const empty = path.join(dir, 'empty.md');
  fs.writeFileSync(empty, '  \n');
  const r = spawnSync('node', [GATE, 'check', '--kind', 'elicitation', '--file', empty, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('grill-me is no longer a kind — the branch was deleted, not left as dead weight', () => {
  // Owner ruling 2026-10-15: grill-me is a thinking tool that writes nothing, and nothing in the
  // repo consumed a grill-me record. The branch was removed because an implementation with no
  // producer is the same defect as a documented gate with no implementation. If someone re-adds it,
  // they should do so deliberately and delete this test in the same commit.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'critique-nogrill-'));
  const f = path.join(dir, 's.md');
  fs.writeFileSync(f, '# Grill-Me Decisions\n');
  const r = spawnSync('node', [GATE, 'check', '--kind', 'grill-me', '--file', f, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2, 'grill-me must fail closed as an unknown kind');
  assert.match(r.stderr + r.stdout, /expected elicitation/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('an unknown --kind fails closed rather than passing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'critique-kind-'));
  const f = path.join(dir, 's.md');
  fs.writeFileSync(f, 'x');
  const r = spawnSync('node', [GATE, 'check', '--kind', 'nonsense', '--file', f, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});
