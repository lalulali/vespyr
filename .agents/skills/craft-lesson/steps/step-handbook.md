---
step: handbook
name: Handbook & Textbook Generator
prerequisites:
  - Phase 3 Master Knowledge Map created at artifacts/output/teaching/knowledge-map.md
delegation:
  reads: "@reader (artifacts/output/teaching/knowledge-map.md)"
  writes: "@writer (artifacts/output/teaching/handbook.md)"
  runs: none
output_contract:
  citations: required
---

# Step Handbook — Comprehensive Student & Reference Handbook Generator

## Goal

Generate the signature educational deliverable: a comprehensive, self-contained student handbook saved to `artifacts/output/teaching/handbook.md`. Includes full conceptual explanations, visual Mermaid diagrams, code examples, inline citations, and mandatory "If Nothing Else, Remember This" takeaway callouts.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step handbook`

### 1. Read Knowledge Map & Style Context

Delegate reading `artifacts/output/teaching/knowledge-map.md` to **`@reader` (Page)**. Load target explanation style (`Beginner`, `Intermediate`, or `Expert`).

### 2. Formulate Handbook Chapters

For each module defined in the Knowledge Map, `@shifu` crafts a complete handbook chapter:
- **Chapter Header**: Clear title, module objective, and prerequisite check.
- **First-Principles Conceptual Explanation**: Grounded, narrative explanation matching the active style tier:
  - *Beginner*: Story-driven analogies, zero unparsed jargon.
  - *Intermediate*: Technical mechanics, defined inline terms, system interactions.
  - *Expert*: Precise terminology, edge cases, formal specifications, performance characteristics.
- **Visual Scaffolding & Code Examples**: Embed Mermaid diagrams (flowcharts, sequence diagrams) and annotated code/math blocks.
- **Mandatory "If Nothing Else, Remember This" Callout**: Every chapter section MUST end with an explicit callout block:
  ```markdown
  > [!IMPORTANT]
  > **If Nothing Else, Remember This:**
  > {Core takeaway anchor sentence extracted from Master Knowledge Map}
  ```
- **Active Recall & Practice Exercises**: End each chapter with 2–3 Socratic review questions or exercises to reinforce learning.
- **Footnotes & References**: Include inline citations `[N]` referencing authoritative documentation or literature.

### 3. Deliver Output File

Delegate writing the full handbook to **`@writer` (Quill)**:
- **Target File Path**: `artifacts/output/teaching/handbook.md`

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step handbook`

## Delegation Summary
- **Reads:** `@reader` (Page) for reading `knowledge-map.md`.
- **Writes:** `@writer` (Quill) for writing `artifacts/output/teaching/handbook.md`.
- **Runs:** none.
