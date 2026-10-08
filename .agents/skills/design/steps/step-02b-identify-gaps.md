---
step: 2b
name: Identify Gaps
mode: edit
prerequisites:
  - step-01 completed
output_contract:
  citations: not-required
---

# Step 2 — Identify Gaps

Scan design artifacts for missing or weak sections.

## Goal
Find what's incomplete or misaligned. A spec with screens but no error states, or a PRD without measurable goals, needs strengthening.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-edit --step 2`
`@product-manager` and `@product-designer` evaluate:

1. **PRD alignment** — Do requirements still match the validated idea? Any scope drift?
2. **Story completeness** — Every feature has stories? Every story has AC-H/AC-U/AC-E?
3. **Screen specification** — All screen states covered (default, loading, empty, error, success)?
4. **Design system** — Are design tokens complete and consistent?
5. **Traceability** — Do acceptance criteria trace back to user stories and PRD features?

## Gap classification
- **Green** — strong, no revision needed
- **Yellow** — adequate but could be sharper
- **Red** — weak or missing, must be revised

## Output
Gap map per artifact: which sections are green/yellow/red.

**Home: `artifacts/output/03-strategy/gap-map.md`.** Write it there, not into the chat and
not only into memory. Step 03b updates it as it closes findings and step 04b reports against
it; without a named file the map has nowhere to live, so findings cannot be tracked to
closure and a later reader cannot tell which gaps were addressed. This is the same defect the
validate-mode verdict had before it was given a home in `ux-research-report.md`.

Use the table shape:

```
| Artifact | Section | Grade | Finding | Status | Closed by |
|----------|---------|-------|---------|--------|-----------|
| requirements.md | §4 Goals | Red | goals unmeasurable | open | — |
```

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-edit --step 2`
