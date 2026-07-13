---
step: 2
name: Define Personas
mode: create
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites:
  - step-01 completed
---

# Step 2 — Define Personas

Define user personas from research data. Personas drive user stories and screen design.

## Goal
Create concrete, named personas that represent the target users. Personas make requirements user-centered instead of feature-centered.

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

## Output
- `artifacts/output/02-strategy/requirements.md` — use template `.agents/templates/product/prd-template.md` (full stakeholder PRD)
- `artifacts/output/02-strategy/SPEC.md` — distill the full PRD into the 5-field spec kernel (`.agents/templates/product/SPEC.md`). This is the agent-facing contract — every downstream agent reads this instead of the full PRD.
- Persona definitions (integrated into PRD)

## Delegation
- Reads: @reader (research artifacts, PRD, stories)
- Writes: @writer (PRD, user stories, spec files, design.md)
- Direct: PM and designer reasoning is direct
