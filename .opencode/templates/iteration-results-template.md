# Iteration Results Template

> **Used by:** @data-analyst → **Feeds into:** iteration backlog (next cycle), retrospective
> **Save to:** `artifacts/output/07-iteration/iteration-results.md`

Use this template to document the measured impact of iteration changes. Compare against success criteria from the iteration backlog.

---

## Iteration Results: [Feature Name] — Cycle [N]

**Analysis Date:** ...
**Analysis Period:** [Start date] through [End date]
**Analyst:** @data-analyst
**Iteration Backlog:** `artifacts/output/07-iteration/iteration-backlog.md`

---

## 1. Executive Summary

[2-3 sentences: Did the iteration achieve its goals? What was the most impactful change?]

**Overall verdict:** ✅ Success / 🟡 Mixed / ❌ Did not meet targets

---

## 2. Success Criteria Results

| Metric | Previous | Target | Actual | Change | Status |
|--------|----------|--------|--------|--------|--------|
| [e.g., Feature activation rate] | 22% | > 35% | 38% | +16pp | ✅ |
| [e.g., Funnel drop-off at step 2] | 35% | < 20% | 28% | -7pp | 🟡 |
| [e.g., Error rate] | 0.8% | < 0.5% | 0.3% | -0.5pp | ✅ |
| ... | ... | ... | ... | ... | ... |

**Reference:** Success criteria from `artifacts/output/07-iteration/iteration-backlog.md` §5

---

## 3. Per-Hypothesis Results

### Hypothesis IB-001: [Title]

- **Hypothesis:** If we [change X], then [metric Y] will [improve by Z%]
- **Result:** ✅ Confirmed / 🟡 Partially confirmed / ❌ Refuted
- **Data:**
  - Before: [Metric value]
  - After: [Metric value]
  - Change: [Delta]
- **Insight:** [What does this tell us?]
- **Next step:** [Continue / Iterate / Revisit hypothesis]

### Hypothesis IB-002: [Title]

[Same structure]

---

## 4. A/B Test Results (if applicable)

| Test | Variant | Metric | Control | Variant | Lift | Significant? | Decision |
|------|---------|--------|---------|---------|------|-------------|----------|
| [Test 1] | A vs B | [Metric] | [Value] | [Value] | +X% | Yes/No | Ship variant / Keep control |
| ... | ... | ... | ... | ... | ... | ... | ... |

---

## 5. Unexpected Findings

**Positive surprises:**
- [Un intended positive outcome 1]
- [Unintended positive outcome 2]

**Negative surprises:**
- [Unintended negative outcome 1]
- [Unintended negative outcome 2]

**New questions raised:**
- [Question 1]
- [Question 2]

---

## 6. Side Effects

Did the iteration changes affect other parts of the product?

| Area | Metric | Before | After | Change | Concern? |
|------|--------|--------|-------|-------|----------|
| [Other feature] | [Metric] | ... | ... | ... | Yes/No |
| [System performance] | [Metric] | ... | ... | ... | Yes/No |
| [Support tickets] | [Volume] | ... | ... | ... | Yes/No |

---

## 7. Decision Matrix

Based on results, what should happen next?

| Hypothesis | Result | Decision | Rationale |
|------------|--------|----------|-----------|
| IB-001 | ✅ Confirmed | **Continue / Expand** | Positive signal, invest more |
| IB-002 | 🟡 Mixed | **Iterate / Refine** | Partial signal, adjust hypothesis |
| IB-003 | ❌ Refuted | **Roll back / Revisit** | No positive signal, stop investing |
| ... | ... | ... | ... |

---

## 8. Recommendations for Next Cycle

### Continue iterating
- [Item 1: What to iterate on next and why]
- [Item 2: What to iterate on next and why]

### Roll back
- [Item 1: What should be reverted and why]

### New hypotheses to test
- [Hypothesis 1: Based on unexpected finding X]
- [Hypothesis 2: Based on side effect Y]

### Deprioritize
- [Item 1: What data suggests we should stop investing in]

---

## 9. Next Steps

- **Positive signal on most hypotheses** → Continue `product-iteration` cycle
- **Mixed results, need design revision** → Load `product-iteration` with updated backlog
- **Negative signal, need bigger rethink** → Load `product-design` for redesign
- **Process deserves review** → Load `retrospective`

---

**Document info:**
- Version: 1.0
- Author: @data-analyst
- Date: ...
- Depends on: `artifacts/output/07-iteration/analytics-insights.md`, `artifacts/output/07-iteration/iteration-backlog.md`