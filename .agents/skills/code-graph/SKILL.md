---
name: code-graph
description: Codebase structural dependency mapper — initialize, view status, and run incremental updates for modified codebase files
version: "2.0"
last_updated: 2026-07-10
---

# Code-Graph — Dependency Mapper

## What this skill does

Manages the codebase structural dependency graph (`code-graph.json`). Provides explicit, on-demand scanning of code directories to map imports, exports, and file-level relationships without automatic background overhead.

All code-graph operations go through the self-healing wrapper `node .agents/scripts/ensure_graph.js code`. The wrapper:
- Returns `{status: "fresh"}` if the graph is current (mtime check)
- Returns `{status: "regenerated", ...}` if it had to build
- Records a `graph_status` telemetry event

Do not call `shallow_graph.js` or `incremental_graph.js` directly.

## When to use

- Initialize the codebase graph — first-time setup to index the entire topology.
- Update the graph after code changes.
- Check graph status — view size, file count, and timestamp.
- Cross-file refactors — understand blast radius before editing.
- Dependency analysis — find all consumers of a module.

## When NOT to use

- For documentation links (use `/doc-graph` instead)
- For build dependency analysis (use `npm ls`)

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

```bash
# Find all imports of a specific file
node -e "const g = require('./artifacts/memory/structural/code-graph.json'); console.log(g.nodes['src/config.ts'].imported_by)"

# Find files with the most dependents (highest blast radius)
node -e "const g = require('./artifacts/memory/structural/code-graph.json'); ..."
```

## Workflow

### Step 1: Run the wrapper

Invoke `@executor`:
```bash
node .agents/scripts/ensure_graph.js code [--src src/] [--out <path>] [--force]
```

### Step 2: Report

Read the JSON response and report a concise summary including status, files indexed, and last regenerated timestamp.

## Key Principles

- No background autosaves — only triggered on demand or by orchestrator's `complete` command.
- Build folders (`dist/`, `build/`), dependencies (`node_modules/`), and dotfolders (`.agents/`, `artifacts/`) are always ignored.
- @architect and @tech-lead call the wrapper themselves before reading.

## State machine integration

After update: `node .agents/scripts/orchestrator_state.js complete --artifact code-graph.json`
