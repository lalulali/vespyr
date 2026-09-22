#!/usr/bin/env node
/**
 * tests/test_spec_parity.test.js — 02n.5 named tests for the parity checker.
 *
 * Structural discipline (08-23 rule): script + named test; the script is
 * exercised against real files in a copied tree — green on the dry-run
 * fixture, red on seeded violations (ghost / orphan / stale witness).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents', 'scripts', 'spec_parity.js');
const FIX = path.join(ROOT, 'evals', 'fixtures', 'prototypes', 'reverse-prd');
const REL = {
  inventory: 'evals/fixtures/prototypes/reverse-prd/dry-run/prototype-inventory.md',
  requirements: 'evals/fixtures/prototypes/reverse-prd/dry-run/requirements.md',
  report: 'evals/fixtures/prototypes/reverse-prd/dry-run/parity-report.md',
  prototype: 'evals/fixtures/prototypes/reverse-prd/workspace-members.html',
};

function tmpTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-parity-'));
  fs.cpSync(FIX, path.join(dir, 'evals', 'fixtures', 'prototypes', 'reverse-prd'), { recursive: true });
  return dir;
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

test('spec_parity: dry-run fixture passes ghosts 0 / orphans 0 / grounding 100% / classes 10/10', () => {
  const res = run(checkArgs(ROOT));
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
  edit(root, REL.requirements, (s) => s.replace('#state-empty', '#state-missing'));
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

test('spec_parity: stale prototype witness blocks after the freeze', () => {
  const root = tmpTree();
  const stamped = run(['witness', 'stamp', '--root', root, '--report', REL.report, '--now', '2026-09-22T00:00:00.000Z']);
  assert.equal(stamped.status, 0, stamped.stderr);
  const fresh = run(['witness', 'check', '--root', root, '--report', REL.report, '--json']);
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
  assert.equal(JSON.parse(fresh.stdout).witness, 'fresh');

  fs.appendFileSync(path.join(root, REL.prototype), '\n<!-- prototype drifted after freeze -->\n');
  const stale = run(['witness', 'check', '--root', root, '--report', REL.report, '--json']);
  assert.equal(stale.status, 1);
  const out = JSON.parse(stale.stdout);
  assert.equal(out.witness, 'stale');
  assert.notEqual(out.expected, out.actual);
});

test('spec_parity: witness field missing on a frozen report is red; absent report is green (never frozen)', () => {
  const root = tmpTree();
  const reportPath = path.join(root, REL.report);
  fs.writeFileSync(reportPath, fs.readFileSync(reportPath, 'utf8').replace(/^prototype_sha256:.*\n/m, ''));
  const missing = run(['witness', 'check', '--root', root, '--report', REL.report, '--json']);
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).witness, 'missing');

  const root2 = tmpTree();
  fs.rmSync(path.join(root2, REL.report));
  const absent = run(['witness', 'check', '--root', root2, '--report', REL.report, '--json']);
  assert.equal(absent.status, 0);
  assert.equal(JSON.parse(absent.stdout).witness, 'absent');
});

test('spec_parity: a missing detail class is a red; N/A-with-reason is accepted', () => {
  const root = tmpTree();
  edit(root, REL.report, (s) => s.replace('| Telemetry | L-35, L-36, L-37 | covered |\n', ''));
  const red = run(checkArgs(root));
  assert.equal(red.status, 1);
  assert.ok(JSON.parse(red.stdout).violations.some((v) => /Telemetry: missing from the class table/.test(v)));

  const root2 = tmpTree();
  edit(root2, REL.report, (s) => s.replace('| Telemetry | L-35, L-36, L-37 | covered |', '| Telemetry | — | N/A: no telemetry surface in this fixture |'));
  const green = run(checkArgs(root2));
  assert.equal(green.status, 0, green.stderr + green.stdout);
});

test('spec_parity: anchor grammar resolution is frozen (A11)', () => {
  const { resolveAnchor } = require(path.join(ROOT, '.agents', 'scripts', 'spec_parity.js'));
  assert.equal(resolveAnchor(ROOT, `${REL.prototype}#state-empty`).ok, true);
  assert.equal(resolveAnchor(ROOT, `${REL.prototype}#does-not-exist`).ok, false);
  assert.equal(resolveAnchor(ROOT, 'no-hash-anchor').ok, false);
  assert.equal(resolveAnchor(ROOT, '/absolute/path#id').ok, false);
  assert.equal(resolveAnchor(ROOT, `${REL.inventory}#INV-01`).ok, true, 'non-file prototypes anchor to inventory rows');
});
