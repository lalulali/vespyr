---
step: 5
name: Spike
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-04 completed
optional: true
---

# Step 5 — Spike

Investigate technical unknowns before committing to production code. This step is optional — skip if no unknowns or risks were identified in step 3b.

## Goal
De-risk the execution plan by prototyping, benchmarking, or researching identified unknowns. Produce a short findings document, not production code.

## Agent invocation
`@developer` (or `@tech-lead` for architecture-level unknowns):
- Explore the risky area — prototype, benchmark, research
- Time-box: 2-4 hours per spike item
- If solution is infeasible, flag immediately

## Output
Spike findings in `artifacts/output/04-planning/spike-findings.md`:
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
Spike reveals a fundamental infeasibility. Escalate to `@founder` for GO/PIVOT/KILL.

## Delegation
- Reads: @reader (codebase exploration if needed)
- Writes: @writer (spike-findings.md)
- Memory: @memory-controller (lessons, blockers, patterns)
