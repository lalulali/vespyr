# Project Kanban Board Template

> **Used by:** Sarah (@product-manager)
> **Feeds into:** status reports, stakeholder updates, retrospectives
> **Save to:** `artifacts/output/04-planning/kanban.md`

Use this template to track modular user stories and tasks through the delivery pipeline. Update it continuously at each handoff.

---

## Kanban Board: [Project Name]

**Last Updated:** YYYY-MM-DD
**Updated By:** @product-manager
**Overall Status:** 🟢 On Track | 🟡 At Risk | 🔴 Blocked

---

## 📋 The Board

### 📥 Backlog
- [ ] US-001: QR Code Entry Point (Priority: Must-have, Owner: @product-manager)
- [ ] US-002: Basic Shipping Form (Priority: Must-have, Owner: @product-manager)

### 📋 To Do
- [ ] US-003: QRIS Payment Gateway (Priority: Must-have, Owner: @tech-lead)

### 🚧 In Progress
- [ ] US-004: Event attendee shipping flow (Priority: Must-have, Owner: @developer)

### 🔍 Review / QA
- [ ] US-005: Dropoff visitor skipping queue (Priority: Must-have, Owner: @code-reviewer)

### ✅ Done
- [x] US-006: Photo-based item recognition (Completed: YYYY-MM-DD)

### 🚫 Blocked
- [ ] US-007: Multiple package shipping — Blocked: Merchant ID pending (Owner: @product-manager)

---

## 📊 Summary Metrics
- **Total Stories:** 7
- **Done:** 1
- **In Progress / Review:** 2
- **Blocked:** 1
- **Completion Rate:** 14%

---

## 📝 Activity Log
- **YYYY-MM-DD:** US-004 moved to *In Progress* by @developer.
- **YYYY-MM-DD:** US-007 marked *Blocked* by @product-manager (Merchant ID pending).
- **YYYY-MM-DD:** Board initialized and seeded by @product-manager.

---

## 🔄 Update Protocol

* **Owner:** `@product-manager` is the overall owner and maintains the backlog.
* **Handoffs:** `@tech-lead` and `@developer` move stories through *To Do* → *In Progress* → *Review / QA* → *Done*.
* **Blockers:** Any agent can flag a card as *Blocked* by adding a note with the blocking reason.

### Updating Status
- Use `[ ]` for not started
- Use `[-]` for in progress  
- Use `[x]` for completed
- Add notes for blockers or decisions

---

**Document Info:**
- Version: 3.0
- Author: @product-manager
- Depends on: `artifacts/output/02-strategy/user-stories.md`