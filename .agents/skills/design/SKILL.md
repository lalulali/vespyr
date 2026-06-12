---
name: design
description: Defines product requirements from validated ideas, then produces detailed developer-ready specs
---

## What this skill does

Bridges exploration and development. Takes validated ideas from exploration and turns them into a PRD with requirements, then detailed product specs with flows, interactions, and visual direction.

**Previous skill:** `explore-idea` or `game-explore-idea` (produces validated idea + research)
**Next skill:** After this completes, load `develop` to develop.

## Prerequisites

Before starting, verify these artifacts exist:
- [ ] `artifacts/output/00-discovery/validation-brief.md` OR `artifacts/output/00-discovery/idea-brief.md` (exactly 1 required)
- [ ] `artifacts/output/01-research/market-analysis.md`
- [ ] `artifacts/output/01-research/competitive-analysis.md`
- [ ] `artifacts/output/01-research/user-personas.md`

If any are missing, load `explore-idea` (or `game-explore-idea` for game projects) first.

## Workflow steps

### Step 1: Requirements (sequential)

#### Step 1a: Preliminary Feature Proposal (Interactive Gate)
- Invoke `@product-manager` to draft a high-level feature list and scope summary.
- **If operating in `semi-autonomous` mode** and the bypass flag `FeatureDesignInteraction` is not `false` in `project-context.md`:
  - **Pause** and present the proposed list of capabilities/features to the user for feedback.
  - The user can select, add, modify, or delete features to explicitly define scope.
  - The user's input directly shapes what features will be developed.
- **If operating in `autonomous` mode** or if `FeatureDesignInteraction: false` is configured:
  - Skip the pause, and the `@product-manager` will automatically/autonomously select the feature scope.

#### Step 1b: PRD Creation & Validation (Interactive Gate)
- The `@product-manager` incorporates the finalized feature scope to generate the **PRD** (`artifacts/output/02-strategy/requirements.md`) — the strategic document for business/management.
- **If operating in `semi-autonomous` mode** and the bypass flag `FeatureDesignInteraction` is not `false`:
  - **Pause** and present the generated PRD to the user for validation.
  - Ask the user to confirm that the requirements are correct.
  - Incorporate user feedback into the PRD until approved.
- **If operating in `autonomous` mode** or if `FeatureDesignInteraction: false`:
  - Skip the pause and assume the PRD is validated.

#### Step 1c: User Stories Creation
- Only AFTER the PRD is finalized and validated, the `@product-manager` generates the **User Stories** (`artifacts/output/02-strategy/user-stories.md`) — exhaustive, testable stories for engineering.
- **Crucial PRD & Product Spec Alignment:** The user stories MUST strictly align with the validated PRD and conform exactly to the detailed designs, layouts, states, and flows in the Product Spec (`product-spec.md`). Screen transitions and UI edge cases in the spec must map directly to story acceptance criteria.

Both documents are required. The PRD provides the "what and why"; the user stories provide the "what, how, and how to verify."

**Context budget:** PM reads discovery brief (`validation-brief.md` or `idea-brief.md`) in full, then reads only the executive summary + relevant sections of each research artifact.

**Gate check:** Before proceeding to Step 2:
- [ ] PRD contains measurable business goals
- [ ] PRD has been validated by the user (if in semi-autonomous mode)
- [ ] Every PRD feature has ≥1 user story
- [ ] Every user story has acceptance criteria (AC-H, AC-U, AC-E)
- [ ] All user stories strictly follow the requirements (PRD) and the Product Spec, with zero divergences or omission of spec details
- [ ] Cross-validation checklist passes (Step 4 in PM agent)

**Outputs:**
- `artifacts/output/02-strategy/requirements.md` — Use template: `.agents/templates/prd-template.md`
- `artifacts/output/02-strategy/user-stories.md` — Use template: `.agents/templates/user-story-template.md`

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
- `artifacts/output/02-strategy/product-spec.html` — human-readable, use `.agents/templates/product-spec-template.html`

Write the `.md` first (full content). Then produce the `.html` by filling the same content into the HTML template. **CRITICAL: You must preserve the exact HTML structure, tags, and CSS classes (e.g., `<div class="card">`, `<div class="grid-2">`, `<ul class="checklist">`) from the template. Do not oversimplify the HTML.** Replace all `{placeholders}` with real values.

#### Step 2b: Data Planning (optional) ⟨parallel⟩
Invoke `@data-analyst` to define measurement:
- Success metrics and instrumentation plan
- Events, properties, tracking design
- Dashboard mockups for monitoring adoption

**Output:** `artifacts/output/02-strategy/measurement-plan.md` (Use template: `.agents/templates/measurement-plan-template.md`)

### Step 3: UX Validation (optional gate)

**Invoke only when:** idea brief or @product-designer requests UX validation (complex workflows, novel interactions, accessibility-critical).

Invoke `@ux-researcher` to validate the product spec:
- Heuristic evaluation against Nielsen's 10 heuristics
- Cognitive walkthrough of key task flows
- Accessibility review (WCAG 2.1 AA)

**Output:** `artifacts/output/01-research/ux-research-report.md` (Use template: `.agents/templates/ux-research-report-template.md`)

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

**Gate check & Kanban Seeding:** Before handing off to `develop`:
- [ ] `artifacts/output/02-strategy/requirements.md` exists
- [ ] `artifacts/output/02-strategy/user-stories.md` exists
- [ ] `artifacts/output/02-strategy/product-spec.md` exists
- [ ] `artifacts/output/02-strategy/product-spec.html` exists
- [ ] All acceptance criteria are testable
- [ ] No blocking open questions remain
- [ ] UX sign-off (if applicable)

**Action:**
- **In Semi-Autonomous/Manual Mode:** Pause for explicit human spec package approval. Once requirements, spec, and stories are approved, invoke `@product-manager` to **seed and initialize the Kanban board** (`artifacts/output/04-planning/kanban.md`), then invoke `@executor` to refresh the **document graph** via the self-healing wrapper: `node .agents/scripts/ensure_graph.js doc`.
- **In Autonomous Mode:** Skip all feature, PRD, and spec validation pauses entirely. Autonomously finalize the requirements, spec, and user stories, immediately run `@product-manager` to seed the Kanban board, and invoke `@executor` to refresh the **document graph** via `node .agents/scripts/ensure_graph.js doc`.


## Output artifacts
- `artifacts/output/02-strategy/requirements.md` (strategic PRD)
- `artifacts/output/02-strategy/user-stories.md` (exhaustive user stories with acceptance criteria)
- `artifacts/output/02-strategy/product-spec.md` (for agents)
- `artifacts/output/02-strategy/product-spec.html` (for humans)
- `artifacts/output/02-strategy/measurement-plan.md` (optional)
- `artifacts/output/01-research/ux-research-report.md` (optional)

## Handoff to develop
When design is complete and all gate checks pass:

### Optional Architecture Phase Gate (Interactive Choice)
Before proceeding to load the `develop` skill, you **MUST pause and ask the user** for their choice:
1. **Option A (Architect first):** Invoke `@architect` to design components, models, schemas, and draft ADRs. Recommended for greenfield features, complex integrations, or structural modifications.
2. **Option B (Direct to Developer):** Bypass Phase 3 completely and hand off the Strategy requirements (`requirements.md`, `user-stories.md`, `product-spec.md`) directly to `@tech-lead` for planning and `@developer` for coding. Recommended for straightforward features, routine iterations, or well-established code patterns.

Ensure you explain the context of both options clearly so the user can make an informed choice. Based on their input, set the `ArchitectPhase` configuration in `project-context.md` (to `true` or `false` respectively) before loading the next skill.

Write session summary before handing off:
```
@memory-controller session-write
Worked on: Product design — {feature/product name}
Decisions made:
- {key PRD scope decision}
- {key design decision}
- {UX validation result: passed / critical issues resolved / skipped with rationale}
Next step: Load develop to develop
New blockers: {any open design questions or dependencies, or "none"}
```

Load the `develop` skill to proceed.

---

## State Machine Integration

The pipeline state machine (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run via `@executor`:
```bash
node .agents/scripts/orchestrator_state.js status
```

If pipeline is uninitialized, run `squad` first (or `init` directly) before starting design work. Then run `next` to confirm the project is in the design phase.

### At End — Record Completion

Record each artifact produced:

```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-strategy/requirements.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-strategy/user-stories.md
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 02-strategy/product-spec.md
```

If a `measurement-plan.md` was produced, record that too:
```bash
node .agents/scripts/orchestrator_state.js complete --agent data-analyst --artifact 02-strategy/measurement-plan.md
```

After the last `complete`, run `next` to confirm the pipeline auto-advanced to the development phase. If it didn't (because some artifacts are missing), the `next` output will tell you which ones.
