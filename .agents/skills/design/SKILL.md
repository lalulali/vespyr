---
name: design
description: Defines product requirements from validated ideas, then produces detailed developer-ready specs. Supports create/edit/validate modes.
---

# Design

Bridges exploration and development. Takes validated ideas and turns them into a PRD with requirements, user stories, and detailed product specs with flows, interactions, and visual direction.

## Prerequisites
- `artifacts/output/00-discovery/validation-brief.md` OR `idea-brief.md`
- `artifacts/output/01-research/market-analysis.md`
- `artifacts/output/01-research/competitive-analysis.md`
- `artifacts/output/01-research/user-personas.md`

If any are missing, load `explore-idea` first.

## Skill chain
- Prev: `explore-idea` or `game-explore-idea`
- Next: `develop`

## Mode selection + routing
Detect by checking for existing artifacts + parsing user wording:
- **Create** → no `requirements.md` or `product-spec.md` exists. Route: `steps-create/01-load-prd-brief.md`
- **Edit** → artifacts exist, user wants to refine. Route: `steps-edit/01-load-existing.md`
- **Validate** → artifacts exist, user wants design review. Route: `steps-validate/01-heuristic-eval.md`

If unclear, ask: "Are you designing from scratch, refining existing specs, or reviewing a design?"

## Create mode step sequence
1. Load PRD Brief → `steps-create/01-load-prd-brief.md`
2. Define Personas → `steps-create/02-define-personas.md`
3. User Stories → `steps-create/03-user-stories.md`
4. Screen States → `steps-create/04-screen-states.md`
5. Design Tokens → `steps-create/05-design-tokens.md`
6. Handoff → `steps-create/06-handoff.md`

## Edit mode step sequence
1. Load Existing → `steps-edit/01-load-existing.md`
2. Identify Gaps → `steps-edit/02-identify-gaps.md`
3. Revise → `steps-edit/03-revise.md`
4. Finalize → `steps-edit/04-finalize.md`

## Validate mode step sequence
1. Heuristic Eval → `steps-validate/01-heuristic-eval.md`
2. Consistency Check → `steps-validate/02-consistency-check.md`
3. Accessibility Check → `steps-validate/03-a11y-check.md`
4. Lock & Handoff → `steps-validate/04-lock-handoff.md`

## Output artifacts
`requirements.md`, `user-stories.md`, `product-spec.md`, `product-spec.html`, `design.md`, plus `measurement-plan.md` and `ux-research-report.md` (optional).
## State & memory integration
At start, via `@executor`: `node .agents/scripts/orchestrator_state.js status` then `next`. Also: `@memory-controller load product-manager [design — {feature}]`
At each step end: record per-artifact via `node .agents/scripts/orchestrator_state.js complete --agent {agent} --artifact {path}` (see step files for agent-specific calls). After all: `node .agents/scripts/ensure_graph.js doc`.
**Memory:** Final step in each mode closes with `@memory-controller session-write` — mandatory per GUARDRAILS §Session Continuity.
