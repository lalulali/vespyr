---
step: 3
name: Smoke Test
prerequisites:
  - step-02 completed
output_contract:
  citations: not-required
---

# Step 3 — Smoke Test

Validate the production deployment with smoke tests.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill launch --step 3`
## Goal
Confirm the deployed feature works in production. Catch deployment issues before users do.

## Agent invocation
`@qa-engineer` runs smoke tests against production:
- Verify core user flows function correctly
- Check critical API endpoints return expected responses
- Validate feature flags are correctly configured
- Confirm integration points are operational
- Test rollback mechanism if applicable

## Response assessment
- **Pass** — all critical flows operational, proceed to monitoring
- **Conditional pass** — minor issues found, documented for next iteration, proceed
- **Fail** — critical flow broken, initiate rollback immediately

## If smoke tests fail
- Rollback: `@devops-engineer` executes rollback procedures
- Record failure in launch-log
- Invoke `incident` skill if user-facing impact

## Memory closeout
- `@memory-controller session-write` — record step 3 smoke test results and validation status.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill launch --step 3`
