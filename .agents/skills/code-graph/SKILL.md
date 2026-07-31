---
name: code-graph
description: Codebase structural dependency mapper — initialize, view status, and run incremental updates for modified codebase files
version: "2.2"
last_updated: 2026-07-31
---

# Code-Graph

Maps imports, exports, and dependents for all source files. Output: `artifacts/memory/structural/code-graph.json`.

## When to use

Reach for the code-graph whenever a change's blast radius isn't obvious from the immediate target:

- **Cross-file refactors** — renaming a symbol, splitting a module, or relocating an export. Query `blast <file>` first; every returned file is on the blast radius and needs a corresponding change.
- **Architecture decisions** — answering "what breaks if I delete this file?" or "who imports this contract?" before committing to a design. Even a 5-minute query saves a missed-dependency regression.
- **PR review pre-flight** — before approving a change, confirm the diff matches its declared scope by checking the blast radius against the touched files.
- **Tech-lead planning** — feed `summary` into the execution plan so task ordering respects real dependency edges, not guessed ones.

You do NOT need the graph for single-file edits with no callers (the script also handles this gracefully — `blast <file>` returns nothing).

## Commands

```bash
# Refresh (self-healing — no-op if fresh)
node .agents/scripts/ensure_graph.js code [--src src/] [--force]

# Query (use these instead of reading the raw JSON)
node .agents/scripts/query_graph.js summary          # overview of both graphs
node .agents/scripts/query_graph.js deps <file>      # what does this file import/export?
node .agents/scripts/query_graph.js blast <file>     # what depends on this file?
```

## Output schema — `code-graph.json`

Stored at `artifacts/memory/structural/code-graph.json`. Top-level shape:

- `generated_at` — ISO timestamp of the latest build
- `status` — `"fresh"` (mtimes respected) or `"regenerated"`
- `source_dirs` — directories scanned (default: `src/`)
- `ignored` — non-source dirs skipped (`node_modules/`, build outputs, dotfolders)
- `files` — map of `{ "<relative-path>": { "imports": [...], "exports": [...] } }`
- `dependents` — map of `{ "<relative-path>": [<files-that-import-it>, ...] }`

`summary` prints the total file count, average imports, and orphan count (files with zero dependents). `deps`/`blast` filter the maps for a single file. Reading the JSON directly is allowed but discouraged — the printer formats blast-radius across rows.

## Self-healing wrapper — `ensure_graph.js`

`ensure_graph.js` is the only entry point. It:

1. Reads `maxMtimeOfSources()` over the configured source dirs
2. Reads `graphMtime()` of the existing JSON
3. Compares the two mtimes
4. If JSON mtime ≥ source mtime AND `--force` was not passed, returns `"fresh"` and no-ops (the JSON cache is current)
5. Otherwise runs `incremental_graph.js` to regenerate, writes the JSON, and returns `"regenerated"`

Treat the JSON as a cache — `ensure_graph.js code` is idempotent and safe to call on every step.

## Read-only query patterns

Always use `query_graph.js`, never raw JSON parsing inside a step:

- `summary` — high-level health check ("is the build complex? any orphans?")
- `deps path/to/file.ts` — reachable imports/exports from a single entry (forward direction)
- `blast path/to/file.ts` — inverse: who must be touched when this file changes (reverse direction)

For multi-file queries, run `blast` per file and union the results — the script does not chain transitively (one-hop only). Deeper traversal is the architect's concern, not the graph's.

## Workflow

1. Run `ensure_graph.js code` via `@executor`
2. If status is `"fresh"` — graph is current, skip regeneration
3. If status is `"regenerated"` — report file count so user sees cost
4. Use `query_graph.js` commands to answer dependency questions — do NOT read the raw JSON

## Key Principles

- Never call `shallow_graph.js` or `incremental_graph.js` directly — always go through `ensure_graph.js`
- Build folders, `node_modules/`, and dotfolders are always ignored
- If no `src/` exists, the graph is empty — proceed without it
- Configure default source dirs in `.agents/config.yaml` under `graph.code.src` (CLI `--src` overrides)