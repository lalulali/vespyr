#!/usr/bin/env node
/**
 * tests/test_step_tracker_route.test.js — 02n.9 design routing evidence.
 *
 * The 4-way artifact-presence decision is computed in code (A1 precedence):
 * create / reverse / edit / rollback. Scope locks record artifact hashes and
 * witness state, so a lock taken after a witness recompute is distinguishable
 * from one taken with a stale witness.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const TRACKER = path.join(__dirname, '..', '.agents', 'scripts', 'step_tracker.js');
const STRATEGY = path.join('artifacts', 'output', '03-strategy');

function workspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracker-route-'));
  fs.mkdirSync(path.join(dir, '.agents', 'state'), { recursive: true });
  fs.mkdirSync(path.join(dir, STRATEGY), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agents', 'config.yaml'), 'step_tracking: silent\n', 'utf8');
  return dir;
}

function writeReport(dir, prototypeSha) {
  fs.writeFileSync(
    path.join(dir, STRATEGY, 'parity-report.md'),
    [
      '---',
      'report: parity',
      'prototype: prototype.html',
      'prototype_type: file',
      `prototype_sha256: ${prototypeSha}`,
      `inventory: ${STRATEGY}/prototype-inventory.md`,
      '---',
      '',
      '# Parity Report',
    ].join('\n'),
    'utf8'
  );
}

function runRoute(dir) {
  return spawnSync(process.execPath, [TRACKER, 'route', '--skill', 'design', '--json'], { cwd: dir, encoding: 'utf8' });
}

function runLock(dir, track) {
  return spawnSync(process.execPath, [TRACKER, 'scope-lock', '--skill', 'design', '--track', track], { cwd: dir, encoding: 'utf8' });
}

function auditEntries(dir) {
  const p = path.join(dir, 'artifacts', 'output', 'step-audit.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

test('route: no artifacts → create', () => {
  const dir = workspace();
  const res = runRoute(dir);
  assert.strictEqual(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.route, 'create');
  assert.strictEqual(out.witness_state, 'absent');
});

test('route: inventory present and no requirements → reverse (A1 first)', () => {
  const dir = workspace();
  fs.writeFileSync(path.join(dir, STRATEGY, 'prototype-inventory.md'), '# Prototype Inventory\n', 'utf8');
  const out = JSON.parse(runRoute(dir).stdout);
  assert.strictEqual(out.route, 'reverse');
});

test('route: artifacts present without a witness → edit (never frozen)', () => {
  const dir = workspace();
  fs.writeFileSync(path.join(dir, STRATEGY, 'prototype-inventory.md'), '# Prototype Inventory\n', 'utf8');
  fs.writeFileSync(path.join(dir, STRATEGY, 'requirements.md'), '# Requirements\n', 'utf8');
  const out = JSON.parse(runRoute(dir).stdout);
  assert.strictEqual(out.route, 'edit');
  assert.strictEqual(out.witness_state, 'absent');
});

test('route: stale witness → rollback (blocked), fresh witness → edit', () => {
  const dir = workspace();
  fs.writeFileSync(path.join(dir, STRATEGY, 'prototype-inventory.md'), '# Prototype Inventory\n', 'utf8');
  fs.writeFileSync(path.join(dir, STRATEGY, 'requirements.md'), '# Requirements\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'prototype.html'), '<div id="x">v1</div>\n', 'utf8');
  writeReport(dir, 'deadbeef');

  const stale = JSON.parse(runRoute(dir).stdout);
  assert.strictEqual(stale.witness_state, 'stale');
  assert.strictEqual(stale.route, 'rollback');
  assert.strictEqual(stale.blocked, true);

  const real = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'prototype.html'))).digest('hex');
  writeReport(dir, real);
  const fresh = JSON.parse(runRoute(dir).stdout);
  assert.strictEqual(fresh.witness_state, 'fresh');
  assert.strictEqual(fresh.route, 'edit');
  assert.strictEqual(fresh.blocked, false);
});

test('route: scope locks record artifact hashes + witness state (recompute vs without)', () => {
  const dir = workspace();
  fs.writeFileSync(path.join(dir, STRATEGY, 'prototype-inventory.md'), '# Prototype Inventory\n', 'utf8');
  fs.writeFileSync(path.join(dir, STRATEGY, 'requirements.md'), '# Requirements\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'prototype.html'), '<div id="x">v1</div>\n', 'utf8');
  const real = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'prototype.html'))).digest('hex');
  writeReport(dir, real);

  assert.strictEqual(runLock(dir, 'edit').status, 0);
  const afterRecompute = auditEntries(dir).filter((e) => e.type === 'scope_lock').pop();
  assert.strictEqual(afterRecompute.witness_state, 'fresh');
  assert.strictEqual(afterRecompute.route, 'edit');
  assert.ok(afterRecompute.artifacts[`${STRATEGY}/requirements.md`], 'artifact hashes recorded');

  fs.appendFileSync(path.join(dir, 'prototype.html'), '<!-- drift -->\n');
  assert.strictEqual(runLock(dir, 'edit').status, 0);
  const afterDrift = auditEntries(dir).filter((e) => e.type === 'scope_lock').pop();
  assert.strictEqual(afterDrift.witness_state, 'stale');
  assert.strictEqual(afterDrift.route, 'rollback');
});
