---
name: code-graph
description: Codebase structural dependency mapper — initialize, view status, and run incremental updates for modified codebase files
version: "2.1"
last_updated: 2026-07-21
---

# Code-Graph

Maps imports, exports, and dependents for all source files. Output: `artifacts/memory/structural/code-graph.json`.

## Commands

```bash
# Refresh (self-healing — no-op if fresh)
node .agents/scripts/ensure_graph.js code [--src src/] [--force]

# Query (use these instead of reading the raw JSON)
node .agents/scripts/query_graph.js summary          # overview of both graphs
node .agents/scripts/query_graph.js deps <file>      # what does this file import/export?
node .agents/scripts/query_graph.js blast <file>     # what depends on this file?
```

## Workflow

1. Run `ensure_graph.js code` via `@executor`
2. If status is `"fresh"` — graph is current, skip regeneration
3. If status is `"regenerated"` — report file count so user sees cost
4. Use `query_graph.js` commands to answer dependency questions — do NOT read the raw JSON

## Key Principles

- Never call `shallow_graph.js` or `incremental_graph.js` directly
- Build folders, `node_modules/`, and dotfolders are always ignored
- If no `src/` exists, the graph is empty — proceed without it
- Configure default source dirs in `.agents/config.yaml` under `graph.code.src` (CLI `--src` overrides)
