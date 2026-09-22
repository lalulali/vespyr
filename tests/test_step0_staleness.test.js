#!/usr/bin/env node
/**
 * tests/test_step0_staleness.test.js — 02n.1 Step-0 staleness gate.
 *
 * Code-level (A2): the hook is deterministic — exit 0 (fresh/absent),
 * exit 1 [BLOCK] on stale or expected-but-missing witness, and a loud halt
 * when the checker itself cannot run. Prompt-drift guard: step-00 and
 * SKILL.md must keep the hook + reverse-first routing wired.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HOOK = path.join(ROOT, '.agents', 'scripts', 'step0_staleness.js');
const PARITY = path.join(ROOT, '.agents', 'scripts', 'spec_parity.js');
const FIX = path.join(ROOT, 'evals', 'fixtures', 'prototypes', 'reverse-prd');
const REL = {
  report: 'evals/fixtures/prototypes/reverse-prd/dry-run/parity-report.md',
  inventory: 'evals/fixtures/prototypes/reverse-prd/dry-run/prototype-inventory.md',
  prototype: 'evals/fixtures/prototypes/reverse-prd/workspace-members.html',
};

function tmpTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'step0-stale-'));
  fs.cpSync(FIX, path.join(dir, 'evals', 'fixtures', 'prototypes', 'reverse-prd'), { recursive: true });
  return dir;
}

function runHook(root, extra = []) {
  return spawnSync(process.execPath, [HOOK, '--root', root, '--report', REL.report, ...extra], {
    encoding: 'utf8',
    env: { ...process.env, ...(extra.env || {}) },
  });
}

function stamp(root) {
  return spawnSync(process.execPath, [PARITY, 'witness', 'stamp', '--root', root, '--report', REL.report, '--now', '2026-09-22T00:00:00.000Z'], { encoding: 'utf8' });
}

test('step0 staleness: absent witness (reverse unused) proceeds', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'step0-empty-'));
  const res = runHook(root);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /absent/);
});

test('step0 staleness: fresh witness proceeds', () => {
  const root = tmpTree();
  assert.equal(stamp(root).status, 0);
  const res = runHook(root);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /fresh/);
});

test('step0 staleness: mutated prototype blocks (exit 1, [BLOCK]) — all modes run Step 0', () => {
  const root = tmpTree();
  assert.equal(stamp(root).status, 0);
  fs.appendFileSync(path.join(root, REL.prototype), '\n<!-- prototype drifted after freeze -->\n');
  const res = runHook(root);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /\[BLOCK\]/);
  assert.match(res.stderr, /Spike Rollback/);
});

test('step0 staleness: report without a witness field blocks (partial freeze)', () => {
  const root = tmpTree();
  const reportPath = path.join(root, REL.report);
  fs.writeFileSync(reportPath, fs.readFileSync(reportPath, 'utf8').replace(/^prototype_sha256:.*\n/m, ''));
  const res = runHook(root);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /\[BLOCK\]/);
});

test('step0 staleness: report absent means never frozen — proceed', () => {
  const root = tmpTree();
  fs.rmSync(path.join(root, REL.report));
  const res = runHook(root);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /absent/);
});

test('step0 staleness: unavailable checker halts loudly (bypass probe)', () => {
  const root = tmpTree();
  const res = spawnSync(process.execPath, [HOOK, '--root', root, '--report', REL.report], {
    encoding: 'utf8',
    env: { ...process.env, SPEC_PARITY_SCRIPT: path.join(root, 'does-not-exist.js') },
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /\[BLOCK\]/);
  assert.match(res.stderr, /missing/);
});

test('step0 staleness: step-00 and SKILL.md keep the hook + reverse-first routing wired', () => {
  const step0 = fs.readFileSync(path.join(ROOT, '.agents', 'skills', 'design', 'steps', 'step-00-scope-and-decision-anchoring.md'), 'utf8');
  assert.match(step0, /step0_staleness\.js/);
  assert.match(step0, /\[BLOCK/);
  assert.match(step0, /HALT/);
  assert.match(step0, /SPEC\.md Spec Kernel/);
  assert.match(step0, /reverse/);

  const skill = fs.readFileSync(path.join(ROOT, '.agents', 'skills', 'design', 'SKILL.md'), 'utf8');
  const reverseIdx = skill.indexOf('**Reverse (checked FIRST');
  const createIdx = skill.indexOf('**Create**');
  assert.ok(reverseIdx > -1, 'reverse routing line missing from SKILL.md');
  assert.ok(createIdx > -1 && reverseIdx < createIdx, 'reverse must be checked before create (A1)');
  assert.match(skill, /step-01d-ingest-prototype\.md/);
  assert.match(skill, /step-05d-sync-contract\.md/);
  assert.match(skill, /step0_staleness\.js/);
});

test('step0 staleness: rollback re-witness cycle reopens the gate (02n.6 probe)', () => {
  const root = tmpTree();
  assert.equal(stamp(root).status, 0);
  fs.appendFileSync(path.join(root, REL.prototype), '\n<!-- prototype v2 after falsified model -->\n');
  const blocked = runHook(root);
  assert.equal(blocked.status, 1, 'post-freeze edit must block at Step 0');
  assert.equal(stamp(root).status, 0, 'rollback path re-witnesses the new prototype');
  const open = runHook(root);
  assert.equal(open.status, 0, open.stderr);
  assert.match(open.stdout, /fresh/);
});

test('step0 staleness: step-05d is the Spike Rollback protocol, not a steady-state sync loop', () => {
  const step5 = fs.readFileSync(path.join(ROOT, '.agents', 'skills', 'design', 'steps', 'step-05d-sync-contract.md'), 'utf8');
  assert.match(step5, /Spike Rollback Protocol/);
  assert.match(step5, /Re-witness/);
  assert.match(step5, /\[DELTA-NN\]/);
  assert.doesNotMatch(step5, /Re-runnable sync/);
  const skill = fs.readFileSync(path.join(ROOT, '.agents', 'skills', 'design', 'SKILL.md'), 'utf8');
  assert.match(skill, /invoked only on QA falsification/);
});
