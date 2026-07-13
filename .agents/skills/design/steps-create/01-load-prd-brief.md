---
step: 1
name: Load PRD Brief
mode: create
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites: []
---

# Step 1 — Load PRD Brief

Load the validated idea and research artifacts. This is the foundation for the PRD.

## Goal
Read the discovery brief and research outputs. Understand the validated problem, user, and market context before writing requirements.

## Prerequisites
Verify these artifacts exist:
- `artifacts/output/00-discovery/validation-brief.md` OR `idea-brief.md`
- `artifacts/output/01-research/market-analysis.md`
- `artifacts/output/01-research/competitive-analysis.md`
- `artifacts/output/01-research/user-personas.md`

If any are missing, load `explore-idea` first.

## Process
1. `@product-manager` reads the discovery brief in full.
2. Read only the executive summary + relevant sections of each research artifact (context budget: target paragraphs, not full documents).
3. Extract: target user, core problem, validated demand signals, competitive gaps, key constraints.

## Feature proposal gate
If operating in `semi-autonomous` mode and `FeatureDesignInteraction` is not `false` in `project-context.md`:
- Draft a high-level feature list and scope summary
- **Pause** and present to the user for feedback — user can select, add, modify, or delete features
- In `autonomous` mode or with `FeatureDesignInteraction: false`, skip the pause

## Output
Loaded context: brief summary, feature scope (approved or auto-selected), research key points.

## Delegation
- Reads: @reader (research artifacts, PRD, stories)
- Writes: @writer (PRD, user stories, spec files, design.md)
- Direct: PM and designer reasoning is direct
