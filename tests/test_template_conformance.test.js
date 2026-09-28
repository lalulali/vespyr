'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents', 'scripts', 'template_conformance.js');
const PRD_TEMPLATE = path.join(ROOT, '.agents', 'templates', 'product', 'prd-template.md');
const US_TEMPLATE = path.join(ROOT, '.agents', 'templates', 'product', 'user-story-template.md');

function run(args) {
  const res = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: res.status, out: res.stdout || '', err: res.stderr || '' };
}

function tmp(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tconf-'));
  const files = {};
  for (const [name, body] of Object.entries(contents)) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, body);
    files[name] = p;
  }
  return { dir, files };
}

// A minimal but conformant pair, generated from the canonical templates so the
// test tracks the templates rather than a frozen copy.
function conformantPair() {
  return {
    'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'),
    'user-stories.md': fs.readFileSync(US_TEMPLATE, 'utf8'),
  };
}

test('T-CONF-1: canonical templates pass in reverse mode (strictest, no false positives)', () => {
  const { files } = tmp(conformantPair());
  const r = run(['check', '--mode', 'reverse', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md']]);
  assert.strictEqual(r.code, 0, `expected pass, got:\n${r.err}`);
});

test('T-CONF-2: off-template PRD (few sections, no FR table) fails', () => {
  const offPrd = [
    '# Product Requirements Document — Demo',
    '## 1. Product Overview & Strategic Outcome',
    'Some overview prose.',
    '## 2. Target Personas',
    'Persona prose.',
    '## 3. Scope & Non-Goals',
    'Scope prose.',
    '## 4. Evidence Ledger',
    '| ID | Statement | Anchor | Type | Status |',
    '| L-01 | thing | a.html#x | prototype | confirmed |',
    '',
  ].join('\n');
  const { files } = tmp({ 'requirements.md': offPrd, 'user-stories.md': fs.readFileSync(US_TEMPLATE, 'utf8') });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, 'expected fail exit 1');
  const parsed = JSON.parse(r.out);
  assert.strictEqual(parsed.ok, false);
  // Must flag missing FR table and missing NFR rows specifically.
  const joined = parsed.failures.join('\n');
  assert.match(joined, /Functional Requirements table/);
  assert.match(joined, /Non-Functional Requirements/);
});

test('T-CONF-3: flat user-stories ("story matrix", no Epic/Feature/Gherkin) fails', () => {
  const flatStories = [
    '# User Stories — Demo',
    '## Story Matrix Summary',
    '| Story ID | Title |',
    '| US-01 | Header |',
    '',
    '### US-01: Header',
    '**As a** user, **I want** a header, **so that** I can navigate.',
    '#### Acceptance Criteria',
    '- When loading, the header shows.',
    '',
  ].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': flatStories });
  const r = run(['check', '--mode', 'reverse', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, 'expected fail exit 1');
  const parsed = JSON.parse(r.out);
  const joined = parsed.failures.join('\n');
  assert.match(joined, /Epic:/);
  assert.match(joined, /Feature:/);
  assert.match(joined, /Given\/When\/Then/);
  assert.match(joined, /Story ID:/);
});

test('T-CONF-4: reverse mode requires §14 Evidence Ledger; create mode does not', () => {
  // Build a PRD that has §§1–13 but not §14.
  const tmplBody = fs.readFileSync(PRD_TEMPLATE, 'utf8');
  const without14 = tmplBody.replace(/^## 14\..*$/m, '## (ledger intentionally removed for test)');
  const us = fs.readFileSync(US_TEMPLATE, 'utf8');

  const a = tmp({ 'requirements.md': without14, 'user-stories.md': us });
  const rev = run(['check', '--mode', 'reverse', '--requirements', a.files['requirements.md'], '--user-stories', a.files['user-stories.md'], '--json']);
  assert.strictEqual(rev.code, 1, 'reverse should fail without §14');
  assert.match(JSON.parse(rev.out).failures.join('\n'), /§14/);

  const b = tmp({ 'requirements.md': without14, 'user-stories.md': us });
  const cre = run(['check', '--mode', 'create', '--requirements', b.files['requirements.md'], '--user-stories', b.files['user-stories.md'], '--json']);
  assert.strictEqual(cre.code, 0, `create should pass without §14, got:\n${cre.err}`);
});

test('T-CONF-5: missing files fail loudly, never silent-pass', () => {
  const r = run(['check', '--mode', 'create', '--requirements', '/nonexistent/requirements.md', '--user-stories', '/nonexistent/user-stories.md']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /file not found/);
});

test('T-CONF-6 (CR-3): keyword-smeared prose (all tokens present but not co-located) fails', () => {
  // Every required marker appears SOMEWHERE, but no story block owns a real
  // Given→When→Then triplet. The pre-fix gate passed this; it must now fail.
  const smear = [
    '# User Stories — Demo',
    '## Backlog Hierarchy Tree',
    '```text',
    'Epic: Demo',
    '  Feature: Thing',
    '```',
    '# Epic: Demo',
    '## Feature: Thing',
    'Story ID: US-01 Priority: High Sprint: 1 — Traces to PRD FR-001.',
    'Business Requirement and Technical Requirement are noted here.',
    'Acceptance tokens used loosely: **Given** the app, later somewhere **Then** it works, and separately **When** clicked.',
    'Classes: AC-H1, AC-U1, AC-E1 mentioned in a table row.',
    '## Story Dependencies Diagram',
    '```mermaid',
    'graph TD; US-01-->US-02;',
    '```',
    '',
  ].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': smear });
  const r = run(['check', '--mode', 'reverse', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, 'keyword-smear must fail');
  assert.match(JSON.parse(r.out).failures.join('\n'), /co-located|complete Given→When→Then/);
});

test('T-CONF-7 (CR-4): unknown --mode fails with exit 2, never silent-degrades to create', () => {
  const { files } = tmp(conformantPair());
  const r = run(['check', '--mode', 'GARBAGE', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md']]);
  assert.strictEqual(r.code, 2, 'unknown mode must exit 2');
  assert.match(r.err, /unknown --mode/);
});
