---
step: 10
name: Completion
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-09 completed
---

# Step 10 — Completion

Record completion, update state, and advance the phase.

## Goal
Finalize the development cycle: verify all completion criteria, write the state, and hand off to the next phase.

## Process
1. Confirm all completion criteria are met:
   - All tasks in execution plan are complete
   - Code review passes with no blocking issues
   - QA validates all acceptance criteria pass (AC-H, AC-U, AC-E)
   - PM signs off on the feature
   - Documentation is updated
   - Security audit passes (if applicable — zero Critical/High)
   - Performance benchmarks within SLAs (if applicable)
2. Write final `stepsCompleted` to `artifacts/output/05-execution/develop-state.md`.
3. Run `node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 05-execution/{feature}.md`.
4. Run `node .agents/scripts/orchestrator_state.js next` — confirm phase advances to quality.

## Memory closeout (mandatory per GUARDRAILS §Session Continuity)

1. `@memory-controller write lessons-learned.md` — capture patterns discovered, pitfalls encountered, bugs fixed during this cycle. Include `[DEV]` domain tag, date, and agent attribution.

2. `@memory-controller write active-decisions.md` — persist key architectural and process decisions made during development. Include `[ARCH]`, `[PLAN]`, or `[DEV]` domain tags.

3. `@memory-controller write blockers-and-risks.md` — log any unresolved blockers, known issues, or risks carried forward.

4. `@memory-controller session-write`:
   ```
   worked on: [feature implementation — {feature name}]
   decisions: [list up to 5 key decisions made during this cycle]
   next step: load launch skill or restart develop for next feature
   blockers: [list any unresolved blockers]
   ```

5. `@memory-controller status` — report memory file health.

## Handoff
- Feature ready to ship → load `launch` skill
- Need to build another feature → restart this skill
- Production incident → load `incident` skill

## Delegation
- Writes: @writer (develop-state.md)
- Runs: @executor (orchestrator_state.js complete, orchestrator_state.js next)
- Memory: @memory-controller (lessons, decisions, blockers, session-write)
