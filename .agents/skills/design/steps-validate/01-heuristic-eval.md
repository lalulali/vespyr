---
step: 1
name: Heuristic Evaluation
mode: validate
prerequisites: []
delegation:
  reads: "@reader (product-spec + screen states; per delegation-policy.md ≥2 large files)"
  writes: "@writer (heuristic evaluation report)"
  runs: none
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 1 — Heuristic Evaluation

Evaluate the product spec against Nielsen's 10 usability heuristics.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-validate --step 1`
## Goal
Identify usability issues in the current design before they reach implementation.

## Agent invocation
`@ux-researcher` evaluates the product spec against each heuristic:

1. **Visibility of system status** — does the user always know what's happening?
2. **Match between system and real world** — language and concepts familiar to users?
3. **User control and freedom** — can users undo/redo easily?
4. **Consistency and standards** — consistent terminology and patterns?
5. **Error prevention** — are errors prevented before they happen?
6. **Recognition rather than recall** — are options visible, not memorized?
7. **Flexibility and efficiency of use** — shortcuts for experienced users?
8. **Aesthetic and minimalist design** — no irrelevant information?
9. **Help users recognize, diagnose, recover from errors** — clear error messages?
10. **Help and documentation** — is help available when needed?

## Scoring per heuristic
🟢 Pass — no issues
🟡 Minor — improvement possible but not blocking
🔴 Fail — must be fixed before development

## Output
`artifacts/output/02-research/ux-research-report.md` — heuristic scorecard with issues per screen.

Use template `.agents/templates/research/ux-research-report-template.md`.

## Delegation
- **Reads:** @reader for product-spec and screen states
- **Writes:** @writer for heuristic evaluation report

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-validate --step 1`
