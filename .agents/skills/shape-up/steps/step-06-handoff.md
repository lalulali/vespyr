---
step: 6
name: Handoff
prerequisites:
  - step-05 completed
output_contract:
  citations: required
---

# Step 6 — Handoff

Write the shaped brief and hand off to the next skill.

## Output artifact
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill shape-up --step 6`

`artifacts/output/01-discovery/shaped-brief.md` containing, in this order:

**Framing** — Problem Statement · Proposed Solution · Target User · Shaping Context
**Boundaries** — Scope In (v1) · Scope Out (non-goals) · Appetite (the timebox this is worth) · Constraints (with rationale)
**Evidence** — Key Assumptions, each marked verified / plausible / unverified, with its source
**Decisions** — Key Decisions (reference `active-decisions.md`) · Open Questions, each dispositioned
**Routing** — the Decision Gate below · Recommended Next Step

> **Scope Out and Rabbit Holes are different things and both are required.** Scope Out is what v1 will
> not do. A Rabbit Hole is a tempting detail that looks like scope but is a distraction — naming one you
> fenced off is what stops it returning mid-build. An artifact that lists non-goals but no fenced rabbit
> holes will get re-litigated in week two.

**Appetite** — the fixed timebox this work is worth (e.g. "2 weeks"), stated as a budget, not an estimate.
If the work does not fit the appetite, that is a scoping finding for step 5, not a reason to extend it.

## Handoff routing
- **All assumptions verified/accepted:** → `design` (ready for specs).
- **Unverified assumptions need validation or user requests research:** → `explore-idea` (open questions become research agenda).
- **Fundamental viability concerns:** → `validate-idea`. **That skill issues its own Decision Gate** — shape-up records a *shaping* recommendation here and does not pretend to gate the concept's viability.

## The Decision Gate — who owns it

**shape-up's own gate is about shaping readiness, not concept viability.** These are different decisions and
must not be collapsed:

| | Owner | Question it answers |
| :-- | :-- | :-- |
| **Shaping gate** | this skill, step 6 | Is this brief well-shaped enough to hand to `/design`? |
| **Concept gate** | `/validate-idea` | Should this concept be built at all? |

So the brief records:

```
## Decision Gate — shaping readiness
{plain sentence: "ready to spec" / "needs research first" / "not viable — validate before shaping further"}

VERDICT: [GO] — When: <NOW|GATED|NEXT-CYCLE>   ← When: on [GO] only
Shaping: <ready | needs-evidence | not-viable>
Because : <the assumption status that decided it — e.g. 4 of 7 assumptions still unverified>
Next    : <the target skill, the artifact it consumes, and the date>
```

Format and depth: `.agents/references/vespyr-dna.md` §Decision Gate. A brief with unverified assumptions
**cannot** be `[GO]` on shaping readiness — it is `[RESHAPE]` (needs evidence) whatever the concept's merits.

## Two surfaces

`shaped-brief.md` is the **document** surface: the gate above lives there in full — plain sentence, then
the card.

The chat reply is the **human** surface: one plain sentence on whether the brief is ready to spec and what
happens next, plus a link. Never put `VERDICT:`, `[GO]`/`[RESHAPE]`/`[NO-GO]`, or any card field in the
chat (`.agents/references/vespyr-dna.md` §Two surfaces). The gates read the file.

## State machine & Memory closeout
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/shaped-brief.md
```
- `@memory-controller write active-decisions.md` (persist decisions).
- `@memory-controller session-write` (summarize decisions, next steps, blockers).

## Delegation
- **Memory:** @memory-controller for active-decisions and session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill shape-up --step 6`
