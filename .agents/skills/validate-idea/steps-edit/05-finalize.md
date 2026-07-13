---
step: 5
name: Finalize
mode: edit
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites:
  - step-04 completed
---

# Step 5 — Finalize

Write the revised brief back and close the session.

## Goal
Persist the updated brief, record decisions, and hand off.

## Process
1. Write the revised brief back to `artifacts/output/00-discovery/validation-brief.md` (or `idea-brief.md`).
2. Update the date and revision note in the brief header.
3. Ensure all red sections from the gap scan are now yellow or green (or marked "unresolved").

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/validation-brief.md
```

## Memory closeout
- `@memory-controller write active-decisions.md` — record what changed and why.
- `@memory-controller session-write` — summarize revisions, decisions, next step.

## Handoff
- If verdict changed → route per the new verdict (GO → explore-idea, PIVOT → re-run validate-idea, KILL → stop).
- If verdict unchanged → resume the pipeline from where it was.

## Delegation
- Writes: @writer (revised brief)
- Runs: @executor (orchestrator_state.js complete)
- Memory: @memory-controller (active-decisions, session-write)
