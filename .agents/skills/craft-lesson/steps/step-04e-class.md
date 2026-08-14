---
step: 4e
name: Online Class & Course Module Package Generator
prerequisites:
  - Phase 3 Master Knowledge Map created at artifacts/output/teaching/knowledge-map.md
output_contract:
  citations: required
---

# Step Class — Modular Online Class & Course Package Generator

## Goal

Construct a complete, multi-file online class package containing lesson modules, hands-on exercises, and graded quizzes saved to `artifacts/output/teaching/class/`.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step class`

### 1. Read Knowledge Map

Read `artifacts/output/teaching/knowledge-map.md`. Extract module boundaries, Bloom-tagged objectives, and exercises.

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

Write all module and assessment files across the target directory:
- `artifacts/output/teaching/class/README.md`
- `artifacts/output/teaching/class/module-01-{slug}.md`
- `artifacts/output/teaching/class/module-02-{slug}.md`
- `artifacts/output/teaching/class/assessments/quiz-01.md`
- `artifacts/output/teaching/class/assessments/final-exam.md`

### 4. Record Milestone (NON-NEGOTIABLE)

After the user approves this deliverable, record it immediately:

```bash
node .agents/scripts/orchestrator_state.js complete --agent shifu --artifact artifacts/output/teaching/class/ --next "video-script"
```

This refreshes `project-context.md` (Session Activity, Phase/Blockers/Repository/Stack) and records the milestone. Do NOT defer recording to the end of the workflow — if the user stops after this format, context must already reflect it.

## Memory closeout
- `@memory-controller session-write` — record class completion milestone.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step class`


