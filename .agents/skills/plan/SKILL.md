---
name: plan
description: Create an execution plan from existing specs — standalone, outside the full develop cycle
version: "2.0"
last_updated: 2026-07-10
---

# Plan — Execution Planning

## What this skill does

Takes existing product specs and produces a task breakdown with effort estimates, dependencies, and parallelization opportunities. Use when you need a plan without running the full `/develop` workflow.

## When to use

- "Plan out how we'll build this feature"
- "Break this spec into tasks"
- "How long will this take?"
- Standalone planning outside the full development cycle

## When NOT to use

- When no spec exists (run `/design` first)
- When you need architecture decisions (run the full `/develop` for ADRs)

## Prerequisites

- `artifacts/output/02-strategy/product-spec.md` exists
- `artifacts/output/02-strategy/user-stories.md` exists (recommended)
- Architecture decisions (ADRs) in `03-architecture/` (recommended)

## Execution plan template

```markdown
# Execution Plan — {feature name}
**Planned:** YYYY-MM-DD
**Estimated total:** {N} hours
**Developers needed:** {N}
**Parallelizable tasks:** {N} of {total}

## Task list

| ID | Task | Est. (h) | Depends On | Parallel With | Assignee | Done |
|---|---|---|---|---|---|---|
| T001 | ... | 2 | — | T002 | — | [ ] |
| T002 | ... | 3 | — | T001 | — | [ ] |

## Dependency graph

T001 ← T003
T002 ← T003

## Risk register
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ... | Low/Med/High | Low/Med/High | ... |
```

## Task granularity rules

- **1-4 hours per task** — per `@tech-lead` charter. Tasks smaller than 1h are over-specified. Tasks larger than 4h need decomposition.
- **Idempotent tasks** — each task can be run from scratch without side effects.
- **Independent where possible** — mark parallelizable tasks explicitly.
- **Spike tasks** — if a task is exploratory, mark it as a spike with a timebox (max 2h).

## Dependency syntax

| Syntax | Meaning |
|---|---|
| `T001 ← T003` | T003 depends on T001 (T001 must finish first) |
| `—` | No dependencies |
| `T001 → T003` | T001 feeds T003 (data/artifact dependency, not execution order) |

## Worktree allocation

For parallel development (Phase 6 Loop Engineering), each developer gets its own git worktree:

```bash
node .agents/scripts/worktree.js create feature/T003
```

Each worktree is an isolated checkout on its own branch. Worktrees are tracked in `.agents/state/loop-state.json`. Use `worktree.js clean <branch>` to remove a completed worktree.

## Workflow

### Step 1: Load context

```
@memory-controller load tech-lead [execution planning from specs]
```

### Step 2: Review specs

Read the product spec and user stories. Identify:
- All features and their acceptance criteria
- Edge cases and error states
- Technical constraints from the spec

### Step 3: Architecture check

If no architecture artifacts exist:
- Flag that architecture decisions are needed
- Recommend running `develop` for the full workflow

If ADRs exist:
- Verify the architecture supports all spec requirements
- Note any gaps

### Step 4: Break down tasks

For each feature:
- Break into small, independent tasks (1-4 hours each)
- Define task dependencies using the dependency syntax above
- Estimate effort (small=1-2h, medium=3-4h)
- Identify risky areas (spikes, max 2h)
- Mark parallelizable tasks

### Step 5: Write execution plan

Output: `artifacts/output/04-planning/execution-plan.md`

Use the template above. Include the full task table, dependency graph, and risk register.

## Output artifacts

- `artifacts/output/04-planning/execution-plan.md` (primary output)

## State machine integration

At end: `node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact execution-plan.md`
