---
step: 5b
name: Finalize
mode: edit
prerequisites:
  - step-04 completed
output_contract:
  citations: not-required
---

# Step 5 — Finalize

Write the revised brief back and close the session.

## Goal
Persist the updated brief, record decisions, and hand off.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-edit --step 5`
1. Write the revised brief back to `artifacts/output/01-discovery/validation-brief.md` (or `idea-brief.md`).
2. Update the date and revision note in the brief header.
3. Ensure all red sections from the gap scan are now yellow or green (or marked "unresolved").

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/validation-brief.md
```

## Memory closeout
- `@memory-controller write active-decisions.md` — record what changed and why.
- `@memory-controller session-write` — summarize revisions, decisions, next step.

## Handoff
- If verdict changed → route per the new verdict (GO → explore-idea, PIVOT → re-run validate-idea, KILL → stop).
- If verdict unchanged → resume the pipeline from where it was.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-edit --step 5`
