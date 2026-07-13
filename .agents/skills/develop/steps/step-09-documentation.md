---
step: 9
name: Documentation
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-08 completed (PM accepted)
---

# Step 9 — Documentation

`@technical-writer` updates project documentation for the shipped feature.

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
- Reads: @reader (feature code, ADRs, user stories)
- Writes: @writer (docs/ updates, README, changelog)
