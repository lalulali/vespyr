---
step: 1
name: Execute tasks
output_contract:
  citations: not-required
---

# Step 1 — Execute the tasks

Work only on the executable task set Step 0 confirmed. Each task follows its own plan row: the same first action, the same source links, and the same verification the plan names.

## Before the first task

Re-read the executable set, the blocked set, and the before identity captured in Step 0. If the working tree or HEAD moved since that capture, the before identity is stale: re-capture it and re-check the plan before running anything.

## Execute one task

For each task in the executable set, in the plan's dependency order:

1. **Start from the plan's first action.** The plan's task row names the exact first file, command, or record to inspect or change. Follow it. Do not substitute a different file, scope the work differently, or extend it to a neighbouring concern.
2. **Make the change within the plan's scope only.** Touch the files the plan's source links and relevant-path set name. Do not reformat unrelated code, clean up adjacent code, or rename things the plan did not name.
3. **Prove it for a code task.** The plan names a revert-proof test: an exact test file, test case, and command. Both halves are required:
   - With the change in place, the named test **passes**. Record the actual command, raw output, and exit status.
   - With the change reverted, the same named test **fails**. Record the actual command, raw output, and exit status of that run too.

   Reverting means restoring the exact prior bytes of the changed file, running the test, observing the failure, and restoring the change. The tree must be identical to its changed state after the revert run. If the test does not fail on revert, the task is not proven: the test does not actually cover the change. Fix the test or the change, or report the task as not done. Never substitute a different test, a syntax check, or a lint run for the named behavior test.
4. **Prove it for a non-code task.** Follow the manual steps the plan names and record the steps, the expected result, the observed result, the verifier, the date, and the revision.
5. **Capture the after identity.** Record the full HEAD object ID again, and re-run the documented read-only manifest command to capture the per-file fingerprints of the plan's relevant paths after the change. Keep the before and after identities with the task, so a reviewer can see exactly what moved.
6. **Record the disposition.** Record the task disposition with an exact evidence reference to the retained output:

```sh
node .agents/scripts/maintenance_state.js event --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <run-id> --type task_disposition --details-json '{"taskId":"<task-id>","planId":"<plan-id>","planRevision":"<revision>","planHash":"sha256:<digest>","disposition":"completed","evidenceRef":"<exact evidence path>","revertProof":{"testFile":"<exact test file>","testName":"<exact test case>","command":"<exact command>","passWithChange":"<exit status and output reference>","failWhenReverted":"<exit status and output reference>"},"revisionBefore":"<full HEAD object id>","revisionAfter":"<full HEAD object id>","claimStatus":"recorded-claim","authentication":"not-cryptographically-verified"}' --agent <agent> --session-id <session-id>
```

Use a disposition that states what actually happened — `completed`, `failed`, or `blocked` — and name the reason in the evidence reference. A task whose revert proof is missing or did not fail on revert is never `completed`.

## Stop conditions inside a task

- The named revert-proof test does not pass with the change, or does not fail when the change is reverted → the task is not done. Report it; do not close it and do not substitute another test.
- The files the task needs are not in the plan's relevant-path set → the evidence cannot be bound to the authorized plan. Stop and report the gap rather than widening the plan by hand.
- The working tree or HEAD changed underneath the run in a way the plan does not account for → stop, invalidate the affected evidence, and re-verify it on the new candidate revision.
- The task turns out to depend on an owner decision after all → stop that task, record it as blocked with the decision named, and move on. Do not resolve the decision.
- Any instruction to advance or complete a product phase, write product memory or product session state, or touch product output outside `artifacts/output/maintenance/<run-id>/**` → refuse and stop.

## Boundaries that hold for the whole step

- Execute only tasks the repository owner authorized, only in the plan's order, and only within the plan's scope.
- Never execute a task blocked by an open owner decision. B1, O-4, B10, and credential-residual remain open, and no agent resolves a decision to unblock work.
- Never edit the authorized plan during execution — not to record progress, not to add this report to its inputs. An edit creates a new revision with a new digest, and the authorization being executed would no longer cover it.
- Never advance or complete a product pipeline phase, never write product memory or product session state, and never write product output outside `artifacts/output/maintenance/<run-id>/**`.
- Never claim the gate is green, and never treat a completed task as a closeout.

## Close the step

After the last task, capture the candidate revision identity once more: the full HEAD object ID and the manifest of the plan's relevant paths. That identity is what Step 2 verifies and seats the panel on.

Record the blocked set explicitly in the execution report: each blocked task, the open decision that blocks it, and the fact that it was not executed. A blocked task is a correct outcome when a decision is open.

**Step 1 is complete** when every authorized, unblocked task has a disposition event, each code task carries both halves of its revert proof with the exact commands and exit statuses, and each executed task has a before and after revision and working-tree identity. Blocked tasks are named, not executed.
