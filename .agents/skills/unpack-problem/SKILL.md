---
name: unpack-problem
description: Problem-first exploration before solution ideation — supports guided, automated, and combination modes. Facilitated by @product-manager and @user-researcher.
version: "2.0"
last_updated: 2026-07-20
---

# Unpack Problem — Tri-Modal Problem Exploration

A structured problem-exploration workspace. Unlike `/validate-idea` (which assumes you have an idea), `/unpack-problem` helps you explore the problem space before committing to any solution. Facilitated by `@product-manager` and `@user-researcher`.

## When to use

- "Users are dropping off at checkout step 2" — you have a problem, not a solution
- "Our conversion rate is low" — you need to understand why before deciding what to build
- "I know something is wrong but I'm not sure what to fix"
- Problem-first entry — no solution assumption allowed

## Primary personas
- `@product-manager` — owns problem framing, solution mapping, and handoff routing
- `@user-researcher` — owns user perspective simulation, empathy mapping, and journey analysis

## Mode selection

First, detect the user's intent:

- **Guided mode** → The agent acts as an interactive facilitator, asking probing questions step-by-step. Best for users who want to think deeply through the problem.
- **Automated mode** → The agent simulates user perspectives and auto-drafts all design thinking artifacts. Best for users who want rapid output to review.
- **Combination mode (default)** → The agent auto-drafts first, then leads structured review and refinement. Best for most users.

If unclear, present the three modes and ask.

## Harness adherence (non-negotiable)
- Follow the step sequence for the selected mode exactly. Do NOT skip steps.
- Step 01 enforces zero-solution framing. Do not let the user jump to "we should build X."
- Each step file is a contract. Read it fully before executing.

## Step sequence
1. **Problem Intake** → `steps/step-01-problem-intake.md` — intake pain points, enforce zero-solution framing
2. **Analysis Execution** → `steps/step-02-analysis-execution.md` — run or prompt modular sub-skills based on selected mode
3. **Synthesis & Ideation** → `steps/step-03-synthesis-ideation.md` — map problem findings to candidate solution concepts
4. **Brief Generation** → `steps/step-04-brief-generation.md` — write problem-space-brief.md, compile discovery report

## Output artifacts
- `artifacts/output/01-research/problem-space-brief.md` — structured problem definition
- `artifacts/output/01-research/root-cause-analysis.md` — root cause findings
- `artifacts/output/01-research/empathy-map.md` — user empathy canvas
- `artifacts/output/01-research/journey-map.md` — current-state journey
- `artifacts/output/01-research/jtbd-hmw.md` — jobs-to-be-done + how-might-we

## State machine integration
At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 01-research/problem-space-brief.md`

## Handoff routing
- Solution concept ready to test → load `/validate-idea`
- Structured brief ready for specs → load `/shape-up`
- Need market/competitor context → load `/explore-idea`
