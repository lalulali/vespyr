---
step: 1b
name: Load Existing
mode: edit
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1 — Load Existing Spec

Load the current design artifacts and confirm edit targets.

## Goal
Read the existing PRD, user stories, and product spec. Understand current state before revising.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-edit --step 1`
1. Read `artifacts/output/03-strategy/SPEC.md` (spec kernel — if PRD changes, kernel must be updated too)
2. Read `artifacts/output/03-strategy/requirements.md`
3. Read `artifacts/output/03-strategy/user-stories.md`
4. Read `artifacts/output/03-strategy/product-spec.md`
5. Read `artifacts/output/03-strategy/design.md` (if it exists)
6. Extract key sections and constraints relevant to the requested edit.
7. Ask the user: **"What specifically do you want to refine? The PRD scope, user stories, screen designs, or design system?"**

## Output
Loaded design artifacts with user's edit targets identified.

If any core artifact is missing (no PRD, no spec), flag immediately — the edit may need a full create-mode run instead.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-edit --step 1`
