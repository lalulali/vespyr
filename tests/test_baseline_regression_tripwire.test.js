#!/usr/bin/env node
// test_baseline_regression_tripwire.test.js — INV-TEL-04 token >15% inflation negative control + RQS gate
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { diffAgainstBaseline } = require('../tools/eval/baseline');

describe('INV-TEL-04 baseline regression tripwire (>15% token inflation, RQS drop)', () => {
  it('detects >15% token inflation as regression (negative control demonstrates red)', () => {
    const baseline = { summary: { pass_rate: 1.0, total_token_spend: 1000, tier0PassRate: 1.0 } };
    const run = { passRate: 1.0, totalTokens: 1160, tier0PassRate: 1.0, tier1AvgScore: 5.0 };
    const diff = diffAgainstBaseline(run, baseline);
    assert.equal(diff.hasRegression, true, '16% inflation should be regression');
    assert.ok(diff.regressions.some(r => r.type==='TOKEN_INFLATION'), 'reason should mention token');
  });
  it('does not flag <15% inflation as regression', () => {
    const baseline = { summary: { pass_rate: 1.0, total_token_spend: 1000 } };
    const run = { passRate: 1.0, totalTokens: 1100 };
    const diff = diffAgainstBaseline(run, baseline);
    // 10% inflation <15% should not be regression unless pass drop
    assert.equal(diff.hasRegression, false);
  });
  it('detects pass rate drop >0% as regression even without token inflation', () => {
    const baseline = { summary: { pass_rate: 1.0, total_token_spend: 1000 } };
    const run = { passRate: 0.9, totalTokens: 1000 };
    const diff = diffAgainstBaseline(run, baseline);
    assert.equal(diff.hasRegression, true);
  });
  it('swarm_telemetry verify hybrid guards block <80% exact as engine fault (engine red)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-tripwire-'));
    const orig = process.cwd();
    process.chdir(tmpDir);
    delete require.cache[require.resolve(path.join(orig, '.agents/scripts/swarm_telemetry.js'))];
    const swarm = require(path.join(orig, '.agents/scripts/swarm_telemetry.js'));
    // 1 exact, 4 estimated => 20% exact
    for(let i=0;i<1;i++) swarm.captureUsage({ workflow:'w', agent_persona:'a', model:{provider:'x', model_id:'claude',temperature:0}, usage:{prompt_tokens:10, completion_tokens:10, total_tokens:20, cost_usd:null}, duration_ms:10 });
    for(let i=0;i<4;i++) swarm.captureUsage({ workflow:'w', agent_persona:'a', model:{provider:'x', model_id:'ollama',temperature:0}, usage:{}, rawText:'estimated', duration_ms:10 });
    const v = swarm.verifySpans(1);
    assert.equal(v.hybrid_pass, false);
    assert.match(v.reason, /INSUFFICIENT_EXACT_COVERAGE/);
    process.chdir(orig);
    fs.rmSync(tmpDir,{recursive:true,force:true});
    delete require.cache[require.resolve(path.join(orig, '.agents/scripts/swarm_telemetry.js'))];
  });
});
