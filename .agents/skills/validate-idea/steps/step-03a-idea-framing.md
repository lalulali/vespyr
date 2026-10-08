---
step: 3a
name: Idea Framing
mode: create
prerequisites:
  - step-02 completed
output_contract:
  citations: not-required
---

# Step 3 — Idea Framing

Frame the idea in structured terms before stress-testing. Turn the raw problem/solution into an organizing framework.

## Goal
Structure the idea so the diagnostic questions have clear targets.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 3`
`@founder` frames the idea in these terms:

1. **Problem statement** — one sentence. What's broken and who's affected?
2. **Proposed solution** — one sentence. What are you building?
3. **Target user** — one sentence. Who is the first user?
4. **Core value** — one sentence. Why would they switch from what they do today?

## Question routing table

Questions are split across the two stress-test rounds. Round 1 (`step-04a`) carries Q1–Q4;
Round 2 (`step-05a`) carries Q5–Q7. Route by context mode + maturity from step 01:

| Mode + Maturity | Round 1 (Q1–Q4) | Round 2 (Q5–Q7) |
|---|---|---|
| Startup + greenfield | Q1, Q2, Q3, Q4 | Q5, Q6, Q7 |
| Startup + brownfield | Q1*, Q2, Q3, Q4 | Q5, Q7 |
| Company + greenfield | Q1, Q2, Q3, Q4 | Q6, Q7 |
| Company + brownfield | Q1*, Q2, Q3, Q4 | Q5, Q7 |
| Personal + greenfield | Q1-light, Q2, Q4 | Q5 |
| Personal + brownfield | Q1*-light, Q2, Q4 | Q5 |

`Q1*` = asked from product telemetry rather than cold (see `step-01a` Product maturity routing).
`Q1-light` = the personal-mode variant in `step-04a` ("have you personally felt this pain?").

**Q3 is never dropped.** Target-user specificity is required by the brief (`step-07a`) and by
`step-01b`'s section check. A route without Q3 produces a brief that fails its own contract.

**Q7 is conditional, not optional-by-default.** Ask it whenever the concept sounds large or the
team is small — including brownfield features that inherit a platform's scope. Skipping it is a
silent drop unless dispositioned (see Point coverage below).

## Point coverage — no silent drops

The Q1–Q7 set is a confirmed enumeration, so it obeys
`.agents/references/point-coverage.md`: every question ends in exactly one terminal state —
`COVERED` / `DEFERRED` (owner + reason + revisit trigger) / `REJECTED` (reason) /
`OUT-OF-SCOPE` (quoted boundary).

The escape hatch below may shorten a round. It may **not** leave a question unspoken. Any question
not asked must still be dispositioned in the brief's Q-table as `DEFERRED` or `OUT-OF-SCOPE` with
its reason — a blank is a blind spot, not a skip.

## Escape hatch
If the user says "just do it" or shows impatience:
- "The hard questions are the value. Let me ask the two most critical, then we move."
- If they push back again, respect it — stop asking. Every unasked question still needs a
  terminal state per **Point coverage** above: record it as `DEFERRED` with the user as owner and
  the reason "user exited early", plus a revisit trigger. Do not leave blanks, and do not let a
  skipped question silently satisfy the `[GO]` gate — an unanswered criterion is `PARTIAL`, which
  makes `[GO]` unavailable and forces `[RESHAPE]` (see `step-06a`).

## Output
Framed idea (4 components) + question routing decision.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 3`
