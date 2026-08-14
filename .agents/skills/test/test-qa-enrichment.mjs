#!/usr/bin/env node
// Test harness for /test skill (F1.29) — verifies QA enrichment gates
// Usage: node .agents/skills/test/test-qa-enrichment.mjs
//
// Verifies:
//   1. Step files exist with correct structure
//   2. Step-01 enforces the >=3 edge case gate (F1.29.5)
//   3. Step-02b requires full-cycle path verification (F1.29.5)
//   4. Step-03 backports to `## Acceptance Criteria (QA Enriched)` section (F1.29.4)
//   5. @qa-engineer persona has enrichment contract + Feature/Full-Cycle methodologies (F1.29.1)
//   6. test/SKILL.md has correct step sequence + harness adherence (F1.29.2)
//   7. Auto-proceed language is present (non-negotiable, do NOT ask)

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const SKILLS = join(ROOT, '.agents', 'skills');
const AGENTS = join(ROOT, '.agents', 'agents');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label) {
  if (condition) { passed++; results.push(`  PASS: ${label}`); }
  else { failed++; results.push(`  FAIL: ${label}`); }
}

function assertIncludes(haystack, needle, label) {
  const cond = typeof haystack === 'string' && haystack.includes(needle);
  assert(cond, `${label} (expected: "${needle}")`);
}

function readFile(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

// ── File existence checks ─────────────────────────────────────────

function checkFileExists(relPath, label) {
  const fullPath = join(SKILLS, relPath);
  assert(existsSync(fullPath), `${label}: ${relPath} exists`);
  return readFile(fullPath);
}

results.push('\n📋 SCENARIO: F1.29.1 — @qa-engineer persona has enrichment contract');

const qaEngineerPath = join(AGENTS, 'qa-engineer.md');
const qaEngineer = readFile(qaEngineerPath);
assert(qaEngineer !== null, 'qa-engineer.md exists');
if (qaEngineer) {
  assertIncludes(qaEngineer, 'Acceptance Criteria Enrichment Contract', 'Persona has enrichment contract heading');
  assertIncludes(qaEngineer, 'NON-NEGOTIABLE', 'Enrichment contract marked non-negotiable');
  assertIncludes(qaEngineer, 'Socratic gap discovery', 'References Socratic gap discovery');
  assertIncludes(qaEngineer, 'at least 3 newly discovered scenarios', 'Requires >=3 discovered scenarios');
  assertIncludes(qaEngineer, 'Acceptance Criteria (QA Enriched)', 'References QA Enriched section name');
  assertIncludes(qaEngineer, 'Feature Testing', 'Defines Feature Testing track');
  assertIncludes(qaEngineer, 'Full-Cycle Testing', 'Defines Full-Cycle Testing track');
  assertIncludes(qaEngineer, 'Micro-level', 'Feature Testing described as micro-level');
  assertIncludes(qaEngineer, 'Macro-level', 'Full-Cycle Testing described as macro-level');
  assertIncludes(qaEngineer, 'acceptance-criteria-enrichment', 'Capability includes acceptance-criteria-enrichment');
  assertIncludes(qaEngineer, 'exploratory-testing', 'Capability includes exploratory-testing');
}

// ── F1.29.2 — test/SKILL.md router structure ─────────────────────

results.push('\n📋 SCENARIO: F1.29.2 — test/SKILL.md router with Socratic gap discovery');

const skillMd = checkFileExists('test/SKILL.md', 'test router');
if (skillMd) {
  assertIncludes(skillMd, 'step-01-exploratory-enrichment.md', 'Routes to step-01 (exploratory enrichment)');
  assertIncludes(skillMd, 'step-02a-feature-test.md', 'Routes to step-02a (feature test)');
  assertIncludes(skillMd, 'step-02b-fullcycle-test.md', 'Routes to step-02b (full-cycle test)');
  assertIncludes(skillMd, 'step-03-criteria-backport.md', 'Routes to step-03 (criteria backport)');
  assertIncludes(skillMd, 'step-04-completion.md', 'Routes to step-04 (completion)');
  assertIncludes(skillMd, 'Persona delegation', 'Has persona delegation section');
  assertIncludes(skillMd, '@qa-engineer', 'Delegates to @qa-engineer');
  assertIncludes(skillMd, 'Harness adherence', 'Has harness adherence block');
  assertIncludes(skillMd, 'non-negotiable', 'Harness adherence marked non-negotiable');
  assertIncludes(skillMd, 'Exploratory Enrichment', 'Step 1 named Exploratory Enrichment');
  assertIncludes(skillMd, 'Feature Testing', 'Step 2a named Feature Testing');
  assertIncludes(skillMd, 'Full-Cycle Testing', 'Step 2b named Full-Cycle Testing');
  assertIncludes(skillMd, 'Criteria Backport', 'Step 3 named Criteria Backport');
  assertIncludes(skillMd, 'Minimum 3 newly discovered edge cases', 'Done-when requires >=3 edge cases');
}

// ── F1.29.3 — Separate step-02a and step-02b files ────────────────

results.push('\n📋 SCENARIO: F1.29.3 — separate feature and full-cycle step files');

const step02a = checkFileExists('test/steps/step-02a-feature-test.md', 'feature test step');
if (step02a) {
  assertIncludes(step02a, 'Feature Testing', 'Step 02a titled Feature Testing');
  assertIncludes(step02a, 'Micro-level', 'Step 02a described as micro-level');
  assertIncludes(step02a, 'AC-H', 'Step 02a covers happy path (AC-H)');
  assertIncludes(step02a, 'AC-U', 'Step 02a covers unhappy path (AC-U)');
  assertIncludes(step02a, 'AC-E', 'Step 02a covers edge cases (AC-E)');
  assertIncludes(step02a, 'Component isolation', 'Step 02a covers component isolation');
  assertIncludes(step02a, 'coverage', 'Step 02a reports coverage');
  assertIncludes(step02a, 'step-01 completed', 'Step 02a prereqs step-01');
  assertIncludes(step02a, 'Runs in parallel with step 02b', 'Step 02a notes parallel execution');
}

const step02b = checkFileExists('test/steps/step-02b-fullcycle-test.md', 'full-cycle test step');
if (step02b) {
  assertIncludes(step02b, 'Full-Cycle Testing', 'Step 02b titled Full-Cycle Testing');
  assertIncludes(step02b, 'Macro-level', 'Step 02b described as macro-level');
  assertIncludes(step02b, 'end-to-end', 'Step 02b covers end-to-end journeys');
  assertIncludes(step02b, 'cross-service', 'Step 02b covers cross-service integration');
  assertIncludes(step02b, 'data consistency', 'Step 02b covers data consistency');
  assertIncludes(step02b, 'system recovery', 'Step 02b covers system recovery');
  assertIncludes(step02b, 'Primary journey', 'Step 02b identifies primary journey');
  assertIncludes(step02b, 'Recovery journey', 'Step 02b identifies recovery journey');
  assertIncludes(step02b, 'Session journey', 'Step 02b identifies session journey');
  assertIncludes(step02b, 'Concurrent journey', 'Step 02b identifies concurrent journey');
  assertIncludes(step02b, 'step-01 completed', 'Step 02b prereqs step-01');
  assertIncludes(step02b, 'Runs in parallel with step 02a', 'Step 02a notes parallel execution');
}

// ── F1.29.4 — PRD template update with QA Enriched section ────────

results.push('\n📋 SCENARIO: F1.29.4 — automated PRD template update with QA Enriched section');

const step03 = checkFileExists('test/steps/step-03-criteria-backport.md', 'criteria backport step');
if (step03) {
  assertIncludes(step03, 'Criteria Backport', 'Step 03 titled Criteria Backport');
  assertIncludes(step03, 'Acceptance Criteria (QA Enriched)', 'Step 03 appends QA Enriched section');
  assertIncludes(step03, 'QA-Discovered Requirements', 'Step 03 appends QA-Discovered Requirements for spec gaps');
  assertIncludes(step03, 'user-stories.md', 'Step 03 writes to user-stories.md');
  assertIncludes(step03, 'product-spec.md', 'Step 03 writes to product-spec.md');
  assertIncludes(step03, 'enrichment-findings.md', 'Step 03 reads enrichment-findings.md');
  assertIncludes(step03, 'feature-test-results.md', 'Step 03 reads feature-test-results.md');
  assertIncludes(step03, 'fullcycle-test-results.md', 'Step 03 reads fullcycle-test-results.md');
  assertIncludes(step03, 'Gate check', 'Step 03 has gate check');
  assertIncludes(step03, 'step-02a completed', 'Step 03 prereqs step-02a');
  assertIncludes(step03, 'step-02b completed', 'Step 03 prereqs step-02b');
}

// ── F1.29.5 — Gate: QA fails if <3 edge cases or no full-cycle verification ──
// This is the critical verification — the plan explicitly calls for this gate.

results.push('\n📋 SCENARIO: F1.29.5 — verification tests for <3 edge cases / full-cycle paths');

const step01 = checkFileExists('test/steps/step-01-exploratory-enrichment.md', 'exploratory enrichment step');
if (step01) {
  // The >=3 edge case gate
  assertIncludes(step01, 'Exploratory Enrichment', 'Step 01 titled Exploratory Enrichment');
  assertIncludes(step01, 'Socratic', 'Step 01 uses Socratic gap discovery');
  assertIncludes(step01, 'Boundary values', 'Step 01 storms boundary values');
  assertIncludes(step01, 'Timing', 'Step 01 storms timing scenarios');
  assertIncludes(step01, 'Failure modes', 'Step 01 storms failure modes');
  assertIncludes(step01, 'User behavior', 'Step 01 storms user behavior');
  assertIncludes(step01, 'State transitions', 'Step 01 storms state transitions');
  assertIncludes(step01, 'enrichment-findings.md', 'Step 01 outputs enrichment-findings.md');

  // THE CRITICAL GATE: >=3 edge cases or QA fails
  assertIncludes(step01, 'at least 3 newly discovered scenarios', 'Step 01 enforces >=3 scenarios gate');
  assertIncludes(step01, 'Non-negotiable', 'Step 01 gate is non-negotiable');
  assertIncludes(step01, 'insufficient', 'Step 01 describes insufficient exploration fallback');
}

// Full-cycle path verification gate
if (step02b) {
  assertIncludes(step02b, 'Primary journey', 'Step 02b verifies primary journey path');
  assertIncludes(step02b, 'Recovery journey', 'Step 02b verifies recovery journey path');
  assertIncludes(step02b, 'Session journey', 'Step 02b verifies session journey path');
  assertIncludes(step02b, 'Concurrent journey', 'Step 02b verifies concurrent journey path');
  assertIncludes(step02b, 'Full-Cycle Test Results', 'Step 02b produces full-cycle test results');
  assertIncludes(step02b, 'Journeys Tested', 'Step 02b reports journey test outcomes');
  assertIncludes(step02b, 'Integration Failures', 'Step 02b reports integration failures');
  assertIncludes(step02b, 'Data Consistency Checks', 'Step 02b reports data consistency checks');
  assertIncludes(step02b, 'Recovery Validation', 'Step 02b reports recovery validation');
  assertIncludes(step02b, 'Loop limit', 'Step 02b has loop limit (max 2 fix cycles)');
  assertIncludes(step02b, 'escalate', 'Step 02b escalates persistent failures');
}

// Completion step must verify the gate was satisfied
const step04 = checkFileExists('test/steps/step-04-completion.md', 'completion step');
if (step04) {
  assertIncludes(step04, 'Completion', 'Step 04 titled Completion');
  assertIncludes(step04, 'test-report.md', 'Step 04 produces test-report.md');
  assertIncludes(step04, 'Enrichment Summary', 'Step 04 reports enrichment summary');
  assertIncludes(step04, 'Scenarios discovered', 'Step 04 reports scenarios discovered count');
  assertIncludes(step04, 'Scenarios backported to AC', 'Step 04 reports scenarios backported');
  assertIncludes(step04, 'Spec gaps flagged', 'Step 04 reports spec gaps flagged');
  assertIncludes(step04, 'Release Recommendation', 'Step 04 produces release recommendation');
  assertIncludes(step04, 'GO', 'Step 04 supports GO recommendation');
  assertIncludes(step04, 'CONDITIONAL GO', 'Step 04 supports CONDITIONAL GO recommendation');
  assertIncludes(step04, 'NO-GO', 'Step 04 supports NO-GO recommendation');
  assertIncludes(step04, 'delegation:', 'Step 04 has delegation frontmatter');
}

// ── Auto-proceed language verification (F1.32 consistency) ────────

results.push('\n📋 SCENARIO: Auto-proceed language consistency (F1.32)');

if (skillMd) {
  assertIncludes(skillMd, 'hard gate', 'test/SKILL.md declares step 01 a hard gate');
  assertIncludes(skillMd, 'parallelizable', 'test/SKILL.md notes 02a/02b parallelizable');
  assertIncludes(skillMd, 'both must complete before step 03', 'test/SKILL.md enforces 02a+02b before 03');
}

// ── Summary ───────────────────────────────────────────────────────

results.push(`\n──────────────────────────────────────────`);
results.push(`✓ Passed: ${passed}`);
results.push(`✗ Failed: ${failed}`);
results.push(`Total assertions: ${passed + failed}`);

console.log(results.join('\n'));

if (failed > 0) {
  console.log('\n❌ Verification FAILED — see FAIL lines above');
  process.exit(1);
} else {
  console.log('\n✅ Verification PASSED — all QA enrichment gates verified');
  process.exit(0);
}
