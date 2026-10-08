---
purpose: Explicit handoff from the motion design preflow to the standard development and QA workflows.
paired_with: ../product/motion-spec-template.md, execution-plan.md
---

# {Feature Name} - Motion Implementation Handoff

## Library decisions (cross-cutting — record the reasoning, not just the name)

The per-task `Library/framework` column below is a label. The decisions that actually go wrong
are cross-cutting: one scroll driver, one RAF loop, one reduced-motion story. Record them here.

| Decision | Chosen | Rejected + why | Licence/cost position | Wiring that must not drift |
|---|---|---|---|---|
| Scroll driver | {Lenis / GSAP ScrollSmoother / native} | {option — reason} | {MIT / free-for-commercial} | {e.g. `lenis.on('scroll', ScrollTrigger.update)` + `lagSmoothing(0)`} |
| 3D / canvas | {Three.js WebGLRenderer / WebGPURenderer / none} | {} | {} | {} |
| Component animation | {Motion / Framer / GSAP / CSS} | {} | {} | {} |
| Video | {none / file + budget} | {} | {} | {} |

**Checklist for this table:**
- [ ] Exactly **one** scroll-smoothing library. Running two is the most common Lenis+GSAP bug.
- [ ] Any canvas/3D layer renders from the **same** RAF tick, not its own loop.
- [ ] GSAP plugins installed from the public `gsap` package — no Club paywall, no GreenSock token.
- [ ] Lenis `respectReducedMotion` left at its default `true`.
- [ ] If the library choice is deferred to `@developer`, that is written here as an explicit
      research task with the decision criteria — not left as a blank cell.

## Source artifacts
- **Motion spec:** `artifacts/output/03-strategy/motion-spec.md`
- **Design system:** `artifacts/output/03-strategy/design.md`
- **Motion research:** `artifacts/output/02-research/motion-research.md` or documented lightweight evidence exception
- **Execution plan:** `artifacts/output/05-planning/execution-plan.md`

## Ownership
- **Implementation:** `@developer` (Rex), through `/develop`
- **Runtime QA:** `@qa-engineer` (Nina), through `/develop` quality gates or `/test`
- **Accessibility decision authority:** `@ux-researcher` (Zara)

## Implementation tasks
| Motion ID | User story | Component/surface | Implementation task | Library/framework | Owner |
|---|---|---|---|---|---|
| MO-001 | US-{NNN} | {component} | {task} | {CSS / Framer / GSAP / Rive / other} | @developer |

## Required QA evidence
- [ ] Every `MO-###` maps to a spec prompt, user story, implementation reference, and QA assertion.
- [ ] Timing is within the prompt's numeric tolerance; default is `±16ms`.
- [ ] Trigger, keyboard focus, hover, and state-transition behavior are verified.
- [ ] Reduced-motion behavior is verified with `prefers-reduced-motion: reduce`.
- [ ] Informational motion has a non-motion equivalent.
- [ ] Auto-moving content lasting more than five seconds has pause/stop/hide control unless essential.
- [ ] Flashing is checked against WCAG 2.3.1 thresholds.
- [ ] Non-essential interaction-triggered animation can be disabled unless essential, per WCAG 2.3.3.
- [ ] Only `transform` and `opacity` are animated — **or** a property carrying a `Composited exception:` in the spec, which must be non-layout-triggering and carry its own no-reflow assertion. No layout properties, no `filter`, no paint-forcing properties.
- [ ] Performance evidence is captured on a mid-range device.
- [ ] Motion tokens match `design.md`; SSR/hydration behavior is covered where applicable.

## Handoff gate
- [ ] `@ux-researcher` signed off on accessibility for a full motion pipeline.
- [ ] `@tech-lead` added these tasks to `execution-plan.md`.
- [ ] `/develop` is the next workflow; `/motion` must not implement runtime code.
