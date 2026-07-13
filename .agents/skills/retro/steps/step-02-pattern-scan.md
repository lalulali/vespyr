---
step: 2
name: Pattern Scan
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-01 completed
---

# Step 2 — Pattern Scan

Scan memory for recurring patterns — episodes that appear 3+ times across 2+ agents. Surface repeated issues, not one-off incidents.

## Goal
Find structural patterns in agent notes, lessons learned, and memory files. A single bug is a fix. The same bug across 3 cycles is a process failure.

## Agent invocation
`@product-manager` loads memory for deep review:

```
@memory-controller load product-manager [retrospective pattern scan]
@memory-controller load-full lessons-learned.md
@memory-controller load-full agent-notes/developer-notes.md
@memory-controller load-full agent-notes/tech-lead-notes.md
@memory-controller load-full patterns-and-conventions.md
```

Also review:
- Incident post-mortems from `artifacts/output/08-incidents/`
- User feedback and support tickets (if applicable)
- Blockers that recurred across cycles

## Pattern detection criteria
Flag when an episode appears:
- 3+ times across any combination of agents/memory files
- With the same root cause (not same symptom)
- Under different contexts (different features, different cycles)

## Output
`artifacts/output/09-retro/pattern-scan.md` — list of recurring patterns with source references.

## Delegation
- Reads: @reader (lessons learned, agent notes, incident reports)
- Writes: @writer (pattern-scan.md)
