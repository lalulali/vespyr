---
name: memory
description: Search archived memory entries — retrieve historical context that has been compacted
version: "2.0"
last_updated: 2026-07-10
---

# Memory — Persistent Context Search

## What this skill does

Searches the archive index for historical context. Use when you need to find a past decision, pattern, or lesson that may have been compacted out of active memory files. Also documents when and how to write to memory.

## When to use

- "What was the auth decision we made?"
- "Show me past lessons about performance"
- "Find the architecture decision for the data model"
- Any query about historical project context

## When NOT to use

- For current project context (read `project-context.md` directly)
- For active decisions (read `active-decisions.md` directly)

## The 5 memory files

| File | Purpose | When to write |
|---|---|---|
| `project-context.md` | Stack, constraints, architecture snapshot | Set during init, updated on major stack changes |
| `active-decisions.md` | Running record of current-cycle decisions | After every resolved decision |
| `lessons-learned.md` | Engineering insights, bugs, gotchas | After non-obvious fixes or discoveries |
| `patterns-and-conventions.md` | Reusable patterns, coding conventions | When a pattern repeats across 3+ instances |
| `blockers-and-risks.md` | Active blockers, known risks | When blocked; remove when resolved |

## When to write to memory

Write for systemic patterns only, not single-instance events:
- Write: "Tests consistently need JWT mocking — documented the pattern."
- Don't write: "Fixed a typo in auth.ts."
- Write: "API gateway times out due to unbounded connection pooling."
- Don't write: "Saw a 504 once."

## Entry format strings

| Tag | Use for | Example |
|---|---|---|
| `[DOMAIN]` | Business domain knowledge | Auth flow requires email verification |
| `[CODE]` | Codebase patterns | All React components use named exports |
| `[PROCESS]` | Workflow improvements | CI runs integration tests before deployment |
| `[ARCH]` | Architecture decisions | Chose PostgreSQL over MongoDB for ACID compliance |
| `[LESSON]` | Bugs, gotchas, fixes | Race condition in websocket handler |
| `[RISK]` | Known risks, blockers | Rate limiting not implemented |
| `[DECISION]` | Resolved decisions with rationale | Monorepo with Nx — unified tooling |

## Workflow

### Step 1: Search archive

```
@memory-controller search $ARGUMENTS
```

### Step 2: Load specific entries (optional)

```
@memory-controller load-archive [entry-id]
```

### Step 3: Report

Return results with title, domain tag, relevance score, summary, source, and date.

### Step 4: Write to memory (on request)

```
@memory-controller write [entry-type] [content]
```

## Compaction triggers

- `active-decisions.md` > 500 lines → oldest archived
- `lessons-learned.md` > 300 lines → oldest archived
- `patterns-and-conventions.md` > 200 lines → oldest archived

Archived entries remain searchable via `@memory-controller search`.

## State machine integration

After write: `node .agents/scripts/orchestrator_state.js complete --agent memory-controller --artifact {file}`
