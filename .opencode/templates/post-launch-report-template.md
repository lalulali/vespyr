# Post-Launch Report Template

> **Used by:** @project-manager, @data-analyst → **Feeds into:** iteration decisions, retrospectives
> **Save to:** `artifacts/output/06-launch/post-launch-report.md`

Use this template 24-72 hours after launch to document metrics, issues, and initial learnings.

---

## Release: [Version/Feature Name]

**Launch Date:** ...
**Report Date:** ...
**Report Period:** [Launch date] through [Report date] ([X] hours/days)
**Authors:** @project-manager, @data-analyst

---

## 1. Launch Summary

### 1.1 Launch Outcome

- **Status:** ✅ Successful / 🟡 Partial / ❌ Rollback required
- **Time to stable:** ___ hours/minutes from deployment start
- **Rollback required:** Yes / No (if yes, reference `artifacts/output/08-incidents/INC-NNN/`)

### 1.2 Key Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Error rate | < X% | ... | ✅/🟡/❌ |
| p95 latency | < Yms | ... | ✅/🟡/❌ |
| Uptime | > 99.9% | ... | ✅/🟡/❌ |
| Feature activation | > Z% of DAUs | ... | ✅/🟡/❌ |
| Task completion rate | > W% | ... | ✅/🟡/❌ |
| Support tickets | < N | ... | ✅/🟡/❌ |

---

## 2. Business Metrics

### 2.1 Success Criteria (from PRD)

| Success Criterion | Target | Actual | Status |
|-------------------|--------|--------|--------|
| [Criterion 1 from PRD §3.3] | ... | ... | ✅/🟡/❌ |
| [Criterion 2] | ... | ... | ✅/🟡/❌ |
| [Criterion 3] | ... | ... | ✅/🟡/❌ |

### 2.2 User Adoption

| Metric | Value |
|--------|-------|
| DAU using feature | ... |
| Feature discovery rate | ... |
| Time to first use | ... |
| Repeat usage rate | ... |

### 2.3 User Feedback

| Source | Sentiment | Key Themes |
|--------|-----------|------------|
| App store reviews | Positive/Mixed/Negative | ... |
| Support tickets | ... | ... |
| Social media | ... | ... |
| User interviews (if conducted) | ... | ... |

---

## 3. Technical Performance

### 3.1 System Health

| Metric | Target | Actual | Peak | Notes |
|--------|--------|--------|------|-------|
| Error rate | < X% | ... | ... | |
| p50 latency | ... | ... | ... | |
| p95 latency | < Yms | ... | ... | |
| p99 latency | ... | ... | ... | |
| CPU utilization | < Z% | ... | ... | |
| Memory utilization | < W% | ... | ... | |
| Disk I/O | ... | ... | ... | |

### 3.2 Incidents (if any)

| Incident | Severity | Duration | Impact | Root Cause | Reference |
|----------|----------|----------|--------|-------------|-----------|
| ... | SEV1/2/3/4 | ... | ... | ... | INC-NNN |

### 3.3 Scaling Observations

- Did the system scale as expected under load?
- Any resource bottlenecks identified?
- Were there any performance degradations?

---

## 4. Issues & Bugs Found

| Issue | Severity | Status | Workaround | Fix Timeline |
|-------|----------|--------|------------|--------------|
| ... | Critical/High/Medium/Low | Open/In Progress/Fixed | ... | Next release / ... |

---

## 5. Launch Process Review

### What Went Well
- ...

### What Could Be Improved
- ...

### Deployment Observations
- Deployment duration: ___ minutes
- Rollback needed: Yes / No
- Smoke tests passed: Yes / No
- Database migration duration: ___ minutes

---

## 6. Recommendations

### Immediate Actions (within 1 week)
- [ ] Action 1 (owner, deadline)
- [ ] Action 2 (owner, deadline)

### Short-term (next iteration cycle)
- [ ] Address [issue from §4 bugs]
- [ ] Improve [metric that missed target]

### Long-term (next quarter)
- [ ] Investigate [scaling observation]
- [ ] Plan [feature enhancement based on user feedback]

---

## 7. Next Steps

- [ ] Load `product-iteration` skill to prioritize and address post-launch improvements
- [ ] Load `retrospective` skill to review launch process (if major issues encountered)
- [ ] Load `incident-response` skill if critical issues emerged (reference: INC-NNN)

---

**Document info:**
- Version: 1.0
- Author: @project-manager, @data-analyst
- Date: ...
- Depends on: `artifacts/output/06-launch/launch-log.md`, `artifacts/output/02-strategy/requirements.md` (success criteria)