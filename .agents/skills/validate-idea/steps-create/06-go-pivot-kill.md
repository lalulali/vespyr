---
step: 6
name: GO/PIVOT/KILL
mode: create
prerequisites:
  - step-05 completed
delegation:
  reads: "direct (brief < 200 lines; per delegation-policy.md 1 file < 500 lines)"
  writes: none
  runs: none
  direct_justified: ["pure reasoning; verdict is conversational, no file output"]
output_contract:
  citations: not-required
---

# Step 6 — GO/PIVOT/KILL

Generate alternatives and deliver the verdict. This is the decision point.

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

**GO** — Worth exploring. Demand evidence exists or the problem is clear enough to validate through research.

**PIVOT** — The core problem is real, but this approach is wrong. Propose a reframed direction. Re-run this skill with the revised framing.

**KILL** — Doesn't survive scrutiny. No demand, no urgency, premises don't hold. Document why. Don't soften it.

Every verdict includes one concrete **next action** — a specific real-world step, not "go research this."

## Output
Verdict (GO/PIVOT/KILL) with rationale, alternatives assessment, and next action.

## Delegation
- **Reads:** direct — brief (< 200 lines)
- **Writes:** none
- **Direct:** pure reasoning; verdict is conversational
