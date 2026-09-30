# Design System Template

> **Used by:** Ivy (@product-designer)
> **Consumed by:** @developer, @architect, @qa-engineer, @tech-lead
> **Save to:** `artifacts/output/03-strategy/design.md`
> **Paired with:** `product-spec-template.md` (screen specs + flows), `motion-spec-template.md` (motion tokens merge here)
> **Prototype track:** `static-html | nextjs-component | not in scope`
> **Prototype runtime:** `vanilla HTML/CSS/JS + Tailwind CDN | Next.js + React + Tailwind + shadcn | not in scope`
> **Version:** 3
> **Last changed:** 2026-09-05

## How to use this file (designer as consultant)

Users often don't know what they want — or know it but can't write it down. Ivy's job is to extract taste, not interrogate it:

- **User named a style, mood, or reference?** Record it in Brand inputs, jump to §§3–4, play the choice back in one sentence ("So: Editorial, quiet, print-like — correct?"). Done.
- **User doesn't know?** Run the taste interview — max 3 questions, always with the menu in front of them: 1) name 2 products whose look you love; 2) quiet or loud? 3) it must feel like *what*, in one word? Then propose 2–3 styles from §4 with one-sentence rationale each and let them pick. Never ask "what style do you want?" without showing the menu.
- **Rule:** no tokens before taste is set. An empty Inspiration shelf (§7) means go back, not forward.

## Brand inputs (fill before picking a style)

- **Personality (pick 3):** e.g. trustworthy / playful / premium / clinical / bold / calm
- **Reference products:** {2–3 products whose look we want to echo, and what to steal from each}
- **Anti-references:** {1–2 products we must NOT look like, and why}
- **Color mode:** Default is Both — ship light AND dark token sets. Single-mode only with a written reason in Hard constraints.
- **Hard constraints:** {existing brand hex that must appear, font license limits, logo clear-space rules}

## Voice & tone

- **Voice (3 adjectives max):** {same three as Brand inputs — the product's voice never changes per screen}
- **Tone shifts by state:** calm in success, neutral and actionable in errors (never blame the user), warm-but-brief in empty states, explicit about consequences for destructive actions.
- **AI uncertainty phrasing:** low-confidence output is hedged and labeled, never asserted as fact.
- **AI fallback phrasing:** when inference fails, the message names the deterministic fallback and the next step.
- **Citation/groundedness labels:** generated content carries its source label or an explicit "no source found" marker.

## Product context (what we're building — pick ONE)

Context drives constraints; style drives tokens. A dense ops tool and a launch site can share a style but never share density, motion budget, or tone. Pick the context first — it narrows the style menu to its suggestions, but the final style call stays creative, not mechanical.

- [ ] **Sleek Utility** — dense admin/ops UI. Flat surfaces, 4px radii, system font stack acceptable. Use when: internal tools, dashboards, data entry. Suggests: Minimalism, Swiss Design, Bento Grid.
- [ ] **Minimalist Tech** — docs, devtools, content products. Generous whitespace, single accent color, hairline borders. Use when: readability is the product. Suggests: Minimalism, Editorial Design.
- [ ] **Modern Glassmorphism** — premium consumer SaaS. Translucency + blur over depth, soft shadows, layered cards. Use when: customer-facing web apps that must feel expensive. Suggests: Glassmorphism layered over any Quiet style. Caution: verify contrast on every blurred surface (WCAG AA).
- [ ] **Vibrant Brand-First** — launches, campaigns, youth/creator products. Saturated brand color, oversized type, motion-led. Use when: memorability beats density. Suggests: Maximalism, Y2K, Neobrutalism, Claymorphism.
- [ ] **Conversion Storefront** — shops, booking flows, checkout funnels. Price clarity, trust signals, cart persistence, one-thumb mobile pay. Use when: revenue passes through the UI. Suggests: Bento Grid, Minimalism, Claymorphism (friendly carts). Caution: urgency patterns must stay honest — fake countdowns and false scarcity are trust-killers, never spec them.
- [ ] **Custom: {name}** — none of the above fits. Write 2–3 sentences: what the product is, who uses it, and which constraint matters most (density / trust / memorability / readability). That becomes the context; the style still comes from the menu below.

## Style menu (how it looks — pick ONE, then make it yours)

Creativity has no boundaries, but taste needs a starting point. Circle ONE style below and delete the rest so downstream agents never guess. **Know what you want and it's not here?** Skip the menu: write 3 adjectives + 1 reference URL — that becomes Style #13, `Custom: {name}`, with the same one-line definition format.

**Quiet — clarity first** (dashboards, tools, content, enterprise):

- [ ] **Minimalism** — whitespace, one accent, nothing decorative. Use when: the content is the product (docs, devtools, readers).
- [ ] **Swiss Design** — grid, grotesque type, asymmetric hierarchy. Use when: information density must stay elegant (data products, editorial dashboards).
- [ ] **Editorial Design** — magazine rhythm: drop caps, pull quotes, strong type scale. Use when: long-form content, brand storytelling.
- [ ] **Bento Grid** — compartmentalized cards on a strict grid. Use when: feature overviews, dashboards, landing pages that scan fast.

**Loud — impact first** (launches, consumer, youth, campaigns):

- [ ] **Maximalism** — more: layered type, clashing color, controlled chaos. Use when: memorability beats density. Caution: needs a senior eye — chaos without hierarchy is just noise.
- [ ] **Brutalism** — raw HTML energy: borders, default fonts, no polish. Use when: anti-brand statements, hacker/dev audiences. Caution: readability still non-negotiable.
- [ ] **Neobrutalism** — brutalist bones + playful color, thick borders, hard shadows. Use when: creator tools, fintech-for-gen-Z, products that wink.
- [ ] **Y2K** — chrome, gloss, gradients, early-internet nostalgia. Use when: music, fashion, creator culture. Caution: dates fast — reserve for campaigns, not design systems.
- [ ] **Claymorphism** — soft 3D blobs, pastel, inflated depth. Use when: friendly onboarding, education, kids/family products.

> **Loud contexts:** propose one agency-grade concept for the Signature moment — WebGL/Three.js scene, Lenis + GSAP scroll choreography, custom cursor. Each ships with fallback + perf budget + reduced-motion plan (see `Agency mode` in `@product-designer`).

**Tactile — depth and material:**

- [ ] **Skeuomorphism** — real-world textures: leather, glass, brushed metal. Use when: pro audio/video tools, luxury, interfaces mimicking physical craft. Caution: most expensive style to execute well.
- [ ] **Neumorphism** — soft extruded plastic, subtle dual shadows. Use when: dark-mode dashboards, music players, single-accent minimal UI. Caution: contrast fails easily — verify every control at WCAG AA.
- [ ] **Glassmorphism** — translucency + blur over depth, layered cards. Use when: customer-facing apps that must feel premium. Caution: verify contrast on every blurred surface.

## Anti-generic rule (mandatory — read before tokens)

Default model output has a recognizable look, and this file exists to prevent it. A design that could be mistaken for any model's default output **fails review** — Ivy must say so and restart from the brief, not polish the generic.

**Banned defaults:**
- Blue-tinted near-black ("navy") dark backgrounds. Dark surfaces are desaturated neutral greys — zero blue push. Reference band: page background between `#101114` and `#1e1e1e`, raised surfaces one step lighter, borders white at 6–12% opacity, text off-white (`#e6e6e6`-ish, never pure white on pure black).
- Violet→blue hero gradients, neon glow cards, and gradient-headline + centered-hero + three-feature-cards page formulas as the whole personality.
- Single-mode shipping. Both light and dark token sets are the default (§2); a dark-only navy theme is never an acceptable default.

**Differentiator requirement:** every design names ONE signature element (from the brief's Signature moment) that makes it unrecognizable as generic output. If you can't name it, the design isn't done.

## Design rules (real UI principles — the AI must obey these, not just the tokens)

- Contrast: body text hits WCAG AA (4.5:1) on every surface, including blurred and translucent ones.
- One primary action per screen; everything else is visually quieter.
- Touch targets ≥ 44px; spacing comes only from the scale below — no magic numbers.
- Max 2 typefaces: headings carry personality, body carries readability.
- Every interactive element fills all five Component-states cells — no empty cells ship.
- Motion is transform/opacity only, with a reduced-motion fallback per `motion-spec.md`.
- Empty, error, and success states get the same care as default (copy lives in `product-spec.md`).
- If a screen needs an explanation label, simplify the screen first.

## Inspiration shelf (show what "good" looks like)

Log 2–3 references before writing tokens. Starter shelf — replace with project picks:

- lafys.com — {what to steal: layout / type / motion}
- motionsites.ai — {what to steal}
- sceneai.art — {what to steal}

## Design brief (think like a designer — paste into generation prompts)

> Design {product/screen} for {audience}. It should feel {adjective}, {adjective}, {adjective} — never {anti-adjective}. Style: {menu style # + name, or Custom} with {signature element}. Signature moment: {the one interaction users will remember}. Constraints: {brand hex, font limits, color mode}.

## Custom variables (CSS custom properties / design tokens)
```css
:root {
  /* Define design tokens here */
}
```

## Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | | |
| `--color-secondary` | | |
| `--color-accent` | | |
| `--color-success` | | |
| `--color-warning` | | |
| `--color-error` | | |
| `--color-surface` | | |
| `--color-text` | | |

## Typography
| Token | Font Family | Size | Weight | Line Height |
|-------|------------|------|--------|-------------|
| `--font-heading` | | | | |
| `--font-body` | | | | |
| `--font-mono` | | | | |

## Component states
| Component | Default | Hover | Focus | Active | Disabled |
|-----------|---------|-------|-------|--------|----------|
| | | | | | |

## Motion
| Token | Value | Use |
|-------|-------|-----|
| `--ease-standard` | | Default transitions |
| `--ease-exit` | | Elements leaving |
| `--ease-spring` | | Delight moments |
| `--dur-fast` | | Hover, press, toggles |
| `--dur-base` | | Panels, accordions, snackbars |
| `--dur-slow` | | Page transitions, modals |
| `--dur-epic` | | Cinematic entrances |

## Micro-animations
| Name | Duration | Easing | Trigger |
|------|----------|--------|---------|
| | | | |

## Responsive breakpoints
| Name | Min Width | Layout Rules |
|------|-----------|-------------|
| Mobile | 0 | |
| Tablet | 768px | |
| Desktop | 1024px | |
| Wide | 1440px | |

## Layout spacing
| Scale | Value | Usage |
|-------|-------|-------|
| xs | | |
| sm | | |
| md | | |
| lg | | |
| xl | | |
