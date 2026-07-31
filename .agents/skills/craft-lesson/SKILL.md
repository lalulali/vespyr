---
name: craft-lesson
description: "Create multi-format educational materials (syllabus, handbook, cheatsheet, presentation, class, video script) from topic or draft"
capabilities:
  - curriculum-design
  - content-synthesis
  - assessment-creation
  - pedagogical-structuring
version: "1.0"
last_updated: "2026-07-24"
author: "@shifu"
mode: skill
---

# Craft-Lesson — Multi-Format Educational Material Generator

## What this skill does

Takes any topic, lecture draft, raw notes, video transcript, or domain documentation and transforms it into a unified suite of up to 6 distinct educational formats derived from a single master **Knowledge Map**. Governed by **`@shifu` (Kong Qiu)** using Feynman principles, Oakley cognitive load controls, and Bloom's taxonomy objectives.

## Persona delegation

This skill delegates pedagogical strategy, objective framing, content sequencing, and quality review to **`@shifu` (Kong Qiu)**. All file I/O operations delegate to `@writer` and `@reader`, memory operations to `@memory-controller`, and external research to `@researcher`.

## When to use

- "Create a course syllabus and student handbook for Rust Async Programming"
- "Turn this product architecture transcript into a cheatsheet and presentation deck"
- "Build an online class module with quizzes on Financial Literacy"
- "Draft a 10-minute video script explaining Vector Databases for Beginners"
- Trigger command: `/craft-lesson`

## Prerequisites

- Input topic name OR existing text draft/transcript file.
- `@shifu` persona configuration (`.agents/agents/shifu.md`).
- Output directory `artifacts/output/teaching/` accessible for file delivery.

---

## 2 Input Modes

1. **Mode 1: Topic-Only (Research Path)**
   - User provides a topic (e.g. `/craft-lesson "Distributed Consensus"`).
   - `@shifu` delegates comprehensive research to `@researcher` (Iris) to gather foundational concepts, paradigms, edge cases, and industry standards before structuring.

2. **Mode 2: Draft / Transcript / Notes (Synthesis Path)**
   - User provides raw content (e.g. `/craft-lesson --file=drafts/lecture-notes.txt` or pastes raw transcript).
   - `@shifu` delegates reading to `@reader` (Page), extracts key concepts, identifies knowledge gaps, and organizes unstructured ideas into pedagogical form.

---

## Supported Output Formats

| Format Identifier | Target Deliverable Path | Description |
|---|---|---|
| `syllabus` | `artifacts/output/teaching/syllabus.md` | Course syllabus: learning objectives, module roadmap, timing, assessment plan. |
| `handbook` | `artifacts/output/teaching/handbook.md` | Comprehensive textbook/handbook with "If Nothing Else, Remember This" callouts. |
| `cheatsheet` | `artifacts/output/teaching/cheatsheet.md` | Scannable quick reference, decision trees, cheat tables, key formulas. |
| `presentation` | `artifacts/output/teaching/presentation.md` | Slide outline (1 key idea per slide) with detailed speaker notes & visual cues. |
| `class` | `artifacts/output/teaching/class/` | Online class package: module units, readings, hands-on exercises, quizzes. |
| `video-script` | `artifacts/output/teaching/video-script.md` | Production video script with transcript, timecodes, camera/visual cues. |

---

## 5-Phase Master Workflow

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Intake & Setup                                 │
│ Select input mode, audience level & format targets     │
└──────────────────────────┬──────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│ Phase 2a: Research      │ │ Phase 2b: Synthesize    │
│ (Topic-Only Path via    │ │ (Draft/Transcript Path  │
│  step-research.md)      │ │  via step-synthesize.md)│
└────────────┬────────────┘ └────────────┬────────────┘
             │                           │
             └─────────────┬─────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3: Master Knowledge Map Creation                   │
│ Bloom's taxonomy tagging, sequencing, "If Nothing Else" │
│ Output: artifacts/output/teaching/knowledge-map.md      │
│ (via step-structure.md)                                 │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 4: Format-Specific Generation                     │
│ Execute step-syllabus, step-handbook, step-cheatsheet,  │
│ step-presentation, step-class, step-video-script       │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 5: Self-Review & Quality Certification            │
│ Style audit, jargon check, pedagogical verification     │
│ (via step-review.md)                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Phase Details & Step File Routing

### Phase 1: Intake & Format Selection Intake

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step 1`

1. **Input Mode Detection**:
   - Determine whether the input is a **Topic-only string** or a **Draft/Transcript file/text**.
2. **Audience & Style Calibration**:
   - Load `artifacts/memory/teaching-style.md` via `@memory-controller`.
   - If `teaching-style.md` does NOT exist, run Guided Onboarding:
     - Prompt user for target audience style (`Beginner`, `Intermediate`, or `Expert`).
     - Prompt user for preferred section patterns and default format selections.
     - Delegate saving `teaching-style.md` to `@memory-controller`.
3. **Format Selection Intake**:
   - Ask user which format(s) to generate (or specify `--all`):
     - `1. Syllabus`
     - `2. Handbook`
     - `3. Cheatsheet`
     - `4. Presentation Outline`
     - `5. Online Class Modules`
     - `6. Video Script`
   - Default if unspecified: `syllabus` + `handbook` + `cheatsheet`.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step 1`

---

### Phase 2: Knowledge Extraction (Route by Mode)

- If **Mode 1 (Topic-Only)**:
  Execute `step-research.md` (`.agents/skills/craft-lesson/steps/step-research.md`).
  Delegates domain research to `@researcher` (Iris), extracts core principles, and establishes concept boundaries.
- If **Mode 2 (Draft/Transcript)**:
  Execute `step-synthesize.md` (`.agents/skills/craft-lesson/steps/step-synthesize.md`).
  Delegates file reading to `@reader` (Page), parses raw text, identifies missing prerequisites, and structures raw insights.

---

### Phase 3: Master Knowledge Map Creation

Execute `step-structure.md` (`.agents/skills/craft-lesson/steps/step-structure.md`).
`@shifu` synthesizes all extracted research/notes into `artifacts/output/teaching/knowledge-map.md`:
- Tag every objective with **Bloom's Taxonomy Level**:
  - `[REMEMBER]` — Recall facts & basic concepts
  - `[UNDERSTAND]` — Explain ideas or concepts
  - `[APPLY]` — Use information in new situations
  - `[ANALYZE]` — Draw connections among ideas
  - `[EVALUATE]` — Justify a stand or decision
  - `[CREATE]` — Produce new or original work
- Establish logical dependency sequencing (Prerequisites $\rightarrow$ Core $\rightarrow$ Advanced).
- Define "If Nothing Else, Remember This" takeaway anchors per section.

*User Approval Gate*: Present Knowledge Map summary to user for sign-off before format generation.

---

### Phase 4: Format Generation (Execute Selected Steps)

Execute only the step files corresponding to user-selected formats:

1. **Syllabus Step**: `step-syllabus.md` $\rightarrow$ `artifacts/output/teaching/syllabus.md`
2. **Handbook Step**: `step-handbook.md` $\rightarrow$ `artifacts/output/teaching/handbook.md`
3. **Cheatsheet Step**: `step-cheatsheet.md` $\rightarrow$ `artifacts/output/teaching/cheatsheet.md`
4. **Presentation Step**: `step-presentation.md` $\rightarrow$ `artifacts/output/teaching/presentation.md`
5. **Online Class Step**: `step-class.md` $\rightarrow$ `artifacts/output/teaching/class/`
6. **Video Script Step**: `step-video-script.md` $\rightarrow$ `artifacts/output/teaching/video-script.md`

All output files MUST be written using operational sub-agent `@writer` (Quill).

---

### Phase 5: Self-Review & Quality Certification

Execute `step-review.md` (`.agents/skills/craft-lesson/steps/step-review.md`).
`@shifu` performs an audit across 3 check vectors:
1. **Style Fidelity Audit**: Verifies text matches target style (`Beginner`, `Intermediate`, or `Expert`).
2. **Jargon & Clarity Audit**: Ensures all introduced technical terms are defined upon first use.
3. **Pedagogical Alignment Gate**: Confirms all format deliverables match objectives in `knowledge-map.md`.

*User Approval Gate*: Present final summary, list generated artifacts with file links, and seek user confirmation.

---

## Delegation Matrix

| Workflow Phase | Responsible Agent | Sub-Agent Operational Delegation | Key Deliverables |
|---|---|---|---|
| **Phase 1: Intake** | `@shifu` | `@memory-controller` | Preference state loaded |
| **Phase 2a: Research** | `@shifu` | `@researcher` (Iris) | Raw domain research |
| **Phase 2b: Synthesize** | `@shifu` | `@reader` (Page) | Parsed draft synthesis |
| **Phase 3: Knowledge Map**| `@shifu` | `@writer` (Quill) | `artifacts/output/teaching/knowledge-map.md` |
| **Phase 4: Formats** | `@shifu` | `@writer` (Quill) | Format markdown deliverables in `artifacts/output/teaching/` |
| **Phase 5: Review** | `@shifu` | `@writer` (Quill) / User | Quality review & delivery log |

---

## Anti-Patterns to Avoid

- **Do NOT bypass Phase 3 Knowledge Map.** Formats MUST be generated from a single unified map, not ad-hoc per format.
- **Do NOT mix explanation styles.** Maintain consistent style (Beginner vs Intermediate vs Expert) across all selected formats in a single run.
- **Do NOT perform direct file writes from `@shifu`.** Always delegate file output to `@writer`.
