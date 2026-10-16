---
name: phase
description: Show current phase, switch phases, list phase artifacts. Use when the user says "what phase are we in", "switch to the design phase", "what has been produced so far", or invokes /phase.
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
---

# Phase — Pipeline Phase Control

## What this skill does

Displays the current phase in the product pipeline, allows switching between phases, and lists the artifacts produced in each phase.

## When to use

- "What phase are we in?"
- "Switch to design phase"
- "Show me what's been produced so far"
- "What phase should I be in for X?"

## Pipeline phases

| Phase | Skill | Key Output |
|-------|-------|------------|
| **-1: Validation** | `validate-idea` | Validation brief (GO/RESHAPE/NO-GO) |
| **0: Discovery** | `explore-idea` | Idea brief |
| **1: Research** | `explore-idea` | Market analysis, personas, competitive landscape |
| **2: Strategy** | `design` | PRD, user stories, product spec |
| **3: Architecture** | `design` | ADRs |
| **4: Planning** | `plan` | Execution plan, task estimates, Kanban |
| **5: Execution** | `develop` | Working, tested feature |
| **6: Launch** | `launch` | Shipped feature in production |
| **7: Iteration** | `iterate` | Measured improvement |
| **8: Documentation** | (cross-cutting) | Current docs |
| **9: Retrospective** | `retro` | Action items for improvement |
| **Any: Incident** | `incident` | Mitigated incident, RCA |

## Workflow

### Step 1: Detect current phase

Read `artifacts/output/pipeline-state.json` (or execute `node .agents/scripts/orchestrator_state.js status`) to read the canonical `"current_phase"`. 

If not initialized, fall back to reading `artifacts/memory/project-context.md` for the current phase, or infer from the latest artifact in `artifacts/output/`:
- `01-discovery/` has content → discovery
- `02-research/` has content → research
- `03-strategy/` has content → strategy
- `04-architecture/` has content → architecture
- `05-planning/` has content → planning
- `05-execution/` has content → execution
- `06-launch/` has content → launch
- `07-iteration/` has content → iteration
- `08-documentation/` has content → documentation
- `09-retro/` has content → retro

### Step 2: Report

Answer the question asked, and do not re-render the snapshot.

**If the user asked "what phase are we in?"** — say the phase, its status, and the next action:

```
## Current Phase: {phase name}
**Status:** {status from pipeline-state.json's phases[phase]}
**Next:** {Run `node .agents/scripts/orchestrator_state.js next`}
```

**If the user asked "what's been produced?"** — list the current phase's artifacts and versions.

**For anything wider** — blockers, change requests, the last session, memory health, artifacts across
*all* phases — **point at `/status` rather than restating it.** This skill used to render a full report
whose every field `/status` already produces, in a different shape, from the same file. Two renderings
of one source drift, and a reader cannot tell which is current. `/status` is the snapshot; this skill
owns exactly one thing it does not: **switching the phase** (Step 3).

### Step 3: Switch phase (on request)

If the user requests a phase switch:
1. Run:
   ```bash
   node .agents/scripts/orchestrator_state.js set-phase --phase {targetPhase}
   ```
   *(Note: This programmatically updates the current_phase, records it in the history, sets appropriate in-progress timestamps, and automatically syncs `artifacts/memory/project-context.md`'s `Phase:` field).*
2. Log the change to `artifacts/memory/active-decisions.md`
3. Load the corresponding skill for the new phase

