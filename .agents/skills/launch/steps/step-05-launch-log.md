---
step: 5
name: Launch Log
prerequisites:
  - step-04 completed
delegation:
  reads: none
  writes: "@writer (launch-log.md; per delegation-policy.md output file)"
  runs: "@executor (orchestrator_state.js complete)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 5 — Launch Log

Write the final launch report, record completion, and close the session.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill launch --step 5`
## Launch retrospective
`@product-manager` conducts a quick launch retro:
- What went well in the launch process?
- What could be improved for next time?
- Were there any near-misses?
- Update runbook and checklist based on learnings

## Memory persistence
Write learnings:
```
@memory-controller write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @product-manager]
{launch lesson}
**Status:** active
```

Write session summary:
```
@memory-controller session-write
Worked on: Product launch — {feature name}
Decisions made:
- {go/no-go decision and rationale}
- {any rollout decisions}
Next step: Monitor post-launch metrics for 24-72h, then load iterate
Blockers: {any issues found during launch, or "none"}
```

## Output
`artifacts/output/06-launch/launch-retro.md`

## State machine
Record only the artifacts actually produced. The post-launch report is the critical one — once recorded, `iterate` becomes the natural next skill.
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/release-readiness.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/go-nogo-decision.md
node .agents/scripts/orchestrator_state.js complete --agent devops-engineer --artifact 06-launch/launch-log.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/post-launch-report.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/launch-retro.md
```

## Handoff
- For feature improvements → load `iterate`
- For process review → load `retro`
- For production incidents → load `incident`

## Delegation
- **Reads:** none
- **Writes:** @writer for launch-log.md
- **Runs:** @executor for orchestrator_state.js complete

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill launch --step 5`
