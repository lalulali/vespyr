---
name: jtbd
description: Formulate Jobs-to-be-Done statements and map How Might We opportunity questions in a single canvas
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Jobs-to-be-Done + How Might We

Formulates JTBD statements using the "When/I want to/so I can" template and maps HMW opportunity questions for each job. Outputs to `artifacts/output/02-research/jtbd-hmw.md`.

## Persona delegation
This skill delegates to `@product-manager`. The pm facilitates JTBD formulation and HMW mapping. The skill provides the template; `@product-manager` provides the product thinking and prioritization.

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

## Job Stories
| # | When {context} | I want to {functional job} | So I can {outcome} | Type |
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

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-research/jtbd-hmw.md`
