#!/usr/bin/env node
// test_telemetry_display.test.js — 02l Option A WS-2.4 thin RQS-D scorecard
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { renderRQScorecard, scoreText } = require('../tools/telemetry/telemetry_display');
const { computeRQSD } = require('../tools/eval/lib/biomarkers');

describe('telemetry display — thin RQS-D scorecard (02l WS-2.4)', () => {
  it('renders scorecard with exact/estimated flag and RQS-D biomarkers', () => {
    const card = renderRQScorecard({
      rqs_d_score: 0.97, agent_persona: 'developer', workflow: 'delivery/develop',
      model: { model_id: 'claude-3-5-sonnet' }, duration_ms: 1240,
      usage: { total_tokens: 1450, cost_usd: null, estimated: false },
      biomarkers: { scr: 1, msha: 1, placeholder_density: 0, pci: 0, ac_testability: 1, srsr: null, scope_drift: null },
      artifact: 'artifacts/output/01-discovery/problem-brief.md', estimated: false
    });
    assert.match(card, /RQS-D/);
    assert.match(card, /exact/);
    assert.match(card, /developer/);
    assert.match(card, /SCR/);
  });

  it('scoreText computes RQS-D from markdown and renders card', () => {
    const md = `## Problem Context\nx\n## User Stories\n- Given a, When b, Then c\n## Non-Functional Reqs\ny`;
    const { rqs, card } = scoreText(md, { agent: 'product-manager', workflow: 'discovery/validate-idea' });
    assert.ok(rqs.rqs_d_score >= 0.85);
    assert.match(card, /PASS|EXCELLENT/);
  });

  it('estimated flag surfaces when usage.estimated true', () => {
    const card = renderRQScorecard({
      rqs_d_score: 0.88, agent_persona: 'researcher', workflow: 'research/explore-idea',
      model: { model_id: 'llama-3.3-70b' }, duration_ms: 500,
      usage: { total_tokens: 800, cost_usd: null, estimated: true },
      biomarkers: { scr: 1, msha: 1, placeholder_density: 0, pci: 0, ac_testability: 1, srsr: null, scope_drift: null },
      estimated: true
    });
    assert.match(card, /estimated/);
  });

  it('RQS-J shadow collapsed correctly (null until κ≥0.7)', () => {
    const card = renderRQScorecard({
      rqs_d_score: 0.9, agent_persona: 'architect', workflow: 'delivery/develop',
      model: { model_id: 'claude-3-5-sonnet' }, duration_ms: 100,
      usage: { total_tokens: 100, cost_usd: null, estimated: false },
      biomarkers: { scr: 1, msha: 1, placeholder_density: 0, pci: 0, ac_testability: 1, srsr: null, scope_drift: null },
      estimated: false
    });
    assert.match(card, /Semantic Shadow/);
    assert.match(card, /RQS-J/);
  });
});
