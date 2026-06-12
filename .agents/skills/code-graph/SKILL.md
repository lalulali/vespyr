---
name: code-graph
description: Codebase structural dependency mapper — initialize, view status, and run incremental updates for modified codebase files
---

## What this skill does

Manages the codebase structural dependency graph (`code-graph.json`). Provides explicit, on-demand scanning of code directories to map imports, exports, and file-level relationships without automatic background overhead.

**All code-graph operations go through the self-healing wrapper** `node .agents/scripts/ensure_graph.js code`. The wrapper:
- Returns `{status: "fresh"}` if the graph is current (mtime check)
- Returns `{status: "regenerated", scan_mode: "full" | "incremental", ...}` if it had to build
- Records a `graph_status` telemetry event for every call

Do not call `shallow_graph.js` or `incremental_graph.js` directly.

## When to use

Use this skill when:
- `"Initialize the codebase graph"` — First-time setup to index the entire codebase topology.
- `"Update the codebase graph"` / `"Sync codebase changes"` — Perform a fast incremental scan of only the files changed or deleted since the last update.
- `"Check codebase graph status"` — View the current size, scanned files count, and generation timestamp of the graph.

---

## Workflow

### Step 1: Run the wrapper

Invoke `@executor` to call the self-healing wrapper:
```bash
node .agents/scripts/ensure_graph.js code [--src src/] [--out <path>] [--force]
```

Replace `--src src/` with a comma-separated list of directories (e.g. `--src src/,lib/,app/`) if the project uses alternative source paths. Use `--force` to bypass the freshness check (rarely needed — useful for full rebuilds after manual edits).

### Step 2: Report

Read the JSON response from `@executor` and report a concise summary:
```
### Codebase Graph
- **Status**: [fresh | regenerated]
- **Scan Mode**: [full | incremental | none]
- **Files Indexed**: [total file count]
- **Files Scanned (Delta)**: [scanned files count, or 0 if fresh]
- **Changes Detected**: [changed files count, or 0 if fresh]
- **Files Deleted**: [deleted files count, or 0 if fresh]
- **Output Path**: artifacts/memory/structural/code-graph.json
- **Last Regenerated**: [graph_mtime from response]
```

If status is `regenerated`, mention it explicitly — the user paid for a scan.

---

## Key Principles
- **No Background Autosaves**: Codebase indexing is never triggered automatically by development actions or file saves. The orchestrator's `complete` command refreshes the code-graph after `developer` / `architect` / `tech-lead` finish work, but no other hook fires it.
- **Source Folder Isolation**: Standard build folders (`dist/`, `build/`), dependencies (`node_modules/`), and engine system dotfolders (`.agents/`, `artifacts/`) are always ignored during scans.
- **Self-Healing Reads**: `@architect` and `@tech-lead` call this wrapper themselves before reading the graph. You don't need to pre-warm it for them.
