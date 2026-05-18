# Project Plan Template

> **Used by:** @project-manager → **Feeds into:** @developer, @qa-engineer, @devops-engineer, @data-analyst, @technical-writer
> **Save to:** `artifacts/output/05-project-management/project-plan.md`

Use this template when creating a project delivery plan. This document converts the execution plan into a timeline-driven, stakeholder-facing project plan.

This document is for **delivery coordination** — timelines, milestones, stakeholder alignment, and risk tracking. @product-manager owns WHAT to build; @project-manager owns WHEN it ships.

---

## 1. Project Overview

### 1.1 Scope
What is being delivered? Reference the key documents.

- PRD: `artifacts/output/02-strategy/requirements.md`
- User stories: `artifacts/output/02-strategy/user-stories.md`
- Execution plan: `artifacts/output/04-planning/execution-plan.md`
- Architecture: `artifacts/output/03-architecture/`

### 1.2 Success Criteria
What defines project success? (Copied/adapted from PRD §3.3 and aligned with business goals.)

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### 1.3 Key Stakeholders

| Role | Agent | Responsibility |
|------|-------|----------------|
| Product Owner | @product-manager | Scope and priority decisions |
| Delivery Lead | @project-manager | Timeline, coordination, stakeholder comms |
| Tech Lead | @tech-lead | Technical decisions, task breakdown |
| Architecture | @architect | ADRs, system design |
| Development | @developer | Code implementation |
| Quality | @qa-engineer | Test validation |
| DevOps | @devops-engineer | CI/CD, deployment, infrastructure |

---

## 2. Timeline & Milestones

### 2.1 Phase Schedule

| Phase | Start Date | End Date | Duration | Key Deliverable |
|-------|-----------|----------|----------|-----------------|
| Phase 1: Foundation | ... | ... | 1 week | Core infrastructure, auth, DB schema |
| Phase 2: Core Features | ... | ... | 2 weeks | US-001 through US-005 |
| Phase 3: Secondary Features | ... | ... | 1 week | US-006 through US-008 |
| Phase 4: Polish & QA | ... | ... | 1 week | Testing, bug fixes, performance |
| Phase 5: Launch Prep | ... | ... | 3 days | Release readiness, deployment |
| **Total** | | | **5.5 weeks** | |

### 2.2 Milestones

| Milestone | Date | Gate Criteria | Sign-off |
|-----------|------|---------------|----------|
| M1: Architecture Complete | ... | All ADRs accepted, no open design concerns | @architect |
| M2: Core Features Complete | ... | US-001–005 pass QA, code review approved | @tech-lead |
| M3: Feature Complete (Code Freeze) | ... | All stories implemented, QA passed | @product-manager |
| M4: Release Ready | ... | All release criteria met | @project-manager |
| M5: Launch | ... | Deployed to production, monitoring healthy | @devops-engineer |

### 2.3 Critical Path

What is the longest dependency chain? Any date on this path slipping delays the entire project.

```
Task A → Task B → Task C → Task D → Milestone M2
                              ↑
                    Task E ──┘ (parallel)
```

**Critical path:** A → B → C → D (estimated X days)
**Buffer:** X% built into each phase

---

## 2.4 Kanban Board

The project Kanban is maintained at `artifacts/output/05-project-management/kanban.md`. It is the single source of truth for item-level progress across all phases.

**Columns:** Discovery → Design → Architecture → Ready for Dev → In Progress → Done + Blocked

**Update protocol:**
- @project-manager moves items between columns and updates metrics after every handoff and sprint event
- @product-manager adds/removes items and sets priority in the Upcoming backlog
- @tech-lead updates In Progress sub-phase (Implementing → In Review → In QA)
- Any agent can flag an item as Blocked

**WIP Limits:** Design (3), Architecture (2), In Progress (3)

---

## 3. Sprint Plan

### Sprint 1: [Date Range]

**Sprint Goal:** [One sentence describing what this sprint delivers]

| Task ID | Title | Effort | Assignee | Status |
|---------|-------|--------|----------|--------|
| T-001 | ... | Small | @developer | Not started |
| T-002 | ... | Medium | @developer | Not started |

**Sprint Risk:** [Any risk specific to this sprint]

### Sprint 2: [Date Range]

**Sprint Goal:** ...

| Task ID | Title | Effort | Assignee | Status |
|---------|-------|--------|----------|--------|
| T-003 | ... | ... | ... | Not started |

[Continue for each sprint]

---

## 4. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|----|------|------------|--------|------------|-------|--------|
| R1 | ... | High/Med/Low | High/Med/Low | ... | ... | Open/Mitigated/Closed |
| R2 | ... | ... | ... | ... | ... | ... |

**Escalation path:** Risk owner → @project-manager → @product-manager → @founder

---

## 5. Communication Plan

### 5.1 Status Updates

| Audience | Frequency | Format | Owner |
|----------|-----------|--------|-------|
| Stakeholders | Weekly | Status report (see §6) | @project-manager |
| Development team | Daily | Standup / async check-in | @tech-lead |
| Product | Bi-weekly | Scope review | @product-manager |

### 5.2 Escalation Criteria
When should issues be escalated?

- **Immediate:** Any SEV1 blocker that stops development
- **Within 4 hours:** Timeline risk > 1 day, scope conflict
- **Within 24 hours:** New risk identified, estimation miss > 20%

---

## 6. Status Report Template

To be updated at each milestone or weekly cadence.

### [Date] Status Report

**Overall Status:** 🟢 On Track / 🟡 At Risk / 🔴 Blocked

**Kanban Summary** (from `artifacts/output/05-project-management/kanban.md`):
| Column | Count | WIP Limit | Over? |
|--------|-------|-----------|-------|
| Discovery | ... | — | — |
| Design | ... | 3 | Yes/No |
| Architecture | ... | 2 | Yes/No |
| Ready for Dev | ... | — | — |
| In Progress | ... | 3 | Yes/No |
| Done | ... | — | — |
| Blocked | ... | 0 | — |

**Milestone Progress:**
| Milestone | Status | Notes |
|-----------|--------|-------|
| M1 | ✅ Complete | ... |
| M2 | 🔄 In Progress | ... |
| M3 | ⬜ Not Started | ... |

**Sprint Progress:**
- Completed: X of Y tasks
- In Progress: [list]
- Blocked: [list with blocker and owner]

**Risks:**
- New risks this period: [list]
- Changed risks: [list]
- Closed risks: [list]

**Decisions Needed:**
- [List of decisions needed with owner and deadline]

**Next Period Focus:**
- [Top 3 priorities for next period]

---

## 7. Release Readiness Checklist

To be completed before launch. All items must pass.

### 7.1 Quality Gates

- [ ] All acceptance criteria from user stories are met
- [ ] Code review passed with no blocking issues
- [ ] QA validated all acceptance criteria pass
- [ ] PM signed off on feature completeness
- [ ] Security review completed (if applicable)
- [ ] Performance benchmarks within thresholds (if applicable)
- [ ] Documentation updated

### 7.2 Operational Readiness

- [ ] Deployment pipeline tested and verified
- [ ] Rollback plan documented and tested
- [ ] Feature flags configured (if rolling out incrementally)
- [ ] Monitoring and alerting configured
- [ ] Runbook created for on-call

### 7.3 Stakeholder Sign-off

- [ ] @product-manager: Feature meets business requirements
- [ ] @tech-lead: Code meets quality standards
- [ ] @architect: Architecture integrity maintained
- [ ] @security-engineer: No critical/high security findings (if applicable)
- [ ] @project-manager: Release timeline and comms ready

---

## 8. Change Request Log

Track scope changes that impact timeline.

| CR# | Date | Requested By | Change | Impact | Decision | Approved By |
|-----|------|-------------|--------|--------|----------|-------------|
| CR-001 | ... | ... | ... | +2 days | Approved/Rejected | ... |

**Rule:** Any scope change that impacts the timeline by > 1 day requires formal change request and @product-manager approval.

---

**Document info:**
- Version: 1.0
- Author: @project-manager
- Date: ...
- Last updated: ...
- Depends on: `artifacts/output/04-planning/execution-plan.md`, `artifacts/output/02-strategy/requirements.md`
- Supersedes: [previous version if applicable]