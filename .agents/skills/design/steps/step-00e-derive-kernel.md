---
step: 0e
name: Derive Spec Kernel (Imported Sub-Track)
mode: reverse
sub_track: imported
prerequisites:
  - step-0 scope locked with track `reverse`, sub-track `imported`
  - prototype-inventory.md exists (step-1e completed)
output_contract:
  citations: not-required
---

# Step 0e — Derive Spec Kernel (Reverse Mode, Imported Sub-Track only)

The `generated` sub-track inherits its SPEC.md Spec Kernel from the forward PM flow. The `imported` sub-track has no upstream PM flow, so the kernel does not exist yet. Rather than halt, `@product-manager` **reverse-derives** the kernel from the prototype inventory. This runs once, after ingest (step-1e) and before the Evidence Ledger (step-2).

This step does NOT run for the `generated` sub-track. If `artifacts/output/03-strategy/SPEC.md` already exists, skip this step and proceed to step-2.

## Prerequisites
- Step 0 scope locked with track `reverse`, sub-track `imported`.
- `artifacts/output/03-strategy/prototype-inventory.md` exists with anchored rows (step-1e).
- No `artifacts/output/03-strategy/SPEC.md` yet (if one exists, this is the `generated` sub-track — do not run this step).

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 0e`

1. `@product-manager` reads `prototype-inventory.md`. The inventory is the sole evidence source; the kernel is a distillation of what the prototype demonstrably does, not an invention.
2. Write `artifacts/output/03-strategy/SPEC.md` from `.agents/templates/product/SPEC.md`, filling the 5 fields:
   - **Why** — the problem/user inferred from the prototype's domain. Where the prototype cannot prove a claim, mark it `[OPEN]` for the owner rather than inventing motivation.
   - **Capabilities** — one CAP per observable capability in the inventory. Each `success:` line must be grounded in an observable prototype fact (an `INV-NN` row or `path#id` anchor). A capability with no observable success signal is `[OPEN]`, not a guess.
   - **Constraints** — read from the actual prototype (tech stack, tokens, breakpoints, a11y affordances present in the HTML/CSS).
   - **Non-goals** — what the prototype visibly does NOT do (placeholder/non-functional blocks observed in step-1e's scope boundary).
   - **Success signal** — if the prototype implies no measurable target, mark `[OPEN]` and put the question to the owner. Never fabricate a metric or date.
3. Set frontmatter `prototype_track` / `prototype_runtime` from the locked track and the imported source's actual runtime (typically `static-html` / vanilla HTML for an exported prototype).
4. **No anchor, no capability.** Every CAP intent/success ties to an inventory row. Unprovable fields are `[OPEN]` for the owner, mirrored into the PRD §12 during synthesis (step-3).
5. This derived kernel is a **draft contract**. It carries `[OPEN]` rows forward; it is not a frozen truth. The owner confirms or corrects `[OPEN]` fields during synthesis and the parity gate.

## Output
`artifacts/output/03-strategy/SPEC.md` — the reverse-derived 5-field kernel, every capability anchored to an inventory row or explicitly `[OPEN]`. This becomes the agent-facing contract consumed by the Evidence Ledger (step-2) and downstream `/develop`, exactly as in the forward flow.

## Halt conditions
- `prototype-inventory.md` missing or unanchored (run step-1e first).
- A derived CAP `success:` line cannot resolve to any inventory anchor and is not marked `[OPEN]` — fix the anchor or demote to `[OPEN]`.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 0e`
