---
name: motion
description: Orchestrates motion research, motion specification, and an explicit handoff to the standard development workflow for animation-significant products. Use this skill whenever the user mentions motion design, animation, transitions, micro-interactions, motion spec, motion prompts, animated UI, or an animation-heavy surface. Knowledge lives in .agents/references/motion/ and is loaded on demand, never inline.
metadata:
  version: "1.0"
  last_updated: "2026-08-04"
---

# Motion — Motion Design & Implementation Workflow

## What this skill does

Runs the motion **design preflow**: **motion research → motion spec → implementation handoff**. It is the single entry point for motion planning and coordinates the research and design agents without duplicating the standard `/develop` and `/test` workflows. All domain knowledge lives in on-demand references so context loading stays efficient.

**Previous skill:** `design` (produces the product spec + design.md that motion extends)
**Next skill:** `develop` (owns implementation, code review, and runtime QA after the handoff)

## When to use

- "Add motion/animations/transitions to this product"
- "Create the motion spec / motion prompts for this feature"
- "Which animation library should we use?" (delegates tech research to @researcher)
- Motion is a differentiator of the product (games, marketing sites, animation-heavy apps)

## When NOT to use

- Products with a handful of trivial hovers → just let @developer use CSS transitions inside `/develop`; no skill invocation needed.
- Static-only products → skip entirely.
- Persona-level customization of Ivy or Rex → use `/customize-agent`.

## Prerequisites

- [ ] `artifacts/output/03-strategy/product-spec.md` and `design.md` exist (from `/design`), OR the user provides the screens/features in scope.
- [ ] Agent references exist (they do — this is a curated skill):
  - `.agents/references/motion/motion-design-guidelines.md` (Ivy)
  - `.agents/references/motion/motion-implementation-guidelines.md` (Rex)
  - `.agents/references/motion/motion-research-guide.md` (researcher / ux-researcher)
- [ ] Template: `.agents/templates/product/motion-spec-template.md`
- [ ] Handoff template: `.agents/templates/planning/motion-handoff-template.md`

---

## Workflow

### Phase 1: Scope check (gate)

Determine whether full motion treatment is warranted:

- **Full pipeline** — motion is a differentiator, or the feature set has 5+ animated surfaces, or scroll/3D/canvas motion is involved.
- **Lightweight** — only micro-interactions and transitions. Run Phase 3 only (spec, no dedicated research phase). Ivy loads the design guidelines and produces the motion spec directly.
- **None** — no motion in scope. Stop and report; do not manufacture work.

**State machine:** run:
```bash
node .agents/scripts/orchestrator_state.js status
node .agents/scripts/orchestrator_state.js next
```
Confirm the current phase expects research, strategy, or planning work before proceeding. Do not start implementation from this skill.

### Phase 2: Motion research ⟨parallel - full pipeline only⟩

Delegate to `@researcher` and `@ux-researcher`, each instructed to load `.agents/references/motion/motion-research-guide.md` first.

- `@researcher` → competitive motion language + animation tech/library landscape. Outputs:
  - `artifacts/output/02-research/motion-competitive.md`
  - `artifacts/output/02-research/motion-tech-landscape.md`
- `@ux-researcher` → perceived performance, cognitive load, accessibility/vestibular evidence, platform motion patterns. Outputs:
  - `artifacts/output/02-research/motion-usability.md`
  - `artifacts/output/02-research/motion-accessibility.md`
  - `artifacts/output/02-research/motion-patterns.md`
- After all five track artifacts exist, `@researcher` owns the merge and writes `artifacts/output/02-research/motion-research.md`, with attributed sections, source list, and a decision summary for Ivy and Rex. The spec gate cannot open until this merged artifact exists.

Record completion for each research artifact:
```bash
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/motion-competitive.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/motion-tech-landscape.md
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/motion-usability.md
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/motion-accessibility.md
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/motion-patterns.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/motion-research.md
```

### Phase 3: Motion spec (Ivy)

Invoke `@product-designer` with instructions to load `.agents/references/motion/motion-design-guidelines.md` and produce the motion spec from the motion research.

Ivy outputs:
- `artifacts/output/03-strategy/motion-spec.md` — motion voice, tokens, choreography rules, and one complete motion prompt per animation (per `.agents/templates/product/motion-spec-template.md`)
- Motion tokens merged into `artifacts/output/03-strategy/design.md`

**Gate check — spec is only "done" when:**
- [ ] Every motion prompt has explicit duration, easing, from→to, reduced-motion fallback
- [ ] Reduced-motion plan is complete (mandatory, non-skippable)
- [ ] Every motion traces to a user story (zero orphans)
- [ ] Full pipeline: `motion-research.md` exists and each recommendation is cited
- [ ] Lightweight pipeline: `Evidence mode: lightweight` records existing evidence and why dedicated research was not warranted
- [ ] Accessibility authority: `@ux-researcher` signs off on the motion accessibility plan for full pipelines

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 03-strategy/motion-spec.md
```

### Phase 4: Implementation handoff (tech lead)

`/motion` does not implement or QA runtime code. Invoke `@tech-lead` to create `artifacts/output/05-planning/motion-handoff.md` from `.agents/templates/planning/motion-handoff-template.md` and add the motion work to the approved `execution-plan.md`.

The handoff must identify:
- The exact `motion-spec.md` and `design.md` inputs
- Every `MO-###` implementation task and its user-story reference
- The chosen library/framework, or the explicit research task Rex must complete before choosing one
- The motion-specific QA gates below

Record the handoff only after the file exists:
```bash
node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact 05-planning/motion-handoff.md --next "/develop: implement motion tasks"
```

The handoff is the completion boundary for `/motion`. `/motion` must not implement runtime code or certify it: `/develop` is the only workflow allowed to implement the framework, and `/test` or the `/develop` quality gate is the only workflow allowed to certify runtime behavior.

### Phase 5: Implementation and QA contract

Pass this contract to `/develop` and `@qa-engineer`; do not execute it twice in `/motion`:
- [ ] Every `MO-###` maps to one spec prompt, one user story, one implementation reference, and one QA assertion
- [ ] Timing is verified within the spec's numeric tolerance (default `±16ms`, unless the prompt documents another tolerance)
- [ ] Trigger, keyboard focus, hover, and state-transition behavior are verified
- [ ] Reduced-motion behavior is tested with `prefers-reduced-motion: reduce`
- [ ] Informational motion has a persistent non-motion equivalent
- [ ] Auto-moving content lasting more than five seconds has pause/stop/hide control unless essential
- [ ] No flash exceeds WCAG 2.3.1 thresholds; non-essential interaction-triggered animation is disableable unless essential, per WCAG 2.3.3
- [ ] Only `transform` and `opacity` are animated (no layout properties, filters, or other animated properties); 60fps evidence exists on a mid-range device
- [ ] Motion tokens match `design.md`; SSR/hydration behavior is verified where applicable
- [ ] Heavy runtimes are lazy-loaded and autoplay loops have a kill switch

---

## Output artifacts

- `artifacts/output/02-research/motion-research.md` (+ per-agent research files)
- `artifacts/output/03-strategy/motion-spec.md`
- `artifacts/output/05-planning/motion-handoff.md`
- Motion tokens in `artifacts/output/03-strategy/design.md`
- Implementation: motion framework + `MO-###` components (owned by `/develop`)

## Handoff

When the motion handoff exists, `/motion` is complete. The normal `/develop` → `/test` flow then continues and owns implementation and runtime certification. Write the session summary before closing:
```
@memory-controller session-write
Worked on: Motion pipeline — {feature}
Decisions made:
- {motion voice / tokens decided}
- {library / framework approach}
- {reduced-motion plan}
Next step: Run `/develop` using `05-planning/motion-handoff.md`; its quality gate invokes `/test` for runtime certification.
New blockers: {none or list}
```

---

## State machine integration

At start: `node .agents/scripts/orchestrator_state.js status` then `next`.
At each preflow phase, record completion as shown above, attributed to the producing agent. Do not record implementation or QA completion from this skill; those belong to `/develop` and `/test`.

---

## Anti-patterns

- Inlining motion knowledge into SKILL.md — it belongs in `.agents/references/motion/`, loaded on demand.
- Skipping the reduced-motion plan — the motion spec is never "done" without it.
- Running research when motion is lightweight (micro-interactions only) — Phase 2 is full-pipeline only.
- Treating lightweight motion as research-free — record the evidence exception in the spec.
- Letting Rex improvise timing — every prompt must be fully specified or flagged back to Ivy.
- Implementing from `/motion` directly — create the handoff and continue through `/develop`.
- Choosing a library by habit — the decision tree and `motion-tech-landscape.md` drive the choice.
