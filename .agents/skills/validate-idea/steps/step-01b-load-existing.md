---
step: 1b
name: Load Existing
mode: edit
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1 — Load Existing Brief

Load the current brief and establish the edit baseline.

## Goal
Read the existing brief, understand its current state, and confirm what the user wants to change.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-edit --step 1`
1. Read `artifacts/output/01-discovery/validation-brief.md` (or `idea-brief.md` if validation-brief doesn't exist).
2. If > 2000 words, summarize.
3. Ask the user: **"What specifically do you want to refine? The problem statement, the user, the solution, or the verdict?"**

## Prerequisites check
Confirm the brief sections are intact:
- Problem statement
- Proposed solution
- Target user
- Value proposition
- Verdict (GO/RESHAPE/NO-GO)

If any core section is missing, flag it immediately — the brief may be corrupted or incomplete. In that case, recommend re-running in create mode.

## Output
Loaded brief with user's edit targets identified.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-edit --step 1`
