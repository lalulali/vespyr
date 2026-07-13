---
name: validate-idea
description: Stress-test product concepts before research. Supports create/edit/validate modes.
---

# Validate Idea

## Mode selection
First, detect the user's intent:
- **Create mode** → no `artifacts/output/00-discovery/idea-brief.md` exists
- **Edit mode** → brief exists, user wants to refine it
- **Validate mode** → brief exists, user wants to stress-test it (this is the Socratic mode)

If unclear, ask: "Are you starting a new idea, refining an existing brief, or stress-testing it?"

## Mode routing + steps
- **Create** → `steps-create/01-session-setup.md` → ... → `07-handoff.md` (7 steps: session setup, input analysis, idea framing, stress-test R1, stress-test R2, GO/PIVOT/KILL, handoff)
- **Edit** → `steps-edit/01-load-existing.md` → ... → `05-finalize.md` (5 steps: load, identify gaps, revise, stress-test, finalize)
- **Validate** → `steps-validate/01-open-questions.md` → ... → `05-lock-handoff.md` (5 steps: open questions, 7-branch tree, cross-branch check, decision log, lock & handoff)

## Prerequisites
- Create mode: none (this is the entry point)
- Edit mode: `artifacts/output/00-discovery/idea-brief.md` exists
- Validate mode: `artifacts/output/00-discovery/idea-brief.md` exists

## Halt conditions
- @founder issues KILL verdict (create mode)
- Cross-branch contradiction unresolved (validate mode)
- 2 edit cycles without convergence (edit mode)

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At end: `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/idea-brief.md`

## Done when
- Brief written to `artifacts/output/00-discovery/idea-brief.md`
- Verdict recorded (GO / PIVOT / KILL)
- Handoff to next phase is unambiguous
