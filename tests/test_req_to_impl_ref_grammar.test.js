#!/usr/bin/env node
/**
 * tests/test_req_to_impl_ref_grammar.test.js — defect D1 (fixed 2026-09-23).
 *
 * B1 claims evidence refs reuse the frozen A11 grammar. This proves the sweep
 * and the parity checker share ONE grammar implementation: absolute paths,
 * `..` escapes, empty ids, and unknown symbols are all rejected identically.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { resolveRef } = require(path.join(ROOT, '.agents', 'scripts', 'req_to_impl_check.js'));
const { resolveAnchor } = require(path.join(ROOT, '.agents', 'scripts', 'spec_parity.js'));

const VALID = 'evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js#allowRequest';

test('D1: absolute-path refs rejected, same verdict as spec_parity', () => {
  assert.equal(resolveRef(ROOT, '/etc/hosts#localhost').ok, false);
  assert.equal(resolveAnchor(ROOT, '/etc/hosts#localhost').ok, false);
  assert.equal(resolveRef(ROOT, '/etc/hosts:1').ok, false, 'absolute line refs rejected');
});

test('D1: repo escapes and empty ids rejected', () => {
  assert.equal(resolveRef(ROOT, '../../etc/passwd#x').ok, false);
  assert.equal(resolveRef(ROOT, 'package.json#').ok, false);
  assert.equal(resolveRef(ROOT, '../../secret:1').ok, false);
});

test('D1: unknown symbols rejected; valid refs resolve identically to spec_parity (one grammar)', () => {
  assert.equal(resolveRef(ROOT, 'evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js#no-such-symbol').ok, false);
  const r = resolveRef(ROOT, VALID);
  assert.equal(r.ok, true);
  assert.equal(r.ok, resolveAnchor(ROOT, VALID).ok, 'shared grammar implementation');
});

test('D1: AC cross-refs stay row-keys; valid line refs resolve', () => {
  assert.equal(resolveRef(ROOT, 'AC-1').kind, 'ac-cross-ref');
  assert.equal(resolveRef(ROOT, 'evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js:5').ok, true);
});
