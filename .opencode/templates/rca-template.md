# Root Cause Analysis Template

> **Used by:** @architect or @tech-lead → **Feeds into:** remediation plan, prevention mechanisms
> **Save to:** `artifacts/output/08-incidents/INC-NNN/rca.md`

Use this template after an incident is mitigated. Focus on systems and processes, not people. Be thorough and honest.

---

## Incident: INC-NNN — [Short Title]

**Incident Date:** ...
**RCA Author:** @architect / @tech-lead
**RCA Date:** ...
**Severity:** SEV1 / SEV2 / SEV3 / SEV4
**Reference:** `artifacts/output/08-incidents/INC-NNN/triage.md`

---

## 1. Incident Summary

[2-3 sentence summary of what happened, impact, and resolution. This should be understandable by non-technical stakeholders.]

---

## 2. Timeline

Detailed timeline from first signal to full resolution. Reference `artifacts/output/08-incidents/INC-NNN/triage.md` for the real-time log.

| Time (UTC) | Event | Details |
|------------|-------|---------|
| ... | First alert / signal | What triggered detection? |
| ... | Impact began | When did users start experiencing the issue? |
| ... | Incident declared | Who declared it and why? |
| ... | Mitigation applied | What stopped the bleeding? |
| ... | Root cause hypothesized | What was the initial theory? |
| ... | Root cause confirmed | How was it confirmed? |
| ... | Fix deployed | What code change or config change was applied? |
| ... | Incident resolved | When was the system fully healthy? |

**Total incident duration:** ___ hours/minutes
**Total user-facing duration:** ___ hours/minutes

---

## 3. 5 Whys Analysis

Start with the observed problem and ask "Why?" five times to drill to the root cause.

| Why # | Question | Answer |
|-------|----------|--------|
| 1 | Why did [symptom] occur? | [Answer] |
| 2 | Why did [answer 1] happen? | [Answer] |
| 3 | Why did [answer 2] happen? | [Answer] |
| 4 | Why did [answer 3] happen? | [Answer] |
| 5 | Why did [answer 4] happen? | [Answer] |

**Root cause:** [The deepest answer that, if addressed, prevents recurrence.]

---

## 4. Contributing Factors

List all conditions that allowed this incident to happen. There is rarely a single cause.

| Factor | Category | Description | How it contributed |
|--------|----------|-------------|-------------------|
| ... | Code / Process / Monitoring / Configuration / Dependency | ... | ... |
| ... | ... | ... | ... |

---

## 5. Detection Gaps

Why wasn't this caught before reaching users?

| Gap | Description | Improvement |
|-----|-------------|-------------|
| Monitoring gap | [What alert should have fired?] | [Add alert for X] |
| Testing gap | [What test should have caught this?] | [Add test for X] |
| Process gap | [What review should have caught this?] | [Add review step for X] |
| Code review gap | [What was missed in review?] | [Add linting rule / review checklist for X] |

---

## 6. Impact Assessment

### 6.1 User Impact
- **Users affected:** [Number or percentage]
- **Features unavailable:** [Duration]
- **Data impact:** [Any data loss, corruption, exposure]

### 6.2 Business Impact
- **Revenue impact:** [Estimated]
- **SLA impact:** [Breach details]
- **Support tickets:** [Number]
- **Reputation impact:** [Assessment]

---

## 7. Prevention

For each root cause and contributing factor, what will prevent this class of issue from happening again?

| Root Cause / Factor | Prevention Mechanism | Owner | Deadline |
|---------------------|----------------------|-------|----------|
| ... | [Specific action: monitoring, test, process change, code change] | ... | ... |
| ... | ... | ... | ... |

**Rule:** Every incident must produce at least one prevention action item. If you can't think of one, you haven't drilled deep enough.

---

## 8. Lessons Learned

### What went well
- [Detection, response time, communication, mitigation]

### What could be improved
- [Monitoring coverage, response process, documentation, communication]

### Process improvements
- [ ] Improvement 1 (owner, deadline)
- [ ] Improvement 2 (owner, deadline)

---

**Document info:**
- Version: 1.0
- Author: @architect / @tech-lead
- Date: ...
- Incident: INC-NNN
- Depends on: `artifacts/output/08-incidents/INC-NNN/triage.md`, `artifacts/output/08-incidents/INC-NNN/mitigation.md`