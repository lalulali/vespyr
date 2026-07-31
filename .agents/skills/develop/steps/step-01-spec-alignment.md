---
step: 1
name: Spec Alignment & Read Check
prerequisites:
  - PR exists or design docs are in `artifacts/output/02-strategy/`
  - User story is in `artifacts/output/02-strategy/user-stories.md`
delegation:
  reads: "@reader (5+ spec files across 02-strategy/ and 03-architecture/; per delegation-policy.md ≥4 files)"
  writes: "@writer (spec-alignment-check.md; per delegation-policy.md output file)"
  runs: none
  direct_justified: ["SPEC.md direct read — < 100 lines, agent contract"]
output_contract:
  citations: not-required
---

# Step 1 — Spec Alignment & Read Check

Align on the spec before writing any code. Every developer must have read and internalized the strategy documents.

## Goal
Load and cross-check every strategy artifact against the user stories. Confirm acceptance criteria are achievable. File CRs for any spec gap found.

## Agent invocation
- `@product-manager` confirms specs match the PRD requirements and priorities
- `@product-designer` reviews user flows, interaction specs, and visual direction
- `@developer` loads session context and fully digests `product-spec.md` and `user-stories.md` — cannot start coding until this is done:
  1. `@memory-controller load developer [develop: spec alignment for {feature}]`
  2. Read `product-spec.md` and `user-stories.md` in full

## Inputs
- `artifacts/output/02-strategy/SPEC.md` — spec kernel (5 fields: Why, Capabilities, Constraints, Non-goals, Success signal). **This is the primary agent contract — all agents must read this.**
- `artifacts/output/02-strategy/product-spec.md`
- `artifacts/output/02-strategy/requirements.md` (full stakeholder PRD — available for context, not mandatory reading for agents)
- `artifacts/output/02-strategy/user-stories.md`
- All files in `artifacts/output/03-architecture/` (if they exist)

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 1`
1. Read every file in the inputs list. If any file > 1000 words, invoke `@reader` to summarize.
2. Cross-check ACs against the spec-kernel capabilities (CAP-1, CAP-2, ...).
3. Confirm all edge cases and scope boundaries are defined.
4. File CRs for any spec gap. Track them in a running list.

## Output
`artifacts/output/05-execution/spec-alignment-check.md`

## Halt condition
Any spec gap unfilled after 2 CR cycles. Escalate to `@founder`.

## Delegation
- **Reads:** @reader for spec files (5+ artifacts across 02-strategy/ and 03-architecture/)
- **Writes:** @writer for spec-alignment-check.md
- **Direct I/O:** reading SPEC.md directly permitted (< 100 lines, agent contract)

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 1`
