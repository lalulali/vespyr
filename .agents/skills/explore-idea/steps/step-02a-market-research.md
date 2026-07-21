---
step: 2a
name: Market Research
prerequisites:
  - step-01 completed (or validation/shaped/problem-space brief exists)
delegation:
  reads: "@reader (validation brief or idea brief; per delegation-policy.md)"
  writes: "@writer (market-analysis.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: required
---

# Step 2a — Market Research

Validate market potential for the concept. Runs in parallel with step 2b.

## Workflow

### 2a.1 Load input

Delegate to `@reader` to load the validation brief (or idea brief).

### 2a.2 Research via @researcher

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

Delegate to `@writer` for `artifacts/output/02-research/market-analysis.md`.

### 2a.4 Record completion

Delegate to `@executor`:
```bash
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/market-analysis.md
```

## Delegation
- **Reads:** @reader for validation brief or idea brief
- **Writes:** @writer for market-analysis.md
- **Runs:** @executor for orchestrator_state.js complete
