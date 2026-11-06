---
step: 0
name: Load and authorize
output_contract:
  citations: not-required
---

# Step 0 — Load and authorize

Establish the maintenance boundary and prove authorization before anything is executed. This gate is non-skippable: a plan that has not been validated and authorized must not reach Step 1.

## Required caller inputs

- Absolute repository root.
- Caller-supplied, absolute external state root. Do not use an environment fallback.
- Existing caller-supplied `runId`.
- The absolute path of the exact plan revision to execute.
- The active agent name.

If any input is absent, ask for it and stop before reading or writing repository files.

## Start and verify the session

Choose a fresh, never-reused `sessionId` for this invocation. The first command is:

```sh
node .agents/scripts/maintenance_session.js --scope maintenance --agent <agent> --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <caller-supplied-run-id> --session-id <fresh-unique-session-id>
```

Stop if the command rejects the root or the run. Do not call product session startup, shared worktree helpers, or any fallback.

Then check the run status and the allowed artifact root:

```sh
node .agents/scripts/maintenance_state.js status --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <caller-supplied-run-id>
node .agents/scripts/maintenance_state.js artifact-root --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <caller-supplied-run-id>
```

Continue only when all of these hold:

- Startup output reports `scope: maintenance`, the exact supplied `runId` and `sessionId`, the exact caller-supplied external root, and an artifact root equal to `artifacts/output/maintenance/<run-id>` under the supplied repository root.
- The helper accepts the external root as canonical, non-symlink, and disjoint from the repository.
- Status names the same `runId` and reports no lifecycle issue for this plan identity.

If any status field is absent or conflicting, preserve the result and stop. Do not create an event to manufacture approval or mark the run owner-approved.

## Validate the plan file

Confirm the plan file is the canonical regular file directly under the returned artifact root and named `maintenance-plan-<plan-id>-r<revision>.md`. Read its record identity and note `runId`, `planId`, `planRevision`, `planDigest`, `baseRevision`, `dirtyManifest`, and `recordStatus`.

- `runId` must equal the caller's run ID.
- `recordStatus` is `DRAFT` and stays `DRAFT`. Authorization is never expressed by changing that field.

Run the documented plan-check command against that exact file:

```sh
node .agents/scripts/maintenance_plan_check.js check \
  --scope maintenance \
  --repo-root <absolute-repository-root> \
  --state-root <caller-supplied-absolute-external-root> \
  --run-id <run-id> \
  --plan <absolute-plan-path> \
  --json
```

- `valid` must be `true`. Any issue in the `issues` array blocks execution.
- `executionAuthorized` is always `false` in this output. The command never authorizes execution; a passing check is a recorded claim that one exact revision satisfies the record contract.
- The check also verifies the `dirtyManifest` against the computed fingerprint for the plan's relevant paths. A stale or mismatched manifest fails closed here. Do not hand-edit the manifest to make the check pass.

## Confirm owner authorization

Authorization is a separate decision from technical review. Both records must exist and both must name this same run, plan ID, revision, and digest.

1. Find the `plan_drafted` event whose details carry this `planId`, this `planRevision`, and this `planHash` — where `planHash` is the plan file's `planDigest` value verbatim.
2. Find the `plan_approved` event for the same plan identity. It must reference that draft event, carry an `evidenceRef`, and have been recorded strictly after the draft.
3. The plan's own repository-owner execution authorization row must be recorded — not `PENDING` — and must cite the same run, plan ID, revision, digest, scope, and authorized task IDs.
4. Read the owner evidence reference. Confirm it is owner-authored and names the same run, plan revision, digest, scope, and task IDs. If the reference is missing, unreadable, or names a different revision, stop.

A `plan_approved` event is a **recorded claim, not authentication**. The `status` view presents it with `claimStatus: recorded-claim` and `validation: not-cryptographically-verified`. Those labels are presented by the status view, not stored on the event: the stored event holds the caller's `details` as given, and the store neither injects nor validates the labels. Keep the same claim posture on every record this run produces.

**A technical review alone is not authorization.** A recorded `@tech-lead` review — even a `SATISFIED` one — leaves the plan unexecuted. If no owner authorization exists for this exact revision, stop and report which record is missing.

If the plan file's digest differs from the approved plan hash, the approval does not carry over. Stop and return the plan to `/maintenance-plan` for a new revision, fresh review, and fresh authorization.

## Build the executable task set

Read the plan's task table and the owner-decisions table. A task is executable only when every one of these holds:

- Its task ID appears in the owner authorization's authorized task IDs.
- Its plan status marks it runnable, and every task in its dependency closure has already been executed or is already complete.
- No owner decision in its dependency closure is still blocking. B1, O-4, B10, and credential-residual are the required decisions; a task whose closure includes one that is still blocking is blocked and must not be executed.

Record the executable set and the blocked set separately, each with its reason. The blocked set is part of the report, not a failure of the run.

**No agent resolves a decision to unblock work.** The executor never selects an option for an owner decision, never records an owner-authored disposition on its own initiative, and never treats a passing check, a panel verdict, a technical review, or an approval claim as a decision. An owner decision stays blocking until the owner rules on it in their own evidence and the three artifacts below agree.

A decision stops blocking dependent work only when three independent artifacts agree. The plan checker resolves a decision only when all three of the following hold:

1. **The plan's own authorization artifact.** The plan carries exactly one `Repository-owner execution authorization` row. Its status cell is not `PENDING`, its scope or evidence cell names that decision ID, its evidence cell holds a real evidence reference, and its claim-status cell labels a recorded claim and never asserts authentication.
2. **The plan's own decision row.** The plan's decision row for that ID is not `[OPEN]`.
3. **The external recorded disposition claim.** External maintenance state holds a matching recorded disposition claim for that ID — `status: disposition-claim-recorded`, `claimStatus: not-independently-verified`, `actorTypeClaim: human`, with a non-empty disposition and a non-empty evidence reference — and the plan's decision row cites that same evidence reference.

When all three hold, the decision stops blocking dependent tasks. It remains a recorded claim, never an authenticated approval. When only some hold, the decision stays blocking and the check names the artifact that is missing.

An owner ruling still lands as a new plan revision, because the decision row and the authorization row live inside the plan: that revision carries the owner's disposition with its evidence, needs a fresh technical review and a fresh owner authorization bound to its own revision and digest, and runs as a new execution run. A plan that marks a decision resolved without the matching external disposition claim is rejected, and a decision whose plan row is still `[OPEN]` is never resolved.

## Capture the before identity

Record the working-tree identity before any task runs.

- The full HEAD object ID, read with the repository's read-only revision lookup (`git rev-parse HEAD`). It should match the plan's `baseRevision`; if it does not, record both and treat the difference as a drift to report.
- The per-file fingerprint of the plan's relevant paths, from the documented read-only manifest command:

```sh
node .agents/scripts/maintenance_plan_check.js manifest \
  --scope maintenance \
  --repo-root <absolute-repository-root> \
  --state-root <caller-supplied-absolute-external-root> \
  --run-id <run-id> \
  --plan <absolute-plan-path> \
  --json
```

Keep the returned `manifest` and `relevantPaths` as the before working-tree identity. If the command reports issues, stop — the relevant-path set cannot be established, so no later evidence can be bound to the plan.

## Record the execution start

Only after the plan is validated and authorized, record:

```sh
node .agents/scripts/maintenance_state.js event --scope maintenance --repo-root <absolute-repository-root> --state-root <caller-supplied-absolute-external-root> --run-id <run-id> --type execution_started --details-json '{"planId":"<plan-id>","planRevision":"<revision>","planHash":"sha256:<digest>","approvalEventId":"<plan_approved-event-id>","authorizedTaskIds":["<task-id>"],"startRevision":"<full HEAD object id>","claimStatus":"recorded-claim","authentication":"not-cryptographically-verified"}' --agent <agent> --session-id <session-id>
```

`approvalEventId` must name the `plan_approved` event for the same plan identity, recorded strictly earlier. Without that link the start event is stored as invalid and no later verification or completion can chain to it.

**Step 0 is complete** only when the session is bound, the plan passes the documented check, the owner authorization for this exact revision is confirmed with its evidence reference, the executable and blocked task sets are written down, the before identity is captured, and the execution start is recorded. No task has run yet.
