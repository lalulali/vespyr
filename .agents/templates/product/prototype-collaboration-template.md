---
purpose: Cross-functional review record for a design prototype before synthesis or build handoff.
audience: @product-designer, @tech-lead, @architect, @product-manager
---

# Prototype Collaboration

## Track and runtime

- **Track:** `static-html` | `nextjs-component`
- **Runtime:** `vanilla HTML/CSS/JS + Tailwind CDN` | `Next.js + React + Tailwind + shadcn`
- **Review scope:** `r1-evidence` | `handoff`
- **Track classification:** `SATISFIED` | `CHANGES REQUESTED`

  **Which question does this answer? "`static-html` is the correct track for this artifact."**
  Nothing about quality, nothing about passing. Answer it with `shadcn_gate detect`: if the
  detected framework and stack match the chosen track, it is `SATISFIED`.

  | Question | Field | Value |
  |---|---|---|
  | Is this the right track for this artifact? | **Track classification** | `SATISFIED` / `CHANGES REQUESTED` |
  | Does it meet the construction bar? | **Track gate result** | `PASS` / `FAIL` |

  A prototype can be correctly classified `SATISFIED` and still fail the bar — that is an
  ordinary state, and it is exactly what a hand-coded HTML import looks like. The two fields
  were conflated here until a blind run redefined "classification" mid-run to make a gate pass,
  choosing its reading *after* learning what the gate wanted. Two questions, two fields.

  `CHANGES REQUESTED` is also accepted here at `r1-evidence` scope when the escape hatch is
  invoked and a blocker is named — so an honestly-failing import has a sanctioned value.
- **R1 evidence disposition:** `SATISFIED` | `BLOCKED`
- **Implementation handoff:** `SATISFIED` | `BLOCKED`
- **Prototype:** `<path, URL, or non-file reference>`
- **Prototype SHA-256:** `<sha256>` | `N/A (non-file)`
- **Date:** `<YYYY-MM-DD>`

## Track validation

- **Track gate command:** `<command>`
- **Track gate result:** `PASS` | `FAIL`
- **Evidence:** `<exit code and relevant output>`

## Reviewed surface

| Area | Evidence reviewed | Notes |
|---|---|---|
| Screens and flows |  |  |
| Critical states |  |  |
| Interactions and feedback |  |  |
| Responsive behavior |  |  |
| Accessibility risks |  |  |

## Implementation mapping

- **Token mapping:**
- **Static-to-component mapping** (`static-html` only):
- **Component/API boundary** (`nextjs-component` only):
- **Feasibility risks:**
- **Accessibility disposition:** `SATISFIED` | `BLOCKED`
- **Feasibility disposition:** `SATISFIED` | `BLOCKED`

## Decisions and open questions

| ID | Decision or question | Owner | Status |
|---|---|---|---|
| PC-01 |  |  | `[OPEN]` |

## Reviewer sign-off

| Reviewer | State | Evidence/date |
|---|---|---|
| @product-designer | `SATISFIED` |  |
| @tech-lead | `SATISFIED` |  |
| @architect | `SATISFIED` |  |

## Disposition

- **State:** `SATISFIED` | `BLOCKED`
- **Owner disposition for blockers:**
- **Next action:**
