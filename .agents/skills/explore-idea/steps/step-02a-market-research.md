---
step: 2a
name: Market Research
prerequisites:
  - step-01 completed (or validation/shaped/problem-space brief exists)
output_contract:
  citations: required
---

# Step 2a — Market Research

Validate market potential for the concept. Runs in parallel with step 2b.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill explore-idea --step 2a` at step start; `complete --skill explore-idea --step 2a` at step close.
> **Dispatch:** follow the tiered-dispatch contract in SKILL.md (subagents → firewalled sequential calls → degraded in-context with explicit label). Receive only the validation/idea brief and this charter — never another research agent's output.

## Workflow

### 2a.1 Load input

Read the validation brief (or idea brief).

### 2a.2 Research — @researcher

Invoke `@researcher market` to validate market potential:
- Market size (TAM, SAM, SOM)
- Industry trends and growth rates
- Target customer segments
- Market risks and opportunities

**Context adaptation:**
- **Startup mode:** Full external market research
- **Company mode:** Internal market analysis — which teams/orgs benefit? What budget exists? What similar initiatives have been tried?
- **Personal mode:** Lightweight — is anyone else building this? What's the landscape?

### 2a.3 Output

Write `artifacts/output/02-research/market-analysis.md`. End the file with a parseable verdict line — `MARKET VERDICT: GO|NO-GO — <reason>` — which Phase 3 (step-03) consumes as its gate input; a missing or malformed line is treated as `[FALSIFIED]` research there.

Run immediately when complete: `node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/market-analysis.md`

## Memory closeout
- `@memory-controller session-write` — record step 2a market research findings.

## Delegation
- **Memory:** @memory-controller for session-write


