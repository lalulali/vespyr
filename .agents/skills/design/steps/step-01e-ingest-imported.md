---
step: 1e
name: Ingest Imported Prototype
mode: reverse
sub_track: imported
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1e — Ingest Imported Prototype (Reverse Mode, Imported Sub-Track)

Inventory an externally-authored prototype into `prototype-inventory.md` — extraction only, no interpretation, no spec language. This is the imported-source twin of `step-01d-ingest-prototype.md`: the inventory output, anchoring grammar, and completeness bar are identical. The difference is the **source** (authored outside Vespyr — Figma export, Google Stitch, hand-coded HTML) and the **baseline hash** (an import baseline hash, which promises less than the generated track's).

Use this step when the prototype was made in an external design tool for pixel-perfect fidelity and imported into the repository. Use `step-01d` instead when Vespyr generated the prototype itself.

## Prerequisites
- Step 0 scope locked with track `reverse`, sub-track `imported`.
- A reachable prototype under `artifacts/input/prototype/` (the canonical import location; the installer scaffolds this folder).
- **No SPEC.md kernel is required to start.** The kernel is derived (step-0e) after this step. This is the deliberate divergence from the `generated` sub-track.

## Import baseline hash (honest limitation — read before ingesting)

On ingest, compute a SHA-256 hash of the imported prototype file(s) and record it as the **import baseline hash** in `prototype-inventory.md` frontmatter (`import_baseline: <sha256>`, `import_source: <tool or "hand-coded">`, `imported_at: <ISO date>`).

The import baseline hash proves this exact file is unchanged since ingest. It does **NOT** prove the imported file still matches its origin in the design tool. If a designer edits Figma/Stitch and does not re-export, the imported file still matches its hash while the real design has moved on. Detecting a design-tool edit is a **human responsibility** — the engine can only enforce file parity, never origin parity. Do not present the import baseline hash as a guarantee of design-tool parity in any downstream record.

## Completeness gate (runs BEFORE inventorying)
The same five criteria as `step-01d` apply — real content topology, the 3 critical state moments (Day 0 / Day 30 / Error), real design tokens, tactile micro-feedback, and a stack gate. Reject and halt on failure; write no inventory.

**Imported-source escape hatch (non-interactive exports):** an exported static prototype from a design tool may not ship toggleable JS states — the states may exist as separate frames/screens rather than one interactive file. When the source is a non-interactive export:
- The 3 critical state moments may be satisfied by **distinct exported screens/frames** (each with its own anchor) rather than toggleable states in one file. Record each as its own `state` row.
- If a critical state is genuinely absent (not merely non-toggleable), it is a real gap → reject, or obtain an explicit owner-approved disposition recorded in the collaboration record.
- Set frontmatter `prototype_type: non-file` when the authoritative source is a live design-tool URL rather than the imported file; the baseline hash is honestly weaker (labeled above and at step-04d).

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 1e`

1. Do NOT modify the imported prototype. It is immutable-on-arrival; treat `artifacts/input/prototype/` as read-only.
2. `@product-designer` walks the imported prototype: every screen, flow, behavior, state, interaction.
3. Record one row per observation in `prototype-inventory.md` (template: `.agents/templates/product/prototype-inventory-template.md`): stable row id (`INV-NN`), kind (`screen` | `flow` | `behavior` | `state` | `interaction`), name, anchor `path#id`, observable fact.
   - Frozen anchor grammar (A11): repo-relative POSIX path + one `#` + anchor token. For imported HTML/SVG, anchors are `id="<id>"` attributes; multi-file exports anchor to the specific exported file's `path#id`.
4. **Extraction only** — record what the prototype does, verbatim where copy matters. No requirements language ("should", "must"), no interpretation, no design opinions.
5. Record the **import baseline hash** frontmatter (hash, source tool, import date) as described above.
6. **Designer–tech collaboration checkpoint** — before Step 2, `@product-designer` and `@tech-lead` review the inventory and walkable prototype together (add `@architect` when a system/data boundary appears). Record `artifacts/output/03-strategy/prototype-collaboration.md` using `.agents/templates/product/prototype-collaboration-template.md`, noting the imported source and the import-baseline limitation.
7. **Collaboration gate** — run the fail-closed validator; a missing, stale, mismatched, or unsigned record halts R2:

   ```bash
   node .agents/scripts/prototype_collab_gate.js verify \
     --record artifacts/output/03-strategy/prototype-collaboration.md \
     --track <static-html|nextjs-component> \
     --prototype artifacts/input/prototype/<file> --scope r1-evidence --json
   ```

   Do not proceed on a failed validator. An explicit `Implementation handoff: BLOCKED` is allowed for `r1-evidence` and must remain visible downstream.
8. Nothing enters the inventory that is not observable in the prototype. Suspected-but-unobserved behavior goes in the session summary as a question, never as a row.

## Output
`artifacts/output/03-strategy/prototype-inventory.md` — one row per observed behavior, every row anchored; frontmatter carries the import baseline hash (`import_baseline`, `import_source`, `imported_at`).
`artifacts/output/03-strategy/prototype-collaboration.md` — designer–tech review record, required before R2.

## Next step
Proceed to `steps/step-00e-derive-kernel.md` to reverse-derive the SPEC.md kernel, then to `steps/step-02d-evidence-ledger.md`.

## Halt conditions
- Completeness gate failure (above), absent the imported-source escape hatch disposition.
- Prototype unreachable under `artifacts/input/prototype/`.
- Missing, stale, mismatched, unsigned, or `BLOCKED` designer–tech collaboration checkpoint without owner disposition.
- `prototype_collab_gate.js verify` exits non-zero.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 1e`
