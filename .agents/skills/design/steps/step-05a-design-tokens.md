---
step: 5a
name: Design Tokens
mode: create
prerequisites:
  - step-04 completed
output_contract:
  citations: not-required
---

# Step 5 — Design Tokens

Define visual design system: colors, typography, spacing, component states, responsive breakpoints.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 5`
## Goal
Produce `design.md` as the visual source of truth. Engineering agents read it at startup and implement to spec, not to guess.

## Adaptive styling rubric
`@product-designer` loads `.agents/references/designer-guidelines.md`, evaluates project context, and selects an approach:

- **Rigid/Structured** — utility dashboards, data tables, enterprise systems. Focus: grid rigidity, usability, density. (Söhne typography / Klim Type Foundry, DaisyUI / Tailwind)
- **Out-of-the-Box/Creative** — creative sites, consumer apps, brand pages. Focus: visual impact, gradients, card glows, animations. (Haikei SVG rendering, Pangram Pangram / Displaay fonts)

Theme combinations:
- Sleek Utility
- Modern Glassmorphism
- Minimalist Tech
- Vibrant Brand-First

## design.md content
`artifacts/output/03-strategy/design.md`:
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
`artifacts/output/03-strategy/design.md`

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 5`
