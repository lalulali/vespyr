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
- `artifacts/output/03-strategy/prototype-collaboration.md` records the selected prototype track, designer–tech review, and `SATISFIED` reviewer sign-offs; `prototype_collab_gate.js verify` passes.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 3`

1. Re-run the create-mode steps **in order**, treating each as a loop with the same pause points as create mode, and use the same canonical documents. **Scaffold first:** copy each template to its output path before populating, then fill in place — never author the document from scratch (scratch-authoring is what drifts off-template):
   - `cp .agents/templates/product/prd-template.md artifacts/output/03-strategy/requirements.md`
   - `cp .agents/templates/product/user-story-template.md artifacts/output/03-strategy/user-stories.md`
   - **02a personas** → populate the full `.agents/templates/product/prd-template.md` structure and fill §6 Target Audience (max 3, mapped to ledger evidence)
   - **03a user stories** → populate the full `.agents/templates/product/user-story-template.md` structure with AC-H / AC-U / AC-E per story
   - **04a screen states** → use `.agents/templates/product/product-spec-template.md` for states, transitions, and edge states
   - **05a design tokens** → use `.agents/templates/product/design.md` for the token layer and component states
2. **Full-template gate.** `requirements.md` must retain the complete numbered PRD structure (§§1–14), including the Evidence Ledger in §14. `user-stories.md` must retain the backlog tree, Epic → Feature → Story hierarchy, metadata, Business/Technical Requirements, Gherkin AC blocks, UI/UX notes, data notes, out-of-scope items, and open questions. A compact evidence summary is not a valid substitute for either document.
3. **Row-anchor every authored artifact.** Each persona trait, FR/NFR, story, AC, screen state, and token decision cites the ledger rows (`L-NN`) it is earned from. Keep the template's `Traces to PRD` field and append the ledger IDs to that field (or to the AC evidence line); never replace the FR reference. A statement with neither a ledger row nor a new `[OPEN]` row is a grounding violation — halt and fix.
4. **The ledger is fixed input** — do not re-interpret the prototype, do not strengthen evidence into claims it does not support. New discoveries during synthesis append `[OPEN]` rows to §14 (owner questions), never inline invention.
5. Keep the loop honest: in `semi-autonomous` mode, pause at the same checkpoints create mode pauses at (personas → PRD, stories, screen states). This is a synthesis loop, not a generation prompt.
6. Every FR/NFR in `requirements.md` §7/§8 traces to ledger rows; ACs in `user-stories.md` reference the screen states they exercise and the ledger rows that support them.

## Output
- `artifacts/output/03-strategy/requirements.md` — complete `.agents/templates/product/prd-template.md` document, §§1–14, including the populated Evidence Ledger
- `artifacts/output/03-strategy/user-stories.md` — complete `.agents/templates/product/user-story-template.md` document, with row-anchored stories and Gherkin ACs
- `artifacts/output/03-strategy/product-spec.md` and `artifacts/output/03-strategy/design.md` — complete outputs from their existing templates

## Halt conditions
- Any required PRD or user-story template section/field is missing
- **`node .agents/scripts/template_conformance.js check --mode reverse` exits non-zero** (mechanical enforcement of the full-template gate — a compact/off-template substitute fails here)
- Any authored statement without a ledger row or `[OPEN]` row (grounding violation)
- A story AC contradicts its cited ledger rows
- Ledger missing or containing `confirmed` rows with unresolvable anchors

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 3`
