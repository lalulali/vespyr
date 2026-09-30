---
step: 2a
name: Define Personas
mode: create
prerequisites:
  - step-01 completed
output_contract:
  citations: not-required
---

# Step 2 — Define Personas

Define user personas from research data. Personas drive user stories and screen design.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 2`
## Goal
Create concrete, named personas that represent the target users. Personas make requirements user-centered instead of feature-centered.

## PRD template contract
Start from `.agents/templates/product/prd-template.md` and preserve its complete numbered structure. Do not emit a shortened PRD or move the ledger into a separate summary document. Sections that are not applicable in create mode must be marked explicitly rather than silently removed; reverse-only §14 is completed later by the reverse-mode ledger step.

**Scaffold first, then populate (do NOT author from scratch):**
1. Copy the template to the output path before writing any content:
   ```bash
   cp .agents/templates/product/prd-template.md artifacts/output/03-strategy/requirements.md
   ```
2. Fill in each of the §§1–14 sections in place. Keep every numbered heading. For a section with no content in create mode, write `_Not applicable in create mode._` (or the reverse-only note for §14) — never delete the heading.
3. **Document version, not template version.** Set the document's `**Version:**` field to `1` on first generation with `**Last changed:**` = today and a `- v1: Initial draft` change-log line. The `Template Revision History` comment (template v5, etc.) is Vespyr-internal and must never be copied into the document's version field — a brand-new PRD is v1, not v5.
4. This scaffold-first rule exists because authoring the PRD from scratch lets the document drift off-template (observed in the 2026-09 parity benchmarks). Populating a copied skeleton keeps the structure by construction.

## Agent invocation
`@product-manager` synthesizes research into personas:
- Name, role, context (who they are, what they do)
- Goals (what they're trying to accomplish)
- Pain points (what frustrates them today)
- Behaviors (how they work around the problem now)
- Motivations (what gets them promoted, what keeps them up at night)

## Persona count
- Minimum 1, maximum 3. More than 3 suggests the scope is too broad.
- Each persona must map to a distinct user segment from the research.

## PRD creation
With personas and feature scope defined, `@product-manager` generates the PRD:
- Strategic document: what and why
- Measurable business goals
- Feature list mapped to personas

If in `semi-autonomous` mode and `FeatureDesignInteraction` is not `false`:
- **Pause** and present the PRD to the user for validation
- Incorporate feedback until approved

## Gate check before proceeding
- PRD contains measurable business goals
- Every feature maps to ≥1 persona
- PRD validated by user (if semi-autonomous)
- Kernel self-validate: run the 8-rule check from `.agents/references/spec-law.md` against SPEC.md before handoff. Fix violations.
- **Template conformance (mechanical):** `node .agents/scripts/template_conformance.js check --mode create` exits 0. A missing §§1–14 section, FR table, or NFR rows fails this gate — fix before proceeding.

## Output
- `artifacts/output/03-strategy/requirements.md` — use template `.agents/templates/product/prd-template.md` (full stakeholder PRD)
- `artifacts/output/03-strategy/SPEC.md` — distill the full PRD into the 5-field spec kernel (`.agents/templates/product/SPEC.md`). This is the agent-facing contract — every downstream agent reads this instead of the full PRD.
- Persona definitions (integrated into PRD)

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 2`
