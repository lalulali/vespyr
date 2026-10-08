---
step: 8
name: PM Verification
prerequisites:
  - step-07 completed
output_contract:
  citations: not-required
---

# Step 8 — PM Verification

`@product-manager` verifies the shipped feature against the original acceptance criteria. This is a gate — PM must accept before documentation and completion.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 8`
## Goal
Confirm the feature meets all acceptance criteria, edge cases, and error states defined in the spec.

## Agent invocation
`@product-manager`:
- Review against original acceptance criteria in user stories
- Check edge cases and error states match the spec
- Verify all capabilities (CAP-N) from the spec-kernel are satisfied
- Confirm the coverage contract (`artifacts/output/05-execution/quality/coverage-report.md`) reflects the accepted scope: orphan ACs 0-or-deferred, `--fidelity` 10/10; cite the sweep's output (honestly labeled prose — no enforcement stub claimed)

## Output
`artifacts/output/05-execution/pm-verification.md` — the PM's acceptance record.

Structure: `Verdict`, `Criteria reviewed`, `Evidence cited`, `Open items`. The verdict uses the
same bracketed vocabulary as the QA sign-off (`VERDICT: [CONFIRMED]` / `[PARTIAL]` / `[FALSIFIED]`)
so `tools/eval/lib/ast.js` can read it, and every cited evidence path must exist on disk.

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 05-execution/pm-verification.md
```

**This path was previously unnamed**, and a blind run had to invent the filename to satisfy the
step. Naming it here means two runs on the same project write the same file.

## Loop limit
Max 2 rejection cycles:
- If PM rejects a third time due to a spec problem → go back to `design` skill
- If PM rejects a third time due to a build problem → escalate to `@tech-lead` for root cause

## Decision
- **Accept** → proceed to step 9
- **Reject** → log gaps, loop back to step 6 (dev loop)

## Memory closeout
- `@memory-controller session-write` — record step 8 PM verification outcome.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 8`
