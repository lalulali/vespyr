---
name: test
description: Run tests, analyze failures, enrich acceptance criteria, and produce structured QA reports — supports feature and full-cycle testing. Use when the user says "run the tests", "test this feature", "did I break anything", or invokes /test before merging or releasing.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---
# Test — Multi-Step QA Workflow

<!-- router-skill -->

Runs tests with depth — not just a pass/fail wrapper. Includes exploratory enrichment of acceptance criteria and separate feature vs. full-cycle test tracks.

## Persona delegation
This skill delegates to `@qa-engineer`. The qa-engineer runs tests, analyzes failures, assesses regression risk, enriches acceptance criteria, and produces a test report. The skill file provides the workflow; `@qa-engineer` provides the analysis and multi-scenario testing depth.
For eval-bearing tracks (judge prompts, scoring rubrics, benchmark suites, harness evals), consult `@ml-ai-engineer` on rubric design and production-distribution coverage before locking the report.

## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps.
- Step 01 (exploratory enrichment) is a hard gate — run it before any test execution.
- Steps 02a and 02b are parallelizable but both must complete before step 03.
- Each step file is a contract. Read it fully before executing.
- **Coverage sweep (02o):** every failure summary (feature and full-cycle) runs `node .agents/scripts/req_to_impl_check.js` and lists orphan ACs. An unreferenced AC is a defect, not a detail — cite the sweep in the test report and qa-signoff (honestly labeled prose; the phase-advance refusal mechanism is a separately filed defect).
- **Metric validation (when `artifacts/output/03-strategy/measurement-plan.md` exists):** verify the declared success metrics are actually instrumented before certifying; an uninstrumented success metric is a coverage gap, not a pass.

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

## Halt conditions
- Step 01 (exploratory enrichment) has not run -> hard gate; testing unenriched acceptance criteria certifies the wrong contract
- A failure cannot be reproduced locally -> halt and escalate to `@tech-lead`; an unreproducible failure is neither a pass nor a flake to wave through
- A security finding is rated Critical or High -> halt; do not proceed past it
- 2 QA review loops are exceeded -> halt and escalate to `@tech-lead`
- The orphan-AC sweep reports an unreferenced acceptance criterion -> report it as a defect in the test report and the qa-signoff; an AC nothing implements is a coverage hole, not a detail

## State machine integration
At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent qa-engineer --artifact test-report.md`

## Done when
- All steps completed
- Test report produced at `artifacts/output/05-execution/quality/test-report.md`
- Enriched acceptance criteria backported to user stories (step 03)
- Minimum 3 newly discovered edge cases identified (step 01 verification)

## Adversarial & Red-Team Data

AI-feature tests exercise the adversarial and red-team corpora under `evals/suites/invariants/` — a green happy path with no adversarial case is an untested boundary.
