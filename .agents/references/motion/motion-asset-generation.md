# Motion Asset Generation — @product-designer (Ivy) & @developer (Rex)

> **When to load:** `/motion` Phase 3b, whenever the motion spec needs assets that are not
> in the repo — 3D models, textures, HDRIs, sprites, loop videos, audio, fonts. Every
> `MO-###` that references a non-existent asset needs an `AS-###` entry in `motion-assets.md`.
>
> **Scope — and the trap in it.** This manifest covers **anything an `MO-###` animates**,
> full stop. A blind run found the earlier wording said "that is not already in the repo", which
> contradicts route 0: on a credibility surface the client's own station table or test data is
> usually *already in the repo* and is still the most important entry in the manifest. Following
> that sentence literally produced an empty manifest on a brief whose whole point was supplied
> data.
>
> **So: what lives in the repo is a `Source` question, not an inclusion question.** Data in the
> repo → `Route: client-data`, `Source: repo: <path>`. Data to be fetched later → still an
> entry. Only assets **no `MO-###` animates** are out of scope — record those as a `/design`
> open item rather than silently dropping them. Assets a
> neighbouring phase uses (e.g. editorial photography for a page with no motion) belong in
> `/design` and are logged there as an open item. Do not silently drop them, and do not pull
> them in here to make the manifest look complete.
>
> **The rule this file exists to enforce:** an `MO-###` pointing at an asset that does not
> exist is an unimplementable prompt. That is the same defect class as an under-specified
> motion prompt — and this one is not caught by any gate today, because
> `motion_spec_check.js` validates the *prompt*, never the asset it depends on.

---

## 1. First: do you actually need to generate it?

Generation is slow, expensive to iterate, and licence-encumbered. In this order:

0. **Is it the client's own material?** Their engineering data, measurements, station tables,
   photographs of the real build, test results, or existing geometry. On any credibility-driven
   surface this is the **first** route, not a convenience: it is the one source a skeptical reader
   can verify, and generating a substitute for a physical object you were given real data about is
   a fiction the audience is specifically there to check. Record it as `Route: client-data`.
1. **It already exists in the repo or the design system?** Use it. Reusing an existing
   asset is free and has known provenance.
2. **Does CSS/SVG cover it?** A gradient, an SVG path, a `<canvas>` particle field. Do not
   generate a bitmap for something a vector draws better and smaller.
3. **Can it be procedural?** Shaders, noise fields, and parametric geometry are infinite,
   zero-weight, and infinitely resizable. For an interactive site, procedural is usually the
   better answer than generated — see `creative-site-playbook.md` §1.
4. **A stock asset with a clear licence?** Poly Haven (CC0), Kenney (CC0), ambientCG (CC0),
   Google Fonts / Fontsource (OFL). Free, attributable, no generation risk.[^1]
5. **Only then generate.** Generation is the last resort, not the first.

Record the answer in `motion-assets.md` as `Route: client-data | reuse | css | procedural |
stock | generated`. A reviewer asking "why did we generate this?" should get a one-line answer.

---

## 2. Licence first — the traps that cost real money

AI-output licences are the most common way a creative site becomes unshippable. **Check the
licence before generating, not after.** The three traps:

| Trap | The rule |
|---|---|
| **Free tier ≠ commercial right** | Most AI services grant commercial use only on paid plans, and several grant it *retroactively differently*. Generate on the tier you will ship from, or regenerate. |
| **Upgrade does not retro-license** | Suno: output generated on a free tier stays non-commercial even after you upgrade[^2]. Udio: downloads are disabled post-settlement, so it is not a route to a file at all[^2]. |
| **Channel restrictions** | ElevenLabs Music: all paid tiers grant a commercial licence, but the self-serve licence **excludes distribution to streaming platforms** — inside a video is fine, on Spotify is not[^2]. |

### Image models

| Model | Licence | Commercial use | Use when |
|---|---|---|---|
| **FLUX.1 schnell** (or FLUX.2 Klein 4B) | Apache 2.0 | Yes, no restrictions | Default for self-hosted commercial work. 4-step distilled, fast, slightly lower quality[^3] |
| **SDXL** (+ community fine-tunes) | CreativeML OpenRAIL++-M | Yes, use-based restrictions | Best ecosystem and LoRA/ControlNet depth; runs on 8GB[^3] |
| **FLUX.1 dev** | BFL non-commercial | **No** — API/licensed host only | Non-commercial or research only. Never ship output in a client or product deliverable[^3] |
| **FLUX.1 pro** | BFL commercial | Yes, via API | Highest quality, paid per call[^3] |

**The default is schnell or SDXL.** Reaching for `[dev]` because a tutorial used it is how
people accidentally ship non-commercial work.

### 3D models

| Tool | Free tier | Commercial on free? | Notes |
|---|---|---|---|
| **Meshy 6** | ~100 credits/mo | **Yes, CC BY 4.0 — attribution required** | Most formats (GLB/FBX/OBJ/USDZ/BLEND); paid plans drop attribution[^4] |
| **Tripo** | ~200 credits/mo | **No** | Fastest (~8–30s), quad topology, good for props; commercial needs Pro[^4] |
| **Rodin (Hyper3D)** | 10 credits, pay-after-result | Check current terms | Strongest on photoreal figures; ~90s, highest credit cost[^4] |

**Export GLB.** It is the single file, glTF 2.0 binary, PBR-ready, and what Three.js
consumes natively. OBJ and STL drop texture data by spec[^4].

**Always generate 3–4 variants and compare.** Different engines disagree strongly on
organic vs hard-surface forms[^4]; picking one engine is a bet, and the credits are cheap
relative to shipping the wrong hero mesh.

### Audio

| Need | Tool | Licence note |
|---|---|---|
| Voiceover / narration | ElevenLabs | Commercial from paid tiers; self-serve excludes streaming release[^2] |
| Background music in a site | Suno Pro, or Stable Audio Creator | Suno free tier is non-commercial and not retroactive[^2] |
| Sound effects / UI ticks | ElevenLabs Sound Effects | 200 credits per generation[^2] |
| Avoid | **Udio** | Downloads of audio, video, and stems are disabled[^2] |

**For a web project, audio is optional and risky.** If the site needs ambience, prefer a
short looped asset on a paid tier. Never make audio load-blocking, and never autoplay above
the five-second threshold without pause/stop/hide (WCAG 2.2.2 — see
`motion-design-guidelines.md` §6).

### Fonts

Use **Fontsource** or Google Fonts (SIL OFL). Variable fonts are worth the effort on a
creative site: `font-variation-settings` lets weight animate continuously, which is a
motion surface no static font file gives you. OFL permits commercial embedding[^1].

---

## 3. The prompt recipes

Generic prompts produce generic assets. Each recipe below states the fields that actually
move the output.

### 3.1 Texture / image (FLUX or SDXL)

```
{subject}, {material}, {lighting}, {shot}, {finish}, {aspect}
```

- **subject** — the object, stated concretely. "weathered brass compass" beats "vintage object".
- **material** — drives most of the realism: `brushed aluminium`, `cracked glazed ceramic`,
  `woven linen`. Material words are where diffusion models are weakest and where you should
  over-specify.
- **lighting** — `soft north-facing studio light`, `single hard key from camera left`,
  `golden hour rim light`. Omit it and you get flat default lighting.
- **shot** — `macro`, `35mm`, `orthographic top-down`, `shallow depth of field f/1.8`.
- **finish** — `seamless tileable`, `8k`, `matte`, `film grain`, `no text`.
- **aspect** — state it: `1:1`, `16:9`, `9:16`.

**Always add `seamless tileable` for anything that will repeat**, and `no text` unless you
want mangled lettering — image models render text badly on most models.

**Negative prompts** matter for SDXL, less for FLUX (which has no negative-prompt field).
Quality boosters on FLUX: state the finish explicitly rather than relying on a sampler.

### 3.2 3D model (Meshy / Tripo)

```
{object}, {material}, {style}, {pose}, {detail level}
```

- Meshy accepts up to ~800 characters[^4] — enough for real detail.
- **Pose matters for rigging.** If the mesh will be animated, request **T-pose or A-pose**;
  an unposed mesh needs manual fixing before it can be rigged.
- **Ask for the topology you need**: "game-ready, under 50k triangles" or "high detail,
  smooth-shaded". Otherwise you get a dense mesh that will kill the frame budget.
- State the **material**: `matte painted metal`, `polished chrome`. Then use the tool's
  AI-texture pass rather than hoping the base texture is right.

**For a hero model, generate the concept as an image first, then image-to-3D.** Text-to-3D
direct is faster to iterate but blind to the silhouette; an image reference gets you the
silhouette you approved.

### 3.3 HDRI environment

Generate via an HDRI generator or capture from a photo, then **downscale to 1–2k** and
compress. This is the highest-leverage byte in a PBR scene — it is what makes a cheap model
look expensive — and it is where people waste 20MB. Target ≤1MB (§6 of the playbook).

### 3.4 Prompt anatomy for audio

Describing *musical attributes* instead of naming artists is both safer and more effective —
services explicitly prohibit artist/song names in prompts[^2]:

```
{genre-blend}, {tempo range}, {meter}, {instrumentation}, {density},
{vocal register or "instrumental"}, {room character}, {emotional movement}
```

`ambient drone, 60-70 BPM, no meter, felt piano and bowed strings, sparse, long hall
reverb, slow rise then stillness` — that is a usable prompt. `music like <artist>` is
rejected and unsafe.

---

## 4. The `motion-assets.md` contract

Ivy writes one file, `artifacts/output/03-strategy/motion-assets.md`, from
`.agents/templates/product/motion-assets-template.md`. Every entry:

```markdown
### Asset: AS-001 — {name}
- **Consumed by:** MO-003, MO-007
- **Purpose:** {what it is for in the motion}
- **Type:** {model.glb | texture.png | hdri.hdr | loop.webp | font.woff2 | sfx.wav}
- **Route:** client-data | reuse | css | procedural | stock | generated
- **Spec:** {dimensions, poly count, format, resolution budget}
- **Source:** {tool + model + version, or stock URL, or "repo: <path>"}
- **Licence:** {Apache-2.0 | OFL | CC0 | CC-BY-4.0 + attribution text | commercial tier X}
- **Generation prompt:** {the exact prompt used, verbatim}
- **Fallback:** {what ships if generation fails or is late}
```

**`Fallback` is not optional.** Generation takes minutes and can fail or run out of credits
mid-run. Every asset needs a named fallback — a stock equivalent, a CSS/SVG stand-in, a
solid colour, or a reduced-resolution version. A site that renders an empty slot because an
asset did not arrive is the failure this field prevents.

### Gate — `motion_assets_check.js`

```bash
node .agents/scripts/motion_assets_check.js check --require-assets --json
```

Fails on: an `AS-###` with no `Consumed by`, a `MO-###` in the spec with no matching
`AS-###` when the asset is external, a missing licence line, a missing fallback, a
generation prompt that still contains an artist name, or a declared route of `generated`
with no source. Same design as `motion_spec_check.js`: **absent file is a skip by default,
a failure under `--require-assets`** — because Phase 3b is only reachable once assets are
known to be in scope.

---

## 5. Provenance — keep the receipt

For anything generated, record: tool, model name **and version**, the verbatim prompt, the
date, the account tier, and the licence shown at generation time. Re-check the licence
before launch, because these terms move — Flux and 3D tiers in particular have changed
within the last year[^3][^4].

A commercial licence is not copyright ownership. Purely AI-generated output may not be
copyright-protectable in your jurisdiction[^2] — which means it can be copied by a
competitor and you may not be able to stop them. Worth knowing before you build a brand
asset you intend to own exclusively.

---

## Anti-patterns

- **Generating what CSS or SVG does better** — smaller, sharper, infinite, zero licence.
- **Generating an asset and not recording the prompt** — the work is unreproducible and the
  licence unverifiable.
- **Commercial work on a free-tier model** — FLUX dev output, Tripo free output, or Suno free
  output cannot ship.
- **A 4K HDRI on a hero scene** — 20MB to save a 300ms perceived-speed problem.
- **No fallback** — generation is slow, and empty slots ship.
- **Naming an artist in a music prompt** — rejected by the service and a rights problem.
- **One engine, one attempt, for a hero asset** — generate several and compare; the engines
  disagree more than the credits cost.
- **Treating a generated asset as final without checking the frame budget** — a beautiful
  8MB mesh is a dropped frame on a phone.

[^1]: Poly Haven (CC0), ambientCG (CC0), Kenney (CC0 assets), Fontsource / Google Fonts (SIL Open Font License 1.1).
[^2]: ElevenLabs pricing and Music Terms; Suno/Udio/ElevenLabs 2026 commercial-rights analyses — Suno free-tier output is non-commercial and upgrading does not retro-license it; Udio has downloads disabled; ElevenLabs self-serve tiers exclude streaming-platform distribution. https://elevenlabs.io/pricing · https://www.licenseorg.com/blog/ai-music-licensing-suno-elevenlabs · https://www.versely.studio/blog/ai-music-licensing-royalty-free-creator-guide-2026
[^3]: Black Forest Labs model licences — FLUX.1 schnell Apache-2.0 (commercial), FLUX.1 dev non-commercial, FLUX.1 pro API-only commercial; SDXL CreativeML OpenRAIL++-M. https://bfl.ai/models
[^4]: Meshy / Tripo3D / Rodin (Hyper3D) pricing and export documentation, 2026 — Meshy free output is CC BY 4.0 with attribution; Tripo free tier is non-commercial; GLB is the PBR-bearing web format. https://www.meshy.ai/features/text-to-3d · https://www.tripo3d.ai/ · https://swiftwand.com/en/text-to-3d-saas-comparison-2026-en/