---
step: 5
name: Spike
prerequisites:
  - step-04 completed
optional: true
output_contract:
  citations: not-required
---

# Step 5 — Spike

Investigate technical unknowns before committing to production code. This step is optional — skip if no unknowns or risks were identified in step 3b.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 5`
## Goal
De-risk the execution plan by prototyping, benchmarking, or researching identified unknowns. Produce a short findings document, not production code.

## Agent invocation
`@developer` (or `@tech-lead` for architecture-level unknowns):
- Explore the risky area — prototype, benchmark, research
- Time-box: 2-4 hours per spike item
- If solution is infeasible, flag immediately

## Output
Spike findings in `artifacts/output/05-planning/spike-findings.md`:
- What was investigated
- Approach tried
- Result (feasible / needs workaround / infeasible)
- Recommendation
- Updated execution plan (if task estimates changed)

Persist findings:
- If infeasible: `@memory-controller write blockers-and-risks.md` with `[SPIKE]` domain tag
- If workaround found: `@memory-controller write lessons-learned.md` with `[SPIKE]` domain tag
- If pattern discovered: `@memory-controller write patterns-and-conventions.md` with `[SPIKE]` domain tag

## Halt condition
Spike reveals a fundamental infeasibility. Escalate to `@founder` for GO/RESHAPE/NO-GO.

## Delegation
- **Memory:** @memory-controller for lessons, blockers, patterns

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 5`
