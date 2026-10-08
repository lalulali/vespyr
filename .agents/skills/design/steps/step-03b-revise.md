---
step: 3b
name: Revise
mode: edit
prerequisites:
  - step-02 completed
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
Max 2 revision cycles per section, matching validate mode's revision loop (step 04c). An
earlier version of this step said 3, which meant two modes in the same skill disagreed about
the same operation and neither number was enforced by anything. Pick one number, keep it in
sync across modes.

If a section cannot be strengthened after 2 cycles, it is **not** silently carried forward:
record it as an open blocking finding and say so in the handoff. A section that hit the limit
and was quietly dropped is indistinguishable from one that was fixed.

## Change record (required)

For every section you revise, update its row in `artifacts/output/03-strategy/gap-map.md` —
the table declared in `step-02b-identify-gaps.md`:

```
| Artifact | Section | Grade | Finding | Status | Closed by |
|----------|---------|-------|---------|--------|-----------|
| requirements.md | §4 Goals | Red | goals unmeasurable | open | — |
| requirements.md | §4 Goals | Green | — | closed | §4 rewritten with numeric targets, 2026-10-06 |
```

Amend the existing row rather than appending a second one, so a section appears once and its
grade reflects its current state. Do not re-declare the table here — `step-02b` owns the
schema, and two copies of a schema is how they drift.

This is what makes the edit auditable. Without it, a revision pass and a no-op produce
identical documents, and nothing can tell whether the gap scan was answered.

## Guard
Never introduce new content that wasn't prompted by the user's edit target. If the gap scan reveals issues in sections the user didn't flag, note them but don't revise unless the user agrees.

## Output
Revised artifact sections, integrated into the existing documents, plus an updated
`artifacts/output/03-strategy/gap-map.md`. The gap map is the step's home — findings with
nowhere to live cannot be closed, tracked, or reviewed.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-edit --step 3`
