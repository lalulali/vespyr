# Motion Design Guidelines — @product-designer (Ivy)

> **When to load:** This file is loaded ONLY when motion is in scope for the current task (a product where animation is a differentiator, or a user request mentions motion/animation/transitions). It is intentionally NOT part of the base persona to keep initiation tokens low.
>
> **Ownership:** You (Ivy) own the motion *spec*. You produce `motion-spec.md` + motion tokens that extend `design.md`. @developer (Rex) owns the motion *framework and code* — your spec must give him a complete, unambiguous motion prompt, not a mood board.
>
> **Research first for full pipelines:** Before designing motion for a full pipeline, delegate motion research to `@researcher` and `@ux-researcher` per `motion-research-guide.md`. Lightweight motion may use existing product evidence, but the spec must record its evidence mode and why dedicated research was not warranted. Do not guess accessibility thresholds from taste.

---

## 1. The 12 Principles of Animation — Mapped to UI

The classic Disney principles are the vocabulary of motion. Each has a direct UI application.

| # | Principle | UI application |
|---|---|---|
| 1 | **Squash & Stretch** | Tactile feedback — buttons compress on press and rebound (scale 0.96 → 1.04). Icons squash on tap. Conveys materiality and weight. |
| 2 | **Anticipation** | The "wind-up" before an action — a card raises slightly before it lifts, a modal scales up 1.02 before it animates in. Prepares the eye, makes the action read as deliberate. |
| 3 | **Staging** | Direct attention — a highlighted element enters last and largest; dim or desaturate non-essential elements so the eye lands on the action. |
| 4 | **Straight Ahead & Pose to Pose** | For complex sequences, define key poses first, fill in-betweens after. In UI: define the start/end frames and critical midpoints, then interpolate. Never freehand timing. |
| 5 | **Follow Through & Overlapping** | Elements don't stop together — a modal stops, but the shadow/backdrop settles a few ms later. Text and its container overlap motion (container moves, content drifts in slightly behind). |
| 6 | **Slow In & Slow Out** | Nothing moves linearly. Real objects accelerate and decelerate. Maps directly to easing curves (Section 2). |
| 7 | **Arcs** | Motion follows curved paths, not straight lines. Cards that move diagonally should ease off-axis. Notifications that drop in should follow a slight arc, not a rigid line. |
| 8 | **Secondary Action** | The supporting motion that enriches the primary — a checkmark draw-in after a successful submit, a subtle shadow shift that reinforces a lift. Secondary actions must never distract. |
| 9 | **Timing** | Duration communicates weight and meaning (Section 3). The gap between anticipation and action is what sells believability. |
| 10 | **Exaggeration** | Push expression past realism for emphasis — error states shake harder, empty states drift slower and emptier. Amplify the emotional signal of the state. |
| 11 | **Solid Drawing** | The element must read correctly at every frame — in UI this is layout stability: no jank, no text reflow mid-animation, no clipped shadows. Animate transform/opacity only. |
| 12 | **Appeal** | Motion should feel alive and intentional, not mechanical. The signature — your product's motion "voice." Consistency of easing and duration across all surfaces is what creates appeal. |

**Rules extracted from the principles:**
- Animate `transform` and `opacity` only. Never `width`, `height`, `top`, `left`, `margin` (forces layout reflow → jank, violates Solid Drawing).
- Every animation needs: anticipation (start) + main action + follow-through (settle). The settle is what feels "designed."
- Two or more simultaneous animations on the same element = noise. One primary, everything else secondary.

---

## 2. Timing Curves (Easing) — The Motion Grammar

Easing is the fingerprint of your product's motion. Define it as tokens, use it everywhere.

### Easing taxonomy

| Curve | Cubic-bezier (approx) | Feels like | Use for |
|---|---|---|---|
| **Linear** | `cubic-bezier(0,0,1,1)` | Mechanical, robotic | Progress bars, marquees, scrubbing. Never for UI transitions. |
| **Ease-in** | `cubic-bezier(0.42,0,1,1)` | Heavy, accelerating, gravity | Elements exiting the screen (falling away). |
| **Ease-out** | `cubic-bezier(0,0,0.58,1)` | Fast start, gentle landing | Elements entering (arrive and settle). Default for most UI entry. |
| **Ease-in-out** | `cubic-bezier(0.42,0,0.58,1)` | Neutral, symmetric | Panels, overlays, transitions between two persistent states. |
| **Spring** (Framer Motion) | Physical spring `{stiffness, damping, mass}` | Elastic, organic | Delight moments, list reordering, drag physics. |
| **Custom deceleration** | e.g. `cubic-bezier(0.16,1,0.3,1)` | Expressive, premium (Apple-style) | Hero elements, marketing motion, "designed" feel. |

### The three easing zones (per-screen rule)

Every screen should have a dominant easing so motion feels like one voice:

1. **Micro-interactions & hover** — fast, punchy: `150ms` ease-out or a quick spring.
2. **Navigation & transitions** — medium: `250–350ms` ease-in-out or deceleration curve.
3. **Hero / brand / cinematic** — slow, deliberate: `500–800ms` premium curve.

**Rule:** pick ONE signature curve per zone and standardize it as a token (`--ease-standard`, `--ease-exit`, `--ease-spring`). A screen with five different easing curves reads as broken, not expressive.

### Spring tuning defaults (Framer Motion)

- `{ type: "spring", stiffness: 300, damping: 30 }` — neutral, safe default
- `stiffness > 400` — snappy, tactile
- `damping < 15` — bouncy, playful (use sparingly)
- **Never use springs for layout-critical elements** — they can overshoot and cause scroll jumps.

---

## 3. Duration Scale (Timing Tokens)

Duration must be proportional to the distance travelled and the importance of the moment.

| Token | Duration | Typical use |
|---|---|---|
| `--dur-fast` | 100–150ms | Hover, press feedback, toggles, checkmarks |
| `--dur-base` | 200–350ms | Panel slide-in, accordion, fade transitions, snackbars |
| `--dur-slow` | 400–600ms | Page-level transitions, modals, hero entrances |
| `--dur-epic` | 700–1000ms | Cinematic entrances, onboarding, celebratory states |

**Rules:**
- **≤ 350ms** for anything a user triggers repeatedly (buttons, tabs, hovers). Over-animated controls feel laggy.
- **Reduce duration by 50%** for hover/press feedback vs. the same element's enter animation.
- **The 400ms attention window:** anything longer than ~400ms reads as a "moment," not a transition — reserve it for states you want the user to notice.
- Duration and easing must be specified per motion — never leave them implicit in a motion prompt.

---

## 4. Choreography & Staging

Choreography is *when* and *in what order* things move — it's where motion design earns its keep.

### Sequencing rules
- **One leader, followers:** one element leads the transition; others follow with a 30–80ms stagger. Random simultaneous motion = chaos.
- **Stagger pattern:** `staggerChildren` — 30ms for lists, 60–100ms for heavier cards. The first child should be the most important one.
- **Direction consistency:** elements entering should all come from a shared spatial logic — a drawer from the edge it lives on, a modal from center, content pushes forward (+z). Pick a spatial metaphor and never violate it.
- **Follow-through order:** backdrop → container → content → decorative accent. The last element to settle is the one you want noticed.

### Choreography by intent
- **Wayfinding:** motion must tell the user *where they are* and *where they're going*. Forward navigation pushes content left; back navigation slides it right. Tabs underline slides toward the active state — never fades in a new one.
- **Feedback:** action → result must be contiguous. A button press resolves into the confirmation state (checkmark draw = follow-through), not a disconnected toast 200ms later.
- **Delight:** surprise accents reserved for rare, positive moments — achievements, first-run, empty states. Delight that fires on every interaction becomes noise (Exaggeration, applied badly).

---

## 5. Creative Motion Strategy (Out-of-the-Box Thinking)

Beyond "make it smooth" — motion as a strategic lever:

1. **Motion as brand voice:** define a motion "personality" (playful / calm / precise / dramatic) and encode it in easing + duration tokens. A premium product moves differently than a utility one. This is your `--ease-*` and `--dur-*` signature.
2. **Motion as wayfinding (above).** Used intentionally, motion replaces text labels — e.g., a list that "carries" the user's selection between screens.
3. **Motion as perceived performance:**
   - **Perceived speed:** use `ease-out` on content entry so it appears to arrive instantly, then settle — the eye reads it as faster than a slow ease-in that waits.
   - **Skeleton shimmer** communicates loading better than a spinner in 300ms+ states.
   - **Optimistic UI:** animate the result immediately, reconcile silently — motion sells responsiveness.
4. **Motion as emotional state:** empty states that animate slowly and emptily communicate "this is a quiet place" (or inversely, energetic bounces for a vibrant product). Error states should feel urgent but not panic-inducing.
5. **Context-aware motion (Rex collaboration):** propose *when to animate based on data* — e.g., first-time vs returning users get different entrances; reduced-motion users get the calm path. This is a spec-level decision you make, Rex implements.
6. **Avoid gimmick inflation:** each screen should have ONE signature motion moment. If a user can't tell you what moves, the design is over-animated.

---

## 6. Accessibility — Motion Cannot Be Done Without This

**Non-negotiable gate.** A motion spec without a reduced-motion plan is incomplete and must not ship.

- **`prefers-reduced-motion: reduce`** → replace motion with:
  - Cross-fades (≤ 200ms, opacity only) instead of slides/springs
  - Instant state changes for non-essential motion
  - No parallax, no autoplay loops, no continuous shimmer
- **Vestibular safety:** nothing may auto-animate continuously (pulsing, parallax-on-scroll, infinite marquees) without a kill switch or the reduced-motion path. Parallax and large-scale transforms (scale > 1.2) are the highest vestibular risk.
- **Autoplay discipline:** never auto-play looping motion when a user hasn't initiated it. Hover-triggered motion must not trigger on focus-only navigation in a way that disorients keyboard users. Automatically moving content that lasts more than five seconds and runs alongside other content needs a pause, stop, or hide mechanism unless essential.[^2]
- **Animation is decoration, not information:** any motion carrying information (e.g., "item added") must have a non-motion equivalent — a persistent icon, text, or state — for users with motion disabled.
- **WCAG 2.2 SC 2.3.1:** do not ship content that flashes more than three times in one second or exceeds the general/red flash thresholds.[^1] Avoid flash entirely; if a design includes it, QA must verify the full threshold, not only the frequency.
- **WCAG 2.2 SC 2.3.3:** non-essential animation triggered by interaction must be disableable unless it is essential to the functionality or information.[^3] This is a Level AAA criterion; the product's accessibility policy may require it even when the conformance target is lower.
- **Keyboard and focus:** define focus-visible behavior separately from hover behavior. A focus change must not cause disorienting movement, steal focus, or hide the focused control.
- **Every motion prompt for Rex must include:** the reduced-motion fallback behavior. State it explicitly, every time.

---

## 7. The Motion Prompt for Rex — Complete Recipe

Your deliverable is not "add some animation" — it is a **complete motion prompt** that leaves zero ambiguity for @developer. A complete prompt contains ALL of the following:

```
### Motion Prompt: <ID-MO-###> — <name>

**Trigger:** <user action / state change / system event that starts this motion>

**Target:** <element or component, referenced by design.md name/class>

**Property(ies):** <opacity | transform: translate/scale/rotate>
   (only transform + opacity — never layout properties)

**From → To (keyframes):**
   - 0%: <start pose, e.g. opacity 0, translateY(24px)>
   - 100%: <end pose, e.g. opacity 1, translateY(0)>

**Duration:** <ms>   **Easing:** <token or exact curve, e.g. --ease-standard / cubic-bezier(0.16,1,0.3,1)>

**Stagger/Choreography:** <if multi-element: leader, follower order, stagger interval>

**Secondary action / follow-through:** <settle behavior, shadow shift, checkmark draw, etc.>

**Reduced-motion fallback:** <cross-fade to opacity 0→1 ≤200ms, or instant state change>

**Keyboard/focus behavior:** <focus-visible behavior; hover-only behavior must not be required for keyboard users>

**Informational fallback:** <persistent text/icon/state that communicates the same meaning without motion>

**Autoplay control:** <not applicable, or pause/stop/hide mechanism and why any automatic motion is essential>

**Timing tolerance:** <default ±16ms, or a documented exception>

**Performance note:** <GPU-composited (transform/opacity only), no layout thrash, guard for scroll-jank>

**SSR/hydration note:** <not applicable, or how matchMedia/runtime state is guarded>

**Acceptance check:** <how @qa-engineer verifies: timing tolerance, reduced-motion coverage, no reflow>
```

Write one of these per motion. Group them by screen or interaction in `motion-spec.md`. Rex should be able to implement any single prompt with zero follow-up questions.

---

## 8. Output Contract

| Artifact | Location | Template |
|---|---|---|
| Motion spec (all prompts, choreography, tokens) | `artifacts/output/03-strategy/motion-spec.md` | `.agents/templates/product/motion-spec-template.md` |
| Motion tokens (easing, duration) merged into design system | `artifacts/output/03-strategy/design.md` | Use the `Motion` section |
| Motion research (full pipeline) | `artifacts/output/02-research/motion-research.md` | `motion-research-guide.md` |
| Lightweight evidence decision | `artifacts/output/03-strategy/motion-spec.md` | Record `Evidence mode: lightweight` |

Write files directly; route memory writes through `@memory-controller`. Motion spec must reference the user stories it satisfies (same bidirectional traceability rule as the product spec — `Associated Stories: US-###`).

---

## 9. Motion Technology Ecosystem & Benchmark Catalog

When crafting motion prompts (`MO-###`) for `@developer`, leverage this framework taxonomy to select the right execution engine for each surface:

| Ecosystem / Tool | Primary Strengths & Purpose | Motion Prompt Mapping |
|---|---|---|
| **Lenis** ([lenis.dev](https://lenis.dev/)) | Smooth scroll physics, touch normalization, velocity tracking | Specify `--scroll-mode: lenis` for page-level scroll kinetics and parallax sync. |
| **GSAP** ([gsap.com](https://gsap.com/)) | Timeline orchestration, ScrollTrigger, Flip morphing | Use for complex, multi-stage choreography and SVG shape morphing. |
| **Anime.js** ([animejs.com](https://animejs.com/)) | Micro-sized JS animation engine | Best for lightweight DOM property and SVG attribute animations. |
| **Motion / Framer Motion** ([motion.dev](https://motion.dev/)) | React layout animation (`layoutId`), gesture physics, springs | Default engine for component enter/exit, reordering, and gesture physics. |
| **Three.js & R3F** ([threejs.org](https://threejs.org/), [r3f.docs.pmnd.rs](https://r3f.docs.pmnd.rs/)) | Declarative 3D WebGL scenes, custom shaders | Use for 3D hero interactions, interactive product models, and spatial canvases. |
| **Canvas Particle Shaders** ([particles.js](https://vincentgarreau.com/particles.js/)) | Generative background particles, interactive fields | Specify GPU-accelerated canvas backdrops for interactive state visualizers. |
| **Kokonut UI** ([kokonutui.com](https://kokonutui.com/)) | Interactive UI component micro-interactions | Reference for tactile button states, input glows, and smooth component transitions. |
| **Bitlit UI** ([bklitui.com](https://bklitui.com)) | Micro-animated visual UI components | Reference for animated cards, badge pulses, and dynamic notification panels. |
| **React Bits** ([reactbits.dev](https://reactbits.dev/)) | Animated React patterns & background effects | Reference for kinetic text reveals, card tilt effects, and animated background grids. |
| **Motion Primitives** ([motion-primitives.com](https://motion-primitives.com/)) | Framer Motion powered unstyled UI primitives | Reference for accessible animated modals, tabs, accordions, and popovers. |
| **OriginKit** ([originkit.dev](https://originkit.dev/)) | High-quality UI component primitives & motion assets | Reference for production-grade UI design system tokens and motion blueprints. |
| **Motion Sites** ([motionsites.ai](https://motionsites.ai/)) | AI motion site inspiration & layout references | Benchmark reference for modern scroll-driven web experiences. |
| **Manus** ([manus.im](https://manus.im/)) | Benchmark for agentic UI & glassmorphic motion | Benchmark reference for fluid, multi-agent spatial product experiences. |

---

## Anti-patterns

- Animating layout properties (`width/height/top/left/margin`) — jank, violates Solid Drawing.
- More than one signature motion per screen — gimmick inflation.
- Five different easing curves per screen — no motion voice.
- Springs on layout-critical elements — scroll jumps from overshoot.
- Looping/autoplay motion without reduced-motion handling — vestibular risk.
- Motion prompts without explicit duration, easing, and reduced-motion fallback — incomplete deliverables.
- Choosing motion purely by taste without delegating research first — violates the research-backed principle.

[^1]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.3.1: Three Flashes or Below Threshold," W3C WCAG 2.2 Understanding Docs, accessed 2026-08-04. https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
[^2]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.2.2: Pause, Stop, Hide," W3C WCAG 2.2 Understanding Docs, accessed 2026-08-04. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
[^3]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.3.3: Animation from Interactions," W3C WCAG 2.2 Understanding Docs, accessed 2026-08-04. https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
