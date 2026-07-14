---
step: 2
name: Deploy
prerequisites:
  - step-01 completed
delegation:
  reads: none
  writes: none
  runs: "@executor (deployment commands; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
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
- **Reads:** none
- **Writes:** none
- **Runs:** @executor for deployment commands (@devops-engineer)
