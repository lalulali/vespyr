---
step: 5
name: Compact
prerequisites:
  - step-04 completed
output_contract:
  citations: not-required
---

# Step 5 — Compact

Update shared memory, compact old entries, and close the session.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill retro --step 5`
## 5a. Memory updates
`@product-manager` writes findings to memory via `@memory-controller`:

```
@memory-controller write patterns-and-conventions.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @product-manager]
{process improvement discovered this cycle}
**Status:** active

@memory-controller write project-context.md
### [ARCH] {title} [date: YYYY-MM-DD] [agent: @architect]
{new technical decision or constraint}
**Status:** active

@memory-controller write active-decisions.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @product-manager]
{new process decision}
**Status:** active

@memory-controller write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @product-manager]
{lesson learned this cycle}
**Status:** active
```

For each resolved blocker, mark it resolved:
```
@memory-controller write blockers-and-risks.md
### [RISK] {title} [date: YYYY-MM-DD] [agent: @product-manager] [RESOLVED: YYYY-MM-DD]
{resolution summary}
**Status:** resolved
```

## 5b. Memory integrity check
```
node .agents/scripts/witness.js check
```
Verify memory file integrity before compaction — checks for missing entries, corrupted metadata, orphaned references.

## 5c. Memory compaction
Explicitly trigger compaction on all files:
```
@memory-controller compact active-decisions.md
@memory-controller compact patterns-and-conventions.md
@memory-controller compact lessons-learned.md
@memory-controller compact blockers-and-risks.md
```

Auto-protect rules (NEVER archived):
- Entries with `[CRITICAL]` tag
- Entries with `referenced_by.length > 3` (highly connected)
- Entries less than 7 days old

The controller will:
1. Move resolved/stale entries (> 90 days, no protected status) to `artifacts/memory/archive/YYYY-QN/`
2. Append searchable metadata for each archived entry to `artifacts/memory/archive/index.ndjson` (append-only, one JSON object per line)
3. Rewrite each file with only active entries
4. Report: entries kept, entries archived, new file size

Nothing is deleted. All archived content remains searchable via `@memory-controller search`. The swarm does NOT block on human input — archive proceeds automatically. Humans review asynchronously.

## 5d. Session closeout
```
@memory-controller status
```

```
@memory-controller session-write
Worked on: {what was accomplished in this retrospective}
Decisions made:
- {key decision 1}
- {key decision 2}
Next step: {first action item from action-items.md}
Blockers: {any new blockers, or "none"}
```

## Outputs
- Updated memory files (patterns, lessons, decisions, blockers)
- `artifacts/memory/archive/index.ndjson` appended (searchable archive index)
- Doc-graph refreshed
- Session summary written

## Delegation
- **Memory:** @memory-controller for write, compact, session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill retro --step 5`
