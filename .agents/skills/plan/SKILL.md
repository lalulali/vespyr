---
name: plan
description: Create an execution plan from existing specs — standalone, outside the full develop cycle
version: "2.0"
last_updated: 2026-07-10
---

# Plan — Execution Planning

## What this skill does

Takes existing product specs and produces a task breakdown with effort estimates, dependencies, and parallelization opportunities.

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

- 1-4 hours per task — per @tech-lead charter. Tasks smaller than 1h are over-specified. Tasks larger than 4h need decomposition.
- Each task can be run from scratch without side effects.
- Mark parallelizable tasks explicitly.
- Spike tasks: mark as spike with a timebox (max 2h).

## Dependency syntax

| Syntax | Meaning |
|---|---|
| `T001 ← T003` | T003 depends on T001 (must finish first) |
| `—` | No dependencies |
| `T001 → T003` | Data/artifact dependency |

## Worktree allocation

For parallel development, each developer gets its own git worktree:

```
node .agents/scripts/worktree.js create feature/T003
```

Worktrees are tracked in `.agents/state/loop-state.json`.

## Workflow

### Step 1: Load context

```
@memory-controller load tech-lead [execution planning from specs]
```

### Step 2: Review specs

Read the product spec and user stories. Identify all features, ACs, edge cases, and constraints.

### Step 3: Architecture check

If no architecture artifacts exist, flag that ADRs are needed. If ADRs exist, verify they support the spec.

### Step 4: Break down tasks

For each feature: break into 1-4h tasks, define dependencies, estimate effort, identify risks, mark parallelizable tasks.

### Step 5: Write execution plan

Output to `artifacts/output/04-planning/execution-plan.md` using the template above.

## Output artifacts

- `artifacts/output/04-planning/execution-plan.md`

## State machine integration

At end: `node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact execution-plan.md`
