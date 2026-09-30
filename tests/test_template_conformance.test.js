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

test('T-CONF-8 (DNA 5): §2 Research Foundation row marked Reviewed for a non-existent file fails (imported/reverse hallucination)', () => {
  // Reproduces the reported defect: imported-prototype reverse run fabricated a
  // Research Foundation table citing idea-brief.md / market-analysis.md as
  // "[x] Reviewed" though no such artifacts exist. The guard must trip.
  const prd = [
    '## 1. Executive Summary',
    'x',
    '## 2. Research Foundation',
    '| Document | Path | Status | Key Finding |',
    '|---|---|---|---|',
    '| Idea Brief | `artifacts/output/01-discovery/idea-brief.md` | [x] Reviewed | fabricated. |',
    '| Market Analysis | `artifacts/output/02-research/market-analysis.md` | [x] Reviewed | fabricated. |',
    '| Prototype Inventory | `artifacts/output/03-strategy/prototype-inventory.md` | [x] Reviewed | real. |',
    '## 3. Problem Statement', '## 4. Hypothesis of Solution', '## 5. Goals & Success Metrics',
    '## 6. Target Audience', '## 7. Feature Overview',
    '| Requirement ID | Desc |', '|---|---|', '| FR-001 | x |',
    '## 8. Non-Functional Requirements', 'NFR-001 x',
    '## 9. Timeline & Phases', '## 10. Out of Scope', '## 11. Dependencies & Risks',
    '## 12. Open Questions & Decisions', '## 13. Optional Components',
    '## 14. Evidence Ledger', 'L-01 x',
    '',
  ].join('\n');
  const us = fs.readFileSync(US_TEMPLATE, 'utf8');

  // Build a root where prototype-inventory.md exists but the research files do NOT.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tconf-dna5-'));
  fs.mkdirSync(path.join(dir, 'artifacts', 'output', '03-strategy'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts', 'output', '03-strategy', 'requirements.md'), prd);
  fs.writeFileSync(path.join(dir, 'artifacts', 'output', '03-strategy', 'user-stories.md'), us);
  fs.writeFileSync(path.join(dir, 'artifacts', 'output', '03-strategy', 'prototype-inventory.md'), 'inv');

  const r = run(['check', '--mode', 'reverse', '--root', dir,
    '--requirements', path.join(dir, 'artifacts', 'output', '03-strategy', 'requirements.md'),
    '--user-stories', path.join(dir, 'artifacts', 'output', '03-strategy', 'user-stories.md'),
    '--json']);

  assert.strictEqual(r.code, 1, `expected fabrication to fail, got exit ${r.code}\n${r.err}`);
  const failures = JSON.parse(r.out).failures.join('\n');
  // Both fabricated rows flagged.
  assert.match(failures, /idea-brief\.md.*Reviewed but that file does not exist/s);
  assert.match(failures, /market-analysis\.md.*Reviewed but that file does not exist/s);
  // The real prototype-inventory row is NOT flagged (no false positive).
  assert.ok(!/prototype-inventory\.md.*does not exist/s.test(failures), 'existing file must not be flagged');
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

// ---- AC depth floor (per Must-have story) ----
// Build a complete, gate-passing user-stories doc with one story. The self-audit
// block is provided by the caller so we can test the reasoning gate directly.
function userStoriesWithStory(acBlock, selfAuditBlock) {
  return [
    '# User Stories',
    '## Backlog Hierarchy Tree',
    '```text',
    'Epic: Demo',
    '  Feature: Thing',
    '    User Story: US-01',
    '```',
    '# Epic: Demo',
    '## Feature: Thing',
    '### User Story: As a user, I want X, so that Y',
    '- **Story ID:** US-01',
    '- **Priority:** Must-have',
    '- **Sprint:** Sprint 1',
    '- **Traces to PRD:** Section 7.3: FR-001',
    '#### Business Requirement',
    'Outcome stated.',
    '#### Technical Requirement',
    '- contract',
    '#### Acceptance Criteria',
    acBlock,
    selfAuditBlock || '',
    '## Story Dependencies Diagram',
    '```mermaid',
    'flowchart TD',
    '  US-01[US-01] --> US-02[US-02]',
    '```',
    '',
  ].join('\n');
}

function ac(id, summary) {
  return [
    `*   [ ] **${id}:** ${summary}`,
    '    *   **Given** a precondition',
    '    *   **When** an action',
    '    *   **Then** an outcome',
  ].join('\n');
}

// A fully resolved self-audit block (every category resolved to an AC ref or a
// concrete N/A reason). `overrides` lets a test corrupt specific category lines.
function selfAudit(overrides = {}) {
  const lines = {
    'Invalid / malformed input': 'AC-U1 covers wrong/missing input',
    'Empty / boundary state': 'N/A because there is no list or bounded quantity here',
    'Duplicate / idempotency': 'N/A because the action is read-only and side-effect free',
    'Concurrency / race': 'N/A because it is a single-user single-session action',
    'Auth / permission': 'AC-U1 rejects the unauthenticated case',
    'State / lifecycle': 'N/A because the entity has no lifecycle states',
    'External dependency failure': 'N/A because no external service is called',
    'Rate / abuse limits': 'N/A because there is no abusable repeated submission',
    'Data integrity': 'N/A because nothing is persisted by this story',
    'Localization / encoding': 'N/A because no free-text is stored or rendered',
    'Accessibility / device': 'N/A because handled globally in product-spec accessibility section',
    'Security': 'N/A because no sensitive data or state change is exposed',
    ...overrides,
  };
  return ['#### AC Coverage Self-Audit', ...Object.entries(lines).map(([k, v]) => `- ${k}: ${v}`)].join('\n');
}

test('T-CONF-9: a story with a complete, resolved self-audit passes at ANY AC count — including 1/1/1', () => {
  // The whole point of the reasoning gate: a small 1/1/1 story is fine IF the
  // reasoning (self-audit) is genuine. No count is forced.
  const oneEach = [
    '##### Happy Path', ac('AC-H1', 'happy'),
    '##### Unhappy Path', ac('AC-U1', 'one unhappy'),
    '##### Edge Cases', ac('AC-E1', 'one edge'),
  ].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, selfAudit()) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `1/1/1 with a genuine self-audit must pass, got exit ${r.code}\n${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
});

test('T-CONF-10: a story missing its AC Coverage Self-Audit block fails', () => {
  const oneEach = [
    '##### Happy Path', ac('AC-H1', 'happy'),
    '##### Unhappy Path', ac('AC-U1', 'one unhappy'),
    '##### Edge Cases', ac('AC-E1', 'one edge'),
  ].join('\n');
  // No self-audit block passed.
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, '') });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `missing self-audit must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /missing its "AC Coverage Self-Audit" block/);
});

test('T-CONF-11: a self-audit with a bare N/A (no reason) on a category fails — the reasoning was not done', () => {
  const oneEach = [
    '##### Happy Path', ac('AC-H1', 'happy'),
    '##### Unhappy Path', ac('AC-U1', 'one unhappy'),
    '##### Edge Cases', ac('AC-E1', 'one edge'),
  ].join('\n');
  // Corrupt one category to a bare N/A and another to a leftover placeholder.
  const audit = selfAudit({ 'Security': 'N/A', 'Data integrity': '<AC-E3 | N/A because ...>' });
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, audit) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `bare N/A / placeholder must fail, got exit ${r.code}\n${r.err}`);
  const failures = JSON.parse(r.out).failures.join('\n');
  assert.match(failures, /"Security" is not resolved/);
  assert.match(failures, /"Data integrity" is not resolved/);
});

test('T-CONF-12: a self-audit missing a category line fails (all 12 must be addressed)', () => {
  const oneEach = [
    '##### Happy Path', ac('AC-H1', 'happy'),
    '##### Unhappy Path', ac('AC-U1', 'one unhappy'),
    '##### Edge Cases', ac('AC-E1', 'one edge'),
  ].join('\n');
  // Drop the Security line entirely.
  const full = selfAudit();
  const missingSecurity = full.split('\n').filter((l) => !/^- Security:/.test(l)).join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, missingSecurity) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `missing category line must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /missing the "Security" category line/);
});

test('T-CONF-13: a large story (5 unhappy) with a resolved self-audit also passes — the gate does not forbid depth either', () => {
  const deep = [
    '##### Happy Path', ac('AC-H1', 'h'),
    '##### Unhappy Path', ac('AC-U1', 'u'), ac('AC-U2', 'u'), ac('AC-U3', 'u'), ac('AC-U4', 'u'), ac('AC-U5', 'u'),
    '##### Edge Cases', ac('AC-E1', 'e'), ac('AC-E2', 'e'),
  ].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(deep, selfAudit()) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `deep story with resolved self-audit must pass, got exit ${r.code}\n${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
});

