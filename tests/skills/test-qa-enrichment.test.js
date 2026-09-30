const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Ported from .agents/skills/test/test-qa-enrichment.mjs, which was deleted in
// 02s (T012) as an "orphan" because nothing referenced it. It was green on
// removal (100/100) and was the ONLY enforcement of the >=3-discovered-scenario
// gate and the @qa-engineer enrichment contract — `grep -rn "3 newly
// discovered" tests/ .agents/scripts/` returned zero hits after the delete. It
// now lives in the one wired test convention (tests/**/*.test.js, discovered by
// tests/run-all.js, executed by `npm test`, CI, and the pre-commit hook).
//
// Scope honesty: this fixture verifies the STRUCTURAL CONTRACT of the /test
// skill and the @qa-engineer persona on disk. It does NOT verify live QA
// behavior of an LLM session.

const ROOT = path.join(__dirname, '..', '..');
const SKILLS = path.join(ROOT, '.agents', 'skills');
const AGENTS = path.join(ROOT, '.agents', 'agents');

function readExisting(fullPath, label) {
  assert.ok(fs.existsSync(fullPath), `${label}: ${path.relative(ROOT, fullPath)} must exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function mustInclude(content, needle, label) {
  assert.ok(
    typeof content === 'string' && content.includes(needle),
    `${label} (expected: "${needle}")`
  );
}

const testSkillMd = readExisting(path.join(SKILLS, 'test', 'SKILL.md'), 'test router');
const step01 = readExisting(
  path.join(SKILLS, 'test', 'steps', 'step-01-exploratory-enrichment.md'),
  'exploratory enrichment step'
);
const step02a = readExisting(
  path.join(SKILLS, 'test', 'steps', 'step-02a-feature-test.md'),
  'feature test step'
);
const step02b = readExisting(
  path.join(SKILLS, 'test', 'steps', 'step-02b-fullcycle-test.md'),
  'full-cycle test step'
);
const step03 = readExisting(
  path.join(SKILLS, 'test', 'steps', 'step-03-criteria-backport.md'),
  'criteria backport step'
);
const step04 = readExisting(
  path.join(SKILLS, 'test', 'steps', 'step-04-completion.md'),
  'completion step'
);

describe('/test QA enrichment gates', () => {
  // ── F1.29.1 — @qa-engineer enrichment contract ───────────────────
  it('F1.29.1 — @qa-engineer persona carries the non-negotiable enrichment contract', () => {
    const qaEngineer = readExisting(path.join(AGENTS, 'qa-engineer.md'), 'qa-engineer persona');

    mustInclude(qaEngineer, 'Acceptance Criteria Enrichment Contract', 'Persona has enrichment contract heading');
    mustInclude(qaEngineer, 'NON-NEGOTIABLE', 'Enrichment contract marked non-negotiable');
    mustInclude(qaEngineer, 'Socratic gap discovery', 'References Socratic gap discovery');
    mustInclude(qaEngineer, 'at least 3 newly discovered scenarios', 'Requires >=3 discovered scenarios');
    mustInclude(qaEngineer, 'Acceptance Criteria (QA Enriched)', 'References QA Enriched section name');
    mustInclude(qaEngineer, 'Feature Testing', 'Defines Feature Testing track');
    mustInclude(qaEngineer, 'Full-Cycle Testing', 'Defines Full-Cycle Testing track');
    mustInclude(qaEngineer, 'Micro-level', 'Feature Testing described as micro-level');
    mustInclude(qaEngineer, 'Macro-level', 'Full-Cycle Testing described as macro-level');
    mustInclude(qaEngineer, 'acceptance-criteria-enrichment', 'Capability includes acceptance-criteria-enrichment');
    mustInclude(qaEngineer, 'exploratory-testing', 'Capability includes exploratory-testing');
  });

  // ── F1.29.2 — test/SKILL.md router structure ─────────────────────
  it('F1.29.2 — test/SKILL.md routes to all 5 steps with Socratic gap discovery', () => {
    mustInclude(testSkillMd, 'step-01-exploratory-enrichment.md', 'Routes to step-01 (exploratory enrichment)');
    mustInclude(testSkillMd, 'step-02a-feature-test.md', 'Routes to step-02a (feature test)');
    mustInclude(testSkillMd, 'step-02b-fullcycle-test.md', 'Routes to step-02b (full-cycle test)');
    mustInclude(testSkillMd, 'step-03-criteria-backport.md', 'Routes to step-03 (criteria backport)');
    mustInclude(testSkillMd, 'step-04-completion.md', 'Routes to step-04 (completion)');
    mustInclude(testSkillMd, 'Persona delegation', 'Has persona delegation section');
    mustInclude(testSkillMd, '@qa-engineer', 'Delegates to @qa-engineer');
    mustInclude(testSkillMd, 'Harness adherence', 'Has harness adherence block');
    mustInclude(testSkillMd, 'non-negotiable', 'Harness adherence marked non-negotiable');
    mustInclude(testSkillMd, 'Exploratory Enrichment', 'Step 1 named Exploratory Enrichment');
    mustInclude(testSkillMd, 'Feature Testing', 'Step 2a named Feature Testing');
    mustInclude(testSkillMd, 'Full-Cycle Testing', 'Step 2b named Full-Cycle Testing');
    mustInclude(testSkillMd, 'Criteria Backport', 'Step 3 named Criteria Backport');
    mustInclude(testSkillMd, 'Minimum 3 newly discovered edge cases', 'Done-when requires >=3 edge cases');
  });

  // ── F1.29.3 — separate step-02a and step-02b files ────────────────
  it('F1.29.3 — step-02a (feature) and step-02b (full-cycle) are separate, parallel, micro/macro', () => {
    mustInclude(step02a, 'Feature Testing', 'Step 02a titled Feature Testing');
    mustInclude(step02a, 'Micro-level', 'Step 02a described as micro-level');
    mustInclude(step02a, 'AC-H', 'Step 02a covers happy path (AC-H)');
    mustInclude(step02a, 'AC-U', 'Step 02a covers unhappy path (AC-U)');
    mustInclude(step02a, 'AC-E', 'Step 02a covers edge cases (AC-E)');
    mustInclude(step02a, 'Component isolation', 'Step 02a covers component isolation');
    mustInclude(step02a, 'coverage', 'Step 02a reports coverage');
    mustInclude(step02a, 'step-01 completed', 'Step 02a prereqs step-01');
    mustInclude(step02a, 'Runs in parallel with step 02b', 'Step 02a notes parallel execution');

    mustInclude(step02b, 'Full-Cycle Testing', 'Step 02b titled Full-Cycle Testing');
    mustInclude(step02b, 'Macro-level', 'Step 02b described as macro-level');
    mustInclude(step02b, 'end-to-end', 'Step 02b covers end-to-end journeys');
    mustInclude(step02b, 'cross-service', 'Step 02b covers cross-service integration');
    mustInclude(step02b, 'data consistency', 'Step 02b covers data consistency');
    mustInclude(step02b, 'system recovery', 'Step 02b covers system recovery');
    mustInclude(step02b, 'Primary journey', 'Step 02b identifies primary journey');
    mustInclude(step02b, 'Recovery journey', 'Step 02b identifies recovery journey');
    mustInclude(step02b, 'Session journey', 'Step 02b identifies session journey');
    mustInclude(step02b, 'Concurrent journey', 'Step 02b identifies concurrent journey');
    mustInclude(step02b, 'step-01 completed', 'Step 02b prereqs step-01');
    mustInclude(step02b, 'Runs in parallel with step 02a', 'Step 02a notes parallel execution');
  });

  // ── F1.29.4 — PRD backport with QA Enriched section ──────────────
  it('F1.29.4 — step-03 backports QA findings into user-stories.md and product-spec.md', () => {
    mustInclude(step03, 'Criteria Backport', 'Step 03 titled Criteria Backport');
    mustInclude(step03, 'Acceptance Criteria (QA Enriched)', 'Step 03 appends QA Enriched section');
    mustInclude(step03, 'QA-Discovered Requirements', 'Step 03 appends QA-Discovered Requirements for spec gaps');
    mustInclude(step03, 'user-stories.md', 'Step 03 writes to user-stories.md');
    mustInclude(step03, 'product-spec.md', 'Step 03 writes to product-spec.md');
    mustInclude(step03, 'enrichment-findings.md', 'Step 03 reads enrichment-findings.md');
    mustInclude(step03, 'feature-test-results.md', 'Step 03 reads feature-test-results.md');
    mustInclude(step03, 'fullcycle-test-results.md', 'Step 03 reads fullcycle-test-results.md');
    mustInclude(step03, 'Gate check', 'Step 03 has gate check');
    mustInclude(step03, 'step-02a completed', 'Step 03 prereqs step-02a');
    mustInclude(step03, 'step-02b completed', 'Step 03 prereqs step-02b');
  });

  // ── F1.29.5 — the >=3 edge case gate + full-cycle verification ───
  // This is the critical verification — the plan explicitly calls for this gate.
  it('F1.29.5 — step-01 enforces the non-negotiable >=3 discovered scenario gate', () => {
    mustInclude(step01, 'Exploratory Enrichment', 'Step 01 titled Exploratory Enrichment');
    mustInclude(step01, 'Socratic', 'Step 01 uses Socratic gap discovery');
    mustInclude(step01, 'Boundary values', 'Step 01 storms boundary values');
    mustInclude(step01, 'Timing', 'Step 01 storms timing scenarios');
    mustInclude(step01, 'Failure modes', 'Step 01 storms failure modes');
    mustInclude(step01, 'User behavior', 'Step 01 storms user behavior');
    mustInclude(step01, 'State transitions', 'Step 01 storms state transitions');
    mustInclude(step01, 'enrichment-findings.md', 'Step 01 outputs enrichment-findings.md');

    // THE CRITICAL GATE: >=3 discovered scenarios or QA fails
    mustInclude(step01, 'at least 3 newly discovered scenarios', 'Step 01 enforces >=3 scenarios gate');
    mustInclude(step01, 'Non-negotiable', 'Step 01 gate is non-negotiable');
    mustInclude(step01, 'insufficient', 'Step 01 describes insufficient exploration fallback');
  });

  it('F1.29.5 — step-02b verifies all 4 journey paths and reports the full result shape', () => {
    mustInclude(step02b, 'Primary journey', 'Step 02b verifies primary journey path');
    mustInclude(step02b, 'Recovery journey', 'Step 02b verifies recovery journey path');
    mustInclude(step02b, 'Session journey', 'Step 02b verifies session journey path');
    mustInclude(step02b, 'Concurrent journey', 'Step 02b verifies concurrent journey path');
    mustInclude(step02b, 'Full-Cycle Test Results', 'Step 02b produces full-cycle test results');
    mustInclude(step02b, 'Journeys Tested', 'Step 02b reports journey test outcomes');
    mustInclude(step02b, 'Integration Failures', 'Step 02b reports integration failures');
    mustInclude(step02b, 'Data Consistency Checks', 'Step 02b reports data consistency checks');
    mustInclude(step02b, 'Recovery Validation', 'Step 02b reports recovery validation');
    mustInclude(step02b, 'Loop limit', 'Step 02b has loop limit (max 2 fix cycles)');
    mustInclude(step02b, 'escalate', 'Step 02b escalates persistent failures');
  });

  it('F1.29.5 — step-04 completion reports enrichment summary and release recommendation', () => {
    mustInclude(step04, 'Completion', 'Step 04 titled Completion');
    mustInclude(step04, 'test-report.md', 'Step 04 produces test-report.md');
    mustInclude(step04, 'Enrichment Summary', 'Step 04 reports enrichment summary');
    mustInclude(step04, 'Scenarios discovered', 'Step 04 reports scenarios discovered count');
    mustInclude(step04, 'Scenarios backported to AC', 'Step 04 reports scenarios backported');
    mustInclude(step04, 'Spec gaps flagged', 'Step 04 reports spec gaps flagged');
    mustInclude(step04, 'Release Recommendation', 'Step 04 produces release recommendation');
    mustInclude(step04, 'GO', 'Step 04 supports GO recommendation');
    mustInclude(step04, 'CONDITIONAL GO', 'Step 04 supports CONDITIONAL GO recommendation');
    mustInclude(step04, 'NO-GO', 'Step 04 supports NO-GO recommendation');
    mustInclude(step04, 'output_contract:', 'Step 04 has output_contract frontmatter');
  });

  // ── Auto-proceed language verification (F1.32 consistency) ────────
  it('F1.32 — SKILL.md declares step 01 a hard gate and 02a/02b parallelizable', () => {
    mustInclude(testSkillMd, 'hard gate', 'test/SKILL.md declares step 01 a hard gate');
    mustInclude(testSkillMd, 'parallelizable', 'test/SKILL.md notes 02a/02b parallelizable');
    mustInclude(testSkillMd, 'both must complete before step 03', 'test/SKILL.md enforces 02a+02b before 03');
  });
});
