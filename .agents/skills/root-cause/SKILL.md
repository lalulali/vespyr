---
name: root-cause
description: Guide root cause analysis using 5 Whys and Ishikawa/Fishbone diagrams. Use when you need to find why a problem exists before jumping to solutions.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Root Cause Analysis

Facilitates structured root cause discovery using Socratic techniques. Outputs to `artifacts/output/02-research/root-cause-analysis.md`.

## Persona delegation
This skill delegates to `@product-manager`. The pm facilitates the analysis using 5 Whys and Fishbone techniques. The skill provides structure; `@product-manager` provides the Socratic probing and synthesis.

## When to use
- "Why are users dropping off?"
- "What's causing this bug to keep recurring?"
- "Help me find the root cause of our low conversion"
- Before designing any solution

## Workflow

### Step 1: State the problem

Ask the user to state the problem in one sentence. Confirm: "Is this the problem, or a symptom of something deeper?"

### Step 2: 5 Whys

Starting from the problem statement, ask "Why?" iteratively (minimum 3, maximum 7 levels). Each answer becomes the next question's target. Stop when reaching a root cause that, if fixed, would prevent the problem from recurring.

### Step 3: Fishbone (Ishikawa) — optional

If multiple causal factors are suspected, map them across categories: People, Process, Technology, Environment, Data, Policy. For each category, ask: "What in this area contributes to the problem?"

### Step 4: Output

Delegate to `@writer` for `artifacts/output/02-research/root-cause-analysis.md`:

```markdown
# Root Cause Analysis — {problem}
**Date:** YYYY-MM-DD
**Method:** 5 Whys {+ Fishbone if used}

## Problem Statement
{one sentence}

## 5 Whys Chain
1. **Why?** {symptom}
   → {answer}
2. **Why?** {follow-up on answer}
   → {answer}
...continue to root cause

## Root Cause
{the deepest cause that, if addressed, prevents recurrence}

## Contributing Factors (Fishbone)
| Category | Factor | Impact |
|----------|--------|--------|

## Next Steps
- Root cause validated → load `/unpack-problem` or `/shape-up`
- Need more data → load `/explore-idea`
```

## State machine integration
At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-research/root-cause-analysis.md`
