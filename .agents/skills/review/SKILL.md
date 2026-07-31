---
name: review
description: Standalone code review on current changes — outside the dev loop
---

## Persona delegation
This skill delegates to `@code-reviewer`. The code-reviewer performs the review (correctness, security, performance, patterns, tests). The skill file provides the review checklist; `@code-reviewer` provides the depth, failure-mode awareness, and the 15-item false-positive guard.

## What this skill does

Reviews code changes for correctness, security, performance, and adherence to project patterns. Use when you need a review without running the full `develop` workflow.

## When to use

- "Review my recent changes"
- "Check this PR for issues"
- "Is this code following our patterns?"
- Standalone review outside the development cycle

## Workflow

### Step 1: Load context

```
@memory-controller load code-reviewer [standalone code review]
```

Load `patterns-and-conventions.md` to understand project conventions.

### Step 2: Identify changes

Use git to find changed files:

```
@executor — Run git diff --name-only HEAD~1 (or appropriate range)
```

### Step 3: Review

Check each changed file for:
- **Correctness:** Logic errors, edge cases, null handling
- **Security:** Input validation, auth flows, data exposure
- **Performance:** N+1 queries, unnecessary allocations, hot paths
- **Patterns:** Adherence to project conventions from `patterns-and-conventions.md`
- **Tests:** Coverage of new/changed logic

### Step 4: Report

Return findings organized by severity:
- **Blocking:** Must fix before merge
- **Non-blocking:** Should fix, but can defer
- **Nit:** Style/preferences

Include specific file:line references for each finding.

## State machine integration

At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent code-reviewer --artifact code-review`

**At completion:** Write session summary — mandatory:
```
@memory-controller session-write [agent: @code-reviewer]
Worked on: Standalone code review — {files or feature reviewed}
Decisions: {blocking findings count}, {non-blocking findings count}. Key issues: {1-2 sentence summary}
Next step: {fix blocking issues then re-review, or merge if clear}
Blockers: {any blocking findings or "none"}
```

