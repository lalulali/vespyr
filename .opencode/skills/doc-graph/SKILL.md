---
name: doc-graph
description: Document relationship and traceability graph mapper — parse and update connections between PRDs, user stories, ADRs, active decisions, and codebase references
---

## What this skill does

Manages the document relationship and traceability graph (`doc-graph.json`). It crawls your project planning and memory files to map out semantic connections between strategy documents, user stories, active decisions, blockers, and their implementations.

## When to use

Use this skill when:
- `"Update the document graph"` / `"Sync document relationships"` — Scan Markdown specifications and memory artifacts to synchronize relationship edges.
- `"Check document graph status"` — View the current size, node counts, and edge connections of the document graph.

---

## Workflow

### Step 1: Update Document Graph
Invoke `@executor` to run the document graph crawler to parse all `.md` files in `artifacts/memory/` and `artifacts/output/` and construct the node-edge relational map:
```bash
node .opencode/scripts/doc_graph.js --out artifacts/memory/structural/doc-graph.json
```

### Step 2: Report Status
Read the JSON output from `@executor` and report a concise summary:
```
### Document Graph Updated
- **Documents Scanned**: [documents scanned count]
- **Codebase File References**: [code references count]
- **Relational Edges Created**: [edges created count]
- **Output Path**: artifacts/memory/structural/doc-graph.json
```

---

## Key Principles
- **Agent Integration (Option 3)**: In addition to manual execution, this command is triggered explicitly by pipeline agents during critical phase changes:
  - `@product-manager` triggers it inside `design/SKILL.md` once strategy/user stories are finalized.
  - `@product-manager` triggers it inside `retro/SKILL.md` before memory compaction begins.
- **Traceability Bridge**: Establishes edges that cross-reference User Story IDs (`US-XXX`), Requirement IDs (`REQ-XXX`), and relative codebase paths (e.g. `src/services/auth.js`) to form a complete Federated Graph.
