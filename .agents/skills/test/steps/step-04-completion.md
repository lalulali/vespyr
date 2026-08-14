---
step: 4
name: Completion
prerequisites:
  - step-03 completed
delegation:
  memory: "@memory-controller (session-write; per delegation-policy.md all memory)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 4 — Completion

Produce the final test report and close the QA cycle.

## Workflow

### 4a. Compile test report

`@qa-engineer` synthesizes all findings into a single report. Write `artifacts/output/05-execution/quality/test-report.md`:

```markdown
# Test Report
**Date:** YYYY-MM-DD
**Agent:** @qa-engineer
**Scope:** {feature/product name}

## Test Summary
| Track | Passed | Failed | Skipped | Coverage |
|-------|--------|--------|---------|----------|
| Feature (02a) | {n} | {n} | {n} | {n}% |
| Full-Cycle (02b) | {n} | {n} | {n} | N/A |

## Enrichment Summary
- Scenarios discovered: {n}
- Scenarios backported to AC: {n}
- Spec gaps flagged: {n}
- Unreachable (documented): {n}

## Open Defects
| # | Severity | Description | Story Ref | Blocker? |
|---|----------|-------------|-----------|----------|

## Release Recommendation
- [ ] GO — All criteria pass, no blocking defects
- [ ] CONDITIONAL GO — Minor issues, recommend fix before next cycle
- [ ] NO-GO — Blocking defects or coverage gaps

**Recommendation:** {GO / CONDITIONAL GO / NO-GO}
**Rationale:** {brief explanation}
```

### 4b. Memory closeout

```
@memory-controller session-write
Worked on: QA cycle — {feature/product name}
Key findings:
- {enrichment discoveries}
- {test results}
- {release recommendation: GO / CONDITIONAL / NO-GO}
Next step: {if GO → PM verification / if NOT → fix cycle}
Blockers: {any blocking defects, or "none"}
```

### 4c. State machine

Run:
```bash
node .agents/scripts/orchestrator_state.js complete --agent qa-engineer --artifact 05-execution/quality/test-report.md
```
## Delegation
- **Memory:** @memory-controller for session-write