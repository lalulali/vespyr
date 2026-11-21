// T-SAT-1..5 — validate_satisfaction.js (03 F2.28, spec 03e §15/§16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validate, SCHEMA } = require('../.agents/scripts/validate_satisfaction.js');

const AGENTS = ['developer', 'qa-engineer', 'product-manager', 'architect', 'founder'];
const EVIDENCE = 'artifacts/output/05-execution/quality/qa-report.md';

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-satisfaction-'));
  const agentsDir = path.join(root, '.agents', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  for (const name of AGENTS) fs.writeFileSync(path.join(agentsDir, `${name}.md`), `# ${name}\n`);
  return root;
}

function addEvidence(root, rel = EVIDENCE) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, 'evidence content\n');
  return rel;
}

function row(name, overrides = {}) {
  return {
    name,
    scope: 'active',
    state: 'SATISFIED',
    evidence_refs: overrides.state === 'NOT ACTIVATED' ? [] : [EVIDENCE],
    feedback_resolved: [],
    residual_risks: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function baseRecord() {
  return {
    schema: SCHEMA,
    release: 'gate-fixture',
    updated_at: new Date().toISOString(),
    agents: [
      row('developer'),
      row('qa-engineer'),
      row('product-manager'),
      row('architect', { scope: 'inactive', state: 'NOT ACTIVATED', reason: 'no architecture changes' }),
      row('founder'),
    ],
    gate: 'GO',
    revalidation_required: false,
  };
}

function signWitness(root, rel = EVIDENCE) {
  const full = path.join(root, rel);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(full, 'utf8')).digest('hex');
  const stateDir = path.join(root, '.agents', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'witness.json'), JSON.stringify({
    [rel]: { sha256, mtime: fs.statSync(full).mtimeMs, signedAt: new Date().toISOString() },
  }));
}

const messages = (r) => r.failures.join(' ');

test('T-SAT happy path — complete, evidenced matrix with no witness registry is valid', () => {
  const root = makeRoot();
  addEvidence(root);
  const r = validate(baseRecord(), { root });
  assert.equal(r.valid, true, messages(r));
  assert.equal(r.active_count, 4);
  assert.equal(r.satisfied_count, 4);
  assert.equal(r.inactive_count, 1);
  assert.equal(r.witness, 'unavailable');
  assert.ok(r.warnings.some((w) => /witness/i.test(w)));
});

test('T-SAT-1 — incomplete matrix (missing agent row) fails and names the agent', () => {
  const root = makeRoot();
  addEvidence(root);
  const record = baseRecord();
  record.agents = record.agents.filter((a) => a.name !== 'qa-engineer');
  const r = validate(record, { root });
  assert.equal(r.valid, false);
  assert.match(messages(r), /qa-engineer.*no row/);
});

test('T-SAT-2 — CHANGES REQUESTED / BLOCKED / revalidation_required fail the release gate', () => {
  const root = makeRoot();
  addEvidence(root);
  const blocked = baseRecord();
  blocked.agents.find((a) => a.name === 'product-manager').state = 'BLOCKED';
  assert.equal(validate(blocked, { root }).valid, false);

  const requested = baseRecord();
  requested.agents.find((a) => a.name === 'developer').state = 'CHANGES REQUESTED';
  assert.equal(validate(requested, { root }).valid, false);

  const revalidate = baseRecord();
  revalidate.revalidation_required = true;
  assert.equal(validate(revalidate, { root }).valid, false);
});

test('T-SAT-3 — SATISFIED with no evidence, or absent evidence under strict, fails', () => {
  const root = makeRoot();
  addEvidence(root);
  const noRefs = baseRecord();
  noRefs.agents.find((a) => a.name === 'developer').evidence_refs = [];
  assert.match(messages(validate(noRefs, { root })), /no evidence reference/);

  const missing = baseRecord();
  missing.agents.find((a) => a.name === 'developer').evidence_refs = ['artifacts/output/does-not-exist.md'];
  const r = validate(missing, { root, strict: true });
  assert.equal(r.valid, false);
  assert.match(messages(r), /does not exist/);
});

test('T-SAT-4 — NOT ACTIVATED with active scope or no reason fails', () => {
  const root = makeRoot();
  addEvidence(root);
  const wrongScope = baseRecord();
  Object.assign(wrongScope.agents.find((a) => a.name === 'architect'), {
    scope: 'active', state: 'NOT ACTIVATED',
  });
  assert.match(messages(validate(wrongScope, { root })), /scope:active/);

  const noReason = baseRecord();
  noReason.agents.find((a) => a.name === 'architect').reason = '';
  assert.match(messages(validate(noReason, { root })), /no reason/);
});

test('T-SAT-5 — witness fingerprint change fails and sets revalidation_required', () => {
  const root = makeRoot();
  addEvidence(root);
  signWitness(root);
  fs.appendFileSync(path.join(root, EVIDENCE), '\ntampered\n');
  const r = validate(baseRecord(), { root, strict: true });
  assert.equal(r.valid, false);
  assert.match(messages(r), /changed after signing/);
  assert.equal(r.revalidation_required, true);
});

test('T-SAT-5b — strict with unsigned evidence fails; signed evidence passes', () => {
  const root = makeRoot();
  addEvidence(root);
  // A registry exists but has no entry for this ref — that is an unsigned
  // evidence item under strict, distinct from "no registry at all" (warning).
  const stateDir = path.join(root, '.agents', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'witness.json'), '{}');
  const unsigned = validate(baseRecord(), { root, strict: true });
  assert.equal(unsigned.valid, false);
  assert.match(messages(unsigned), /no witness signature/);

  signWitness(root);
  const signed = validate(baseRecord(), { root, strict: true });
  assert.equal(signed.valid, true, messages(signed));
  assert.equal(signed.witness, 'verified');
});
