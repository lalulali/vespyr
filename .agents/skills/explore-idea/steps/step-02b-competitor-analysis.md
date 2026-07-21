---
step: 2b
name: Competitor Analysis
prerequisites:
  - step-01 completed (or validation/shaped/problem-space brief exists)
delegation:
  reads: "@reader (validation brief or idea brief; per delegation-policy.md)"
  writes: "@writer (competitive-analysis.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: required
---

# Step 2b — Competitor Analysis

Map the competitive landscape. Runs in parallel with step 2a.

## Workflow

### 2b.1 Load input

Delegate to `@reader` to load the validation brief (or idea brief).

### 2b.2 Research via @researcher

Invoke `@researcher competitive` to map the landscape:
- Direct and indirect competitors
- Competitive comparison matrix
- White-space opportunities
- Pricing and positioning

**Context adaptation:**
- **Startup mode:** Full competitive landscape
- **Company mode:** Internal alternatives — what existing tools, teams, or vendors solve this partially? Build vs. buy analysis.
- **Personal mode:** What open source or free tools exist? What's different about your approach?

### 2b.3 Output

Delegate to `@writer` for `artifacts/output/02-research/competitive-analysis.md`.

### 2b.4 Record completion

Delegate to `@executor`:
```bash
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/competitive-analysis.md
```

## Delegation
- **Reads:** @reader for validation brief or idea brief
- **Writes:** @writer for competitive-analysis.md
- **Runs:** @executor for orchestrator_state.js complete
