#!/usr/bin/env node
/**
 * tests/test_req_to_impl_fidelity_refs.test.js — defect D2 (fixed 2026-09-23).
 *
 * `--fidelity` must RESOLVE evidence refs, not count non-empty strings:
 * a dead ref fails the gate, and an implemented class with no resolvable ref
 * fails too — so "implemented with evidence" is structural-true, not a claim.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents', 'scripts', 'req_to_impl_check.js');
const FIX = path.join(ROOT, 'evals', 'fixtures', 'dev-tasks', 'spec-coverage');
const REPORT = 'evals/fixtures/dev-tasks/spec-coverage/coverage-report.md';

function tmpTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fidelity-refs-'));
  fs.cpSync(FIX, path.join(dir, 'evals', 'fixtures', 'dev-tasks', 'spec-coverage'), { recursive: true });
  return dir;
}

function run(root) {
  return spawnSync(process.execPath, [SCRIPT, '--fidelity', '--root', root, '--report', REPORT, '--json'], { encoding: 'utf8' });
}

test('D2: fixture fidelity green — implemented rows carry resolvable refs', () => {
  const res = run(ROOT);
  assert.equal(res.status, 0, res.stderr + res.stdout);
  const out = JSON.parse(res.stdout);
  assert.equal(out.pass, true);
  assert.equal(out.implemented, 3);
  assert.ok(out.refsResolved >= 3, `expected >=3 resolved refs, got ${out.refsResolved}`);
});

test('D2: a dead evidence ref fails the gate (the roundtable probe, now red)', () => {
  const root = tmpTree();
  const report = path.join(root, REPORT);
  const content = fs.readFileSync(report, 'utf8').replace(
    '`evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js#capacity`',
    '`nonsense-path#nonexistent`'
  );
  fs.writeFileSync(report, content);
  const res = run(root);
  assert.equal(res.status, 1, res.stdout);
  const out = JSON.parse(res.stdout);
  assert.ok(out.problems.some((p) => /does not resolve/.test(p)), JSON.stringify(out.problems));
});

test('D2: implemented without any resolvable ref fails the gate', () => {
  const root = tmpTree();
  const report = path.join(root, REPORT);
  const content = fs.readFileSync(report, 'utf8').replace(
    '| Performance notes | implemented | O(1) token-bucket checks — `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js#allowRequest` |',
    '| Performance notes | implemented | prose with no ref at all |'
  );
  fs.writeFileSync(report, content);
  const res = run(root);
  assert.equal(res.status, 1, res.stdout);
  const out = JSON.parse(res.stdout);
  assert.ok(out.problems.some((p) => /without a resolvable evidence ref/.test(p)), JSON.stringify(out.problems));
});
