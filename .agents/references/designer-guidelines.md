# Designer Reference & Systems Toolkit — `@product-designer` (Ivy)

> **Purpose:** Comprehensive visual design, interaction, typography, motion, SVG graphic rendering, and accessibility reference guide for Ivy (`@product-designer`) and the Vespyr multi-agent swarm.
>
> **Usage:** Loaded during Phase 3 (Strategy & Design) when selecting visual design directions, typography foundries, component libraries, motion engines, graphic rendering tools, and accessibility standards.

---

## 1. Motion Design & Animation Ecosystem

Motion is not decoration — it is spatial affordance, kinetic feedback, and product voice.

| Category | Tool / Library | Reference URL | Core Use Cases & Strengths |
|---|---|---|---|
| **Smooth Scroll & Kinetics** | Lenis | [lenis.dev](https://lenis.dev/) | Smooth scroll physics, touch normalization, velocity tracking, and scroll-driven animation synchronization. Works seamlessly with GSAP ScrollTrigger & Framer Motion. |
| **Animation Engines (2D/Timeline)** | GSAP | [gsap.com](https://gsap.com/) | Enterprise-grade timeline orchestration, ScrollTrigger, Flip plugin (layout morphing), MotionPath, and SVG morphing. Heavy-duty complex animations. |
| **Lightweight JS Animation** | Anime.js | [animejs.com](https://animejs.com/) | Lightweight (micro-sized) animation engine for CSS properties, SVG attributes, DOM elements, and JS objects. |
| **Production Motion (React/JS)** | Motion (Framer Motion) | [motion.dev](https://motion.dev/) | Standard React animation framework. Layout animations (`layoutId`), shared element transitions, gesture physics, spring physics, and AnimatePresence. |
| **3D & WebGL Canvas** | Three.js | [threejs.org](https://threejs.org/) | Low-level 3D WebGL renderer for interactive 3D scenes, custom shaders, post-processing, and particle systems. |
| **React 3D Ecosystem** | React Three Fiber (R3F) | [r3f.docs.pmnd.rs](https://r3f.docs.pmnd.rs/) | Declarative React wrapper for Three.js. Allows building 3D components as reusable React nodes with Drei helpers. |
| **Particle Systems** | Canvas Particle Shaders | [particles.js](https://vincentgarreau.com/particles.js/) | Generative background particles, interactive cursor fields, node graphs, and WebGL particle streams. |
| **Interactive UI Components** | Kokonut UI | [kokonutui.com](https://kokonutui.com/) | Modern UI component library featuring micro-interactions, smooth state transitions, hover effects, and tactile feedback. |
| **Animated Component Primitives** | Bitlit UI | [bklitui.com](https://bklitui.com) | Component catalog of animated micro-components, glowing cards, dynamic inputs, and sleek visual states. |
| **React Motion Patterns** | React Bits | [reactbits.dev](https://reactbits.dev/) | Collection of animated background patterns, text reveals, card tilt effects, and particle containers for React. |
| **Framer Motion Primitives** | Motion Primitives | [motion-primitives.com](https://motion-primitives.com/) | Pre-built, unstyled UI primitives powered by Framer Motion (animated dialogs, tabs, accordions, popovers). |
| **Design System Assets** | OriginKit | [originkit.dev](https://originkit.dev/) | High-quality UI component primitives, motion assets, visual tokens, and modern layout templates. |
| **AI Motion & Site Inspiration** | Motion Sites | [motionsites.ai](https://motionsites.ai/) | Curated gallery and AI-assisted inspiration engine for motion-centric website layouts, transitions, and scroll effects. |
| **Product Experience Benchmarks**| Manus | [manus.im](https://manus.im/) | Benchmark showcase for agentic UI, fluid transitions, glassmorphic UI, and multi-agent spatial user experiences. |

---

## 2. UI Component Libraries & Styling Frameworks

| Library / System | Reference URL | Styling Paradigm & Value Proposition |
|---|---|---|
| **DaisyUI** | [daisyui.com](https://daisyui.com/) | Pure CSS Tailwind component library. Adds clean semantic class names (`btn`, `card`, `modal`, `navbar`) to Tailwind CSS, featuring built-in theme switching (dark/light/custom) without extra JS bloat. |
| **Shadcn UI** | [ui.shadcn.com](https://ui.shadcn.com/) | Copy-paste re-usable components built with Radix UI and Tailwind CSS. Provides complete code ownership and customization flexibility. |
| **Radix UI** | [radix-ui.com](https://www.radix-ui.com/) | Unstyled, accessible UI primitives for React. Handles focus management, ARIA attributes, keyboard navigation, and portal rendering. |
| **Lucide Icons** | [lucide.dev](https://lucide.dev/) | Clean, consistent, highly customizable open-source icon set for modern web applications. |

---

## 3. Typography & Type Foundries

Typography conveys personality, readability, and visual hierarchy. When designing visual systems (`design.md`), select font pairings from these premier independent foundries:

| Foundry | Reference URL | Iconic Typefaces & Characteristics | Recommended Pairings & Use |
|---|---|---|---|
| **Pangram Pangram** | [pangrampangram.com](https://pangrampangram.com/) | *Neue Montreal*, *Editorial New*, *Pangram Sans*, *Radio Canada*. Clean grotesks and high-contrast editorial serifs. | Pair *Neue Montreal* (Body) + *Editorial New* (Display/Quotes) for modern editorial and SaaS marketing. |
| **Klim Type Foundry** | [klim.co.nz](https://klim.co.nz/) | *Söhne*, *Untitled Sans*, *Founders Grotesk*, *National*, *Feijoa*. Precision typographic engineering by Kris Sowersby. | Use *Söhne* for tech dashboards, enterprise systems, and high-density UI components. |
| **Grilli Type** | [grillitype.com](https://grillitype.com/) | *GT America*, *GT Sectra*, *GT Planar*, *GT Alpina*, *GT Eesti*. Swiss precision with contemporary flare. | Use *GT America* for versatile branding & multiline UI; *GT Sectra* for editorial headers. |
| **Displaay** | [displaay.net](https://displaay.net/) | *Druk*, *Matter*, *Roobert*, *Reckless*, *Telegraf*. Bold, experimental, high-impact display typography. | Use *Roobert* or *Druk* for high-impact hero titles, campaign landing pages, and creative showcases. |
| **Collletttivo** | [collletttivo.it](https://collletttivo.it/) | *Mona Sans*, *Hubot Sans*, *Varrone*, *Halibut*. Open-source typography collective offering high-quality open fonts. | Great for open-source projects, developer tools, and lightweight web apps needing distinct zero-cost type. |

### Typographic Rules & Implementation Standards
- **Fluid Type Scaling**: Use CSS `clamp()` for responsive typography across mobile and desktop without layout jumps:
  ```css
  --font-size-hero: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  --font-size-h1: clamp(2rem, 3.5vw + 0.8rem, 3.25rem);
  --font-size-body: clamp(1rem, 0.5vw + 0.875rem, 1.125rem);
  ```
- **Line-Height & Readability**: Body copy must maintain line-height between `1.5` and `1.65`. Headings use tighter leading (`1.1` to `1.25`).
- **Contrast Requirement**: Ensure minimum 4.5:1 contrast for normal text and 3:1 for large text (WCAG 2.2 AA).

---

## 4. Graphic & Background Image Rendering

| Tool / Technique | Reference URL | Visual Capabilities & Output |
|---|---|---|
| **Haikei** | [haikei.app](https://haikei.app/) | Generative SVG background generator. Produces customizable SVG waves, organic blobs, polygon grids, stacked steps, and wave scene dividers. |
| **Mesh Gradients & Noise** | Native CSS / SVG Filters | Soft multi-color radial gradients layered with SVG `<feTurbulence>` noise texture for tactile depth. |
| **Glassmorphism & Backdrop Filters** | CSS `backdrop-filter` | Translucent glass overlays using `backdrop-filter: blur(12px) saturate(180%)`, paired with subtle 1px inner borders (`rgba(255,255,255,0.1)`). |

---

## 5. Accessibility (a11y) & WCAG 2.2 Standards

Accessibility is non-negotiable in every design specification.

| Resource / Standard | Reference URL | Core Compliance Requirements |
|---|---|---|
| **A11Y.md Standard** | [fecarrico/A11Y.md](https://github.com/fecarrico/A11Y.md/blob/main/docs/en/A11Y.md) | Canonical accessibility specification & AI behavior contract. Target Standard: WCAG 2.2 AA default (`Standard`), WCAG AAA (`Shield`), or WCAG A (`Launchpad`). |
| **WCAG 2.2 Guidelines** | [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/) | W3C Web Content Accessibility Guidelines v2.2. Level AA is mandatory for all UI; Level AAA for motion SC 2.3.3. |
| **The A11y Project** | [a11yproject.com](https://www.a11yproject.com/) | Community-driven checklist for ARIA attributes, semantic HTML markup, focus management, screen readers, and touch targets. |

### Non-Negotiable Accessibility Rules for Ivy
1. **WCAG 2.2 SC 2.4.13 (Focus Appearance - AA)**: Keyboard focus indicators must have an area of at least 2px border around the control with minimum 3:1 contrast against adjacent colors.
2. **WCAG 2.2 SC 2.5.8 (Target Size Minimum - AA)**: Pointer targets must be at least 24x24 CSS pixels (44x44 CSS pixels recommended for primary mobile touch targets).
3. **WCAG 2.2 SC 2.3.3 (Animation from Interactions - AAA)**: Motion triggered by user interaction must be disableable via `prefers-reduced-motion: reduce`.
4. **WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide - A)**: Any auto-updating or looping animation lasting over 5 seconds must include a visible pause/stop control.
5. **Color Independence (WCAG 2.2 SC 1.4.1)**: Color must never be the sole visual means of conveying information or indicating an action/error state.
