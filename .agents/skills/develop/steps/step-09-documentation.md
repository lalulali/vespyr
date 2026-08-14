---
step: 9
name: Documentation
prerequisites:
  - step-08 completed (PM accepted)
output_contract:
  citations: not-required
---

# Step 9 — Documentation

`@technical-writer` updates project documentation for the shipped feature.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 9`
## Goal
Ensure the feature is documented for both developers and end users. APIs, configs, and interfaces must be discoverable.

## Agent invocation
`@technical-writer`:
- Document APIs, configs, and interfaces
- Update README and usage examples
- Write migration guides if needed
- Update changelog

## Inputs
- Completed feature code
- ADRs from `artifacts/output/04-architecture/`
- User stories from `artifacts/output/03-strategy/user-stories.md`

## Memory closeout
- `@memory-controller session-write` — record step 9 documentation completion.

## Delegation
- **Memory:** @memory-controller for session-write

## Halt condition
None — documentation is important but non-blocking. If the writer identifies a spec gap, file a follow-up task.



> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 9`
