---
step: 2
name: 7-Branch Decision Tree
mode: validate
prerequisites:
  - step-01 completed
delegation:
  reads: "direct (brief + open questions in context)"
  writes: none
  runs: none
  direct_justified: ["pure Socratic reasoning; no file I/O"]
output_contract:
  citations: not-required
---

# Step 2 — 7-Branch Decision Tree

Walk the 7-branch Socratic decision tree. Each branch is a lens that stress-tests a different dimension of the brief.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-validate --step 2`
## Goal
For each of the 7 branches, ask the hardest single question and push for a concrete answer. This is the core of Socratic validation.

## Branch 1: Product Requirements
**Ask:** "Which capability, if removed, would make this product useless? Which, if added, would be scope creep?"
Push for: the non-negotiable vs. the nice-to-have distinction.

## Branch 2: Architecture Trade-offs
**Ask:** "What's the most expensive architectural decision you're making, and what cheaper alternative did you reject? Why?"
Push for: a specific trade-off with numbers.

## Branch 3: Edge Cases
**Ask:** "What happens when the primary assumption fails? Walk me through the worst plausible scenario."
Push for: a specific failure chain, not "we'll handle it."

## Branch 4: Codebase Logic
**Ask:** "What existing system does this need to integrate with, and what's the hardest part of that integration?"
Push for: a specific API, schema, or protocol conflict.

## Branch 5: Cost & Timeline
**Ask:** "What's the one thing most likely to double your timeline? What's your plan if it happens?"
Push for: a named risk with a mitigation strategy.

## Branch 6: Risks
**Ask:** "What risk are you most afraid of but not talking about? Legal, market, team, technical — what's the one that keeps you up?"
Push for: the unspoken worry.

## Branch 7: Success Criteria
**Ask:** "How will you know in 30 days whether this was the right decision? What specific number or signal?"
Push for: a measurable threshold and by-when date.

## Scoring per branch
🟢 Strong — clear answer, evidence-backed, internally consistent.
🟡 Weak — plausible but unverified, relies on assumptions.
🔴 Fail — no answer, circular reasoning, or contradicts other branches.

## Output
7-branch scorecard with strongest/weakest branches identified.

## Delegation
- **Reads:** direct — brief and open questions already in context
- **Writes:** none
- **Direct:** pure Socratic reasoning; no file I/O

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-validate --step 2`
