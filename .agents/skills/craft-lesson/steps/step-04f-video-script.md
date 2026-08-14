---
step: 4f
name: Video Script & Media Teleprompter Generator
prerequisites:
  - Phase 3 Master Knowledge Map created at artifacts/output/teaching/knowledge-map.md
output_contract:
  citations: not-required
---

# Step Video-Script — Video Script & Teleprompter Generator

## Goal

Draft a production-ready video script complete with timecodes, spoken transcript, visual directions, and camera/B-roll cues saved to `artifacts/output/teaching/video-script.md`.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step video-script`

### 1. Read Knowledge Map

Read `artifacts/output/teaching/knowledge-map.md`. Convert module concepts into engaging narrative video segments.

### 2. Formulate Video Script Table & Structure

`@shifu` structures the script into a 3-column production format:

- **1. Video Metadata**: Title, target audience style, target video length (e.g. 8–10 minutes), required props/software.
- **2. The 15-Second Hook**: High-impact opening statement or problem question to grab viewer attention immediately.
- **3. Production Script Table**:
  | Timecode `[MM:SS]` | Audio Script (Spoken Words) | Visual / Camera / B-Roll Cue |
  |---|---|---|
  | `[00:00 - 00:15]` | "Have you ever wondered why..." | Talking head on camera, zoom in 1.1x |
  | `[00:15 - 01:30]` | "Let's start with first principles..." | Screen capture: animation of concept |
  | ... | ... | ... |
- **4. Summary & Call to Action (CTA)**: Concluding recap, prompt for feedback or next lesson.

### 3. Deliver Output File

Write the video script:
- **Target File Path**: `artifacts/output/teaching/video-script.md`

### 4. Record Milestone (NON-NEGOTIABLE)

After the user approves this deliverable, record it immediately:

```bash
node .agents/scripts/orchestrator_state.js complete --agent shifu --artifact artifacts/output/teaching/video-script.md --next "all done"
```

This refreshes `project-context.md` (Session Activity, Phase/Blockers/Repository/Stack) and records the milestone. Do NOT defer recording to the end of the workflow — if the user stops after this format, context must already reflect it.

## Memory closeout
- `@memory-controller session-write` — record video script completion milestone.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step video-script`


