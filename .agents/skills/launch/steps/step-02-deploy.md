---
step: 2
name: Deploy
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-01 completed
---

# Step 2 — Deploy

Deploy the feature to production.

## Agent invocation
`@devops-engineer` prepares and executes deployment:

### Infrastructure prep
- Finalize deployment pipeline and runbook
- Configure feature flags for phased rollout (if applicable)
- Set up canary/monitoring checks
- Verify rollback procedures
- Prepare deployment communication

### Documentation
`@technical-writer` finalizes (parallel):
- Release notes — use template `.agents/templates/launch/release-notes-template.md`
- Migration guides (if applicable)
- User-facing documentation updates
- Known issues documentation

### Launch execution
- Deploy to production following the runbook
- Monitor health checks and key metrics
- Verify feature flags and gradual rollout
- Track real-time error rates and user impact

## Output
`artifacts/output/06-launch/launch-log.md` — use template `.agents/templates/launch/launch-log-template.md`

## Delegation
- Reads: @reader (runbook, release notes)
- Writes: @writer (launch-log.md, release notes)
- Runs: @executor (deployment commands, health checks)
