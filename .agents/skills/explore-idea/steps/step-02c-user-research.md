---
step: 2c
name: User Research
prerequisites:
  - step-02b completed (competitive-analysis.md exists)
output_contract:
  citations: required
---

# Step 2c — User Research

Validate user needs against the research gathered so far. Depends on step 2b output.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill explore-idea --step 2c` at step start; `complete --skill explore-idea --step 2c` at step close.
> **Dispatch:** follow the tiered-dispatch contract in SKILL.md. By design, this agent consumes step 2b's output; it must not see 2a's output before forming its own findings.

## Workflow

### 2c.1 Load inputs

Read:
- Validation brief (or idea brief)
- `artifacts/output/02-research/competitive-analysis.md`

### 2c.2 Research — @user-researcher

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

Write `artifacts/output/02-research/user-personas.md`.

### 2c.4 Record completion

Run:
```bash
node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/user-personas.md
```

## Memory closeout
- `@memory-controller session-write` — record step 2c user research findings.

## Delegation
- **Memory:** @memory-controller for session-write
