---
step: 1d
name: Ingest Prototype
mode: reverse
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1 — Ingest Prototype (Reverse Mode)

Inventory the prototype into `prototype-inventory.md` — extraction only, no interpretation, no spec language. This is the evidence source for the PRD synthesis; everything downstream anchors here.

## Prerequisites
- Step 0 scope locked with track `reverse`.
- **SPEC.md Spec Kernel exists** (Review 10 §4 — required input anchor for reverse mode). Missing kernel → halt; reverse mode does not run kernel-less.
- Prototype source is reachable and walkable (HTML mock, code, Figma export, AI-generated prototype — tool-agnostic).

## Completeness gate (Review 10 §4 — runs BEFORE inventorying)
Reject the prototype and halt if any criterion fails:

1. **Real content topology** — real data shapes (long names, multi-line text, realistic quantities). `Lorem Ipsum` / "John Doe" placeholders = reject.
2. **The 3 critical state moments** — Day 0 (empty), Day 30 (populated), and Error (recovery) exist and are toggleable, not merely described.
3. **Real design tokens** — colors, type scale, spacing, and radii reference the token layer; ad-hoc values scattered outside the token definition = reject.
4. **Tactile micro-feedback** — hover/active/focus states, skeletons, or disabled states present.

On rejection: list each failed criterion with what you observed, write no inventory file, and route back to the prototype sandbox.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 1`

1. `@product-designer` walks the prototype: every screen, flow, behavior, state, interaction.
2. Record one row per observation in `prototype-inventory.md` (template: `.agents/templates/product/prototype-inventory-template.md`): stable row id (`INV-NN`), kind (`screen` | `flow` | `behavior` | `state` | `interaction`), name, anchor `path#id`, observable fact.
   - Frozen anchor grammar (A11): repo-relative POSIX path + one `#` + anchor token. HTML/SVG anchors are `id="<id>"` attributes; other files use a word-boundary symbol occurrence.
3. **Extraction only** — record what the prototype does, verbatim where copy matters. No requirements language ("should", "must"), no interpretation, no design opinions.
4. Non-file prototypes (Figma URL, live code): rows anchor to `prototype-inventory.md#INV-NN` and the frontmatter carries `prototype_type: non-file`. The Sync Contract v2 witness (A3) is honestly weaker — labeled at step-04d.
5. Nothing enters the inventory that is not observable in the prototype. Suspected-but-unobserved behavior goes in the session summary as a question, never as a row.

## Output
`artifacts/output/03-strategy/prototype-inventory.md` — one row per observed behavior, every row anchored.

## Halt conditions
- Completeness gate failure (above)
- Missing SPEC.md kernel
- Prototype unreachable

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 1`
