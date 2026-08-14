---
step: 4a
name: Syllabus Format Step
prerequisites:
  - Phase 3 Master Knowledge Map created at artifacts/output/teaching/knowledge-map.md
output_contract:
  citations: not-required
---

# Step Syllabus — Course Syllabus Generator

## Goal

Transform the Master Knowledge Map into a professional, structured course syllabus saved to `artifacts/output/teaching/syllabus.md`.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step syllabus`

### 1. Read Knowledge Map

Read `artifacts/output/teaching/knowledge-map.md` to extract all modules, Bloom's objectives, prerequisites, and takeaway anchors.

### 2. Formulate Syllabus Structure

`@shifu` structures the syllabus into 5 core sections:
- **1. Course Overview & Description**: High-level motivation, core target audience, explanation style mode (`Beginner`, `Intermediate`, or `Expert`).
- **2. Prerequisites & Learning Expectations**: Mandatory background knowledge and tools needed before starting.
- **3. Module Roadmap & Estimated Pacing**: Breakdown of modules with estimated completion time (e.g. 30 mins per module or 1 week per module).
- **4. Detailed Module Objectives**: Bloom's tagged objectives for every module:
  - Objective 1: `[REMEMBER]` ...
  - Objective 2: `[UNDERSTAND]` ...
  - Objective 3: `[APPLY]` ...
- **5. Assessment & Evaluation Strategy**: How student progress will be verified (formative quizzes, hands-on lab projects, capstone exercise).

### 3. Deliver Output File

Write the file:
- **Target File Path**: `artifacts/output/teaching/syllabus.md`

### 4. Record Milestone (NON-NEGOTIABLE)

After the user approves this deliverable, record it immediately:

```bash
node .agents/scripts/orchestrator_state.js complete --agent shifu --artifact artifacts/output/teaching/syllabus.md --next "handbook"
```

This refreshes `project-context.md` (Session Activity, Phase/Blockers/Repository/Stack) and records the milestone. Do NOT defer recording to the end of the workflow — if the user stops after this format, context must already reflect it.

## Memory closeout
- `@memory-controller session-write` — record syllabus completion milestone.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step syllabus`


