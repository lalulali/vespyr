---
step: 2b
name: Full-Cycle Testing
prerequisites:
  - step-01 completed
delegation:
  reads: "@reader (integration configs, API specs; per delegation-policy.md multi-file)"
  writes: "@writer (e2e test files, fullcycle-test-results.md; per delegation-policy.md multi-file output)"
  runs: "@executor (e2e test suite, integration test commands; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 2b — Full-Cycle Testing

Macro-level testing focused on end-to-end user journeys, cross-service integration, data consistency, and system recovery.

Runs in parallel with step 02a.

## Workflow

### 2b.1 Identify full-cycle journeys

From `user-stories.md` and `product-spec.md`, identify complete user journeys spanning multiple screens/services:

- **Primary journey:** Happy path from entry to completion (e.g., signup → explore → purchase → receipt)
- **Recovery journey:** What happens when mid-journey failure occurs (e.g., payment fails → retry → success)
- **Session journey:** What happens across sessions (e.g., logout → login → state preserved)
- **Concurrent journey:** What happens when multiple actions overlap (e.g., two tabs, same session)

### 2b.2 Write/run E2E tests

For each identified journey, delegate to `@executor` to run E2E tests:

```bash
# Run E2E / integration test suite
npm run test:e2e  # or project equivalent
```

### 2b.3 Validate cross-service concerns

- **API contract integrity:** Requests and responses match schema
- **Data consistency:** Database state matches expected post-journey state
- **Race conditions:** Concurrent operations produce correct results
- **Timeout handling:** Long-running operations degrade gracefully
- **State preservation:** Session state survives page refreshes and navigation

### 2b.4 Analyze results

Delegate to `@writer` for `artifacts/output/06-quality/fullcycle-test-results.md`:

```markdown
# Full-Cycle Test Results
**Date:** YYYY-MM-DD
**Agent:** @qa-engineer

## Journeys Tested
| # | Journey Name | Steps | Result | Duration |
|---|-------------|-------|--------|----------|

## Integration Failures
| Service | Endpoint | Error | Impact |
|---------|----------|-------|--------|

## Data Consistency Checks
| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|

## Recovery Validation
| Scenario | Recovery Time | Data Loss? | Pass? |
|----------|--------------|-----------|-------|
```

## Loop limit
Max 2 fix-test cycles per integration failure. If a failure persists after 2 fix attempts, escalate to `@tech-lead`.

## Delegation
- **Reads:** @reader for integration configs and API specs
- **Writes:** @writer for E2E test files and fullcycle-test-results.md
- **Runs:** @executor for E2E/integration test commands
