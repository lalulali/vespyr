---
name: brainstorming
description: Select and apply brainstorming methods from a 60-method catalog — SCAMPER, Six Thinking Hats, Starbursting, and more
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Brainstorming — Method Selection & Execution

## What this skill does

Searches the 60-method brainstorming catalog (`methods.csv`) and applies the best-fit method to the user's problem. The agent acts as a facilitated brainstorming session conductor, not a passive method recommender.

## Persona delegation

This skill delegates to `@founder`. The founder conducts the brainstorming session using the selected method. The skill file provides the method catalog and selection logic; `@founder` provides the Socratic depth, challenge stance, and structured reasoning.

## When to use

- "Help me brainstorm ideas for..."
- "What brainstorming method should I use?"
- "Run a Six Thinking Hats session on my idea"
- Creative ideation before committing to a solution concept

## Workflow

### Step 1: Sharpen the topic (before any method)

A brainstorm on a vague topic produces vague ideas. Before selecting a method:

1. **Restate the target** — one sentence: what are we brainstorming, and what kind of output does the user need (ideas, risks, questions, alternatives)?
2. **Surface the fuzz** — what is ambiguous, unstated, or assumed (max 5 concrete bullets: missing constraints, undefined success term, hidden audience)?
3. **Emit the sharpened topic** — one precise sentence with explicit in/out-of-scope boundaries. If the topic is already precise, say so and move on — do not manufacture ambiguity.
4. **Confirm with the user** — present the sharpened topic and wait for confirmation or edit. Only the confirmed statement drives method selection (pass it as `--context`).

### Step 2: Select method

Run:

```bash
node .agents/scripts/match_methods.js --source brainstorming --context "{sharpened topic}"
```

Return the best-matching methods with relevance scores (up to 5; fewer if the catalog match is narrow), each with a one-line *why matched* tied to the sharpened topic. Recommend the best one with reasoning. Let the user choose or accept the recommendation.

### Step 3: Execute the method

Load the selected method from `methods.csv`. Apply it step-by-step:
- Announce in 1-2 lines why this method fits the sharpened topic and what it will test
- Explain the method's structure
- Walk through each step interactively
- Record outputs (ideas, decisions, open questions)
- Report "What this surfaced" in 2-3 bullets tied to the sharpened topic
- **Anti-sycophancy gate (SPC):** if every generated idea is positive or agreeable — zero tension, zero risk, zero rejected assumptions — the session has converged prematurely. Before recording, apply a forced inversion pass (e.g., Reverse Brainstorming on the top idea: how would it fail?) and record the results alongside. Uniformly rosy output is an engine failure, not a success.
- Synthesize into actionable next steps

### Step 4: Gate and write outputs

End the session with a Decision Gate on the strongest idea(s): `[PASS]` (ready to stress-test), `[PIVOT]` (promising but needs reshaping), or `[KILL]` (dominated by alternatives). A brainstorm that ends without a gate is a list, not a session.

Write the session output — sharpened topic, method used, key ideas, gate verdict, open questions — to `artifacts/output/01-discovery/brainstorming-session.md`, then record to memory:

```
@memory-controller write active-decisions.md
### [BRAINSTORM] {method name} — {topic} [date: YYYY-MM-DD] [agent: @founder]
{synthesized outputs, key ideas, decisions, open questions}
Gate: {PASS/PIVOT/KILL} on {strongest idea}
**Status:** active
```

## Output artifacts

- Session output written to `artifacts/output/01-discovery/brainstorming-session.md`
- Ideas and decisions written to `artifacts/memory/active-decisions.md`
- Brainstorming feeds into subsequent skills (`/validate-idea`, `/shape-up`, `/design`)

## State machine integration

At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/brainstorming-session.md`

## Handoff

- Ideas ready for testing → load `/validate-idea`
- Semi-structured plan → load `/shape-up`
- Need market context → load `/explore-idea`
