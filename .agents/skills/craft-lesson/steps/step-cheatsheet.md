---
step: cheatsheet
name: Cheatsheet & Quick Reference Generator
prerequisites:
  - Phase 3 Master Knowledge Map created at artifacts/output/teaching/knowledge-map.md
delegation:
  reads: "@reader (artifacts/output/teaching/knowledge-map.md)"
  writes: "@writer (artifacts/output/teaching/cheatsheet.md)"
  runs: none
output_contract:
  citations: not-required
---

# Step Cheatsheet — Scannable Quick Reference & Decision Tree Generator

## Goal

Produce a compact, highly scannable quick reference cheatsheet saved to `artifacts/output/teaching/cheatsheet.md`. Designed for rapid lookup during active execution.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step cheatsheet`

### 1. Read Knowledge Map

Delegate reading `artifacts/output/teaching/knowledge-map.md` to **`@reader` (Page)**. Extract core syntax, formulas, decision rules, and key term mappings.

### 2. Formulate Cheatsheet Layout

`@shifu` structures the cheatsheet into 4 scannable sections:
- **1. Core Concept & Terminology Matrix**: Two-column lookup table (Term | 1-Sentence Definition / Syntax).
- **2. Decision Tree Flowchart**: Mermaid decision flowchart guiding choices (e.g., "When to use Pattern A vs Pattern B").
- **3. Essential Syntax & Code Snippets**: Minimal, copy-paste-ready code snippets or mathematical expressions.
- **4. Common Pitfalls & Anti-Patterns**: Two-column troubleshooting matrix (Mistake / Symptom | Solution / Fix).

*Note*: Cheatsheets prioritize density and speed of scanning. Do NOT include lengthy narrative paragraphs or "If Nothing Else, Remember This" callout blocks unless explicitly configured in `teaching-style.md`.

### 3. Deliver Output File

Delegate writing the cheatsheet to **`@writer` (Quill)**:
- **Target File Path**: `artifacts/output/teaching/cheatsheet.md`

### 4. Record Milestone (NON-NEGOTIABLE)

After the user approves this deliverable, record it immediately via `@executor` (or directly if your harness has no subagents):

```bash
node .agents/scripts/orchestrator_state.js complete --agent shifu --artifact artifacts/output/teaching/cheatsheet.md --next "presentation"
```

This refreshes `project-context.md` (Session Activity, Phase/Blockers/Repository/Stack) and records the milestone. Do NOT defer recording to the end of the workflow — if the user stops after this format, context must already reflect it.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step cheatsheet`

## Delegation Summary
- **Reads:** `@reader` (Page) for reading `knowledge-map.md`.
- **Writes:** `@writer` (Quill) for writing `artifacts/output/teaching/cheatsheet.md`.
- **Runs:** none.
