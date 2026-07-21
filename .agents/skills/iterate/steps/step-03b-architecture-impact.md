---
step: 3b
name: Architecture Impact Assessment
prerequisites:
  - step-02 completed (iteration-backlog.md exists)
delegation:
  reads: "@reader (iteration-backlog.md; per delegation-policy.md)"
  writes: "@writer (iteration-adr.md; per delegation-policy.md output file, only if needed)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 3b — Architecture Impact Assessment

Assess whether iteration changes require architectural modifications. Runs in parallel with step 3a.

## Workflow

### 3b.1 Assess via @architect

Invoke `@architect` to assess:
- Does the iteration require architectural changes?
- Are there data model changes needed?
- Is the change additive or does it modify existing behavior?
- Flag any technical debt that should be addressed alongside

### 3b.2 Output

Only if architectural changes are needed — delegate to `@writer` for `artifacts/output/07-iteration/iteration-adr.md` using template:
```
.agents/templates/architecture/adr-template.md
```

If no changes needed, skip this artifact.

### 3b.3 Record completion (if artifact produced)

Delegate to `@executor`:
```bash
node .agents/scripts/orchestrator_state.js complete --agent architect --artifact 07-iteration/iteration-adr.md
```

## Delegation
- **Reads:** @reader for iteration-backlog.md
- **Writes:** @writer for iteration-adr.md (only if architectural changes needed)
- **Runs:** @executor for orchestrator_state.js complete
