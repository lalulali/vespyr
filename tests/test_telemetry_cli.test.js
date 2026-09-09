#!/usr/bin/env node
// test_telemetry_cli.test.js — record-span CLI flag paths (round-table integrity pin).
// Incomplete flag sets must fail (SPAN_VALIDATION, exit 2), never silently
// pass with synthesized fields. Full flag sets pass (control).
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', '.agents', 'scripts', 'swarm_telemetry.js');
let tmpDir, origCwd;

function mkTmp() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-cli-test-'));
  origCwd = process.cwd();
  process.chdir(tmpDir);
}

function cleanup() {
  process.chdir(origCwd);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}

function run(...argv) {
  return spawnSync(process.execPath, [script, ...argv], { cwd: tmpDir, encoding: 'utf8' });
}

describe('record-span CLI flag paths', () => {
  beforeEach(mkTmp);
  afterEach(cleanup);

  it('omitted workflow/model/usage flags fail with SPAN_VALIDATION (exit 2)', () => {
    const r = run('record-span', '--agent', 'dev');
    assert.equal(r.status, 2);
    assert.match(r.stdout, /synthesized defaults/);
  });

  it('missing flag value errors cleanly (exit 1)', () => {
    const r = run('record-span', '--agent');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Missing value/);
  });

  it('full flags incl. --total 0 pass (control, exit 0)', () => {
    const r = run('record-span', '--agent', 'dev', '--workflow', 'w', '--model', 'm', '--provider', 'p',
      '--prompt', '0', '--completion', '0', '--total', '0', '--duration', '5', '--rqs', '0.9');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /"ok": true/);
  });
});
