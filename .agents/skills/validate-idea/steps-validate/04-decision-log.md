---
step: 4
name: Decision Log
mode: validate
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites:
  - step-03 completed
---

# Step 4 — Decision Log

Write resolved decisions to persistent memory. The Socratic session produces important choices that must survive this session.

## Goal
Persist every resolved branch decision, contradiction resolution, and verdict so future agents can build on this foundation.

## Process
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
- The validation verdict (GO/PIVOT/KILL) was affirmed or changed

## Cardinality
At least one decision per 🔴 branch. At least one decision per contradiction found.

## Verdict reaffirmation
If the validate mode found no reason to change the original verdict: "Validation affirmed [original verdict]. No new evidence contradicted the original assessment."

If the validate mode CHANGES the verdict: document why with specific branch evidence.

## Output
Decisions persisted to `active-decisions.md`. Verdict reaffirmed or revised with rationale.

## Delegation
- Reads: @reader (brief sections)
- Writes: @writer (validation reports)
- Memory: @memory-controller (active-decisions)
- Direct: founder reasoning is direct
