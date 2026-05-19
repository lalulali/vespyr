---
name: product-design
description: Defines product requirements from validated ideas, then produces detailed developer-ready specs
---

## What this skill does

Bridges exploration and development. Takes validated ideas from exploration and turns them into a PRD with requirements, then detailed product specs with flows, interactions, and visual direction.

**Previous skill:** `product-exploration` or `game-product-exploration` (produces validated idea + research)
**Next skill:** After this completes, load `product-development` to build.

## Prerequisites

Before starting, verify these artifacts exist:
- [ ] `artifacts/output/00-discovery/idea-brief.md`
- [ ] `artifacts/output/01-research/market-analysis.md`
- [ ] `artifacts/output/01-research/competitive-analysis.md`
- [ ] `artifacts/output/01-research/user-personas.md`

If any are missing, load `product-exploration` (or `game-product-exploration` for game projects) first.

## Workflow steps

### Step 1: Requirements (sequential)
Invoke `@product-manager` to produce two documents:
- **PRD** (`artifacts/output/02-strategy/requirements.md`) — strategic document for business/management
- **User Stories** (`artifacts/output/02-strategy/user-stories.md`) — exhaustive, testable stories for engineering

Both documents are required. The PRD provides the "what and why"; the user stories provide the "what, how, and how to verify."

**Context budget:** PM reads idea brief in full, then reads only the executive summary + relevant sections of each research artifact.

**Gate check:** Before proceeding to Step 2:
- [ ] PRD contains measurable business goals
- [ ] Every PRD feature has ≥1 user story
- [ ] Every user story has acceptance criteria (AC-H, AC-U, AC-E)
- [ ] Cross-validation checklist passes (Step 4 in PM agent)

**Outputs:**
- `artifacts/output/02-strategy/requirements.md`
- `artifacts/output/02-strategy/user-stories.md`

### Step 2: Product Design + Data Planning (parallelizable)

Steps 2a and 2b can run **in parallel** since both read from the PRD and user stories.

#### Step 2a: Product Design ⟨parallel⟩
Invoke `@product-designer` to create detailed specs from the PRD and user stories:
- Map end-to-end user flows (happy path, alternates, error flows)
- Define screen-by-screen specs (purpose, content, layout, entry, exit)
- Specify interaction details — loading, empty, error, success states
- Set visual direction — typography, color, spacing, design tokens
- Cover edge cases and accessibility requirements

**Output — always generate both:**
- `artifacts/output/02-strategy/product-spec.md` — machine-readable, used by @architect, @developer, @tech-lead, @qa-engineer
- `artifacts/output/02-strategy/product-spec.html` — human-readable, use `.opencode/templates/product-spec-template.html`

Write the `.md` first (full content). Then produce the `.html` by filling the same content into the HTML template — replace all `{placeholders}` with real values.

#### Step 2b: Data Planning (optional) ⟨parallel⟩
Invoke `@data-analyst` to define measurement:
- Success metrics and instrumentation plan
- Events, properties, tracking design
- Dashboard mockups for monitoring adoption

**Output:** `artifacts/output/02-strategy/measurement-plan.md`

### Step 3: UX Validation (optional gate)

**Invoke only when:** idea brief or @product-designer requests UX validation (complex workflows, novel interactions, accessibility-critical).

Invoke `@ux-researcher` to validate the product spec:
- Heuristic evaluation against Nielsen's 10 heuristics
- Cognitive walkthrough of key task flows
- Accessibility review (WCAG 2.1 AA)

**Output:** `artifacts/output/01-research/ux-research-report.md`

**If critical findings exist:**
- Loop back to Step 2a: @product-designer addresses critical findings
- **Max 2 revision cycles** between @ux-researcher and @product-designer (see workflow.md §4.2)
- After 2 cycles, escalate unresolved issues to @product-manager

### Step 4: Design Review (gate)
Review the complete spec package:
- Do all acceptance criteria trace back to user stories?
- Are edge cases covered and testable?
- Are open questions documented for dev?
- If @ux-researcher was invoked, are all critical/serious findings resolved?

**Gate check:** Before handing off to `product-development`:
- [ ] `artifacts/output/02-strategy/requirements.md` exists
- [ ] `artifacts/output/02-strategy/user-stories.md` exists
- [ ] `artifacts/output/02-strategy/product-spec.md` exists
- [ ] `artifacts/output/02-strategy/product-spec.html` exists
- [ ] All acceptance criteria are testable
- [ ] No blocking open questions remain
- [ ] UX sign-off (if applicable)

## Output artifacts
- `artifacts/output/02-strategy/requirements.md` (strategic PRD)
- `artifacts/output/02-strategy/user-stories.md` (exhaustive user stories with acceptance criteria)
- `artifacts/output/02-strategy/product-spec.md` (for agents)
- `artifacts/output/02-strategy/product-spec.html` (for humans)
- `artifacts/output/02-strategy/measurement-plan.md` (optional)
- `artifacts/output/01-research/ux-research-report.md` (optional)

## Handoff to product-development
When design is complete and all gate checks pass:

Write session summary before handing off:
```
@memory-controller session-write
Worked on: Product design — {feature/product name}
Decisions made:
- {key PRD scope decision}
- {key design decision}
- {UX validation result: passed / critical issues resolved / skipped with rationale}
Next step: Load product-development to build
New blockers: {any open design questions or dependencies, or "none"}
```

Load the `product-development` skill to proceed.
