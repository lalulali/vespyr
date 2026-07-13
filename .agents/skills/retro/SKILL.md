---
name: retro
description: Post-cycle review — extract lessons, calibrate estimates, improve processes, compact memory, and update team knowledge
---

# Retro — Multi-Step Workflow

This skill runs in sequential steps. Each step is a self-contained file with its own halt conditions. Load one at a time.

## When to invoke
- After completing a development cycle or shipping a launch
- After resolving an incident
- At regular intervals (every 2-4 weeks)
- After 5 iteration cycles (mandatory trigger)

## Prerequisites
- Completed phase artifact (launch-log.md, incident-postmortem.md, or iteration report)
- `artifacts/memory/` directory with active entries

## Step loader
1. Read `stepsCompleted` array from `artifacts/output/09-retro/retro-state.md` (or start at []).
2. Compute next step = first step NOT in `stepsCompleted`.
3. Load `steps/step-{NN}-*.md`.
4. Execute. On completion, append NN to `stepsCompleted` and re-invoke loader.

## Step sequence
1. **Hot Paths** → `steps/step-01-hot-paths.md`
2. **Pattern Scan** → `steps/step-02-pattern-scan.md`
3. **Instinct Scan** → `steps/step-03-instinct-scan.md`
4. **Write Digest** → `steps/step-04-write-digest.md`
5. **Compact** → `steps/step-05-compact.md`

## Halt conditions
- Memory integrity check fails (`witness.js check` returns non-zero)
- Pattern scan finds unresolved security or data-loss patterns (escalate to `@tech-lead`)
- Compaction would archive entries younger than 7 days (skip compaction, report)

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At end: `node .agents/scripts/orchestrator_state.js complete --agent memory-controller --artifact 09-retro/retro-digest.md`

## Done when
- All steps in `stepsCompleted`
- `retro-digest.md` written to `artifacts/output/09-retro/`
- Memory compacted (or skip recorded)
