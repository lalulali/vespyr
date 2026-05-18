# Incident Triage Template

> **Used by:** @project-manager (incident commander) → **Feeds into:** responders, stakeholders
> **Save to:** `artifacts/output/08-incidents/INC-NNN/triage.md`

Use this template when a production incident is detected. Fill in as information becomes available — do not wait for completeness.

---

## Incident: INC-NNN — [Short Title]

**Detection Time:** ... (UTC)
**Detection Source:** [Monitoring alert / User report / Support ticket / Other]
**Incident Commander:** @project-manager
**Severity:** SEV1 / SEV2 / SEV3 / SEV4

---

## 1. Severity Classification

| Severity | Criteria | Response SLA | Mitigation Target | Update Cadence |
|----------|----------|-------------|-------------------|----------------|
| SEV1 | Service down, data loss, security breach | 15 min | 1 hour | Every 30 min |
| SEV2 | Major feature broken, significant user impact | 30 min | 4 hours | Every hour |
| SEV3 | Feature degraded, workaround exists | 4 hours | Next business day | Daily |
| SEV4 | Minor issue, cosmetic | Next business day | Next sprint | Weekly |

**Classification:** SEV___
**Justification:** [Why this severity? What is the user impact?]

---

## 2. Incident Summary

### 2.1 What Happened
[1-2 sentence description of the issue as currently understood]

### 2.2 User Impact
- **Users affected:** [Number or percentage]
- **Features impacted:** [List]
- **Data impact:** [Any data loss, corruption, or exposure]
- **Duration (so far):** [Time since detection]

### 2.3 Business Impact
- Revenue impact: [Estimated]
- SLA impact: [Yes/No, details]
- Brand/reputation impact: [Assessment]

---

## 3. Response Team

| Role | Agent | Status |
|------|-------|--------|
| Incident Commander | @project-manager | Active |
| Infrastructure | @devops-engineer | Active / Standby |
| Application | @developer / @tech-lead | Active / Standby |
| Security | @security-engineer | Active / Standby / N/A |
| Performance | @performance-engineer | Active / Standby / N/A |
| Communication | @project-manager | Active |

---

## 4. Timeline

| Time (UTC) | Event | Source |
|------------|-------|-------|
| ... | First signal / alert | [Monitoring / User report] |
| ... | Incident declared | @project-manager |
| ... | Responder assigned | ... |
| ... | Mitigation applied | ... |
| ... | Root cause identified | ... |
| ... | Fix deployed | ... |
| ... | Incident resolved | ... |

[Update this section continuously as events unfold]

---

## 5. Current Status

- **Status:** 🔴 Investigating / 🟡 Mitigating / 🟢 Resolved
- **Mitigation in place:** Yes / No
- **Mitigation details:** [What was done to reduce impact]
- **Root cause identified:** Yes / No
- **Fix deployed:** Yes / No

---

## 6. Stakeholder Communication

| Audience | Message | Channel | Time Sent |
|----------|---------|---------|-----------|
| Internal team | ... | ... | ... |
| Users (if applicable) | ... | ... | ... |
| Leadership | ... | ... | ... |

---

**Document info:**
- Version: 1.0
- Author: @project-manager
- Date: ...
- Incident: INC-NNN