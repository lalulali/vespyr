---
step: 2
name: Verify and panel
output_contract:
  citations: not-required
---

# Step 2 — Verify and panel

Verify the executed work on one candidate revision, seat four fresh reviewers on that same unchanged revision, and close the execution record. This step produces evidence, never a verdict.

## Fix the candidate revision

Take the candidate revision identity captured at the end of Step 1: the full HEAD object ID and the per-file fingerprint of the plan's relevant paths. Every check result and every panel report must name this exact revision.

If anything changed after that capture, the candidate moved. Re-capture the identity, and re-run any check whose evidence was bound to the earlier revision before relying on it.

## Run the required machine checks

Run each check the authorized plan names, with the exact command the plan gives for it. Do not substitute a broader test entry point, a catalog or manifest generation command, a different scope, or an invented command. If the plan names no command for a required check, record that check as not run and report it; do not improvise one.

For each check, retain the exact command, the raw output, the exit status, and the candidate revision it ran against. A failed check, missing output, or revision mismatch leaves machine verification incomplete.

Record each check:

```sh
node .agents/scripts/maintenance_state.js event --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <run-id> --type verification --details-json '{"planId":"<plan-id>","planRevision":"<revision>","planHash":"sha256:<digest>","check":"<exact check name>","command":"<exact command>","result":"passed|failed","evidenceRef":"<exact evidence path>","startEventId":"<execution_started-event-id>","revision":"<full revision and working-tree identity>","claimStatus":"recorded-claim","authentication":"not-cryptographically-verified"}' --agent <agent> --session-id <session-id>
```

`startEventId` must name the `execution_started` event for the same plan identity, recorded strictly earlier. The `result` is `passed` or `failed` — record it as observed, never as intended.

If any required check failed, do **not** record an execution completion. Report the run as blocked, with the failed check named and its raw output referenced.

## Seat the four-seat panel

Four distinct seats must review the **same unchanged** candidate revision: `@qa-engineer`, `@security-engineer`, `@code-reviewer`, and `@architect`.

- Fresh — each report is created after the machine evidence above, not reused from an earlier revision or an earlier run.
- On one revision — every seat reviews the candidate revision, not a neighbouring one.
- Distinct — one person cannot hold two seats, and one report cannot stand in for two.
- `SATISFIED` — a seat that reports anything else, or does not report at all, is not a satisfied seat.

Record each seat:

```sh
node .agents/scripts/maintenance_state.js event --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <run-id> --type panel_seat_disposition --details-json '{"planId":"<plan-id>","planRevision":"<revision>","planHash":"sha256:<digest>","seat":"@qa-engineer","reviewer":"<reviewer identity>","disposition":"SATISFIED","revision":"<full revision and working-tree identity>","fresh":true,"evidenceRef":"<exact report path>","claimStatus":"recorded-claim","authentication":"not-cryptographically-verified"}' --agent <agent> --session-id <session-id>
```

**Fewer than four fresh, distinct `SATISFIED` seats on one unchanged revision blocks any green claim.** A missing, duplicated, stale, wrong-revision, or non-satisfied seat blocks it. **This is a human-reviewed obligation, not a machine-enforced one:** the lane records each seat's disposition as a `panel_seat_disposition` event and the run-status reduction never inspects those events, so nothing in the code counts the seats or proves they are distinct, fresh and bound to the same revision. Check it by reading the recorded events. Record the shortfall exactly — which seats are missing, which are stale, which report a different revision, and which are not satisfied — and report the run as blocked from green.

Do not seat the panel on a revision that changed after the machine evidence. If the revision moved, re-run the checks and re-seat the panel on the new candidate.

## Close the execution record

When every required check passed, record the execution completion:

```sh
node .agents/scripts/maintenance_state.js event --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <run-id> --type execution_completed --details-json '{"planId":"<plan-id>","planRevision":"<revision>","planHash":"sha256:<digest>","startEventId":"<execution_started-event-id>","verificationEventId":"<passing verification event id>","candidateRevision":"<full revision and working-tree identity>","executedTaskIds":["<task-id>"],"blockedTaskIds":["<task-id>"],"claimStatus":"recorded-claim","authentication":"not-cryptographically-verified"}' --agent <agent> --session-id <session-id>
```

`verificationEventId` must name a passing verification whose `startEventId` is the same `execution_started` event. A completion that references a failed verification, a verification for a different start, or a plan identity that differs from the plan file is stored as invalid.

Then check the run status:

```sh
node .agents/scripts/maintenance_state.js status --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <run-id>
```

## Write the execution report

Write one report file under the run artifact root: `artifacts/output/maintenance/<run-id>/maintenance-execution-report-<plan-id>-r<revision>.md`. It records:

- The authorized plan identity, its digest, the authorization's owner evidence reference, and the claim labels.
- The before and after working-tree identity for each executed task, and the revert proof for each code task.
- Every executed task's disposition and evidence reference.
- Every blocked task, the open decision that blocks it, and the fact that it was not executed.
- The candidate revision identity, every check with its exact command, raw output, exit status, and result.
- The four panel seats with reviewer identity, disposition, the revision each reviewed, and the report reference.
- The statement that these records are evidence, not gate-green.

## What this step does not establish

**The recorded events are evidence records, not gate-green.** `execution_started`, `task_disposition`, `verification`, `panel_seat_disposition`, and `execution_completed` are claims about what ran and what was observed. The `status` view presents the approval evidence with `claimStatus: recorded-claim` and `validation: not-cryptographically-verified`, and the completion evidence with `claimStatus: completion-recorded` and `validation: not-externally-validated`; those labels are presented by the status view and are not stored on the event, which holds the caller's `details` as given. A completion event means the authorized work finished on the candidate revision; it does not mean the gate is green.

Green eligibility is a separate human-reviewed record over the complete evidence set. It additionally requires four fresh, distinct `SATISFIED` seats on one unchanged revision **and** a permitted human disposition for every required owner decision. B1, O-4, B10, and credential-residual remain open, so no agent here can make green available, and no panel verdict substitutes for those rulings.

Never advance or complete a product phase, never write product memory or product session state, and never write product output outside `artifacts/output/maintenance/<run-id>/**`.

**Step 2 is complete** when every required check has a recorded result on the candidate revision, the four seats are recorded, the execution completion is recorded against a passing verification, the run status is checked, and the report states plainly that none of this is a gate-green verdict.
