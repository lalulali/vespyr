---
name: phase
description: Show current phase, switch phases, list phase artifacts
---

## What this skill does

Displays the current phase in the product pipeline, allows switching between phases, and lists the artifacts produced in each phase.

## When to use

- "What phase are we in?"
- "Switch to design phase"
- "Show me what's been produced so far"
- "What phase should I be in for X?"

## Pipeline phases

The canonical phase table is the single source of truth. See `.agents/references/phase-table.md` for the complete 11-phase table with folder mappings, primary skills, primary agents, and gates.

## Workflow

### Step 1: Detect current phase

Read `artifacts/output/pipeline-state.json` (or execute `node .agents/scripts/orchestrator_state.js status`) to read the canonical `"current_phase"`. 

If not initialized, fall back to reading `artifacts/memory/project-context.md` for the current phase, or infer from the latest artifact in `artifacts/output/`:
- `00-discovery/` has content → validation
- `01-research/` has content → exploration
- `02-strategy/` has content → design
- `03-architecture/` has content → design
- `04-planning/` has content → development
- `06-launch/` has content → development
- `07-iteration/` has content → development
- `08-incidents/` has content → development
- `09-retro/` has content → development

### Step 2: Report

Return a concise report reflecting the active pipeline state:

```
## Current Phase: {phase name (validation / exploration / design / development)}
**Active Squad:** {squad from pipeline-state.json}
**Phase Status:** {status from pipeline-state.json's phases[phase]}
**Operation Mode:** {from project-context.md}

### Artifacts Produced
{list of artifacts and their versions in the current phase from pipeline-state.json's artifacts mapping}

### Next Phase Action
{Run `node .agents/scripts/orchestrator_state.js next` to show the next logical action}
```

### Step 3: Switch phase (on request)

If the user requests a phase switch:
1. Run via `@executor`:
   ```bash
   node .agents/scripts/orchestrator_state.js set-phase --phase {targetPhase}
   ```
   *(Note: This programmatically updates the current_phase, records it in the history, sets appropriate in-progress timestamps, and automatically syncs `artifacts/memory/project-context.md`'s `Phase:` field).*
2. Log the change to `artifacts/memory/active-decisions.md`
3. Load the corresponding skill for the new phase

