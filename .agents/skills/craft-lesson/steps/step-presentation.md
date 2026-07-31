---
step: presentation
name: Presentation Outline & Speaker Notes Generator
prerequisites:
  - Phase 3 Master Knowledge Map created at artifacts/output/teaching/knowledge-map.md
delegation:
  reads: "@reader (artifacts/output/teaching/knowledge-map.md)"
  writes: "@writer (artifacts/output/teaching/presentation.md)"
  runs: none
output_contract:
  citations: not-required
---

# Step Presentation — Slide Outline & Speaker Notes Generator

## Goal

Create a slide-by-slide presentation deck outline complete with visual cues and speaker script saved to `artifacts/output/teaching/presentation.md`.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step presentation`

### 1. Read Knowledge Map

Delegate reading `artifacts/output/teaching/knowledge-map.md` to **`@reader` (Page)**. Map modules and sub-concepts into discrete slide units.

### 2. Formulate Presentation Slides

`@shifu` structures the presentation following the **One Idea Per Slide** cognitive load rule:
- **Title Slide**: Topic name, subtitle, audience style, presenter persona.
- **Agenda & Objectives**: High-level overview of what attendees will learn.
- **Content Slides (per sub-concept)**:
  - **Slide Header**: Clear slide title reflecting 1 specific objective.
  - **Visual Cue**: Description of chart, diagram, code snippet, or graphic to display.
  - **Slide Bullets**: $\le 3$ concise bullet points (max 10 words per bullet).
  - **Speaker Notes**: Full verbatim script and talking points for the presenter.
  - **Pacing**: Estimated slide duration (e.g. 1.5–2 minutes).
- **Summary & Q&A Slide**: Key takeaways recap and discussion prompts.

### 3. Deliver Output File

Delegate writing the presentation file to **`@writer` (Quill)**:
- **Target File Path**: `artifacts/output/teaching/presentation.md`

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step presentation`

## Delegation Summary
- **Reads:** `@reader` (Page) for reading `knowledge-map.md`.
- **Writes:** `@writer` (Quill) for writing `artifacts/output/teaching/presentation.md`.
- **Runs:** none.
