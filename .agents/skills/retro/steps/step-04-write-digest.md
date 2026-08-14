---
step: 4
name: Write Digest
prerequisites:
  - step-03 completed
output_contract:
  citations: not-required
---

# Step 4 — Write Digest

Synthesize all reviews into actionable improvements. Write the retro digest.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill retro --step 4`
## Goal
Convert observations into concrete, owned, deadline-bound action items. An observation without an action item is a complaint.

## Agent invocation
`@product-manager` synthesizes all reviews. For each action item, specify:
- **What** needs to change
- **Why** (linked to a specific observation from reviews)
- **Who** owns the action item
- **When** it should be completed by
- **How** to verify it was done

## Categorization
- **Process improvements** — changes to workflow, handoffs, templates
- **Estimation calibration** — updated velocity and complexity benchmarks
- **Knowledge updates** — new patterns, conventions, or guardrails
- **Tooling improvements** — automation, CI/CD, monitoring gaps
- **Architecture decisions** — debt to pay down, refactoring priorities

## Outputs
- `artifacts/output/09-retro/action-items.md` — primary deliverable with owner + deadline per item
- `artifacts/output/09-retro/retro-digest.md` — summary of all step outputs, key findings, and action plan

Use template `.agents/templates/memory/retrospective-template.md`.

## State machine
## Memory closeout
- `@memory-controller session-write` — record step 4 retro digest and action items.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill retro --step 4`
