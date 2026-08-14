---
step: 8
name: PM Verification
prerequisites:
  - step-07 completed
output_contract:
  citations: not-required
---

# Step 8 — PM Verification

`@product-manager` verifies the shipped feature against the original acceptance criteria. This is a gate — PM must accept before documentation and completion.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 8`
## Goal
Confirm the feature meets all acceptance criteria, edge cases, and error states defined in the spec.

## Agent invocation
`@product-manager`:
- Review against original acceptance criteria in user stories
- Check edge cases and error states match the spec
- Verify all capabilities (CAP-N) from the spec-kernel are satisfied

## Loop limit
Max 2 rejection cycles:
- If PM rejects a third time due to a spec problem → go back to `design` skill
- If PM rejects a third time due to a build problem → escalate to `@tech-lead` for root cause

## Decision
- **Accept** → proceed to step 9
- **Reject** → log gaps, loop back to step 6 (dev loop)

## Memory closeout
- `@memory-controller session-write` — record step 8 PM verification outcome.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 8`
