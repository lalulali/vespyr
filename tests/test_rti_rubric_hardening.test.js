#!/usr/bin/env node
/**
 * tests/test_rti_rubric_hardening.test.js — 02o.5 (B12).
 *
 * Names the anti-gaming guarantees of the hardened req_to_impl rubric:
 * pattern-stuffed and lorem outputs are red; a genuine trace output passes;
 * scope-creep phrases are prohibited; delivery fixtures carry the
 * fixture-tier label + 02l forward-note (B15).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { evaluateTier1 } = require(path.join(ROOT, 'tools', 'eval', 'tier1-judge'));
const benchmark = { id: 'RTI-TEST', dimension: 'req_to_impl' };

function delivery() {
  return require(path.join(ROOT, 'evals', 'suites', 'skills', 'delivery.json'));
}

test('RTI hardening: pattern-stuffed output is red', async () => {
  const stuffed = { output: 'US-114 acceptance criteria implemented. '.repeat(12) };
  const res = await evaluateTier1(benchmark, stuffed);
  assert.equal(res.pass, false, `stuffed output must fail, got ${res.score}`);
  assert.ok(res.score < 4);
});

test('RTI hardening: lorem output is red', async () => {
  const lorem = { output: 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua '.repeat(6).trim() };
  const res = await evaluateTier1(benchmark, lorem);
  assert.equal(res.pass, false);
  assert.ok(res.score < 4);
});

test('RTI hardening: a genuine trace output satisfies all four criteria', async () => {
  const bm = delivery().benchmarks.find((b) => b.id === 'SKILL-DEVELOP-COVERAGE');
  assert.ok(bm, 'coverage fixture benchmark exists');
  const res = await evaluateTier1(benchmark, { output: bm.mockOutput });
  assert.equal(res.pass, true, JSON.stringify(res.criteriaResults));
  assert.equal(res.score, 5);
});

test('RTI-2: scope-creep phrases are prohibited', async () => {
  const creep = { output: 'US-114 acceptance criteria covered. AC-1 tested per the spec. Also added an unrequested feature: dark mode. ' + 'details '.repeat(20) };
  const res = await evaluateTier1(benchmark, creep);
  assert.equal(res.criteriaResults.find((c) => c.id === 'RTI-2').passed, false);
});

test('delivery fixtures: SKILL-DEVELOP-TRACE is fixture-tier with the 02l forward-note (B15)', () => {
  const bm = delivery().benchmarks.find((b) => b.id === 'SKILL-DEVELOP-TRACE');
  assert.equal(bm.tier, 'fixture-tier');
  assert.match(bm.forwardNote, /02l/);
  assert.match(bm.forwardNote, /02p/);
});

test('delivery fixtures: the coverage benchmark is labeled fixture-tier with the 02l forward-note', () => {
  const bm = delivery().benchmarks.find((b) => b.id === 'SKILL-DEVELOP-COVERAGE');
  assert.equal(bm.tier, 'fixture-tier');
  assert.match(bm.forwardNote, /02l/);
});
