---
step: 1
name: Open Questions
mode: validate
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
---

# Step 1 — Open Questions

Surface every open question in the existing brief. This is the Socratic entry point.

## Goal
Before stress-testing, catalog everything that's unverified, assumed, or unclear. The 7-branch tree needs a complete question inventory.

## Process
`@founder` reads the entire brief and extracts:

1. **Unverified claims** — statements presented as facts but lacking evidence.
2. **Assumptions** — things taken for granted (market size, user behavior, technical feasibility).
3. **Missing answers** — Q1-Q7 questions that were skipped or answered weakly.
4. **Logical gaps** — conclusions that don't follow from the evidence presented.

## Categorization
Tag each open question by branch:
- `[PRODUCT]` — product requirements, scope, features
- `[ARCH]` — architecture, tech choices, trade-offs
- `[EDGE]` — edge cases, failure modes, corner conditions
- `[CODE]` — codebase logic, implementation details
- `[COST]` — cost, timeline, resource assumptions
- `[RISK]` — risk factors, unknowns, dependencies
- `[SUCCESS]` — success criteria, measurability, signal

## Output
A categorized inventory of open questions, ranked by severity (blocker / major / minor).

## Delegation
- Reads: @reader (brief sections)
- Writes: @writer (validation reports)
- Memory: @memory-controller (active-decisions)
- Direct: founder reasoning is direct
