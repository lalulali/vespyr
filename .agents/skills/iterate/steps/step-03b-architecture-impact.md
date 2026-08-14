---
step: 3b
name: Architecture Impact Assessment
prerequisites:
  - step-02 completed (iteration-backlog.md exists)
output_contract:
  citations: not-required
---

# Step 3b — Architecture Impact Assessment

Assess whether iteration changes require architectural modifications. Runs in parallel with step 3a.

## Workflow

### 3b.1 Assess — @architect

Invoke `@architect` to assess:
- Does the iteration require architectural changes?
- Are there data model changes needed?
- Is the change additive or does it modify existing behavior?
- Flag any technical debt that should be addressed alongside

### 3b.2 Output

Only if architectural changes are needed — write `artifacts/output/07-iteration/iteration-adr.md` using template:
```
.agents/templates/architecture/adr-template.md
```

If no changes needed, skip this artifact.

## Memory closeout
- `@memory-controller session-write` — record step 3b architecture impact analysis.

## Delegation
- **Memory:** @memory-controller for session-write


