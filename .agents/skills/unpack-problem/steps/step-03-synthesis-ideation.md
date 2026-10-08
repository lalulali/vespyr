---
step: 3
name: Synthesis & Ideation
prerequisites:
  - step-02 completed
output_contract:
  citations: not-required
---

# Step 3 — Synthesis & Ideation

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill unpack-problem --step 3` at step start; `complete --skill unpack-problem --step 3` at step close.

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
- **Carries a per-concept Decision Gate verdict** — **plain sentence first** ("worth pursuing" / "the framing needs another pass" / "not worth pursuing"), then the bracketed token: `VERDICT: [RESHAPE]`, `VERDICT: [NO-GO]`, or `VERDICT: [GO] — When: <NOW|GATED|NEXT-CYCLE>`, with a one-line rationale. Per-concept verdicts roll up into the brief's single `VERDICT:` line at step 4; the two are distinct on purpose (candidate-level vs brief-level).
  - Never emit the unbracketed `[VERDICT: GO|RESHAPE|NO-GO]` or `[GATE: …]` spelling — `tools/eval/lib/ast.js` matches only literal brackets, so those forms reach no telemetry and no safety invariant.
  - These per-concept verdicts are written into the **document** (they roll up into the brief at step 4). Tell the user each concept's worth in plain words; do not put a token in the chat (`.agents/references/vespyr-dna.md` §Two surfaces).

Present concepts to the user. In guided/combination mode, report what each concept's evidence does and doesn't cover, then ask pointed questions tied to the weakest evidence (e.g., "concept 2's hypothesis has no baseline metric — what does {metric} measure today?").

### 3d. Select path forward

User selects primary concept (or combination). Document the selection with its verdict and rationale.

## Memory closeout
- `@memory-controller session-write` — record step 3 synthesis and selected solution concept.

## Delegation
- **Memory:** @memory-controller for session-write

