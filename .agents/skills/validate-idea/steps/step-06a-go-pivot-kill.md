---
step: 6a
name: GO/PIVOT/KILL
mode: create
prerequisites:
  - step-05 completed
output_contract:
  citations: not-required
---

# Step 6 — GO/PIVOT/KILL

Generate alternatives and deliver the verdict. This is the decision point.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 6`

## Verdict contract

The verdict is a parseable line: `GO / PIVOT / KILL — <one-line reason>`. GO requires every one of:
- Demand evidence is behavioral (payment, expansion, panic-on-removal), not interest.
- Status-quo cost is quantified (hours or dollars per week).
- The narrowest wedge is shippable in days, not months.
- No unresolved cross-round contradiction from step 05's premise challenge.

## Alternatives
Generate 2-3 distinct approaches:

```
APPROACH A: [Name] — Minimal viable
  Summary:    [1-2 sentences]
  Effort:     S / M / L / XL
  Ships in:   [days / weeks / months]
  Risk:       Low / Med / High
  Why it wins:  [one reason]
  Why it fails: [one reason]

APPROACH B: [Name] — Ideal long-term
  ...

APPROACH C: [Name] — Creative/lateral (optional)
  ...
```

Rules:
- At least 2 approaches. 3 preferred for non-trivial ideas.
- One must be the smallest thing someone would use this week.
- One must be the ideal long-term direction.

## Verdict
Based on diagnostic, premises, and alternatives, give ONE verdict:

**GO** — All four verdict-contract criteria met (behavioral demand evidence, quantified status-quo cost, days-shippable wedge, no unresolved contradiction). No partial credit: interest-not-behavior or unquantified cost makes GO unavailable — issue PIVOT.

**PIVOT** — The core problem is real, but this approach is wrong. Propose a reframed direction. Re-run this skill with the revised framing.

**KILL** — Doesn't survive scrutiny. No demand, no urgency, premises don't hold. Document why. Don't soften it.

Every verdict includes one concrete **next action** — a specific real-world step, not "go research this."

## Output
Verdict (GO/PIVOT/KILL) with rationale, alternatives assessment, and next action.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 6`
