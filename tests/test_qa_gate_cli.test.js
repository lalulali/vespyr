'use strict';
// Black-box CLI coverage for qa_check.js (F2.23/F2.26). The module-level
// fixtures in test_qa_gate.mjs exercise checkQA() directly; these assert the
// executable contract the orchestrator and agents actually invoke: exit codes
// and --json output from `node .agents/scripts/qa_check.js`.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const QA_CHECK = path.join(REPO, '.agents', 'scripts', 'qa_check.js');
const { computeSignature } = require(QA_CHECK);

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-qa-cli-'));
  const dir = path.join(root, 'artifacts', 'output', '05-execution', 'quality');
  fs.mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const report = path.join(dir, 'qa-report.md');
  fs.writeFileSync(report, `Date: ${today}\nRelease recommendation: GO\n`);
  fs.writeFileSync(path.join(dir, 'qa-signoff.md'), [
    '---', `date: "${today}"`, 'verdict: "GO"', '---', '',
    'VERDICT: [GO]', 'Release recommendation: GO', `Date: ${today}`,
    'Mode: M1', `Signature: ${computeSignature(report)}`, '',
    '## Conditions', '', '## Open findings carried forward', '',
  ].join('\n'));
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [QA_CHECK, '--root', root, '--json'], {
    encoding: 'utf8', cwd: root,
  });
}

test('qa_check.js CLI exits 0 with ok:true on a valid sign-off', () => {
  const root = fixture();
  const r = run(root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout).ok, true);
});

test('qa_check.js CLI exits 1 with named failures when the report is tampered', () => {
  const root = fixture();
  fs.appendFileSync(path.join(root, 'artifacts/output/05-execution/quality/qa-report.md'), '\nlate edit\n');
  const r = run(root);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => /Signature does not match/.test(f)));
});

function pipelineRoot(currentPhase) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-orch-gate-'));
  fs.mkdirSync(path.join(root, 'artifacts', 'output'), { recursive: true });
  const phases = {};
  const ordered = ['validation', 'discovery', 'research', 'strategy', 'architecture', 'planning', 'execution'];
  for (const p of ordered) phases[p] = { status: 'complete', started_at: null, completed_at: null, agents: [] };
  for (const p of ['launch', 'iteration', 'documentation', 'retro']) phases[p] = { status: 'pending', started_at: null, completed_at: null, agents: [] };
  fs.writeFileSync(path.join(root, 'artifacts/output/pipeline-state.json'), JSON.stringify({
    project: { name: 'gate-fixture', type: 'test' },
    created_at: new Date().toISOString(), last_updated: new Date().toISOString(),
    current_phase: currentPhase, phases, artifacts: {}, change_requests: [], blockers: [], history: [],
  }));
  return root;
}

function orchestratorNext(root) {
  const script = path.join(REPO, '.agents', 'scripts', 'orchestrator_state.js');
  return spawnSync(process.execPath, [script, 'next', '--json'], { cwd: root, encoding: 'utf8' });
}

test('orchestrator next refuses to advance out of execution without a QA sign-off', () => {
  const r = orchestratorNext(pipelineRoot('execution'));
  assert.equal(r.status, 0, r.stderr);
  const action = JSON.parse(r.stdout);
  assert.equal(action.action, 'qa-gate-blocked');
  assert.match(action.reason, /qa-sign-off|qa-report/i);
});

test('orchestrator next refuses a release transition without a satisfaction record', () => {
  // Start in execution so the artifact validator does not intercept first;
  // supply a valid QA gate so the only remaining blocker is Gate 2.
  const root = pipelineRoot('execution');
  const dir = path.join(root, 'artifacts', 'output', '05-execution', 'quality');
  fs.mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const report = path.join(dir, 'qa-report.md');
  fs.writeFileSync(report, `Date: ${today}\nRelease recommendation: GO\n`);
  fs.writeFileSync(path.join(dir, 'qa-signoff.md'), [
    '---', `date: "${today}"`, 'verdict: "GO"', '---', '',
    'VERDICT: [GO]', 'Release recommendation: GO', `Date: ${today}`,
    'Mode: M1', `Signature: ${computeSignature(report)}`, '',
    '## Conditions', '', '## Open findings carried forward', '',
  ].join('\n'));
  const r = orchestratorNext(root);
  assert.equal(r.status, 0, r.stderr);
  const action = JSON.parse(r.stdout);
  assert.equal(action.action, 'satisfaction-gate-blocked');
  assert.match(action.reason, /satisfaction|UTTERLY/i);
});

test('qa_check.js signature subcommand prints the report fingerprint', () => {
  const root = fixture();
  const report = path.join(root, 'artifacts/output/05-execution/quality/qa-report.md');
  const r = spawnSync(process.execPath, [QA_CHECK, 'signature', '--report', report], {
    encoding: 'utf8', cwd: root,
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stdout.trim(), computeSignature(report));
});
