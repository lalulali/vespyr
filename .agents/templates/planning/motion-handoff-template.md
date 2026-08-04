---
purpose: Explicit handoff from the motion design preflow to the standard development and QA workflows.
paired_with: ../product/motion-spec-template.md, execution-plan.md
---

# {Feature Name} - Motion Implementation Handoff

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
- [ ] Only `transform` and `opacity` are animated; no layout properties, filters, or other animated properties are present.
- [ ] Performance evidence is captured on a mid-range device.
- [ ] Motion tokens match `design.md`; SSR/hydration behavior is covered where applicable.

## Handoff gate
- [ ] `@ux-researcher` signed off on accessibility for a full motion pipeline.
- [ ] `@tech-lead` added these tasks to `execution-plan.md`.
- [ ] `/develop` is the next workflow; `/motion` must not implement runtime code.
