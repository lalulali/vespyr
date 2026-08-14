---
step: 4
name: Kanban Activation
prerequisites:
  - step-03b completed
  - execution-plan.md exists
output_contract:
  citations: not-required
---

# Step 4 — Kanban Activation

Activate the Kanban board. This is a gate — development cannot start until the PM confirms the backlog and the tech-lead activates tasks.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 4`
## Goal
PM confirms the prioritized backlog is correct and aligned with sprint deadlines. Tech-lead activates tasks by moving them to "To Do" on the Kanban board.

## Agent invocation
- `@product-manager` reviews the prioritized backlog:
  - Confirms alignment with sprint goals and deadlines
  - Verifies task priority order matches business value
- `@tech-lead` activates tasks once PM confirms:
  - Moves tasks to "To Do" column
  - Assigns role tags per the execution plan

## Inputs
- `artifacts/output/05-planning/kanban.md`
- `artifacts/output/05-planning/execution-plan.md`

## Output
Updated `artifacts/output/05-planning/kanban.md` with tasks in "To Do" — use template `.agents/templates/planning/kanban-template.md`

## Memory closeout
- `@memory-controller session-write` — record step 4 kanban activation status.

## Delegation
- **Memory:** @memory-controller for session-write

## Halt condition
PM does not sign off. Re-scope with `@product-manager` before continuing.



> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 4`
