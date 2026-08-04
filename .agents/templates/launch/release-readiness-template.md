# Release Readiness Checklist Template

> **Used by:** Sarah (@product-manager)
> **Feeds into:** Axel (@devops-engineer), Sarah (@product-manager), Elena (@founder)
> **Save to:** `artifacts/output/06-launch/release-readiness.md`

Use this template before any production release. Every item must be verified before go/no-go decision.

---

## Release: [Version/Feature Name]

**Target Release Date:** ...
**Release Scope:** [Brief description]
**Release Manager:** @product-manager

---

## 1. Quality Gates

### 1.1 Code Quality

- [ ] All code has been reviewed by @code-reviewer (zero blocking issues)
- [ ] Linting and type-checking pass with zero errors
- [ ] No TODO/FIXME/HACK comments remaining in production code
- [ ] All feature flags are properly configured

### 1.2 Testing

- [ ] All acceptance criteria from user stories pass (`artifacts/output/03-strategy/user-stories.md`)
- [ ] Unit test coverage meets threshold (target: >80%)
- [ ] Integration tests pass for all API contracts
- [ ] End-to-end tests pass for critical user flows
- [ ] Regression tests pass for existing features
- [ ] Edge cases and error paths tested (all AC-U and AC-E criteria)

### 1.3 Product Sign-off

- [ ] @product-manager has verified feature matches PRD requirements
- [ ] @product-manager has verified all acceptance criteria are met
- [ ] @product-designer has verified UI matches spec (if applicable)
- [ ] All open questions in PRD are resolved

---

## 2. Security Review

- [ ] @security-engineer audit completed (if applicable — required for auth, payments, PII)
- [ ] Zero Critical or High severity findings
- [ ] Medium/Low findings documented with risk acceptance or remediation plan
- [ ] Secrets and credentials are not in code (scanned)
- [ ] Dependency vulnerabilities checked and acceptable
- [ ] OWASP Top 10 reviewed (if applicable)

---

## 3. Performance Review

- [ ] @performance-engineer audit completed (if applicable — required for SLA-backed features)
- [ ] Page load time within target (___ms)
- [ ] API response time within target (___ms p95)
- [ ] Load test results acceptable (___ concurrent users)
- [ ] Database query performance within target
- [ ] Memory usage within target
- [ ] No N+1 queries or obvious performance bottlenecks

---

## 4. Operational Readiness

### 4.1 Deployment

- [ ] Deployment pipeline tested and verified (@devops-engineer)
- [ ] Database migrations tested (forward and rollback)
- [ ] Feature flags configured for phased rollout (if applicable)
- [ ] Environment variables and config verified for production
- [ ] Deployment runbook created: `artifacts/output/07-infrastructure/deployment-runbook.md`

### 4.2 Rollback

- [ ] Rollback plan documented and tested
- [ ] Rollback trigger criteria defined (e.g., error rate > X%, latency > Yms)
- [ ] Rollback can be executed within ___ minutes
- [ ] Database rollback plan documented (if migrations included)

### 4.3 Monitoring & Alerting

- [ ] Health check endpoints configured
- [ ] Error rate alerting configured (threshold: ___)
- [ ] Latency alerting configured (threshold: ___)
- [ ] Business metric dashboards created (@data-analyst)
- [ ] On-call runbook created for this feature

---

## 5. Documentation

- [ ] API documentation updated (@technical-writer)
- [ ] Release notes written (@technical-writer)
- [ ] User-facing documentation updated (if applicable)
- [ ] Migration guide written (if applicable)
- [ ] Known issues documented
- [ ] README updated with new feature information (if applicable)

---

## 6. Stakeholder Sign-off

| Sign-off | Agent | Status | Date | Notes |
|----------|-------|--------|------|-------|
| Feature Complete | @product-manager | ⬜ | ... | |
| Code Quality | @tech-lead | ⬜ | ... | |
| Architecture Integrity | @architect | ⬜ | ... | |
| Security | @security-engineer | ⬜ | ... | |
| Performance | @performance-engineer | ⬜ | ... | |
| QA | @qa-engineer | ⬜ | ... | |
| Deployment | @devops-engineer | ⬜ | ... | |
| Documentation | @technical-writer | ⬜ | ... | |
| Launch Approval | @product-manager | ⬜ | ... | All above must be ✅ |

### 6.1 UTTERLY SATISFIED Team Gate

Record every named persona that is active or relevant to this release. Use
`NOT ACTIVATED` only when the domain is genuinely out of scope, and explain
why. No state is implicit approval.

| Agent | Domain | State | Evidence / feedback closure | Date |
|-------|--------|-------|-----------------------------|------|
| @founder | Strategic direction | ... | ... | ... |
| @product-manager | Scope and product value | ... | ... | ... |
| @product-designer | Product and interaction design | ... | ... | ... |
| @architect | Architecture and contracts | ... | ... | ... |
| @tech-lead | Plan and technical coordination | ... | ... | ... |
| @developer | Implementation and tests | ... | ... | ... |
| @code-reviewer | Code quality and review | ... | ... | ... |
| @qa-engineer | Acceptance and regression quality | ... | ... | ... |
| @researcher | Market and competitive evidence | ... | ... | ... |
| @user-researcher | User evidence and personas | ... | ... | ... |
| @ux-researcher | Usability and accessibility | ... | ... | ... |
| @data-analyst | Measurement and telemetry | ... | ... | ... |
| @security-engineer | Security and threat model | ... | ... | ... |
| @performance-engineer | Performance and SLAs | ... | ... | ... |
| @ml-ai-engineer | Model and AI quality | ... | ... | ... |
| @ml-ai-ops | AI/ML production operations | ... | ... | ... |
| @devops-engineer | Deployment and operations | ... | ... | ... |
| @technical-writer | Documentation accuracy | ... | ... | ... |
| @shifu | Learning and educational quality | ... | ... | ... |

**Hard gate:** every active/relevant row must be `SATISFIED`. Any
`CHANGES REQUESTED` or `BLOCKED` state is a NO-GO until resolved and
revalidated. Any accepted non-blocking risk must also appear below with an
owner, mitigation, and authorized acceptance.

---

## 7. Known Issues & Accepted Risks

| Issue | Severity | Mitigation | Risk Acceptance |
|-------|----------|------------|-----------------|
| ... | Medium/Low | ... | @product-manager approved |
| ... | ... | ... | ... |

---

## 8. Go/No-Go Decision

**Date:** ...
**Decision:** GO / NO-GO / CONDITIONAL GO

**Conditions (if CONDITIONAL):**
- [ ] Condition 1 must be resolved by [date]
- [ ] Condition 2 must be resolved by [date]

**Rollback trigger criteria:**
- Error rate > X% within first 30 minutes
- Latency > Yms p95 within first hour
- Critical user-facing bug discovered

**Decision makers:**
- @product-manager (delivery readiness)
- @product-manager (feature completeness)
- @tech-lead (technical readiness)

---

**Document info:**
- Version: 1.0
- Author: @product-manager
- Date: ...
- Last updated: ...
- Depends on: `artifacts/output/05-planning/execution-plan.md`, `artifacts/output/03-strategy/requirements.md`
