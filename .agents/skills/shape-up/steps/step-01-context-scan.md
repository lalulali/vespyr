---
step: 1
name: Context Scan
prerequisites: []
delegation:
  reads: "direct (scanning for artifact existence; per delegation-policy.md < 3 files < 500 lines)"
  writes: none
  runs: "@executor (orchestrator_state.js status)"
  direct_justified: ["artifact existence checks are < 10 lines each; pure routing logic"]
output_contract:
  citations: not-required
---

# Step 1 — Context Scan

Detect existing artifacts and determine the shaping context. This step decides how deep the subsequent steps go.

## Goal
Establish what the user is bringing and what prior work exists. Set context variables that subsequent steps use to adapt their behavior.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill shape-up --step 1`

1. `@memory-controller load founder [shape-up — {concept}]` — seed project context.
2. Check pipeline state via `@executor`:
   ```bash
   node .agents/scripts/orchestrator_state.js status
   ```
3. Scan for existing artifacts:
   - `artifacts/output/01-discovery/validation-brief.md` → set `hasValidation = true`
   - `artifacts/output/01-discovery/idea-brief.md` → set `hasIdeaBrief = true`
   - `artifacts/output/01-discovery/shaped-brief.md` → set `isReshape = true`
   - `artifacts/output/02-research/market-analysis.md` → set `hasResearch = true` (check all 3 research files)
4. Report context to user:
   > "I found [X artifacts]. Here's how I'll adapt the shaping process: [adaptation summary]."

## Context routing

| Context | Adaptation |
|---|---|
| Nothing exists | Full shaping — steps 2-5 run at full depth |
| `hasValidation` | Step 2 incorporates premises from validation brief; step 3 skips basic framing gaps |
| `hasResearch` | Step 3 cross-references assumptions against research findings; step 4 focuses on synthesis gaps |
| `isReshape` | Step 2 loads existing brief, highlights what changed; step 3 focuses on new gaps only |
| `hasValidation` + `hasResearch` | Lightest path — step 2 is a review, steps 3-4 focus on synthesis and loopholes |

## Output
Context state established for use in subsequent steps.

## Delegation
- **Reads:** direct — artifact existence checks (< 10 lines each)
- **Runs:** @executor for orchestrator_state.js status
- **Direct:** routing logic is pure reasoning

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill shape-up --step 1`
