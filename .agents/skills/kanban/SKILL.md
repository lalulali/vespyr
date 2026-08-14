---
name: kanban
description: Display and update the Kanban board — track task progress across phases
metadata:
  version: "1.0"
---

## Persona delegation
This skill delegates to `@product-manager`. The pm manages backlog prioritization, task state transitions, blocker resolution, and Kanban board structure. The skill file provides the display format; `@product-manager` provides the decisions on task movement, priority ordering, and blocker escalation.

## What this skill does

Shows the current state of the Kanban board and allows quick updates. The Kanban is initialized during Phase 4 (Planning) and updated continuously throughout the project.

## When to use

- "Show me the Kanban"
- "Move task X to Done"
- "What's blocked?"
- "Add a new task"

## Workflow

### Step 1: Check if Kanban exists

Check for `artifacts/output/05-planning/kanban.md`.

If it doesn't exist:
- Recommend running the `develop` skill to initialize it during planning
- Or create a minimal Kanban with columns: Backlog, In Progress, Review, Done

### Step 2: Display

Read and display the current Kanban board. Group by column:

```
## Kanban Board

### Backlog
- [ ] Task A
- [ ] Task B

### In Progress
- [ ] Task C (assigned to @developer-1)

### Review
- [ ] Task D (awaiting @code-reviewer)

### Done
- [x] Task E
- [x] Task F

### Blocked
- [ ] Task G — waiting on {blocker}
```

### Step 3: Update (on request)

Support these operations:
- **Move** — change a task's column
- **Add** — new task to Backlog
- **Block** — mark a task as blocked with reason
- **Unblock** — remove blocker
- **Complete** — mark as done

Update `artifacts/output/05-planning/kanban.md` and log the change to `artifacts/memory/agent-notes/product-manager-notes.md` via `@memory-controller write`.

## State machine integration

At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact kanban-update`
