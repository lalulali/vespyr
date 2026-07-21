---
step: 1
name: Gather Signal
prerequisites:
  - product is live and accessible to users
  - post-launch monitoring period is complete (24-72 hours)
  - `artifacts/output/06-launch/post-launch-report.md` exists
delegation:
  reads: "@reader (post-launch report, analytics dashboards, support tickets; per delegation-policy.md multi-file)"
  writes: "@writer (analytics-insights.md; per delegation-policy.md output file)"
  runs: none
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 1 — Gather Signal

Collect and analyze post-launch data to understand how users are interacting with the feature.

## Workflow

### 1a. Collect data via @data-analyst

Invoke `@data-analyst` to collect and analyze post-launch data:
- Feature adoption metrics vs. PRD success criteria
- User behavior flows (funnel analysis, drop-off points)
- Error rates and support tickets related to the feature
- A/B test results (if any experiments are running)
- Qualitative feedback (reviews, support conversations, user interviews)

### 1b. Output

Delegate to `@writer` for `artifacts/output/07-iteration/analytics-insights.md` using template:
```
.agents/templates/quality/analytics-insights-template.md
```

## Delegation
- **Reads:** @reader for post-launch report, analytics dashboards, support tickets
- **Writes:** @writer for analytics-insights.md
- **Runs:** none
