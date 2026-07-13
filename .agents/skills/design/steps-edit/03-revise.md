---
step: 3
name: Revise
mode: edit
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites:
  - step-02 completed
---

# Step 3 — Revise

Revise the weak sections identified in the gap scan.

## Goal
Strengthen yellow and red sections. Don't rewrite — refine.

## Process
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
- Reads: @reader (existing spec files)
- Writes: @writer (revised sections)
