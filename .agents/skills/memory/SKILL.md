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

Write to memory for **systemic patterns only**, not single-instance events:

- **Write**: "Tests in the auth module consistently need JWT mocking — documented the pattern."
- **Don't write**: "Fixed a typo in auth.ts."
- **Write**: "The API gateway times out under load because of unbounded connection pooling — root cause identified."
- **Don't write**: "Saw a 504 once."

## Entry format strings

Each memory entry follows a domain-tagged format:

| Tag | Use for | Example |
|---|---|---|
| `[DOMAIN]` | Business domain knowledge | `[DOMAIN] Auth flow requires email verification before API access` |
| `[CODE]` | Codebase patterns, conventions | `[CODE] All React components use named exports, no default exports` |
| `[PROCESS]` | Workflow improvements | `[PROCESS] CI pipeline runs integration tests before deployment gate` |
| `[ARCH]` | Architecture decisions, trade-offs | `[ARCH] Chose PostgreSQL over MongoDB for ACID compliance on payments` |
| `[LESSON]` | Bugs, gotchas, fixes | `[LESSON] Race condition in websocket handler — mutex added` |
| `[RISK]` | Known risks, blockers | `[RISK] Rate limiting not implemented — DDoS vector open` |
| `[DECISION]` | Resolved decisions with rationale | `[DECISION] Monorepo with Nx — unified tooling, slower CI startup` |

## Workflow

### Step 1: Search archive

```
@memory-controller search $ARGUMENTS
```

The controller delegates to `memory_filter.js --search` which scans `archive/index.ndjson` using keyword matching + recency weighting. Returns top 5 matches with relevance scores, summaries, and file locations.

### Step 2: Load specific entries (optional)

If a specific archived entry is found and needed in full:

```
@memory-controller load-archive [entry-id]
```

### Step 3: Report

Return the search results with:
- Entry title and domain tag
- Relevance score
- Summary
- Original file location
- Date

If no results found, suggest broader search terms.

### Step 4: Write to memory (on request)

If the user wants to record a finding:

```
@memory-controller write [entry-type] [content]
```

The controller validates format, assigns the correct domain tag, and appends to the appropriate memory file.

## Compaction triggers

Compaction runs automatically when:
- `active-decisions.md` exceeds 500 lines → oldest entries archived to `archive/index.ndjson`
- `lessons-learned.md` exceeds 300 lines → oldest entries archived
- `patterns-and-conventions.md` exceeds 200 lines → oldest entries archived

Archived entries remain searchable via `@memory-controller search`.

## State machine integration

After write: `node .agents/scripts/orchestrator_state.js complete --agent memory-controller --artifact {file}`
