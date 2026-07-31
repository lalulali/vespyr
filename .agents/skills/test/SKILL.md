---
name: test
description: Run tests, analyze failures, enrich acceptance criteria, and produce structured QA reports — supports feature and full-cycle testing
version: "2.0"
last_updated: 2026-07-20
---

# Test — Multi-Step QA Workflow

Runs tests with depth — not just a pass/fail wrapper. Includes exploratory enrichment of acceptance criteria and separate feature vs. full-cycle test tracks.

## Persona delegation
This skill delegates to `@qa-engineer`. The qa-engineer runs tests, analyzes failures, assesses regression risk, enriches acceptance criteria, and produces a test report. The skill file provides the workflow; `@qa-engineer` provides the analysis and multi-scenario testing depth.

## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps.
- Step 01 (exploratory enrichment) is a hard gate — run it before any test execution.
- Steps 02a and 02b are parallelizable but both must complete before step 03.
- Each step file is a contract. Read it fully before executing.

## When to use
- "Run the tests"
- "Test this feature thoroughly"
- "Did I break anything?"
- Before merging or releasing

## Step sequence
1. **Exploratory Enrichment** → `steps/step-01-exploratory-enrichment.md` — review PRD/AC, storm assumptions, output missing scenarios
2a. **Feature Testing** → `steps/step-02a-feature-test.md` — unit/component tests in isolation
2b. **Full-Cycle Testing** → `steps/step-02b-fullcycle-test.md` — end-to-end integration workflows
3. **Criteria Backport** → `steps/step-03-criteria-backport.md` — append discovered scenarios to PRD
4. **Completion** → `steps/step-04-completion.md` — write test report, update status

## State machine integration
At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent qa-engineer --artifact test-report.md`

## Done when
- All steps completed
- Test report produced at `artifacts/output/05-execution/quality/test-report.md`
- Enriched acceptance criteria backported to user stories (step 03)
- Minimum 3 newly discovered edge cases identified (step 01 verification)
