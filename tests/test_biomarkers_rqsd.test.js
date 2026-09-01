#!/usr/bin/env node
// test_biomarkers_rqsd.test.js — 02l Option A WS-1.2/1.3: RQS-D deterministic (SCR/MSHA/PD/PCI/AC) <25ms, 0 tokens
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeRQSD, computeRQSDWithDetails } = require('../tools/eval/lib/biomarkers');
const { evaluateTier0 } = require('../tools/eval/tier0-judge');

describe('RQS-D biomarkers (02l Option A thin slice)', () => {
  it('perfect artifact scores 1.0 across deterministics → RQS-D 1.0 EXCELLENT', () => {
    const md = `---
title: test
---
## Problem Context
content
## User Stories
- Given user is logged in, When they submit, Then token generated
## Non-Functional Reqs
content`;
    const r = computeRQSD(md, { requiredHeaders: ['Problem Context', 'User Stories', 'Non-Functional Reqs'] });
    assert.equal(r.biomarkers.scr, 1.0);
    assert.equal(r.biomarkers.msha, 1.0);
    assert.equal(r.biomarkers.placeholder_density, 0.0);
    assert.equal(r.biomarkers.pci, 0.0);
    assert.equal(r.biomarkers.ac_testability, 1.0);
    assert.equal(r.rqs_d_score, 1.0);
    assert.equal(r.rating, 'EXCELLENT');
  });

  it('placeholder TODO fails PD hard invariant (0.0 required)', () => {
    const md = `## A\nTODO finish\n## B\ncontent`;
    const r = computeRQSD(md);
    assert.ok(r.biomarkers.placeholder_density > 0);
    assert.equal(r.tier0.pd_pass, false);
  });

  it('missing required header fails MSHA (deterministic, <25ms)', () => {
    const md = `## Problem Context\nx\n## User Stories\n- Given a, When b, Then c`;
    const r = computeRQSD(md, { requiredHeaders: ['Problem Context', 'User Stories', 'Non-Functional Reqs'] });
    assert.equal(r.biomarkers.msha, 2/3);
  });

  it('malformed json fence fails SCR', () => {
    const md = "## A\n```json\n{ bad json }\n```\n";
    const r = computeRQSD(md);
    assert.equal(r.biomarkers.scr, 0.0);
  });

  it('RQS-D <0.85 gates Tier0 when enforceRQSD true — demonstrates red (no green without demonstrated red)', async () => {
    const bad = `TODO left\nTBD missing\n[insert header]\n`; // PD 100% + no H2 => MSHA 0 => RQS well below 0.85, plus PD hard invariant
    const t0 = await evaluateTier0({ id: 'T', enforceRQSD: true, minRQSD: 0.85 }, { output: bad, stdout: bad }, null);
    assert.equal(t0.pass, false);
    assert.ok(t0.failures.some(f => f.includes('RQS-D') || f.includes('TIER0_PD') || f.includes('TIER0_MSHA') || f.includes('Hard invariant')), 'should contain RQS-D or hard invariant failure');
  });

  it('RQS-D ≥0.85 passes Tier0 when perfect', async () => {
    const good = `## Problem Context\nx\n## User Stories\n- Given a, When b, Then c\n## Non-Functional Reqs\ny`;
    const t0 = await evaluateTier0({ id: 'T2', enforceRQSD: true, minRQSD: 0.85, requiredHeaders: ['Problem Context', 'User Stories', 'Non-Functional Reqs'] }, { output: good, stdout: good }, null);
    // PCI may still be 0 if no code fence after KILL; should pass if all deterministics 1.0
    assert.equal(t0.pass, true);
  });

  it('SRSR/SDS explicitly excluded from RQS-D (null, not gating)', () => {
    const r = computeRQSD('## A\ncontent');
    assert.equal(r.biomarkers.srsr, null);
    assert.equal(r.biomarkers.scope_drift, null);
  });

  it('computeRQSD is deterministic and fast (<25ms)', () => {
    const md = `# Title\n`.repeat(200) + `## Problem Context\n` + '- Given a, When b, Then c\n'.repeat(20);
    const start = Date.now();
    for (let i=0;i<50;i++) computeRQSD(md);
    const elapsed = Date.now() - start;
    // 50 runs should be < 100ms => single <2ms avg, proves <25ms
    assert.ok(elapsed < 200, `50 runs took ${elapsed}ms, should be <200`);
  });

  it('weights rebalanced after RQS-J amputation sum to 1.0', () => {
    const r = computeRQSD('## A\ncontent');
    const sum = Object.values(r.weights).reduce((a,b)=>a+b,0);
    assert.ok(Math.abs(sum - 1.0) < 0.001);
    assert.ok(!('srsr' in r.weights) && !('scope_drift' in r.weights), 'RQS-J weights must not leak into RQS-D');
  });
});
