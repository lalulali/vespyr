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

### Step 1: Load orchestrator status state

Read `artifacts/output/pipeline-state.json` (or run `node .opencode/scripts/orchestrator_state.js status` via `@executor`) to extract:
- Project metadata (`name`, `type`, active `squad`)
- Current active `"current_phase"`
- Complete `"artifacts"` mapping (lists which deliverables exist and their exact versions)
- Active `"blockers"` and open `"change_requests"` (status: `OPEN`)

### Step 2: Load memory status

```
@memory-controller status
```

This returns a health snapshot of all memory files — sizes, entry counts, archive status.

### Step 3: Load last session summary

Read `artifacts/memory/session-summaries/latest.md` directly (it's ~100 tokens, safe to load in full).

### Step 4: Check active blockers and CRs

Cross-reference `project-context.md` blockers, `@memory-controller load blockers` output, and the registered blockers and open change requests in `pipeline-state.json`.

### Step 5: Report

Return a concise, premium status card:

```
## Project Status: {project.name} ({project.type})
**Active Phase:** {current_phase (validation / exploration / design / development)}
**Squad Preset:** {project.squad}
**Operation Mode:** {from project-context.md}

### Active Blockers
{list blockers from pipeline-state.json's blockers list, or "None"}

### Open Change Requests (CRs)
{list open CRs with IDs, sender, receiver, target, and issue, or "None"}

### Last Session
{from session-summaries/latest.md}

### Artifact Progress
{For each phase (validation, exploration, design, development), list all required artifacts from pipeline-state.json's artifacts registry, indicating whether they exist and their active version number, e.g.:
- 00-discovery/validation-brief.md: [Exists ✅ (Version: X)] or [Missing ❌]
- 01-research/market-analysis.md: [Exists ✅ (Version: Y)] or [Missing ❌]
}

### Memory Health
{from @memory-controller status}
```

