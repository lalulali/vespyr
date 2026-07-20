---
step: 2
name: Identify Gaps
mode: edit
prerequisites:
  - step-01 completed
delegation:
  reads: "direct (brief already loaded in context)"
  writes: none
  runs: none
  direct_justified: ["pure reasoning on loaded content; no new file reads"]
output_contract:
  citations: not-required
---

# Step 2 — Identify Gaps

Scan the brief for missing or weak sections.

## Goal
Find what's incomplete. A brief with a verdict but no user specificity, or a problem statement without evidence, needs strengthening before revision.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-edit --step 2`
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
- **Reads:** direct — brief already loaded in context
- **Writes:** none
- **Direct:** pure reasoning on loaded content

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-edit --step 2`
