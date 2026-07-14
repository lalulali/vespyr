---
step: 4
name: Monitor
prerequisites:
  - step-03 completed
delegation:
  reads: none
  writes: "@writer (monitoring report)"
  runs: "@executor (monitoring commands; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 4 — Monitor

Post-launch monitoring — observe the feature in production.

## Goal
Track core metrics against success criteria from the PRD. Catch anomalies before they become incidents.

## Agent invocation
`@data-analyst` and `@product-manager` monitor:

**Core metrics:**
- Track core metrics against PRD success criteria
- Monitor error rates, latency, and system health
- Watch user adoption and feature usage
- Collect early user feedback

**Duration:** Monitor for 24-72 hours depending on feature scope.

## Response to issues
- **Critical:** Rollback immediately, invoke `incident` skill
- **Medium:** Hotfix path via `@developer` → `@code-reviewer` → `@qa-engineer`
- **Low:** Log for next iteration via `iterate` skill

## Output
`artifacts/output/06-launch/post-launch-report.md` — use template `.agents/templates/launch/post-launch-report-template.md`

## Delegation
- **Reads:** none
- **Writes:** @writer for monitoring report
- **Runs:** @executor for monitoring commands
