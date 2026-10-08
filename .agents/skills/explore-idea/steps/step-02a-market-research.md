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

**Context adaptation:** use the mode table in `SKILL.md` §Context adaptation — do not restate it here.

### 2a.3 Output

Write `artifacts/output/02-research/market-analysis.md` using `.agents/templates/research/market-analysis-template.md`.
**End the file with the template's §7.1 line verbatim** — `MARKET VERDICT: [GO]|[RESHAPE]|[NO-GO] — <one-line reason>` —
which Phase 3 (step-03) consumes as its gate input. A missing or malformed line is treated as `[FALSIFIED]`
research there and re-dispatches this step **once**.

`[RESHAPE]` is the honest answer when the market is real but this wedge into it is wrong — re-target the
segment or the buyer rather than abandoning a market that is fine. Use it instead of forcing a choice
between "GO" and "NO-GO".

The token is **bracketed**: `MARKET VERDICT: GO|NO-GO` (unbracketed) is invisible to `tools/eval/lib/ast.js`,
which matches only literal brackets, so the market gate would reach no telemetry and no safety invariant.

**`market-analysis.md` is the document surface** — the gate line lives there and nowhere else. The chat reply gets the finding in plain words plus the next action, with no token and no marker (`.agents/references/vespyr-dna.md` §Two surfaces).

Run immediately when complete: `node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/market-analysis.md`

## Memory closeout
- `@memory-controller session-write` — record step 2a market research findings.

## Delegation
- **Memory:** @memory-controller for session-write


