#!/usr/bin/env node
// test_telemetry_summary.test.js — generateSummary synthetic exclusion +
// locked share denominator (round-table turn 8/11). Synthetic rows must never
// leak into production aggregates; by_type shares divide by prod_events.
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const telemetryPath = path.join(__dirname, '..', '.agents', 'scripts', 'swarm_telemetry.js');
let swarm;
let tmpDir, origCwd;

function mkTmp() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-summary-test-'));
  origCwd = process.cwd();
  process.chdir(tmpDir);
  delete require.cache[require.resolve(telemetryPath)];
  swarm = require(telemetryPath);
}

function cleanup() {
  process.chdir(origCwd);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  delete require.cache[require.resolve(telemetryPath)];
}

describe('generateSummary synthetic exclusion + denominator', () => {
  beforeEach(mkTmp);
  afterEach(cleanup);

  it('excludes synthetic rows from aggregates, counts them separately', () => {
    swarm.recordEvent('memory_load', { agent: 'dev', tokens: 100 });
    swarm.recordEvent('memory_load', { agent: 'sim', tokens: 9999, synthetic: true });
    swarm.recordEvent('agent_invoke', { agent: 'qa-probe', phase: 'w', tokens: 5 });
    const s = swarm.generateSummary(1);
    assert.equal(s.total_events, 3);
    assert.equal(s.synthetic_events, 2);
    assert.equal(s.prod_events, 1);
    // synthetic tokens must not leak into the average (would be 5049+, real is 100)
    assert.equal(s.memory_load_avg_tokens, 100);
    assert.equal(s.memory_load_count, 1);
  });

  it('by_type shares reconcile against prod_events, not total_events', () => {
    swarm.recordEvent('memory_load', { agent: 'a', tokens: 10 });
    swarm.recordEvent('memory_load', { agent: 'b', tokens: 20 });
    swarm.recordEvent('archive_compact', { synthetic: true });
    const s = swarm.generateSummary(1);
    const shares = Object.values(s.by_type).reduce((a, b) => a + b, 0);
    assert.equal(shares, s.prod_events);
    assert.ok(s.total_events > s.prod_events);
  });
});
