#!/usr/bin/env node
/**
 * tests/test_reverse_prd_fixture.test.js — 02n.F fixture integrity.
 *
 * Guards the reverse-PRD dry-run fixture against drift:
 *   - Every manifest anchor resolves against the prototype per the frozen
 *     A11 `path#id` grammar (02n plan §3).
 *   - All 10 detail classes carry seeded behaviors.
 *   - The kernel carries the canonical 5 fields (Review 10 §4 input anchor).
 *   - The State Switcher's 3 critical state moments exist (Review 10 §4).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'evals', 'fixtures', 'prototypes', 'reverse-prd');
const PROTOTYPE = path.join(DIR, 'workspace-members.html');
const MANIFEST = path.join(DIR, 'SEEDED-BEHAVIORS.md');
const KERNEL = path.join(DIR, 'SPEC.md');

const ANCHOR_RE = /^[A-Za-z0-9._/-]+#[A-Za-z][A-Za-z0-9._:-]*$/;
const CLASSES = [
  'Screen states',
  'Edge cases & validation',
  'Data fields & types',
  'Permissions & auth',
  'Navigation & flows',
  'Copy & tone',
  'Telemetry',
  'Performance notes',
  'Accessibility',
  'Platform constraints',
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function manifestRows() {
  const md = fs.readFileSync(MANIFEST, 'utf8');
  const rows = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\| \d+ \| `([^`]+)` \| ([^|]+) \|/);
    if (m) rows.push({ anchor: m[1], cls: m[2].trim() });
  }
  return rows;
}

function resolves(anchor) {
  if (!ANCHOR_RE.test(anchor)) return false;
  const i = anchor.indexOf('#');
  const file = path.join(ROOT, anchor.slice(0, i));
  const id = anchor.slice(i + 1);
  if (!fs.existsSync(file)) return false;
  const content = fs.readFileSync(file, 'utf8');
  if (/\.(html?|svg)$/i.test(file)) {
    return new RegExp(`id=["']${escapeRe(id)}["']`).test(content);
  }
  return new RegExp(`(^|[^A-Za-z0-9_-])${escapeRe(id)}([^A-Za-z0-9_-]|$)`).test(content);
}

test('02n.F fixture: manifest anchors resolve per the frozen A11 grammar', () => {
  const rows = manifestRows();
  assert.ok(rows.length >= 40, `expected a rich fixture, got ${rows.length} seeded behaviors`);
  const bad = rows.filter((r) => !resolves(r.anchor));
  assert.deepEqual(bad, [], `unresolvable anchors: ${bad.map((r) => r.anchor).join(', ')}`);
});

test('02n.F fixture: all 10 detail classes are seeded', () => {
  const rows = manifestRows();
  const counts = new Map(CLASSES.map((c) => [c, 0]));
  for (const r of rows) {
    assert.ok(counts.has(r.cls), `unknown detail class "${r.cls}" in manifest`);
    counts.set(r.cls, counts.get(r.cls) + 1);
  }
  const uncovered = [...counts.entries()].filter(([, n]) => n === 0).map(([c]) => c);
  assert.deepEqual(uncovered, [], `classes without seeded behaviors: ${uncovered.join(', ')}`);
});

test('02n.F fixture: prototype carries the 3 critical state moments + switcher', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  for (const id of ['state-switcher', 'state-empty', 'state-populated', 'state-error']) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
});

test('02n.F fixture: SPEC kernel carries the canonical 5 fields', () => {
  const kernel = fs.readFileSync(KERNEL, 'utf8');
  for (const heading of ['## 1. Why', '## 2. Capabilities', '## 3. Constraints', '## 4. Non-goals', '## 5. Success signal']) {
    assert.ok(kernel.includes(heading), `kernel missing "${heading}"`);
  }
});
