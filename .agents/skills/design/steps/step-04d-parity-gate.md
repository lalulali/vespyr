---
step: 4d
name: Parity Gate
mode: reverse
prerequisites:
  - step-3 completed
output_contract:
  citations: not-required
---

# Step 4 — Parity Gate (Reverse Mode)

Count the parity — never feel it. Run `spec_parity.js`, complete the 10-class detail checklist, produce `parity-report.md`, and stamp the **freeze boundary** (Review 10 §4). This is the handoff gate: after this step the spec is the contractual truth and the prototype is an immutable reference.

## Prerequisites
- Synthesized artifacts (step-3) + ledger + inventory.
- `artifacts/output/03-strategy/prototype-collaboration.md` exists from the `@product-designer` + `@tech-lead` review, names the selected prototype track, records separate reviewer sign-offs, and passes `prototype_collab_gate.js verify`.
- `requirements.md` follows `.agents/templates/product/prd-template.md`, including §14 and the `L-NN` / `Type` / `Status` ledger columns.
- `user-stories.md` follows `.agents/templates/product/user-story-template.md`, including hierarchy, metadata, `Traces to PRD`, and Gherkin AC blocks.
- `spec_parity.js` present; a missing or stubbed script is a loud failure, never a silent skip.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 4`

1. **Track and collaboration check** — confirm the parity report records the selected prototype track/runtime and links `prototype-collaboration.md`; run `prototype_collab_gate.js verify --scope r1-evidence` with the same track and prototype. A missing, stale, mismatched, or unsigned checkpoint halts the gate; an explicit `Implementation handoff: BLOCKED` is carried forward as a release blocker.
2. **Template conformance (mechanical)** — before parity metrics, confirm the synthesized docs actually follow the canonical templates:
   ```bash
   node .agents/scripts/template_conformance.js check --mode reverse
   ```
   Exit 0 required. A compact/off-template `requirements.md` or a flat `user-stories.md` (no Epic/Feature hierarchy, no Gherkin AC) halts the gate — this is the mechanical backstop for the step-3 full-template gate.
   Also run the template-version leak guard on the generated documents (a first-generation doc must be version 1, never the template's revision number):
   ```bash
   node .agents/scripts/template_version_guard.js check \
     --file artifacts/output/03-strategy/requirements.md \
     --file artifacts/output/03-strategy/user-stories.md
   ```
   Exit 0 required. A non-zero exit means the template's internal `Template Revision History` metadata was copied into the document — remove it and set the document version to 1.
3. **Metrics pass** — fix violations before writing the report:
   ```bash
   node .agents/scripts/spec_parity.js check --inventory <inventory> --requirements <requirements> --report <report> --metrics-only
   ```
   Ghosts must be 0; orphans 0-or-deferred; grounding 100% of non-`[OPEN]`.
4. **Write `parity-report.md`** (template: `.agents/templates/product/parity-report-template.md`) with the selected track, collaboration link, the 5 metrics, the 10-class coverage table (evidence = ledger IDs or anchors; `N/A: reason` allowed), and orphan deferrals (owner + date).
5. **Freeze boundary** — stamp the witness:
   ```bash
   node .agents/scripts/spec_parity.js witness stamp --report <report> --prototype <prototype>
   ```
   File prototypes: SHA-256. Non-file prototypes (Figma URL, live code): source pointer + access timestamp + inventory snapshot hash — honestly weaker (A3), labeled as such in the report.
6. **Gate run** — `spec_parity.js check` (full) must exit 0: ghosts = 0, orphans 0-or-deferred, grounding 100%, classes 10/10, witness stamped.
7. **Owner sampling (A7 — judged tier).** Present 3 of N ledger statements to the owner; each anchor is verified to actually support its claim. Record the sampled rows + disposition in the report. Structural gates never claim this check.
8. **Parity delta vs traditional (A8).** Record the first-run calibration (AC count + detail-class counts); no threshold is invented — owner disposition is mandatory and blocking in the report.

## Output
`artifacts/output/03-strategy/parity-report.md` — selected track + collaboration link + metrics + 10-class table + deferrals + witness + sampling + delta; `check` exits 0.

## Handoff reminder — AC enrichment (recommended, not blocking)
This gate proves the spec matches the prototype; it does NOT prove the acceptance criteria are deep. First-pass reverse-mode ACs are typically a happy-path skeleton. Before `/develop`, remind the owner (in plain language) to run the enrichment pass: `/elicitation` on `user-stories.md` → **AC Enrichment Sweep** (crosses each component against the 12 risk categories, adds `[derived]` failure/edge criteria). Record run-or-deferred in the parity report. Do not block handoff on it.

## Halt conditions
- `template_conformance.js check --mode reverse` exits 1 (off-template PRD or user-stories) — fix, never waive
- `template_version_guard.js check` exits 1 (template revision metadata copied into a generated document) — remove it and set the document version to 1, never waive
- `check` exits 1 (ghost / unresolved orphan / class gap) — fix, never waive
- Witness cannot be stamped (prototype missing / unreadable)
- Owner sampling or parity-delta disposition left unrecorded — gate stays open
- Prototype collaboration record is missing, stale, mismatched, unsigned, `BLOCKED`, or fails `prototype_collab_gate.js verify` — gate stays open

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 4`
