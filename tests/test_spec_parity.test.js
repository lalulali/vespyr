#!/usr/bin/env node
/**
 * tests/test_spec_parity.test.js — 02n.5 named tests for the parity checker.
 *
 * Structural discipline (08-23 rule): script + named test; the script is
 * exercised against a generated result tree — green on the minimal fixture,
 * red on seeded violations (ghost / orphan / stale witness).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createFixtureTree } = require('./helpers/reverse_prd_test_fixture');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents', 'scripts', 'spec_parity.js');
const REL = {
  inventory: 'artifacts/evals/reverse-prd/a8/reverse/prototype-inventory.md',
  requirements: 'artifacts/evals/reverse-prd/a8/reverse/requirements.md',
  report: 'artifacts/evals/reverse-prd/a8/reverse/parity-report.md',
  prototype: 'evals/fixtures/prototypes/reverse-prd/workspace-members.html',
};

function tmpTree() {
  return createFixtureTree().root;
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function checkArgs(root, extra = []) {
  return ['check', '--root', root, '--inventory', REL.inventory, '--requirements', REL.requirements, '--report', REL.report, '--json', ...extra];
}

function edit(root, rel, fn) {
  const p = path.join(root, rel);
  fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8')));
}

test('spec_parity: generated result fixture passes ghosts 0 / orphans 0 / grounding 100% / classes 10/10', () => {
  const res = run(checkArgs(tmpTree()));
  assert.equal(res.status, 0, res.stderr + res.stdout);
  const out = JSON.parse(res.stdout);
  assert.equal(out.pass, true);
  assert.deepEqual(out.ghosts, []);
  assert.deepEqual(out.orphans, []);
  assert.equal(out.classes, 10);
  assert.equal(out.open, 1, 'the [OPEN] row must be counted but exempt from the ghost gate');
  assert.equal(out.grounding, 1);
});

test('spec_parity: seeded ghost statement turns the gate red', () => {
  const root = tmpTree();
  edit(root, REL.requirements, (s) => s.replace('#state-error', '#state-missing'));
  const res = run(checkArgs(root));
  assert.equal(res.status, 1);
  const out = JSON.parse(res.stdout);
  assert.deepEqual(out.ghosts, ['L-02']);
  assert.ok(out.violations.some((v) => /ghost statement/.test(v)));
});

test('spec_parity: seeded orphan behavior is red without a deferral and green with one', () => {
  const root = tmpTree();
  edit(root, REL.inventory, (s) =>
    s.replace(
      '| INV-49 |',
      `| INV-50 | behavior | Unseeded anchor | \`${REL.prototype}#invite-cancel\` | not ledger-referenced (test seed) |\n| INV-49 |`
    )
  );
  const red = run(checkArgs(root));
  assert.equal(red.status, 1);
  assert.deepEqual(JSON.parse(red.stdout).unresolvedOrphans, ['INV-50']);

  edit(root, REL.report, (s) =>
    s.replace(
      '| — | — | — | — |',
      `| \`${REL.prototype}#invite-cancel\` | @product-manager | 2026-09-22 | test deferral |\n| — | — | — | — |`
    )
  );
  const green = run(checkArgs(root));
  assert.equal(green.status, 0, green.stderr + green.stdout);
  assert.deepEqual(JSON.parse(green.stdout).unresolvedOrphans, []);
});

test('spec_parity: a stale prototype baseline hash blocks after the freeze', () => {
  const root = tmpTree();
  const stamped = run(['baseline', 'stamp', '--root', root, '--report', REL.report, '--now', '2026-09-22T00:00:00.000Z']);
  assert.equal(stamped.status, 0, stamped.stderr);
  const fresh = run(['baseline', 'check', '--root', root, '--report', REL.report, '--json']);
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
  assert.equal(JSON.parse(fresh.stdout).baseline, 'fresh');

  fs.appendFileSync(path.join(root, REL.prototype), '\n<!-- prototype drifted after freeze -->\n');
  const stale = run(['baseline', 'check', '--root', root, '--report', REL.report, '--json']);
  assert.equal(stale.status, 1);
  const out = JSON.parse(stale.stdout);
  assert.equal(out.baseline, 'stale');
  assert.notEqual(out.expected, out.actual);
});

test('spec_parity: missing baseline-hash field on a frozen report is red; absent report is green (never frozen)', () => {
  const root = tmpTree();
  const reportPath = path.join(root, REL.report);
  fs.writeFileSync(reportPath, fs.readFileSync(reportPath, 'utf8').replace(/^prototype_sha256:.*\n/m, ''));
  const missing = run(['baseline', 'check', '--root', root, '--report', REL.report, '--json']);
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).baseline, 'missing');

  const root2 = tmpTree();
  fs.rmSync(path.join(root2, REL.report));
  const absent = run(['baseline', 'check', '--root', root2, '--report', REL.report, '--json']);
  assert.equal(absent.status, 0);
  assert.equal(JSON.parse(absent.stdout).baseline, 'absent');
});

test('spec_parity: a missing detail class is a red; N/A-with-reason is accepted', () => {
  const root = tmpTree();
  edit(root, REL.report, (s) => s.replace('| Telemetry | L-01 | covered |\n', ''));
  const red = run(checkArgs(root));
  assert.equal(red.status, 1);
  assert.ok(JSON.parse(red.stdout).violations.some((v) => /Telemetry: missing from the class table/.test(v)));

  const root2 = tmpTree();
  edit(root2, REL.report, (s) => s.replace('| Telemetry | L-01 | covered |', '| Telemetry | — | N/A: no telemetry surface in this fixture |'));
  const green = run(checkArgs(root2));
  assert.equal(green.status, 0, green.stderr + green.stdout);
});

test('spec_parity: anchor grammar resolution is frozen (A11)', () => {
  const { resolveAnchor } = require(path.join(ROOT, '.agents', 'scripts', 'spec_parity.js'));
  const root = tmpTree();
  assert.equal(resolveAnchor(root, `${REL.prototype}#state-empty`).ok, true);
  assert.equal(resolveAnchor(root, `${REL.prototype}#does-not-exist`).ok, false);
  assert.equal(resolveAnchor(root, 'no-hash-anchor').ok, false);
  assert.equal(resolveAnchor(root, '/absolute/path#id').ok, false);
  assert.equal(resolveAnchor(root, `${REL.inventory}#INV-01`).ok, true, 'non-file prototypes anchor to inventory rows');
});
