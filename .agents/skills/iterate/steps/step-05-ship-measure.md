---
step: 5
name: Ship and Measure
prerequisites:
  - step-04 completed (iteration items implemented and verified)
output_contract:
  citations: not-required
---

# Step 5 — Ship and Measure

Deploy the iteration and measure its impact against the original hypothesis.

## Workflow

### 5a. Deploy — @devops-engineer

Invoke `@devops-engineer` to deploy the iteration.

### 5b. Measure impact — @data-analyst

Invoke `@data-analyst` to measure the impact:
- Compare metrics before and after iteration
- Validate that the change achieved its hypothesis
- Document lessons learned

### 5c. Output results

Write `artifacts/output/07-iteration/iteration-results.md` using template:
```
.agents/templates/planning/iteration-results-template.md
```

### 5d. Record completion

Run:
```bash
node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 07-iteration/iteration-results.md
```

### 5e. Write to memory

Delegate to `@memory-controller`:
```
write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @data-analyst]
{what the iteration achieved and what was learned}
**Status:** active
```

```
session-write
Worked on: Iteration cycle — {what was improved}
Decisions made:
- {hypothesis tested}
- {result: positive/neutral/negative}
Next step: {continue iterating / load retro / load develop}
New blockers: {any issues, or "none"}
```

## Delegation
- **Memory:** @memory-controller for lessons-learned and session-write
