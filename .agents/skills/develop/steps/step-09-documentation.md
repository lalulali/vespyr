---
step: 9
name: Documentation
prerequisites:
  - step-08 completed (PM accepted)
delegation:
  reads: "@reader (feature code, ADRs, user stories; per delegation-policy.md ≥4 files)"
  writes: "@writer (docs/, README, changelog; per delegation-policy.md multi-file output)"
  runs: none
  direct_justified: []
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
- ADRs from `artifacts/output/03-architecture/`
- User stories from `artifacts/output/02-strategy/user-stories.md`

## Output
Updated documentation in the project's `docs/` directory or README.

## Halt condition
None — documentation is important but non-blocking. If the writer identifies a spec gap, file a follow-up task.

## Delegation
- **Reads:** @reader for feature code, ADRs, and user stories
- **Writes:** @writer for docs/ updates, README, and changelog

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 9`
