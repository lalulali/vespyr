---
step: 5
name: Design Tokens
mode: create
prerequisites:
  - step-04 completed
delegation:
  reads: "direct (screen states; per delegation-policy.md 1 file < 500 lines)"
  writes: "@writer (design.md; per delegation-policy.md output file)"
  runs: none
  direct_justified: ["single input reference already in context"]
output_contract:
  citations: not-required
---

# Step 5 — Design Tokens

Define visual design system: colors, typography, spacing, component states, responsive breakpoints.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 5`
## Goal
Produce `design.md` as the visual source of truth. Engineering agents read it at startup and implement to spec, not to guess.

## Adaptive styling rubric
`@product-designer` evaluates project context and selects an approach:

- **Rigid/Structured** — utility dashboards, data tables, enterprise systems. Focus: grid rigidity, usability, density.
- **Out-of-the-Box/Creative** — creative sites, consumer apps, brand pages. Focus: visual impact, gradients, card glows, animations.

Theme combinations:
- Sleek Utility
- Modern Glassmorphism
- Minimalist Tech
- Vibrant Brand-First

## design.md content
`artifacts/output/02-strategy/design.md`:
- **Custom variables** (CSS custom properties / design tokens)
- **Colors** — primary, secondary, accent, semantic (with hex values)
- **Typography** — font families, sizes, weights, line heights
- **Component states** — default, hover, focus, active, disabled (with transform/transition specs)
- **Micro-animations** — durations, easings, triggers
- **Responsive breakpoints** — mobile, tablet, desktop, wide (with layout rules per breakpoint)
- **Layout spacing** — grid gaps, padding scales, margin scales

## Consumers
`@developer`, `@architect`, `@qa-engineer`, `@tech-lead` read `design.md` as their visual and styling guide.

## Output
`artifacts/output/02-strategy/design.md`

## Delegation
- **Reads:** direct — screen states (single reference in context)
- **Writes:** @writer for design.md

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 5`
