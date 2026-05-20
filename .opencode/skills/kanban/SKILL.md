---
name: kanban
description: Display and update the Kanban board — track task progress across phases
---

## What this skill does

Shows the current state of the Kanban board and allows quick updates. The Kanban is initialized during Phase 4 (Planning) and updated continuously throughout the project.

## When to use

- "Show me the Kanban"
- "Move task X to Done"
- "What's blocked?"
- "Add a new task"

## Workflow

### Step 1: Check if Kanban exists

Check for `artifacts/output/05-project-management/kanban.md`.

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

Update `artifacts/output/05-project-management/kanban.md` and log the change to `artifacts/memory/project-manager-notes.md` via `@memory-controller write`.
