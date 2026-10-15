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

## Known limits — recorded where a reviewer can read them

Blind run 9 deleted this gate's causal-keyword requirement, on the owner's ruling. It is recorded here
rather than in the checker, because a limit written in `.agents/scripts/` is invisible to a blind
reviewer, who is forbidden to open that directory. A documented limit nobody can read is not a
documented limit.

**What was deleted:** the requirement that the `## Root Cause` section contain one of a fixed list of
causal connectives (`because`, `caused by`, `driven by`, …).

**Why it was deleted, measured rather than argued.** Across three blind runs it failed in both
directions at once:

| Direction | Measured |
|---|---|
| Rejected honest work | **19 of 19** root causes in ordinary English, using `causes`, `allows`, `enables`, `prevents`, `drives`, `thus`, `consequently`, `thereby`, `gives rise to`, `is the mechanism that`, `is the reason` |
| Accepted non-causes | `blah so blah` passed as a root cause, alongside tautologies, symptoms, and goals |

Its own error text named the vocabulary it required, which was the defect stated by the gate.

**What this gate now checks, all of it mechanical:** the 5 Whys chain exists and reaches a depth of 3
(or the declared floor); the `## Root Cause` section exists; the root cause does not stop at blame; a
`## Validation` section states how the cause would be confirmed.

**What it does NOT check, and what a reviewer must therefore do:** whether the stated root cause is a
cause at all rather than a symptom, a goal, or a restatement. **This is the single most important
judgement in a root-cause analysis and no check here performs it.** Read the `## Root Cause` section
yourself before acting on it.

**What the gate will now pass that it should not:** a document whose `## Root Cause` section names no
cause whatsoever. That is the cost of the deletion, accepted because the rejected-cost was 19 of 19
honest documents.

**A second known limit, recorded rather than closed.** The blame guard matches MANNER WORDS only
("careless", "not careful", "human error", "negligence"). Run 9 measured it missing 21 of 25 real
blame terminations, and giving opposite verdicts to identical content depending on where the blame
sat. A structural rewrite — check the agent and the act rather than the pejorative — caught the five
missed phrasings, and was **reverted in the same session** because it regressed a case runs 8 and 9
had verified passing. The gap is pinned by a test that asserts the phrasings are missed, so it cannot
quietly become worse:

| Blame phrasing | Caught |
|---|---|
| "someone was careless" | **Yes** |
| "human error" | **Yes** |
| "someone forgot to run the smoke test" | **No** |
| "the process was sloppy" | **No** |
| "a designer made an error" | **No** |
| "the developer neglected the check" | **No** |

Nothing here reads a `## Root Cause` section's judgement — **read it yourself before acting on it.**

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-research/root-cause-analysis.md`
