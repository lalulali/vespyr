'use strict';
/**
 * test_spec_parity_honesty.test.js — the reverse-mode parity gate, and the three ways it lied.
 *
 * WHY THIS FILE EXISTS
 * A blind run reached `/design` step 4d and got `pass: true`. It also named the pass hollow
 * itself, and it was right on all three counts. The gate was green because:
 *
 *   1. **It had read nothing.** `inventory: 0`, so `orphans: []` was vacuous and 28 deferrals
 *      were credited against a document it never opened. A gate that reports success because its
 *      input was empty converts an unread file into a green checkmark.
 *   2. **It read a fraction of a real section and said nothing.** A §14 Evidence Ledger split
 *      across three sub-headed tables read 28 of 41 rows, dropped 13, exited 0. A later artifact
 *      put a small pointer map under the inventory heading, then prose, then the real table — and
 *      the extractor stopped at the prose, reading 0.
 *   3. **It failed honest deferrals.** Reconciliation compared raw anchor strings, so a deferral
 *      written exactly as the template asks
 *      (`artifacts/input/prototype/prototype.html#Tasks</h1>` (INV-01)) never matched an inventory
 *      row carrying `prototype.html#Tasks</h1>`. 28 orphans reported against 28 present deferrals.
 *
 * Together those are the shape this audit has been finding all along: correct behaviour, output
 * that misreports it. A run that trusts a green checkmark is trusting the least reliable part.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/spec_parity.js');

const PRD = fs.readFileSync(path.join(ROOT, '.agents/templates/product/prd-template.md'), 'utf8');

function inventory(rows) {
  return `# Prototype Inventory

## Anchor grammar

Rows below carry a layer-2 pointer into the prototype.

| Row | Layer-2 pointer |
|---|---|
${rows.map((r) => `| ${r} | \`prototype.html#x\` |`).join('\n')}

Prose between the pointer map and the real table. A parser that stops here reads nothing.

## Rows

| ID | Kind | Name | Anchor | Intent | Observable fact |
|---|---|---|---|---|---|
| INV-01 | screen | Tasks | \`prototype.html#tasks\` | unknown | three cards |
| INV-02 | behavior | Nav | \`prototype.html#nav\` | unknown | three links |
`;
}

function requirements(ledgerRows) {
  return PRD + `\n## 14. Evidence Ledger\n\n| ID | Statement | Anchor | Type | Status | Covers |\n|---|---|---|---|---|---|\n${ledgerRows}\n`;
}

function run(files, args = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-'));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body, 'utf8');
  }
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', [SCRIPT, 'check', '--root', dir, '--json', ...args], { encoding: 'utf8' });
  } catch (e) { code = e.status; out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(out); } catch { /* non-JSON */ }
  return { code, json: j, violations: j.violations || [] };
}

// --- 1. a hollow pass is a failure -------------------------------------------------------------

test('an inventory that exists but parses to nothing is a FAILURE, not a pass', () => {
  // The measured state: pass:true, inventory:0, orphans:[], deferrals:28. Note the gate already
  // exits 2 on a MISSING file — that is correct, and this test is about the subtler case where
  // the file is there and the parser finds no rows in it.
  const unreadable = '# Inventory\n\n| ID | Kind | Name |\n|---|---|---|\n| INV-01 | screen | Tasks |\n';
  const r = run({
    'artifacts/output/03-strategy/prototype-inventory.md': unreadable,
    'artifacts/output/03-strategy/requirements.md': requirements('| L-01 | a thing | `p.html#x` | prototype | confirmed | — |'),
  });
  assert.ok(
    r.violations.some((v) => /inventory rows: 0/.test(v)),
    `zero inventory must be a violation: ${JSON.stringify(r.violations)}`
  );
  assert.ok(
    r.violations.some((v) => /vacuous/.test(v)),
    'the message must say why — vacuous, not merely zero'
  );
});

test('an empty ledger is a failure too', () => {
  // A requirements document whose §14 has no L-NN rows: the ledger parses to zero.
  const r = run({
    'artifacts/output/03-strategy/prototype-inventory.md': inventory(['INV-01']),
    'artifacts/output/03-strategy/requirements.md': '# Requirements\n\n## 14. Evidence Ledger\n\nnothing here yet\n',
  });
  assert.ok(r.violations.some((v) => /ledger rows: 0/.test(v)), JSON.stringify(r.violations));
});

// --- 2. a whole section is read, and truncation is visible -------------------------------------

test('a section containing a pointer map, prose, then the real table is read in full', () => {
  const r = run({
    'artifacts/output/03-strategy/prototype-inventory.md': inventory(['INV-01', 'INV-02']),
    'artifacts/output/03-strategy/requirements.md': requirements(
      '| L-01 | Tasks screen | `prototype-inventory.md#INV-01` | prototype | confirmed | — |'
    ),
  });
  assert.ok(r.json.inventory >= 2,
    `the real table after prose must be read; inventory=${r.json.inventory} — the extractor stopped at the prose`);
});

test('a ledger split across several sub-headed tables is not silently truncated', () => {
  const many = Array.from({ length: 41 }, (_, i) =>
    `| L-${String(i + 1).padStart(2, '0')} | row ${i + 1} | \`prototype-inventory.md#INV-01\` | prototype | confirmed | — |`).join('\n');
  const split = many.split('\n');
  const body = PRD.replace(/## 14\.[\s\S]*$/, '')
    + '## 14. Evidence Ledger\n\n### Part one\n\n| ID | Statement | Anchor | Type | Status | Covers |\n|---|---|---|---|---|---|\n'
    + split.slice(0, 28).join('\n')
    + '\n\n### Part two\n\n| ID | Statement | Anchor | Type | Status | Covers |\n|---|---|---|---|---|---|\n'
    + split.slice(28).join('\n') + '\n';
  const r = run({
    'artifacts/output/03-strategy/prototype-inventory.md': inventory(['INV-01']),
    'artifacts/output/03-strategy/requirements.md': body,
  });
  assert.strictEqual(r.json.ledger, 41,
    `a split ledger read ${r.json.ledger} of 41 rows and reported no problem — that is silent truncation`);
});

// --- 3. honest deferrals reconcile ---------------------------------------------------------------

test('a deferral written as the template asks actually defers', () => {
  // Inventory anchors are relative; the template's deferral form is a full path plus a trailing
  // `(INV-01)` annotation. Raw string comparison never matched, so 28 orphans were reported
  // against 28 present deferrals — the gate failing a correct document.
  const report = `# Parity Report

## Orphan deferrals

| Orphan | Owner | Date | Why |
|---|---|---|---|
| \`artifacts/input/prototype/prototype.html#tasks\` (INV-01) | @architect | 2026-10-08 | import has no machine-readable id |
| \`artifacts/input/prototype/prototype.html#nav\` (INV-02) | @architect | 2026-10-08 | as above |

## Detail class coverage

| Class | Rows |
|---|---|
| Screen states | INV-01 |
| Edge cases | INV-02 |
| Data fields | INV-01 |
| Permissions | INV-02 |
| Navigation | INV-01 |
| Copy | INV-02 |
| Telemetry | INV-01 |
| Performance | INV-02 |
| Accessibility | INV-01 |
| Degraded capability | INV-02 |
`;
  const r = run({
    'artifacts/output/03-strategy/prototype-inventory.md': inventory(['INV-01', 'INV-02']),
    'artifacts/output/03-strategy/requirements.md': requirements('| L-01 | x | `prototype-inventory.md#INV-01` | prototype | confirmed | — |'),
    'artifacts/output/03-strategy/parity-report.md': report,
  });
  assert.deepStrictEqual(r.json.unresolvedOrphans, [],
    `a deferral with owner and date must reconcile: ${JSON.stringify(r.json.unresolvedOrphans)}`);
  assert.strictEqual(r.json.orphansDeferred, r.json.orphans.length,
    'every orphan here is deferred, so the deferred count must equal the orphan count');
});

test('the summary prints deferred and unresolved orphans together', () => {
  // `orphans: 28` beside `pass: true`, with nothing saying how many were deferred, is
  // indistinguishable from 28 unresolved problems — and the reader has no other number.
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.match(src, /orphansDeferred/);
  assert.match(src, /orphansDeferred: m\.orphans\.length - unresolvedOrphans\.length/,
    'the deferred count must be the difference, not a second independent number');
});
