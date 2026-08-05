---
name: validation-patterns
description: Apply validation methods from a 30-method catalog — smoke tests, concierge MVPs, five-second tests, and more
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Validation Patterns — Method Selection & Execution

## What this skill does

Searches the 30-method validation catalog (`methods.csv`) and applies the best-fit validation pattern to test a product hypothesis before building. Covers smoke tests, concierge MVPs, customer discovery interviews, A/B test design, and more.

## Persona delegation

This skill delegates to `@founder`. The founder selects and executes the validation method. The skill file provides the method catalog and selection logic; `@founder` provides the GO/PIVOT/KILL judgment, challenge stance, and decision logging.

## When to use

- "How should I validate this idea?"
- "What's the cheapest way to test demand?"
- "Run a smoke test on my concept"
- Pre-build validation before committing engineering resources

## Workflow

### Step 1: Understand the hypothesis

Ask the user: what are you trying to validate? What's the hypothesis? What would count as validation vs. invalidation?

### Step 2: Select method

Delegate to `@executor`:

```bash
node .agents/scripts/match_methods.js --source validation --context "{user's hypothesis}"
```

Return the top 3-5 matching methods with relevance scores. Recommend the best one with reasoning. Let the user choose or accept the recommendation.

### Step 3: Design the validation

Load the selected method from `methods.csv`. Design the validation:
- Define the test (what will you do?)
- Define the signal (what result validates the hypothesis?)
- Define the duration and sample size
- Identify confounds and edge cases

### Step 4: Execute and record

Guide the user through execution. Record results:

```
@memory-controller write active-decisions.md
### [VALIDATION] {method name} — {hypothesis} [date: YYYY-MM-DD] [agent: @founder]
{method used, test design, results, verdict}
**Status:** active
```

## Output artifacts

- Validation design and results written to `artifacts/memory/active-decisions.md`
- If the validation produces a structured output (survey results, A/B data), delegate to `@writer` for `artifacts/output/02-research/validation-results.md`

## State machine integration

At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact validation-results`

## Handoff

- Hypothesis validated → load `/shape-up` or `/design`
- Hypothesis invalidated → load `/validate-idea` (re-scope)
- Need more research → load `/explore-idea`
