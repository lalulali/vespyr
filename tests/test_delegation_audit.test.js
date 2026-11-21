'use strict';
// F2.21 — delegation_audit.js: append-only NDJSON, derived roster, rates,
// threshold flagging, and justification-abuse detection.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, '.agents', 'scripts', 'delegation_audit.js');
const ROSTER = ['developer', 'qa-engineer', 'architect'];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-delegation-'));
  fs.mkdirSync(path.join(root, '.agents', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(root, '.agents', 'state'), { recursive: true });
  for (const name of ROSTER) fs.writeFileSync(path.join(root, '.agents', 'agents', `${name}.md`), `# ${name}\n`);
  return root;
}

function logPath(root, ext = 'ndjson') {
  return path.join(root, '.agents', 'state', `delegation-log.${ext}`);
}

function writeLog(root, records, ext = 'ndjson') {
  const file = logPath(root, ext);
  if (ext === 'json') {
    fs.writeFileSync(file, JSON.stringify({ records }));
  } else {
    fs.writeFileSync(file, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
  return file;
}

function rec(agent, delegated, daysAgo = 0, justification = '') {
  const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return { ts, agent, delegated, justification, tool: 'read', args: ['x'] };
}

function run(root, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: 'utf8' });
}

function json(root, args = []) {
  const r = run(root, ['--json', ...args]);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

test('F2.20: every reasoning persona declares a Delegation Contract', () => {
  const dir = path.join(REPO, '.agents', 'agents');
  const reasoning = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'memory-controller.md');
  const missing = reasoning.filter((f) => !fs.readFileSync(path.join(dir, f), 'utf8').includes('## Delegation Contract'));
  assert.deepEqual(missing, [], `reasoning personas without a Delegation Contract: ${missing.join(', ')}`);
  assert.equal(reasoning.length, 19);
});

test('roster is derived from .agents/agents/*.md, never hardcoded', () => {
  const root = fixture();
  const { out } = json(root, ['--fail-below', '0']);
  assert.deepEqual(out.agents.map((a) => a.agent), [...ROSTER].sort());
  assert.equal(out.agent_count, 3);
});

test('NDJSON records produce per-agent delegated/direct counts and rates', () => {
  const root = fixture();
  const records = [
    ...Array.from({ length: 8 }, () => rec('developer', true)),
    ...Array.from({ length: 2 }, () => rec('developer', false)),
    rec('qa-engineer', true), rec('qa-engineer', false), rec('qa-engineer', false),
  ];
  writeLog(root, records);
  const { code, out } = json(root, ['--fail-below', '0']);
  assert.equal(code, 0);
  const dev = out.agents.find((a) => a.agent === 'developer');
  assert.equal(dev.delegated, 8);
  assert.equal(dev.direct, 2);
  assert.equal(dev.total, 10);
  assert.equal(dev.rate, 80);
  const qa = out.agents.find((a) => a.agent === 'qa-engineer');
  assert.equal(qa.rate, 33.3);
});

test('agents below --fail-below are flagged and exit 1', () => {
  const root = fixture();
  writeLog(root, [rec('developer', true), rec('qa-engineer', true), rec('qa-engineer', false), rec('qa-engineer', false)]);
  const { code, out } = json(root, ['--fail-below', '50']);
  assert.equal(code, 1);
  assert.ok(out.flagged.includes('qa-engineer'));
  assert.ok(!out.flagged.includes('developer'));
});

test('--since window excludes older records', () => {
  const root = fixture();
  writeLog(root, [rec('qa-engineer', true, 30), rec('qa-engineer', false, 0)]);
  const recent = json(root, ['--since', '7d', '--fail-below', '50']);
  assert.equal(recent.out.agents.find((a) => a.agent === 'qa-engineer').total, 1);
  assert.equal(recent.code, 1);

  const wide = json(root, ['--since', '60d', '--fail-below', '50']);
  assert.equal(wide.out.agents.find((a) => a.agent === 'qa-engineer').total, 2);
  assert.equal(wide.out.agents.find((a) => a.agent === 'qa-engineer').rate, 50);
  assert.equal(wide.code, 0);
});

test('legacy .json log is still readable during migration', () => {
  const root = fixture();
  writeLog(root, [rec('developer', true), rec('developer', false)], 'json');
  const { code, out } = json(root, ['--fail-below', '0']);
  assert.equal(code, 0);
  assert.match(out.source, /delegation log/);
  assert.equal(out.agents.find((a) => a.agent === 'developer').total, 2);
});

test('no data exits 0 with an honest message — no fabricated count', () => {
  const root = fixture();
  const r = run(root, ['--fail-below', '50']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /No delegation records found|no delegation log/i);
  assert.doesNotMatch(r.stdout, /undefined|NaN/);
});

test('implausible justification rate is flagged (01b R20a)', () => {
  const root = fixture();
  writeLog(root, Array.from({ length: 6 }, () => rec('developer', false, 0, 'tiny edit because faster')));
  const { code, out } = json(root, ['--fail-below', '0']);
  assert.equal(code, 1);
  const dev = out.agents.find((a) => a.agent === 'developer');
  assert.equal(dev.justification_rate, 100);
  assert.equal(dev.justification_abuse, true);
  assert.ok(out.flagged.includes('developer'));
});
