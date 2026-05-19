# Retrospective Template

> **Used by:** @project-manager → **Feeds into:** process improvements, team knowledge base
> **Save to:** `artifacts/output/09-retro/action-items.md` (summary) and supporting review docs

Use this template after any major phase, iteration cycle, or incident to extract lessons and improve for next time.

---

## Retrospective: [Phase/Cycle Name]

**Date:** ...
**Facilitator:** @project-manager
**Period Under Review:** [Start date] through [End date]
**Participants:** [List of agents who contributed during this period]

---

## 1. Quantitative Review

### 1.1 Effort Estimation Accuracy

| Task Category | Estimated | Actual | Variance | Notes |
|---------------|-----------|--------|----------|-------|
| Foundation tasks | X hours | Y hours | +Z% | [What caused variance?] |
| Core feature tasks | X hours | Y hours | +Z% | ... |
| Polish & QA | X hours | Y hours | +Z% | ... |
| **Total** | **X hours** | **Y hours** | **+Z%** | |

**Calibration insight:** [Are we consistently over/under-estimating? By how much? Adjust future estimates by factor of ___]

### 1.2 Timeline Adherence

| Milestone | Planned Date | Actual Date | Variance | Reason |
|-----------|-------------|-------------|----------|--------|
| M1 | ... | ... | +/- X days | ... |
| M2 | ... | ... | +/- X days | ... |
| M3 | ... | ... | +/- X days | ... |

### 1.3 Quality Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Bugs found in QA | < 5 | ... | ✅/🟡/❌ |
| Code review cycles per PR | < 2 | ... | ✅/🟡/❌ |
| Acceptance criteria pass rate | 100% first pass | ... | ✅/🟡/❌ |
| Rollback count | 0 | ... | ✅/🟡/❌ |

### 1.4 Scope Changes

| Change | Reason | Timeline Impact | Approved By |
|--------|--------|-----------------|-------------|
| [Added/removed feature] | ... | +/- X days | ... |

---

## 2. What Went Well

[Celebrate successes. Be specific.]

- [Specific thing that worked well — what happened, what made it work]
- [Process that ran smoothly]
- [Decision that paid off]
- [Tool or pattern that saved time]
- ...

---

## 3. What Could Be Improved

[Be specific and actionable. No blame — focus on systems and processes.]

### 3.1 Process Issues
| Issue | Impact | Root Cause | Proposed Improvement |
|-------|--------|-----------|---------------------|
| [e.g., Specs had missing edge cases] | [2 days of rework] | [No edge case review checklist] | [Add edge case checklist to spec template] |
| ... | ... | ... | ... |

### 3.2 Communication Issues
| Issue | Impact | Root Cause | Proposed Improvement |
|-------|--------|-----------|---------------------|
| ... | ... | ... | ... |

### 3.3 Technical Issues
| Issue | Impact | Root Cause | Proposed Improvement |
|-------|--------|-----------|---------------------|
| ... | ... | ... | ... |

---

## 4. Specific Reviews

### 4.1 Execution Review (from @tech-lead)

**Estimation calibration:**
- Were estimates accurate? [Overall assessment]
- Which tasks were most under-estimated? [List]
- Which tasks were most over-estimated? [List]
- What drove the variance? [Analysis]

**Execution quality:**
- Were dependencies correctly identified? [Yes/Partially/No]
- Was the critical path accurate? [Yes/Partially/No]
- Were spikes effective? [Yes/Partially/No]
- What patterns caused rework? [Analysis]

**Full review:** `artifacts/output/09-retro/execution-review.md`

### 4.2 Product Review (from @product-manager)

**Spec completeness:**
- Did specs match PRD requirements? [Assessment]
- Were acceptance criteria complete enough? [Assessment]
- Were there design-spec mismatches? [List]
- What user feedback has come in? [Summary]

**Full review:** `artifacts/output/09-retro/product-review.md`

### 4.3 Architecture Review (from @architect)

**Architecture hold-up:**
- Did architecture hold up under implementation? [Assessment]
- Were ADRs accurate or did reality diverge? [List]
- What technical debt was incurred? [List]
- Are architectural changes needed before next cycle? [List]

**Full review:** `artifacts/output/09-retro/architecture-review.md`

---

## 5. Action Items

Every action item must have an owner, deadline, and verification method.

### 5.1 Process Improvements

| ID | Action Item | Owner | Deadline | Verification |
|----|------------|-------|----------|---------------|
| AI-1 | ... | ... | ... | [How do we know it's done?] |
| AI-2 | ... | ... | ... | ... |

### 5.2 Estimation Calibration

| ID | Adjustment | Scope | Impact |
|----|-----------|-------|--------|
| AI-X | [Multiply task estimates by 1.3x for Y category] | [Which task types] | [How this affects future plans] |

### 5.3 Knowledge Updates

| ID | Update | File to Update | Owner | Deadline |
|----|--------|---------------|-------|----------|
| AI-X | [New pattern discovered] | `artifacts/memory/patterns-and-conventions.md` | ... | ... |
| AI-X | [New lesson learned] | `artifacts/memory/lessons-learned.md` | ... | ... |

### 5.4 Architecture Decisions

| ID | Decision | Owner | Deadline | Impact on Next Cycle |
|----|---------|-------|----------|---------------------|
| AI-X | [Pay down tech debt in area Y] | @developer | ... | [Blocks task Z if not done] |

### 5.5 Tooling Improvements

| ID | Improvement | Owner | Deadline | Impact |
|----|-------------|-------|----------|--------|
| AI-X | [Add automated test for scenario Y] | @developer | ... | [Prevents regression X] |

---

## 6. Memory Updates

Use `@memory-controller` for all memory updates — do not write files directly.

```
@memory-controller write patterns-and-conventions.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @project-manager]
{process improvement}
**Status:** active

@memory-controller write agent-notes/tech-lead-notes.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @tech-lead]
{estimation benchmark update}
**Status:** active

@memory-controller write project-context.md
### [ARCH] {title} [date: YYYY-MM-DD] [agent: @architect]
{new technical decision}
**Status:** active

@memory-controller write active-decisions.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @project-manager]
{new process decision}
**Status:** active

@memory-controller write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @project-manager]
{lesson learned this cycle}
**Status:** active
```

For resolved blockers, update their status:
```
@memory-controller write blockers-and-risks.md
### [RISK] {original title} [date: YYYY-MM-DD] [agent: @project-manager] [RESOLVED: YYYY-MM-DD]
{resolution summary}
**Status:** resolved
```

Then run compaction to archive resolved entries:
```
@memory-controller compact active-decisions.md
@memory-controller compact patterns-and-conventions.md
@memory-controller compact lessons-learned.md
@memory-controller compact blockers-and-risks.md
```

Finally, write the session summary:
```
@memory-controller session-write
Worked on: Retrospective — {cycle name}
Decisions made:
- {top action item 1}
- {top action item 2}
- {top action item 3}
Next step: {first action item from section 5 with owner}
New blockers: {any new risks identified, or "none"}
```

Run a health check to confirm all files are within thresholds:
```
@memory-controller status
```

---

## 7. Next Steps

Based on retrospective findings:

- **Continue iterating on this feature?** → Load `product-iteration` skill
- **New features emerged from findings?** → Load `product-development` skill
- **Strategic pivot needed?** → Load `product-exploration` skill (or `game-product-exploration` for game projects)
- **Process changes only?** → Update memory and proceed with next cycle

---

**Document info:**
- Version: 1.0
- Author: @project-manager
- Date: ...
- Depends on: `artifacts/output/09-retro/execution-review.md`, `artifacts/output/09-retro/product-review.md`, `artifacts/output/09-retro/architecture-review.md`, `artifacts/output/09-retro/process-review.md`