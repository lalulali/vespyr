# Motion Research Guide — @researcher (Iris) & @ux-researcher (Zara)

> **When to load:** This file is loaded ONLY when the current task involves motion/animation research (delegated by `@product-designer` or `@developer` via the `/motion` skill). Keep the base persona lean — this is an on-demand reference.
>
> **Ownership:** You produce evidence that motion design and implementation decisions can be traced to. `@researcher` owns the merge after both research tracks complete and writes `artifacts/output/02-research/motion-research.md` directly. The merged artifact is consumed by @product-designer (Ivy) for the motion spec and @developer (Rex) for the motion framework.

---

## 1. Division of Labor

| Agent | Owns in motion research |
|---|---|
| `@researcher` | Market/competitive motion landscape, animation technology/library landscape, motion trends in the product's genre, motion-related performance evidence |
| `@ux-researcher` | User perception and usability of motion: perceived performance, cognitive load, motion preferences, vestibular/accessibility evidence, established interaction motion patterns |

Run the two tracks in parallel. Do not merge until all five track artifacts exist. Then `@researcher` merges findings into one `motion-research.md` with each section attributed to its producing agent, a source list, and a decision summary.

---

## 2. Research Questions — @researcher (Market & Tech)

### Market / competitive motion language
- What is the *motion language* of the leading products in our genre? (How do they enter screens, confirm actions, signal state?)
- What motion conventions do users already expect in this category? (e.g., mobile apps use bottom sheets + drag-to-dismiss; if our product violates the spatial metaphor, users get confused.)
- Which competitors use motion as a brand differentiator vs. pure utility? What are the white-space opportunities (motion no one in the category is doing)?
- Are there any *anti-patterns* in competitor motion we should avoid (over-animation, laggy interactions, gimmicks)?

### Technology / library landscape (for @developer)
- Which animation technologies fit the product's stack and are actively maintained? (Framer Motion, GSAP, Rive, Lottie, CSS/Web Animations API, Three.js, WebGL.)
- Bundle-size and performance implications of each (KB cost, GPU usage, mobile mid-range behavior).
- Ecosystem health: maintenance status, community size, breaking-change cadence, SSR/React version compatibility.
- Proven patterns for the specific feature type (e.g., scroll-driven animations, drag/reorder, canvas data-viz).

### Deliverables (attributed to @researcher)
- `motion-competitive.md` — competitor motion language matrix + white-space opportunities + anti-patterns
- `motion-tech-landscape.md` — library comparison (fit, size, perf, maintenance) with a recommendation, feeding Rex's decision tree

---

## 3. Research Questions — @ux-researcher (User & Usability)

### Perceived performance
- What does the evidence say about how motion affects *perceived* speed/quality? (e.g., ease-out entry reads faster; skeleton screens beat spinners past ~300ms; optimistic UI feels faster than waiting.)
- What duration/easing ranges do users perceive as "instant," "natural," "slow," "laggy"? Translate into design guidance Ivy can tokenize.
- Which moments matter most for perceived performance (initial load, page transition, action confirmation)?

### Cognitive load & comprehension
- How much simultaneous motion can users parse before it becomes noise? What's the evidence on multi-element choreography and attention?
- Does motion improve or impair wayfinding and spatial memory in our product's task flows?
- Motion as *meaning*: which transitions help users understand state (what happened, where am I, what's next) vs. which distract?

### Accessibility & inclusivity
- `prefers-reduced-motion` prevalence data and the demographic reality (motion sensitivity, vestibular disorders — estimate of affected users).
- Vestibular risk factors: which animation types (parallax, large-scale transforms, continuous loops) are highest risk and must be gated.
- What the WCAG 2.2 motion requirements (SC 2.2.2 Pause/Stop/Hide, SC 2.3.1 Three Flashes or Below Threshold, and SC 2.3.3 Animation from Interactions) require and how to meet them.
- Established inclusive-motion practice (e.g., the "motion onion" / reduce-vs-remove tiers: cross-fade, then no transform, then nothing).

### Interaction motion patterns (established UX patterns)
- Platform conventions: iOS HIG and Material Design motion guidelines for the interaction types in scope (bottom sheets, modals, navigation transitions, list reorder).
- When the platform pattern is the *safer* choice vs. when a bespoke motion would be more on-brand — evidence-backed recommendation.

### Deliverables (attributed to @ux-researcher)
- `motion-usability.md` — perceived performance evidence, cognitive-load findings, motion-as-meaning guidance
- `motion-accessibility.md` — reduced-motion prevalence, vestibular risk map, WCAG requirements, inclusive-motion tiers
- `motion-patterns.md` — platform conventions mapped to our interaction types

---

## 4. Method & Sourcing Standards

- **Cite everything** per the Citation Protocol — motion claims from UX literature, platform guidelines, WCAG, or accessibility organizations MUST carry sources. Never fabricate a study. If no source exists, say "Source: unverified."
- **Prefer primary sources:** official platform guidelines (Apple HIG, Material Design motion), W3C/WCAG, peer-reviewed UX/psychology research (e.g., perceived performance studies), and reputable motion-design references.
- **Competitive analysis:** examine live products (or documented motion systems) — record observable behaviors, not vibes. A matrix of "competitor × interaction type × motion behavior" is the deliverable shape.
- **Synthesize for decisions:** end every section with a "**So what for our product:**" line — a concrete recommendation Ivy/Rex can act on, not a literature dump.

---

## 5. Output Contract

| Artifact | Produced by | Consumed by | Location |
|---|---|---|---|
| `motion-research.md` (merged, with attribution) | @researcher after both tracks complete | Ivy (spec), Rex (framework) | `artifacts/output/02-research/motion-research.md` |
| `motion-competitive.md` + `motion-tech-landscape.md` | @researcher | Ivy + Rex | `artifacts/output/02-research/` |
| `motion-usability.md` + `motion-accessibility.md` + `motion-patterns.md` | @ux-researcher | Ivy | `artifacts/output/02-research/` |

Write files directly; route memory writes through `@memory-controller`. Record each track artifact, then record the merged artifact as `@researcher` via the `/motion` skill's orchestrator commands. A full motion pipeline cannot proceed to Ivy until the merged artifact is complete.

---

## Anti-patterns

- Writing opinions as if they were findings — every claim needs a source or "Source: unverified."
- Researching everything except what the product needs — focus on the genre and the interaction types in scope.
- Dumping literature without a "so what for our product" recommendation.
- UX-researcher doing market/tech landscape (or vice versa) — keep the division of labor.
- Skipping the accessibility track — a motion spec built without vestibular/reduced-motion evidence is incomplete.
