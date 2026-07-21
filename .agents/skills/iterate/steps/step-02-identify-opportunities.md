---
step: 2
name: Identify Opportunities
prerequisites:
  - step-01 completed (analytics-insights.md exists)
delegation:
  reads: "@reader (analytics-insights.md; per delegation-policy.md)"
  writes: "@writer (iteration-backlog.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 2 — Identify Opportunities

Synthesize analytics insights into a ranked backlog of iteration opportunities.

## Workflow

### 2a. Synthesize via @product-manager

Invoke `@product-manager` to synthesize insights into opportunities:
- Map data signals to user stories (new, modified, or deprioritized)
- Identify quick wins (high impact, low effort improvements)
- Identify strategic bets (larger investments with higher upside)
- Rank opportunities using RICE (Reach, Impact, Confidence, Effort)
- Determine what to iterate on vs. what to leave as-is

### 2b. Output

Delegate to `@writer` for `artifacts/output/07-iteration/iteration-backlog.md` using template:
```
.agents/templates/planning/iteration-backlog-template.md
```

### 2c. Record completion

Delegate to `@executor`:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 07-iteration/iteration-backlog.md
```

## Delegation
- **Reads:** @reader for analytics-insights.md
- **Writes:** @writer for iteration-backlog.md
- **Runs:** @executor for orchestrator_state.js complete
