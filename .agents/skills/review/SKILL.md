---
name: review
description: Standalone code review on current changes — outside the dev loop. Use when the user says "review my changes", "check this PR", "is this code following our patterns", or invokes /review for a review without the full /develop workflow.
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
---

# Review — Standalone Code Review

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
Run git diff --name-only HEAD~1 (or appropriate range)
```

### Step 3: Orphan-AC sweep (02o parity)

Run the same coverage sweep the in-loop reviewer runs at `develop` step 07, so a standalone review is not weaker than the in-loop one:

```bash
node .agents/scripts/req_to_impl_check.js
```

Report every acceptance criterion that no implementation and no test references. An unreferenced AC is a defect, not a detail — a criterion nothing implements is a promise the code does not keep. Label the sweep honestly in the report; it is a reference, not a phase-advance gate.

### Step 4: Review

Check each changed file for:
- **Correctness:** Logic errors, edge cases, null handling
- **Security:** Input validation, auth flows, data exposure
- **Performance:** N+1 queries, unnecessary allocations, hot paths
- **Patterns:** Adherence to project conventions from `patterns-and-conventions.md`
- **Tests:** Coverage of new/changed logic

### Step 5: Report

Return findings organized by severity:
- **Blocking:** Must fix before merge
- **Non-blocking:** Should fix, but can defer
- **Nit:** Style/preferences

Include specific file:line references for each finding. Open with one plain sentence stating the overall disposition and the blocking count (DNA 8), then the findings as what's-wrong → why-it-matters → consequence.

## State machine integration

At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent code-reviewer --artifact code-review`

**At completion:** Write session summary — mandatory:
```
@memory-controller session-write [agent: @code-reviewer]
Worked on: Standalone code review — {files or feature reviewed}
Decisions: {blocking findings count}, {non-blocking findings count}. Key issues: {1-2 sentence summary}
Next step: {fix blocking issues then re-review, or merge if clear}
Blockers: {any blocking findings or "none"}
```

