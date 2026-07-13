---
step: 3
name: Smoke Test
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-02 completed
---

# Step 3 — Smoke Test

Validate the production deployment with smoke tests.

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

## Halt condition
Smoke test identifies a critical flow failure. Rollback and resolve before retrying.

## Delegation
- Reads: @reader (APIs, integration points)
- Runs: @executor (smoke test suite, rollback if needed)
