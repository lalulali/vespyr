---
name: test
description: Run tests and summarize failures — quick feedback without loading the full QA workflow
---

## What this skill does

Runs the project's test suite and returns a concise summary. Use for quick feedback without loading the full QA workflow from `develop`.

## When to use

- "Run the tests"
- "Did I break anything?"
- "Show me test failures"
- Quick test feedback between development iterations

## Workflow

### Step 1: Detect test command

Check `package.json`, `Makefile`, or project root for the test command:
- `npm test`, `yarn test`, `pnpm test`
- `make test`
- `pytest`, `go test`, `cargo test`
- Other project-specific commands

### Step 2: Run tests

```
@executor — Run [test command] and summarize:
- Exit code
- Pass/fail counts
- Names of failing tests
- First 3 error messages (truncated)
```

### Step 3: Report

Return:

```
## Test Results
**Exit code:** {0 or non-zero}
**Passed:** {count}
**Failed:** {count}
**Skipped:** {count}

### Failures
{list of failing test names with brief error summaries}
```

### Step 4: Suggest fixes (optional)

If failures are found, suggest likely causes and fixes based on error messages.
