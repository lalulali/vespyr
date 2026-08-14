---
step: 3
name: Synthesis & Ideation
prerequisites:
  - step-02 completed
output_contract:
  citations: not-required
---

# Step 3 — Synthesis & Ideation

`@product-manager` maps problem findings to candidate solution concepts. This is the bridge from "what's wrong?" to "what could we build?"

## Workflow

### 3a. Review findings

Read the four analysis artifacts from step 02:
- `root-cause-analysis.md` — what's the root cause?
- `empathy-map.md` — what's the user experiencing?
- `journey-map.md` — where's the friction point?
- `jtbd-hmw.md` — what jobs are unfulfilled? What HMW questions emerged?

### 3b. Map to solution spaces

For each root cause, identify the solution space:
- **Fix the root cause** — What would eliminate the problem entirely?
- **Mitigate the symptom** — What would reduce the impact without fixing the root?
- **Remove the need** — What if users didn't need to do this at all?

### 3c. Generate candidate concepts

For each solution space, produce 1-3 candidate solution concepts. Each concept:
- **Describes the intervention** — what changes for the user?
- **Maps to a JTBD** — which job does this help with?
- **Has a testable hypothesis** — "If we {do this}, then {this metric} will improve by {amount} because {reason}."
- **Has a confidence level** — High/Med/Low based on strength of evidence

Present concepts to the user. In guided/combination mode, ask: "Which of these feels most promising? Which should we explore first?"

### 3d. Select path forward

User selects primary concept (or combination). Document the selection and rationale.

## Memory closeout
- `@memory-controller session-write` — record step 3 synthesis and selected solution concept.

## Delegation
- **Memory:** @memory-controller for session-write

