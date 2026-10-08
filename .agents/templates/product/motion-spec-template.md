---
purpose: Motion specification — the developer-ready motion document produced by @product-designer (Ivy) when motion is in scope. Contains the motion voice, tokens, choreography, and one complete motion prompt per animation.
audience: @developer, @qa-engineer, @tech-lead
paired_with: design.md (motion tokens merge here), motion-research.md (evidence)
---

# {Feature Name} — Motion Specification

> **When an input does not exist yet, do not default it.** Brand palette, typeface, tier names,
> prices, and domain constants are frequently absent from a brief — especially on a creative
> track where the brief is two sentences. Inventing a tasteful purple is the generic-default
> failure this whole gate exists to catch, and it is worse than admitting the gap.
>
> | State | Write | Never |
> |---|---|---|
> | Known | the value, with its source | — |
> | Guessed but immaterial to motion | the value, tagged `provisional` | present it as decided |
> | Unknown **and motion depends on it** | `pending-brand` + a question for the owner | a default |
>
> The test for the third row is sharp: **would a different value change this motion?** If MO-###'s
> reduced-motion fallback needs a defined end-state colour, that colour is a blocker — the motion
> cannot be implemented without it. If it only affects a background hue nobody animates, it is
> provisional. Say which, per value. Recording *why* it is a blocker is part of the deliverable.

## Overview
- **Motion scope:** {feature list where motion applies}
- **Research reference:** `artifacts/output/02-research/motion-research.md`
- **Evidence mode:** {full | partial | lightweight} — **how much** research happened. `partial` means
  some track artifacts landed and others did not; use it rather than claiming `full` or
  downgrading to `lightweight`.
- **Research provenance:** {delegated | single-session} — **who produced it**. Required when
  evidence mode is `full` or `partial`; omit for `lightweight`.

  **These are two fields because they are two questions.** The accessibility sign-off is waived
  on `provenance: single-session` — i.e. there was no `@ux-researcher` to sign off — and never on
  the extent label. A `partial` run that *did* delegate keeps its sign-off.
- **User stories:** `artifacts/output/03-strategy/user-stories.md` — **this file is a hard gate
  dependency, not a reference.** `motion_spec_check.js` fails unless every `MO-###` below is
  named in it. Traces are checked in BOTH directions: a prompt with no `Associated stories:` is a
  spec-side orphan, and a prompt no `US-###` mentions is a story-side silent drop.
- **Motion voice:** {1-2 sentence description of the motion personality — playful/calm/precise/dramatic}

## Motion voice (brand-level)
- {how the motion personality expresses itself across easing, duration, and choreography}
- {the ONE signature motion moment of the product}

## Motion tokens (also merged into design.md)

> **Every token below is a default, not a deliverable.** In the credibility register a spring and
> a 700–1000 ms "cinematic" entrance are persuasion applied to someone who came to verify — a blind
> run deleted both and recorded why. **Omit any token the register does not want and say so:**
>
> ```
> (omitted: --ease-spring, --dur-epic — no delight or cinematic device on a technical surface)
> ```
>
> An empty token table with a stated reason is correct. A table populated with tokens nobody uses
> is a style guide copied by reflex.
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

> **`Asset:` is mandatory on every prompt.** Use an `AS-###` ID from `motion-assets.md`, a
> direct repo path, or the literal `none`. **Describe nothing** — a prompt reading "a hero
> model, to be decided" fails the asset gate, because the implementer cannot tell which bytes
> to load. Allocate the `AS-###` IDs here; Phase 3b then documents their route, source,
> licence, and fallback. Do the reverse and you cannot pass either gate.
>
> **`Composited exception:` is for any property that does not force layout** — not a closed list.
> `stroke-dashoffset`, `stroke-width`, `clip-path`, `d` are the common cases, but the test is one
> question: *does animating this force layout or a paint pass?* If no, it belongs here. If yes
> (`height`, `width`, `top`/`left`/`right`/`bottom`, `margin`, `padding`, `filter`, `box-shadow`),
> it does not, and the gate will fail it. `motion_spec_check.js` **enforces** this line, so a
> prompt animating a non-standard property without it will not pass.

### Motion Prompt: MO-001 — {name}
**Trigger:** {user action / state change / system event}
**Target:** {element/component per design.md}
**Asset:** {AS-### from motion-assets.md | a direct repo path | "none"}
**Composited exception:** {property — why it is not layout-triggering — or omit}
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
