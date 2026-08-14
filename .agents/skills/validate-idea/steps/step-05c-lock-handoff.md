---
step: 5c
name: Lock & Handoff
mode: validate
prerequisites:
  - step-04 completed
output_contract:
  citations: not-required
---

# Step 5 — Lock & Handoff

Lock the brief and hand off. The validation session is complete.

## Goal
Finalize the brief with the Socratic findings, update the state machine, write session memory, and route to the next step.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-validate --step 5`
1. Append a "## Socratic Validation" section to the brief with:
   - 7-branch scorecard summary
   - Cross-branch contradictions found and resolved
   - Verdict reaffirmation or revision
   - Open questions that remain

2. Lock the brief: `artifacts/output/01-discovery/validation-brief.md` is now the canonical record.

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/validation-brief.md
```

## Memory closeout
- `@memory-controller write lessons-learned.md` — capture validation insights, patterns, and Socratic techniques that worked well.
- `@memory-controller write active-decisions.md` — ensure all branch decisions are persisted (continued from step 04).
- `@memory-controller session-write` — summarize the validation session: what was validated, key decisions, next step, unresolved gaps.

## Handoff routing
- Brief affirmed → continue the pipeline from where it was (explore-idea for GO, re-run validate-idea for PIVOT).
- Brief revised → the revised verdict determines routing.
- Irreconcilable contradiction found → escalate to `@founder` for executive decision.

## Done when
- Socratic validation section appended to brief
- All branch decisions in active-decisions.md
- Session-write complete
- Pipeline state updated

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-validate --step 5`
