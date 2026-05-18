# Project Kanban Board Template

> **Used by:** @project-manager, @product-manager → **Feeds into:** status reports, stakeholder updates, retrospectives
> **Save to:** `artifacts/output/05-project-management/kanban.md`

Use this template as a living document to track features and user stories through the delivery pipeline. Update it at every status check and handoff. This is the single source of truth for project progress.

**This is a high-level board.** Individual dev tasks live in the execution plan. This board tracks features and user stories through phases.

---

## Kanban Board: [Project Name]

**Last Updated:** ...
**Updated By:** @project-manager
**Overall Status:** 🟢 On Track / 🟡 At Risk / 🔴 Blocked

---

## Board

### 🔍 Discovery

Items being explored, researched, or validated.

| ID | Item | Owner | Since | Notes |
|----|------|-------|-------|-------|
| US-001 | [Feature name] | @market-researcher | ... | [Key assumption being validated] |
| ... | ... | ... | ... | ... |

### 📐 Design

Items with validated research, now being defined (PRD, specs, user stories).

| ID | Item | Owner | Since | Notes |
|----|------|-------|-------|-------|
| US-002 | [Feature name] | @product-manager | ... | [PRD in progress / spec in progress] |
| ... | ... | ... | ... | ... |

### 🏗️ Architecture

Items with complete specs, now being architected (ADRs, data models, API contracts).

| ID | Item | Owner | Since | Notes |
|----|------|-------|-------|-------|
| US-003 | [Feature name] | @architect | ... | [ADR in progress / blocked by...] |
| ... | ... | ... | ... | ... |

### 📋 Ready for Dev

Items that are fully specified, architected, and planned. Ready for a developer to pick up.

| ID | Item | Effort | Sprint | Blocked By | Notes |
|----|------|--------|--------|------------|-------|
| US-004 | [Feature name] | M | Sprint 2 | — | [All specs and ADRs approved] |
| ... | ... | ... | ... | ... | ... |

### 🚧 In Progress

Items currently being implemented, reviewed, or tested.

| ID | Item | Assignee | Started | Phase | Notes |
|----|------|----------|---------|-------|-------|
| US-005 | [Feature name] | @developer | ... | Implementing / In QA / In Review | [Current task/PR link] |
| ... | ... | ... | ... | ... | ... |

### ✅ Done

Items that have passed all quality gates and are shipped or ready to ship.

| ID | Item | Completed | Cycle Time | Notes |
|----|------|-----------|------------|-------|
| US-006 | [Feature name] | ... | X days | [Shipped in version X.Y] |
| ... | ... | ... | ... | ... |

---

## 🚫 Blocked

Items that cannot proceed until a blocker is resolved. These are the project manager's top priority.

| ID | Item | Column | Blocker | Owner | Since | Escalation |
|----|------|--------|---------|-------|-------|------------|
| US-007 | [Feature name] | [Current column] | [What's blocking] | [Who owns the blocker] | ... | [24h deadline, then escalate to...] |
| ... | ... | ... | ... | ... | ... | ... |

---

## 📊 Metrics

Updated weekly or at each milestone.

| Metric | Value | Trend | Target |
|--------|-------|-------|--------|
| Total items | ... | — | — |
| Items in Discovery | ... | → | — |
| Items in Design | ... | → | — |
| Items in Architecture | ... | → | — |
| Items Ready for Dev | ... | ↑ | ≥ 2 (maintain buffer) |
| Items In Progress | ... | → | WIP limit: 3 |
| Items Done | ... | ↑ | — |
| Items Blocked | ... | ↓ | 0 |
| Avg cycle time (Ready → Done) | ... | → | < X days |
| Throughput (items/week) | ... | → | — |

### WIP Limits

| Column | WIP Limit | Current | Over? |
|--------|-----------|---------|-------|
| Discovery | No limit | ... | — |
| Design | 3 | ... | Yes/No |
| Architecture | 2 | ... | Yes/No |
| Ready for Dev | No limit (buffer) | ... | — |
| In Progress | 3 | ... | Yes/No |
| Done | No limit | ... | — |

**Rule:** If any column with a WIP limit is exceeded, no new items enter that column until existing items advance. This prevents bottlenecks.

---

## 🔮 Upcoming

Items that are in the backlog but not yet started. Roughly prioritized.

| Priority | ID | Item | Phase | Target Sprint | Notes |
|----------|----|------|-------|---------------|-------|
| Must-have | US-008 | [Feature name] | Discovery | Sprint 3 | [Depends on US-005] |
| Should-have | US-009 | [Feature name] | — | Sprint 4 | — |
| Could-have | US-010 | [Feature name] | — | Backlog | — |

---

## 📅 Milestone Tracking

| Milestone | Date | Items Required | Items Done | Progress | Status |
|-----------|------|----------------|-----------|----------|--------|
| M1: Architecture Complete | ... | 5 | 3 | 60% | 🟡 At Risk |
| M2: Core Features Complete | ... | 8 | 0 | 0% | ⬜ Not Started |
| M3: Feature Complete | ... | 12 | 0 | 0% | ⬜ Not Started |
| M4: Release Ready | ... | All | 0 | 0% | ⬜ Not Started |
| M5: Launch | ... | All | 0 | 0% | ⬜ Not Started |

---

## 📝 Activity Log

Append new entries at the top. This provides a chronological narrative of project progress.

| Date | Action | Item | By | Notes |
|------|--------|-------|----|-------|
| ... | Moved | US-005 | @project-manager | In Progress → Done (QA passed) |
| ... | Blocked | US-007 | @project-manager | Blocked by: API contract not finalized |
| ... | Unblocked | US-007 | @architect | Blocker resolved, ADR-005 accepted |
| ... | Added | US-011 | @product-manager | New requirement from stakeholder |
| ... | Reprioritized | US-009 | @product-manager | Moved from Should-have → Must-have |
| ... | Removed | US-012 | @product-manager | Descoped per CR-003 |

---

## Update Protocol

**When to update this board:**
- After every cross-agent handoff (spec review, architecture review, QA cycle)
- After every sprint planning and sprint review
- After every blocker resolution or escalation
- After every scope change (add, remove, reprioritize)
- Minimum: weekly status update

**Who updates:**
- @project-manager: moves items between columns, updates metrics, manages blocked items
- @product-manager: adds/removes items, sets priority, owns the Upcoming backlog
- @tech-lead: updates In Progress sub-phase (Implementing → In Review → In QA)
- Any agent: can flag an item as blocked

**Movement rules:**
- Items move **left to right** (Discovery → Design → Architecture → Ready for Dev → In Progress → Done)
- Items can move to **Blocked** from any column
- Items can move **back** one column (e.g., In Progress → Ready for Dev) if implementation reveals a spec gap
- Items can move **back to Design** if architecture reveals a spec issue (requires @product-manager approval)
- Items that are **descoped** move to a separate "Descoped" section with reason and date
- **No item enters In Progress** without all upstream artifacts complete (spec, ADRs, execution plan task)

---

**Document info:**
- Version: 1.0
- Author: @project-manager
- Date: ...
- Last updated: ...
- Depends on: `artifacts/output/04-planning/execution-plan.md`, `artifacts/output/02-strategy/user-stories.md`, `artifacts/output/05-project-management/project-plan.md`
- Update frequency: After every handoff, sprint event, or blocker change; minimum weekly