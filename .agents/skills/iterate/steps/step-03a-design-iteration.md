---
step: 3a
name: Design Iteration
prerequisites:
  - step-02 completed (iteration-backlog.md exists)
output_contract:
  citations: not-required
---

# Step 3a — Design Iteration

Design improvements based on identified opportunities. Runs in parallel with step 3b.

## Workflow

### 3a.1 Design — @product-designer

Invoke `@product-designer` to design improvements:
- Update user flows based on identified pain points
- Design A/B test variants (if applicable)
- Update interaction specs for modified features
- Document design rationale linking back to data signals

### 3a.2 Output

Write `artifacts/output/07-iteration/iteration-spec.md` using template:
```
.agents/templates/product/product-spec-template.md
```

## Memory closeout
- `@memory-controller session-write` — record step 3a design iteration specs.

## Delegation
- **Memory:** @memory-controller for session-write


