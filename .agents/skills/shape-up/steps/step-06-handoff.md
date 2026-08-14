---
step: 6
name: Handoff
prerequisites:
  - step-05 completed
output_contract:
  citations: not-required
---

# Step 6 — Handoff

Write the shaped brief and hand off to the next skill.

## Output artifact
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill shape-up --step 6`

`artifacts/output/01-discovery/shaped-brief.md` containing: Problem Statement, Proposed Solution, Target User, Key Assumptions (verified/plausible/unverified), Scope In (v1), Scope Out (non-goals), Constraints (with rationale), Key Decisions (reference active-decisions.md), Open Questions, Recommended Next Step, and Shaping Context.

## Handoff routing
- **All assumptions verified/accepted:** → `design` (ready for specs).
- **Unverified assumptions need validation or user requests research:** → `explore-idea` (open questions become research agenda).
- **Fundamental viability concerns:** → `validate-idea` (needs GO/PIVOT/KILL).

## State machine & Memory closeout
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/shaped-brief.md
```
- `@memory-controller write active-decisions.md` (persist decisions).
- `@memory-controller session-write` (summarize decisions, next steps, blockers).

## Delegation
- **Memory:** @memory-controller for active-decisions and session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill shape-up --step 6`
