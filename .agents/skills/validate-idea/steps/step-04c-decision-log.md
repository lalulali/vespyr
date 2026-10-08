---
step: 4c
name: Decision Log
mode: validate
prerequisites:
  - step-03 completed
output_contract:
  citations: not-required
---

# Step 4 — Decision Log

Write resolved decisions to persistent memory. The Socratic session produces important choices that must survive this session.

## Goal
Persist every resolved branch decision, contradiction resolution, and verdict so future agents can build on this foundation.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-validate --step 4`
For each resolved item, write to active decisions:

```
@memory-controller write active-decisions.md
### [VALIDATE] {branch name}: {decision summary} [date: YYYY-MM-DD] [agent: @founder]
{what was decided, why, what evidence supported it, what alternatives were rejected}
**Status:** active
```

Prioritize writing when:
- A branch had a 🔴 score that was resolved
- A cross-branch contradiction was reconciled
- A premise was confirmed or rejected
- The validation verdict (`[GO]` / `[RESHAPE]` / `[NO-GO]`) was affirmed or changed

## Cardinality
At least one decision per 🔴 branch. At least one decision per contradiction found.

## Verdict reaffirmation

Validate mode must **re-emit the plain sentence and one bracketed verdict card** — it never leaves
the prior verdict as prose, and never leaves the card without its plain sentence. Depth scales with
the stakes of the original call (`.agents/references/vespyr-dna.md` §Card depth scales with stakes).

- **Unchanged, high stakes:** "Still good — nothing new contradicts the original call." then
  `VERDICT: [GO] — When: NOW` / `Audited:` / `Survived: everything` / `Because: <evidence>` / `Next:`.
- **Unchanged, low stakes:** "Still good — nothing new contradicts the original call." then
  `VERDICT: [GO] — When: NOW`.
- **Changed:** state the new plain sentence ("The problem is real; this mechanism isn't — keep the
  why, replace the how."), then `VERDICT: [RESHAPE]` / `Survived: the need, not the mechanism`, then
  name the specific branch evidence that forced the change (branch number + score + finding).

**A `[NO-GO]` reaffirmed or newly issued obeys the same ban as create mode** (`step-06a`): the
No-Go Autopsy is the only legal body. Do not append options, architecture, or a "smaller version we
could still build" to a brief being closed as `[NO-GO]`.

## Output
Decisions persisted to `active-decisions.md`. Verdict reaffirmed or revised with rationale.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-validate --step 4`
