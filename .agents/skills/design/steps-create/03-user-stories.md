---
step: 3
name: User Stories
mode: create
prerequisites:
  - step-02 completed
delegation:
  reads: "direct (personas + spec-kernel; per delegation-policy.md < 3 files < 500 lines)"
  writes: "@writer (user-stories.md; per delegation-policy.md output file)"
  runs: none
  direct_justified: ["< 3 small input files already in context"]
output_contract:
  citations: not-required
---

# Step 3 — User Stories

Write exhaustive, testable user stories from the validated PRD. These are the engineering contract.

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
`artifacts/output/02-strategy/user-stories.md` — use template `.agents/templates/product/user-story-template.md`

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-strategy/user-stories.md
```

## Delegation
- **Reads:** direct — personas + spec-kernel (< 3 files, < 500 lines)
- **Writes:** @writer for user-stories.md
