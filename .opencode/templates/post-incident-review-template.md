# Post-Incident Review Template

> **Used by:** Sarah (@product-manager)
> **Feeds into:** prevention mechanisms, process improvements
> **Save to:** `artifacts/output/08-incidents/INC-NNN/post-incident-review.md`

Use this template for the blameless post-incident review. Share with all stakeholders. Focus on systems and processes, not individuals.

---

## Incident: INC-NNN — [Short Title]

**Incident Date:** ...
**Review Date:** ...
**Review Lead:** @product-manager
**Attendees:** [List of agents/stakeholders involved]
**Severity:** SEV1 / SEV2 / SEV3 / SEV4

---

## 1. Incident Overview

### 1.1 Summary
[2-3 sentence summary of what happened. This is the executive summary for people who weren't involved.]

### 1.2 Impact
- **User impact:** [Number of users affected, duration, features impacted]
- **Business impact:** [Revenue, SLA, reputation]
- **Data impact:** [Any data loss or exposure]

### 1.3 Timeline (Summary)
[Condensed timeline from RCA. Full timeline in `artifacts/output/08-incidents/INC-NNN/rca.md`]

| Time | Event |
|------|-------|
| ... | First alert |
| ... | Mitigation applied |
| ... | Root cause identified |
| ... | Fix deployed |
| ... | Incident resolved |

**Total duration:** ___ hours
**Time to mitigate:** ___ minutes
**Time to resolve:** ___ hours

---

## 2. Root Cause

[Summary of the root cause from RCA. Reference `artifacts/output/08-incidents/INC-NNN/rca.md` for full analysis.]

**Root cause:** [One sentence]
**Contributing factors:** [2-4 bullet points]

---

## 3. What Went Well

Celebrate the things that worked during the incident response.

- [e.g., Monitoring alerted within 2 minutes]
- [e.g., Rollback was executed in 5 minutes]
- [e.g., Communication was clear and timely]
- ...

---

## 4. What Could Be Improved

Be specific. "Communication was bad" is not actionable. "The incident channel wasn't created until 30 minutes into the incident, delaying responder coordination" is actionable.

### 4.1 Detection
- [ ] Improvement 1 (owner, deadline)
- [ ] Improvement 2 (owner, deadline)

### 4.2 Response
- [ ] Improvement 1 (owner, deadline)
- [ ] Improvement 2 (owner, deadline)

### 4.3 Mitigation
- [ ] Improvement 1 (owner, deadline)

### 4.4 Communication
- [ ] Improvement 1 (owner, deadline)

---

## 5. Action Items

Every action item must have an owner and a deadline. No exceptions.

| ID | Action Item | Owner | Deadline | Status |
|----|------------|-------|----------|--------|
| AI-1 | ... | ... | ... | ⬜ |
| AI-2 | ... | ... | ... | ⬜ |
| AI-3 | ... | ... | ... | ⬜ |

**Tracking:** @product-manager will follow up on all action items. Completed items should be marked ✅ with date.

---

## 6. Prevention Mechanisms

What systemic changes will prevent this *class* of incident from happening again?

| Mechanism | Type | Owner | Deadline | Status |
|-----------|------|-------|----------|--------|
| [Monitoring alert for X] | Monitoring | ... | ... | ⬜ |
| [Automated test for X] | Testing | ... | ... | ⬜ |
| [Process change for X] | Process | ... | ... | ⬜ |
| [Code change to prevent X] | Engineering | ... | ... | ⬜ |

---

## 7. Follow-Up

Use `@memory-controller` to persist all incident learnings:

```
@memory-controller write blockers-and-risks.md
### [RISK] INC-NNN: {incident title} [date: YYYY-MM-DD] [agent: @product-manager] [RESOLVED: YYYY-MM-DD]
{new risks identified from this incident and their mitigations}
**Status:** resolved

@memory-controller write patterns-and-conventions.md
### [PROCESS] {prevention mechanism title} [date: YYYY-MM-DD] [agent: @product-manager]
{new guardrail or operational pattern established to prevent recurrence}
**Status:** active

@memory-controller write lessons-learned.md
### [LESSON] INC-NNN: {title} [date: YYYY-MM-DD] [agent: @product-manager]
{what happened, root cause, what was done, what prevents recurrence}
**Status:** active
```

Operational follow-up:
- [ ] Monitoring alerts configured and tested
- [ ] Regression tests added and verified passing
- [ ] Runbook updated with new failure mode
- [ ] Next review date scheduled (if ongoing): ...

---

**Document info:**
- Version: 1.0
- Author: @product-manager
- Date: ...
- Incident: INC-NNN
- Depends on: `artifacts/output/08-incidents/INC-NNN/rca.md`, `artifacts/output/08-incidents/INC-NNN/remediation.md`