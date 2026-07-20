---
step: 1
name: Load Existing
mode: edit
prerequisites: []
delegation:
  reads: "@reader (product-spec + design.md + user-stories; per delegation-policy.md ≥3 files)"
  writes: none
  runs: none
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 1 — Load Existing Spec

Load the current design artifacts and confirm edit targets.

## Goal
Read the existing PRD, user stories, and product spec. Understand current state before revising.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-edit --step 1`
1. Read `artifacts/output/02-strategy/SPEC.md` (spec kernel — if PRD changes, kernel must be updated too)
2. Read `artifacts/output/02-strategy/requirements.md`
3. Read `artifacts/output/02-strategy/user-stories.md`
4. Read `artifacts/output/02-strategy/product-spec.md`
5. Read `artifacts/output/02-strategy/design.md` (if it exists)
6. If any file > 1000 words, invoke `@reader` to summarize.
7. Ask the user: **"What specifically do you want to refine? The PRD scope, user stories, screen designs, or design system?"**

## Output
Loaded design artifacts with user's edit targets identified.

If any core artifact is missing (no PRD, no spec), flag immediately — the edit may need a full create-mode run instead.

## Delegation
- **Reads:** @reader for product-spec.md, design.md, and user-stories.md
- **Writes:** none

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-edit --step 1`
