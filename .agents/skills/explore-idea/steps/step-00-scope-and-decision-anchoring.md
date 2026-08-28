---
step: 0
name: Scope & Decision Anchoring
output_contract:
  citations: not-required
---

# Step 0 — Scope & Decision Anchoring (Non-Skippable Gate)

Halt condition for underspecified briefs. No Step 1 work may begin until the scope track is locked.

## 1. Input Inspection
Confirm the user prompt states all three:
- **Concrete outcome** — the artifact or result this `/explore-idea` run produces
- **Boundary constraints** — what is explicitly in and out of scope
- **Target decision** — the business decision this research informs

## 2. Decision Fork
- **Unambiguous (C ≥ 0.85):** proceed to Step 1.
- **Ambiguous / multi-track (0.50 ≤ C < 0.85):** HALT. Emit the 2–3 Track Fork card (<100 tokens) — e.g., market-sizing vs competitive-teardown vs user-needs depth. Each track names its recommended `@agent` + `/skill` handles. Wait for selection. Zero artifact scaffolding to `artifacts/output/` before selection (GUARDRAILS: Anti-Premature Execution).
- **Trivial single-action (C < 0.50):** execute directly — do not run this skill at all.

## 3. Satisfaction Checkpoint
After track selection, lock the scope before advancing:

```bash
node .agents/scripts/step_tracker.js scope-lock --skill explore-idea --track "<track-name>"
node .agents/scripts/step_tracker.js begin --skill explore-idea --step 0
```

Record `[SCOPE_LOCKED: <track-name>]` (`scope_locked: true`, `track_selected: "<track-name>"`) in the session summary.

**Deterministic enforcement:** `step_tracker.js` exits 1 with `[ERROR] Step 0 Scope Gate bypassed. Scope must be locked before Step 1 execution.` on any `begin --step 1+` for this skill while no scope lock is recorded.

```bash
node .agents/scripts/step_tracker.js complete --skill explore-idea --step 0
```
