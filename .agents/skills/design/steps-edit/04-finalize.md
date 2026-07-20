---
step: 4
name: Finalize
mode: edit
prerequisites:
  - step-03 completed
delegation:
  reads: none
  writes: "@writer (finalized spec files; per delegation-policy.md multi-file output)"
  runs: "@executor (orchestrator_state.js complete)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 4 — Finalize

Write revised artifacts back and close the session.

## Goal
Persist updated design documents, record decisions, and hand off.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-edit --step 4`
1. Write revised files back to `artifacts/output/02-strategy/`.
2. Update dates and revision notes.
3. Re-run the design review gate from create mode step 06 to confirm all checks pass.

## Gate re-check
- All artifacts present and valid?
- No blocking open questions?
- User stories still aligned with revised PRD?

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-strategy/requirements.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-strategy/user-stories.md
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 02-strategy/product-spec.md
node .agents/scripts/ensure_graph.js doc
```

## Memory closeout
```
@memory-controller session-write
Worked on: Design revision — {feature/product name}
Decisions made:
- {what changed and why}
Next step: Load develop
Blockers: {any unresolved design questions, or "none"}
```

## Handoff
Load `develop` to proceed. If revisions changed scope significantly, re-offer the Architect phase gate.

## Delegation
- **Reads:** none
- **Writes:** @writer for finalized spec files
- **Runs:** @executor for orchestrator_state.js complete

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-edit --step 4`
