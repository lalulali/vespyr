---
name: doc-graph
description: Document relationship and traceability graph mapper — parse and update connections between PRDs, user stories, ADRs, active decisions, and codebase references
metadata:
  version: "2.1"
  last_updated: "2026-07-21"
---

# Doc-Graph

Maps relationships between documents (PRDs, user stories, ADRs, memory) and their code references. Output: `artifacts/memory/structural/doc-graph.json`.

## Commands

```bash
# Refresh (self-healing — no-op if fresh)
node .agents/scripts/ensure_graph.js doc [--force]

# Query (use these instead of reading the raw JSON)
node .agents/scripts/query_graph.js summary          # overview of both graphs
node .agents/scripts/query_graph.js trace <doc>      # document relationships and edges
node .agents/scripts/query_graph.js search <query>   # find documents by title/section/path
```

## Workflow

1. Run `ensure_graph.js doc` via `@executor`
2. If status is `"fresh"` — graph is current, skip regeneration
3. If status is `"regenerated"` — report doc count and edge count so user sees cost
4. Use `query_graph.js` commands to answer relationship questions — do NOT read the raw JSON

## Key Principles

- Never call `doc_graph.js` directly
- Scans directories configured in `.agents/config.yaml` under `graph.doc.docs` (default: `artifacts/input/`, `artifacts/memory/`, `artifacts/output/`)
- Document IDs matched from `graph.doc.ids` patterns (default: `US-\d+`, `REQ-\d+`)
- Edges cross-reference shared IDs, code paths, and markdown links
- Query the graph, not the files — this is the whole point
- CLI flags `--docs` and `--ids` override config; useful for one-off scans
