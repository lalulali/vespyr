---
name: discovery-report
description: Compile design thinking and research outputs into a unified report with dynamic usability testing scoring. Use when the user says "compile everything we learned", "pull the research into one report", "write the discovery report", or invokes /discovery-report before presenting findings to stakeholders.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Discovery Report

## What this skill does

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
- Output `user-research-report.md` without the UT sections — but keep Research Methods Used and Open Questions (see Step 3)
- Note: "Usability testing not yet conducted. Recommend running usability tests before finalizing design specs."

### Step 3: Output

Write the appropriate output file, following the canonical template:

**`.agents/templates/discovery/discovery-report.md`**

That template is the single source of truth for the report shape. Do not inline a copy here — a copy drifts, and a drifted copy is how a report ends up shipping without its methods or its open questions.

The template handles both branches; you choose the output filename and drop the sections that have no data:

| Situation | Output file | Template sections to include |
|---|---|---|
| UT data exists | `artifacts/output/02-research/usability-report.md` | All of them, including `## Usability Testing Results (if available)` and `## SUS Score (if available)`. Title: "Usability Report" |
| No UT data | `artifacts/output/02-research/user-research-report.md` | Omit both UT sections. Keep `## Research Methods Used` and `## Open Questions` — they are what makes the report reviewable. Title: "User Research Report" |

**Never drop `## Research Methods Used` or `## Open Questions` because there is no UT data.** They are the provenance and the unresolved-questions record; a report without them cannot be challenged, only believed. When no UT data exists, add this line under Recommendations rather than removing a section:

> Usability testing not yet conducted. Recommend running usability tests before finalizing design specs.

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-research/{report-type}.md`
