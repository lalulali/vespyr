#!/usr/bin/env node
/**
 * tests/test_req_to_impl_check.test.js — 02o.2 orphan-AC sweep (A9/B9).
 *
 * Green on the fixture PRD; red on a seeded orphan; anchored uniqueness
 * (AC-1 ≠ AC-10); self-match impossible; dated deferrals exempt; refs must
 * resolve; --fidelity covers the 10-class table.
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
const REL = {
  stories: 'evals/fixtures/dev-tasks/spec-coverage/user-stories.md',
  orphanStories: 'evals/fixtures/dev-tasks/spec-coverage/orphan-user-stories.md',
  report: 'evals/fixtures/dev-tasks/spec-coverage/coverage-report.md',
  targets: 'evals/fixtures/dev-tasks/spec-coverage',
};

function tmpTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'req-to-impl-'));
  fs.cpSync(FIX, path.join(dir, 'evals', 'fixtures', 'dev-tasks', 'spec-coverage'), { recursive: true });
  return dir;
}

function run(root, args) {
  return spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
}

test('req_to_impl: fixture PRD is green — every AC id has a resolvable reference', () => {
  const res = run(ROOT, ['--stories', REL.stories, '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(res.status, 0, res.stderr + res.stdout);
  const out = JSON.parse(res.stdout);
  assert.equal(out.pass, true);
  assert.deepEqual(out.orphans, []);
  assert.deepEqual(out.acs.sort(), ['AC-E1', 'AC-H1', 'AC-U1']);
});

test('req_to_impl: seeded orphan AC turns the sweep red (exit 1 on first orphan)', () => {
  const res = run(ROOT, ['--stories', REL.orphanStories, '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(res.status, 1);
  const out = JSON.parse(res.stdout);
  assert.deepEqual(out.orphans, ['AC-E2']);
  assert.deepEqual(out.unresolvedOrphans, ['AC-E2']);
  assert.ok(out.violations.some((v) => /orphan AC/.test(v)));
});

test('req_to_impl: a dated deferral row exempts the orphan', () => {
  const root = tmpTree();
  const report = path.join(root, REL.report);
  const content = fs.readFileSync(report, 'utf8').replace(
    '\n\n## 10-class fidelity review',
    '\n| AC-E2 | — | — | — | deferred (owner: @product-manager, 2026-09-22) |\n\n## 10-class fidelity review'
  );
  fs.writeFileSync(report, content);
  const res = run(root, ['--stories', REL.orphanStories, '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(res.status, 0, res.stderr + res.stdout);
  const out = JSON.parse(res.stdout);
  assert.deepEqual(out.unresolvedOrphans, []);
  assert.deepEqual(out.deferred, ['AC-E2']);
});

test('req_to_impl: anchored uniqueness — AC-10 does not satisfy AC-1', () => {
  const root = tmpTree();
  fs.mkdirSync(path.join(root, 'site'), { recursive: true });
  fs.writeFileSync(path.join(root, 'site', 'impl.js'), '// AC-10 only\n', 'utf8');
  fs.writeFileSync(path.join(root, 'site', 'stories.md'), '- AC-1: first criterion\n- AC-10: tenth criterion\n', 'utf8');
  const res = run(root, ['--stories', 'site/stories.md', '--targets', 'site', '--json']);
  assert.equal(res.status, 1);
  const out = JSON.parse(res.stdout);
  assert.deepEqual(out.orphans, ['AC-1']);
});

test('req_to_impl: self-match is impossible (the story file is never a target)', () => {
  const root = tmpTree();
  fs.mkdirSync(path.join(root, 'site'), { recursive: true });
  fs.writeFileSync(path.join(root, 'site', 'user-stories.md'), '- AC-H1: appears only in the story file\n', 'utf8');
  const res = run(root, ['--stories', 'site/user-stories.md', '--targets', 'site', '--json']);
  assert.equal(res.status, 1);
  assert.deepEqual(JSON.parse(res.stdout).orphans, ['AC-H1']);
});

test('req_to_impl: coverage-report refs must resolve on disk', () => {
  const root = tmpTree();
  const report = path.join(root, REL.report);
  fs.writeFileSync(report, fs.readFileSync(report, 'utf8').replace('#allowRequest', '#no-such-symbol'));
  const res = run(root, ['--stories', REL.stories, '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(res.status, 1);
  const out = JSON.parse(res.stdout);
  assert.ok(out.refProblems.some((p) => /no-such-symbol/.test(p)));
});

test('req_to_impl: an AC cross-ref is a row key, not implementation evidence', () => {
  const root = tmpTree();
  const report = path.join(root, REL.report);
  const content = fs.readFileSync(report, 'utf8').replace(
    '\n\n## 10-class fidelity review',
    '\n| AC-E2 | AC-H1 | cross-ref only | — | covered |\n\n## 10-class fidelity review'
  );
  fs.writeFileSync(report, content);
  const res = run(root, ['--stories', REL.orphanStories, '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(res.status, 1);
  assert.deepEqual(JSON.parse(res.stdout).unresolvedOrphans, ['AC-E2']);
});

test('req_to_impl --freshness: fresh report passes; a newer code change makes it stale (02o P3)', () => {
  const root = tmpTree();
  const report = path.join(root, REL.report);
  const target = path.join(root, REL.targets, 'rate-limiter.js');
  const base = Date.now() / 1000;
  fs.utimesSync(report, base + 60, base + 60);
  fs.utimesSync(target, base, base);
  const fresh = run(root, ['--freshness', '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(fresh.status, 0, fresh.stderr);
  assert.equal(JSON.parse(fresh.stdout).fresh, true);

  fs.utimesSync(target, base + 120, base + 120);
  const stale = run(root, ['--freshness', '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(stale.status, 1);
  const out = JSON.parse(stale.stdout);
  assert.equal(out.fresh, false);
  assert.match(out.reason, /older than/);
});

test('req_to_impl --freshness: no report means nothing to check (green)', () => {
  const root = tmpTree();
  fs.rmSync(path.join(root, REL.report));
  const res = run(root, ['--freshness', '--report', REL.report, '--targets', REL.targets, '--json']);
  assert.equal(res.status, 0, res.stderr);
  assert.match(JSON.parse(res.stdout).reason, /no coverage report/);
});

test('req_to_impl --fidelity: green on the fixture, red on a missing class', () => {
  const green = run(ROOT, ['--fidelity', '--report', REL.report, '--json']);
  assert.equal(green.status, 0, green.stderr + green.stdout);
  assert.equal(JSON.parse(green.stdout).classes, 10);

  const root = tmpTree();
  const report = path.join(root, REL.report);
  fs.writeFileSync(report, fs.readFileSync(report, 'utf8').replace('| Telemetry | deferred: metrics land with the service layer (owner: @developer, 2026-09-22) | not implemented in the utility |\n', ''));
  const red = run(root, ['--fidelity', '--report', REL.report, '--json']);
  assert.equal(red.status, 1);
  assert.ok(JSON.parse(red.stdout).problems.some((p) => /Telemetry: missing/.test(p)));
});
