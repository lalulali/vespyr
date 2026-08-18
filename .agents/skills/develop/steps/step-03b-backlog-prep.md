---
step: 3b
name: Backlog Preparation
prerequisites:
  - step-03a completed
output_contract:
  citations: not-required
---

# Step 3b — Backlog Preparation

`@tech-lead` reviews stories, plans the build sequence, and evaluates parallelism for multi-developer execution.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 3b`
## Goal
Produce the execution plan: task breakdown, estimates, dependencies, and parallelism decisions. This document gates all development work.

## Inputs
- `artifacts/output/03-strategy/user-stories.md`
- `artifacts/output/05-planning/kanban.md`
- ADRs from `artifacts/output/04-architecture/` (if they exist)

## Agent invocation
`@tech-lead`:
- Reviews user stories and the Kanban board (`artifacts/output/05-planning/kanban.md`)
- Evaluates task dependencies and file isolation
- Determines parallel developer count (1 to N) based on independent work streams
- Plans implementation sequence and assigns role tags (FE / BE / Full-Stack)
- Identifies technical unknowns or risky zones requiring spikes

## Output
`artifacts/output/05-planning/execution-plan.md` — use template `.agents/templates/planning/execution-plan-template.md`

After writing the execution plan, record it:
```bash
node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact 05-planning/execution-plan.md
```

## Worktree Creation (multi-developer mode only)

If the execution plan has 2+ independent parallel tasks, `@tech-lead` MUST create worktrees **now** before proceeding to the next step. This is non-negotiable — the dev loop step expects worktrees to already exist unless the plan is single-developer.

### Step 0: Check prerequisites

Run:

```bash
# Resolve current branch
BRANCH=$(git branch --show-current)

# Validate git worktree support (required for multi-dev)
git worktree list 2>/dev/null && echo "WORKTREE_SUPPORTED" || echo "WORKTREE_NOT_SUPPORTED"
```

If `WORKTREE_NOT_SUPPORTED` is returned, fall back to single-developer mode regardless of the plan. Log this decision to `artifacts/memory/active-decisions.md`.

### Step 1: Create worktrees

Run for each parallel developer:

```bash
node .agents/scripts/worktree.js create feat/${BRANCH}/task-1
node .agents/scripts/worktree.js create feat/${BRANCH}/task-2
# ... one per developer slot
```

### Step 2: Verify

```bash
node .agents/scripts/worktree.js list
```

### Step 3: Update Kanban

Update `artifacts/output/05-planning/kanban.md` with the Task Assignment table (worktree branches, role tags) from the execution plan. The worktree paths are available via `worktree.js list`.

**Single-developer mode:** Skip worktree creation entirely.

**Spike hazard:** If step 5 (Spike) later changes the execution plan (new tasks, split tasks, dependency changes), the worktrees created here may be stale. Step 6.1 includes a re-validation gate for this scenario. If spike findings invalidate the worktree plan, step 6 will halt and escalate back to `@tech-lead` for re-allocation.

## Memory closeout
- `@memory-controller session-write` — record step 3b backlog preparation and execution plan.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 3b`
