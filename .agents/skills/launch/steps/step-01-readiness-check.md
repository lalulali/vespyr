---
step: 1
name: Readiness Check
prerequisites: []
delegation:
  reads: "@reader (QA signoff + security audit + perf review; per delegation-policy.md ≥3 files)"
  writes: "@writer (readiness-check.md)"
  runs: none
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 1 — Readiness Check

Verify all pre-launch gates have passed. Any red item blocks launch.

## Agent invocation
`@product-manager` assesses launch readiness across all dimensions:

**Checklist — every item must pass:**
- All acceptance criteria from user stories are met
- Code review passed with no blocking issues
- QA validated all acceptance criteria pass
- PM signed off on feature completeness
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

## Outputs
- `artifacts/output/06-launch/release-readiness.md` — use template `.agents/templates/launch/release-readiness-template.md`
- `artifacts/output/06-launch/go-nogo-decision.md` — use template `.agents/templates/launch/go-nogo-decision-template.md`

## Halt condition
Any red item on the readiness checklist. Resolve before proceeding. Max 2 readiness cycles.

## Delegation
- **Reads:** @reader for QA signoff, security audit, and performance review reports
- **Writes:** @writer for readiness-check.md
