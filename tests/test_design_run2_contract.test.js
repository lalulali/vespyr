'use strict';
/**
 * test_design_run2_contract.test.js — defects found by the reverse-mode blind run of `/design`.
 *
 * WHY THIS FILE EXISTS
 * Run 2 (brownfield app + supplied prototype) halted and produced no PRD. It refused to write
 * `Track gate result: PASS` for a prototype that genuinely fails the construction standard, and
 * it refused to invent a rebuilt prototype the skill never asked for. Both refusals were
 * correct, and both were punished by the engine:
 *
 *   - `prototype_collab_gate.js` demanded a PASS claim it could not verify. Measured: the honest
 *     record was REJECTED, while a record whose Evidence paragraph still documented
 *     `exit 1 / "pass": false` PASSED as soon as it typed `PASS`. The gate could not tell a
 *     verified pass from a typed one, so it rewarded fabrication and punished honesty.
 *   - `step-01e`'s only honest path for a genuinely missing state was nested under "when the
 *     source is a non-interactive export" — unavailable to a hand-coded HTML prototype.
 *
 * It also found that the placeholder fix from run 1 was hollow: `sed 's/US-XXX/US-001/g'`
 * defeated it, because it checked one token out of thirty while the untouched PRD template
 * passed unchanged.
 *
 * Every test names the finding it locks down. Reverting the fix must fail it.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const flat = (s) => s.replace(/\s+/g, ' ');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

// --- the placeholder fix was hollow ------------------------------------------------------------

test('one substitution does not defeat the create-mode gate', () => {
  // `sed 's/US-XXX/US-001/g'` on the untouched story template produced "✓ template conformance",
  // exit 0, zero failures — while every other field was still [type of user], [goal], [state A].
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hollow-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output/03-strategy'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, '.agents/templates/product/prd-template.md'),
    path.join(dir, 'artifacts/output/03-strategy/requirements.md'));
  const sed = read('.agents/templates/product/user-story-template.md').replace(/US-XXX/g, 'US-001');
  fs.writeFileSync(path.join(dir, 'artifacts/output/03-strategy/user-stories.md'), sed);
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', [path.join(ROOT, '.agents/scripts/template_conformance.js'),
      'check', '--mode', 'create', '--root', dir, '--json'], { encoding: 'utf8' });
  } catch (e) { code = e.status; out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  assert.strictEqual(code, 1, 'a template with one token substituted must not pass');
  const j = JSON.parse(out);
  const lingering = (j.userStories.failures || []).filter((f) => /unfilled template placeholder/.test(f));
  assert.ok(lingering.length > 0, `expected placeholder detection: ${JSON.stringify(j.userStories.failures)}`);
  // It should find MANY, not one — the vocabulary comes from the template, not a hard-coded list.
  const m = lingering[0].match(/(\d+) unfilled template placeholder/);
  assert.ok(m && Number(m[1]) >= 20, `expected the whole template vocabulary, got: ${lingering[0]}`);
});

test('the placeholder vocabulary is derived from the template, so the two cannot drift', () => {
  const src = read('.agents/scripts/template_conformance.js');
  assert.match(src, /templatePlaceholders/, 'the vocabulary must be read, not hard-coded');
  assert.match(src, /TEMPLATE_DIR = path\.join\(__dirname, '\.\.', 'templates', 'product'\)/);
});

test('GitHub alert syntax is not mistaken for a placeholder', () => {
  const src = read('.agents/scripts/template_conformance.js');
  assert.match(src, /tok\.startsWith\('!'\)/, '> [!NOTE] and > [!IMPORTANT] are alerts, not blanks');
});

// --- the collaboration gate rewarded fabrication ------------------------------------------------

function collabVerify(recordText, scope = 'r1-evidence') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-'));
  const proto = path.join(dir, 'prototype.html');
  fs.writeFileSync(proto, '<!doctype html><html><body>x</body></html>');
  // A complete record, so each case isolates the rule under test instead of tripping the
  // structural checks. Fields the gate also enforces: the prototype path and its hash, the
  // Track validation section, and implementation mapping evidence.
  const sha = require('crypto').createHash('sha256').update(fs.readFileSync(proto)).digest('hex');
  const full = recordText
    .replace('`prototype.html`', `\`${proto}\``)
    + `- **Prototype SHA-256:** \`${sha}\`\n\n`
    + `## Track validation\n\n| Criterion | Verdict |\n|---|---|\n| Real content topology | described above |\n\n`
    + `## Reviewed surface\n\nEvery screen and flow in the imported prototype, walked.\n\n`
    + `## Decisions and open questions\n\n| ID | Question |\n|---|---|\n| PC-99 | fixture |\n\n`
    + `## Disposition\n\nFixture disposition.\n\n`
    + `## Reviewer sign-off\n\n| Reviewer | Disposition |\n|---|---|\n| @product-designer | \`SATISFIED\` |\n| @tech-lead | \`SATISFIED\` |\n\n`
    + `## Implementation mapping\n\nMapping evidence recorded per INV row.\n`;
  const rec = path.join(dir, 'record.md');
  fs.writeFileSync(rec, full);
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', [path.join(ROOT, '.agents/scripts/prototype_collab_gate.js'), 'verify',
      '--record', rec, '--track', 'static-html', '--prototype', proto, '--scope', scope, '--json'],
      { encoding: 'utf8' });
  } catch (e) { code = e.status; out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(out); } catch { /* non-JSON */ }
  return { code, problems: j.problems || [] };
}

const RECORD_HEAD = `# Prototype Collaboration

- **Track:** \`static-html\`
- **Runtime:** \`vanilla HTML/CSS/JS + Tailwind CDN\`
- **Prototype:** \`prototype.html\`
- **Date:** 2026-10-07
- **Review scope:** \`r1-evidence\`
`;

test('a typed PASS with no runnable evidence is rejected', () => {
  // THE EXPLOIT: this exact shape used to pass, while its own Evidence paragraph documented
  // `exit 1 / "pass": false / four problems`.
  const r = collabVerify(RECORD_HEAD + `- **Track gate result:** \`PASS\`
- **Track classification:** \`SATISFIED\`
- **R1 evidence disposition:** \`SATISFIED\`
- **Evidence:** the track gate reported exit 1 and "pass": false with four problems

| Reviewer | Disposition |
|---|---|
| @product-designer | \`SATISFIED\` |
| @tech-lead | \`SATISFIED\` |
`);
  assert.ok(
    r.problems.some((p) => /claims PASS but the record carries no runnable evidence/.test(p)),
    `a typed PASS must not be accepted as verified: ${JSON.stringify(r.problems)}`
  );
});

test('an honest documented FAIL is accepted in r1-evidence scope when authorized and named', () => {
  // The other half of the same finding: the honest record was rejected. A deficient imported
  // prototype is the NORMAL case for R1, and step-01e's escape hatch exists for it.
  const r = collabVerify(RECORD_HEAD + `- **Track gate result:** \`FAIL\`
- **Track classification:** \`CHANGES REQUESTED\`
- **R1 evidence disposition:** \`SATISFIED\`
- **Evidence:** exit 1, four accurate problems

| PC-ID | Finding |
|---|---|
| PC-01 | The static-html track gate FAILS on the imported prototype. Bounded evidence extraction is authorized to proceed under step-01e's escape hatch for the three missing critical states; the failure is recorded, not waived. |

| Reviewer | Disposition |
|---|---|
| @product-designer | \`SATISFIED\` |
| @tech-lead | \`SATISFIED\` |
`);
  assert.deepStrictEqual(r.problems, [],
    `the honest record must have a path: ${JSON.stringify(r.problems)}`);
});

test('a FAIL with no authorization language is still rejected', () => {
  const r = collabVerify(RECORD_HEAD + `- **Track gate result:** \`FAIL\`
- **Track classification:** \`CHANGES REQUESTED\`
- **R1 evidence disposition:** \`SATISFIED\`

| Reviewer | Disposition |
|---|---|
| @product-designer | \`SATISFIED\` |
| @tech-lead | \`SATISFIED\` |
`);
  assert.ok(r.problems.some((p) => /track gate result must be PASS/.test(p)),
    `silence is not a disposition: ${JSON.stringify(r.problems)}`);
});

test('a FAIL is never accepted for handoff scope', () => {
  // A broken prototype may still yield bounded evidence; it must never hand off.
  const r = collabVerify(RECORD_HEAD + `- **Track gate result:** \`FAIL\`
- **Track classification:** \`CHANGES REQUESTED\`
- **R1 evidence disposition:** \`SATISFIED\`
- **Accessibility disposition:** \`BLOCKED\`
- **Feasibility disposition:** \`BLOCKED\`
- **State:** \`BLOCKED\`
- **Evidence:** exit 1

Bounded evidence extraction is authorized to proceed under the escape hatch for the missing critical states.

| Reviewer | Disposition |
|---|---|
| @product-designer | \`SATISFIED\` |
| @tech-lead | \`SATISFIED\` |
`, 'handoff');
  assert.ok(r.problems.some((p) => /track gate result must be PASS/.test(p)),
    `handoff must not accept a FAIL: ${JSON.stringify(r.problems)}`);
});

test('classification and disposition are separate claims', () => {
  // `Track classification` describes the prototype's QUALITY; `R1 evidence disposition`
  // describes whether extraction is authorized. The gate demanded both be SATISFIED, so an
  // accurately-classified deficient prototype was unreachable.
  const src = read('.agents/scripts/prototype_collab_gate.js');
  assert.match(src, /classificationHonest/);
  assert.match(src, /those are different claims and the gate demanded both be satisfied/i);
  assert.match(src, /The disposition stays mandatory/i);
});

test('the PASS evidence check does not require same-line adjacency', () => {
  // The record template carries `Track gate command:` and `Evidence: <exit code>` as separate
  // fields. Requiring them on one line was a false positive on the shipped test fixture.
  const src = read('.agents/scripts/prototype_collab_gate.js');
  assert.match(src, /const hasCommand =/, 'command and exit code are separate fields');
  assert.match(src, /const hasZeroExit =/);
  assert.ok(
    !/shadcn_gate\\\.js\|track gate\)\[\^\\n\]\*\?/.test(src),
    'the adjacency requirement is back — it rejects correct records'
  );
});

// --- step-01e's conditions ----------------------------------------------------------------------

test('the genuinely-absent-state rule is not nested under the export condition', () => {
  const s = flat(read('.agents/skills/design/steps/step-01e-ingest-imported.md'));
  assert.match(s, /applies to every imported prototype, however it arrived/i,
    'a hand-coded HTML prototype that is deficient by construction could not use the only ' +
      'honest path, and a blind run had to record a deviation to proceed');
  assert.match(s, /Silence is not a disposition/i);
});

test('every inventory row carries an Intent value', () => {
  const inv = flat(read('.agents/templates/product/prototype-inventory-template.md'));
  assert.match(inv, /\| Intent \|/);
  assert.match(inv, /`unknown` is the honest default/i);
  assert.match(inv, /Never infer `deliberate` from polish/i,
    'freezing an accident into a spec is the most expensive mistake this inventory can make');
  assert.match(inv, /Requires/, 'deliberate and accident each require evidence, unknown does not');

  const step = flat(read('.agents/skills/design/steps/step-01e-ingest-imported.md'));
  assert.match(step, /Set the `Intent` column on every row/i,
    'the rule belongs in the step that writes the inventory, not only in the template');
});
