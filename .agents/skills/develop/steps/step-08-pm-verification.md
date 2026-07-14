---
step: 8
name: PM Verification
prerequisites:
  - step-07 completed
delegation:
  reads: "direct (SPEC.md + user-stories.md; per delegation-policy.md 2 files < 500 lines)"
  writes: none
  runs: none
  direct_justified: ["SPEC.md + user-stories.md direct read — 2 small files for CAP-N verification"]
output_contract:
  citations: not-required
---

# Step 8 — PM Verification

`@product-manager` verifies the shipped feature against the original acceptance criteria. This is a gate — PM must accept before documentation and completion.

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

## Halt condition
PM rejects 3 times. Escalate per the loop limit rules above.

## Delegation
- **Reads:** direct — SPEC.md + user-stories.md (2 files < 500 lines, CAP-N verification)
- **Writes:** none (this step produces a decision, not a file)
