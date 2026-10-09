---
name: jtbd
description: Formulate Jobs-to-be-Done statements and map How Might We opportunity questions in a single canvas. Use when the user says "what job is the user hiring this for", "turn the research into opportunities", "generate How Might We questions", or invokes /jtbd before ideation.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Jobs-to-be-Done + How Might We

## What this skill does

Formulates JTBD statements using the "When/I want to/so I can" template and maps HMW opportunity questions for each job. Outputs to `artifacts/output/02-research/jtbd-hmw.md`.

## Persona delegation
This skill delegates to `@user-researcher`. The user-researcher facilitates JTBD formulation and HMW mapping from human-gathered research data. The skill provides the template; `@user-researcher` provides the synthesis — and when no human data exists, the outputs are labeled hypotheses to validate (never observed findings).

## When to use
- "What job is the user hiring this product for?"
- "Turn our user research into actionable opportunities"
- "Generate How Might We questions from our findings"
- Before ideation or solution design

## Workflow

### Step 1: Identify the jobs

From research data (interviews, observations, analytics), identify the functional, emotional, and social jobs users are trying to accomplish. A job is stable over time — it exists whether or not your product exists.

### Step 2: Formulate JTBD statements

For each job, use the template:
> **When** {situation/context}, **I want to** {functional job}, **so I can** {emotional/social outcome}.

Rules:
- The "When" anchors the job in a real context (not "Whenever I feel like it")
- The "I want to" describes the functional action (not the solution)
- The "so I can" reveals the deeper motivation (emotional or social)

### Step 3: Generate HMW questions

For each JTBD, generate 1-3 How Might We questions. HMW questions:
- Are open-ended (not yes/no)
- Suggest a direction without prescribing a solution
- Reframe the job as an opportunity

Example: JTBD "When I'm running late for a meeting, I want to find the fastest route, so I can arrive without stress."
→ HMW: "How might we reduce the cognitive load of choosing a route under time pressure?"

### Step 4: Output

Write `artifacts/output/02-research/jtbd-hmw.md`:

```markdown
# Jobs-to-be-Done + HMW Canvas — {product/feature}
**Date:** YYYY-MM-DD
**Evidence basis:** {interviewed N / observed / analytics / support-tickets / survey / hypothesis — pick one, and label unvalidated content in the body}

## Job Stories
| # | When | I want to | So I can | Type |
|---|---------------|---------------------------|-------------------|------|
| 1 | {situation} | {action} | {motivation} | Functional/Emotional/Social |

## How Might We Opportunities
| JTBD # | HMW Question | Opportunity Size |
|--------|-------------|-----------------|
| 1 | How might we {opportunity}? | Large/Med/Small |

## Priority Matrix
| | High Impact | Low Impact |
|---|---|---|
| **Low Effort** | {quick wins} | {fill-ins} |
| **High Effort** | {strategic bets} | {money pits} |
```

## Done when — checked mechanically

These canvases shipped for the whole life of this repo with **no gate at all**: the template in the
Output step could be written to disk verbatim and nothing would notice. `discovery_canvas_check.js`
now checks form and evidence declaration:

```bash
node .agents/scripts/discovery_canvas_check.js check --kind jtbd --file artifacts/output/02-research/jtbd-hmw.md --json
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
**JTBD minimums:** at least one job statement with three substantive clauses; every job typed
Functional/Emotional/Social, without which the canvas collapses into a feature list; and at least one
How Might We row.

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/jtbd-hmw.md`
