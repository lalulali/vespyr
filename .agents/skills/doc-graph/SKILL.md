---
name: doc-graph
description: Document relationship and traceability graph mapper — parse and update connections between PRDs, user stories, ADRs, active decisions, and codebase references
---

## What this skill does

Manages the document relationship and traceability graph (`doc-graph.json`). Crawls your project planning and memory files to map out semantic connections between strategy documents, user stories, active decisions, blockers, and their implementations.

**All doc-graph operations go through the self-healing wrapper** `node .agents/scripts/ensure_graph.js doc`. The wrapper:
- Returns `{status: "fresh"}` if the graph is current (mtime check vs all `.md` under `artifacts/memory/` and `artifacts/output/`)
- Returns `{status: "regenerated", documents_scanned, code_references, edges_created, ...}` if it had to build
- Records a `graph_status` telemetry event for every call

Do not call `doc_graph.js` directly.

## When to use

Use this skill when:
- `"Update the document graph"` / `"Sync document relationships"` — Refresh the graph to reflect new/changed markdown files.
- `"Check document graph status"` — View the current size, node counts, and edge connections of the document graph.

---

## Workflow

### Step 1: Run the wrapper

Invoke `@executor` to call the self-healing wrapper:
```bash
node .agents/scripts/ensure_graph.js doc [--out <path>] [--force]
```

The wrapper scans `artifacts/memory/` and `artifacts/output/` (skipping `archive/`, `telemetry/`, and `.agents/`) and rebuilds the graph only if at least one `.md` file is newer than the existing graph.

### Step 2: Report

Read the JSON response from `@executor` and report a concise summary:
```
### Document Graph
- **Status**: [fresh | regenerated]
- **Scan Mode**: [full | none]
- **Documents Scanned**: [count, or 0 if fresh]
- **Codebase File References**: [code references count, or 0 if fresh]
- **Relational Edges Created**: [edges created count, or 0 if fresh]
- **Output Path**: artifacts/memory/structural/doc-graph.json
- **Last Regenerated**: [graph_mtime from response]
```

If status is `regenerated`, mention it explicitly — the user paid for a scan.

---

## Key Principles
- **Self-Healing After Phase Work**: The orchestrator's `init` command seeds the doc-graph when a project starts, and `complete` records the current graph status as telemetry. The `design` and `retro` skills also call the wrapper at the end of their work. You do not need to pre-warm it for them.
- **Traceability Bridge**: Establishes edges that cross-reference User Story IDs (`US-XXX`), Requirement IDs (`REQ-XXX`), and relative codebase paths (e.g. `src/services/auth.js`) to form a complete Federated Graph. It also distinguishes raw user sources (`type: "input"`) from AI-generated files, linking the latter back to their human origins using `derived_from` edges.
- **Query the Graph, Not the Files**: When you need to find which user story implements a requirement, or which ADR constrains a code module, read `artifacts/memory/structural/doc-graph.json` and traverse the edges — do not grep the markdown files. This is the whole point of the graph: it exists so agents don't burn tokens re-reading every doc to find the right one.
