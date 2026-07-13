---
step: 2
name: Identify Gaps
mode: edit
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites:
  - step-01 completed
---

# Step 2 — Identify Gaps

Scan the brief for missing or weak sections.

## Goal
Find what's incomplete. A brief with a verdict but no user specificity, or a problem statement without evidence, needs strengthening before revision.

## Process
`@founder` evaluates each section against these criteria:

1. **Problem statement** — Is it specific? Can you name a real person with this problem?
2. **Demand evidence** — Is there a behavioral signal beyond "people say it's interesting"?
3. **Target user** — Is it a specific role/person, not a category?
4. **Value proposition** — Does it replace a concrete status quo behavior?
5. **Verdict** — Is the reasoning explicit and defensible?

## Gap classification
- **Green** — strong, no revision needed
- **Yellow** — adequate but could be sharper
- **Red** — weak or missing, must be revised

## Output
Gap map: which sections are green/yellow/red, with brief notes on what's missing.

## Delegation
- Reads: @reader (existing brief, specs)
- Writes: @writer (revised sections)
- Direct: founder reasoning is direct
