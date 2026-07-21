---
step: 2c
name: User Research
prerequisites:
  - step-02b completed (competitive-analysis.md exists)
delegation:
  reads: "@reader (validation brief or idea brief + competitive-analysis.md; per delegation-policy.md multi-file)"
  writes: "@writer (user-personas.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: required
---

# Step 2c — User Research

Validate user needs against the research gathered so far. Depends on step 2b output.

## Workflow

### 2c.1 Load inputs

Delegate to `@reader` to load:
- Validation brief (or idea brief)
- `artifacts/output/02-research/competitive-analysis.md`

### 2c.2 Research via @user-researcher

Invoke `@user-researcher` to validate user needs:
- Target users and their goals
- Pain points and workarounds
- User personas and journeys
- "How might we" statements

**Context adaptation:**
- **Startup mode:** Full persona development, jobs-to-be-done, user journeys
- **Company mode:** Stakeholder interviews, internal workflow analysis, team pain points
- **Personal mode:** Self-research — your own pain points and use cases

### 2c.3 Output

Delegate to `@writer` for `artifacts/output/02-research/user-personas.md`.

### 2c.4 Record completion

Delegate to `@executor`:
```bash
node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/user-personas.md
```

## Delegation
- **Reads:** @reader for validation/idea brief and competitive analysis
- **Writes:** @writer for user-personas.md
- **Runs:** @executor for orchestrator_state.js complete
