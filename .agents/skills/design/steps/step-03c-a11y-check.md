---
step: 3c
name: Accessibility Check
mode: validate
prerequisites:
  - step-02 completed
output_contract:
  citations: required
---

# Step 3 — Accessibility Check

Validate the design against WCAG 2.2 AA accessibility standards.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-validate --step 3`
## Goal
Ensure the product is usable by people with disabilities. Catch a11y issues before they become code.

## Agent invocation
`@ux-researcher` reviews:

1. **Color contrast** — all text meets 4.5:1 minimum (3:1 for large text)?
2. **Keyboard navigation** — all interactive elements reachable and operable via keyboard?
3. **Focus indicators** — visible focus states on all interactive elements?
4. **Screen reader support** — semantic structure, ARIA labels, alt text defined?
5. **Touch targets** — WCAG 2.2 SC 2.5.8 *Target Size (Minimum)* is **24×24 CSS px** and that is the **AA** floor. SC 2.5.5 *Target Size (Enhanced)* at 44×44 is **AAA**, so a step that validates against AA must not hold designs to it. Report 2.5.8 as a blocking finding and 2.5.5 as a recommendation, labelled with its level. An earlier version of this line cited only "44x44px" with no criterion number, which reads as an AA requirement and fails compliant designs for the wrong reason.
6. **Motion sensitivity** — animations respect `prefers-reduced-motion`?
7. **Form labels** — all inputs have associated labels?
8. **Error identification** — errors described in text, not just color?

## Scoring
🟢 Pass — meets standard
🟡 Minor — improvement possible, not blocking
🔴 Fail — blocks users, must be fixed before development

Labels are fixed to match `step-01c-heuristic-eval.md` exactly. An earlier version of this step used "Partial" for 🟡, which meant "can be addressed in development" — the same semantics as Minor but a different word. Step 04c consolidates both scorecards into one verdict, and a reader who sees 🟡 next to two different labels cannot tell whether it blocks. Same emoji, same label, or it is not a scale.

## Cite the criterion, not the vibe

The thresholds above (4.5:1, 3:1 large text, 44×44px) are factual claims from WCAG 2.2 AA that the owner will check. Cite the success criterion number in the finding — `[^1]: WCAG 2.2 SC 1.4.3 Contrast (Minimum)` — per DNA 5 §No Source, No Fact. If a threshold is quoted from memory rather than the spec, write `[Source: unverified]` next to it; a confidently wrong contrast ratio is worse than an admitted one.

## Output
A11y report appended to `artifacts/output/02-research/ux-research-report.md`.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-validate --step 3`
