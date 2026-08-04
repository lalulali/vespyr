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

- For current project context (use `@memory-controller load [agent] [task]` instead — memory files are never read directly)
- For active decisions (use `@memory-controller load [agent] [task]` instead)

## The memory files

| File | Purpose | When to write |
|---|---|---|
| `project-context.md` | Stack, constraints, architecture snapshot | Set during init, synced at every session start (`session-start`), updated on major stack changes |
| `session-checkpoints/checkpoint.md` | **Rolling live cursor** of an in-progress session (Phase, current artifact, next action) | Auto-emitted by `orchestrator_state.js` at every state-changing command (complete, session-start, session-write, set-phase, file-cr, sync-context) — overwrites in place |
| `session-summaries/latest.md` | Post-hoc wrap-up of the last ENDED unit of work | At session shutdown (`session-write`) |
| `active-decisions.md` | Running record of current-cycle decisions | After every resolved decision |
| `lessons-learned.md` | Engineering insights, bugs, gotchas | After non-obvious fixes or discoveries |
| `patterns-and-conventions.md` | Reusable patterns, coding conventions | When a pattern repeats across 3+ instances |
| `blockers-and-risks.md` | Active blockers, known risks | When blocked; remove when resolved |

**Checkpoint vs. summary:** the checkpoint answers *"where is work right now?"* (resume point for multi-turn loops); the summary answers *"what just ended?"*. On load, `@memory-controller` surfaces the checkpoint first (fresher) and demotes `latest.md` to last-session context.

## When to write to memory

Write for systemic patterns only, not single-instance events:
- Write: "Tests consistently need JWT mocking — documented the pattern."
- Don't write: "Fixed a typo in auth.ts."
- Write: "API gateway times out due to unbounded connection pooling."
- Don't write: "Saw a 504 once."

## Entry format strings

| Tag | Use for | Example |
|---|---|---|
| `[AUTH]` | Authentication, authorization, sessions, tokens | Auth flow requires email verification |
| `[API]` | API contracts, endpoints, versioning, error codes | Payment API returns 402 on declined card |
| `[DATA]` | Data models, schemas, migrations, storage | User table migrated to UUID primary keys |
| `[ARCH]` | System architecture, component design, boundaries | Chose PostgreSQL over MongoDB for ACID compliance |
| `[INFRA]` | Infrastructure, CI/CD, deployment, environments | CI runs integration tests before deployment |
| `[SECURITY]` | Security decisions, vulnerabilities, threat model | Rate limiting not implemented on login endpoint |
| `[PERF]` | Performance, caching, query optimization, load | Query planner change cut report time by 60% |
| `[PRODUCT]` | Product decisions, scope, features, priorities | Dropped offline mode from MVP scope |
| `[PROCESS]` | Team process, workflow, handoffs, conventions | Feature branch review requires 2 approvals |
| `[CODE]` | Coding patterns, conventions, standards | All React components use named exports |
| `[TEST]` | Testing strategy, coverage, QA decisions | E2E suite runs nightly on staging |
| `[ML]` | Machine learning, models, pipelines, data | Embedding model upgraded to v3 |
| `[UX]` | UX decisions, flows, accessibility, interactions | Onboarding reduced from 5 steps to 3 |
| `[MARKET]` | Market research, competitive intelligence | Competitor added free tier |
| `[RISK]` | Known risks, blockers, mitigations, dependencies | Third-party API rate limits could block launch |
| `[LESSON]` | Bugs, gotchas, fixes | Race condition in websocket handler |
| `[DECISION]` | Resolved decisions with rationale | Monorepo with Nx — unified tooling |

These are the canonical 17 domain tags (see `.agents/templates/memory/memory-entry-template.md`). Entries with any other tag are rejected.

## Workflow

### Step 0: Session start (project-context refresh)

Every agent calls this on entry, before loading context — it keeps `project-context.md` accurate no matter which agent is invoked ad-hoc. Run via `@executor`:

```
node .agents/scripts/orchestrator_state.js session-start --agent {agent} --domain {domain} --goal "{one-line goal}"
```

The mandatory `complete` call also refreshes project-context as a backstop, so the context updates even if session-start is skipped.

### Step 1: Search archive

```
@memory-controller search $ARGUMENTS
```

### Step 2: Load specific entries (optional)

Archived entries are retrieved by **keyword query**, not by ID — there is no `load-archive [entry-id]` command. To pull a specific entry, pass a distinctive phrase from it:

```
node .agents/scripts/memory_filter.js --search "<distinct phrase from the entry>" --max 5
```

This is what `@memory-controller search [query]` delegates to; it scans `archive/index.ndjson`.

### Step 3: Report

Return results with title, domain tag, relevance score, summary, source, and date.

### Step 4: Write to memory (on request)

```
@memory-controller write [entry-type] [content]
```

## Compaction triggers

Compaction is **word-based**, matching `.agents/scripts/compaction_guard.js` (the executable source of truth) and `@memory-controller`'s Operation 4 thresholds:

| File | Word threshold |
|------|----------------|
| `active-decisions.md` | 1,800 |
| `patterns-and-conventions.md` | 1,500 |
| `lessons-learned.md` | 1,300 |
| `blockers-and-risks.md` | 900 |
| `session-summaries/latest.md` | 600 |
| `agent-notes/*.md` (each) | 1,100 |

`project-context.md` is never compacted (static file). When a file exceeds its threshold, the oldest `resolved`/`stale` entries are archived. Archived entries remain searchable via `@memory-controller search`.

## State machine integration

After write: `node .agents/scripts/orchestrator_state.js complete --agent memory-controller --artifact {file}`
