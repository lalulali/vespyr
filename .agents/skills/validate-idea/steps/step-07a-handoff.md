---
step: 7a
name: Handoff
mode: create
prerequisites:
  - step-06 completed
output_contract:
  citations: not-required
---

# Step 7 — Handoff

Write the validation brief and hand off to the next phase.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 7`
## Output
`artifacts/output/01-discovery/validation-brief.md` — use template `.agents/templates/discovery/validation-brief-template.md`

Include: context mode, problem statement, proposed solution, target user, Q1-Q7 responses, value proposition, premises, framework scores, alternatives, verdict, next action.

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/validation-brief.md
```

If the user chose to skip validation and go straight to exploration (producing `idea-brief.md` instead):
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/idea-brief.md
```

## Memory closeout
`@memory-controller write active-decisions.md` — persist the verdict and key premises.
`@memory-controller session-write` — summarize decisions, next step, blockers.

## Handoff routing
- **GO** → load `explore-idea`. The validation brief feeds into research. Research agents focus on the open questions listed in the brief.
- **RESHAPE** → re-run `validate-idea` with the revised framing.
- **NO-GO** → stop. The brief documents why. Revisit only if new evidence emerges.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 7`
