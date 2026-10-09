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
- Step 0 locked the prototype track: `static-html` or `nextjs-component`.

## Prototype track contract

- **`static-html`:** verify a reachable `.html`/`.htm` source, a Tailwind Browser CDN reference, at least three real CSS custom-property tokens, toggleable empty/populated/error states, observable feedback, and no hidden React/Next implementation. Shadcn is a visual vocabulary here; do not require React, Next.js, `components.json`, or `@shadcn/lint`.
- **`nextjs-component`:** verify reachable component source, Next.js/React + Tailwind + shadcn evidence, `components.json`, and an executed clean `npm run lint` path that actually invokes `@shadcn/lint`; a config marker alone is insufficient.

Run the track-aware mechanical check before inventorying:

```bash
node .agents/scripts/shadcn_gate.js verify --track <static-html|nextjs-component> --prototype <prototype> --json
```

A static prototype must not be silently upgraded to a component implementation. A component prototype must not be downgraded to a visual approximation without an owner decision.

## Completeness gate (Review 10 §4 — runs BEFORE inventorying)
Reject the prototype and halt if any criterion fails:

1. **Real content topology** — real data shapes (long names, multi-line text, realistic quantities). `Lorem Ipsum` / "John Doe" placeholders = reject.
2. **The 3 critical state moments** — Day 0 (empty), Day 30 (populated), and Error (recovery) exist and are toggleable, not merely described.
3. **Real design tokens** — colors, type scale, spacing, and radii reference the token layer; ad-hoc values scattered outside the token definition = reject.
4. **Tactile micro-feedback** — hover/active/focus states, skeletons, or disabled states present.
5. **Track-specific stack gate** — for `nextjs-component`, the prototype must use component code and pass `npm run lint` with `@shadcn/lint` (SETUP.md) — zero `shadcn/*` violations. For `static-html`, the prototype must be a real HTML source with a Tailwind CDN reference and token layer; `@shadcn/lint` is not applicable.

On rejection: list each failed criterion with what you observed, write no inventory file, and route back to the prototype sandbox.

**There is one sanctioned exception, and it is in `step-01e`.** The rule above is correct as
written for a prototype authored inside this engine. But `step-01e` inherits the same five
criteria for an **imported** prototype, and an import is frequently deficient by construction —
hand-coded HTML has no toggleable states and is not expected to. There, a genuinely missing
critical state resolves to an **explicit owner-approved disposition in the collaboration
record**, not a halt.

So: prototype authored in-engine and incomplete → reject, write no inventory. Prototype imported
from outside → the `step-01e` escape hatch. A reader who has read only this file cannot tell the
two apart and will halt on an import that was always going to be allowed. The blind run that
died on exactly this is why the distinction is written down here rather than left to be
discovered from a gate's error message.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 1`

1. `@product-designer` walks the prototype: every screen, flow, behavior, state, interaction.
2. Record one row per observation in `prototype-inventory.md` (template: `.agents/templates/product/prototype-inventory-template.md`): stable row id (`INV-NN`), kind (`screen` | `flow` | `behavior` | `state` | `interaction`), name, anchor `path#id`, observable fact.
   - Anchor grammar (A11 + AM1): repo-relative POSIX path + one `#` + anchor token.

- `path#id` — **A11, frozen.** For HTML/SVG the token is an `id="<id>"` attribute; for other files a
  word-boundary symbol occurrence.
- `path#css=<selector>` — **AM1, added 2026-10-09.** A CSS selector subset: tag, `.class`, `#id`,
  `[attr]`, `[attr="v"]`, and the descendant (space) and child (`>`) combinators.
- `path#text=<phrase>` — **AM1, added 2026-10-09.** A verbatim phrase, at least 8 characters, which
  must actually occur in the file.

**Why AM1 exists.** A11 could not address an id-less file at all. `prototype.html#anything` fails
because no `id` exists, and the only other sanctioned form — anchoring to `prototype-inventory.md#INV-NN`
— is reserved for NON-file prototypes and is a self-reference that proves nothing about the prototype.
Measured on a real reverse-mode run: 28 of 41 ledger rows rested on a human-only pointer for exactly
this reason. AM1 is **additive**: every existing `path#id` anchor keeps its exact meaning.

**Do not add `id` attributes to a delivered prototype in order to make it auditable.** That changes
the artifact under audit, and the audit is supposed to describe what was handed over. An id-less
static HTML file is the normal case, not an exception.

Anything outside the selector subset — pseudo-classes, sibling combinators — is a non-match, never a
silent pass. An ambiguous anchor (matching more than once) resolves but is reported as ambiguous, so a
reviewer can tighten it.
3. **Extraction only** — record what the prototype does, verbatim where copy matters. No requirements language ("should", "must"), no interpretation, no design opinions.
4. **Designer–tech collaboration checkpoint** — before Step 2, `@product-designer` and `@tech-lead` review the inventory and walkable prototype together. Add `@architect` when the prototype creates a system or data boundary. Use `.agents/templates/product/prototype-collaboration-template.md` to record `artifacts/output/03-strategy/prototype-collaboration.md` with the selected track/runtime, prototype hash, track-gate evidence, separate reviewer sign-offs, reviewed states, token and responsive mapping, static-to-component mapping (static track) or component/API boundary (component track), feasibility/accessibility risks, decisions, open questions, and `SATISFIED` or `BLOCKED`.
5. **Collaboration gate** — run the fail-closed validator; a missing, stale, mismatched, or unsigned record halts R2:

   ```bash
   node .agents/scripts/prototype_collab_gate.js verify \\
     --record artifacts/output/03-strategy/prototype-collaboration.md \\
     --track <static-html|nextjs-component> \\
     --prototype <prototype> --scope r1-evidence --json
   ```

   Do not proceed on a failed validator. For `r1-evidence`, an explicit `Implementation handoff: BLOCKED` is allowed and must remain visible in the synthesized records; it still blocks `/develop` until the handoff scope passes.
6. Non-file prototypes (Figma URL, live code): rows anchor to `prototype-inventory.md#INV-NN` and the frontmatter carries `prototype_type: non-file`. The Sync Contract v2 baseline hash (A3) is honestly weaker — labeled at step-04d. A non-file prototype cannot satisfy the local static/Next mechanical proof; obtain an explicit owner-approved weaker evidence disposition.
7. Nothing enters the inventory that is not observable in the prototype. Suspected-but-unobserved behavior goes in the session summary as a question, never as a row.

## Output
`artifacts/output/03-strategy/prototype-inventory.md` — one row per observed behavior, every row anchored.
`artifacts/output/03-strategy/prototype-collaboration.md` — designer–tech review record, required before R2.

## Halt conditions
- Completeness gate failure (above)
- Missing SPEC.md kernel
- Prototype unreachable
- Missing, stale, mismatched, unsigned, or `BLOCKED` designer–tech collaboration checkpoint without owner disposition
- `prototype_collab_gate.js verify` exits non-zero

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 1`
