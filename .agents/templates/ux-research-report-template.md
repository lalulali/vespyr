# UX Research Report Template

> **Used by:** Zara (@ux-researcher)
> **Feeds into:** Ivy (@product-designer), Rex (@developer), Sarah (@product-manager), Nina (@qa-engineer)
> **Save to:** `artifacts/output/01-research/ux-research-report.md`

Use this template when evaluating the usability, interaction design, information architecture, and accessibility of the product spec.

This document answers a single question: **Can real users actually use what we designed?**

---

## 1. Executive Summary

**3-4 sentences** that answer:
- What did we test?
- What were the most critical findings?
- Is this design ready for development, or does it need changes?
- What is the single most important usability issue?

**Verdict:**
- [ ] **READY** — Design is usable; proceed to development
- [ ] **READY WITH FIXES** — Critical issues identified; fixes required before handoff
- [ ] **NOT READY** — Fundamental usability problems; significant redesign needed

---

## 2. Research Methodology

How was this research conducted?

### 2.1 Methods Used
| Method | Purpose | Participants/Sample | Duration |
|--------|---------|-------------------|----------|
| Heuristic evaluation | Expert review against usability principles | 1-3 experts | X hours |
| Usability testing | Observe real users completing tasks | N = [5-8] | X sessions |
| Tree testing | Validate navigation/IA structure | N = [30-50] | X days (unmoderated) |
| Card sorting | Understand mental models for content grouping | N = [15-20] | X days |
| Screen reader testing | Accessibility validation | 1-2 testers with assistive tech | X hours |
| First-click testing | Validate initial interaction choices | N = [50-100] | X days |

### 2.2 Participant Profile
How participants were recruited and matched to @user-researcher's personas:
- **Recruitment method:** [screening survey, panel, direct invite]
- **Screening criteria:** [matching persona characteristics]
- **Compensation:** [if any]
- **Limitations:** [sample size constraints, demographic gaps]

### 2.3 Tasks Tested
Which user story flows were tested?

| Task | User Story(s) | Flow Tested |
|------|---------------|-------------|
| e.g., Complete onboarding | US-001, US-002 | Primary flow §2.1 in product-spec |
| e.g., Recover password | US-005 | Error flow §2.3 in product-spec |

---

## 3. Findings

### 3.1 Critical Findings (Block Development)

| # | Finding | Evidence | Severity | Affected Users | Recommended Fix |
|---|---------|----------|----------|----------------|-----------------|
| C-1 | [Description] | [What you observed: N/N participants failed] | Critical | [Which persona(s)] | [Specific design change] |
| C-2 | ... | ... | Critical | ... | ... |

### 3.2 Serious Findings (Redesign Recommended)

| # | Finding | Evidence | Severity | Affected Users | Recommended Fix |
|---|---------|----------|----------|----------------|-----------------|
| S-1 | [Description] | [Evidence] | Serious | [Which persona(s)] | [Specific design change] |
| S-2 | ... | ... | Serious | ... | ... |

### 3.3 Moderate Findings (Fix If Time Permits)

| # | Finding | Evidence | Severity | Recommended Fix |
|---|---------|----------|----------|-----------------|
| M-1 | [Description] | [Evidence] | Moderate | [Specific improvement] |

### 3.4 Minor Findings (Nice to Have)

| # | Finding | Evidence | Severity | Recommendation |
|---|---------|----------|----------|----------------|
| m-1 | [Description] | [Evidence] | Minor | [Suggestion] |

---

## 4. Usability Test Results (if conducted)

### 4.1 Task Success Rates

| Task | Success Rate | Avg. Time | Errors/Session | SUS Score |
|------|-------------|-----------|----------------|-----------|
| Task 1: [Name] | N/N succeeded (X%) | X.X min | X | ... |
| Task 2: [Name] | N/N succeeded (X%) | X.X min | X | ... |
| Task 3: [Name] | N/N succeeded (X%) | X.X min | X | ... |

**Success benchmark:** ≥80% success rate per task. Below 60% = critical.

### 4.2 Common Failure Patterns

| Pattern | Frequency | Root Cause | Fix |
|---------|-----------|-----------|-----|
| [Description] | N/N participants | [Why it happened] | [Proposed solution] |

### 4.3 Participant Satisfaction

| Metric | Score (1-5) | Benchmark | Notes |
|--------|-------------|-----------|-------|
| Overall satisfaction | ... | ≥4.0 | ... |
| Ease of use | ... | ≥4.0 | ... |
| Confidence completing tasks | ... | ≥3.5 | ... |
| Would use again | ... | ≥3.5 | ... |

---

## 5. Heuristic Evaluation Results (if conducted)

| # | Heuristic Violated | Location | Severity | Description | Recommendation |
|---|-------------------|----------|----------|-------------|----------------|
| H-1 | Visibility of system status | [Screen: X, Element: Y] | 3 (Major) | No loading indicator on API calls | Add skeleton loader + progress indicator |
| H-2 | Error prevention | [Screen: X] | 2 (Minor) | Destructive delete has no confirmation | Add undo/confirm dialog |
| ... | ... | ... | ... | ... | ... |

Nielsen severity scale: 0 = Not a problem, 1 = Cosmetic, 2 = Minor, 3 = Major, 4 = Usability catastrophe

---

## 6. Information Architecture Validation (if conducted)

### 6.1 Tree Test Results

| Task | Success Rate | Directness | Avg. Time | Verdict |
|------|-------------|-----------|-----------|---------|
| Find [X] | X% | X% direct | X.X sec | Pass / Fail |
| Locate [Y] | X% | X% direct | X.X sec | Pass / Fail |

**Benchmark:** ≥75% success rate. Below 50% = IA restructuring needed.

### 6.2 Card Sorting Results

| Category | Consensus Level | Suggested Label | Confusion With |
|----------|----------------|----------------|----------------|
| [Group A] | High (80%+) | [Label] | [Group B] |
| [Group B] | Low (<60%) | [Label] — needs work | [Group A], [Group C] |

---

## 7. Accessibility Audit Results (if conducted)

### 7.1 WCAG Compliance Summary

| Level | Pass | Fail | Needs Review |
|-------|------|------|-------------|
| AA | X | X | X |
| AAA | X | X | X |

### 7.2 Critical Accessibility Findings

| # | Issue | WCAG Criterion | Location | Severity | Fix |
|---|-------|---------------|----------|----------|-----|
| A-1 | [Description] | [WCAG ref, e.g., 1.4.3 Contrast] | [Screen/Element] | Must fix | [Solution] |
| A-2 | ... | ... | ... | ... | ... |

### 7.3 Screen Reader Testing Notes
- What worked: [list]
- What failed: [list with details]
- Recommended fixes: [list]

---

## 8. Interaction Design Validation

### 8.1 Interaction Pattern Assessment

| Pattern | Found in Spec | Industry Standard | Our Version | Usability Concern |
|---------|--------------|-------------------|-------------|-------------------|
| [e.g., Pull to refresh] | Yes | Standard | Custom variant | May confuse iOS users expecting standard behavior |
| ... | ... | ... | ... | ... |

### 8.2 State Coverage Checklist

For each flow, verify the product spec defines ALL required states:

| State | Defined? | Quality | Notes |
|-------|---------|---------|-------|
| Default / idle | ✅ / ❌ | [Thorough / Partial / Missing] | ... |
| Loading | ✅ / ❌ | ... | ... |
| Success | ✅ / ❌ | ... | ... |
| Error (validation) | ✅ / ❌ | ... | ... |
| Error (server) | ✅ / ❌ | ... | ... |
| Empty state | ✅ / ❌ | ... | ... |
| Disabled states | ✅ / ❌ | ... | ... |
| Edge case states | ✅ / ❌ | ... | ... |

---

## 9. Recommendations Summary

### Must-Fix Before Development
1. [Finding C-1] — [brief fix description]
2. [Finding C-2] — [brief fix description]

### Should-Fix Before Development
1. [Finding S-1] — [brief fix description]

### For Future Iterations
1. [Finding M-1] — [brief fix description]
2. [Finding m-1] — [brief fix description]

---

## 10. Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| @ux-researcher | ... | ... | ✅ Complete |
| @product-designer | ... | ... | ✅ Accepted / ⏳ Implementing fixes |
| @product-manager | ... | ... | ✅ Approved |

**Final verdict:** [READY / READY WITH FIXES / NOT READY]

---

**Document info:**
- Version: 1.0
- Author: @ux-researcher
- Date: ...
- Input: `artifacts/output/02-strategy/product-spec.md` + `artifacts/output/02-strategy/user-stories.md` + `artifacts/output/01-research/user-personas.md`
- Companion documents: `artifacts/output/01-research/user-personas.md`, `artifacts/output/01-research/competitive-analysis.md`