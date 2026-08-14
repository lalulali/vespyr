---
step: 2c
name: Consistency Check
mode: validate
prerequisites:
  - step-01 completed
output_contract:
  citations: not-required
---

# Step 2 — Consistency Check

Cross-screen and cross-artifact consistency validation.

## Goal
Find inconsistencies: one screen's button says "Save" and another says "Submit", or a user story references a state that doesn't exist in the spec.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-validate --step 2`
`@product-designer` checks:

1. **Cross-screen consistency** — Same elements look and behave identically across screens? Navigation patterns consistent?
2. **Spec-story alignment** — Every user story AC maps to a defined screen state? No story references a state that doesn't exist in the product spec?
3. **Design token usage** — Colors, typography, spacing used consistently across all screens?
4. **Interaction pattern consistency** — Same gesture/click produces same result across contexts?

## Severity classification
- **Critical** — would cause implementation errors or broken user flows
- **Major** — confusing to users but functional
- **Minor** — cosmetic inconsistency

## Output
Consistency report appended to `artifacts/output/02-research/ux-research-report.md` with findings mapped to screens/stories.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-validate --step 2`
