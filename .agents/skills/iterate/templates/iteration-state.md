/**
 * templates/iteration-state.md — TEMPLATE — Iteration State

---
cyclesCompleted: 0
lastRetroCycle: ""
started: ""
last_updated: ""
status: "not-started"
---

# Iteration State — {feature}

## Why this file exists

The skill states the limit in four places across two skills:

> **Iteration limit:** Maximum 5 iteration cycles before a mandatory `retro`.

and nothing counted the cycles. A limit with no counter is not a limit — it is a sentence. The count
lives here so the rule can be checked rather than remembered, and so a cycle is counted when the
cycle produces a result, not when someone remembers to count it.

## Cycles completed

<!-- One line per completed cycle. Append, never rewrite. -->

| Cycle | Date | Hypothesis | Result | Artifact |
|-------|------|-----------|--------|----------|
| 1 | YYYY-MM-DD | {measurable claim} | positive/neutral/negative | iteration-results.md |

`cyclesCompleted` MUST equal the number of rows above. `cycle_state_check.js` fails when they disagree.

## The retro gate

At **5** cycles, `retro` is mandatory before cycle 6 begins. To record that it happened, set:

```
cyclesCompleted: 5
lastRetroCycle: 6
```

`lastRetroCycle` is the cycle number the retro covered. The check fails a 6th cycle while
`lastRetroCycle` is empty, which is the point: the limit blocks the work, not the writing.

## Status values

| Value | Meaning |
|-------|---------|
| `not-started` | No cycle has run |
| `in-progress` | A cycle is running; the count is the last COMPLETED one |
| `complete` | Iteration on this feature is finished — move to `retro` or the next feature |

## Rules

- A cycle is counted when `iteration-results.md` exists with a recorded measurement — not when the
  cycle starts. Counting attempts is how a limit stops limiting.
- A cycle with a **negative** result still counts. Repeatedly re-running a failing hypothesis is the
  exact loop this limit exists to interrupt.
- Never delete a row to make room for a new one. The history is the evidence that the limit was
  honoured.
