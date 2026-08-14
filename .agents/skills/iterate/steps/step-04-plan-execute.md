---
step: 4
name: Plan and Execute
prerequisites:
  - step-03a completed
  - step-03b completed (or determined unnecessary)
output_contract:
  citations: not-required
---

# Step 4 — Plan and Execute

Create the execution plan and implement iteration items using the dev loop from `develop`.

## Workflow

### 4a. Plan — @tech-lead + @product-manager

Invoke `@tech-lead` to:
- Break iteration items into tasks (typically smaller than new features)
- Estimate effort based on existing velocity
- Sequence for fastest delivery (quick wins first)

Invoke `@product-manager` to:
- Fit iteration work into existing cadence
- Manage scope and timeline trade-offs
- Coordinate with any ongoing development work

### 4b. Output plan

Write `artifacts/output/07-iteration/iteration-plan.md` using template:
```
.agents/templates/planning/execution-plan-template.md
```

### 4c. Execute dev loop

Run the same dev loop from `develop`:
- `@developer` implements
- `@code-reviewer` reviews (max 2 review cycles)
- `@qa-engineer` validates (max 2 QA cycles)
- `@product-manager` verifies

## Memory closeout
- `@memory-controller session-write` — record step 4 plan execution progress.

## Delegation
- **Memory:** @memory-controller for session-write


