---
step: N
name: Step Name
prerequisites:
  - step-NN completed
output_contract.citations: required | not-required
---

# Step N — Step Name

Step content here.

> **Naming convention:** All step files live in a single `steps/` directory per skill:
> `steps/step-0N-name.md` (e.g. `step-01-spec-alignment.md`).
> For skills with parallel mode branches, suffix the phase number with the mode letter:
> `step-01a-load-prd-brief.md` (create), `step-01b-load-existing.md` (edit),
> `step-01c-heuristic-eval.md` (validate) — and set the frontmatter `step:` to match
> (e.g. `step: 1a`) plus an explicit `mode: create` field so tooling can filter by mode.

## Memory
- Delegate to @memory-controller for all memory load/write/session operations
