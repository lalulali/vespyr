---
step: 4c
name: Lock & Handoff
mode: validate
prerequisites:
  - step-03 completed
output_contract:
  citations: not-required
---

# Step 4 — Lock & Handoff

Finalize the validation report, record findings, and route based on results.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-validate --step 4`
## Goal
Consolidate findings from heuristic eval, consistency check, and a11y review. Determine if the design passes or needs revision.

## Verdict
Based on findings:

- **GO** — no critical/serious findings. Design is validated. Handoff to develop.
- **FIX** — critical or serious findings exist. Loop back to create mode step 04 (screen states) or edit mode for revisions.

## If FIX: revision loop
- `@product-designer` addresses critical and serious findings
- Max 2 revision cycles between `@ux-researcher` and `@product-designer`
- After 2 cycles, escalate unresolved issues to `@product-manager`

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/ux-research-report.md
node .agents/scripts/ensure_graph.js doc
```

## Memory closeout
```
@memory-controller session-write
Worked on: Design validation — {feature/product name}
Decisions made:
- {validation verdict: GO / FIX with N issues}
- {key findings summary}
Next step: {load develop / loop back to screen states}
Blockers: {critical unresolved issues, or "none"}
```

## Handoff routing
- **GO** → load `develop`
- **FIX** → loop back to `steps/step-04a-screen-states.md` or `steps/step-03b-revise.md`

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-validate --step 4`
