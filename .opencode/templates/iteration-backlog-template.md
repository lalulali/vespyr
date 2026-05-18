# Iteration Backlog Template

> **Used by:** @product-manager → **Feeds into:** @product-designer, @tech-lead (iteration planning)
> **Save to:** `artifacts/output/07-iteration/iteration-backlog.md`

Use this template to prioritize post-launch improvements based on analytics insights and user feedback.

---

## Iteration Backlog: [Feature Name] — Cycle [N]

**Created:** ...
**Owner:** @product-manager
**Analytics Input:** `artifacts/output/07-iteration/analytics-insights.md`
**Previous PRD:** `artifacts/output/02-strategy/requirements.md`

---

## 1. Context

### 1.1 What We Launched
[Brief summary of the current feature and when it launched]

### 1.2 Key Findings from Analytics
[Top 3 findings from `artifacts/output/07-iteration/analytics-insights.md`]
1. ...
2. ...
3. ...

### 1.3 Success Assessment
[Did we meet PRD success criteria? What metrics are on/off track?]

---

## 2. Prioritization (RICE Framework)

Score each item: **Reach × Impact × Confidence / Effort**

| ID | Item | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|----|------|-------|--------|------------|--------|-----------|----------|
| IB-001 | ... | [Number of users affected] | [3/2/1] | [100%/80%/50%] | [S/M/L] | [Calculated] | Must/Should/Could |
| IB-002 | ... | ... | ... | ... | ... | ... | ... |

**Impact:** 3 = massive, 2 = high, 1 = medium, 0.5 = low
**Confidence:** 100% = high conviction, 80% = medium, 50% = low
**Effort:** S = < 1 day, M = 1-3 days, L = 1-2 weeks

---

## 3. Backlog Items

### IB-001: [Title]

**Priority:** Must-have / Should-have / Could-have
**Hypothesis:** If we [change], then [metric] will [improve] because [insight]
**Story IDs (new):** US-XXX
**Effort estimate:** Small / Medium / Large
**Acceptance Criteria:**
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]

**Links:**
- Analytics evidence: [Reference to section in analytics-insights.md]
- User feedback: [Reference to user report/complaint]

---

### IB-002: [Title]

[Same structure as IB-001]

---

## 4. Out of Scope

What we are explicitly NOT iterating on in this cycle and why:

| Item | Reason | Revisit In |
|------|--------|------------|
| [Item 1] | Low impact, high effort | Next quarter |
| [Item 2] | Needs more data | After next analytics review |

---

## 5. Success Criteria for This Iteration

What will make this iteration successful?

| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| [e.g., Feature activation rate] | 22% | > 35% | Analytics dashboard |
| [e.g., Funnel drop-off at step 2] | 35% | < 20% | Funnel analysis |
| ... | ... | ... | ... |

---

## 6. Iteration Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Design | [X days] | Updated specs for iteration items |
| Implementation | [X days] | Code changes for iteration items |
| QA | [X days] | Validation against acceptance criteria |
| Measurement | [7-14 days] | Data collection for success criteria |

**Total cycle:** [X] weeks

---

**Document info:**
- Version: 1.0
- Author: @product-manager
- Date: ...
- Depends on: `artifacts/output/07-iteration/analytics-insights.md`, `artifacts/output/02-strategy/requirements.md`