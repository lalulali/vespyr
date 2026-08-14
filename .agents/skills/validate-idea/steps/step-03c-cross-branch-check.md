---
step: 3c
name: Cross-Branch Check
mode: validate
prerequisites:
  - step-02 completed
output_contract:
  citations: not-required
---

# Step 3 — Cross-Branch Check

Scan for contradictions across branches. A brief can pass each branch individually but fail when branches interact.

## Goal
Find where one branch's answer undermines another's. Cross-branch contradictions are the most dangerous because they're invisible in siloed review.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-validate --step 3`
`@founder` checks these cross-branch pairs:

1. **Product vs. Cost** — Does the required scope match the assumed timeline and team?
2. **Architecture vs. Edge Cases** — Does the chosen architecture handle the worst-case edge case?
3. **Risks vs. Success Criteria** — Is the success threshold achievable given the identified risks?
4. **Codebase vs. Timeline** — Does the integration complexity fit the timeline?
5. **Product vs. Success** — Are the required capabilities sufficient to hit the success signal?

## Contradiction patterns
Flag when:
- Branch A says "need X" and Branch B says "can't have X"
- Branch A assumes a condition and Branch B contradicts that condition
- Branch A has 🟢 score but Branch B's 🔴 makes A's answer invalid

## Resolution
For each contradiction, ask: "Your [Branch A] answer says [X], but your [Branch B] answer implies [not-X]. Which one is correct?"

## Output
Cross-branch contradiction map with resolution status per pair.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-validate --step 3`
