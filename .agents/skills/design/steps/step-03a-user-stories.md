---
step: 3a
name: User Stories
mode: create
prerequisites:
  - step-02 completed
output_contract:
  citations: not-required
---

# Step 3 — User Stories

Write exhaustive, testable user stories from the validated PRD. These are the engineering contract.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 3`
## Goal
Every PRD feature must have ≥1 user story. Every user story must have acceptance criteria. Stories must be testable by QA.

## User-story template contract
Start from `.agents/templates/product/user-story-template.md`; do not replace it with a flat story list. Preserve the backlog tree, Epic → Feature → Story hierarchy, metadata fields, Business/Technical Requirements, all applicable Gherkin `AC-H`/`AC-U`/`AC-E` blocks, UI/UX notes, data notes, out-of-scope items, and open questions. Every story must retain a real `Traces to PRD` FR reference and a `Traces to Product Spec` reference. A missing template block is a handoff failure.

**Scaffold first, then populate (do NOT author from scratch):**
1. Copy the template to the output path before writing any content:
   ```bash
   cp .agents/templates/product/user-story-template.md artifacts/output/03-strategy/user-stories.md
   ```
2. Replace the placeholder Epic/Feature/Story blocks with real ones, keeping the hierarchy, every per-story metadata field, the Business/Technical Requirement sections, the multi-line Given/When/Then AC blocks, and the Story Dependencies Diagram. Never collapse stories into a flat `US-NN` list or a "story matrix" summary table — that is the exact off-template drift observed in the 2026-09 parity benchmarks.

## Agent invocation
`@product-manager` generates user stories from the PRD:
- Exhaustive coverage — every feature, edge case, and error state
- Acceptance criteria per story: AC-H (happy path), AC-U (unhappy/error path), AC-E (edge case)
- Stories must reference specific screen states and transitions from the product spec

## Alignment rules
- User stories MUST strictly align with the validated PRD
- Screen transitions and UI edge cases in the product spec must map directly to story ACs
- Zero divergences or omission of spec details

## Gate check
- Every PRD feature has ≥1 user story
- Every user story has AC-H, AC-U, AC-E
- All user stories strictly follow the PRD and product spec
- Cross-validation checklist passes (PM agent Step 4)
- **Template conformance (mechanical):** `node .agents/scripts/template_conformance.js check --mode create` exits 0. A flat story list, missing Epic/Feature hierarchy, missing per-story metadata, or single-line (non-Gherkin) ACs fail this gate — fix before proceeding.

## Output
`artifacts/output/03-strategy/user-stories.md` — use template `.agents/templates/product/user-story-template.md`

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 03-strategy/user-stories.md
```

Write story architecture decisions to memory:
```
@memory-controller write active-decisions.md
### [PRODUCT] User Story Map for {feature} [date: YYYY-MM-DD] [agent: @product-manager]
{story count, key architectural decisions encoded in ACs, any planned deferrals}
**Status:** active
```

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 3`
