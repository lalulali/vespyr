# Sprint Plan Template

> **Used by:** @project-manager → **Feeds into:** @developer, @qa-engineer
> **Save to:** `artifacts/output/05-project-management/sprint-plan.md`

Use this template for each sprint/iteration within a project. This document breaks a phase into a single sprint with specific tasks, goals, and capacity.

---

## Sprint [Number]: [Sprint Goal]

**Sprint Duration:** [Start Date] → [End Date] ([X] days)
**Sprint Goal:** [One clear sentence describing what this sprint delivers]

---

## 1. Sprint Goal & Context

### 1.1 Objective
What is the primary outcome of this sprint? Map to project milestones.

- Project milestone: [M1/M2/M3... from `artifacts/output/05-project-management/project-plan.md`]
- Phase: [Phase from execution plan]
- Key deliverable: [What will be demonstrably working by sprint end]

### 1.2 Scope

| Task ID | Title | Story IDs | Effort | Priority | Assignee |
|---------|-------|-----------|--------|----------|----------|
| T-001 | ... | US-001 | Small | Must-have | @developer |
| T-002 | ... | US-002 | Medium | Must-have | @developer |
| T-003 | ... | US-003 | Large | Should-have | @developer |

**Total estimated effort:** [X] points / [Y] days
**Available capacity:** [Z] days (after accounting for overhead)

### 1.3 Out of Scope
What is explicitly NOT in this sprint?

- [Item 1]
- [Item 2]

---

## 2. Daily Status

Update daily during standup.

| Date | Yesterday | Today | Blockers |
|------|-----------|-------|----------|
| ... | [Completed tasks] | [Planned tasks] | [Any blockers] |

---

## 3. Task Details

### T-001: [Task Title]

**Story IDs:** US-001
**Priority:** Must-have
**Effort:** Small (0.5 day)
**Assignee:** @developer
**Dependencies:** None

**Definition of Done:**
- [ ] Code implemented following ADR guidelines
- [ ] Unit tests pass
- [ ] Code review approved
- [ ] QA acceptance criteria verified

**Acceptance Criteria Mapping:**
- AC-H-001: [Happy path scenario]
- AC-U-001: [Error path scenario]
- AC-E-001: [Edge case scenario]

---

## 4. Sprint Burndown

Track daily progress against sprint goal.

| Day | Tasks Remaining | Cumulative Completed | Blockers |
|-----|----------------|----------------------|----------|
| Day 1 | X | 0 | ... |
| Day 2 | X-1 | 1 | ... |
| ... | ... | ... | ... |

**Velocity reference:** Previous sprint completed [Y] points. This sprint target: [Z] points.

---

## 5. Sprint Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| ... | ... | ... | ... | ... |

---

## 6. Sprint Retrospective Notes

To be filled at end of sprint.

**What went well:**
- ...

**What could be improved:**
- ...

**Action items for next sprint:**
- [ ] Action 1 (owner, deadline)
- [ ] Action 2 (owner, deadline)

---

**Document info:**
- Version: 1.0
- Author: @project-manager
- Date: ...
- Sprint: [Number]
- Project plan: `artifacts/output/05-project-management/project-plan.md`
- Execution plan: `artifacts/output/04-planning/execution-plan.md`