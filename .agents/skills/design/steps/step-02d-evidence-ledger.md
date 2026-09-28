---
step: 2d
name: Evidence Ledger
mode: reverse
prerequisites:
  - step-1 completed
output_contract:
  citations: not-required
---

# Step 2 — Evidence Ledger (Reverse Mode)

Initialize `requirements.md` from the complete `.agents/templates/product/prd-template.md` before writing the Evidence Ledger. The ledger is §14 of that same full PRD, not a standalone compact report. Preserve §§1–13 as placeholders until synthesis, mirror every `[OPEN]` question to §12, and never fill an evidence gap by inference (DNA 5 applied to specs). Every behavioral statement gets a `path#id` anchor.

## Prerequisites
- `prototype-inventory.md` exists with anchored rows (step-1).
- `artifacts/output/03-strategy/prototype-collaboration.md` records the selected track and designer–tech disposition, and `prototype_collab_gate.js verify` passes before synthesis.
- SPEC.md Spec Kernel loaded (`artifacts/output/03-strategy/SPEC.md`).

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 2`

1. `@product-manager` reads the inventory and the kernel; the inventory is fixed input — it is not re-interpreted.
2. For each inventory row, write one ledger row in `requirements.md` §14 (template: `.agents/templates/product/prd-template.md`): `ID` (`L-NN`), `Statement`, `Anchor (path#id)`, `Type` (`prototype` | `user` | `owner`), `Status` (`confirmed` | `[OPEN]` | `[DEFERRED TO SPEC]`).
3. **Anchors come from the inventory** — reuse the inventory row's `path#id` verbatim; never re-derive an anchor by hand. Non-file prototypes: anchor to `prototype-inventory.md#INV-NN`.
4. **No anchor, no fact.** A statement the prototype does not support is `[OPEN]` with the question put to the owner (mirrored to §12). Owner answers land as `owner`-type rows with the decision record as anchor, or the statement is dropped — never inferred.
5. **Fidelity Partition (Review 10 §4):** infrastructure, telemetry, persistence, and DB-bound statements that a prototype cannot prove are marked `[DEFERRED TO SPEC]` — still anchored to the prototype fact that motivates them.
6. Never rewrite an inventory fact into stronger spec language (`should`/`must` is synthesis, step-3). The ledger records what is true and where it is witnessed.

## Output
`artifacts/output/03-strategy/requirements.md` §14 Evidence Ledger — every row anchored or explicitly `[OPEN]`; `[DEFERRED TO SPEC]` rows carry a resolvable anchor.

## Halt conditions
- A `confirmed` row's anchor does not resolve (fix the anchor or demote the row to `[OPEN]`)
- Inventory missing or unanchored
- Owner unavailable for a blocking `[OPEN]` question — record it in §12 and proceed; the parity gate lists it

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 2`
