---
step: 2a
name: Feature Testing
prerequisites:
  - step-01 completed
output_contract:
  citations: not-required
---

# Step 2a — Feature Testing

Micro-level testing focused on specific user stories, API contracts, unit validations, and component isolated UI behavior.

Runs in parallel with step 02b.

## Workflow

### 2a.1 Detect test framework

Read to check `package.json`, `Makefile`, or project root for the test stack. Detect test command, coverage tool, and test file conventions.

### 2a.2 Write/update unit tests

For each user story in `user-stories.md`, ensure:

**Happy path (AC-H*):**
- Every step from trigger to completion is tested
- Expected outputs match acceptance criteria exactly

**Unhappy path (AC-U*):**
- Every error condition is tested
- Error messages and codes match spec
- Recovery paths verified

**Edge cases (AC-E*):**
- Boundaries tested (min, max, null, empty)
- Enrichment findings from step 01 applied

**Component isolation (UI):**
- Each component renders correctly in isolation
- State transitions work (default, hover, active, disabled, loading, error)
- Accessibility: keyboard nav, screen reader, focus management
- Visual regression: screenshot-diff each state against `design.md`; assert color/spacing/typography tokens match the design system

**Component-level integration:**
- Integration with mocked downstream boundaries is tested here (component-level only)
- Cross-service integration is deferred to step 02b

### 2a.3 Run feature tests

Run:
```bash
# Run unit tests with coverage
npm test -- --coverage  # or project equivalent
```

### 2a.4 Analyze results

`@qa-engineer` analyzes:
- Pass/fail counts by suite
- Coverage gaps (< 80% branch = flag)
- Flaky test detection (tests that fail intermittently)
- Regression detection (previously passing tests that now fail)

Write `artifacts/output/05-execution/quality/feature-test-results.md`:

```markdown
# Feature Test Results
**Date:** YYYY-MM-DD
**Agent:** @qa-engineer

## Summary
| Suite | Passed | Failed | Skipped | Coverage |
|-------|--------|--------|---------|----------|

## Failures
| Test | Error | Story Ref | Suggested Fix |
|------|-------|-----------|---------------|

## Coverage Gaps
| File | Current % | Target % | Missing |
|------|-----------|----------|---------|

## Flaky Tests
| Test | Failure Rate | Pattern |
|------|-------------|---------|
```

## Test Quality Gates
Tests written in this step MUST be:
- Independent and idempotent — runnable in any order, repeated runs produce same results
- Fast — unit tests < 1s each
- One logical assertion per test
- Behavior-named (e.g., `it('should reject invalid email format')` — not `it('should fail validation test 3')`)
- Behavior-driven (assert on what, not how)

## Loop limit
Max 2 fix-test cycles per failure. If a failure persists after 2 fix attempts, escalate as follows:
- Design-flaw blocker → `@tech-lead`
- Spec-gap-driven failure → file a CR to `@product-manager`
- Auth/secrecy-driven failure → `@security-engineer`

## Memory closeout
- `@memory-controller session-write` — record step 2a feature testing results.

## Delegation
- **Memory:** @memory-controller for session-write
