---
step: 2
name: Identify Opportunities
prerequisites:
  - step-01 completed (analytics-insights.md exists)
output_contract:
  citations: not-required
---

# Step 2 — Identify Opportunities

Synthesize analytics insights into a ranked backlog of iteration opportunities.

## Workflow

### 2a. Synthesize — @product-manager

Invoke `@product-manager` to synthesize insights into opportunities:
- Map data signals to user stories (new, modified, or deprioritized)
- Identify quick wins (high impact, low effort improvements)
- Identify strategic bets (larger investments with higher upside)
- Rank opportunities using RICE (Reach, Impact, Confidence, Effort)
- Determine what to iterate on vs. what to leave as-is

### 2b. Output

Write `artifacts/output/07-iteration/iteration-backlog.md` using template:
```
.agents/templates/planning/iteration-backlog-template.md
```

## Memory closeout
- `@memory-controller session-write` — record step 2 opportunity identification and iteration backlog.

## Delegation
- **Memory:** @memory-controller for session-write


