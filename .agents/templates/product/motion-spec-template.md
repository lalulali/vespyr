---
purpose: Motion specification — the developer-ready motion document produced by @product-designer (Ivy) when motion is in scope. Contains the motion voice, tokens, choreography, and one complete motion prompt per animation.
audience: @developer, @qa-engineer, @tech-lead
paired_with: design.md (motion tokens merge here), motion-research.md (evidence)
---

# {Feature Name} — Motion Specification

## Overview
- **Motion scope:** {feature list where motion applies}
- **Research reference:** `artifacts/output/02-research/motion-research.md`
- **Evidence mode:** {full research / lightweight - include the reason and existing evidence for lightweight}
- **User stories:** {stories covered — motion must trace to stories, zero orphans}
- **Motion voice:** {1-2 sentence description of the motion personality — playful/calm/precise/dramatic}

## Motion voice (brand-level)
- {how the motion personality expresses itself across easing, duration, and choreography}
- {the ONE signature motion moment of the product}

## Motion tokens (also merged into design.md)
| Token | Value | Use |
|-------|-------|-----|
| `--ease-standard` | `cubic-bezier(...)` or `spring {...}` | Default transitions |
| `--ease-exit` | `cubic-bezier(...)` | Elements leaving |
| `--ease-spring` | `{ stiffness, damping, mass }` | Delight moments |
| `--dur-fast` | 100–150ms | Hover, press, toggles |
| `--dur-base` | 200–350ms | Panels, accordions, snackbars |
| `--dur-slow` | 400–600ms | Page transitions, modals |
| `--dur-epic` | 700–1000ms | Cinematic entrances |

## Easing zones (one dominant curve per screen)
- **Micro-interactions:** {token}
- **Navigation/transitions:** {token}
- **Hero/brand/cinematic:** {token}

## Choreography rules
- **Spatial metaphor:** {e.g., "content moves forward on nav, drawers slide from their edge, modals rise from center"}
- **Leader/follower pattern:** {which element leads, stagger interval}
- **Direction consistency:** {how forward/back navigation differs}
- **Follow-through order:** backdrop → container → content → accent

## Motion prompts

### Motion Prompt: MO-001 — {name}
**Trigger:** {user action / state change / system event}
**Target:** {element/component per design.md}
**Property(ies):** {opacity / transform only}
**From → To (keyframes):**
- 0%: {start pose}
- 100%: {end pose}
**Duration:** {ms}
**Easing:** {token or exact curve}
**Stagger/Choreography:** {leader, follower order, stagger}
**Secondary action / follow-through:** {settle behavior}
**Reduced-motion fallback:** {cross-fade ≤200ms or instant}
**Keyboard/focus behavior:** {focus-visible behavior; hover-only behavior must not be required for keyboard users}
**Informational fallback:** {persistent text/icon/state that communicates the same meaning without motion}
**Autoplay control:** {not applicable, or pause/stop/hide mechanism and why automatic motion is essential}
**Timing tolerance:** {default ±16ms, or a documented exception}
**Performance note:** {GPU-composited, no layout props}
**SSR/hydration note:** {not applicable, or how matchMedia/runtime state is guarded}
**Acceptance check:** {how @qa-engineer verifies}
**Associated stories:** US-{NNN}

*(Repeat MO-### block per animation, grouped by screen/interaction.)*

## Reduced-motion plan (mandatory)
- **Global policy:** {what replace/reduce means for this product}
- **Per-motion fallbacks:** {summary table: motion → reduced-motion behavior}
- **Vestibular gates:** {no autoplay loops without kill switch, no parallax, no scale > 1.2}
- **Informational motion:** {every motion carrying information has a non-motion equivalent}
- **Auto-moving content:** {pause/stop/hide control for automatic movement lasting more than five seconds alongside other content, unless essential}
- **Flash safety:** {no more than three flashes per second and no WCAG 2.3.1 threshold violations}
- **Accessibility authority:** {full pipeline sign-off by @ux-researcher}

## QA verification checklist
- [ ] Every MO-### maps to one prompt, one user story, one implementation reference, and one QA assertion
- [ ] Timing tolerance within the prompt's numeric value (default ±16ms)
- [ ] Trigger, keyboard focus, hover, and state-transition behavior verified
- [ ] Reduced-motion pass executed (`emulateMedia({ reducedMotion: 'reduce' })`)
- [ ] Informational motion has a persistent non-motion equivalent
- [ ] Auto-moving content has pause/stop/hide control unless essential
- [ ] Flash safety checked against WCAG 2.3.1 thresholds
- [ ] No layout-property animation (transform/opacity only)
- [ ] 60fps on mid-range device
- [ ] Motion tokens match design.md
- [ ] SSR/hydration behavior verified where applicable
