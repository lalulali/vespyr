---
step: 1
name: Readiness Check
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1 — Readiness Check

Verify all pre-launch gates have passed. Any red item blocks launch.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill launch --step 1`
## Agent invocation
`@product-manager` assesses launch readiness across all dimensions:

**Checklist — every item must pass:**
- All acceptance criteria from user stories are met
- Code review passed with no blocking issues
- QA validated all acceptance criteria pass
- PM signed off on feature completeness
- UTTERLY SATISFIED team gate is complete: every active, relevant agent is `SATISFIED` with evidence; `NOT ACTIVATED` rows have a specific out-of-scope reason
- Security review completed (if applicable — see `@security-engineer`)
- Performance benchmarks within thresholds (if applicable — see `@performance-engineer`)
- Documentation is updated (`@technical-writer`)
- Migration scripts tested and rollback plan exists
- Feature flags configured (if rolling out incrementally)
- Monitoring and alerting configured (`@devops-engineer`)

**Any red item blocks launch.** Document yellow items as known risks with mitigation plans.

## Go/No-Go decision
`@product-manager` makes the launch call:
- Review readiness checklist
- Assess known risks and their mitigations
- Confirm target release date and time
- Define rollback criteria (what triggers a rollback, who decides)
- Confirm stakeholder notification plan

**Gate:** PM must confirm GO. If NO-GO, document the blocking issue and resolve before retrying. Both `@product-manager` and `@tech-lead` must agree.
The PM must not confirm GO while any active agent is `CHANGES REQUESTED` or `BLOCKED`, or while the UTTERLY SATISFIED team gate is incomplete.

## Outputs
- `artifacts/output/06-launch/release-readiness.md` — use template `.agents/templates/launch/release-readiness-template.md`
- `artifacts/output/06-launch/go-nogo-decision.md` — use template `.agents/templates/launch/go-nogo-decision-template.md`

## Memory closeout
- `@memory-controller session-write` — record step 1 readiness check results and GO/NO-GO decision.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill launch --step 1`
