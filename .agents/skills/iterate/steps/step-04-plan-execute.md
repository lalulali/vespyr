---
step: 4
name: Plan and Execute
prerequisites:
  - step-03a completed
  - step-03b completed (or determined unnecessary)
delegation:
  reads: "@reader (iteration-backlog, iteration-spec, iteration-adr if exists; per delegation-policy.md multi-file)"
  writes: "@writer (iteration-plan.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 4 — Plan and Execute

Create the execution plan and implement iteration items using the dev loop from `develop`.

## Workflow

### 4a. Plan via @tech-lead + @product-manager

Invoke `@tech-lead` to:
- Break iteration items into tasks (typically smaller than new features)
- Estimate effort based on existing velocity
- Sequence for fastest delivery (quick wins first)

Invoke `@product-manager` to:
- Fit iteration work into existing cadence
- Manage scope and timeline trade-offs
- Coordinate with any ongoing development work

### 4b. Output plan

Delegate to `@writer` for `artifacts/output/07-iteration/iteration-plan.md` using template:
```
.agents/templates/planning/execution-plan-template.md
```

### 4c. Execute dev loop

Run the same dev loop from `develop`:
- `@developer` implements
- `@code-reviewer` reviews (max 2 review cycles)
- `@qa-engineer` validates (max 2 QA cycles)
- `@product-manager` verifies

## Loop limit
Max 2 review cycles and 2 QA cycles per iteration. If issues persist, escalate to `@tech-lead`.

## Delegation
- **Reads:** @reader for backlog, spec, ADR
- **Writes:** @writer for iteration-plan.md
- **Runs:** @executor for orchestrator_state.js complete
