#!/usr/bin/env node
// test_model_tier_guards.test.js — 02l Option A WS-3.8: INV-TEL-05 Tier B enforcement
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkTier, tierOf } = require('../tools/telemetry/modelTierGuards');

describe('model tier guards — INV-TEL-05 (02l Option A)', () => {
  it('Tier B agents demoted to Tier A triggers TIER_DEMOTION warning', () => {
    const r = checkTier('architect', 'gemini-2.0-flash');
    assert.equal(r.warning, true);
    assert.equal(r.code, 'TIER_DEMOTION');
    assert.match(r.message, /INV-TEL-05/);
  });

  it('Tier B agents with Tier B model passes', () => {
    const r = checkTier('architect', 'claude-3-5-sonnet');
    assert.equal(r.warning, false);
    assert.equal(r.allowed, true);
  });

  it('non-Tier-B agents (developer) allowed Tier A', () => {
    const r = checkTier('developer', 'gemini-2.0-flash');
    assert.equal(r.warning, false);
  });

  it('founder demoted to haiku triggers warning', () => {
    const r = checkTier('founder', 'haiku');
    assert.equal(r.warning, true);
  });

  it('security-engineer with Tier A triggers', () => {
    const r = checkTier('security-engineer', 'llama-3.3-70b');
    assert.equal(r.warning, true);
  });

  it('tech-lead with pro passes', () => {
    const r = checkTier('tech-lead', 'gpt-4o');
    assert.equal(r.warning, false);
  });

  it('tierOf correctly classifies flash→A, sonnet→B', () => {
    assert.equal(tierOf('gemini-2.0-flash'), 'A');
    assert.equal(tierOf('claude-3-5-sonnet'), 'B');
    assert.equal(tierOf('gpt-4o'), 'B');
    assert.equal(tierOf('llama-3.3-70b'), 'A');
  });

  it('unknown model returns unknown but does not false-positive demotion', () => {
    const r = checkTier('architect', 'unknown-model-xyz');
    // unknown tier should not trigger warning (conservative)
    assert.equal(r.warning, false);
  });
});
