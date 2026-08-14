---
step: 1
name: Gather Signal
prerequisites:
  - product is live and accessible to users
  - post-launch monitoring period is complete (24-72 hours)
  - `artifacts/output/06-launch/post-launch-report.md` exists
output_contract:
  citations: not-required
---

# Step 1 — Gather Signal

Collect and analyze post-launch data to understand how users are interacting with the feature.

## Workflow

### 1a. Collect data — @data-analyst

Invoke `@data-analyst` to collect and analyze post-launch data:
- Feature adoption metrics vs. PRD success criteria
- User behavior flows (funnel analysis, drop-off points)
- Error rates and support tickets related to the feature
- A/B test results (if any experiments are running)
- Qualitative feedback (reviews, support conversations, user interviews)

## Memory closeout
- `@memory-controller session-write` — record step 1 analytics data collection progress.

## Delegation
- **Memory:** @memory-controller for session-write


