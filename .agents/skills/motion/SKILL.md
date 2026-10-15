---
name: motion
description: Orchestrates motion research, a thesis-and-spec phase for creative or WebGL surfaces, asset sourcing and AI asset generation, and an explicit handoff to the standard development workflow for animation-significant products. Use this skill whenever the user mentions motion design, animation, transitions, micro-interactions, motion spec, motion prompts, animated UI, an animation-heavy surface, OR asks for an "interactive website", "creative website", or "motion design website" (these are explicit DNA 4 Clear-intent triggers — activate without waiting for the word "animation"). Knowledge lives in .agents/references/motion/ and is loaded on demand, never inline.
metadata:
  version: "1.0"
  last_updated: "2026-10-06"
---

# Motion — Motion Design & Implementation Workflow

## What this skill does

Runs the motion **design preflow**: **motion research → motion spec → implementation handoff**. It is the single entry point for motion planning and coordinates the research and design agents without duplicating the standard `/develop` and `/test` workflows. All domain knowledge lives in on-demand references so context loading stays efficient.

**Previous skill:** `design` (produces the product spec + design.md that motion extends)
**Next skill:** `develop` (owns implementation, code review, and runtime QA after the handoff)

## When to use

- "Add motion/animations/transitions to this product"
- **"Build an interactive / creative / motion design website"** — an explicit request for a motion-led site is a DNA 4 Clear intent (C ≥ 0.85). Ivy activates `/motion` directly, no confirmation needed; do not ship a static spec for it.
- "Create the motion spec / motion prompts for this feature"
- "Which animation library should we use?" (delegates tech research to @researcher)
- Motion is a differentiator of the product (games, marketing sites, animation-heavy apps)

## When NOT to use

- Products with a handful of trivial hovers → just let @developer use CSS transitions inside `/develop`; no skill invocation needed.
- Static-only products → skip entirely.
- Persona-level customization of Ivy or Rex → use `/customize-agent`.

## Prerequisites

- [ ] `artifacts/output/03-strategy/product-spec.md` and `design.md` exist (from `/design`), OR the user provides the screens/features in scope.

  **The bypass has one hard consequence.** Phase 3 merges motion tokens **into `design.md`**,
  so entering without `/design` means there is nothing to merge into. When the prerequisite
  is bypassed, either (a) create a minimal `design.md` carrying the supplied screens plus the
  motion token block, or (b) state explicitly that the token merge is deferred to
  `/design`'s next pass and record that in the handoff. Do not silently skip it — a motion
  spec whose tokens live nowhere is the "underspecified timing gets improvised by Rex"
  defect wearing a different hat.
- [ ] Agent references exist (they do — this is a curated skill):
  - `.agents/references/motion/motion-design-guidelines.md` (Ivy)
  - `.agents/references/motion/motion-implementation-guidelines.md` (Rex)
  - `.agents/references/motion/motion-research-guide.md` (researcher / ux-researcher)
  - `.agents/references/motion/creative-site-playbook.md` (Ivy + Rex — creative/experiential surfaces only)
  - `.agents/references/motion/motion-asset-generation.md` (Ivy + Rex — whenever external assets are needed)
- [ ] Template: `.agents/templates/product/motion-spec-template.md`
- [ ] Template: `.agents/templates/product/motion-assets-template.md` (creative track / external assets)
- [ ] Handoff template: `.agents/templates/planning/motion-handoff-template.md`
- [ ] Gate: `.agents/scripts/motion_spec_check.js`, `.agents/scripts/motion_assets_check.js`

---

## Two surfaces — every phase

`/motion` runs seven phases (1, 2, 2b, 3, 3b, 4, 5) and every one of them ends by telling
the owner something. The
rule is stated here **once**, at skill level, because it applies to all of them — not to
one step:

- **Document surface** — `motion-research.md`, `motion-spec.md`, and `motion-handoff.md`
  carry the machine record. Plain sentence first, then the specifics an implementer needs.
- **Chat surface** — the reply carries the plain sentence, the consequence, and the next
  action. No template field names, no phase-internal labels, no bracketed gate tokens: a
  reader who has never seen this engine must be able to act on the sentence alone
  (`.agents/references/vespyr-dna.md` §Two surfaces).

State the consequence, not the label. "Lightweight" is not a classification — it is "we are
skipping competitive research because this is three hover transitions; if that is wrong,
say so now, because the library decision gets made without landscape evidence."

## Halt conditions

Any one halts and escalates:

- Phase 1 is **`None`** but the owner asked for motion — stop and say so rather than
  manufacturing a spec. This is the one `None` outcome that is a disagreement, not a
  finding.
- `motion_spec_check.js check --require-spec` reports **contradictory** evidence — a prompt
  whose `Property(ies)` label disagrees with its keyframes. Do not "pick one"; the
  implementer cannot know which is true. Return both to `@product-designer`.
- `motion-research.md` is missing at the end of Phase 2 on a full pipeline — the spec gate
  cannot open. Do not let Ivy proceed from partial research and call it a spec.
- Reduced-motion is unavailable because the target platform or framework cannot express
  `prefers-reduced-motion` — halt at Phase 3 and escalate to `@architect`. Shipping motion
  with no reduced-motion path is an accessibility defect, not a degraded mode.
- The `design.md` prerequisite was bypassed (owner-supplied screens) **and** Phase 3 is about
  to merge motion tokens into a file that does not exist — halt; create `design.md` first
  or agree explicitly to skip the token merge.

## Workflow

### Phase 1: Scope check (gate)

Determine whether full motion treatment is warranted:

- **Full pipeline** — motion is a differentiator, or the feature set has 5+ animated surfaces, or scroll/3D/canvas motion is involved.
- **Lightweight** — only micro-interactions and transitions. Run Phase 3 only (spec, no dedicated research phase). Ivy loads the design guidelines and produces the motion spec directly.
- **None** — no motion in scope. Stop and report; do not manufacture work.
- **Creative/experiential** — an interactive, portfolio, marketing, or "creative website"
  surface where motion is the product rather than a layer on it. **This is a distinct track,
  not a synonym for Full**: it adds Phase 2b (thesis + creative playbook) and, whenever
  external assets are needed, Phase 3b (asset manifest). Record it as `creative` in the
  scope lock. It runs the full pipeline **plus** those two phases.

  **`creative` is also the track for credibility-register surfaces that are not
  "creative websites"** — B2B, investor, technical, scientific, clinical, regulated,
  instrument. A clinical trial results record is not an expressive marketing page, yet
  Phase 2b's credibility register exists for exactly it. A blind run on one had to lock
  `creative` while stating plainly that by the definition above it was `lightweight`,
  because the credibility machinery lives only behind a creative-only phase. **That is a
  routing defect, not a stretch the agent had to invent.** If the surface is
  credibility-driven, take `creative` and say so in the thesis: motion is a layer, the
  register is credibility.

  Being explicit matters because the failure mode is a site built to the ordinary motion
  guidelines: three staggered fade-ups and a parallax blob, indistinguishable from every
  AI-generated site. That is the most generic output available.

**Record the decision — it is what makes a later audit possible.** The scope call decides
which phases run, so it must leave a record. An unrecorded call cannot be audited later:
nothing can tell "lightweight was correct" from "research was silently skipped":

```bash
node .agents/scripts/step_tracker.js scope-lock --skill motion --track "full|lightweight|none|creative" --agent product-designer
```

**State machine:** run:
```bash
node .agents/scripts/orchestrator_state.js status
node .agents/scripts/orchestrator_state.js next
```
Confirm the current phase expects research, strategy, or planning work before proceeding. Do not start implementation from this skill.

**If the phase does not match, you have three sanctioned options — never invent a fourth:**
1. The project is ahead of the phase this skill produces into — proceed, and record the mismatch in the handoff.
2. The project is behind — say so plainly and ask whether to run `/shape-up` or `/design` first. Motion is a preflow; it does not define the product it animates.
3. **The project is new or has no pipeline yet** — proceed. Note that `orchestrator_state.js status`
   **auto-initialises** a pipeline, so by the time you read it there is always a phase (measured:
   `validation`, with `idea-brief.md` as the action). Treat that auto-created phase as "no phase
   was ever set", not as a real prerequisite. `/motion` is a valid entry point when the owner
   brings a brief directly.

**Record which option you took, in every case** — not only option 1. Write one line into
`motion-handoff.md`: the phase reported, the option chosen, and why. All three options leave the
reported phase unchanged (`set-phase`/`advance` are prohibited), so without that line a later
reader sees a permanent mismatch and cannot tell it was a decision rather than an oversight.

Do not `set-phase` or `advance` from this skill to make the check pass. That is a silent state change made to satisfy a precondition.

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
# ONLY when @researcher and @ux-researcher actually ran as separate delegations.
# If they did not, use the single-session block below instead — this one attributes work to
# agents that did not produce it, and a provenance record that lies is worse than none.
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/motion-competitive.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/motion-tech-landscape.md
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/motion-usability.md
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/motion-accessibility.md
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/motion-patterns.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/motion-research.md
```

**Single-session variant — use this when no delegation occurred (sets `provenance: single-session`):**

```bash
# One `complete`, attributed to whoever actually did the work. Do NOT split this across
# researcher/ux-researcher unless those agents really ran.
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 02-research/motion-research.md
```

Record it in the file too: who produced it, and that the per-agent split did not occur.

**If sub-agent delegation is unavailable**, do not skip Phase 2 and do not fabricate per-agent
attribution. Record `Research provenance: single-session` in the spec — that single fact is what
waives the accessibility sign-off downstream, so state it rather than leaving it to be inferred. Phase 2 produces **six** artifacts: `@researcher` writes 2 track files,
`@ux-researcher` writes 3, and the merge is a 6th. A single session cannot supply five
independent research passes and then honestly sign for two different specialists. Produce `motion-research.md` yourself and state
the real attribution — who produced it, and that the per-agent split did not occur. A run that
writes "Produced by @researcher and @ux-researcher" with no delegation behind it has fabricated
a provenance record, and the artifact format currently pressures you into exactly that.

### Phase 2b: Creative thesis & playbook ⟨creative track only⟩

For an interactive/portfolio/marketing/"creative website" surface, a motion spec written from
the ordinary product guidelines produces generic work. Phase 2b forces the decision first.

Ivy loads `.agents/references/motion/creative-site-playbook.md` and produces
`artifacts/output/02-research/motion-thesis.md` containing:

1. **The thesis, in one sentence**, in one of two registers — pick the register, do not
   default to the first:
   - **Expressive** — what the reader *feels* here that they could not feel elsewhere. For
     brand, portfolio, consumer, cultural surfaces. "Weight." "Depth behind glass."
   - **Credibility** — what the reader comes to *believe*, and could they check it? For B2B,
     investor, technical, scientific, regulated surfaces. "Nothing here moves to decorate — it
     moves because a measurement changed."

   **The credibility register is a first-class answer, not a fallback.** A blind run on a B2B
   marine brief rejected all five expressive theses as wrong for its audience — momentum reads
   as entertainment, glass as consumer luxury, reveal as implying something to hide, and
   displacement as implying a structural defect in a carbon hull under load — and had to
   translate the thesis into a register the catalogue did not contain. It should not have had
   to. Technical and investor work is a legitimate use of this skill.
2. **The one moment that proves it** — and the shared test in *either* register: **could a
   skeptical reader falsify it?** A thesis with no proving moment is a mood board; a proving
   moment nobody could check is a claim.
3. **The stack and the wiring** — which library drives what, and how the loops are connected.
   The playbook documents the exact integrations; do not improvise them. This is the
   **authoritative** stack decision; Phase 4's handoff table restates it rather than
   re-deciding it.
4. **Reduced-motion equivalents per effect** — named, not implied.
5. **Asset needs** that Phase 3b must resolve.

**Gate:** if Ivy cannot name the proving moment, stop and say so. That is a disagreement worth
surfacing, not a gap to paper over with more effects. If the answer is genuinely "this audience
feels nothing — it must read as credible", that is a **credibility thesis**, not a failure to
have a thesis.

```bash
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 02-research/motion-thesis.md
```

### Phase 3: Motion spec (Ivy)

Invoke `@product-designer` with instructions to load `.agents/references/motion/motion-design-guidelines.md` and produce the motion spec from the motion research.

Ivy outputs **three** files, not one:

- `artifacts/output/03-strategy/motion-spec.md` — motion voice, tokens, choreography rules, and one complete motion prompt per animation (per `.agents/templates/product/motion-spec-template.md`)
- `artifacts/output/03-strategy/user-stories.md` — **the `US-###` stories each `MO-###` traces to.** A hard gate dependency, not an optional extra: see the warning below.
- Motion tokens merged into `artifacts/output/03-strategy/design.md`

**`user-stories.md` is required and was under-documented — read this.** `motion_spec_check.js`
fails with *"MO-### … are not referenced in user-stories.md — spec'd but never traced to an
acceptance criterion"* unless every `MO-###` appears in that file. A real-model run avoided
that failure **only** because it read the gate script's defaults first; the skill text never
told it. If the file does not exist, the gate fails on every prompt.

Two directions, and they are not the same check:
- **Spec-side orphan** — a prompt's `Associated stories:` is empty. Caught in `motion-spec.md`.
- **Story-side drop** — the prompt is complete but no `US-###` mentions it. Caught only by
  reading `user-stories.md`. This is the silent-drop defect: work designed, never built.

**Allocate `AS-###` IDs here, in Phase 3, not in Phase 3b.** Any prompt needing an external
asset gets an `Asset:` line naming an `AS-###`, a direct repo path, or `none`. Phase 3b then
documents route/source/licence/fallback for IDs already allocated. This is the only ordering
that works — Phase 3b's own gate cross-checks `Consumed by: MO-###` against prompts that do not
exist until this phase runs.

**Gate check — spec is only "done" when:**
- [ ] Every motion prompt has explicit duration, easing, from→to, reduced-motion fallback
- [ ] Reduced-motion plan is complete (mandatory, non-skippable)
- [ ] Every motion traces to a user story in BOTH directions (zero orphans, zero drops)
- [ ] Every prompt needing an external asset carries an `Asset:` line naming an `AS-###`
- [ ] **Prompt completeness + traceability (mechanical):** `node .agents/scripts/motion_spec_check.js check --require-spec --json` exits 0. It parses the real `motion-spec.md` and fails on any `MO-###` prompt missing a required field, animating a non-composited property, a non-fade reduced-motion fallback, a non-numeric timing tolerance, a spec-side orphan (no `US-###`), or any `MO-###` not referenced in `user-stories.md` (spec'd-but-never-built — the silent-drop defect). This is the enforcer for the "Rex must not improvise timing" anti-pattern — an underspecified prompt is flagged back to Ivy, not shipped.

  **Path resolution — the two gate flags differ from the two state scripts.** The gates accept
  `--root <dir>`; `orchestrator_state.js` and `step_tracker.js` have **no** `--root` at all and read
  `process.cwd()`. So:

  - Working in the repo (the normal case): run every command as printed. Nothing to do.
  - Working in a separate project tree: `cd` into it, give the gates `--root .`, and rewrite the
    state-script paths to the repo — e.g. `node ../../.agents/scripts/orchestrator_state.js …`.

  Doing only one of those halves splits state across two roots silently. A blind run hit exactly
  this: it `cd`-ed as instructed, and every printed path immediately stopped resolving.

  **`--require-spec` is mandatory here, and omitting it silently disables the gate.** Without the flag, an absent `motion-spec.md` is treated as "motion not in scope" and exits **0** — correct for `/design` step-06a and `/develop` step-07, where motion may genuinely be out of scope, but wrong here: Phase 3 is only reachable once motion *is* in scope, so a missing spec is the failure this gate exists to catch. Measured on this repo, the flagless form returned `ok: true` with no spec on disk and the reason string `"motion not in scope"` — a gate passing in the only state it must fail. The flag makes absence `exit 1`. Never read exit 0 here without checking `skipped` and `found` are both absent in the JSON.

  **Reduced-motion phrasings the gate accepts — and rejects.** The prose in
  `motion-design-guidelines.md` §6 ("cross-fades (≤ 200ms, opacity only)") is looser than the
  mechanical check, and a blind run lost two gate iterations to it. The gate wants a **named
  endpoint**, not a description of motion still in progress:
  - accepted: `instant state change`, `cross-fade 150ms`, `static pose from first paint`,
    `the loop never starts`, `never created`, `does not run`, `cross-fades from opacity 0 to 1`
  - rejected: anything describing the motion as still running, however gently (`still running`,
    `the loop continues`, `a gentle 900ms fade that is still running`), and any fade longer than
    200ms — `cross-fade 900ms` is a slow transition wearing a fade's name

  **A cross-fade is a cross-fade, with or without a duration.** This list used to reject
  `cross-fades from opacity 0 to 1` while accepting `cross-fade 150ms`, and gave the reason "a
  duration-bearing transition, not an endpoint" — which does not distinguish the two, because
  `cross-fade 150ms` is duration-bearing as well. An agent could only pass by guessing. Both are
  accepted now; the enforced bounds are the 200ms ceiling and the ban on describing motion as still
  running.

  **One hazard remains, and it is not gate-checkable:** if the element starts at `opacity: 0`, the
  content is invisible until the fade runs. That is fine under `prefers-reduced-motion`, which still
  runs CSS transitions — but state the *resting* endpoint (`settles at opacity 1`) so a reader can
  tell the content ends up visible.

  When a gate rejects a fallback you believe is correct, do not weaken the gate — restate the
  fallback as an endpoint and keep the cross-fade as the *route* to it.

  **The property check reads the keyframes, not the label.** It fails when a prompt's keyframe text animates a layout/paint property (`height`, `width`, `top/left/right/bottom`, `margin`, `padding`, `box-shadow`, `background`, `border-radius`, `filter`) *and* separately when the declared `Property(ies)` label contradicts those keyframes. A spec claiming `Property(ies): transform` while animating `height` is the exact layout-thrash defect this gate is for, so the artifact wins over the claim.
- [ ] Full pipeline: `motion-research.md` exists and each recommendation is cited
- [ ] Lightweight pipeline: `Evidence mode: lightweight` records existing evidence and why dedicated research was not warranted
- [ ] **Two fields, both gate-enforced** (`motion_spec_check.js --require-spec` fails on a missing
      or placeholder value):

      | Field | Question | Values |
      |---|---|---|
      | `Evidence mode:` | how much research happened? | `full` · `partial` · `lightweight` |
      | `Research provenance:` | who produced it? | `delegated` · `single-session` |

      Provenance is required whenever evidence mode is `full` or `partial`; omit it for
      `lightweight`. **If some delegation succeeded and some did not, that is `partial` +
      `delegated` — say so and name which tracks landed.**
- [ ] Creative track: `motion-thesis.md` names the thesis and its proving moment (Phase 2b)
- [ ] Creative track / external assets: `motion-assets_check.js check --require-assets --json` exits 0, and every asset carries a verified licence and a named fallback (Phase 3b)
- [ ] Accessibility authority: `@ux-researcher` signs off on the motion accessibility plan for full pipelines

**Shader and WebGL prompts are legitimate here, and the property check handles them.** A
prompt whose `Property(ies)` is `uTime`/`uProgress` and whose keyframes animate uniforms is a
real prompt — it passes, because uniform names are not CSS properties. Its reduced-motion
fallback must still be named, because a shader hero is the most common vestibular trigger
in this category and it carries no information.

**A sanctioned exception exists for non-composited properties that do not trigger layout.**
Some motion needs `stroke-dashoffset` (SVG line draw — `DrawSVG`), `stroke-width`, `clip-path`,
or `d` (path morph — `MorphSVG`). These are **not** layout-triggering. Phase 3, Phase 5, and
`motion-handoff-template.md` all now permit them via the `Composited exception:` line, and
`motion_spec_check.js` **enforces** that line — a prompt animating a non-standard property
without it fails the gate. Do not pick one reading and do not invent your own mechanism.

**The list above is NOT exhaustive — it is a sample, not a whitelist.** The test is one
question: **does animating this property force layout?** Anything that cannot is a legitimate
exception whatever its name — `stroke-dashoffset`, `stroke-width`, `clip-path`, `d`,
`background-position`, or a CSS custom property feeding a paint-only property such as
`color-mix`. Anything that *can* force layout or a paint pass (`height`, `width`,
`top`/`left`/`right`/`bottom`, `margin`, `padding`, `filter`, `box-shadow`) is not; that is the
defect the gate exists to catch. When unsure, declare the exception and prove no reflow — do not
redesign the effect to stay inside a list this skill never meant to be closed. (A real-model run
did exactly that: it abandoned a paint-only CSS-variable effect rather than risk it.)

When you use an exception:

1. Name the property in `Property(ies)` and in the keyframes.
2. Add `**Composited exception:** <property> — <why it is not layout-triggering>` to the prompt.
   This is the sanctioned mechanism; do not invent your own.
3. Give it its own QA assertion proving no reflow fires, instead of letting it inherit the
   composited-only claim.

A real-model run hit this before the mechanism existed and had to invent one — which is why it is
now named, and why inventing your own is not the sanctioned path.

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 03-strategy/motion-spec.md
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 03-strategy/user-stories.md
# design.md is a Phase 3 output too (the token merge) and does not always exist beforehand.
# `complete` records a version, so call it ONLY if the file is present.
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 03-strategy/design.md
```

### Phase 3b: Asset manifest ⟨creative track, and any spec needing external assets⟩

**Run this AFTER Phase 3, never before.** The `AS-###` IDs were allocated in the spec's
`Asset:` lines, and `Consumed by: MO-###` can only be checked against prompts that now
exist. The documented order was previously 3b-then-3, which is circular: an agent
following it cannot pass its own gate until it has already written the phase it was told
to wait for. Found by a real-model run; the order was decorative.

**A motion prompt that animates an asset which does not exist is unimplementable** — the
same defect class as a missing duration, and `motion_spec_check.js` cannot catch it because
it validates the prompt rather than its dependencies.

Ivy loads `.agents/references/motion/motion-asset-generation.md` and writes
`artifacts/output/03-strategy/motion-assets.md` from
`.agents/templates/product/motion-assets-template.md`. Route order is fixed and generation is
last: **client-data → reuse → CSS/SVG → procedural → stock → generated**.

**`client-data` is the client's own primary material** — engineering geometry, station tables,
measurements, photographs of the real build or test run. It sits ahead of `reuse` because on a
technical or credibility-driven surface it is not a convenience, it is usually the only
defensible route: an AI-generated hull is a fiction about a physical object that a due-diligence
reader is trying to verify.

**Gate (mechanical):**

```bash
node .agents/scripts/motion_assets_check.js check --require-assets --json
```

`--require-assets` is mandatory and omitting it silently disables the gate — the default
treats an absent manifest as "no external assets", which is right for `/design` and
`/develop` but wrong here, because Phase 3b is only reachable once assets are known to be in
scope.

**Licence is checked before generation, not after.** Non-commercial or unverified licences
must not reach the manifest at all: the most common trap is commercial work sitting on a
free-tier model whose output cannot legally ship.

```bash
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 03-strategy/motion-assets.md
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
- [ ] Only `transform` and `opacity` are animated — **or** a property carrying a `Composited exception:` in the spec, which must be non-layout-triggering and must have its own no-reflow assertion. No layout properties, no `filter`, no paint-forcing properties. 60fps evidence exists on a mid-range device
- [ ] Motion tokens match `design.md`; SSR/hydration behavior is verified where applicable
- [ ] Heavy runtimes are lazy-loaded and autoplay loops have a kill switch

---

## Done when

`/motion` is complete when **all** of these hold. It does not complete at Phase 3 — the
handoff is the completion boundary.

**Scope track — record exactly one in the scope lock.** `lightweight`, `full`, `creative`, or
`none`. `none` means stop and has no row. The other three are not peers — `creative` is `full`
plus two phases:

| Track | Adds | Extra cells |
|---|---|---|
| `lightweight` | nothing — Phase 2 skipped by decision | evidence-exception cell below |
| `full` | Phase 2 research | — |
| `creative` | Phase 2 research + **Phase 2b** thesis + **Phase 3b** assets | creative cells below |

Then apply **All tracks**, then the row's extra cells. Ticking a `creative` cell while claiming
`lightweight`'s Phase 2 skip is a contradiction, not a stricter bar.

**Research cells — read `Evidence mode:` and `Research provenance:` from the spec:**
- [ ] `Evidence mode:` and `Research provenance:` are stated and pass the gate
- [ ] `full` → all six Phase 2 artifacts exist, each `complete` recorded against its real producer
- [ ] `partial` → the spec names **which** track artifacts landed and which did not
- [ ] `lightweight` → the spec records the evidence consulted and why dedicated research was not warranted
- [ ] `motion-research.md` exists, cites every recommendation, and states its real provenance in its header

**The accessibility sign-off is ONE cell, and it keys on provenance — never on the extent label:**

- [ ] `@ux-researcher` signed off on the motion accessibility plan **— satisfied if a sign-off is
      recorded; waived if `provenance: single-session`** (there was no `@ux-researcher` to sign
      off). If waived, record the waiver in the handoff so the gap is visible downstream.

A `partial` run that delegated **keeps** its sign-off. The previous vocabulary tied the waiver to
a `degraded` label, which meant a run with 3 of 5 artifacts and a real sign-off could only describe
itself by giving up the sign-off it had earned. That incentive is removed, not discouraged: a
taxonomy that leaves no honest option gets escaped in whichever direction looks compliant.

**`creative`** (runs the full pipeline *plus* the items below — not a substitute for it):
- [ ] `motion-thesis.md` names the thesis and the one moment that proves it — a thesis with no proving moment is a mood board, and that is a disagreement to surface, not a gap to fill with more effects
- [ ] All the `full` requirements also hold — including the research cells above. The accessibility
      sign-off follows the single provenance-keyed cell, not this row.
- [ ] The stack wiring is specified, not improvised: Lenis drives one RAF loop, GSAP ticker has `lagSmoothing(0)`, and **any canvas or 3D layer renders from that same tick**. A brief with no 3D in it satisfies this by exclusion — record "no 3D layer", do not invent one to tick the box.

  The same exclusion applies to **declining Lenis, Framer, or a 3D runtime entirely** — a
  blind run omitted Lenis as better craft for a credibility surface and found no sanctioned
  wording for it. State the exclusion as one line: `Library exclusions: Lenis (native scroll
  retained), no 3D layer.` Only the **one-tick** rule is non-negotiable: whatever you exclude,
  nothing may run a second RAF loop.
- [ ] Lenis `respectReducedMotion` is left at its default `true` — setting it `false` re-breaks the accessibility gate this skill exists to enforce
- [ ] Every GSAP plugin used is installed from the public `gsap` package; no Club paywall, no GreenSock token, no `.npmrc`
- [ ] Every shader/scroll effect has a named static or cross-faded reduced-motion equivalent
- [ ] WebGL context loss is handled — the site recovers rather than white-screening

**If any external asset is in scope, on any track:**
- [ ] `motion-assets.md` exists with a route, source, verified licence, and named fallback per asset
- [ ] Byte budgets are **measured**, not estimated — or the cell is left unfilled and labelled pending, never guessed

**All tracks:**
- [ ] `motion-spec.md` passes `motion_spec_check.js check --require-spec` — every `MO-###` complete, composited-only keyframes (or a declared exception), numeric tolerance, no orphans, traced to a user story **in `user-stories.md`**
- [ ] `user-stories.md` exists and names every `MO-###` — without it the spec gate fails, and "traces to a user story" in the spec alone is not enough
- [ ] The mandatory reduced-motion plan exists and is non-skippable
- [ ] Motion tokens are in `design.md`, **or** the deferral is stated explicitly, **or** — if the
      Prerequisites bypass took option (a) and you created a minimal `design.md` — the handoff
      records that you created it and what "minimal" meant here. One of the three, stated.
- [ ] `motion-handoff.md` exists, names its `motion-spec.md`/`design.md` inputs, lists every `MO-###` with its user-story reference, and states the library choice or the research task that decides it
- [ ] If `execution-plan.md` did not exist at Phase 4, the handoff records that it was created, or that the motion work is not yet planned — never silently checked off
- [ ] The Phase 5 contract was handed to `/develop` and `@qa-engineer` **once** — it is not re-executed here
- [ ] No implementation or runtime certification was performed from this skill
- [ ] `session-write` recorded the motion voice, library approach, and reduced-motion plan

**Not done when:** the spec exists but the handoff does not. A spec with no handoff leaves
`/develop` with no task list, which is how motion silently gets dropped.

## Output artifacts

Full paths, so `step_tracker.js audit --all` can decide whether this skill ran untracked — the
**untracked/cross-check** table only. `/motion` ships no `step-*.md` files and never calls
`begin`/`complete`, so the per-step progress table stays empty for it by design; `scope-lock` is
the only step-tracker record this skill produces. Do not add `begin`/`complete` calls to fill that
table — that would invent tracking the skill does not do.

- `artifacts/output/02-research/motion-research.md` (+ per-agent research files)
- `artifacts/output/02-research/motion-thesis.md` — creative track only (Phase 2b)
- `artifacts/output/03-strategy/motion-spec.md`
- `artifacts/output/03-strategy/user-stories.md` — **required**: the spec gate cross-checks every `MO-###` against this file
- `artifacts/output/03-strategy/motion-assets.md` — when external assets are in scope (Phase 3b)
- `artifacts/output/03-strategy/design.md` — Phase 3 merges motion tokens here; under the
  Prerequisites bypass this skill creates it, so it may not exist beforehand
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
- Building a "creative website" from the ordinary product motion guidelines — that produces three staggered fade-ups and a parallax blob, which is the most generic output available. Creative surfaces get Phase 2b and a thesis.
- Adding effects because a thesis has no proving moment — the answer is to surface that the thesis is unfinished, not to add another scroll effect.
- Setting Lenis `respectReducedMotion: false` — it defaults to `true` for a reason, and turning it off re-breaks the accessibility gate.
- Telling the owner a GSAP plugin needs a Club subscription or a GreenSock token — every plugin, including formerly-Club-only ones, is free for commercial use in the public `gsap` package.
- Generating an asset and not recording the prompt, source, or licence — the work is unreproducible and the licence unverifiable.
- Shipping commercial work from a free-tier model — FLUX dev, Tripo free, and Suno free output cannot ship.
- Generating what CSS or SVG already does better, or a 4K HDRI on a hero scene — smaller, sharper, free.
- An asset with no named fallback — generation takes minutes and can fail mid-run; an empty slot ships.
- Skipping the reduced-motion plan — the motion spec is never "done" without it.
- Running research when motion is lightweight (micro-interactions only) — Phase 2 is full-pipeline only.
- Treating lightweight motion as research-free — record the evidence exception in the spec.
- Letting Rex improvise timing — every prompt must be fully specified or flagged back to Ivy.
- Implementing from `/motion` directly — create the handoff and continue through `/develop`.
- Choosing a library by habit — the decision tree and `motion-tech-landscape.md` drive the choice.
