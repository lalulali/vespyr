---
name: self-learning
description: Promote recurring lessons into house-style instincts. Use when the user says "what have we learned", "promote this pattern", "review patterns", "run self-learning", "check instincts", or invokes /self-learning. Reads episodes from agent notes, curates patterns, and promotes instincts with human approval.
license: MIT
allowed-tools: Read Write Edit Grep Glob Bash
metadata:
  version: "1.1"
  last_updated: "2026-11-19"
---

# Self-Learning — episodes → patterns → instincts

## What this skill does

This skill runs the 3-tier promotion pipeline defined in Phase 2 F2.11–F2.15. It does not guess: every promotion rule is a mechanical check in `.agents/scripts/self_learn.js`.

## Skill vs. background automation

The skill is the **human control surface**, not the engine. Two mechanisms do the automatic work:

| Mechanism | What it does automatically | Frequency |
|---|---|---|
| `stop:session-end` hook → `self_learn.js auto-capture` | Appends one Tier-1 episode to `.agents/state/episodes.ndjson` and records assistant `[INSTINCT: ...]` cite events | every session end |
| `auto-capture` digest refresh | Rebuilds `state/self-learning-digest.md` | at most once per day |

**Promotion is never automatic.** A pattern becomes a pattern only when you review it and call `promote-pattern`; an instinct requires explicit `--approve`. That is deliberate — the plan's anti-patterns forbid auto-promotion. Invoke this skill to review candidates and decide; do not invoke it to "run self-learning", because capture already happened in the background.

## When to invoke

- After a `@retro`, to decide which lessons are now general practice.
- When the same approach has solved a problem repeatedly across agents.
- On demand: "what patterns have we learned?", "promote this to an instinct", "which instincts are stale?"

Do **not** invoke to record a single one-off lesson — that is a normal `@memory-controller write` to `lessons-learned.md`.

## The 3 tiers

| Tier | Storage | Promotion rule | Lifetime | Volume |
|---|---|---|---|---|
| 1 — Episodes | `.agents/state/episodes.ndjson` | — | until next retro | high |
| 2 — Patterns | `artifacts/memory/patterns-and-conventions.md` | ≥3 occurrences, ≥2 agents, ≥7 day span — **all required** | until archived | 10–50 |
| 3 — Instincts | `artifacts/memory/instincts.md` | pattern stable ≥30 days **and** referenced by ≥2 ADRs, **plus human `--approve`** | permanent until demoted | 3–10 |

Instincts are loaded **first** in every session by `@memory-controller` under a ~200 token cap. They are the only tier applied automatically.

## Procedure

### 0. Mid-session check (when the session has NOT ended yet)

If the user invokes `/self-learning` mid-session, `stop:session-end` has not captured the current conversation yet. Do both:

1. Run `node .agents/scripts/self_learn.js suggest --since=30d` to inspect past episodes, promotion candidates, and skill/agent boost suggestions.
2. Combine that output with **what you have learned in the current session** (corrections the user made, repeated edge cases, multi-step workarounds, or missing review perspectives) and present concrete suggestions right away:
   - Offer to record a key takeaway now with `node .agents/scripts/self_learn.js episode ...` so it is not lost before session end.
   - Recommend `/create-skill` or `/create-agent` using the Boost Decision Guide below whenever a takeaway outgrows a 1-line instinct. Never auto-create a skill or agent; present the proposed scope and let the user run the command.

### Boost Decision Guide (Instinct vs. `/create-skill` vs. `/create-agent`)

| What you learned | Best target | Why |
|---|---|---|
| Short 1-line rule that applies to every task | **Instinct** (`instincts.md`) | Always loaded at session start inside the 200-token cap. |
| Repeatable multi-step workflow, checklist, or script sequence | **Custom Skill** (`/create-skill`) | Loaded on demand when triggered; keeps the 200-token instinct budget clean. |
| Missing specialist perspective, guardrail, or domain ownership | **Custom Agent** (`/create-agent`) | Gives the swarm an independent persona and Socratic challenge stance. |

### 1. Scan episodes

```bash
node .agents/scripts/self_learn.js scan-episodes --since=30d
node .agents/scripts/self_learn.js find-patterns --min-occurrences=3 --min-agents=2 --min-span-days=7
```

Review each candidate title. The clustering is lexical, so merge obvious synonyms by hand before promoting.

### 2. Promote a pattern

```bash
node .agents/scripts/self_learn.js promote-pattern \
  --title="{stable pattern}" --occurrences=3 --agents=@developer,@qa-engineer --last-seen=YYYY-MM-DD
```

The script updates `occurrences` and `last_seen` when the pattern already exists — it never creates a duplicate. Every promotion is human-reviewed: you chose the candidate from step 1.

### 3. Promote an instinct (human-in-the-loop)

```bash
node .agents/scripts/self_learn.js promote-instinct --pattern="{pattern title}" --approve
```

The script refuses without `--approve`, and refuses when the pattern is younger than 30 days or has fewer than 2 ADR references. Never bypass those checks.

### 4. Auto-load

No action needed. `@memory-controller` loads `instincts.md` first at step 0.1 of session start. When you apply an instinct, emit `[INSTINCT: INS-NNN]` in your response so the citation-rate metric can count it.

### 5. Maintain

```bash
node .agents/scripts/self_learn.js scan                 # writes state/self-learning-digest.md
node .agents/scripts/self_learn.js scan-patterns --stale  # last_seen > 90d AND occurrences < 3
node .agents/scripts/self_learn.js instinct-cost --since=7d
node .agents/scripts/self_learn.js demote-instinct --id=INS-001 --reason="..."
```

Stale patterns are archive candidates, not automatic deletions. Demotion is explicit and records a reason under `## Demoted Instincts`.

## Outcome metrics (F2.15.a–c)

| Metric | Definition | Target |
|---|---|---|
| Instinct citation rate | sessions with a cite ÷ sessions with a load, per instinct, 14d window | >50%, report only with ≥10 standard-mode sessions — directional, not a gate |
| Pattern freshness | `last_seen` > 90d AND occurrences < 3 → stale | archive candidate |
| Token cost of instincts | `instinct-cost --since=7d`: total / avg / p95 / over_cap | cap 200 tokens; if `over_cap_count > 0`, @retro Step 1 produces demotion candidates |

## Anti-patterns

- Promoting on age alone — a pattern must clear occurrences, agents and span.
- Auto-promoting an instinct — `--approve` is a human gate, never implied by a skill step.
- Deleting a demoted instinct or pattern — move it to the demoted section / archive.
- Over-fitting one session's vocabulary into a "house style".
- Treating the citation rate as a gate — it is directional (09 risk R39).
- Writing episodes directly into `instincts.md` — that bypasses the whole pipeline.

## Done when

- `scan` produced `state/self-learning-digest.md`.
- Any promoted pattern shows `occurrences`, `agents`, and `last_seen`.
- Any instinct has a source pattern, ADR evidence, and a human approval record.
- Stale patterns and over-cap instincts have named owners (default: @retro Step 1).
