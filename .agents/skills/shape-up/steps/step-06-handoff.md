---
step: 6
name: Handoff
prerequisites:
  - step-05 completed
delegation:
  reads: none
  writes: "@writer (shaped-brief.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 6 — Handoff

Write the shaped brief and hand off to the next skill.

## Output artifact
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill shape-up --step 6`

`artifacts/output/00-discovery/shaped-brief.md` containing: Problem Statement, Proposed Solution, Target User, Key Assumptions (verified/plausible/unverified), Scope In (v1), Scope Out (non-goals), Constraints (with rationale), Key Decisions (reference active-decisions.md), Open Questions, Recommended Next Step, and Shaping Context.

## Handoff routing
- **All assumptions verified/accepted:** → `design` (ready for specs).
- **Unverified assumptions need validation or user requests research:** → `explore-idea` (open questions become research agenda).
- **Fundamental viability concerns:** → `validate-idea` (needs GO/PIVOT/KILL).

## State machine & Memory closeout
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/shaped-brief.md
```
- `@memory-controller write active-decisions.md` (persist decisions).
- `@memory-controller session-write` (summarize decisions, next steps, blockers).

## Delegation
- **Reads:** none
- **Writes:** @writer for shaped-brief.md
- **Runs:** @executor for orchestrator_state.js complete
- **Memory:** @memory-controller for active-decisions and session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill shape-up --step 6`
