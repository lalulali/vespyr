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
