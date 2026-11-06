---
step: 3
name: Review and authorization
output_contract:
  citations: not-required
---

# Step 3 — Review and authorization

Review the exact frozen plan revision. Technical quality and repository-owner permission are different decisions; neither substitutes for the other.

## Check plan readiness

Before review, verify that the plan digest still matches the frozen file and that all IDs, local references, task estimates, first actions, done evidence, verification, dependency-table/graph edges, parallelism, and risk entries are complete.

Confirm the plan's `dirtyManifest` still matches the computed fingerprint for its relevant paths. If the working tree moved after the manifest was generated, the manifest is stale: regenerate it with the documented manifest command, recompute the digest, and re-run the check. A stale or mismatched manifest fails closed — it is never patched by hand to make a check pass.

Run the documented plan-check command for this exact `runId` and plan path:

```sh
node .agents/scripts/maintenance_plan_check.js check \
  --scope maintenance \
  --repo-root <absolute-repository-root> \
  --state-root <caller-supplied-absolute-external-root> \
  --run-id <run-id> \
  --plan <absolute-plan-path> \
  --json
```

It is read-only. Retain the exact command, raw output, exit status, run ID, plan revision, and plan digest in the maintenance state evidence.

A missing, failed, unscoped, or mismatched check blocks review readiness. Keep the plan `DRAFT` and record it as not review-ready.

**The checker result is a recorded claim, not authorization.** The command always emits `executionAuthorized: false`. It does not approve a plan, does not grant permission to execute, and does not emit a gate verdict. A passing check says only that one exact revision satisfies the record contract.

## Record technical review

Request `@tech-lead` to review the exact `runId`, `planId`, revision, and digest. The review must address scope, sources, estimates, task first actions/done evidence, code revert-proof tests, decision blockers, dependency agreement, parallelism, and risks.

Record the result and exact evidence reference in the plan's external review record, then add a `verification` event with `reviewKind: technical-plan-review`, reviewer `@tech-lead`, result, plan identity, digest, and evidence reference. Label it `claimStatus: recorded-claim` and `authentication: not-cryptographically-verified`. A technical review is not owner authorization. If the reviewer is unavailable or requests changes, leave review pending/changes-requested; any plan edit requires a new revision and fresh review.

A technical review on its own never authorizes execution, whatever its outcome. Even a `SATISFIED` review leaves the plan unexecuted until the separate repository-owner authorization below exists.

## Request separate repository-owner authorization

Only after technical review is recorded, present the exact plan revision, digest, scope, and authorized task IDs to the repository owner. Ask for an explicit written execution authorization or a rejection/changes request. No answer, a bootstrap-plan approval, an agent's recommendation, or technical review is not authorization.

If explicit owner-authored evidence identifies the same run, plan revision, digest, scope, and task IDs, record it as an unverified claim with its exact evidence reference. Then, and only then, record:

```sh
node .agents/scripts/maintenance_state.js event --scope maintenance --repo-root <absolute-repo-root> --state-root <caller-supplied-absolute-external-root> --run-id <run-id> --type plan_approved --details-json '{"approvalKind":"repository-owner-execution-authorization","planId":"<plan-id>","planRevision":"<revision>","planHash":"sha256:<digest>","authorizedTaskIds":["<task-id>"],"draftEventId":"<plan_drafted-event-id>","evidenceRef":"<exact-owner-authored-evidence-reference>","claimStatus":"recorded-claim","authentication":"not-cryptographically-verified"}' --agent <agent> --session-id <session-id>
```

The state store reads the plan identity from `planId`, `planRevision`, and `planHash`, and requires `evidenceRef`. `planHash` carries the plan's `planDigest` value verbatim, `planRevision` carries the plan's revision as the same string the plan file records, and `draftEventId` names the `plan_drafted` event for the same plan identity, recorded strictly earlier. Without that chain the approval is stored as an invalid event and nothing downstream can reference it.

**The recorded approval is a claim, not authentication.** The `status` view presents the approval with `claimStatus: recorded-claim` and `validation: not-cryptographically-verified`. Those labels are presented by the status view, not stored on the event: the stored event holds the caller's `details` as given, and the store neither injects nor validates the labels. The owner evidence reference is what makes it checkable — read it, confirm it names the same run, plan revision, digest, scope, and task IDs, and keep the claim posture on every downstream record. A state event alone never establishes that the owner agreed.

If exact owner evidence is absent, keep authorization `PENDING`, do not emit `plan_approved`, and leave the plan in `DRAFT`. Do not resolve B1, O-4, B10, or `credential-residual` unless their separate owner-authored decisions are explicit; those decisions remain independent blockers until the owner's ruling is recorded in three places.

A decision stops blocking dependent work only when all three artifacts agree:

1. The plan's `Repository-owner execution authorization` row names that decision ID, is not `PENDING`, carries a non-empty evidence reference, and labels a recorded claim without ever asserting authentication.
2. The plan's decision row for that ID is no longer `[OPEN]` and cites the owner's evidence reference.
3. External maintenance state holds a matching recorded disposition claim for that ID — `status: disposition-claim-recorded`, `claimStatus: not-independently-verified`, `actorTypeClaim: human`, with a non-empty disposition and evidence reference.

When all three hold the decision stops blocking dependent work and remains a recorded claim, never an authenticated approval. When only some hold, the decision stays blocking and the check names the missing artifact. Record the owner's ruling as an `owner_decision_disposition` event carrying `decisionId`, `actorType: human`, `disposition`, and `evidenceRef`, then cite that same `evidenceRef` in the plan's decision row.

## Close the loop

Run `maintenance_state.js status` for the same `runId`. Confirm that technical review and owner authorization, if recorded, reference the same plan digest and that all records remain labelled as claims. If the file changed after either review, mark the old records stale and return to Step 2 for a new revision.

A new plan revision needs a fresh technical review and a fresh owner authorization bound to its own revision and digest. The earlier records do not transfer, and no earlier approval authorizes the new revision.

Never execute tasks, modify product sources, claim authenticated approval, or report gate-green here. A maintenance state transition is not permission to execute and is not a gate verdict.
