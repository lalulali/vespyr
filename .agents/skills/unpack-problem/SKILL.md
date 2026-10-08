---
name: unpack-problem
description: Problem-first exploration before any solution ideation — guided, automated, or combination modes, facilitated by @product-manager and @user-researcher. Use when the user says "users are dropping off", "something is wrong but I do not know what", "help me figure out what is broken", "why is conversion low", or invokes /unpack-problem. Produces a solution-free problem statement, root cause, empathy map, journey map, and JTBD, then gates the candidate solution concept. Do NOT use when the user already has a concept to stress-test (/validate-idea), wants only a 5-Whys on one known cause (/root-cause), is triaging a live production failure (/incident), or wants research designed rather than a problem framed (/research-plan).
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---
# Unpack Problem — Tri-Modal Problem Exploration

<!-- router-skill -->

A structured problem-exploration workspace. Unlike `/validate-idea` (which assumes you have an idea), `/unpack-problem` helps you explore the problem space before committing to any solution. Facilitated by `@product-manager` and `@user-researcher`.

## When to use

- "Users are dropping off at checkout step 2" — you have a problem, not a solution
- "Our conversion rate is low" — you need to understand why before deciding what to build
- "I know something is wrong but I'm not sure what to fix"
- Problem-first entry — no solution assumption allowed

## Primary personas
- `@product-manager` — owns problem framing, solution mapping, and handoff routing
- `@user-researcher` — owns user perspective simulation, empathy mapping, and journey analysis

## Mode selection

First, detect the user's intent:

- **Guided mode** → The agent acts as an interactive facilitator, asking probing questions step-by-step. Best for users who want to think deeply through the problem.
- **Automated mode** → The agent drafts all design thinking artifacts from simulated user perspectives. Best for users who want rapid output to review.
- **Combination mode (default)** → The agent auto-drafts first, then leads structured review and refinement. Best for most users.

If unclear, present the three modes and ask.

## Simulated perspectives are hypotheses, never evidence

Automated/combination modes draft empathy maps, journeys, and JTBD from *simulated* user perspectives. These are hypotheses to validate with real users — never present them as evidence. Every simulated artifact carries the `[AUTO-DRAFT: ...]` label (see step-02's dispatch ladder) plus its riskiest assumption, and multi-perspective drafting follows the dispatch ladder in `steps/step-02-analysis-execution.md` instead of roleplaying all segments in one context.

## Halt conditions
- The user proposes a solution before the problem is framed -> halt. Step 01 enforces zero-solution framing; a jumped-to "we should build X" is a solution in search of a problem and must be sent back to the problem statement
- A simulated (auto-drafted) artifact is about to be presented as evidence -> halt. **Every tier simulates** — native subagents, firewalled calls, and single-context all produce simulated perspectives — so `[AUTO-DRAFT: …]` is required on all of them, with the reason recorded per tier (see `steps/step-02-analysis-execution.md`).
- The dispatch ladder is unavailable and multi-perspective drafting would collapse into one shared context -> halt or explicitly mark the output degraded; never silently roleplay all segments in one context
- No solution concept survives the Step 03 mapping -> the brief ends `VERDICT: [NO-GO]`; do not manufacture a candidate to satisfy the handoff

## Done when
- `artifacts/output/02-research/problem-space-brief.md` exists and ends with a plain sentence plus a bracketed gate line **in the document** — `VERDICT: [RESHAPE]` / `VERDICT: [NO-GO]`, or `VERDICT: [GO] — When: <NOW|GATED|NEXT-CYCLE>` — a brief without a gate is a document, not a decision. Never the unbracketed `[GATE: GO|…]` spelling, and never in the chat reply.
- The problem statement, root cause, JTBD, and HMW questions are all present and mutually consistent
- All four analysis artifacts (`root-cause-analysis.md`, `empathy-map.md`, `journey-map.md`, `jtbd-hmw.md`) exist and each matches its shape contract in `steps/step-02-analysis-execution.md` §Artifact shape contracts
- Every simulated artifact carries its `[AUTO-DRAFT: …]` label — **on every dispatch tier**, since all tiers simulate — and names its riskiest assumption; guided-mode artifacts are `[USER-SOURCED: …]` or labelled
- The handoff routing names the next skill and the artifact it consumes
- `@memory-controller session-write` has run

## Harness adherence (non-negotiable)
- Follow the step sequence for the selected mode exactly. Do NOT skip steps.
- Step 01 enforces zero-solution framing. Do not let the user jump to "we should build X."
- Each step file is a contract. Read it fully before executing.

## Step sequence
0. **Scope & Decision Anchoring** (non-skippable gate) → `steps/step-00-scope-and-decision-anchoring.md` — `step_tracker.js` exits 1 if Step 1 begins without a locked track. Intent triage at gate: Clear (C ≥ 0.85) runs the locked track; Ambiguous (0.50–0.85) halts to a 2–3 Track Fork; Trivial (C < 0.50) executes directly. Gate enforced in all `step_tracking` modes including `off` (DNA 4).
1. **Problem Intake** → `steps/step-01-problem-intake.md` — intake pain points, enforce zero-solution framing
2. **Analysis Execution** → `steps/step-02-analysis-execution.md` — run or prompt modular sub-skills based on selected mode
3. **Synthesis & Ideation** → `steps/step-03-synthesis-ideation.md` — map problem findings to candidate solution concepts
4. **Brief Generation** → `steps/step-04-brief-generation.md` — write problem-space-brief.md (the discovery report is compiled separately by `/discovery-report` when the user wants a unified report)

## Output artifacts

These are the **document** surface — the machine record lives here, and the gates read these files.

- `artifacts/output/02-research/problem-space-brief.md` — structured problem definition (template: `.agents/templates/discovery/problem-brief.md`)
- `artifacts/output/02-research/root-cause-analysis.md` — root cause findings
- `artifacts/output/02-research/empathy-map.md` — user empathy canvas
- `artifacts/output/02-research/journey-map.md` — current-state journey
- `artifacts/output/02-research/jtbd-hmw.md` — jobs-to-be-done + how-might-we (template: `.agents/templates/discovery/jtbd-hmw.md`)

Only two of the five ship a template. The other three follow the shape contracts declared in
`steps/step-02-analysis-execution.md` §Artifact shape contracts — that is the rule: **an artifact has
either a cited template or a declared inline shape**, never neither.

**The chat reply is a different surface and carries human wording only.** State what the problem is and
whether it is worth solving, in a sentence, plus the next action — then name the brief. Never put
`VERDICT:`, `[GO]`/`[RESHAPE]`/`[NO-GO]`, or any card field in the chat
(`.agents/references/vespyr-dna.md` §Two surfaces).

## State machine integration
At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-research/problem-space-brief.md`

## Memory integration
**At start:** Load context before problem intake:
```
@memory-controller load product-manager [unpack-problem — {problem description}]
```

**At step-04 (brief generation):** Write session summary — mandatory:
```
@memory-controller session-write [agent: @product-manager]
Worked on: Problem space exploration — {problem description}
Decisions: {key problem framing decisions, root causes identified, candidate solutions mapped}
Next step: {validate-idea / shape-up / explore-idea — whichever handoff routing applies}
Blockers: {unresolved problem areas or "none"}
```

## Handoff routing

The brief ends with a Decision Gate on the selected solution concept — **plain sentence first**, then `VERDICT: [RESHAPE]` / `VERDICT: [NO-GO]` (or `VERDICT: [GO] — When: <NOW|GATED|NEXT-CYCLE>`), never the unbracketed `[GATE: GO|…]` form (protocol in `steps/step-04-brief-generation.md`). A brief without a gate is a document, not a decision.

- Solution concept ready to test → load `/validate-idea`
- Structured brief ready for specs → load `/shape-up`
- Need market/competitor context → load `/explore-idea`

