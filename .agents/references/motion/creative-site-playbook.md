# Creative Site Playbook — @product-designer (Ivy) & @developer (Rex)

> **When to load:** `/motion` Phase 2b, when the project is a creative/experiential web
> surface — portfolio, marketing site, interactive landing page, WebGL hero, scroll-driven
> story. NOT loaded for ordinary product UI motion, which is covered by
> `motion-design-guidelines.md`.
>
> **Ownership:** Ivy owns the creative direction and every motion prompt. Rex owns the
> implementation and the runtime budget. Neither may add a technique that is not in the
> approved spec.

---

## 1. What "breaks the boundary" actually means

Not "more animation." Most impressive-looking sites are not technically hard; they are
**one idea executed relentlessly**. The boundary-breakers share four properties:

| Property | What it looks like | The failure it replaces |
|---|---|---|
| **Coherence** | One motion language, felt everywhere. Scroll physics, easing, and timing are one system. | Every section invents its own effect; the site reads as unrelated screens. |
| **Physicality** | Motion responds to input with weight and momentum. Scroll has inertia; drags throw. | Linear `A → B` tweens that feel like CSS being stretched. |
| **Depth** | Layers, parallax, and z-space create a world rather than a scroll. | Flat DOM stack with opacity fades pretending to be rich. |
| **Restraint** | Deliberate stillness against dense motion. Contrast is the effect. | Uniformly busy — nothing registers because everything moves. |

**The trap:** a LLM asked for "a creative website" will default to a hero with a parallax
blob, three staggered card reveals, and a fade-up on scroll. That is the *most generic*
output available and it is indistinguishable from every AI-generated site. The reason is
that the prompt asked for decoration. The fix is that you must choose a **thesis** first —
see §2.

---

## 2. The thesis step — mandatory, before any code or spec

Before choosing a library, answer in one sentence: **what does the user *feel* here that
they could not feel on any other site?** Not "smooth scrolling" — that is a technique.
"Weight" — the page has mass. "Depth behind glass." "Discovery, as if excavating."

A thesis without a test is decoration. Write the thesis, then write **the one moment** that
proves it. If you cannot name that moment, you do not have a thesis; you have a mood board.

**Two registers, and both are legitimate.** The mechanism is the same in each: name **one**
moment, then ask whether a reader could **falsify** it. The register differs, and picking the
wrong one is how a credible page gets built like a perfume ad.

| Register | Answers | Use when |
|---|---|---|
| **Expressive** | what does the reader *feel*? | brand, portfolio, consumer, cultural |
| **Credibility** | what does the reader come to *believe*, and could they check it? | B2B, investor, technical, scientific, regulated |

### Expressive theses

| Thesis | The moment that proves it | Typical stack |
|---|---|---|
| Weight / physicality | Scroll has real momentum; sections arrive with impact | Lenis + GSAP ScrollTrigger + pin |
| Depth behind glass | Content layers live at different z, lit from one source | Three.js + depth-of-field + glass/transmission material |
| Excavation / discovery | Content is uncovered, not scrolled past | ScrollTrigger pin + clip-path/scrub reveal |
| Living material | One organic surface that responds to pointer and scroll | Three.js + TSL noise/displacement shader |
| Living typography | Text is a material, not a label | GSAP SplitText/ScrambleText + custom cursor |

### Credibility theses

Same shape, different claim. The proven moment here is a **datum becoming legible**, not a
sensation arriving.

| Thesis | The moment that proves it | Typical stack |
|---|---|---|
| Measurement made live | A real figure resolves from its own data — hull weight, latency, tolerance — and every movement on the page is bound to a value | Lenis + GSAP ScrollTrigger + a first-party data source (`client-data`) |
| Instrument, not ornament | The page reads as a tool: restrained motion, visible units, no effect that cannot be checked against a number | ScrollTrigger + number counters tied to `client-data` |
| Provenance on screen | The artifact's real origin is shown — the actual build, the real test run, the genuine drawing — with occlusion and cropping doing the work instead of illustration | Sticky scroll + `client-data` photography/geometry |
| Load path | Structure is shown carrying force: member-by-member, reaction-by-reaction, never implied | Three.js + `client-data` station tables |

**A credibility thesis still needs a proving moment, and the falsifiability test is what keeps
it honest.** *"This company shows its work"* is a thesis; *"every animated figure is bound to a
source a reader could open"* is the moment. If the moment cannot be checked by a skeptical
reader, it is decorative in either register.

**Worked example of the register swap** (from a blind run on a B2B marine brief): the
expressive theses were all rejected as wrong for the audience — momentum reads as
entertainment, glass as consumer luxury, reveal as implying something to hide, and
displacement as implying a defect in a carbon hull under load. The thesis became *"nothing on
this page moves to decorate — it moves because a measurement changed"*, whose proving moment
was that the page would still read as true if you froze it at any frame. Same slot, same
mechanism, different register.

**Three.js + `WebGPURenderer` and TSL** carry the "living material" thesis. Note the
renderer fork: `WebGPURenderer` is now the strategic direction and the only place TSL
works, but `WebGLRenderer` is still the maintained, recommended choice for pure WebGL 2
applications and receives no new large features[^1]. Default to `WebGLRenderer` unless the
design genuinely needs TSL or compute; do not port for novelty.

---

## 3. The canonical stack — and the exact integration

Three libraries that are commonly bolted together incorrectly. Get the wiring right once.

### 3.1 Lenis × GSAP — the sync that is always wrong

Lenis drives its own RAF loop; GSAP drives its own ticker. **You must connect them, and
`lagSmoothing(0)` is not optional.** Leaving GSAP's default lag smoothing on produces a
desync you will read as "jitter on fast scroll":

```js
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const lenis = new Lenis({ autoRaf: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000)); // seconds → ms
gsap.ticker.lagSmoothing(0);                        // required
gsap.registerPlugin(ScrollTrigger);
```

Import `lenis/dist/lenis.css` — Lenis's layout depends on it[^2].

**Lenis already honours reduced motion by default.** `respectReducedMotion` defaults to
`true`: when the user prefers reduced motion, smoothing is disabled (`lerp` forced to `1`),
programmatic scrolls jump instantly, and the scroll keeps running so WebGL sync stays
intact[^2]. **Do not set it to `false`.** That single line re-breaks the accessibility gate
the whole skill exists to enforce. Read `lenis.prefersReducedMotion` to adapt your own
animations rather than disabling the respect.

### 3.2 Three.js + scroll — one loop, not two

Do not run a second RAF loop for the 3D scene. Drive it from the same ticker, and let
Lenis feed both:

```js
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
  renderScene(time);            // your renderer, same tick
  ScrollTrigger.update();
});
```

Respect the documented limits: Lenis is capped at 60fps on Safari and 30fps in low-power
mode, and smooth scroll does not work across an iframe[^2]. Do not promise 120fps anywhere.

### 3.3 GSAP licensing — no paywall, no tokens

**Every GSAP plugin, including formerly-Club-only ones (SplitText, MorphSVG, DrawSVG,
MotionPath, ScrollSmoother), is free for commercial use** and ships in the public `gsap`
npm package. There is no Club tier, no license key, and no GreenSock auth token[^3].

```bash
npm install gsap
```

Do **not** emit an `.npmrc` with a GreenSock token, point at `npm.greensock.com`, or install
`@gsap/business`. Never tell the owner a plugin requires Club or a payment — that is
outdated advice that costs real money and time.

**Register every plugin once, before use:** `gsap.registerPlugin(ScrollTrigger, SplitText)`.
Then call `ScrollTrigger.refresh()` after fonts, images, or layout-changing DOM settles —
pin positions computed against unlaid-out content are a classic source of "my pinned
section drifts".

### 3.4 Dependency discipline

| Need | Reach for | Not |
|---|---|---|
| Scroll physics | Lenis (few KB, zero deps, native-scroll based[^2]) | Full-page smooth-scroll hijack libraries |
| Timeline/scroll choreography | GSAP + ScrollTrigger[^3] | Hand-rolled scroll math |
| 3D canvas | Three.js (WebGLRenderer by default[^1]) | Canvas 2D for a 3D scene |
| Custom shader material | TSL under WebGPURenderer[^1] | `ShaderMaterial` under WebGPURenderer — not supported |
| Micro-interactions in React | Motion / Framer Motion | A full timeline for a hover |

Lenis wraps the browser's native scroll, so `position: sticky`, anchor links, and
accessibility keep working[^2] — that is the reason to prefer it over a scroll-hijack
library. GSAP's `ScrollSmoother` is the alternative if you go all-in on GSAP; do not run
both scroll smoothers at once.

---

## 4. Patterns that read as "expensive" (and their cost)

| Pattern | Implementation | Cost / risk |
|---|---|---|
| Pinned scroll story | `ScrollTrigger` `pin: true`, `scrub: true` | High layout cost; pin-spacer reflow is the #1 scroll-jank source. Never pin on a layout that animates. |
| Text reveal | `SplitText` chars/words + stagger | DOM-node explosion. Split once, `revert()` on unmount, never re-split per scroll event. |
| Scramble/decode text | `ScrambleText` or a `SplitText` + random-char pass | Cheap, high perceived craft. Must respect reduced motion (resolve to final text instantly). |
| Custom cursor | `Observer` + follower, hide native cursor | Accessibility risk: never hide the cursor without a visible keyboard focus ring. |
| SVG line draw | `DrawSVG` | Cheap. `MotionPath` for path-following. `MorphSVG` for shape morph — needs matching path point counts. **BUT see below: `DrawSVG` animates `stroke-dashoffset`, so at t=50% it displays half the true extent. In the credibility register it is forbidden, not cheap.** |
| 3D product hero | `GLTFLoader` → PBR material, env-lit | Asset weight dominates. Budget the file; see §6. |
| Organic displacement | TSL noise over vertex position | GPU-bound. Scale pixel ratio, cap DPR at 2, add a quality tier for mobile. |
| Post FX (bloom/DOF/SSR) | TSL node composition + `RenderPipeline`[^1] | `EffectComposer` is **not** supported under WebGPURenderer — the API was renamed to `RenderPipeline`[^1]. |

**Register qualifier — read before picking a pattern.** A blind run on a clinical results page
found the skill shipping a technique its own credibility rule forbids: `DrawSVG` draws a stroke
by animating `stroke-dashoffset`, so at 50% it displays **half-ish** of a confidence
interval. The falsifiability test "keeps it honest" only if the frame is true, and a half-drawn
interval is a false statistic wearing craft. Its replacement was a clip-wipe over
already-complete geometry — more work, and the only version where every frame has true extent.

**So: in the expressive register this table is a menu. In the credibility register, any pattern
that produces a partially-drawn value is forbidden**, and you say so in the prompt:
```
**Register constraint:** no interpolated figures — motion may reveal a value, never produce one.
Forbids counters, digit rolls, axis expansion, and `stroke-dashoffset`/`DrawSVG`.
```
Extent-bearing geometry is revealed by clip or opacity over final, already-true geometry.

**Rule:** every one of these still needs a reduced-motion path. Under
`prefers-reduced-motion: reduce`, the site must remain fully usable — static or cross-faded
versions of every effect, and no autoplay loop. If an effect cannot be expressed as a
static or cross-faded equivalent, do not ship it.

---

## 5. Anti-patterns specific to creative sites

- **Motion as wallpaper.** A shader that does not respond to anything is a video. Tie it to
  pointer, scroll, or time-with-intent — or cut it.
- **Every section uses a different entrance.** Two reveals, chosen deliberately, beat six.
- **Scroll-jacking without consent.** Hijacking the scroll axis (not smoothing it) breaks
  the browser's own scrollbar, keyboard paging, and history. Prefer Lenis precisely because
  it does not do this.
- **A custom cursor that hides the real one** with no keyboard focus ring. Fails WCAG 2.4.7.
- **Shader hero that ignores reduced motion.** A moving background is the single most
  common vestibular trigger in this category, and it carries no information — so it must
  have a static equivalent. Measured: **all four** of the custom-shader sites in §6.1 skip
  this entirely, so it is not something you can pick up by copying one.
- **Unbounded texture resolution.** 4K HDRI or 8K textures on a hero scene is a mobile
  data-plan casualty. See §6.
- **Copying an award site's payload budget.** `sentient.foundation` ships 17.3 MB of video and
  is on an award list; `mindmarket.com` ships 0.17 MB and is also on an award list. Neither is
  a target. Measure your own site, name the number, own it. See §6.1.
- **Treating custom shaders as optional polish.** Five of the top showcase sites write GLSL;
  most write none. Shaders are also *why* the best sites are light — procedural beats
  downloaded. See §6.3.
- **Assuming reduced-motion is table stakes because everyone else skipped it.** Four of six
  measured sites ship no reduced-motion handling at all, including every custom-shader one.
  See §6.2.
- **"It's 3D so it needs a loading spinner."** Progressive asset strategy in §6 beats a
  spinner.

---

## 6. Asset weight is a motion problem

For an interactive/3D site, the **assets usually outweigh the code**. A scene that runs at
60fps can still fail because it shipped 40MB of geometry. Budget in Phase 3, not in QA.

### 6.1 Measured baselines — real sites, not invented numbers

**This table replaces a set of thresholds I wrote earlier and could not defend.** The earlier
version ("hero GLB ≤2MB, above-the-fold ≤4MB") was asserted, not measured. These numbers come
from fetching the served HTML, the same-host JS chunks, and every referenced art asset off
six entries in the Lenis showcase, then summing real `Content-Length` values.[^4]

**Method and its limits.** We do not execute JS, so assets behind bundler-constructed URLs are
MISSED, not absent — **every total below is a lower bound.** Video hosted on a third-party
player (Wistia) is listed separately because it is not part of the site's own payload.

| Site | canvas | custom GLSL | reduced-motion | HTML | JS | image | own video | 3rd-party video |
|---|---|---|---|---|---|---|---|---|
| landonorris.com | 21 | — | no | 0.21 MB | ~0 MB | **1.38 MB** | 0 | 0 |
| mindmarket.com | 14 | — | yes | 0.31 MB | 0.08 MB | **0.17 MB** | 0 | 0 |
| konpo.studio | 5 | yes | no | 0.29 MB | ~0 MB | 1.22 MB | 9.33 MB | 19.89 MB |
| sentient.foundation | 5 | yes | no | 0.11 MB | 0.86 MB | 2.21 MB | **17.33 MB** | 0 |
| nudot.com.tw | 2 | yes | yes | 0.35 MB | 0.04 MB | 1.38 MB | 10.18 MB | 0 |
| cravburgers.shop | 0 | — | no | 0.10 MB | 0.98 MB | **6.36 MB** | 0 | 0 |

**Four things this table says that intuition gets wrong:**

1. **Awwwards-calibre sites are not light.** `sentient.foundation` — the only entry in this set
   with the full GSAP + Lenis + Three.js + GLSL stack — ships **17.3 MB of its own video**
   alongside 2.2 MB of images. `nudot.com.tw` ships 10.2 MB of MP4 for its sliders. The
   "≤4MB above the fold" rule I invented is violated by sites people put on award lists.

2. **Video, not geometry, is the weight.** Of everything measured, 3D model payloads barely
   register — these sites use shaders, Rive, and procedural geometry, so almost nothing is a
   `.glb` to download. If you are about to model something for the web, the byte cost is
   probably in the video layer around it.

3. **The leanest site has the most canvases.** `mindmarket.com`: 14 canvas surfaces, **0.17 MB**
   of images, 0.08 MB of JS. Total payload under 0.6 MB for a 14-surface interactive site.
   That is the target, and it is achieved by *not* shipping bitmaps — Rive vectors and CSS.

4. **Format discipline is the cheapest win.** `cravburgers.shop` WebP-everything *except* its
   two hero illustrations, which are PNG: `burgerselfie.png` at **2.6 MB** and `burger-boy.png`
   at **1.7 MB** — 4.3 MB of the site's 6.4 MB total. Those same images as WebP are a few
   hundred KB. One wrong extension decision cost more than its entire JS bundle.

**Therefore — derived from the measurements, not from taste:**

| Asset class | Target | Evidence |
|---|---|---|
| Above-the-fold **image** payload | **≤ 1.5 MB** | `mindmarket` does 14 canvases in 0.17 MB; `landonorris` runs 21 in 1.38 MB |
| Per-image raster | **≤ 250 KB** | Every site above except CRAV holds this without trying |
| Hero illustration | **WebP/AVIF, ≤ 400 KB** | CRAV's 2.6 MB PNG is the whole counter-example |
| Custom video loop | **≤ 3 MB, or delete it** | Even award sites are 5× over this — treat it as debt, not precedent |
| Total page weight | **measure it, then decide** | "4MB" was never real. Publish your own number. |

**One number that is genuinely a budget, because the format caps it: HDRI ≤1 MB.** Environment
lighting is what makes PBR look real, it is the highest-leverage byte in a scene, and 1–2k
`.hdr` is enough for a hero. This one was not invented — it follows from the format and the
resolution the lighting actually resolves at.

**Strategy:** low-poly/LOD placeholder → progressive texture → full model. Pause the scene
when off-screen (`IntersectionObserver`) and when `document.hidden`. Cap DPR at 2 and drop
resolution on sustained low FPS. Lazy-load the 3D runtime so the parse cost is not paid
before the hero is visible.

**Where the assets come from — see `motion-asset-generation.md`.** That reference owns the
AI generation route, tool selection by licence, and the prompt recipes. Do not invent an
asset source here.

### 6.2 The accessibility finding, which no award covers

Of the six measured sites, **four ship no `prefers-reduced-motion`, `motion-safe`, or
`motion-reduce` handling at all.** That includes two with custom GLSL, one with 21 canvas
surfaces, and `sentient.foundation` — the fullest implementation in the set.

Compare the one site I measured *without* canvas (`contentarchitecture.dev`): **232
`motion-safe:transition-transform` and 143 `motion-reduce:transition-none` declarations**, i.e.
every transition is opt-in *under* `motion-safe` rather than patched afterward. It has no
3D at all, and it does the most accessibility work of anything measured.

**Design-decision, not a complaint.** Two awards go to custom shaders and 21-canvas scroll
experiences; no award covers `prefers-reduced-motion`. So this gate will never be satisfied by
"the reference sites do it." For motion of this class it is the differentiator, and Lenis
already ships the mechanism — `respectReducedMotion` defaults to `true`[^2]. The sites above are
not following bad examples on this point; there is simply no incentive to.[^5]

### 6.3 Custom GLSL is the top-tier signal

Five of the top-scoring showcase sites reference shader constructs (`fragmentShader`,
`vertexShader`, `varying`) in served markup: `sentient.foundation`, `nudot.com.tw`,
`konpo.studio`, `emotion-agency.com`, `moto-card.com`. Most showcase entries are Lenis +
ScrollTrigger with **no** shader and no 3D payload at all.

So the practical distinction, measured rather than assumed: **Lenis + ScrollTrigger is table
stakes; custom shader work is what separates the tier above it** — in the *expressive* register.
In the credibility register the same measurement inverts: a brief whose entire claim was "every
value on this page resolves to a number the reader can check" recorded a **Three.js hull as a
reconstruction**, because a half-breadth station plot is derivable from the offset table. Dropping
3D was the higher-craft choice there. Do not treat "more shader work" as the standing goal.

And because shaders are code
rather than assets, the sites that do this are also the *lightest* — see `mindmarket`.

---

## 7. What Ivy must put in the spec

Per the ordinary motion-prompt contract in `motion-spec-template.md`, plus for creative
surfaces:

- **Thesis sentence and the signature moment** that proves it.
- **Scroll model**: which library, the sync wiring, and what happens when
  `respectReducedMotion` disables smoothing.
- **Measured page weight**, not a budget copied from §6.1 — state the site's own number and
  where it came from. `mindmarket.com` did 14 canvas surfaces in **0.17 MB** of images;
  `sentient.foundation` shipped **17.3 MB** of video. Both are award sites. Neither number is
  a target: yours is a decision you measured and can defend.
- **Reduced-motion path per effect** — this is the one the reference sites skip, and therefore
  the one that differentiates. §6.2.
- **Asset manifest reference**: every `AS-###` from `motion-assets.md` this surface consumes.
- **Reduced-motion equivalent per effect** — static or cross-fade, named per `MO-###`.
- **WebGL context-loss handling**, if a canvas is involved: the site must recover, not white-screen.

[^1]: three.js manual, "WebGPURenderer", https://threejs.org/manual/en/webgpurenderer.html — `WebGLRenderer` remains the recommended choice for pure WebGL 2 applications; `ShaderMaterial`/`RawShaderMaterial`/`onBeforeCompile` are not supported under `WebGPURenderer`, and `EffectComposer` is replaced by `RenderPipeline`.
[^2]: Lenis README, https://github.com/darkroomengineering/lenis — `respectReducedMotion` defaults to `true`; Safari capped at 60fps; smooth scroll does not work across iframes; GSAP `ScrollTrigger` sync requires `lagSmoothing(0)`.
[^3]: GSAP licensing and license text, https://gsap.com/community/standard-license/ and https://gsap.com/llms.txt — all plugins including formerly-Club-only ones are free for commercial use in the public `gsap` package, effective 2025-04-30.
[^4]: Measured 2026-10-06 by fetching served HTML, same-host JS chunks, and every referenced art asset from six `lenis.dev/showcase` entries, summing real `Content-Length`. Method does not execute JavaScript, so bundler-constructed asset URLs are missed and every total is a **lower bound**. Entries: `sentient.foundation`, `nudot.com.tw`, `konpo.studio`, `landonorris.com`, `mindmarket.com`, `cravburgers.shop`; `contentarchitecture.dev` counted reduced-motion declarations by static inspection of its markup.
[^5]: Reduced-motion absence verified by searching served markup for `prefers-reduced-motion`, `motion-safe`, and `motion-reduce`. Absence in served markup is strong evidence of absence in CSS-in-JS-driven sites but is **not proof** — a site could inject it at runtime. Stated as measured, not inferred.