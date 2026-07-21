---
step: 3a
name: Design Iteration
prerequisites:
  - step-02 completed (iteration-backlog.md exists)
delegation:
  reads: "@reader (iteration-backlog.md; per delegation-policy.md)"
  writes: "@writer (iteration-spec.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 3a — Design Iteration

Design improvements based on identified opportunities. Runs in parallel with step 3b.

## Workflow

### 3a.1 Design via @product-designer

Invoke `@product-designer` to design improvements:
- Update user flows based on identified pain points
- Design A/B test variants (if applicable)
- Update interaction specs for modified features
- Document design rationale linking back to data signals

### 3a.2 Output

Delegate to `@writer` for `artifacts/output/07-iteration/iteration-spec.md` using template:
```
.agents/templates/product/product-spec-template.md
```

### 3a.3 Record completion

Delegate to `@executor`:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 07-iteration/iteration-spec.md
```

## Delegation
- **Reads:** @reader for iteration-backlog.md
- **Writes:** @writer for iteration-spec.md
- **Runs:** @executor for orchestrator_state.js complete
