---
step: 2
name: Define Personas
mode: create
prerequisites:
  - step-01 completed
delegation:
  reads: "direct (research summaries; per delegation-policy.md < 3 files < 500 lines)"
  writes: "@writer (personas output; per delegation-policy.md output file)"
  runs: none
  direct_justified: ["research artifacts < 500 lines total, < 3 files"]
output_contract:
  citations: not-required
---

# Step 2 — Define Personas

Define user personas from research data. Personas drive user stories and screen design.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 2`
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
- `artifacts/output/03-strategy/requirements.md` — use template `.agents/templates/product/prd-template.md` (full stakeholder PRD)
- `artifacts/output/03-strategy/SPEC.md` — distill the full PRD into the 5-field spec kernel (`.agents/templates/product/SPEC.md`). This is the agent-facing contract — every downstream agent reads this instead of the full PRD.
- Persona definitions (integrated into PRD)

## Delegation
- **Reads:** direct — research summaries (< 3 files, < 500 lines total)
- **Writes:** @writer for personas output

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 2`
