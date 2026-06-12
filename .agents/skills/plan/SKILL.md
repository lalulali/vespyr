---
name: plan
description: Create an execution plan from existing specs — standalone, outside the full develop cycle
---

## What this skill does

Takes existing product specs and produces a task breakdown with effort estimates, dependencies, and parallelization opportunities. Use when you need a plan without running the full `develop` workflow.

## When to use

- "Plan out how we'll build this feature"
- "Break this spec into tasks"
- "How long will this take?"
- Standalone planning outside the full development cycle

## Prerequisites

- `artifacts/output/02-strategy/product-spec.md` exists
- `artifacts/output/02-strategy/user-stories.md` exists (recommended)

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
- Define task dependencies
- Estimate effort (small/medium/large)
- Identify risky areas (spikes)
- Mark parallelizable tasks

### Step 5: Write execution plan

Output: `artifacts/output/04-planning/execution-plan.md`

Include:
- Task list with IDs
- Dependencies graph
- Effort estimates
- Parallelization notes
- Definition of Done per task
