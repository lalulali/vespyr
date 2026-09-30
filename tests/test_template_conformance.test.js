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

// A minimal PRD whose §14 ledger carries the given `[DEFERRED TO SPEC]` rows.
// Defined up here because non-R4 reverse-mode tests need a deferred-free
// variant, and PRD_TEMPLATE ships an L-03 deferred row of its own.
function prdWithDeferred(ids) {
  const rows = ids.map((id) => `| ${id} | some bound | \`proto.html#x\` | prototype | \`[DEFERRED TO SPEC]\` |`).join('\n');
  return [
    '## 1. Executive Summary', 'x',
    '## 2. Research Foundation', '| Document | Path | Status | Key Finding |', '|---|---|---|---|',
    '| Prototype Inventory | `artifacts/output/03-strategy/prototype-inventory.md` | [x] Reviewed | real. |',
    '## 3. Problem Statement', '## 4. Hypothesis of Solution', '## 5. Goals & Success Metrics',
    '## 6. Target Audience', '## 7. Feature Overview', '| Requirement ID | Desc |', '|---|---|', '| FR-001 | x |',
    '## 8. Non-Functional Requirements', 'NFR-001 x',
    '## 9. Timeline & Phases', '## 10. Out of Scope', '## 11. Dependencies & Risks',
    '## 12. Open Questions & Decisions', '## 13. Optional Components',
    '## 14. Evidence Ledger',
    '| ID | Statement | Anchor | Type | Status |', '|---|---|---|---|---|',
    '| L-01 | witnessed | `proto.html#a` | prototype | confirmed |',
    rows,
    '',
  ].join('\n');
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
// A Feature must carry a state model since R3 (2026-09-30). One per Feature,
// with at least one illegal transition and a criterion naming each one.
function stateModel(illegalRows = [['pending', 'submit', 'pending', 'AC-U1']]) {
  const rows = [
    '| draft | submit | pending | yes | — |',
    ...illegalRows.map(([f, e, t, ac]) => `| ${f} | ${e} | ${t} | no | ${ac} |`),
  ];
  return [
    '#### State Model',
    '**Entity:** Widget',
    '| From | Event | To | Legal | Criteria |',
    '|------|-------|----|-------|----------|',
    ...rows,
  ].join('\n');
}

function userStoriesWithStory(acBlock, selfAuditBlock, featureExtra = stateModel()) {
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
    featureExtra,
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
// All 16 categories since 2026-09-30 (write-ordering, clock/time, degraded
// capability and observability were added — QA was already catching them
// downstream with nowhere upstream to record the answer).
function selfAudit(overrides = {}) {
  const lines = {
    'Invalid / malformed input': 'AC-U1 covers wrong/missing input',
    'Empty / boundary state': 'N/A because there is no list or bounded quantity here',
    'Duplicate / idempotency': 'N/A because the action is read-only and side-effect free',
    'Concurrency / race': 'N/A because it is a single-user single-session action',
    'Write ordering / partial failure': 'N/A because this is a single atomic write',
    'Auth / permission': 'AC-U1 rejects the unauthenticated case',
    'State / lifecycle': 'N/A because the entity has no lifecycle states',
    'External dependency failure': 'N/A because no external service is called',
    'Rate / abuse limits': 'N/A because there is no abusable repeated submission',
    'Data integrity': 'N/A because nothing is persisted by this story',
    'Clock / time': 'N/A because the outcome does not depend on elapsed time',
    'Localization / encoding': 'N/A because no free-text is stored or rendered',
    'Accessibility / device': 'N/A because handled globally in product-spec accessibility section',
    'Degraded capability': 'N/A because the platform always provides the capability',
    'Observability': 'N/A because this view emits no event and adds no metric',
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
  assert.match(JSON.parse(r.out).failures.join('\n'), /missing its "#### AC Coverage Self-Audit" heading/);
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

// ---- R1: referential integrity of the self-audit (2026-09-30) ----

// A PRD with NO deferred rows, for tests that are not exercising R4. Using
// PRD_TEMPLATE here would drag in its L-03 `[DEFERRED TO SPEC]` row and make
// every reverse-mode test fail for a reason unrelated to what it tests.
const PRD_NO_DEFERRED = prdWithDeferred([]);

// R4 fixtures live in a temp root so the §2 prototype-inventory row resolves on
// disk — otherwise the pre-existing DNA 5 no-fabrication check fires first and
// masks the R4 assertion.
function tmpWithInventory(contents) {
  const { dir, files } = tmp(contents);
  fs.mkdirSync(path.join(dir, 'artifacts', 'output', '03-strategy'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts', 'output', '03-strategy', 'prototype-inventory.md'), 'inv');
  return { dir, files };
}

test('T-CONF-14 (R1): a self-audit citing an AC the story never defines fails', () => {
  // The category was "resolved" on paper against a criterion that does not
  // exist. This is the defect a resolution-only check cannot see.
  const oneEach = ['##### Happy Path', ac('AC-H1', 'h'), '##### Unhappy Path', ac('AC-U1', 'u')].join('\n');
  const audit = selfAudit({ 'State / lifecycle': 'AC-U9 covers the expired state' }); // AC-U9 undefined
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, audit) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `dangling AC reference must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /cites acceptance criteria that the story does not define.*AC-U9/);
});

test('T-CONF-15 (R1): a story with a resolved self-audit but zero defined ACs fails', () => {
  // Floor of ONE, not a quota — a simple story still passes with one AC.
  const audit = selfAudit({ 'Invalid / malformed input': 'N/A because this story takes no input at all' });
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory('(no criteria written)', audit) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `a story with no ACs must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /defines no acceptance criteria/);
});

// ---- R2: source tags, reverse mode only ----

// Three AC classes, so the pre-existing doc-level AC-H/U/E floor is satisfied.
// Depth is still never counted — this is a shape requirement, not a quota.
function threeACs() {
  return [
    '##### Happy Path', ac('AC-H1', 'h'),
    '##### Unhappy Path', ac('AC-U1', 'u'),
    '##### Edge Cases', ac('AC-E1', 'e'),
  ].join('\n');
}

function tagged(id, summary) {
  return [
    `*   [ ] **${id}:** ${summary} \`[derived]\``,
    '    *   **Given** a precondition',
    '    *   **When** an action',
    '    *   **Then** an outcome',
  ].join('\n');
}

test('T-CONF-16 (R2): reverse mode requires a [prototype L-NN] or [derived] tag on every AC', () => {
  const untagged = threeACs();
  const { files } = tmpWithInventory({ 'requirements.md': PRD_NO_DEFERRED, 'user-stories.md': userStoriesWithStory(untagged, selfAudit()) });
  const r = run(['check', '--mode', 'reverse', '--root', path.dirname(files['requirements.md']), '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `untagged ACs must fail in reverse mode, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /no source tag/);
});

test('T-CONF-17 (R2): create mode does not require source tags (there is no ledger to cite)', () => {
  const untagged = threeACs();
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(untagged, selfAudit()) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `create mode must not demand tags, got exit ${r.code}\n${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
});

test('T-CONF-18 (R2): a fully tagged reverse-mode story passes', () => {
  const all = ['##### Happy Path', tagged('AC-H1', 'h'), '##### Unhappy Path', tagged('AC-U1', 'u'), '##### Edge Cases', tagged('AC-E1', 'e')].join('\n');
  const { files } = tmpWithInventory({ 'requirements.md': PRD_NO_DEFERRED, 'user-stories.md': userStoriesWithStory(all, selfAudit()) });
  const r = run(['check', '--mode', 'reverse', '--root', path.dirname(files['requirements.md']), '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `tagged reverse story must pass, got exit ${r.code}\n${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
});

// ---- R3: Feature state model ----

test('T-CONF-19 (R3): a Feature with no state model fails', () => {
  const oneEach = ['##### Happy Path', ac('AC-H1', 'h'), '##### Unhappy Path', ac('AC-U1', 'u')].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, selfAudit(), '(no state model here)') });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `missing state model must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /missing its "#### State Model"/);
});

test('T-CONF-20 (R3): an illegal transition with no criterion fails — that is the whole point', () => {
  const oneEach = ['##### Happy Path', ac('AC-H1', 'h'), '##### Unhappy Path', ac('AC-U1', 'u')].join('\n');
  // Illegal row whose Criteria cell is a dash instead of an AC.
  const sm = stateModel([['pending', 'submit', 'pending', '—']]);
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, selfAudit(), sm) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `uncovered illegal transition must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /illegal but 1 of them have no acceptance criterion/);
});

test('T-CONF-21 (R3): a state model listing zero illegal transitions fails', () => {
  const oneEach = ['##### Happy Path', ac('AC-H1', 'h'), '##### Unhappy Path', ac('AC-U1', 'u')].join('\n');
  const sm = stateModel([]); // only the legal row
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, selfAudit(), sm) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `a model with no illegal transitions must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /lists no ILLEGAL transitions/);
});

// ---- R4: deferred-evidence focus, reverse mode only ----

// R4 tests run in reverse mode, so their criteria must also satisfy R2's
// source-tag rule — otherwise R2 fires first and masks the R4 assertion.
function threeACsTagged() {
  return [
    '##### Happy Path', tagged('AC-H1', 'h'),
    '##### Unhappy Path', tagged('AC-U1', 'u'),
    '##### Edge Cases', tagged('AC-E1', 'e'),
  ].join('\n');
}

test('T-CONF-22 (R4): a [DEFERRED TO SPEC] ledger row missing from the focus block fails in reverse mode', () => {
  const oneEach = threeACsTagged();
  // No Deferred-Evidence AC Focus block at all.
  const { files } = tmpWithInventory({ 'requirements.md': prdWithDeferred(['L-07']), 'user-stories.md': userStoriesWithStory(oneEach, selfAudit()) });
  const r = run(['check', '--mode', 'reverse', '--root', path.dirname(files['requirements.md']), '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `missing focus block must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /Deferred-Evidence AC Focus/);
});

test('T-CONF-23 (R4): every deferred row must be named in the focus block', () => {
  const oneEach = threeACsTagged();
  const focus = ['## Deferred-Evidence AC Focus (reverse mode only)', '', '| Ledger row | What no prototype could witness | Covered by |', '|---|---|---|', '| L-07 | telemetry never emitted | AC-U1 |', ''].join('\n');
  const withFocus = userStoriesWithStory(oneEach, selfAudit()) + '\n' + focus;
  // L-09 is deferred but absent from the focus block.
  const { files } = tmpWithInventory({ 'requirements.md': prdWithDeferred(['L-07', 'L-09']), 'user-stories.md': withFocus });
  const r = run(['check', '--mode', 'reverse', '--root', path.dirname(files['requirements.md']), '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `an unnamed deferred row must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /L-09 is `\[DEFERRED TO SPEC\]` but does not appear in the ".*Deferred-Evidence AC Focus/);
});

test('T-CONF-24 (R4): a fully answered focus block passes, and create mode never asks for it', () => {
  const oneEach = threeACsTagged();
  const focus = ['## Deferred-Evidence AC Focus (reverse mode only)', '', '| Ledger row | Cover |', '|---|---|', '| L-07 | AC-U1 |', '| L-09 | AC-U1 |', ''].join('\n');
  const withFocus = userStoriesWithStory(oneEach, selfAudit()) + '\n' + focus;
  const a = tmpWithInventory({ 'requirements.md': prdWithDeferred(['L-07', 'L-09']), 'user-stories.md': withFocus });
  const rev = run(['check', '--mode', 'reverse', '--root', path.dirname(a.files['requirements.md']), '--requirements', a.files['requirements.md'], '--user-stories', a.files['user-stories.md'], '--json']);
  assert.strictEqual(rev.code, 0, `fully answered focus must pass, got exit ${rev.code}\n${JSON.stringify(JSON.parse(rev.out || '{}').failures)}`);

  // create mode: deferred rows exist in the PRD but the block is not required
  const b = tmpWithInventory({ 'requirements.md': prdWithDeferred(['L-07']), 'user-stories.md': userStoriesWithStory(oneEach, selfAudit()) });
  const cre = run(['check', '--mode', 'create', '--root', path.dirname(b.files['requirements.md']), '--requirements', b.files['requirements.md'], '--user-stories', b.files['user-stories.md'], '--json']);
  assert.strictEqual(cre.code, 0, `create mode must not require the focus block, got exit ${cre.code}\n${JSON.stringify(JSON.parse(cre.out || '{}').failures)}`);
});

// ---- R5: reasoning smells are WARNINGS and never fail the build ----

test('T-CONF-25 (R5): reasoning smells print as warnings and do NOT change the exit code', () => {
  // 16 categories, all reasoned away with no criterion, and a uniform count.
  const heavy = {};
  for (const k of Object.keys(JSON.parse('{}'))) void k;
  const allNa = {
    'Invalid / malformed input': 'N/A because nothing here validates anything',
    'Empty / boundary state': 'N/A because nothing here has a boundary',
    'Duplicate / idempotency': 'N/A because nothing here repeats',
    'Concurrency / race': 'N/A because nothing here races',
    'Write ordering / partial failure': 'N/A because nothing here orders writes',
    'Auth / permission': 'N/A because nothing here checks auth',
    'State / lifecycle': 'N/A because nothing here has states',
    'External dependency failure': 'N/A because nothing here calls out',
    'Rate / abuse limits': 'N/A because nothing here can be abused',
    'Data integrity': 'N/A because nothing here persists',
    'Clock / time': 'N/A because nothing here reads a clock',
    'Localization / encoding': 'N/A because nothing here renders text',
    'Accessibility / device': 'N/A because nothing here is interactive',
    'Degraded capability': 'N/A because nothing here needs a platform',
    'Observability': 'N/A because nothing here emits an event',
    'Security': 'N/A because nothing here touches data',
  };
  void heavy;
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), selfAudit(allNa)) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `a reasoning smell must NOT fail the build, got exit ${r.code}\n${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
  const parsed = JSON.parse(r.out);
  assert.ok(Array.isArray(parsed.warnings), 'warnings array must be present in JSON output');
  assert.ok(parsed.warnings.some((w) => /risk categories N\/A/.test(w)), `expected an N\/A-heavy warning, got ${JSON.stringify(parsed.warnings)}`);
});

test('T-CONF-26 (R5): the same N/A reason reused across 3+ stories is flagged as a smell', () => {
  const oneAC = threeACs();
  const shared = selfAudit({ 'Empty / boundary state': 'N/A because nothing renders a list' });
  const mkStory = (id) => userStoriesWithStory(oneAC, shared).replace(/US-01/g, id);
  const doc = mkStory('US-01') + '\n' + mkStory('US-02') + '\n' + mkStory('US-03');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': doc });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `repeated-reason smell must not fail the build, got exit ${r.code}`);
  assert.ok(JSON.parse(r.out).warnings.some((w) => /is used by 3 stories/.test(w)), 'expected a repeated-reason warning');
});

test('T-CONF-27 (R5): a uniform AC count across stories is flagged as a smell', () => {
  const oneAC = threeACs();
  const mkStory = (id) => userStoriesWithStory(oneAC, selfAudit()).replace(/US-01/g, id);
  const doc = mkStory('US-01') + '\n' + mkStory('US-02') + '\n' + mkStory('US-03');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': doc });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `uniform-count smell must not fail the build, got exit ${r.code}`);
  assert.ok(JSON.parse(r.out).warnings.some((w) => /define exactly 3 acceptance criteria/.test(w)), 'expected a uniform-count warning');
});

test('T-CONF-28: the 4 added risk categories are required, not optional', () => {
  // Guards the fix that motivated them: QA already asks "out of order" and
  // "delayed", so the design sweep must have somewhere to record the answer.
  const oneEach = ['##### Happy Path', ac('AC-H1', 'h'), '##### Unhappy Path', ac('AC-U1', 'u')].join('\n');
  for (const cat of ['Write ordering / partial failure', 'Clock / time', 'Degraded capability', 'Observability']) {
    const full = selfAudit();
    const without = full.split('\n').filter((l) => !l.startsWith(`- ${cat}:`)).join('\n');
    const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(oneEach, without) });
    const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
    assert.strictEqual(r.code, 1, `omitting "${cat}" must fail, got exit ${r.code}`);
    assert.match(JSON.parse(r.out).failures.join('\n'), new RegExp(`missing the "${cat}" category line`));
  }
});


// ---------------------------------------------------------------------------
// 2026-09-30 audit follow-up. An independent audit found these paths had NO
// test coverage (15 mutation-test survivors proved it: the rules could be
// broken and the suite stayed green). Each test below pins one of them, and
// each names the defect it prevents from coming back.
// ---------------------------------------------------------------------------

/** T-CONF-29 (R3): the Criteria column must name criteria that EXIST. */
test('T-CONF-29 (R3): a state model pointing at a criterion the document never defines fails', () => {
  // The flagship rule checked the Criteria cell with a bare text pattern, so
  // "AC-U99" satisfied it while forbidding nothing. The whole point of the rule
  // is that the named criterion does something.
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), selfAudit(), stateModel([['pending', 'submit', 'pending', 'AC-U99']])) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `ghost criterion must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /never defines.*AC-U99/s);
});

test('T-CONF-30 (R3): a real criterion in the Criteria column passes', () => {
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), selfAudit(), stateModel([['pending', 'submit', 'pending', 'AC-U1']])) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `resolvable criterion must pass, got ${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
});

test('T-CONF-31 (R3): legal transitions written in plain English are recognised, not silently dropped', () => {
  // The Legal vocabulary was a closed 4-token set (no|illegal|x|✗). A row marked
  // "N" or "not allowed" was DROPPED, so a document could mark a transition
  // illegal in ordinary English and the rule counted zero illegal transitions.
  const { files } = tmp({
    'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'),
    'user-stories.md': userStoriesWithStory(threeACs(), selfAudit(), stateModel([
      ['pending', 'submit', 'pending', 'AC-U1'],
      ['paid', 'refund', 'refunded', 'AC-E1'],
    ])),
  });
  const doc = fs.readFileSync(files['user-stories.md'], 'utf8')
    .replace('| pending | submit | pending | no | AC-U1 |', '| pending | submit | pending | N | AC-U1 |')
    .replace('| paid | refund | refunded | no | AC-E1 |', '| paid | refund | refunded | not allowed | AC-E1 |');
  const { files: f2 } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': doc });
  const r = run(['check', '--mode', 'create', '--requirements', f2['requirements.md'], '--user-stories', f2['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `"N" and "not allowed" must be read as illegal and covered, got ${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
  void files;
});

test('T-CONF-32 (R3): an unreadable Legal value fails closed instead of being guessed at', () => {
  // "probably not" is not a legal/illegal value. Guessing "probably illegal"
  // would hide a real gap; guessing "probably legal" would invent one.
  const sm = [
    '#### State Model',
    '**Entity:** Widget',
    '| From | Event | To | Legal | Criteria |',
    '|------|-------|----|-------|----------|',
    '| draft | submit | pending | yes | — |',
    '| pending | submit | pending | no | AC-U1 |',
    '| paid | refund | refunded | probably not | AC-E1 |',
  ].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), selfAudit(), sm) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `unreadable Legal value must fail, got exit ${r.code}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /unreadable Legal value/);
});

test('T-CONF-33 (R3): adding a column does not shift the Legal/Criteria lookup', () => {
  // Columns were hard-indexed (cells[3], cells[4]). Inserting one column made the
  // gate report "no acceptance criterion in the Criteria column" while the
  // criterion sat one column over — a false failure pointing at the wrong cell.
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), selfAudit(), stateModel([['pending', 'submit', 'pending', 'AC-U1 | me']])) });
  const doc = fs.readFileSync(files['user-stories.md'], 'utf8')
    .replace('| From | Event | To | Legal | Criteria |', '| From | Event | To | Legal | Criteria | Owner |')
    .replace('| draft | submit | pending | yes | — |', '| draft | submit | pending | yes | — | me |')
    .replace('| pending | submit | pending | no | AC-U1 | me |', '| pending | submit | pending | no | AC-U1 | me |');
  const { files: f2 } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': doc });
  const r = run(['check', '--mode', 'create', '--requirements', f2['requirements.md'], '--user-stories', f2['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 0, `an extra column must not break the lookup, got ${JSON.stringify(JSON.parse(r.out || '{}').failures)}`);
});

test('T-CONF-34 (R3): a state model hidden in a code fence does not satisfy the rule', () => {
  // No fence stripping existed, so wrapping the heading + table in ```text made
  // an empty rule look satisfied. The template's own header comment is
  // fence-shaped, so pasting it was enough to pass.
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), selfAudit(), '(no model)') });
  const doc = fs.readFileSync(files['user-stories.md'], 'utf8')
    .replace('(no model)', '```text\n#### State Model\n**Entity:** Widget\n| From | Event | To | Legal | Criteria |\n|---|---|---|---|---|\n| draft | submit | pending | yes | — |\n| pending | submit | pending | no | AC-U1 |\n```');
  const { files: f2 } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': doc });
  const r = run(['check', '--mode', 'create', '--requirements', f2['requirements.md'], '--user-stories', f2['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `a fenced state model must not satisfy R3, got exit ${r.code}`);
});

/** T-CONF-35 (R4): the "Covered by" column must name criteria that EXIST. */
test('T-CONF-35 (R4): a focus row covered by criteria the document never defines fails', () => {
  const focus = ['## Deferred-Evidence AC Focus (reverse mode only)', '', '| Ledger row | What no prototype could witness | Covered by |', '|---|---|---|', '| L-03 | telemetry never emitted | AC-QQ7, AC-NOPE9 |', ''].join('\n');
  const { files } = tmpWithInventory({ 'requirements.md': prdWithDeferred(['L-03']), 'user-stories.md': userStoriesWithStory(threeACsTagged(), selfAudit()) + '\n' + focus });
  const r = run(['check', '--mode', 'reverse', '--root', path.dirname(files['requirements.md']), '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `ghost coverage must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /never defines.*AC-QQ7/s);
});

test('T-CONF-36 (R4): a later appendix mention cannot satisfy a row the focus table skipped', () => {
  // The focus window used to run to end-of-document, so "L-03" appearing in a
  // trailing appendix satisfied a row the focus table itself never answered.
  const focus = ['## Deferred-Evidence AC Focus (reverse mode only)', '', '| Ledger row | What no prototype could witness | Covered by |', '|---|---|---|', '| — | nothing deferred here | — |', ''].join('\n');
  const appendix = ['## Appendix A — Ledger cross-reference', '', 'L-03 is deferred per requirements.md §14.', ''].join('\n');
  const { files } = tmpWithInventory({ 'requirements.md': prdWithDeferred(['L-03']), 'user-stories.md': userStoriesWithStory(threeACsTagged(), selfAudit()) + '\n' + focus + '\n' + appendix });
  const r = run(['check', '--mode', 'reverse', '--root', path.dirname(files['requirements.md']), '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `an appendix mention must not satisfy the row, got exit ${r.code}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /L-03 is `\[DEFERRED TO SPEC\]` but does not appear/);
});

test('T-CONF-37 (R2): the source tag is per criterion, not per line', () => {
  // Checking the whole line meant two criteria on one line shared one tag:
  // "**AC-U1:** no tag  **AC-E9:** [derived]" passed, and AC-U1 shipped with no
  // declared evidence source.
  const { files } = tmpWithInventory({ 'requirements.md': PRD_NO_DEFERRED, 'user-stories.md': userStoriesWithStory(threeACsTagged(), selfAudit()) });
  const doc = fs.readFileSync(files['user-stories.md'], 'utf8')
    .replace(/\*\*AC-U1:\*\* u `\[derived\]`/, '**AC-U1:** u no tag here  **AC-E9:** also here `[derived]`');
  const { files: f2 } = tmpWithInventory({ 'requirements.md': PRD_NO_DEFERRED, 'user-stories.md': doc });
  const r = run(['check', '--mode', 'reverse', '--root', path.dirname(f2['requirements.md']), '--requirements', f2['requirements.md'], '--user-stories', f2['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `an untagged criterion sharing a line with a tagged one must fail, got exit ${r.code}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /no source tag: AC-U1/);
});

test('T-CONF-38: a story is validated even when its Story ID sits in a table row', () => {
  // Splitting only on "- **Story ID:**" merged such a story into its predecessor,
  // so only the first self-audit was checked and this story's missing one went
  // unreported — the gate disabled itself and still looked green.
  const second = [
    '### User Story: Second story, metadata in a table',
    '',
    '| Field | Value |',
    '|---|---|',
    '| Story ID | US-02 |',
    '| Priority | Must-have |',
    '| Sprint | Sprint 1 |',
    '| Traces to PRD | Section 7.3: FR-002 |',
    '',
    '#### Business Requirement',
    'Outcome.',
    '',
    '#### Technical Requirement',
    '- contract',
    '',
    '#### Acceptance Criteria',
    '',
    '##### Happy Path',
    ac('AC-H2', 'h'),
    '',
  ].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), selfAudit()) + '\n' + second });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `a story with no self-audit must fail, got exit ${r.code}\n${r.err}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /AC Coverage Self-Audit/);
});

test('T-CONF-39: prose mentioning the self-audit heading does not satisfy the rule', () => {
  // The check was a bare substring search, so a sentence reading "this story has
  // no AC Coverage Self-Audit yet" satisfied it.
  const decoy = 'This story has no AC Coverage Self-Audit yet, so the sweep below is illustrative only.';
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': userStoriesWithStory(threeACs(), decoy) });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `prose must not satisfy the self-audit rule, got exit ${r.code}`);
  assert.match(JSON.parse(r.out).failures.join('\n'), /AC Coverage Self-Audit/);
});

test('T-CONF-40: the backlog tree in a code fence cannot stand in for real structure', () => {
  // The ```text tree literally contains "## Feature:" and "User Story:" lines.
  // Scanning raw text treated the tree as the document's structure.
  const treeOnly = [
    '# User Stories', '## Backlog Hierarchy Tree', '```text',
    '## Feature: Billing', '  ### User Story: phantom', '```',
    '## Story Dependencies Diagram', '',
  ].join('\n');
  const { files } = tmp({ 'requirements.md': fs.readFileSync(PRD_TEMPLATE, 'utf8'), 'user-stories.md': treeOnly });
  const r = run(['check', '--mode', 'create', '--requirements', files['requirements.md'], '--user-stories', files['user-stories.md'], '--json']);
  assert.strictEqual(r.code, 1, `a fenced tree must not satisfy structure rules, got exit ${r.code}`);
  const f = JSON.parse(r.out).failures.join('\n');
  assert.match(f, /no "## Feature:" block|missing per-story "Story ID:"/);
});
