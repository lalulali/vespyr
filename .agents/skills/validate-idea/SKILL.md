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
- **Create mode** → neither `artifacts/output/01-discovery/idea-brief.md` nor `validation-brief.md` exists
- **Edit mode** → a brief exists (either file), user wants to refine it
- **Validate mode** → a brief exists (either file), user wants to stress-test it (this is the Socratic mode)

If unclear, ask: "Are you starting a new idea, refining an existing brief, or stress-testing it?"

## Mode routing + steps
**Step 0 — Scope Gate (non-skippable):** anchor scope first via `steps/step-00-scope-and-decision-anchoring.md`; the selected mode is the locked track. `step_tracker.js` exits 1 if Step 1 begins without a locked track.

- **Create** → `steps/step-01a-session-setup.md` → ... → `steps/step-07a-handoff.md` (7 steps: session setup, input analysis, idea framing, stress-test R1, stress-test R2, GO/PIVOT/KILL, handoff)
- **Edit** → `steps/step-01b-load-existing.md` → ... → `steps/step-05b-finalize.md` (5 steps: load, identify gaps, revise, stress-test, finalize)
- **Validate** → `steps/step-01c-open-questions.md` → ... → `steps/step-05c-lock-handoff.md` (5 steps: open questions, 7-branch tree, cross-branch check, decision log, lock & handoff)

## Prerequisites
- Create mode: none (this is the entry point)
- Edit mode: `artifacts/output/01-discovery/idea-brief.md` or `validation-brief.md` exists
- Validate mode: `artifacts/output/01-discovery/idea-brief.md` or `validation-brief.md` exists
- Problem-first entry: `artifacts/output/02-research/problem-space-brief.md` from `/unpack-problem` is accepted as equivalent to `idea-brief.md` for create mode — the problem brief becomes the idea to validate

## Halt conditions
- @founder issues KILL verdict (create mode)
- Cross-branch contradiction unresolved (validate mode)
- Revision-round limits without convergence (edit mode): per-section rounds per `steps/step-03b-revise.md`, stress-test resolution rounds per `steps/step-04b-stress-test.md`

## Anti-sycophancy gate (SPC)
If the user's answers across a stress-test round are uniformly positive — every push lands a confident answer, no red flags surface, no assumption cracks — do not proceed to the next round or verdict on momentum. Inject one adversarial question built from the strongest counter-hypothesis the answers imply (e.g., "Everything you've said says this should already exist — why doesn't it?"). If the answer survives, record it as validated evidence; if it cracks, that crack is the finding. A stress-test with zero friction has tested nothing. The step files apply this gate at their checkpoints (step-04a, step-04b, step-05a).

## State machine integration
At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/validation-brief.md` (create mode records `01-discovery/idea-brief.md` first — see `steps/step-07a-handoff.md`)

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
- Brief written to `artifacts/output/01-discovery/idea-brief.md` (create mode, pre-validation) and/or `artifacts/output/01-discovery/validation-brief.md` (canonical output — see `steps/step-07a-handoff.md`)
- Verdict recorded (GO / PIVOT / KILL)
- Handoff to next phase is unambiguous
