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

> **Do not clobber step 3b's Task Assignment table.** Step 3b (`backlog-prep`) writes worktree
> branches and role tags into `kanban.md` before this step runs. Populating the board from
> `kanban-template.md` must **merge**, preserving that table — a template copy that overwrites
> it silently discards the worktree allocation, and nothing downstream would notice until a
> developer found their branch missing.

Updated `artifacts/output/05-planning/kanban.md` with tasks in "To Do" — use template `.agents/templates/planning/kanban-template.md`

## Memory closeout
- `@memory-controller session-write` — record step 4 kanban activation status.

## Delegation
- **Memory:** @memory-controller for session-write

## Halt condition
PM does not sign off. Re-scope with `@product-manager` before continuing. If a prototype is in scope, `prototype_collab_gate.js verify` must also pass before moving frontend tasks to `To Do`.



> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 4`
