---
purpose: Motion asset manifest — every asset MOTION depends on (an MO-### animates it and it is not already in the repo), with the route, licence, provenance, and fallback. Produced by @product-designer (Ivy) during /motion Phase 3b. Assets used only by a neighbouring phase belong in that phase, logged as an open item — not here.
audience: @developer, @tech-lead, @qa-engineer, owner (for licence questions)
paired_with: motion-spec.md (MO-### references AS-###), design.md (visual language)
---

# {Feature Name} — Motion Assets

## Why this file exists

An `MO-###` that animates an asset which does not exist, cannot legally ship, or has no
fallback is an unimplementable prompt — the same defect class as a missing duration, and
`motion_spec_check.js` cannot see it because it validates the prompt, not its dependencies.
This file is the missing half.

Gate:

```bash
node .agents/scripts/motion_assets_check.js check --require-assets --json
```

Route order matters — record it. Generation is the **last** resort:

1. **the client's own material** — engineering data, measurements, real photography of the build
   (`client-data`). First on any credibility-driven surface: it is what a skeptical reader can verify
2. reuse an existing repo/design-system asset
3. draw it in CSS/SVG
4. make it procedural (shader, noise, parametric geometry)
5. take it from a CC0/OFL stock source
6. only then generate it

## Budget

> **Leave a cell empty rather than guessing.** The Done-when requires budgets to be *measured,
> not estimated*. The `{}` placeholders below are holes to fill from a measurement, not
> invitations to supply a plausible number — a blind run found these static figures pulling
> against the rule and had to override them.

Targets derived from measured sites in `creative-site-playbook.md` §6.1 — not invented
thresholds. Fill in `Actual` by measuring, not estimating.

| Class | Target | Measured on this surface |
|-------|--------|---------------------------|
| Above-the-fold images | ≤ 1.5 MB | {} |
| Per-image raster | ≤ 250 KB | {} |
| Hero illustration | WebP/AVIF, ≤ 400 KB | {} |
| HDRI environment | ≤ 1 MB (format-capped) | {} |
| Custom video loop | ≤ 3 MB, or delete it | {} |
| **Total page weight** | **state your own number and where it came from** | {} |

The last row is the only one that really matters, and no universal value exists: award-site
`mindmarket.com` runs 14 canvas surfaces in **0.17 MB** of images, while award-site
`sentient.foundation` ships **17.3 MB** of its own video. Both are on award lists. Measure
your site, name the number, and own it.

Two measured traps worth checking explicitly:

- **A PNG where WebP would do.** One reference site carried 4.3 MB of PNG across two hero
  illustrations — more than its entire JS bundle — while WebP-everything else.
- **Video in the scroll layer.** The heaviest payloads measured were all MP4 loops, not
  geometry. Procedural/shader alternatives are usually cheaper *and* sharper.

## Assets

### Asset: AS-001 — {name}
- **Consumed by:** MO-{NNN}, MO-{NNN}
- **Purpose:** {what it is for in the motion — not just what it is}
- **Type:** {model.glb | texture.png | hdri.hdr | loop.webp | font.woff2 | sfx.wav}
- **Route:** client-data | reuse | css | procedural | stock | generated
  (`client-data` first: the client's own material. What lives in the repo is a `Source` question,
  not an inclusion question — supplied station tables still belong here.)
- **Spec:** {dimensions, poly count, format, resolution, channel requirements}
- **Source:** {tool + model + version, stock URL, or `repo: <path>`}
- **Licence:** {Apache-2.0 | OFL | CC0 | CC-BY-4.0 + exact credit line | commercial tier + plan name | project-authored - first-party work with no third-party rights}
- **Generation prompt:** {verbatim, only when Route is generated}
- **Fallback:** {what ships if generation fails or is late — stock equivalent, CSS stand-in, solid colour, or reduced resolution}

*(repeat per asset)*

## Licence notes

{Any attribution lines that must ship with the site. Non-commercial or unverified licences
must not appear above — if one does, the gate fails and the asset must be regenerated on a
commercial tier.}

## Provenance log

| Date | Asset | Tool + model + version | Account tier | Licence at generation | Prompt |
|------|-------|------------------------|--------------|----------------------|--------|
| {} | AS-001 | {} | {} | {} | {} |

Re-check licences before launch. These terms have moved inside the last year — the AI asset
landscape is not stable, and a licence that was permissive at generation time is the
provenance record, not a guarantee about today.

## QA checklist

- [ ] `motion_assets_check.js check --require-assets` exits 0
- [ ] Every `MO-###` declaring an external asset is covered by an `AS-###`
- [ ] Every asset has a named fallback, and the fallback was actually rendered once
- [ ] Every licence is verified against the source's current terms
- [ ] Attribution lines ship in the product where required (CC-BY)
- [ ] Byte budgets measured, not estimated — Lighthouse on a throttled mobile profile
- [ ] Every raster is WebP/AVIF unless alpha or fidelity genuinely requires PNG
- [ ] Total page weight measured and recorded above, with the method used
- [ ] No commercial work rests on a free-tier licence
- [ ] Progressive strategy works: placeholder → asset → final, verified offline and online