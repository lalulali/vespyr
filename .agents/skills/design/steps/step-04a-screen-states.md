---
step: 4a
name: Screen States
mode: create
prerequisites:
  - step-03 completed
output_contract:
  citations: not-required
---

# Step 4 — Screen States

Define screen-by-screen specs: purpose, content, layout, states, transitions.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 4`
## Goal
Produce detailed screen specifications that engineers can implement without guessing. Every screen has defined states and interactions.

## Agent invocation
`@product-designer` creates detailed specs from the PRD and user stories:
- Map end-to-end user flows: happy path, alternate paths, error flows
- Define screen-by-screen: purpose, content, layout, entry point, exit point
- Specify interaction details: loading, empty, error, success, edge states
- **Keyboard state** — what is focused, in what order, and where focus goes after the action. A screen with no defined focus order is not specified.
- **Screen-reader state** — the accessible name, role, and value/state of every control on this screen. If a status is conveyed by colour, name it in text too (SC 1.4.1).
- **Zoom / reflow state** — 200% text zoom and 320px reflow (SC 1.4.4, 1.4.10). Which regions scroll, which reflow, which are pinned.
- **Motion state** — what this screen does under `prefers-reduced-motion`. If nothing moves, say so; silence reads as untested.

  **These four are states, not a postscript.** Default / Loading / Empty / Error / Success /
  Edge describe what the screen does when the software works. These four describe who can
  use it at all. A screen spec that lists the first six and skips the second four is a
  specification of a screen some people cannot operate.

  A blind run on a clinical brief found this line was the *only* accessibility instruction
  create mode carried, and that the dedicated `step-03c-a11y-check.md` lives in **validate**
  mode's sequence — so create mode, where screens are specified, never runs it. Accessibility
  that only gets reviewed after the design is written is accessibility that shapes nothing.

  Record each as a state row with acceptance criteria like any other state. If the brief
  names a disabled user, a screen-reader user, a keyboard-only user, an older user, or a
  user on a slow connection, these four states are **not optional for this run**.

## State coverage per screen
Every interactive screen must define:
- **Default state** — what the user sees on first load
- **Loading state** — skeleton, spinner, or progress indicator
- **Empty state** — what's shown when there's no data
- **Error state** — what's shown on failure, with recovery action
- **Success state** — confirmation after a completed action
- **Edge states** — permission denied, offline, expired session

## Prototype collaboration (when applicable)

If any prototype is in scope, pause before design-token work and have `@product-designer` review it with `@tech-lead`. Use `.agents/templates/product/prototype-collaboration-template.md` to record the selected `static-html` or `nextjs-component` track, runtime, responsive/state coverage, implementation mapping, risks, and `SATISFIED` or `BLOCKED` disposition in `artifacts/output/03-strategy/prototype-collaboration.md`. Then run:

```bash
node .agents/scripts/prototype_collab_gate.js verify \\
  --record artifacts/output/03-strategy/prototype-collaboration.md \\
  --track <static-html|nextjs-component> \\
  --prototype <prototype> --scope r1-evidence --json
```

A failed validator or `BLOCKED` result requires explicit owner disposition before handoff.

## Data planning (optional, parallel)
If analytics instrumentation is needed, invoke `@data-analyst`:
- Success metrics and instrumentation plan
- Events, properties, tracking design

**Output:** `artifacts/output/03-strategy/measurement-plan.md`
**Template:** `.agents/templates/quality/measurement-plan-template.md` — copy it first, then fill
in place. The template exists and names this exact output path; this step was producing the
artifact without citing it, which is how a document ends up off-template.

## Outputs
- `artifacts/output/03-strategy/product-spec.md` — machine-readable, used by architect, developer, tech-lead, QA
- `artifacts/output/03-strategy/product-spec.html` — human-readable, dynamic Tailwind generation

**Template for `product-spec.md`: `.agents/templates/product/product-spec-template.md`.** Copy
it, then fill in place — never author from scratch. This step previously named only the
prototype-collaboration template while producing the screen spec, even though SKILL.md
§Canonical document contracts mandates this one and warns that "a compact report is not an
acceptable substitute". The authoring step is where that rule has to bite; the summary table
alone does not stop drift.

Reverse mode reaches this step through `step-03d-prd-synthesis.md`, which loops 02a→05a. The
same template requirement applies there.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 4`
