---
step: 7a
name: Handoff
mode: create
prerequisites:
  - step-06 completed
output_contract:
  citations: not-required
---

# Step 7 — Handoff

Write the validation brief and hand off to the next phase.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 7`
## Output
`artifacts/output/01-discovery/validation-brief.md` — use template `.agents/templates/discovery/validation-brief-template.md`

Include in the **brief**: context mode, maturity (+ brownfield Q1 source), problem statement, proposed solution, target user, the Q1–Q7 coverage table, value proposition, premises, framework scores, alternatives (`[GO]`/`[RESHAPE]` only), and the verdict — **plain sentence first, then the card** at the depth the stakes require (`.agents/references/vespyr-dna.md` §Decision Gate).

**The brief is the document surface.** The chat reply gets the plain sentence, the consequence, and the next action — never the card. Say where the brief is and stop; the gates read the file, not the conversation.

**`validation-brief.md` is the only file this step writes.** Do not produce `idea-brief.md` here —
it is not a mode sentinel, but `explore-idea` writes it on its Phase-1 fallback path, so creating it
early only muddies which artifact downstream agents treat as canonical.

**Incomplete-session contract.** If the session ends without a verdict (abandoned, truncated, or the
user stopped the interrogation), still write the brief: mark it `Status: Incomplete`, leave every
unasked Q dispositioned `DEFERRED` with owner + revisit trigger, and set `Verdict: none issued —
evidence incomplete`. Do not infer a verdict from partial answers; an unevidenced `[GO]` is the
failure this whole skill exists to prevent. Report the file path so the user can resume into edit
mode.

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/validation-brief.md
```

Only run this when a verdict was actually issued. On an incomplete session, leave pipeline state
untouched and say why.

## Memory closeout
`@memory-controller write active-decisions.md` — persist the verdict (bracketed) and key premises.
`@memory-controller session-write` — summarize decisions, next step, blockers.

## Handoff routing
- **GO** → load `explore-idea`. The validation brief feeds into research. Research agents focus on the open questions listed in the brief.
- **RESHAPE** → re-run `validate-idea` with the revised framing.
- **NO-GO** → stop. The brief documents why. Revisit only if new evidence emerges.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 7`
