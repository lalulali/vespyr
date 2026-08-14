---
step: 3b
name: Revise
mode: edit
prerequisites:
  - step-02 completed
delegation:
  reads: "direct (spec sections in context)"
  writes: "@writer (revised spec sections; per delegation-policy.md output)"
  runs: none
  direct_justified: ["spec sections already in context from step 1"]
output_contract:
  citations: not-required
---

# Step 3 — Revise

Revise the weak sections identified in the gap scan.

## Goal
Strengthen yellow and red sections. Don't rewrite — refine.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-edit --step 3`
For each gap, the responsible agent revises:

- **PRD gap** → `@product-manager` refines scope, goals, or feature descriptions
- **Story gap** → `@product-manager` adds missing stories or ACs
- **Screen gap** → `@product-designer` adds missing states or transitions
- **Design system gap** → `@product-designer` completes tokens, spacing, or breakpoints

## Iteration limit
Max 3 rounds of revision per section. If a section can't be strengthened after 3 rounds, note it in the spec as "unresolved" and move on.

## Guard
Never introduce new content that wasn't prompted by the user's edit target. If the gap scan reveals issues in sections the user didn't flag, note them but don't revise unless the user agrees.

## Output
Revised artifact sections, integrated into the existing documents.

## Delegation
- **Reads:** direct — spec sections already in context
- **Writes:** @writer for revised spec sections

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-edit --step 3`
