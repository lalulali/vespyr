---
name: validate-idea
description: Stress-test product concepts before research. Supports create/edit/validate modes.
metadata:
  version: "1.0"
---

# Validate Idea

## Harness adherence (non-negotiable)
- Follow the step sequence for the selected mode exactly. Do NOT skip steps or reorder them.
- Each step file is a contract. Read it fully before executing. Step files override general guidelines.
- Mode detection is automatic. The router decides create/edit/validate. Do NOT ask the user which mode unless the intent is genuinely ambiguous.

## Mode selection
First, detect the user's intent:
- **Create mode** → no `artifacts/output/01-discovery/idea-brief.md` exists
- **Edit mode** → brief exists, user wants to refine it
- **Validate mode** → brief exists, user wants to stress-test it (this is the Socratic mode)

If unclear, ask: "Are you starting a new idea, refining an existing brief, or stress-testing it?"

## Mode routing + steps
- **Create** → `steps-create/01-session-setup.md` → ... → `07-handoff.md` (7 steps: session setup, input analysis, idea framing, stress-test R1, stress-test R2, GO/PIVOT/KILL, handoff)
- **Edit** → `steps-edit/01-load-existing.md` → ... → `05-finalize.md` (5 steps: load, identify gaps, revise, stress-test, finalize)
- **Validate** → `steps-validate/01-open-questions.md` → ... → `05-lock-handoff.md` (5 steps: open questions, 7-branch tree, cross-branch check, decision log, lock & handoff)

## Prerequisites
- Create mode: none (this is the entry point)
- Edit mode: `artifacts/output/01-discovery/idea-brief.md` exists
- Validate mode: `artifacts/output/01-discovery/idea-brief.md` exists
- Problem-first entry: `artifacts/output/02-research/problem-space-brief.md` from `/unpack-problem` is accepted as equivalent to `idea-brief.md` for create mode — the problem brief becomes the idea to validate

## Halt conditions
- @founder issues KILL verdict (create mode)
- Cross-branch contradiction unresolved (validate mode)
- 2 edit cycles without convergence (edit mode)

## State machine integration
At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/idea-brief.md`

## Memory integration
**At start:** Load founder context before any Socratic analysis:
```
@memory-controller load founder [validate-idea — {idea name}]
```

**At completion:** Write verdict and rationale to memory, then session summary — mandatory:
```
@memory-controller write active-decisions.md
### [PRODUCT] Idea validation verdict — {idea name} [date: YYYY-MM-DD] [agent: @founder]
Verdict: GO / PIVOT / KILL
Rationale: {1-2 sentences on why}
Key assumptions validated: {list}
**Status:** active

@memory-controller session-write [agent: @founder]
Worked on: Idea validation — {idea name}
Decisions: Verdict: {GO/PIVOT/KILL}. {key rationale}
Next step: {explore-idea if GO, pivot brief if PIVOT, stop if KILL}
Blockers: {unresolved assumptions or "none"}
```

## Done when
- Brief written to `artifacts/output/01-discovery/idea-brief.md`
- Verdict recorded (GO / PIVOT / KILL)
- Handoff to next phase is unambiguous
