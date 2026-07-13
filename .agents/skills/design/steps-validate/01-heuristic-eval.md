---
step: 1
name: Heuristic Evaluation
mode: validate
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
---

# Step 1 — Heuristic Evaluation

Evaluate the product spec against Nielsen's 10 usability heuristics.

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
`artifacts/output/01-research/ux-research-report.md` — heuristic scorecard with issues per screen.

Use template `.agents/templates/research/ux-research-report-template.md`.

## Delegation
- Reads: @reader (product spec, design tokens)
- Writes: @writer (ux-research-report.md sections)
