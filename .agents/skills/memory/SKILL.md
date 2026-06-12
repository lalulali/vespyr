---
name: memory
description: Search archived memory entries — retrieve historical context that has been compacted
---

## What this skill does

Searches the archive index for historical context. Use when you need to find a past decision, pattern, or lesson that may have been compacted out of active memory files.

## When to use

- "What was the auth decision we made?"
- "Show me past lessons about performance"
- "Find the architecture decision for the data model"
- Any query about historical project context

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
