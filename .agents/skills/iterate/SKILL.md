---
name: iterate
description: Post-launch feature iteration — analyze user data, prioritize improvements, ship incremental value. Use when the user says "improve this feature", "iterate based on the data", "what should we build next after launch", or invokes /iterate once the product is live.
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
---
# Iterate — Post-Launch Improvement Cycle

<!-- router-skill -->

## What this skill does

After a product launches, the work shifts from "develop it right" to "make it better." This skill handles the post-launch iteration cycle: analyze real user data, prioritize improvements, and ship incremental value in rapid cycles.

**Previous skill:** `launch` (product is live and monitored)
**Next skill:** Continue iterating, or load `retro` for process review.

## Halt conditions
Any one halts the cycle and escalates instead of looping:
- The same hypothesis is tested twice with no measurable movement — loop variance, not signal; escalate to `@product-manager` to re-scope
- An iteration would break backwards compatibility for existing users — halt; preserving live behavior outranks the improvement
- A change turns out to be architectural rather than additive — halt and route to `/design` for the architecture impact, then `/develop`; do not improvise a data-model change inside an iteration
- 5 iteration cycles have been consumed — `retro` is mandatory before continuing, not optional

## Done when
- `analytics-insights.md`, `iteration-backlog.md`, `iteration-spec.md`, `iteration-plan.md`, and `iteration-results.md` all exist
- The hypothesis has a recorded before/after measurement — an unmeasured iteration is not shipped, it is guessed
- A `[LESSON]` entry is written to `lessons-learned.md` via `@memory-controller`
- The next action is decided by the Step 6 gate (continue / re-scope / roll back / `retro`), not left implicit
- `@memory-controller session-write` has run

## Prerequisites

Before starting, verify:
- [ ] Product is live and accessible to users
- [ ] Post-launch monitoring period is complete (24-72 hours)
- [ ] `artifacts/output/06-launch/post-launch-report.md` exists

## Workflow steps

### Step 1: Gather Signal

Step file: `steps/step-01-gather-signal.md`

Invoke `@data-analyst` to collect and analyze post-launch data:
- Feature adoption metrics vs. PRD success criteria
- User behavior flows (funnel analysis, drop-off points)
- Error rates and support tickets related to the feature
- A/B test results (if any experiments are running)
- Qualitative feedback (reviews, support conversations, user interviews)

**Output:** `artifacts/output/07-iteration/analytics-insights.md` (Use template: `.agents/templates/quality/analytics-insights-template.md`)

### Step 2: Identify Opportunities

Step file: `steps/step-02-identify-opportunities.md`

Invoke `@product-manager` to synthesize insights into opportunities:
- Map data signals to user stories (new, modified, or deprioritized)
- Identify quick wins (high impact, low effort improvements)
- Identify strategic bets (larger investments with higher upside)
- Rank opportunities using RICE (Reach, Impact, Confidence, Effort)
- Determine what to iterate on vs. what to leave as-is

**Input:** `artifacts/output/07-iteration/analytics-insights.md`
**Output:** `artifacts/output/07-iteration/iteration-backlog.md` (Use template: `.agents/templates/planning/iteration-backlog-template.md`)

### Step 3: Design + Architecture Assessment (parallelizable)

Steps 3a and 3b can run **in parallel**.

#### Step 3a: Design Iteration ⟨parallel⟩

Step file: `steps/step-03a-design-iteration.md`
Invoke `@product-designer` to design improvements:
- Update user flows based on identified pain points
- Design A/B test variants (if applicable)
- Update interaction specs for modified features
- Document design rationale linking back to data signals

**Input:** `artifacts/output/07-iteration/iteration-backlog.md`
**Output:** `artifacts/output/07-iteration/iteration-spec.md` (Use template: `.agents/templates/product/product-spec-template.md` — see `## Cross-References` section for expected structure)

#### Step 3b: Architecture Impact Assessment ⟨parallel⟩

Step file: `steps/step-03b-architecture-impact.md`
Invoke `@architect` to assess:
- Does the iteration require architectural changes?
- Are there data model changes needed?
- Is the change additive or does it modify existing behavior?
- Flag any technical debt that should be addressed alongside

**Input:** `artifacts/output/07-iteration/iteration-backlog.md`
**Output:** `artifacts/output/07-iteration/iteration-adr.md` (only if architectural changes needed. Use template: `.agents/templates/architecture/adr-template.md`)

### Step 4: Plan and Execute

Step file: `steps/step-04-plan-execute.md`

Invoke `@tech-lead` to:
- Break iteration items into tasks (typically smaller than new features)
- Estimate effort based on existing velocity
- Sequence for fastest delivery (quick wins first)

Invoke `@product-manager` to:
- Fit iteration work into existing cadence
- Manage scope and timeline trade-offs
- Coordinate with any ongoing development work

Then execute the same dev loop from `develop`:
- `@developer` implements
- `@code-reviewer` reviews (max 2 review cycles)
- `@qa-engineer` validates (max 2 QA cycles)
- `@product-manager` verifies

**Output:** `artifacts/output/07-iteration/iteration-plan.md` (Use template: `.agents/templates/planning/execution-plan-template.md`)

### Step 5: Ship and Measure

Step file: `steps/step-05-ship-measure.md`

Invoke `@devops-engineer` to deploy the iteration.
Invoke `@data-analyst` to measure the impact:
- Compare metrics before and after iteration
- Validate that the change achieved its hypothesis
- Document lessons learned

Write results to memory:
```
@memory-controller write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @data-analyst]
{what the iteration achieved and what was learned}
**Status:** active
```

Write session summary:
```
@memory-controller session-write
Worked on: Iteration cycle — {what was improved}
Decisions made:
- {hypothesis tested}
- {result: positive/neutral/negative}
Next step: {continue iterating / load retro / load develop}
New blockers: {any issues, or "none"}
```

**Output:** `artifacts/output/07-iteration/iteration-results.md` (Use template: `.agents/templates/planning/iteration-results-template.md`)

### Step 6: Decide Next Action (gate)

Step file: `steps/step-06-decide-next.md`

Based on results:
- **Positive signal:** Continue iterating on adjacent improvements → back to Step 1
- **Neutral signal:** Revisit the hypothesis, consider larger redesign → back to Step 2
- **Negative signal:** Roll back if needed, reanalyze → back to Step 1 with new data
- **Feature stabilized:** Move on to next feature or load `retro`

**Iteration limit:** Maximum 5 iteration cycles before a mandatory `retro` to assess whether the iteration strategy is working. This prevents endless polish on a feature that may need a fundamentally different approach.

## Output artifacts
- `artifacts/output/07-iteration/analytics-insights.md`
- `artifacts/output/07-iteration/iteration-backlog.md`
- `artifacts/output/07-iteration/iteration-spec.md`
- `artifacts/output/07-iteration/iteration-plan.md`
- `artifacts/output/07-iteration/iteration-results.md`

## When to use
Use this when:
1. A feature has launched and you have real user data
2. You need to improve an existing feature based on analytics
3. You're running A/B tests and want to iterate on winners
4. You're addressing post-launch user feedback

## Key principles
- **Data-driven decisions.** Every iteration hypothesis must be measurable.
- **Small batches.** Ship small improvements frequently rather than large overhauls.
- **Preserve backwards compatibility.** Iterations modify live features — don't break existing users.
- **Close the loop.** Always measure the impact of what you shipped before moving on.

## Handoff
- Need to ship a completely new feature? → load `develop`
- Production incident? → load `incident`
- Want to review how the team is working? → load `retro`
- Hit 5 iteration cycles? → **mandatory** `retro` before continuing

---

## State Machine Integration

The pipeline state machine (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run:
```bash
node .agents/scripts/orchestrator_state.js status
```

The project should be in the development phase (or post-launch, depending on how your project is configured). If pipeline is uninitialized, run `init` first.

### At End — Record Completion

Record each iteration artifact:

```bash
node .agents/scripts/orchestrator_state.js complete --agent data-analyst --artifact 07-iteration/analytics-insights.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 07-iteration/iteration-backlog.md
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 07-iteration/iteration-spec.md
node .agents/scripts/orchestrator_state.js complete --agent architect --artifact 07-iteration/iteration-adr.md
node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact 07-iteration/iteration-plan.md
node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 07-iteration/iteration-results.md
```

Record only the artifacts actually produced. The `iteration-results.md` triggers an automatic code-graph refresh (because the producing agent is `developer`), so the next iteration's planning has a current dependency view.