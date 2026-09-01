#!/usr/bin/env node
// test_schema_single_owner.test.js — 02l Option A WS-1.1/3.8: canonical span schema single-owner registry
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('canonical span schema single-owner (02l → 04/04a import)', () => {
  it('tools/telemetry/schema.json exists and is valid JSON schema', () => {
    const p = path.join(__dirname, '..', 'tools', 'telemetry', 'schema.json');
    assert.ok(fs.existsSync(p), 'canonical schema must exist');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(j.title.includes('VespyrTelemetrySpan'), true);
    assert.ok(j.properties.usage.properties.cost_usd.type.includes('null'), 'cost_usd must be nullable Phase 1');
    assert.ok(j.properties.usage.properties.estimated.type === 'boolean');
    assert.ok(j.properties.quality_scorecard.properties.rqs_d_score != null);
    assert.ok(j.properties.quality_scorecard.properties.rqs_j_score.type.includes('null'));
  });

  it('04-phase-3-observability.md does not redefine VespyrTelemetrySpan — imports canonical', () => {
    const p = path.join(__dirname, '..', 'artifacts', 'docs', 'strategy', 'development-plan', '04-phase-3-observability.md');
    const t = fs.readFileSync(p, 'utf8');
    // Should contain canonical import line
    assert.match(t, /tools\/telemetry\/schema\.json/);
    assert.match(t, /Single-owner.*do not redefine|Canonical schema/);
    // Should NOT contain full interface redefinition with "interface VespyrTelemetrySpan" duplicate block
    const interfaceCount = (t.match(/interface VespyrTelemetrySpan/g) || []).length;
    assert.equal(interfaceCount, 0, '04 must not redefine interface — import only');
  });

  it('04a-phase-3-observability-engine.md imports canonical, not redefines', () => {
    const p = path.join(__dirname, '..', 'artifacts', 'docs', 'strategy', 'development-plan', '04a-phase-3-observability-engine.md');
    const t = fs.readFileSync(p, 'utf8');
    assert.match(t, /tools\/telemetry\/schema\.json/);
    assert.match(t, /Single-owner.*do not redefine/);
    const interfaceCount = (t.match(/interface VespyrTelemetrySpan\s*\{/g) || []).length;
    // Allow at most 0 full definitions; the import notice may still show snippet but not full interface
    assert.equal(interfaceCount, 0, '04a must not contain full interface definition');
  });

  it('04b imports canonical (dashboard) and splits RQS-D/J', () => {
    const p = path.join(__dirname, '..', 'artifacts', 'docs', 'strategy', 'development-plan', '04b-phase-3-observability-ui-miniapp.md');
    const t = fs.readFileSync(p, 'utf8');
    assert.match(t, /tools\/telemetry\/schema\.json/);
    assert.match(t, /RQS-D.*RQS-J shadow|rqs_d_score/);
  });

  it('swarm_telemetry.js validateSpan conforms to canonical required fields', () => {
    const swarm = require(path.join(__dirname, '..', '.agents', 'scripts', 'swarm_telemetry.js'));
    const good = {
      trace_id: '11111111-1111-4111-8111-111111111111',
      span_id: '22222222-2222-4222-8222-222222222222',
      parent_span_id: null,
      timestamp: new Date().toISOString(),
      session_id: 'test',
      workflow: 'delivery/develop',
      agent_persona: 'developer',
      model: { provider: 'anthropic', model_id: 'claude-3-5-sonnet', temperature: 0 },
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20, cost_usd: null, estimated: false },
      duration_ms: 10,
      quality_scorecard: { rqs_d_score: 0.9, rqs_j_score: null, rating: 'PASS', biomarkers: { scr: 1, msha: 1, placeholder_density: 0, pci: 0, ac_testability: 1, srsr: null, scope_drift: null } },
      tier0_evaluation: { executed: true, passed: true, checks: [] },
      error: null
    };
    const v = swarm.validateSpan(good);
    assert.equal(v.valid, true);
  });
});
