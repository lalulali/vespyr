---
step: 4d
name: Parity Gate
mode: reverse
prerequisites:
  - step-3 completed
output_contract:
  citations: not-required
---

# Step 4 — Parity Gate (Reverse Mode)

Count the parity — never feel it. Run `spec_parity.js`, complete the 10-class detail checklist, produce `parity-report.md`, and stamp the **freeze boundary** (Review 10 §4). This is the handoff gate: after this step the spec is the contractual truth and the prototype is an immutable reference.

## Prerequisites
- Synthesized artifacts (step-3) + ledger + inventory.
- `spec_parity.js` present; a missing or stubbed script is a loud failure, never a silent skip.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 4`

1. **Metrics pass** — fix violations before writing the report:
   ```bash
   node .agents/scripts/spec_parity.js check --inventory <inventory> --requirements <requirements> --report <report> --metrics-only
   ```
   Ghosts must be 0; orphans 0-or-deferred; grounding 100% of non-`[OPEN]`.
2. **Write `parity-report.md`** (template: `.agents/templates/product/parity-report-template.md`) with the 5 metrics, the 10-class coverage table (evidence = ledger IDs or anchors; `N/A: reason` allowed), and orphan deferrals (owner + date).
3. **Freeze boundary** — stamp the witness:
   ```bash
   node .agents/scripts/spec_parity.js witness stamp --report <report> --prototype <prototype>
   ```
   File prototypes: SHA-256. Non-file prototypes (Figma URL, live code): source pointer + access timestamp + inventory snapshot hash — honestly weaker (A3), labeled as such in the report.
4. **Gate run** — `spec_parity.js check` (full) must exit 0: ghosts = 0, orphans 0-or-deferred, grounding 100%, classes 10/10, witness stamped.
5. **Owner sampling (A7 — judged tier).** Present 3 of N ledger statements to the owner; each anchor is verified to actually support its claim. Record the sampled rows + disposition in the report. Structural gates never claim this check.
6. **Parity delta vs traditional (A8).** Record the first-run calibration (AC count + detail-class counts); no threshold is invented — owner disposition is mandatory and blocking in the report.

## Output
`artifacts/output/03-strategy/parity-report.md` — metrics + 10-class table + deferrals + witness + sampling + delta; `check` exits 0.

## Halt conditions
- `check` exits 1 (ghost / unresolved orphan / class gap) — fix, never waive
- Witness cannot be stamped (prototype missing / unreadable)
- Owner sampling or parity-delta disposition left unrecorded — gate stays open

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 4`
