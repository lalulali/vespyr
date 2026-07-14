---
step: 1
name: Hot Paths
prerequisites: []
delegation:
  reads: none
  writes: none
  runs: "@executor (telemetry_surface.js hot-paths; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 1 — Hot Paths

Collect quantitative data. Invoke telemetry and operational metrics to surface the top 3 hot paths from the last 30 days.

## Goal
Gather hard numbers — kanban state, cycle times, code review cycles, bug counts, deployment success rate. Data anchors the retro in facts, not feelings.

## Telemetry surface (Phase 3 wiring)
```
node .agents/scripts/telemetry_surface.js hot-paths
```
Surfaces the top 3 most frequent agent paths, most common failure points, and highest-latency operations from the last 30 days of telemetry.

## Agent invocation
`@product-manager` collects:

**Kanban & execution:**
- `artifacts/output/04-planning/kanban.md` — board state, completed stories, cycle times
- `@memory-controller load blockers` — active blockers and resolution times
- Code review metrics — number of review cycles, blocking issues found per cycle

**Quality metrics:**
- QA metrics — bugs found, test coverage, regression rate
- Security findings — count by severity, resolution time
- Performance benchmarks — SLA adherence, regressions

**Deployment metrics:**
- Launch success rate, rollback frequency, mean time to deploy

## Output
`artifacts/output/09-retro/data-collection.md` — use template `.agents/templates/memory/retrospective-template.md`

## Delegation
- **Reads:** none
- **Writes:** none
- **Runs:** @executor for telemetry_surface.js hot-paths
