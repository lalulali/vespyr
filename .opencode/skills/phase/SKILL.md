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

| Phase | Skill | Key Output |
|-------|-------|------------|
| **-1: Validation** | `validate-idea` / `validate-game-idea` | Validation brief (GO/PIVOT/KILL) |
| **0-1: Exploration** | `explore-idea` / `explore-game-idea` | Market analysis, personas, competitive landscape |
| **2: Design** | `design` | PRD, user stories, product spec |
| **3-5: Development** | `develop` | Working, tested feature |
| **7: Launch** | `launch` | Shipped feature in production |
| **8: Iteration** | `iterate` | Measured improvement |
| **Any: Incident** | `incident` | Mitigated incident, RCA |
| **9: Retrospective** | `retro` | Action items for improvement |

## Workflow

### Step 1: Detect current phase

Read `artifacts/memory/project-context.md` for the current phase. If not set, infer from the latest artifact in `artifacts/output/`:

- `00-discovery/` has content → Phase -1 or 0
- `01-research/` has content → Phase 1
- `02-strategy/` has content → Phase 2
- `03-architecture/` has content → Phase 3
- `04-planning/` has content → Phase 4
- `05-project-management/` has content → Phase 4-5
- `06-launch/` has content → Phase 7
- `07-iteration/` has content → Phase 8
- `08-incidents/` has content → Incident
- `09-retro/` has content → Phase 9

### Step 2: Report

Return:

```
## Current Phase: {phase name}
**Skill:** {skill name}
**Operation Mode:** {from project-context.md}

### Artifacts Produced
{list of artifacts in the current phase's output directory}

### Next Phase
{next phase name} — load with `{skill name}`
```

### Step 3: Switch phase (on request)

If the user requests a phase switch:
1. Update `artifacts/memory/project-context.md` with the new phase
2. Log the change to `artifacts/memory/active-decisions.md`
3. Load the corresponding skill
