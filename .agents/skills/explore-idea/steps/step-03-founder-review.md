---
step: 3
name: Founder Review
prerequisites:
  - step-02a completed
  - step-02b completed
  - step-02c completed
output_contract:
  citations: not-required
---

# Step 3 — Founder Review

Gate check after all research completes. The founder reviews findings against the brief and decides the path forward.

## Workflow

### 3a. Load all research

Read:
- `artifacts/output/02-research/market-analysis.md`
- `artifacts/output/02-research/competitive-analysis.md`
- `artifacts/output/02-research/user-personas.md`
- Validation brief (or idea brief)

### 3b. Review findings

`@founder` evaluates:
- Does the market validate the opportunity? (Check GO/NO-GO in market analysis)
- Does user research confirm the target persona and pain points?
- Does competitive analysis reveal viable positioning?
- Cross-reference against the validation brief's premises — do premises still hold after research?

### 3c. Decision

**If research contradicts assumptions:**
- **Pivot** — revise brief and re-run Phase 2
- **Refine** — adjust scope
- **Proceed** — move forward with documented risk
- Maximum 1 pivot before committing to a direction

### 3d. Update memory

Delegate to `@memory-controller`:
```
write project-context.md
Update the "Project Name", "Core Goal / Problem", and "Target Audience" fields based on validated findings.
```

```
session-write
Worked on: Product exploration — {concept name}
Decisions made:
- {market verdict: GO/NO-GO and key finding}
- {target user confirmed/revised}
- {key competitive positioning}
Next step: Load design to define requirements and create specs
New blockers: {any research gaps or unresolved questions, or "none"}
```

### 3e. Handoff

Load `design` to define requirements and create specs — or load `shape-up` first if findings need consolidation before specs.

## Delegation
- **Memory:** @memory-controller for project-context and session-write
