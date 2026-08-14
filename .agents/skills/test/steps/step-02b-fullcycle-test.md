---
step: 2b
name: Full-Cycle Testing
prerequisites:
  - step-01 completed
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
- **ML journey (if ML integration present):** Prediction endpoints, fallback behavior on model failure, model-version handling across the journey

### 2b.1.1 Journey coverage gate
Every primary journey MUST have at least one E2E test. Every recovery journey MUST be tested. The concurrent-journey matrix (N users × N actions) MUST be complete before this step's exit gate.

### 2b.2 Write/run E2E tests

For each identified journey, run E2E tests:

```bash
# Run E2E / integration test suite
npm run test:e2e  # or project equivalent
```

### 2b.3 Validate cross-service concerns

- **API contract integrity:** Requests and responses match schema
- **Data consistency:** Database state matches expected post-journey state
- **Race conditions:** Concurrent operations produce correct results
- **Timeout handling:** Long-running operations degrade gracefully (behavior assertion only — SLA benchmark analysis is owned by `@performance-engineer`)
- **State preservation:** Session state survives page refreshes and navigation

### 2b.4 Analyze results

`@qa-engineer` analyzes:
- Pass/fail counts by journey
- Flaky E2E detection (E2E is the flakiest track — must be tracked explicitly)
- Regression detection (previously passing journeys that now fail)

Write `artifacts/output/05-execution/quality/fullcycle-test-results.md`:

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

## Flaky E2E Tests
| Test | Retry Rate | Last Pass Run | Quarantine? |
|------|-----------|--------------|------------|
```

## Test Quality Gates
Tests written in this step MUST be:
- Independent and idempotent — runnable in any order, repeated runs produce same results
- Fast — integration tests < 10s each
- One logical assertion per test
- Behavior-named (e.g., `it('should preserve session across page refresh')` — not `it('should pass journey test 3')`)
- Behavior-driven (assert on what, not how)

## Loop limit
Max 2 fix-test cycles per failure. If a failure persists after 2 fix attempts, escalate as follows:
- Design-flaw blocker → `@tech-lead`
- Spec-gap-driven failure → file a CR to `@product-manager`
- Auth/secrecy-driven failure → `@security-engineer`

## Memory closeout
- `@memory-controller session-write` — record step 2b full-cycle testing results.

## Delegation
- **Memory:** @memory-controller for session-write
