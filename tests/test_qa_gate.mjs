// T-GATE-1..9 — qa_check.js (03 F2.23/F2.26, spec 03e §11/§16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { checkQA, computeSignature } = require('../.agents/scripts/qa_check.js');

const TODAY = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-qagate-'));
}

function reportText(verdict = 'GO', date = TODAY()) {
  return `# QA Report\n\nDate: ${date}\n\nRelease recommendation: ${verdict}\n\nAll acceptance criteria passed.\n`;
}

function signoffText({ verdict = 'GO', date = TODAY(), mode = 'M1', signature = null, conditions = '', frontmatterVerdict = null } = {}) {
  const fv = frontmatterVerdict === null ? verdict : frontmatterVerdict;
  return [
    '---',
    'feature: "gate fixture"',
    `date: "${date}"`,
    `verdict: "${fv}"`,
    'qa_engineer: "@qa-engineer"',
    '---',
    '',
    `VERDICT: [${verdict}]`,
    `Release recommendation: ${verdict}`,
    `Date: ${date}`,
    mode === null ? '' : `Mode: ${mode}`,
    signature === null ? '' : `Signature: ${signature}`,
    '',
    '## Evidence',
    '',
    'All criteria covered by tests.',
    '',
    '## Conditions',
    conditions,
    '',
    '## Open findings carried forward',
    '',
    '## Sign-off',
    '',
    '| Reviewer | Disposition | Date |',
    '|---|---|---|',
    `| @qa-engineer | SATISFIED | ${date} |`,
    '',
  ].join('\n');
}

/** Build a valid pair by default; each test mutates one variable. */
function fixture(opts = {}) {
  const root = makeRoot();
  const dir = path.join(root, 'artifacts', 'output', '05-execution', 'quality');
  fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'qa-report.md');
  const signoffPath = path.join(dir, 'qa-signoff.md');
  fs.writeFileSync(reportPath, reportText(opts.reportVerdict || 'GO', opts.reportDate || TODAY()));
  const signature = opts.signature === undefined ? computeSignature(reportPath) : opts.signature;
  fs.writeFileSync(signoffPath, signoffText({ ...opts, signature }));
  return { root, reportPath, signoffPath, run: () => checkQA({ root }) };
}

function messages(text) {
  return text.join(' ');
}

test('T-GATE-1 — missing report or sign-off fails and names both paths', () => {
  const { root } = fixture();
  const r = checkQA({ root, report: 'artifacts/output/05-execution/quality/absent-report.md' });
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /qa-report\.md is absent/);
});

test('T-GATE-2 — unparseable recommendation fails closed', () => {
  const { root, signoffPath } = fixture();
  fs.writeFileSync(signoffPath, signoffText({ verdict: 'MAYBE' }));
  const r = checkQA({ root });
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /unparseable/);
});

test('T-GATE-2b — contradictory verdict fields fail closed', () => {
  const { root, signoffPath } = fixture();
  fs.writeFileSync(signoffPath, signoffText({ frontmatterVerdict: 'CONDITIONAL' }));
  const r = checkQA({ root });
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /inconsistent verdicts/);
});

test('T-GATE-3 — sign-off verdict must match qa-report.md verdict', () => {
  const f = fixture({ reportVerdict: 'NO-GO' });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /qa-report\.md says \[NO-GO\]/);
});

test('T-GATE-4 — signature mismatch when report changes after signing', () => {
  const f = fixture();
  fs.appendFileSync(f.reportPath, '\nlate edit\n');
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /Signature does not match/);
});

test('T-GATE-5 — stale sign-off date fails', () => {
  const f = fixture({ date: yesterday() });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /stale sign-off/);
});

test('T-GATE-6 — missing Mode fails (solo-mode sign-offs are invalid)', () => {
  const f = fixture({ mode: null });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /Mode is missing/);
});

test('T-GATE-6b — non-canonical Mode fails', () => {
  const f = fixture({ mode: 'SOLO' });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /must be exactly M1, M2 or M3/);
});

test('T-GATE-7 — NO-GO is a verdict, not a completion', () => {
  const f = fixture({ verdict: 'NO-GO', reportVerdict: 'NO-GO' });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /\[NO-GO\]/);
});

test('T-GATE-8 — forged signature fails', () => {
  const f = fixture({ signature: 'f'.repeat(64) });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /Signature does not match/);
});

test('T-GATE-9 — unsubstituted CONDITIONAL placeholders fail', () => {
  const f = fixture({
    verdict: 'CONDITIONAL',
    reportVerdict: 'CONDITIONAL',
    conditions: '| C1 | {what must be true} | @{owner} | YYYY-MM-DD | yes |',
  });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /unsubstituted template placeholders/);
});

test('T-GATE-9b — GO with named conditions fails via the shared parser', () => {
  const f = fixture({
    conditions: '| C1 | PDF export fails above 500 rows | @developer | 2026-12-01 | yes |',
  });
  const r = f.run();
  assert.equal(r.ok, false);
  assert.match(messages(r.failures), /condition/);
});

test('T-GATE happy path — valid GO sign-off passes', () => {
  const f = fixture();
  const r = f.run();
  assert.equal(r.ok, true, messages(r.failures));
  assert.equal(r.recommendation, 'GO');
});
