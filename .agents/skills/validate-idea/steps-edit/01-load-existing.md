---
step: 1
name: Load Existing
mode: edit
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
---

# Step 1 — Load Existing Brief

Load the current brief and establish the edit baseline.

## Goal
Read the existing brief, understand its current state, and confirm what the user wants to change.

## Process
1. Read `artifacts/output/00-discovery/validation-brief.md` (or `idea-brief.md` if validation-brief doesn't exist).
2. If > 1000 words, invoke `@reader` to summarize.
3. Ask the user: **"What specifically do you want to refine? The problem statement, the user, the solution, or the verdict?"**

## Prerequisites check
Confirm the brief sections are intact:
- Problem statement
- Proposed solution
- Target user
- Value proposition
- Verdict (GO/PIVOT/KILL)

If any core section is missing, flag it immediately — the brief may be corrupted or incomplete. In that case, recommend re-running in create mode.

## Output
Loaded brief with user's edit targets identified.

## Delegation
- Reads: @reader (existing brief, specs)
- Writes: @writer (revised sections)
- Direct: founder reasoning is direct
