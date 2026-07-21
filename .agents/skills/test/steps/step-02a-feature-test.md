---
step: 2a
name: Feature Testing
prerequisites:
  - step-01 completed
delegation:
  reads: "@reader (source files for test context; per delegation-policy.md multi-file)"
  writes: "@writer (test files, feature-test-results.md; per delegation-policy.md multi-file output)"
  runs: "@executor (npm test, pytest, etc.; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 2a — Feature Testing

Micro-level testing focused on specific user stories, API contracts, unit validations, and component isolated UI behavior.

Runs in parallel with step 02b.

## Workflow

### 2a.1 Detect test framework

Delegate to `@reader` to check `package.json`, `Makefile`, or project root for the test stack. Detect test command, coverage tool, and test file conventions.

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

### 2a.3 Run feature tests

Delegate to `@executor`:
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

Delegate to `@writer` for `artifacts/output/06-quality/feature-test-results.md`:

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

## Loop limit
Max 2 fix-test cycles per failure. If a failure persists after 2 fix attempts, escalate to `@tech-lead`.

## Delegation
- **Reads:** @reader for source files and test patterns
- **Writes:** @writer for test files and feature-test-results.md
- **Runs:** @executor for npm test and coverage commands
