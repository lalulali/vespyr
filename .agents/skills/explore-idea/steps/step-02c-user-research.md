---
step: 2c
name: User Research
prerequisites:
  - step-02b completed (competitive-analysis.md exists)
output_contract:
  citations: required
---

# Step 2c — User Research

Validate user needs against the research gathered so far. Depends on step 2b output.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill explore-idea --step 2c` at step start; `complete --skill explore-idea --step 2c` at step close.
> **Dispatch:** follow the tiered-dispatch contract in SKILL.md. By design, this agent consumes step 2b's output; it must not see 2a's output before forming its own findings.

## Workflow

### 2c.1 Load inputs

Read:
- Validation brief (or idea brief)
- `artifacts/output/02-research/competitive-analysis.md`

### 2c.2 Research — @user-researcher

Invoke `@user-researcher` to validate user needs:
- Target users and their goals
- Pain points and workarounds
- User personas and journeys
- "How might we" statements

**Evidence gate (non-negotiable):** this step has no human-run sessions. If the human has not supplied interview notes, transcripts, or survey data, every persona, quote, and "user need" MUST be labeled `HYPOTHESIS-ONLY (no human data)` — never presented as an observed finding, and never given an attributed quote. The founder gate (`step-03`) treats labeled hypotheses as `[PARTIAL]`, not confirmation.

**Context adaptation:** use the mode table in `SKILL.md` §Context adaptation — do not restate it here.

### 2c.3 Output

Write `artifacts/output/02-research/user-personas.md` using
`.agents/templates/research/user-personas-template.md`. The template defines the artifact's shape —
do not improvise a different structure, because the synthesis step reads it as gate input.

Every persona, quote, and need must carry its `HYPOTHESIS-ONLY (no human data)` label here if no human
sessions were supplied — the label is what step-03 reads to decide the evidence is `[PARTIAL]`, so
dropping it silently upgrades a hypothesis into a finding.

### 2c.4 Record completion

Run:
```bash
node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/user-personas.md
```

## Memory closeout
- `@memory-controller session-write` — record step 2c user research findings.

## Delegation
- **Memory:** @memory-controller for session-write
