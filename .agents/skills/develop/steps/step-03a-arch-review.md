---
step: 3a
name: Architecture Review
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-02 completed OR ArchitectPhase: false
---

# Step 3a — Architecture Review

`@tech-lead` reviews the architecture for completeness and feasibility.

## Goal
Confirm the architecture (or strategy specs if architecture was bypassed) supports all user stories and requirements. Identify structural gaps before development starts.

## Agent invocation
`@tech-lead` reviews:
- If `ArchitectPhase: true`: ADRs in `artifacts/output/03-architecture/`
- If `ArchitectPhase: false`: strategy specs directly (`product-spec.md`, `requirements.md`)
- Does the architecture/spec support all user stories?
- Are there missing interfaces or structural risks?

## Process
1. `@tech-lead` reads architecture artifacts and user stories.
2. Cross-checks capabilities (CAP-N) against architectural support.
3. Flags missing interfaces, structural risks, or feasibility issues.
4. Feeds findings back to `@architect` or `@product-manager` for resolution.

## Loop limit
Max 2 revision cycles. After 2 cycles with unresolved gaps, escalate to `@founder`.

## Output
Review notes in `artifacts/output/04-planning/` (inline with execution-plan prep).

## Delegation
- Reads: @reader (architecture artifacts, strategy specs)
- Writes: @writer (review notes)
