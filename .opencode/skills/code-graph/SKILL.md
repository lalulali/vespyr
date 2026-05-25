---
name: code-graph
description: Codebase structural dependency mapper — initialize, view status, and run incremental updates for modified codebase files
---

## What this skill does

Manages the codebase structural dependency graph (`code-graph.json`). It provides explicit, on-demand scanning of code directories to map imports, exports, and file-level relationships without automatic background overhead.

## When to use

Use this skill when:
- `"Initialize the codebase graph"` — First-time setup to index the entire codebase topology.
- `"Update the codebase graph"` / `"Sync codebase changes"` — Perform a fast incremental scan of only the files changed or deleted since the last update.
- `"Check codebase graph status"` — View the current size, scanned files count, and generation timestamp of the graph.

---

## Workflow

### Step 1: Check Graph Existence
Inspect the workspace to determine if `artifacts/memory/structural/code-graph.json` exists.

### Step 2: Initialize (Full Scan)
If the file does **not** exist:
Invoke `@executor` to run a complete language-agnostic structural scan across codebase source files (JS, TS, Python, Go, Rust, Java, Ruby, PHP, C++):
```bash
node .opencode/scripts/shallow_graph.js --src src/ --out artifacts/memory/structural/code-graph.json
```
*(Note: Replace `--src src/` with a comma-separated list of directories like `--src src/,lib/,app/` if the project uses alternative source paths).*

### Step 3: Update (Incremental Scan)
If the file **does** exist:
Invoke `@executor` to run a high-speed incremental scan, comparing modified times (`mtime`) against the existing graph and parsing only changed/new/deleted files:
```bash
node .opencode/scripts/incremental_graph.js --src src/ --out artifacts/memory/structural/code-graph.json
```

### Step 4: Report Status
Read the returned JSON response from `@executor` and report a concise summary to the user:
```
### Codebase Graph Updated
- **Scan Mode**: [full | incremental]
- **Total Files Indexed**: [total file count]
- **Files Scanned (Delta)**: [scanned files count]
- **Changes Detected**: [changed files count] (new/modified)
- **Files Deleted**: [deleted files count]
- **Output Path**: artifacts/memory/structural/code-graph.json
```

---

## Key Principles
- **No Background Autosaves**: Codebase indexing is never triggered automatically by development actions or file saves. It must be explicitly invoked to prevent unnecessary I/O or cpu overhead during coding loops.
- **Source Folder Isolation**: Standard build folders (`dist/`, `build/`), dependencies (`node_modules/`), and engine system dotfolders (`.opencode/`, `artifacts/`) are always ignored during scans.
