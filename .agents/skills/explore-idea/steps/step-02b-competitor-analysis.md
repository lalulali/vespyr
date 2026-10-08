---
step: 2b
name: Competitor Analysis
prerequisites:
  - step-01 completed (or validation/shaped/problem-space brief exists)
output_contract:
  citations: required
---

# Step 2b — Competitor Analysis

Map the competitive landscape. Runs in parallel with step 2a.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill explore-idea --step 2b` at step start; `complete --skill explore-idea --step 2b` at step close.
> **Dispatch:** follow the tiered-dispatch contract in SKILL.md (subagents → firewalled sequential calls → degraded in-context with explicit label). Receive only the validation/idea brief and this charter — never another research agent's output. Your output feeds step 2c by design.

## Workflow

### 2b.1 Load input

Read the validation brief (or idea brief).

### 2b.2 Research — @researcher

Invoke `@researcher competitive` to map the landscape:
- Direct and indirect competitors
- Competitive comparison matrix
- White-space opportunities
- Pricing and positioning

**Context adaptation:** use the mode table in `SKILL.md` §Context adaptation — do not restate it here.

### 2b.3 Output

Write `artifacts/output/02-research/competitive-analysis.md` using
`.agents/templates/research/competitive-analysis-template.md`. The template defines the artifact's shape —
do not improvise a different structure, because the synthesis step and any downstream reader expect it.

Run immediately when complete: `node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/competitive-analysis.md`

## Memory closeout
- `@memory-controller session-write` — record step 2b competitor analysis findings.

## Delegation
- **Memory:** @memory-controller for session-write


