# Analytics Insights Template

> **Used by:** Nova (@data-analyst)
> **Feeds into:** Sarah (@product-manager), Sarah (@product-manager)
> **Save to:** `artifacts/output/07-iteration/analytics-insights.md`

Use this template to document post-launch analytics and user behavior data that informs iteration decisions.

---

## Analytics Insights: [Feature Name]

**Analysis Date:** ...
**Analysis Period:** [Start date] through [End date]
**Analyst:** @data-analyst

---

## 1. Executive Summary

[2-3 sentences summarizing the most important findings. What is working? What isn't? What should we iterate on?]

---

## 2. Success Metrics vs. Targets

| Metric | PRD Target | Actual | Status | Trend |
|--------|-----------|--------|--------|-------|
| [e.g., Feature activation rate] | > 30% DAUs | 22% | 🟡 | ↑ / → / ↓ |
| [e.g., Task completion rate] | > 80% | 74% | 🟡 | ↑ / → / ↓ |
| [e.g., Error rate] | < 1% | 0.8% | ✅ | → |
| ... | ... | ... | ... | ... |

**Reference:** Success criteria from `artifacts/output/02-strategy/requirements.md` §3.3

---

## 3. User Behavior Analysis

### 3.1 Funnel Analysis

| Step | Action | Users | Conversion | Drop-off |
|------|--------|-------|------------|----------|
| 1 | [First step] | 10,000 | 100% | — |
| 2 | [Second step] | 6,500 | 65% | 35% ↓ |
| 3 | [Third step] | 4,200 | 42% | 23% ↓ |
| 4 | [Completion] | 3,100 | 31% | 11% ↓ |

**Biggest drop-off:** Step [X] — [Description of where users are failing]

### 3.2 User Segments

| Segment | Adoption | Engagement | Retention (7d) | Notes |
|--------|----------|------------|-----------------|-------|
| [Power users] | 85% | High | 72% | Heavy feature users |
| [Casual users] | 30% | Low | 28% | Try once, don't return |
| [New users] | 45% | Medium | 35% | Need better onboarding |
| ... | ... | ... | ... | ... |

### 3.3 Feature Usage Patterns

- **Most used feature/path:** [Description]
- **Least used feature/path:** [Description]
- **Unexpected behavior:** [Description of surprises]
- **Time-based patterns:** [Usage peaks/troughs]

---

## 4. Error and Performance Data

### 4.1 Error Analysis

| Error | Frequency | User Impact | Category | Priority |
|-------|-----------|-------------|----------|----------|
| [Error 1] | 500/day | High | Bug | Must-fix |
| [Error 2] | 50/day | Medium | UX friction | Should-fix |
| ... | ... | ... | ... | ... |

### 4.2 Performance Data

| Metric | Target | Actual (p50) | Actual (p95) | Status |
|--------|--------|---------------|---------------|--------|
| Page load | < 2s | ... | ... | ✅/🟡/❌ |
| API response | < 200ms | ... | ... | ✅/🟡/❌ |
| Time to interactive | < 3s | ... | ... | ✅/🟡/❌ |

---

## 5. A/B Test Results (if applicable)

| Test | Variant | Metric | Result | Confidence | Winner? |
|------|---------|--------|--------|-----------|---------|
| [Test 1] | Control | [Metric] | ... | ... | — |
| [Test 1] | Variant A | [Metric] | ... | ... | Yes/No |

**Statistical significance:** [Yes/No, confidence level]

---

## 6. Qualitative Feedback

| Source | Sentiment | Key Themes | Actionable Insights |
|--------|-----------|------------|-------------------|
| App store reviews | Positive/Mixed/Negative | ... | ... |
| Support tickets | ... | ... | ... |
| User interviews | ... | ... | ... |
| Social media | ... | ... | ... |

---

## 7. Iteration Hypotheses

Based on the data, what improvements should we test?

### Hypothesis 1: [Title]
- **If we** [change X]
- **Then** [metric Y will improve by Z%]
- **Because** [data insight from sections above]
- **Priority:** Must-have / Should-have / Could-have
- **Effort estimate:** Small / Medium / Large

### Hypothesis 2: [Title]
- **If we** [change X]
- **Then** [metric Y will improve by Z%]
- **Because** [data insight from sections above]
- **Priority:** Must-have / Should-have / Could-have
- **Effort estimate:** Small / Medium / Large

[Continue for each hypothesis]

---

## 8. Recommendations

### Quick Wins (High impact, Low effort)
1. [Recommendation 1]
2. [Recommendation 2]

### Strategic Bets (High impact, Higher effort)
1. [Recommendation 1]
2. [Recommendation 2]

### Deprioritize (Low impact or Low signal)
1. [Feature/path that data suggests isn't worth investing in]

---

## 9. Next Steps

- [ ] Load `product-iteration` skill to act on these insights
- [ ] @product-manager to prioritize iteration backlog based on hypotheses
- [ ] @product-designer to design improvements for top hypotheses
- [ ] Schedule next analytics review in [1/2/4 weeks]

---

**Document info:**
- Version: 1.0
- Author: @data-analyst
- Date: ...
- Depends on: `artifacts/output/02-strategy/requirements.md` (success criteria), `artifacts/output/02-strategy/user-stories.md`