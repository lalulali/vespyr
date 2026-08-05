---
name: discovery-report
description: Compile design thinking and research outputs into a unified report with dynamic usability testing scoring
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Discovery Report

Compiles research and design thinking outputs into a single unified report. Dynamically includes or excludes the Usability Testing (UT) Score section based on available data. Outputs to `artifacts/output/02-research/`.

## Persona delegation
This skill delegates to `@product-manager`. The pm compiles and synthesizes findings. The skill provides the report structure; `@product-manager` provides the narrative synthesis and prioritization.

## When to use
- After completing multiple design thinking exercises
- Before presenting findings to stakeholders
- As a handoff from research to design
- "Compile everything we've learned into one report"

## Workflow

### Step 1: Inventory available artifacts

Check `artifacts/output/02-research/` for:
- `problem-space-brief.md`
- `root-cause-analysis.md`
- `research-plan.md`
- `empathy-map.md`
- `journey-map.md`
- `jtbd-hmw.md`
- Usability testing data (UT scores)

### Step 2: Compile report

Synthesize findings into a unified narrative. Focus on connections: how does the root cause connect to the journey friction? How do JTBDs map to empathy pains?

**If usability testing data exists:**
- Output `usability-report.md` with UT scores, task completion rates, error rates, and satisfaction metrics
- Include the SUS (System Usability Scale) score if calculated

**If no usability testing data:**
- Output `user-research-report.md` without the UT section
- Note: "Usability testing not yet conducted. Recommend running usability tests before finalizing design specs."

### Step 3: Output

Delegate to `@writer` for the appropriate output file.

#### When UT data exists → `usability-report.md`
```markdown
# Usability Report — {product/feature}
**Date:** YYYY-MM-DD

## Executive Summary
{2-3 paragraph synthesis of all findings}

## Usability Testing Results
| Task | Completion Rate | Avg Time | Errors | Satisfaction |
|------|----------------|----------|--------|-------------|

## SUS Score
**Score:** {N}/100
**Interpretation:** {grade: A-F}

## Key Insights
1. {insight} — Evidence: {data point}
2. {insight} — Evidence: {data point}

## Recommendations
| Priority | Recommendation | Based On |
|----------|---------------|----------|
| P0 | {critical fix} | {data source} |
```

#### When no UT data → `user-research-report.md`
```markdown
# User Research Report — {product/feature}
**Date:** YYYY-MM-DD

## Executive Summary
{2-3 paragraph synthesis}

## Research Methods Used
| Method | Artifact | Key Finding |
|--------|----------|------------|

## Key Insights
1. {insight} — Source: {artifact}

## Open Questions
1. {question} — Recommended method: {research method}

## Recommendations for Next Phase
- Usability testing recommended before design finalization
```

## State machine integration
At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-research/{report-type}.md`
