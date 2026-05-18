# Launch Log Template

> **Used by:** @project-manager, @devops-engineer → **Feeds into:** post-launch report
> **Save to:** `artifacts/output/06-launch/launch-log.md`

Use this template to document the deployment process in real-time. Start logging before deployment begins and continue until monitoring confirms stability.

---

## Release: [Version/Feature Name]

**Deployment Date:** ...
**Deployment Lead:** @devops-engineer
**Launch Commander:** @project-manager

---

## 1. Pre-Launch Checklist

- [ ] Go/No-Go decision documented (`artifacts/output/06-launch/go-nogo-decision.md`)
- [ ] Release notes finalized (`artifacts/output/06-launch/release-notes.md`)
- [ ] Deployment runbook reviewed (`artifacts/output/07-infrastructure/deployment-runbook.md`)
- [ ] Rollback plan tested and documented
- [ ] Monitoring dashboards ready
- [ ] Alerting configured and tested
- [ ] Stakeholder communications prepared
- [ ] Feature flags configured (if applicable)

---

## 2. Deployment Timeline

Log every step with timestamp.

| Time (UTC) | Step | Status | Duration | Notes |
|------------|------|--------|----------|-------|
| ... | Pre-deployment checks | ✅/❌ | ... | |
| ... | Database migration | ✅/❌ | ... | |
| ... | Deploy to staging | ✅/❌ | ... | |
| ... | Smoke tests on staging | ✅/❌ | ... | |
| ... | Deploy to production (canary %) | ✅/❌ | ... | |
| ... | Canary monitoring (15 min) | ✅/❌ | ... | |
| ... | Expand to 50% | ✅/❌ | ... | |
| ... | 50% monitoring (15 min) | ✅/❌ | ... | |
| ... | Expand to 100% | ✅/❌ | ... | |
| ... | Production verification | ✅/❌ | ... | |
| ... | Declare stable | ✅/❌ | ... | |

---

## 3. Issues Encountered

| Time | Issue | Severity | Resolution | Impact |
|------|-------|----------|------------|--------|
| ... | ... | Critical/High/Medium/Low | ... | [User impact, duration] |

---

## 4. Monitoring Metrics (First 24 Hours)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Error rate | < X% | ... | ✅/❌ |
| p95 latency | < Yms | ... | ✅/❌ |
| CPU utilization | < Z% | ... | ✅/❌ |
| Memory utilization | < W% | ... | ✅/❌ |
| Feature adoption | > V% | ... | ✅/❌ |
| Support tickets | < N | ... | ✅/❌ |

---

## 5. Rollback Events (if any)

| Time | Trigger | Action Taken | Recovery Time | Data Impact |
|------|---------|-------------|---------------|-------------|
| ... | ... | ... | ... | ... |

---

## 6. Post-Launch Verification

- [ ] All user flows working in production
- [ ] Feature flags behaving correctly (if applicable)
- [ ] Business metrics visible in dashboard
- [ ] No elevated error rates
- [ ] No elevated latency
- [ ] Support team briefed on known issues
- [ ] Stakeholders notified of successful launch

---

## 7. Lessons Learned

[To be filled after the launch stabilizes]

**What went well:**
- ...

**What could be improved:**
- ...

**Action items for next launch:**
- [ ] Action 1 (owner, deadline)
- [ ] Action 2 (owner, deadline)

---

**Document info:**
- Version: 1.0
- Author: @project-manager, @devops-engineer
- Date: ...
- Depends on: `artifacts/output/06-launch/go-nogo-decision.md`, release runbook