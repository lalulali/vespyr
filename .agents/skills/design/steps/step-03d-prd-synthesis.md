---
step: 3d
name: PRD Synthesis
mode: reverse
prerequisites:
  - step-2 completed
output_contract:
  citations: not-required
---

# Step 3 — PRD Synthesis (Reverse Mode)

Synthesize the PRD through the **same interactive loop the traditional flow uses** — re-run create-mode steps 02a→05a with the Evidence Ledger as fixed input. Never one-shot "generate from the prototype": one-pass derivation is the defect this mode exists to kill (M1).

## Prerequisites
- `requirements.md` §14 Evidence Ledger built (step-2) with every row anchored or `[OPEN]`.
- `prototype-inventory.md` (step-1) available as secondary reference.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 3`

1. Re-run the create-mode steps **in order**, treating each as a loop with the same pause points as create mode:
   - **02a personas** → §6 Target Audience (max 3, mapped to ledger evidence)
   - **03a user stories** → `user-stories.md` with AC-H / AC-U / AC-E per story
   - **04a screen states** → `product-spec.md` (states, transitions, edge states)
   - **05a design tokens** → `design.md` (token layer, component states)
2. **Row-anchor every authored artifact.** Each persona trait, story, AC, screen state, and token decision cites the ledger rows (`L-NN`) it is earned from. A statement with neither a ledger row nor a new `[OPEN]` row is a grounding violation — halt and fix.
3. **The ledger is fixed input** — do not re-interpret the prototype, do not strengthen evidence into claims it does not support. New discoveries during synthesis append `[OPEN]` rows to §14 (owner questions), never inline invention.
4. Keep the loop honest: in `semi-autonomous` mode, pause at the same checkpoints create mode pauses at (personas → PRD, stories, screen states). This is a synthesis loop, not a generation prompt.
5. Every FR/NFR in `requirements.md` §7/§8 traces to ledger rows; ACs in `user-stories.md` reference the screen states they exercise.

## Output
- `artifacts/output/03-strategy/requirements.md` §1–13 (sections synthesized above §14)
- `artifacts/output/03-strategy/user-stories.md` — stories + AC-H/AC-U/AC-E, row-anchored
- `artifacts/output/03-strategy/product-spec.md`, `artifacts/output/03-strategy/design.md`

## Halt conditions
- Any authored statement without a ledger row or `[OPEN]` row (grounding violation)
- A story AC contradicts its cited ledger rows
- Ledger missing or containing `confirmed` rows with unresolvable anchors

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 3`
