#!/usr/bin/env node
/**
 * tests/test_review10_governance.test.js — 02n.10 (Review 10 §5 Sprint 3).
 *
 * The governance fold is content, so the probe asserts the invariants are
 * actually present in the persona/guideline files — not that a document claims
 * they were added.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('Review 10 governance: @founder carries the two valid responses, half-sprint ban, freeze boundary', () => {
  const s = read('.agents/agents/founder.md');
  assert.match(s, /two valid responses/i);
  assert.match(s, /Half-Sprint, Half-Pivot mutant is banned/);
  assert.match(s, /Freeze Boundary/);
});

test('Review 10 governance: @code-reviewer rejects undelted contract shifts and rogue UI values', () => {
  const s = read('.agents/agents/code-reviewer.md');
  assert.match(s, /\[DELTA-NN\]/);
  assert.match(s, /AC-E\*/);
  assert.match(s, /rogue UI values/i);
  assert.match(s, /Rule-of-Any-One/);
});

test('Review 10 governance: developer guidelines carry the 2-Tier Iteration Filter + Phase Boundary Rule', () => {
  const s = read('.agents/references/developer-guidelines.md');
  assert.match(s, /2-Tier Iteration Filter/);
  assert.match(s, /Phase Boundary Rule/);
  assert.match(s, /\[DELTA-NN\]/);
});

test('Review 10 governance: GUARDRAILS carry the Freeze Boundary + Rule of Any One', () => {
  const s = read('.agents/GUARDRAILS.md');
  assert.match(s, /## Freeze Boundary & Rule of Any One/);
  assert.match(s, /Spike Rollback/);
  assert.match(s, /half-sprint\/half-pivot mutant is banned/);
});

test('Review 10 governance: changelog records the governance fold', () => {
  const s = read('changelog.md');
  assert.match(s, /Freeze Boundary and Rule of Any One are now swarm-wide guardrails/);
});
