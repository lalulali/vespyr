---
step: 4b
name: Stress-Test
mode: edit
prerequisites:
  - step-03 completed
output_contract:
  citations: not-required
---

# Step 4 — Stress-Test Revised Sections

Re-stress-test the revised sections to confirm they hold up.

## Goal
Apply the premise challenge and framework test to the revised content. The revision may have fixed one weakness but exposed another.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-edit --step 4`
1. **Re-run premises** on the revised sections:
   - "Based on the revisions, here are the premises that must hold. Do you still agree?"
   - If new information was added, surface new premises.

2. **Apply one framework** most relevant to the revised areas:
   - If problem/user was revised → Golden Circle (WHY changed?)
   - If solution was revised → Pre-mortem (new failure modes?)
   - If verdict was revised → First Principles (core mechanism still sound?)

3. **Check for contradictions** against unchanged sections. If the revised problem statement conflicts with the unchanged value proposition, flag it.

## Halt condition
If revisions introduce a contradiction that can't be resolved in 2 rounds, escalate: the brief may need a full re-run in create mode.

## Output
Re-validated brief with stress-test results.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-edit --step 4`
