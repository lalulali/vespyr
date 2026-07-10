---
name: code-graph
description: Codebase structural dependency mapper — initialize, view status, and run incremental updates for modified codebase files
version: "2.0"
last_updated: 2026-07-10
---

# Code-Graph — Dependency Mapper

## What this skill does

Manages the codebase structural dependency graph (`code-graph.json`). Provides explicit, on-demand scanning of code directories to map imports, exports, and file-level relationships without automatic background overhead.

**All code-graph operations go through the self-healing wrapper** `node .agents/scripts/ensure_graph.js code`. The wrapper:
- Returns `{status: "fresh"}` if the graph is current (mtime check)
- Returns `{status: "regenerated", scan_mode: "full" | "incremental", ...}` if it had to build
- Records a `graph_status` telemetry event for every call

Do not call `shallow_graph.js` or `incremental_graph.js` directly.

## When to use

- `"Initialize the codebase graph"` — First-time setup to index the entire codebase topology.
- `"Update the codebase graph"` / `"Sync codebase changes"` — Perform a fast incremental scan of only the files changed or deleted since the last update.
- `"Check codebase graph status"` — View the current size, scanned files count, and generation timestamp of the graph.
- Cross-file refactors — understand blast radius before editing.
- Dependency analysis — find all consumers of a module before changing its interface.

## When NOT to use

- For documentation links (use `/doc-graph` instead)
- For build dependency analysis (use `npm ls` or equivalent)

## Output schema

The graph is written to `artifacts/memory/structural/code-graph.json`:

```json
{
  "version": "2.0",
  "generated": "2026-07-10T12:00:00Z",
  "scan_mode": "full",
  "total_files": 150,
  "nodes": {
    "src/auth.ts": {
      "imports": ["src/utils/jwt.ts", "src/models/user.ts"],
      "exports": ["authenticate", "authorize"],
      "imported_by": ["src/routes/api.ts", "src/middleware/auth.ts"]
    }
  }
}
```

## Read-only query patterns

For `@architect` and `@tech-lead` consuming the graph:

```bash
# Find all imports of a specific file
node -e "const g = require('./artifacts/memory/structural/code-graph.json'); console.log(g.nodes['src/config.ts'].imported_by)"

# Find files with the most dependents (highest blast radius)
node -e "const g = require('./artifacts/memory/structural/code-graph.json'); Object.entries(g.nodes).sort((a,b) => b[1].imported_by?.length - a[1].imported_by?.length).slice(0,10)"

# Find files that import from a directory
node -e "const g = require('./artifacts/memory/structural/code-graph.json'); Object.entries(g.nodes).filter(([k,v]) => v.imports?.some(i => i.startsWith('src/utils/')))"
```

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

## Key Principles

- **No Background Autosaves**: Codebase indexing is never triggered automatically by development actions or file saves. The orchestrator's `complete` command refreshes the code-graph after `developer` / `architect` / `tech-lead` finish work, but no other hook fires it.
- **Source Folder Isolation**: Standard build folders (`dist/`, `build/`), dependencies (`node_modules/`), and engine system dotfolders (`.agents/`, `artifacts/`) are always ignored during scans.
- **Self-Healing Reads**: `@architect` and `@tech-lead` call this wrapper themselves before reading the graph. You don't need to pre-warm it for them.

## State machine integration

After update: `node .agents/scripts/orchestrator_state.js complete --artifact code-graph.json`
