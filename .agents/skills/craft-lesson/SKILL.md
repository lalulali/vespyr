---
name: craft-lesson
description: "Create multi-format educational materials (syllabus, handbook, cheatsheet, presentation, class, video script) from topic or draft"
metadata:
  capabilities: "curriculum-design, content-synthesis, assessment-creation, pedagogical-structuring"
  version: "1.0"
  last_updated: "2026-07-24"
  author: "@shifu"
  mode: "skill"
---

# Craft-Lesson — Multi-Format Educational Material Generator

## What this skill does

Takes any topic, lecture draft, raw notes, video transcript, or domain documentation and transforms it into a unified suite of up to 6 distinct educational formats derived from a single master **Knowledge Map**. Governed by **`@shifu` (Kong Qiu)** using Feynman principles, Oakley cognitive load controls, and Bloom's taxonomy objectives.

## Persona delegation

This skill delegates pedagogical strategy, objective framing, content sequencing, and quality review to **`@shifu` (Kong Qiu)**. All file I/O operations are performed directly; memory operations delegate to `@memory-controller`, and external research to `@researcher`.

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
   - `@shifu` reads and extracts key concepts, identifies knowledge gaps, and organizes unstructured ideas into pedagogical form.

---

## Supported Output Formats

| Format Identifier | Target Deliverable Path | Description |
|---|---|---|
| `syllabus` | `artifacts/output/teaching/syllabus.md` | Course syllabus: learning objectives, module roadmap, timing, assessment plan. |
| `handbook` | `artifacts/output/teaching/handbook.md` | Comprehensive, detailed textbook/handbook (full narrative depth; not a cheatsheet). |
| `cheatsheet` | `artifacts/output/teaching/cheatsheet.md` | Scannable quick reference, decision trees, cheat tables, key formulas. |
| `presentation` | `artifacts/output/teaching/presentation.md` | Slide outline (1 key idea per slide) with detailed speaker notes & visual cues. Supports 7 presentation styles (including EdTech Masterclass), 2-step audience profiling, and 6 opening hook archetypes. |
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
┌────────────────────────┐ ┌──────────────────────────────┐
│ Phase 2a: Research     │ │ Phase 2b: Synthesize         │
│ (Topic-Only Path via   │ │ (Draft/Transcript Path       │
│  step-02a-research.md) │ │  via step-02b-synthesize.md) │
└────────────┬───────────┘ └────────────┬─────────────────┘
             │                           │
             └─────────────┬─────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3: Master Knowledge Map Creation                  │
│ Bloom's taxonomy tagging, sequencing, "If Nothing Else" │
│ Output: artifacts/output/teaching/knowledge-map.md      │
│ (via step-03-structure.md)                              │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 4: ONE format at a time + HUMAN VERIFY loop       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ GENERATE → PRESENT → PAUSE → VERIFY              │   │
│  │   ├── approved → RECORD (orchestrator complete)  │   │
│  │   │            → next format (loop)              │   │
│  │   └── changes  → revise, re-present, PAUSE again │   │
│  └──────────────────────────────────────────────────┘   │
│ Each approval triggers project-context + session sync.  │
│ Loop until ALL selected formats are individually        │
│ approved. Do NOT batch-produce formats.                 │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌───────────────────────────────────────────────────────────┐
│ Phase 5: Self-Review & Quality Certification              │
│ Style audit, jargon check, pedagogical verification       │
│ (via step-05-review.md) — runs AFTER all formats approved │
└───────────────────────────────────────────────────────────┘
```

---

## Phase Details & Step File Routing

### Phase 1: Intake & Format Selection Intake

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step 1`

1. **Input Mode Detection**:
   - Determine whether the input is a **Topic-only string** or a **Draft/Transcript file/text**.
2. **Universal Upfront Audience & Style Calibration**:
   - Establish the target audience profile upfront before doing ANY research or mapping.
   - **Step 1: Audience Scope**: Internal (Company/Team roles & topic level) vs. External (Public/Course target group & background).
   - **Step 2: Format-Specific Audience Mapping**: Determine if specific deliverable targets require audience differentiation (e.g., `handbook` for developers, `presentation` for executives, `cheatsheet` for architects).
   - Load `artifacts/memory/teaching-style.md` via `@memory-controller`.
   - If `teaching-style.md` does NOT exist, run Guided Onboarding:
     - Prompt user for target audience profile & depth style (`Beginner`, `Intermediate`, or `Expert`).
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

4. **Per-Format Mandatory Intake Gates (NON-NEGOTIABLE)**:
   > [!IMPORTANT]
   > Selecting a format — including via `--all` — does **NOT** waive its mandatory intake questions. `--all` only selects the formats; it never answers their audience/style/budget questions for you.
   > If `presentation` is among the selected formats, `@shifu` **MUST ask the user the 4 Presentation Intake Questions** in this Phase 1, BEFORE any research, synthesis, or knowledge-map work:
   > 1. **Audience Scope & Profile**: Internal (Company/Team roles & topic level) or External (Public/Course target group & background)?
   > 2. **Presentation Style Archetype**: 🎓 *EdTech Masterclass*, 🎯 *Executive Briefing*, 🌟 *Keynote Narrative*, 🛠️ *Technical Deep-Dive*, 📚 *Educational Workshop*, 💼 *Product Pitch*, or ⚡ *Lightning Blitz*?
   > 3. **Opening Hook Archetype**: ❓ *Socratic Question*, 💥 *Pain Point*, 📊 *Provocative Fact*, 📖 *Micro-Story*, 🎯 *Direct BLUF*, or ⚡ *Before vs. After Contrast*?
   > 4. **Time & Slide Budget**: Target duration & slide count (e.g. 10 mins / 8 slides, 30 mins / 15 slides, 60 mins / 25 slides)? Calibrate to ~1.5–2 minutes per slide.
   > Do NOT proceed to Phase 2 until all 4 are answered (unless the user explicitly supplied all 4 in their original prompt).

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step 1`

---

### Phase 2: Knowledge Extraction (Route by Mode)

- If **Mode 1 (Topic-Only)**:
  Execute `step-02a-research.md` (`.agents/skills/craft-lesson/steps/step-02a-research.md`).
  Delegates domain research to `@researcher` (Iris), extracts core principles, and establishes concept boundaries.
- If **Mode 2 (Draft/Transcript)**:
  Execute `step-02b-synthesize.md` (`.agents/skills/craft-lesson/steps/step-02b-synthesize.md`).
  Reads the file, parses raw text, identifies missing prerequisites, and structures raw insights.

---

### Phase 3: Master Knowledge Map Creation

Execute `step-03-structure.md` (`.agents/skills/craft-lesson/steps/step-03-structure.md`).
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

### Phase 4: Format Generation — ONE AT A TIME with Human Verification (NON-NEGOTIABLE)

> [!IMPORTANT]
> **Generate one document, then stop and wait for human verification. Do NOT batch-produce all formats in a single turn.**
> `@shifu` MUST process the selected formats sequentially: produce exactly ONE deliverable, present it for review, pause, and only continue to the next format after the user verifies/approves. This applies even when the user selected multiple formats or said `--all`.

**The loop (repeat for each selected format, in this exact order):**

```
1. GENERATE  → produce ONE deliverable (the next unstarted format in the list)
2. PRESENT   → show the user a summary of what was generated + where it is saved
3. VERIFY    → PAUSE. Ask the user to review it and approve, or request changes
   ├── APPROVED  → RECORD milestone (step 3b), mark format complete, next format (step 1)
   └── CHANGES   → incorporate the requested changes, re-present, PAUSE again
4. Only after the LAST selected format is approved → proceed to Phase 5
```

**3b. RECORD MILESTONE (after EVERY approval — NON-NEGOTIABLE):**
After the user approves a deliverable, record it in the pipeline state AND refresh project-context/session activity via the orchestrator. Run:

```
node .agents/scripts/orchestrator_state.js complete --agent shifu --artifact artifacts/output/teaching/{deliverable}.md --next "{next deliverable, or 'all done'}"
```

This is what updates `project-context.md` (`## Session Activity`, Phase/Blockers/Repository/Stack/Runtime state) and records the artifact as completed. Do NOT defer all recording to the end of the workflow — each approved deliverable is a milestone boundary and MUST be recorded immediately. If the user stops after a single format, the context still reflects that milestone.

**Format generation order** (generate in list order, skipping any the user did not select):

1. **Syllabus Step**: `step-04a-syllabus.md` $\rightarrow$ `artifacts/output/teaching/syllabus.md`
2. **Handbook Step**: `step-04b-handbook.md` $\rightarrow$ `artifacts/output/teaching/handbook.md`
3. **Cheatsheet Step**: `step-04c-cheatsheet.md` $\rightarrow$ `artifacts/output/teaching/cheatsheet.md`
4. **Presentation Step**: `step-04d-presentation.md` $\rightarrow$ `artifacts/output/teaching/presentation.md`
5. **Online Class Step**: `step-04e-class.md` $\rightarrow$ `artifacts/output/teaching/class/`
6. **Video Script Step**: `step-04f-video-script.md` $\rightarrow$ `artifacts/output/teaching/video-script.md`

All output files MUST be written.

**Verification prompt format (use at every gate):**

> ✅ **`{Format}` generated** → `{relative file path}`
>
> **What's in it:** {1–2 sentence summary}
>
> Please review it. Reply **"approved"** to continue to the next format, or tell me what to change and I'll revise it before continuing.

**Rules:**
- Do NOT generate the next format until the current one is explicitly approved.
- Do NOT present multiple formats for review at once — one at a time, always.
- Record each approved deliverable immediately (step 3b) — never batch the `complete` calls.
- The Knowledge Map is the shared source for all formats; it is created once in Phase 3, not re-generated per format.

---

### Phase 5: Self-Review & Quality Certification

**Run ONLY after every selected format has been individually approved in Phase 4.**

Execute `step-05-review.md` (`.agents/skills/craft-lesson/steps/step-05-review.md`).
`@shifu` performs an audit across 3 check vectors:
1. **Style Fidelity Audit**: Verifies text matches target style (`Beginner`, `Intermediate`, or `Expert`).
2. **Jargon & Clarity Audit**: Ensures all introduced technical terms are defined upon first use.
3. **Pedagogical Alignment Gate**: Confirms all format deliverables match objectives in `knowledge-map.md`.

*User Approval Gate*: Present final summary, list generated artifacts with file links, and seek user confirmation.

---

## Delegation Matrix

| Workflow Phase | Responsible Agent | Operational I/O | Key Deliverables |
|---|---|---|---|
| **Phase 1: Intake** | `@shifu` | `@memory-controller` | Preference state loaded |
| **Phase 2a: Research** | `@shifu` | `@researcher` (Iris) | Raw domain research |
| **Phase 2b: Synthesize** | `@shifu` | Direct I/O | Parsed draft synthesis |
| **Phase 3: Knowledge Map**| `@shifu` | Direct I/O | `artifacts/output/teaching/knowledge-map.md` |
| **Phase 4: Formats** | `@shifu` | Direct I/O | ONE format deliverable per loop iteration in `artifacts/output/teaching/`, each human-verified + recorded via `orchestrator_state.js complete` before the next |
| **Phase 5: Review** | `@shifu` | Direct I/O / User | Quality review & delivery log (after all formats approved) |

---

## Anti-Patterns to Avoid

- **Do NOT batch-produce all selected formats in one turn.** Generate one format, pause for human verification, and only continue after explicit approval. One at a time, always.
- **Do NOT bypass Phase 3 Knowledge Map.** Formats MUST be generated from a single unified map, not ad-hoc per format.
- **Do NOT mix explanation styles.** Maintain consistent style (Beginner vs Intermediate vs Expert) across all selected formats in a single run.
- **Do NOT perform direct file writes from `@shifu`.** Always write files directly.
