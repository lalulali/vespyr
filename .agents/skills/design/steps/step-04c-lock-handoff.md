---
step: 4c
name: Lock & Handoff
mode: validate
prerequisites:
  - step-03 completed
output_contract:
  citations: not-required
---

# Step 4 — Lock & Handoff

Finalize the validation report, record findings, and route based on results.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-validate --step 4`
## Goal
Consolidate findings from heuristic eval, consistency check, and a11y review. Determine if the design passes or needs revision.

**The verdict's home is `artifacts/output/02-research/ux-research-report.md`** — the same file step 01c writes the heuristic scorecard into. Append the Review Gate card there; do not create a separate `validation-report.md` (a second home means a reader cannot tell which one is authoritative) and do not leave the verdict only in memory, where the owner never sees it.

## Verdict — Review Gate, not a Decision Gate

Validate mode judges artifacts that **already exist**. That is a Review Gate claim ("does the evidence reproduce the claim"), never a Decision Gate claim about whether to build something. Use the locked Review Gate vocabulary (`.agents/references/glossary.md`):

- **`[CONFIRMED]`** — no 🔴 Fail findings across heuristic eval, consistency, and a11y. The design is validated. Handoff to develop.
- **`[PARTIAL]`** — 🔴 Fail findings exist but the interaction model holds. Loop back to create mode step 04 (screen states) or edit mode for revisions.
- **`[FALSIFIED]`** — the interaction model itself is wrong (fundamental UX failure, nothing in the current structure is salvageable). This is the same condition that triggers `steps/step-05d-sync-contract.md` in reverse mode; record it and stop, rather than looping for a revision that cannot converge.

**Severity vocabulary is fixed upstream.** Step 01c scores 🟢 Pass / 🟡 Minor / 🔴 Fail. Reason in those terms. Do not invent a parallel "critical/serious" scale — the two scales drift, and then the verdict no longer describes the findings it was derived from. 🟡 Minor never blocks: it is an improvement, and a design with only 🟡 findings is `[CONFIRMED]`.

**The token is the machine companion, never the message** (`.agents/references/vespyr-dna.md` §Decision Gate). `tools/eval/lib/ast.js` parses a Review Gate token **only when bracketed** — `VERDICT: CONFIRMED` is invisible to it. Write the declaration like this:

```
VERDICT: [PARTIAL] — When: <NOW|GATED|NEXT-CYCLE>
Survived: <what the review validated — the part that does not need rework>
Because : <the finding count that decided it, e.g. 3 of 11 heuristics at 🔴 Fail, incl. 2 a11y AA violations>
Next    : <the step to loop back to, the artifact it edits, and who owns it>
```

**Two surfaces.** The verdict lives in `artifacts/output/02-research/ux-research-report.md` — plain sentence first, then the card above. The **chat reply carries the plain sentence, the consequence, and the next action, and never the token or any card field** (`.agents/references/vespyr-dna.md` §Two surfaces). A reader who has never seen this engine must be able to act on the sentence alone.

State the consequence for this person, not the label. `[PARTIAL]` is not "PARTIAL" — it is "the flow works, but six states are unusable with a keyboard and none of that is fixed yet; here's who fixes it."

## If [PARTIAL]: revision loop
- `@product-designer` addresses every 🔴 Fail finding
- Max 2 revision cycles between `@ux-researcher` and `@product-designer`
- After 2 cycles, escalate unresolved findings to `@product-manager` — do not loop a third time

## If [FALSIFIED]: stop
Do not hand off to `develop`. Record the falsification evidence and route to `@product-manager` to re-scope the interaction model; reverse mode has a defined path for this in `steps/step-05d-sync-contract.md`, create mode does not — say so rather than pretending a revision loop applies.

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent ux-researcher --artifact 02-research/ux-research-report.md
```

## Memory closeout
```
@memory-controller session-write
Worked on: Design validation — {feature/product name}
Decisions made:
- {Review Gate verdict, bracketed: [CONFIRMED] / [PARTIAL] / [FALSIFIED]} — {N} of {M} heuristics at 🔴 Fail, {K} a11y AA violations
- {key findings summary}
Next step: {load develop / loop back to screen states / re-scope interaction model}
Blockers: {unresolved 🔴 findings, or "none"}
```

## Handoff routing
- **`[CONFIRMED]`** → first run `prototype_collab_gate.js verify` when a prototype is in scope; load `develop` only when it passes
- **`[PARTIAL]`** → loop back to `steps/step-04a-screen-states.md` or `steps/step-03b-revise.md`
- **`[FALSIFIED]`** → do not hand off. Route to `@product-manager` to re-scope the interaction model

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-validate --step 4`
