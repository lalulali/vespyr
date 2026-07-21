# 5. Structural Graphs

> [← Back to Guide](index.md) | [Previous: Skills & Workflows](skills-and-workflows.md) | [Next: Reference →](reference.md)

Vespyr includes two structural graph systems: **code-graph** (dependency mapping) and **doc-graph** (document traceability).

## Code-Graph

Maps imports, exports, and dependents across your entire codebase.

### What It Tracks

- **Imports** — what each file depends on
- **Exports** — what each file exposes
- **Imported By** — what files depend on this one (blast radius)

### Commands

```bash
# Refresh the graph (self-healing — no-op if fresh)
node .agents/scripts/ensure_graph.js code [--src src/] [--force]

# Query (use these instead of reading raw JSON)
node .agents/scripts/query_graph.js summary          # Overview of both graphs
node .agents/scripts/query_graph.js deps <file>      # What does this file import?
node .agents/scripts/query_graph.js blast <file>     # What depends on this file?
```

### Usage Example

```bash
node .agents/scripts/query_graph.js blast src/lib/auth.ts
# Output:
# src/lib/auth.ts blast radius
# imported by (4):
#   <- src/routes/api.ts
#   <- src/middleware/auth.ts
#   <- src/services/login.ts
#   <- src/components/Profile.tsx
```

### Configuration

```yaml
# .agents/config.yaml
graph:
  code:
    src: src/,app/,lib/   # Scan multiple directories
```

## Doc-Graph

Maps relationships between documents — PRDs, user stories, ADRs, memory files — and their code references.

### What It Tracks

- **Markdown links** — `[text](path)` references between documents
- **Shared IDs** — Documents referencing the same `US-XXX` or `REQ-XXX` get edges
- **Code references** — Documents mentioning `src/...` paths link to code

### Commands

```bash
# Refresh the graph
node .agents/scripts/ensure_graph.js doc [--force]

# Query
node .agents/scripts/query_graph.js summary          # Overview of both graphs
node .agents/scripts/query_graph.js trace <doc>      # Document relationships and edges
node .agents/scripts/query_graph.js search <query>   # Find documents by title/section
```

### Usage Example

```bash
node .agents/scripts/query_graph.js trace user-stories.md
# Output:
# artifacts/output/02-strategy/user-stories.md (document): User Stories
# outgoing (2):
#   specifies -> artifacts/output/02-strategy/product-spec.md (via US-001)
#   traces_to -> artifacts/output/03-architecture/architecture.md (via US-001)
# incoming (2):
#   traces_to <- artifacts/output/02-strategy/product-spec.md (via US-001)
```

### Configuration

```yaml
# .agents/config.yaml
graph:
  doc:
    docs:                          # Where to scan for .md files
      - artifacts/input/
      - artifacts/memory/
      - artifacts/output/
    ids:                           # ID patterns to extract
      - US-\d+
      - REQ-\d+
```

### For Pre-Existing Projects

Configure doc-graph to scan your project's documentation:

```yaml
graph:
  doc:
    docs:
      - docs/
      - README.md
      - wiki/
    ids:
      - JIRA-\d+
      - '#\d+'           # GitHub issues
      - EPIC-\w+-\d+
```

### Edge Types

| Edge | Meaning |
|------|---------|
| `traces_to` | Document A references an ID found in Document B |
| `specifies` | User story specifies a product spec section |
| `defines` | Requirements document defines user stories |
| `references` | Standard markdown link from one doc to another |
| `maps_to` | Document references a code file |
| `implements` | User story maps to implementation code |
| `constrains` | ADR constrains a code module |
| `aligns_with` | ADR aligns with a requirement |
| `derived_from` | Generated document derived from user input |

## Query Commands Reference

```bash
node .agents/scripts/query_graph.js --help

# Available commands:
summary              # Compact overview of both graphs
deps <file>          # What does this file import/export?
blast <file>         # What depends on this file? (blast radius)
trace <doc>          # Document relationships and edges
search <query>       # Find documents by title, section, or path

# Optional flags:
--root <path>        # Target a different project
```

## How Agents Use Graphs

Agents are instructed to use the query commands instead of reading raw JSON:

- `@architect` — `blast <file>` before structural changes
- `@tech-lead` — `summary` + `deps <file>` for task ordering
- `@developer` — `blast <file>` before modifying code
- `@code-reviewer` — `blast <file>` for each changed file
- `@product-manager` — `trace requirements.md` for FR→US coverage
- `@product-designer` — `trace product-spec.md` + `trace user-stories.md`
- `@qa-engineer` — `trace user-stories.md` before testing

## Troubleshooting

**Graph is empty?**
- Code-graph: verify `graph.code.src` points to existing source directories
- Doc-graph: verify `graph.doc.docs` points to directories with `.md` files
- Both: run with `--force` to force a full rebuild
- Run from the project root or use `--root <path>`

**Doc-graph has 0 edges?**
- Check that documents contain IDs matching your `graph.doc.ids` patterns
- Verify documents reference each other via markdown links or shared IDs
- The `summary` command will warn: `WARNING: 0 edges — traceability chain is broken`
