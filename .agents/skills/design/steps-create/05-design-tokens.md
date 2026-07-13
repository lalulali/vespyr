---
step: 5
name: Design Tokens
mode: create
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites:
  - step-04 completed
---

# Step 5 — Design Tokens

Define visual design system: colors, typography, spacing, component states, responsive breakpoints.

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
- Reads: @reader (research artifacts, PRD, stories)
- Writes: @writer (PRD, user stories, spec files, design.md)
- Direct: PM and designer reasoning is direct
