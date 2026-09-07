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

Sharpening follows the shared contract `.agents/references/step-0-sharpening.md` (restate / fuzz ≤5 / emit / confirm — no manufactured ambiguity). Brainstorming-specific: the restated target names the output kind needed (ideas, risks, questions, alternatives); the confirmed statement drives method selection (passed as `--context`).

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
- **Specialist co-dispatch (mandatory on trigger):** if the sharpened topic touches AI/ML (ML model, LLM prompt, RAG, ML eval, inference, AI agent behavior), security (secrets, auth, PII, trust boundary), or performance (latency, inference/compute-at-scale cost, load), spawn the matching critique voice as a native subagent for Step 3 — `@ml-ai-engineer` (Kai) for AI/ML, `@security-engineer` (Victor) for security, `@performance-engineer` (Felix) for performance. Bare words (`model` as in data-model, `eval` as in generic evaluation, `cost` as in budget, `agent` as in support-agent workflow) do NOT trigger — the ML qualifier must be present. The specialist challenges outputs mid-method (failure modes, cost, eval design), it does not conduct. Founder remains conductor. Log the co-dispatch (`[CO-DISPATCH: @{seat} on {trigger}]`); a triggered-but-absent seat needs `[CO-DISPATCH-ABSENT: @{seat} — {one of: trigger-mentioned-but-out-of-scope | user-declined | solo-harness-no-subagents}]` in the session output, counted per rolling 10 alongside routing overrides.
- Degraded dispatch (no subagents available) follows the shared contract `.agents/references/degraded-mode-tiers.md` — same tiers, `--simulated` exception rule, and telemetry as round-table and elicitation.
- Walk through each step interactively
- Record outputs (ideas, decisions, open questions)
- Report "What this surfaced" in 2-3 bullets tied to the sharpened topic
- **Anti-sycophancy gate (SPC):** if every generated idea is positive or agreeable — zero tension, zero risk, zero rejected assumptions — the session has converged prematurely. Before recording, apply a forced inversion pass (e.g., Reverse Brainstorming on the top idea: how would it fail?) and record the results alongside. Uniformly rosy output is an engine failure, not a success. Every session MUST emit exactly one marker line before the Step-4 write: `[SPC: inversion-applied]` (inversion ran, results recorded) | `[SPC: rosy-absent — {quoted bullet id + rejected option | failure path | cost/risk tradeoff}]` (the cited bullet must contain a rejected option, an explicit failure path, or a quantified tradeoff — "risk: adoption may be slow" does not qualify; otherwise `inversion-applied` is mandatory) | `[SPC: skipped — {one of: user-explicit-override | fact-lookup-no-ideation | time-boxed-spike}]` (closed taxonomy; logged to the routing record; skips above ~20% over a rolling 10 sessions trigger the same revisit as routing overrides). A Step-4 write without the marker fails step completion.
- Synthesize into actionable next steps

### Step 4: Gate and write outputs

End the session with a Decision Gate on the strongest idea(s): `[GO]` (ready to stress-test), `[RESHAPE]` (promising but the mechanism needs rebuilding), or `[NO-GO]` (dominated by alternatives). A brainstorm that ends without a gate is a list, not a session.

### Step 4b: Route the gated idea (mandatory on GO/RESHAPE — do not menu)

The gate verdict locks FIRST — route from the locked verdict, never reshape the verdict to earn a panel. Then count distinct domain tensions in the "What this surfaced" bullets, quoting bullet ids (e.g. tensions from B1/B3):

- **`[GO]` + ≥2 tensions, or `[RESHAPE]` spanning ≥2 domains** → roundtable (Discovery roster). Emit exactly: *"Top idea gated [{verdict}]. Next: roundtable with {n} open tensions (from bullets {ids}: {a} vs {b}). Reply 'grill-me instead' to go deep 1-on-1, or 'proceed' to start the roundtable."*
- **`[GO]` single-bet, or `[RESHAPE]` confined to one domain (state the domain + reason)** → grill-me. Emit exactly: *"Top idea gated [{verdict}]. Next: grill-me on the single bet ({bet}). Reply 'roundtable instead' for a panel, or 'proceed' to start."*
- **`[NO-GO]`** → archive + ledger. No build or follow-up routing (Zero-Blueprint rule blocks building, not talking — the user may still ask why it failed or re-propose with new evidence).
- Cost is part of the choice, state it once: grill-me costs one interviewer call; roundtable costs 2–5 isolated seats plus cross-examination rounds (5–10× tokens and attention). Single-bet/reversible → grill-me; multi-stakeholder/irreversible → pay for the panel.
- Pass `artifacts/output/01-discovery/brainstorming-session.md` path + the sharpened topic as the subject in either case. Grill-me = one mind going deep (proposer's conviction); roundtable = N independent minds colliding (what no single persona can think).
- Log every override as `[ROUTING-OVERRIDE: default -> chosen -- reason]` in the session output and the `[BRAINSTORM]` memory entry (append-only routing record; owner `@tech-lead` counts markers per rolling 10 sessions alongside the router log). If overrides exceed ~20% over a rolling 10 sessions, the threshold rule gets revisited (recalibrate count vs kill default).

Write the session output — sharpened topic, method used, key ideas, gate verdict, open questions — to `artifacts/output/01-discovery/brainstorming-session.md`, then record to memory:

```
@memory-controller write active-decisions.md
### [BRAINSTORM] {method name} — {topic} [date: YYYY-MM-DD] [agent: @founder]
{synthesized outputs, key ideas, decisions, open questions}
Gate: {GO/RESHAPE/NO-GO} on {strongest idea}
**Status:** active
```

## Output artifacts

- Session output written to `artifacts/output/01-discovery/brainstorming-session.md`
- Ideas and decisions written to `artifacts/memory/active-decisions.md`
- Brainstorming feeds into subsequent skills (`/validate-idea`, `/shape-up`, `/design`, `/round-table` and `/grill-me` via Step 4b routing)

## State machine integration

At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/brainstorming-session.md`

## Handoff

- Ideas ready for testing → load `/validate-idea`
- Semi-structured plan → load `/shape-up`
- Need market context → load `/explore-idea`
- Stress-test a GO/RESHAPE idea with a panel → Step 4b routes to `/round-table` (multi-tension) or `/grill-me` (single-bet)
