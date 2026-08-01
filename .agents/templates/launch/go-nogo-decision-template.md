# Go/No-Go Decision Template

> **Used by:** Sarah (@product-manager)
> **Feeds into:** Axel (@devops-engineer), stakeholders
> **Save to:** `artifacts/output/06-launch/go-nogo-decision.md`

Use this template to formally document the launch decision. This is the gate between "code is done" and "users have it."

---

## Release: [Version/Feature Name]

**Decision Date:** ...
**Decision Meeting Participants:** @product-manager, @product-manager, @tech-lead
**Target Release Date:** ...

---

## 1. Release Readiness Summary

### 1.1 Quality Gates Status

| Gate | Status | Blocking Issues | Sign-off |
|------|--------|-----------------|----------|
| Code Review | ✅/🟡/❌ | | @code-reviewer |
| QA Testing | ✅/🟡/❌ | | @qa-engineer |
| Product Sign-off | ✅/🟡/❌ | | @product-manager |
| Security Review | ✅/🟡/❌ | | @security-engineer |
| Performance Review | ✅/🟡/❌ | | @performance-engineer |
| Documentation | ✅/🟡/❌ | | @technical-writer |
| Deployment Readiness | ✅/🟡/❌ | | @devops-engineer |
| UTTERLY SATISFIED Team Gate | ✅/🟡/❌ | | All active agents |

**Any ❌ blocks the release. All 🟡 must have documented acceptance.**

### 1.2 UTTERLY SATISFIED Team Gate

The full agent matrix is recorded in `release-readiness.md`. Before this
decision is eligible for GO:

- Every active, relevant agent is explicitly marked `SATISFIED` with evidence.
- Every `NOT ACTIVATED` agent has a specific out-of-scope reason.
- No active agent is `CHANGES REQUESTED` or `BLOCKED`.
- Any material change after sign-off has been revalidated by affected agents.

**Gate result:** SATISFIED / NOT SATISFIED

### 1.3 Overall Assessment

- **Quality:** Ready / Not Ready / Conditionally Ready
- **Risk Level:** Low / Medium / High
- **Confidence:** High / Medium / Low

---

## 2. Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
|------|------------|--------|------------|---------------|
| ... | ... | ... | ... | ... |

---

## 3. Accepted Issues

Issues that are known but are acceptable to ship with.

| Issue | Severity | Mitigation | Risk Acceptance |
|-------|----------|------------|-----------------|
| ... | Medium/Low | [Workaround or fix timeline] | @product-manager approved |

---

## 4. Rollback Plan

**Rollback trigger criteria:**
- Error rate > ___% within first ___ minutes
- Latency > ___ms p95 within first ___ hour
- Critical user-facing bug discovered
- Any Critical security vulnerability

**Rollback procedure:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Estimated rollback time:** ___ minutes

**Data considerations:**
- [Any migration rollback steps needed]

---

## 5. Rollout Strategy

- [ ] **Big bang** — release to 100% of users immediately
- [ ] **Canary** — release to X% of users, monitor, then expand
- [ ] **Feature flag** — release behind flag, enable for segments
- [ ] **Blue/green** — switch traffic to new deployment

**Justification:** [Why this strategy was chosen]

**Monitoring period:** ___ hours/days before declaring stable

---

## 6. Stakeholder Communication

| Audience | Message | Channel | Timing | Owner |
|----------|---------|---------|--------|-------|
| Internal team | [Launch announcement] | ... | ... | @product-manager |
| Users | [Feature announcement] | ... | ... | @product-manager |
| Support | [Known issues and FAQs] | ... | ... | @technical-writer |

---

## 7. Decision

**Decision:** ✅ GO / ❌ NO-GO / 🟡 CONDITIONAL GO

**Decision date:** ...
**Decision made by:** @product-manager, @product-manager, @tech-lead

### Conditions (if CONDITIONAL GO)

| Condition | Resolution Deadline | Owner | Status |
|-----------|-------------------|-------|--------|
| [Condition 1] | ... | ... | ⬜ |
| [Condition 2] | ... | ... | ⬜ |

**If conditions are not met by deadline, the release is automatically NO-GO.**

### Rationale

[2-3 sentences explaining why the decision was made. If NO-GO, what needs to happen before re-evaluation.]

---

**Document info:**
- Version: 1.0
- Author: @product-manager
- Date: ...
- Depends on: `artifacts/output/06-launch/release-readiness.md`
