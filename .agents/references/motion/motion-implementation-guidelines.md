# Motion Implementation Guidelines — @developer (Rex)

> **When to load:** This file is loaded ONLY when the task involves implementing motion/animation (motion spec exists, or the task mentions transitions/animations). It is intentionally NOT part of the base persona to keep initiation tokens low.
>
> **Ownership:** You (Rex) own the motion *framework and code*. @product-designer (Ivy) owns the motion *spec* — implement the `motion-spec.md` motion prompts verbatim (durations, easings, choreography, reduced-motion fallbacks). Do not improvise timing; if a prompt is under-specified, ask Ivy.
>
> **Research first (when needed):** if a library choice, technique, or performance strategy is uncertain, delegate implementation research to `@researcher` per `motion-research-guide.md`. Do not pick a library by habit.

---

## 1. Library Decision Tree

Choose the motion tool by what is being animated — not by preference.

```
Is the motion smooth scrolling / page scroll kinetics?
└── Lenis (lightweight, touch-normalized scroll physics, syncs with GSAP/Framer)

Is it complex timeline choreography, SVG morphing, or scroll-scrubbed motion?
├── Heavy timelines, ScrollTrigger, layout morphing → GSAP
├── Micro-sized JS animation engine for SVG/CSS/DOM → Anime.js
└── React layout animation, gesture physics, springs → Motion / Framer Motion

Is it component/UI micro-interaction & interactive primitives?
├── Micro-animations, unstyled primitives → Motion Primitives (Framer Motion)
├── Tactile button states & glow micro-interactions → Kokonut UI
├── Visual micro-animated cards & badge pulses → Bitlit UI
├── React background motion patterns & text reveals → React Bits
└── Pre-built visual design tokens & UI templates → OriginKit

Is it scroll/parallax/canvas/3D?
├── 3D WebGL scenes, custom shaders → Three.js / React Three Fiber (R3F)
├── High-volume particles / data-viz → Canvas 2D / Particle Shaders (particles.js)
├── Scroll-scrubbed timelines → GSAP ScrollTrigger or Motion useScroll/useTransform
└── Interactive canvas games → PixiJS / Phaser
```

**Default posture:** CSS transitions for anything below "delight" threshold. Lenis for smooth scroll kinetics. Motion / Framer Motion for React components mounting/unmounting or gesture physics. GSAP for complex timelines and scroll work. Three.js/R3F for 3D canvases. Never reach for a heavy library when a CSS transition or primitive is 5 lines.

---

## 2. Performance — The Non-Negotiables

Motion that janks is worse than no motion. These rules are enforced by review, not aspiration:

- **Animate `transform` and `opacity` ONLY.** Layout-affecting properties (`width`, `height`, `top`, `left`, `margin`, `padding`) force reflow on every frame → main-thread jank. If the design requires layout animation, use Framer Motion's `layout` prop (it defers to transforms) or animate `transform` with precomputed geometry.
- **Prefer the GPU-compositor:** `transform`/`opacity` changes are composited on the GPU thread when the element has its own layer. Promote layers via `will-change: transform` / `transform: translateZ(0)` — but only on elements that *actually animate*, and remove it after (a permanent `will-change` on 50 cards is a memory leak).
- **Budget:** keep animations to a total of **~40–60ms of main-thread work** on a mid-range device. Use DevTools Performance to confirm no long tasks (> 50ms) caused by the animation loop.
- **Respect the framerate:** 60fps target. If you can't hold 60 on a mid device, reduce motion (less parallel animation), not quality of easing.
- **No layout thrash in RAF loops:** read geometries once, batch writes. Never interleave `element.getBoundingClientRect()` with style writes inside a `requestAnimationFrame` callback.
- **Lazy-load heavy runtimes:** Framer Motion, GSAP, Rive, Lottie, Three all belong in a dynamic import / code-split chunk that only loads when a motion component mounts. Don't pay the parse cost on initial page load for a hero animation.
- **Autoplay discipline:** looping/autoplay motion is prohibited by the accessibility gate (see §4). If a design specifies a loop, flag it to Ivy — it needs a kill switch or reduced-motion path.
- **Scroll-triggered motion:** batch into a single intersection observer / scroll container; unsubscribe on unmount; no passive listeners that compute layout on scroll.

---

## 3. Framework Architecture

When motion is a first-class feature (not one-off animations), build a thin motion framework so timing stays consistent across the app:

```
src/motion/
├── tokens.ts          — duration + easing tokens mirrored from design.md motion tokens
│                        (e.g. durFast: 150, easeStandard: [0.16,1,0.3,1], spring: {stiffness:300, damping:30})
├── variants.ts        — reusable Framer Motion variants keyed by <MotionPromptID> (enter, exit, hover, tap)
├── useReducedMotion.ts — central prefers-reduced-motion hook (SSR-safe, memoized)
├── MotionProvider.tsx — (optional) theme context injecting tokens + reduced-motion flag
└── presets/           — per-component motion presets mapping motion-spec.md prompts to code
```

**Implementation contract with the motion spec:**
- **Token fidelity:** every duration and easing in code MUST come from the token module, which MUST match `design.md`/`motion-spec.md`. Hard-coded `transition={{ duration: 0.3 }}` scattered around the app = broken motion voice. Fail review if tokens don't match spec.
- **Motion prompt IDs:** prefix component variants/comments with the spec's `MO-###` IDs so QA can trace code → spec → user story.
- **Reduced motion first-class:** build the reduced-motion path into every motion component, not as an afterthought. One `useReducedMotion()` hook, every animated component branches on it. `MotionConfig reducedMotion="user"` (Framer Motion) covers most cases at the provider level.
- **SSR safety:** no `window.matchMedia` on the server; guard all motion hooks for hydration. Framer Motion handles this via `useReducedMotion`; CSS `@media (prefers-reduced-motion: reduce)` handles the CSS tier.
- **Testing motion:** unit-test timing constants (tokens match spec), not animation frames. Cover the reduced-motion branch in component tests. Use `jest.useFakeTimers`/`advanceTimersByTime` for transition assertions, or Playwright with reduced-motion emulation for integration. Visual regression (screenshots at end-state) catches "animation never settles."
- **No motion framework at all?** If the product has < 10 animated surfaces, skip the framework: a `motion.ts` token file + a `useReducedMotion` hook + CSS transitions is sufficient. Add the provider structure only when motion becomes systemic (per the Simplicity First principle).

---

## 4. Accessibility Implementation (Gate)

Every motion feature MUST respect the accessibility gate. Implement, don't debate:

- **CSS tier:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- **JS tier (Framer Motion):** `<MotionConfig reducedMotion="user">` at the root — it disables transform animations for reduced-motion users while keeping opacity fades. Combine with a `useReducedMotion()` branch for behavior differences (e.g., instant state change vs. slide-in).
- **Cross-fade fallback:** reduced-motion path = opacity cross-fade ≤ 200ms or an instant state change — never a slide, spring, or parallax.
- **No autoplay loops** (pulsing, marquee, infinite shimmer) without a user-triggered kill switch. Parallax and scale > 1.2 are the highest vestibular risk — disable for reduced-motion.
- **QA hook:** expose a reduced-motion test mode (e.g., Playwright `page.emulateMedia({ reducedMotion: 'reduce' })`) and include a reduced-motion pass in the acceptance criteria of every motion story.

---

## 5. The Complete Motion Prompt — What "Done" Looks Like

A motion task is done when code traces 1:1 to the spec's motion prompt:

| Spec field | Code artifact |
|---|---|
| `MO-###` ID | Component variant/comment tagged `MO-###` |
| Trigger | Event handler / state transition that fires the variant |
| Target | The animated component |
| Properties | Only `transform`/`opacity` in the variant |
| From → To keyframes | Variant `initial` / `animate` (or keyframes) |
| Duration / Easing | Referenced from `tokens.ts`, must equal spec |
| Stagger / Choreography | `staggerChildren` / delays in variants |
| Follow-through | The settle variant (exit/shadow/checkmark) |
| Reduced-motion fallback | Branch on `useReducedMotion()` or provider config |
| Performance note | GPU-composited, no layout props, lazy-loaded runtime |

**DoD checklist for any motion task:**
- [ ] Every `MO-###` maps to one prompt, one user story, one implementation reference, and one QA assertion
- [ ] Timing is within the prompt's numeric tolerance (default `±16ms`, unless documented otherwise)
- [ ] Trigger, keyboard focus, hover, and state-transition behavior are verified
- [ ] Runs at 60fps on mid-range device (DevTools Performance confirmed)
- [ ] Only `transform`/`opacity` animated
- [ ] Tokens match `motion-spec.md` / `design.md` exactly
- [ ] Reduced-motion branch implemented and tested
- [ ] Informational motion has a persistent non-motion equivalent
- [ ] Auto-moving content lasting more than five seconds has pause/stop/hide control unless essential
- [ ] Flash safety checked against WCAG 2.3.1 thresholds
- [ ] SSR/hydration behavior verified where applicable
- [ ] Heavy runtime code-split / lazy-loaded
- [ ] No autoplay loops without kill switch
- [ ] Tests cover timing constants + reduced-motion branch
- [ ] Under-specified prompt → flagged back to Ivy, not improvised

---

## Anti-patterns

- Animating layout properties — jank (the #1 review failure).
- Hard-coded durations/easings that drift from the design tokens.
- Choosing a library by habit instead of the decision tree.
- Adding the full motion framework when 5 CSS transitions would do.
- Shipping springs on layout-critical elements → scroll jump.
- Looping/autoplay without reduced-motion handling or a kill switch.
- Improvising timing when the motion prompt is under-specified — ask Ivy.
- Loading Framer/GSAP/Rive in the main bundle for one hero animation.
