---
step: 2
name: Deploy
prerequisites:
  - step-01 completed
output_contract:
  citations: not-required
---

# Step 2 — Deploy

Deploy the feature to production.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill launch --step 2`
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

## Memory closeout
- `@memory-controller session-write` — record step 2 deployment status and release log.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill launch --step 2`
