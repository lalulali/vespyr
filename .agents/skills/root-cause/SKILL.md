---
name: root-cause
description: Guide root cause analysis using 5 Whys and Ishikawa/Fishbone diagrams. Use when you need to find why a problem exists before jumping to solutions.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Root Cause Analysis

## What this skill does

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

Write `artifacts/output/02-research/root-cause-analysis.md`:

```markdown
# Root Cause Analysis — {problem}
**Date:** YYYY-MM-DD
**Evidence basis:** {interviewed N / observed / analytics / support-tickets / survey / hypothesis — pick one, and label unvalidated content in the body}
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

## Done when — checked mechanically

These canvases shipped for the whole life of this repo with **no gate at all**: the template in the
Output step could be written to disk verbatim and nothing would notice. `discovery_canvas_check.js`
now checks form and evidence declaration:

```bash
node .agents/scripts/discovery_canvas_check.js check --kind root-cause --file artifacts/output/02-research/root-cause-analysis.md --json
```

It requires:
- **no unfilled template placeholders** — `{direct quotes}` and `{pain point}` are the template, not
  an artifact
- **`**Evidence basis:**` declared** — one of `interviewed` / `observed` / `analytics` /
  `support-tickets` / `survey` / `hypothesis`. A canvas that does not say where it came from cannot be
  read as research, and nothing downstream can tell your finding from your guess
- **when the basis is `hypothesis`, the body must say so too** — announced only in a header, a
  hypothesis reads as a finding three paragraphs later
- the kind's structural minimum, below

**A green result is not a research finding.** The gate checks form and one declaration. It cannot
tell you whether the analysis is correct, and it does not pretend to.

**Exit 0** conformant · **1** failures · **2** usage/IO error, fail-closed, never a silent pass.

Run this **before** the `complete` call below, so a non-conformant canvas is never recorded as
delivered.
**Root-cause minimums:** a 5-Whys chain of at least 3 levels; a Root Cause section stating an actual
*cause* — not "someone was careless", which is where 5 Whys classically stops; and a Validation
section saying how you would know.

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-research/root-cause-analysis.md`
