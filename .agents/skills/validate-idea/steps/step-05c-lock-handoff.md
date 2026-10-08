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
1. Append the `## Socratic validation` section defined in
   `.agents/templates/discovery/validation-brief-template.md` — the per-branch 🟢/🟡/🔴 scorecard
   table, cross-branch contradictions found and how each was resolved, and the bracketed verdict
   disposition. Use the template section verbatim; do not invent a parallel shape.

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
- Brief affirmed → continue the pipeline from where it was (`explore-idea` for `[GO]`, re-run `validate-idea` for `[RESHAPE]`, `/unpack-problem` for `[NO-GO]`)
- Brief revised → the revised verdict determines routing
- Irreconcilable contradiction → **do not escalate to `@founder`**; `@founder` already owns this
  session, so that is a circular hand-back. Record the contradiction as a blocker in
  `active-decisions.md` with both branches quoted, leave the verdict at `[RESHAPE]` with the
  contradiction named as the reason, and route scope arbitration to `@product-manager` per
  `.agents/workflow.md` §3.2.

## Done when
- Socratic validation section appended to brief
- All branch decisions in active-decisions.md
- Session-write complete
- Pipeline state updated

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-validate --step 5`
