---
name: sprint-status
description: Display and update the sprint-status.yaml pipeline state as a Kanban table. Use when the user says "show the sprint status", "render the pipeline board", "where is the current story", or invokes /sprint-status.
metadata:
  version: "1.1"
  last_updated: "2026-09-30"
---

# Sprint Status

## What this skill does

Renders `artifacts/output/sprint-status.yaml` as a human-readable Kanban view. The YAML is the human-readable mirror of `pipeline-state.json`; this skill is the renderer, not the source of truth.

## When to invoke

Load this skill to see the current project state at a glance — which phases are done, which story is in flight, and what is still backlog. It is a read-only view; it never mutates pipeline state.

## When NOT to invoke

- For a full state snapshot including blockers, change requests, and memory health — use `/status` (it is a superset).
- For the task-level board — use `/kanban`.
- To change anything — use `/phase` to switch phases, or edit the YAML through `orchestrator_state.js`.

## How it works

1. Read `artifacts/output/sprint-status.yaml`
2. Parse the phase and story sections
3. Render both as Markdown tables with status indicators (DNA 6 — never an ASCII box table)

## Output format

### Phase pipeline

| Phase | Status |
|---|---|
| validation | ✅ done |
| discovery | ✅ done |
| research | ✅ done |
| strategy | ▶️ in-progress |
| architecture | backlog |
| planning | backlog |
| execution | backlog |
| launch | backlog |
| iteration | backlog |
| documentation | backlog |
| retro | backlog |

### Sprint status

| Story | Status |
|---|---|
| US-001-user-auth | done |
| US-002-account-mgmt | in-progress |
| US-003-data-model | backlog |

Use these status tokens exactly: `✅ done`, `▶️ in-progress`, `backlog`, `⛔ blocked`. Emit one table per section, never a merged one — a phase and a story are different grains and flattening them hides which is stuck.

## Alternative: CLI

- `node .agents/scripts/orchestrator_state.js status` — the phase dashboard
- `node .agents/scripts/orchestrator_state.js status --json` — raw JSON, for further processing
