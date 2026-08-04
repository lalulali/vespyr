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

### 2. Mandatory Interactive Intake Prompt

> [!IMPORTANT]
> **Mandatory User Question Gate**: `@shifu` **MUST NOT** silently choose or assume presentation options. These 4 questions are asked in **Phase 1** of `/craft-lesson` (before any research). If you are running `step-presentation.md` standalone and the 4 parameters were NOT collected in Phase 1, `@shifu` **MUST ask the user** the 4 Presentation Intake Questions before proceeding to step 3 (unless the user explicitly provided all 4 parameters in their initial prompt):

1. **Audience Scope & Profile**: Is this Internal (Company/Team roles & topic level) or External (Public/Course target group & background)?
2. **Presentation Style Archetype**: 🎓 *EdTech Masterclass*, 🎯 *Executive Briefing*, 🌟 *Keynote Narrative*, 🛠️ *Technical Deep-Dive*, 📚 *Educational Workshop*, 💼 *Product Pitch*, or ⚡ *Lightning Blitz*?
3. **Opening Hook Archetype**: ❓ *Socratic Question*, 💥 *Pain Point*, 📊 *Provocative Fact*, 📖 *Micro-Story*, 🎯 *Direct BLUF*, or ⚡ *Before vs. After Contrast*?
4. **Time & Slide Budget**: Target duration & slide count (e.g. 10 mins / 8 slides, 30 mins / 15 slides, 60 mins / 25 slides)? Calibrate to ~1.5–2 minutes per slide.

### 3. Formulate Presentation Slides

`@shifu` structures the presentation following the **One Idea Per Slide** cognitive load rule:
- **Title Slide**: Topic name, subtitle, selected audience profile, presentation style archetype, and opening hook.
- **Hook & Opening Slides**: Execute the selected Opening Hook Archetype to grab immediate attention.
- **Agenda & Objectives**: High-level overview of key learning milestones or decision gates.
- **Content Slides (per sub-concept)**:
  - **Slide Header**: Clear slide title reflecting 1 specific objective.
  - **Visual Cue**: Description of chart, progressive diagram layer, code snippet, or graphic to display.
  - **Slide Bullets**: $\le 3$ concise bullet points (max 10 words per bullet).
  - **Speaker Notes**: Full verbatim script and talking points for the presenter.
  - **Pacing**: Estimated slide duration (e.g. 1.5–2 minutes).
- **Summary & Intuition Check Slide**: Key takeaways recap ("If Nothing Else"), reflection prompt, and Q&A discussion points.

### 4. Deliver Output File

Delegate writing the presentation file to **`@writer` (Quill)**:
- **Target File Path**: `artifacts/output/teaching/presentation.md`

### 5. Record Milestone (NON-NEGOTIABLE)

After the user approves this deliverable, record it immediately via `@executor` (or directly if your harness has no subagents):

```bash
node .agents/scripts/orchestrator_state.js complete --agent shifu --artifact artifacts/output/teaching/presentation.md --next "class"
```

This refreshes `project-context.md` (Session Activity, Phase/Blockers/Repository/Stack) and records the milestone. Do NOT defer recording to the end of the workflow — if the user stops after this format, context must already reflect it.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step presentation`

## Delegation Summary
- **Reads:** `@reader` (Page) for reading `knowledge-map.md`.
- **Writes:** `@writer` (Quill) for writing `artifacts/output/teaching/presentation.md`.
- **Runs:** none.
