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

## Adaptive styling decision (two axes — owned by design.md)
Work `.agents/templates/product/design.md` in order; do not re-decide here:

1. **Product context** — Sleek Utility / Minimalist Tech / Modern Glassmorphism / Vibrant Brand-First / Conversion Storefront / Custom (WHAT we're building; drives density, motion budget, tone).
2. **Craft style** — ONE pick from the 12-style menu, or a declared Custom (HOW it looks; drives tokens).
3. **Taste interview + anti-generic rule** — enforced before any token is written; light AND dark sets ship by default.

`@product-designer` loads `.agents/references/designer-guidelines.md` for component libraries, fonts, and asset tooling (Söhne / Klim, DaisyUI / Tailwind, Haikei SVG, Pangram Pangram / Displaay) once context + style are set.

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
