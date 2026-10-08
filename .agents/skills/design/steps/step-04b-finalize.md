---
step: 4b
name: Finalize
mode: edit
prerequisites:
  - step-03 completed
output_contract:
  citations: not-required
---

# Step 4 — Finalize

Write revised artifacts back and close the session.

## Goal
Persist updated design documents, record decisions, and hand off.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-edit --step 4`
1. Write revised files back to `artifacts/output/03-strategy/`.
2. Update dates and revision notes.
3. Update `artifacts/output/03-strategy/gap-map.md` with the change record from step 03b —
   every revised section, and which finding it closed.
4. Re-run the design review gate from `steps/step-06a-handoff.md` to confirm all checks pass.

## Verdict — Review Gate

Edit mode judges documents that already exist, so this is a Review Gate claim — the same gate
as validate mode (`.agents/references/glossary.md`).

Before this step the mode had **no verdict at all**: the gap scan produced Green/Yellow/Red
findings, revisions happened, and then the mode closed. A revision pass and a no-op produced
identical artifacts, so neither the owner nor a later reader could tell which had happened.
SKILL.md's `Done when` even claimed a re-review verdict that no step implemented.

Write the card into `artifacts/output/03-strategy/gap-map.md`, next to the findings it
summarises:

```
VERDICT: [CONFIRMED] — When: <NOW|GATED|NEXT-CYCLE>
Survived: <sections that needed no change, and why that is enough>
Because : <N> of <M> sections closed, <K> red findings remaining, each named in this file
Next    : <next step, owner, and what happens to the K remaining>
```

- **`[CONFIRMED]`** — every 🔴 closed, nothing escalated.
- **`[PARTIAL]`** — 🔴 findings remain open, or a section hit the 2-cycle limit. Either loop
  again or escalate to `@product-manager`; say which, and do not quietly drop them.
- **`[FALSIFIED]`** — the artifact rests on a wrong premise, so revising it cannot help. That
  is a re-scope, not a revision. Route to `@product-manager` and stop.

The **chat reply carries the plain sentence, the consequence, and the next action — never the
token or a card field** (SKILL.md §Two surfaces). Bracket the token; the parser only reads
bracketed forms.

## Gate re-check
- All artifacts present and valid?
- No blocking open questions?
- User stories still aligned with revised PRD?
- If a prototype is in scope, does `prototype_collab_gate.js verify` still pass for the selected track and reviewed prototype hash?

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 03-strategy/requirements.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 03-strategy/user-stories.md
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 03-strategy/product-spec.md
```

## Memory closeout
```
@memory-controller session-write
Worked on: Design revision — {feature/product name}
Decisions made:
- {what changed and why}
Next step: Load develop
Blockers: {any unresolved design questions, or "none"}
```

## Handoff
Load `develop` to proceed. If revisions changed scope significantly, re-offer the Architect phase gate.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-edit --step 4`
