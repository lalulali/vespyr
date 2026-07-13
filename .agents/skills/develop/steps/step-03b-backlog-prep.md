---
step: 3b
name: Backlog Preparation
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-03a completed
---

# Step 3b — Backlog Preparation

`@tech-lead` reviews stories, plans the build sequence, and evaluates parallelism for multi-developer execution.

## Goal
Produce the execution plan: task breakdown, estimates, dependencies, and parallelism decisions. This document gates all development work.

## Inputs
- `artifacts/output/02-strategy/user-stories.md`
- `artifacts/output/04-planning/kanban.md`
- ADRs from `artifacts/output/03-architecture/` (if they exist)

## Agent invocation
`@tech-lead`:
- Reviews user stories and the Kanban board (`artifacts/output/04-planning/kanban.md`)
- Evaluates task dependencies and file isolation
- Determines parallel developer count (1 to N) based on independent work streams
- Plans implementation sequence and assigns role tags (FE / BE / Full-Stack)
- Identifies technical unknowns or risky zones requiring spikes

## Output
`artifacts/output/04-planning/execution-plan.md` — use template `.agents/templates/planning/execution-plan-template.md`

After writing the execution plan, record it:
```bash
node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact 04-planning/execution-plan.md
```

## Halt condition
Dependency chain that forces serial execution on a time-critical feature. Escalate to `@product-manager` for scope negotiation.

## Delegation
- Reads: @reader (user stories, kanban board, ADRs)
- Writes: @writer (execution-plan.md)
- Runs: @executor (orchestrator_state.js complete)
