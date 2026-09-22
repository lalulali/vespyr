---
step: 5d
name: Spike Rollback
mode: reverse
prerequisites:
  - step-4 completed
output_contract:
  citations: not-required
---

# Step 5 — Spike Rollback Protocol (Reverse Mode)

**Not a sync loop.** After the freeze boundary (step-4) the prototype is an immutable reference and the spec is the sole contractual truth. This step runs only when QA falsifies the interaction model (Review 10 §4) — a post-freeze prototype edit is a rollback trigger, never a routine sync.

## When to run
- QA falsifies the interaction model (fundamental UX failure), or
- Step-0's staleness hook reports `stale`/`missing` and the prototype legitimately evolved (not an accidental edit).

Do **not** run this for small spec-side discoveries — those follow the Phase Boundary Rule: append `[DELTA-NN]` in `requirements.md` + `AC-E*` in `user-stories.md`, referenced in code/tests (swept by 02o).

## Protocol
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 5`

1. **Halt engineering.** Stop the dev loop on the falsified model; never patch production code around a broken interaction (designer veto at QA — Review 10 §4).
2. **Branch Prototype v2 in isolation** — a fresh sandbox that passes the same completeness gate as step-1 (4 criteria + State Switcher). Failing prototypes do not proceed.
3. **Re-validate** the new interaction with the same usability bar; record falsification + re-validation evidence in the session summary.
4. **Re-extract** — re-run step-1 (inventory delta) and step-2 (ledger delta) against Prototype v2. New/removed behaviors become inventory rows; ledger rows are re-anchored or demoted to `[OPEN]` — never silently rewritten.
5. **Re-run parity** (step-4): metrics + 10-class table + deferrals; `spec_parity.js check` must exit 0.
6. **Re-witness** — refresh the freeze boundary:
   - **file prototype:** `node .agents/scripts/spec_parity.js witness stamp --report <report> --prototype <prototype>` (new SHA-256)
   - **non-file prototype:** pointer + access timestamp + inventory snapshot hash (A3 — honestly weaker; labeled in the report)
7. **Resume engineering** against the new frozen reference; post-handoff contract shifts append `[DELTA-NN]`/`AC-E*` (Phase Boundary Rule).

## Output
Updated `prototype-inventory.md`, `requirements.md` (ledger), `parity-report.md` (new witness); Step-0 staleness hook green.

## Halt conditions
- Prototype v2 fails the completeness gate
- `spec_parity.js check` exits 1 after re-extraction
- Re-witness cannot be stamped

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 5`
