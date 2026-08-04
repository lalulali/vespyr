---
step: 4
name: Screen States
mode: create
prerequisites:
  - step-03 completed
delegation:
  reads: "direct (user stories + personas; per delegation-policy.md < 3 files < 500 lines)"
  writes: "@writer (screen-states output; per delegation-policy.md output file)"
  runs: none
  direct_justified: ["< 3 small input files already in context"]
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
- Cover accessibility requirements

## State coverage per screen
Every interactive screen must define:
- **Default state** — what the user sees on first load
- **Loading state** — skeleton, spinner, or progress indicator
- **Empty state** — what's shown when there's no data
- **Error state** — what's shown on failure, with recovery action
- **Success state** — confirmation after a completed action
- **Edge states** — permission denied, offline, expired session

## Data planning (optional, parallel)
If analytics instrumentation is needed, invoke `@data-analyst`:
- Success metrics and instrumentation plan
- Events, properties, tracking design

**Output:** `artifacts/output/03-strategy/measurement-plan.md`

## Outputs
- `artifacts/output/03-strategy/product-spec.md` — machine-readable, used by architect, developer, tech-lead, QA
- `artifacts/output/03-strategy/product-spec.html` — human-readable, dynamic Tailwind generation

## Delegation
- **Reads:** direct — user stories + personas (< 3 files)
- **Writes:** @writer for screen-states output

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 4`
