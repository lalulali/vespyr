---
step: 2
name: Identify Gaps
mode: edit
prerequisites:
  - step-01 completed
delegation:
  reads: "direct (loaded spec in context)"
  writes: none
  runs: none
  direct_justified: ["pure reasoning on loaded content; no new file reads"]
output_contract:
  citations: not-required
---

# Step 2 — Identify Gaps

Scan design artifacts for missing or weak sections.

## Goal
Find what's incomplete or misaligned. A spec with screens but no error states, or a PRD without measurable goals, needs strengthening.

## Process
`@product-manager` and `@product-designer` evaluate:

1. **PRD alignment** — Do requirements still match the validated idea? Any scope drift?
2. **Story completeness** — Every feature has stories? Every story has AC-H/AC-U/AC-E?
3. **Screen specification** — All screen states covered (default, loading, empty, error, success)?
4. **Design system** — Are design tokens complete and consistent?
5. **Traceability** — Do acceptance criteria trace back to user stories and PRD features?

## Gap classification
- **Green** — strong, no revision needed
- **Yellow** — adequate but could be sharper
- **Red** — weak or missing, must be revised

## Output
Gap map per artifact: which sections are green/yellow/red.

## Delegation
- **Reads:** direct — spec already loaded in context
- **Writes:** none
- **Direct:** pure reasoning on loaded content
