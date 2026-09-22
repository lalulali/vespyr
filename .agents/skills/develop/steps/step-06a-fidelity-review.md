---
step: 6a
name: Fidelity Review
prerequisites:
  - step-06 completed
output_contract:
  citations: not-required
---

# Step 6a — Fidelity Review (Implementation Coverage)

The handoff gate between the dev loop and QA (02o). Count the coverage — never feel it: every AC maps to implementation evidence, and the 10 detail classes are implemented or explicitly deferred before quality gates run. Checklist-tier theater is banned — this gate can fail and does.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 6a`

## Process
1. `@developer` runs the mechanical orphan-AC sweep (orphans = 0, or dated deferrals):
   ```bash
   node .agents/scripts/req_to_impl_check.js
   ```
   Evidence refs use the frozen `path#id` anchor syntax; the stories file and coverage report are never targets (self-match is impossible).
2. Complete the coverage contract at `artifacts/output/05-execution/quality/coverage-report.md` (template: `.agents/skills/develop/templates/coverage-report.md`): one row per AC id — `{ac_id, evidence_ref[], mechanism, check}`; deferral rows carry owner + date.
3. Complete the 10-class fidelity table: every class implemented with evidence, or deferred with a reason. Classes deferred from the prototype (`[DEFERRED TO SPEC]`) are audited here as implemented-or-deferred-with-reason (Review 10 §4).
4. Run the class gate — a missing class exits 1:
   ```bash
   node .agents/scripts/req_to_impl_check.js --fidelity
   ```
5. Post-handoff contract shifts append `[DELTA-NN]`/`AC-E*` — existing criteria are never edited in place (Phase Boundary Rule).

## Halt conditions
- Orphan AC without a dated deferral — implement it or defer it properly; QA does not start
- A detail class neither implemented nor deferred-with-reason
- Coverage report older than the newest code change — re-run the sweep first (`--freshness`)

## Output
`artifacts/output/05-execution/quality/coverage-report.md` — full AC map + 10-class table; both gates exit 0.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 6a`
