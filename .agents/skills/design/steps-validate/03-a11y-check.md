---
step: 3
name: Accessibility Check
mode: validate
prerequisites:
  - step-02 completed
delegation:
  reads: "direct (screen states reference; per delegation-policy.md 1 file < 500 lines)"
  writes: "@writer (accessibility check report)"
  runs: none
  direct_justified: ["single spec reference file"]
output_contract:
  citations: not-required
---

# Step 3 — Accessibility Check

Validate the design against WCAG 2.2 AA accessibility standards.

## Goal
Ensure the product is usable by people with disabilities. Catch a11y issues before they become code.

## Agent invocation
`@ux-researcher` reviews:

1. **Color contrast** — all text meets 4.5:1 minimum (3:1 for large text)?
2. **Keyboard navigation** — all interactive elements reachable and operable via keyboard?
3. **Focus indicators** — visible focus states on all interactive elements?
4. **Screen reader support** — semantic structure, ARIA labels, alt text defined?
5. **Touch targets** — minimum 44x44px for interactive elements?
6. **Motion sensitivity** — animations respect `prefers-reduced-motion`?
7. **Form labels** — all inputs have associated labels?
8. **Error identification** — errors described in text, not just color?

## Scoring
🟢 Pass — meets standard
🟡 Partial — some issues, can be addressed in development
🔴 Fail — blocks users, must be fixed before development

## Output
A11y report appended to `artifacts/output/01-research/ux-research-report.md`.

## Delegation
- **Reads:** direct — screen states (single reference)
- **Writes:** @writer for accessibility check report
