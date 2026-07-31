---
step: class
name: Online Class & Course Module Package Generator
prerequisites:
  - Phase 3 Master Knowledge Map created at artifacts/output/teaching/knowledge-map.md
delegation:
  reads: "@reader (artifacts/output/teaching/knowledge-map.md)"
  writes: "@writer (artifacts/output/teaching/class/ directory files)"
  runs: none
output_contract:
  citations: required
---

# Step Class — Modular Online Class & Course Package Generator

## Goal

Construct a complete, multi-file online class package containing lesson modules, hands-on exercises, and graded quizzes saved to `artifacts/output/teaching/class/`.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step class`

### 1. Read Knowledge Map

Delegate reading `artifacts/output/teaching/knowledge-map.md` to **`@reader` (Page)**. Extract module boundaries, Bloom-tagged objectives, and exercises.

### 2. Formulate Modular Course Files

`@shifu` structures the online class directory into self-contained module units:

1. **Course Index & Guide**: `artifacts/output/teaching/class/README.md`
   - Course title, description, module roadmap, prerequisite checklist, navigation links.

2. **Module Content Files**: `artifacts/output/teaching/class/module-{NN}-{slug}.md`
   - **Lesson Material**: Self-paced reading content adapted to target style (`Beginner`, `Intermediate`, or `Expert`).
   - **Visual Diagrams & Code**: Embedded Mermaid flowcharts, diagrams, and runnable code blocks.
   - **Hands-On Exercise**: Step-by-step practical assignment (lab/problem set).
   - **Exercise Solution**: Collapse/expand solution guide with explanation.

3. **Assessment & Quiz Files**: `artifacts/output/teaching/class/assessments/quiz-{NN}.md`
   - **Formative Quiz**: 5 multiple-choice or short-answer questions per module.
   - **Answer Key & Explanations**: Detailed reasoning for why correct options are right and distractors are wrong.
   - **Final Capstone Assessment**: Comprehensive final project specification covering all modules.

### 3. Deliver Output Directory Files

Delegate writing all module and assessment files to **`@writer` (Quill)** across the target directory:
- `artifacts/output/teaching/class/README.md`
- `artifacts/output/teaching/class/module-01-{slug}.md`
- `artifacts/output/teaching/class/module-02-{slug}.md`
- `artifacts/output/teaching/class/assessments/quiz-01.md`
- `artifacts/output/teaching/class/assessments/final-exam.md`

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step class`

## Delegation Summary
- **Reads:** `@reader` (Page) for reading `knowledge-map.md`.
- **Writes:** `@writer` (Quill) for writing modular files in `artifacts/output/teaching/class/`.
- **Runs:** none.
