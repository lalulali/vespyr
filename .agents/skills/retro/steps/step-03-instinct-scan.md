---
step: 3
name: Instinct Scan
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-02 completed
---

# Step 3 — Instinct Scan

Review execution quality, team process, product alignment, and architecture. Surface instinct candidates — patterns stable 30+ days with 2+ ADR refs that should become conventions.

## 3a. Execution Review
`@tech-lead` reviews execution quality:
- Were estimates accurate? Compare planned vs. actual for each task
- Were dependencies correctly identified and managed?
- Were spikes effective at reducing unknowns?
- What patterns caused rework (spec gaps, architecture unknowns, scope creep)?

**Output:** `artifacts/output/09-retro/execution-review.md`

## 3b. Process Review
`@product-manager` reviews team process:
- Were handoffs smooth? Where did information get lost between agents?
- Were blockers resolved quickly enough? Which caused delays?
- Did any feedback loops hit the 2-cycle limit? What caused the impasse?
- Were the right agents involved at the right times?
- Were any agents idle when they could have been productive?

**Output:** `artifacts/output/09-retro/process-review.md`

## 3c. Product Review
`@product-manager` and `@product-designer` review product alignment:
- Did the shipped feature match the PRD requirements?
- Were acceptance criteria complete enough?
- Were there design-spec mismatches that caused rework?
- What user feedback has come in since launch?

**Output:** `artifacts/output/09-retro/product-review.md`

## 3d. Architecture Review
`@architect` reviews architectural decisions:
- Did the architecture hold up under implementation?
- Were ADRs accurate, or did reality diverge from the plan?
- What technical debt was incurred, and is it acceptable?
- Are there architectural changes needed before the next cycle?

**Output:** `artifacts/output/09-retro/architecture-review.md`

All reviews use template `.agents/templates/memory/retrospective-template.md`.

## Instinct candidates
After all reviews, identify patterns stable 30+ days with 2+ ADR references. These are candidates for promotion to conventions or guardrails.

## Delegation
- Reads: @reader (ADRs, execution reviews, process reviews)
- Writes: @writer (execution-review.md, process-review.md, product-review.md, architecture-review.md)
