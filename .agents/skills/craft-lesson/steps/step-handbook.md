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

> [!IMPORTANT]
> **Detailed Handbook Requirement (No Cheatsheet Summaries):**
> When generating `handbook.md`, `@shifu` MUST produce a detailed, exhaustive student textbook. Do NOT collapse chapters into short summaries, quick reference tables, bullet-point teasers, or cheatsheet-like matrices. Explanations must be fully fleshed out with complete conceptual narratives, background context, step-by-step breakdowns, code/math examples, visual diagrams, and active recall exercises.
>
> **Concrete Depth Bar (measurable, non-negotiable):**
> - **Minimum total length:** ≥ 3,000 words for a full handbook; ≥ 1,200 words per core chapter. A "handbook" under 1,000 words is a cheatsheet — rewrite it.
> - **Prose ratio:** ≥ 80% of every chapter must be continuous explanatory prose. Bullets, tables, and code blocks may supplement — never replace — the narrative.
> - **Every chapter** must contain ALL of: (a) a first-principles conceptual explanation in full sentences, (b) a worked example or code/math walkthrough, (c) a Mermaid diagram or visual scaffold, (d) 2–3 active-recall exercises, and (e) a mandatory "If Nothing Else, Remember This" callout.
> - **Before delivering, run the Handbook Depth Checklist** (below) and verify every box.

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

### 2b. Handbook Depth Checklist (MANDATORY — verify before delivering)

> [!IMPORTANT]
> Before writing `handbook.md`, confirm every box is checked. If any box fails, expand the content until it passes — do not deliver a condensed handbook.

- [ ] Total word count ≥ 3,000 (full handbook) or ≥ 1,200 per core chapter
- [ ] ≥ 80% of each chapter is continuous prose (not bullets/tables/code)
- [ ] Every chapter has a first-principles narrative explanation
- [ ] Every chapter has a worked example / code / math walkthrough
- [ ] Every chapter has at least one Mermaid diagram
- [ ] Every chapter has 2–3 active-recall exercises
- [ ] Every chapter ends with a "If Nothing Else, Remember This" callout
- [ ] Inline citations `[N]` present per chapter
- [ ] Chapters build on prerequisites in dependency order

If the user requested a true handbook and the output would fit on one screen — STOP and expand it. Do not ship a cheatsheet labeled "handbook."

### 3. Deliver Output File

Delegate writing the full handbook to **`@writer` (Quill)**:
- **Target File Path**: `artifacts/output/teaching/handbook.md`

### 4. Record Milestone (NON-NEGOTIABLE)

After the user approves this deliverable, record it immediately via `@executor` (or directly if your harness has no subagents):

```bash
node .agents/scripts/orchestrator_state.js complete --agent shifu --artifact artifacts/output/teaching/handbook.md --next "cheatsheet"
```

This refreshes `project-context.md` (Session Activity, Phase/Blockers/Repository/Stack) and records the milestone. Do NOT defer recording to the end of the workflow — if the user stops after this format, context must already reflect it.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step handbook`

## Delegation Summary
- **Reads:** `@reader` (Page) for reading `knowledge-map.md`.
- **Writes:** `@writer` (Quill) for writing `artifacts/output/teaching/handbook.md`.
- **Runs:** none.
