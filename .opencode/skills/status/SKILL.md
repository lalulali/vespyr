---
name: status
description: Quick snapshot of current project state — phase, blockers, memory health, sprint progress
---

## What this skill does

Returns a concise status report of the project. No workflow, no phases — just "where are we right now?"

## When to use

- "What's the current state?"
- "Where did we leave off?"
- "Show me active blockers"
- Quick check at the start of a session

## Workflow

### Step 1: Load memory status

```
@memory-controller status
```

This returns health snapshot of all memory files — sizes, entry counts, archive status.

### Step 2: Load active blockers

```
@memory-controller load blockers
```

Returns all active blockers with owners and ETAs.

### Step 3: Load last session summary

Read `artifacts/memory/session-summaries/latest.md` directly (it's ~100 tokens, safe to load in full).

### Step 4: Check artifact tree

Verify which phase directories under `artifacts/output/` have content:
- `00-discovery/` — validation/idea briefs
- `01-research/` — market analysis, personas
- `02-strategy/` — PRD, specs, user stories
- `03-architecture/` — ADRs
- `04-planning/` — execution plans
- `05-project-management/` — Kanban, project plans
- `06-launch/` — release readiness, go/no-go
- `07-iteration/` — analytics, iteration results
- `08-incidents/` — active incidents
- `09-retro/` — action items

### Step 5: Report

Return a concise status:

```
## Project Status
**Phase:** {current phase based on latest artifacts}
**Operation Mode:** {from project-context.md}

### Active Blockers
{list or "none"}

### Last Session
{from session-summaries/latest.md}

### Artifact Progress
- Discovery: {yes/no}
- Research: {yes/no}
- Strategy: {yes/no}
- Architecture: {yes/no}
- Planning: {yes/no}
- Kanban: {initialized/not}
- Launch: {yes/no}
- Iteration: {yes/no}

### Memory Health
{from @memory-controller status}
```
