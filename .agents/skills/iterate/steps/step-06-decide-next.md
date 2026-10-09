---
step: 6
name: Decide Next Action
prerequisites:
  - step-05 completed (iteration-results.md exists)
output_contract:
  citations: not-required
---

# Step 6 — Decide Next Action

Gate check to determine the path forward based on iteration results.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill iterate --step 6`
## Workflow

### 6a. Evaluate results

Based on iteration results:
- **Positive signal** → Continue iterating on adjacent improvements → back to Step 1
- **Neutral signal** → Revisit the hypothesis, consider larger redesign → back to Step 2
- **Negative signal** → Roll back if needed, reanalyze → back to Step 1 with new data
- **Feature stabilized** → Move on to next feature or load `retro`

### 6b. Enforce iteration limit

Maximum 5 iteration cycles before a mandatory `retro` to assess whether the iteration strategy is working. Counted in `artifacts/output/07-iteration/iteration-state.md` and enforced by `cycle_state_check.js --kind iterate` — at 5 cycles a sixth cannot start until a retro is recorded. This prevents endless polish on a feature that may need a fundamentally different approach.

## Memory closeout
- `@memory-controller session-write` — record step 6 next action decision.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill iterate --step 6`
