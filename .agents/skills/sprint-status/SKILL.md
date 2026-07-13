---
name: sprint-status
description: Display and update the sprint-status.yaml pipeline state as a Kanban table
---

# Sprint Status

Render `artifacts/output/sprint-status.yaml` as a human-readable Kanban view.

## How to invoke
Load this skill to see the current project state at a glance. The YAML is the human-readable mirror of `pipeline-state.json`.

## How it works
1. Read `artifacts/output/sprint-status.yaml`
2. Parse the phase and story sections
3. Render as a table with status indicators

## Output format
```
Phase Pipeline
┌──────────────┬─────────────┐
│ Phase        │ Status      │
├──────────────┼─────────────┤
│ discovery    │ ✅ done     │
│ exploration  │ ✅ done     │
│ strategy     │ ▶️ in-progress │
│ architecture │    backlog  │
│ development  │    backlog  │
│ quality      │    backlog  │
│ launch       │    backlog  │
│ iterate      │    backlog  │
│ retro        │    backlog  │
└──────────────┴─────────────┘

Sprint Status
┌──────────────────────┬─────────────┐
│ Story                │ Status      │
├──────────────────────┼─────────────┤
│ US-001-user-auth     │ done        │
│ US-002-account-mgmt  │ in-progress │
│ US-003-data-model    │ backlog     │
└──────────────────────┴─────────────┘
```

## Alternative: CLI dashboard
Run `node .agents/scripts/orchestrator_state.js status` for the ASCII dashboard.
Run `node .agents/scripts/orchestrator_state.js status --json` for raw JSON.
