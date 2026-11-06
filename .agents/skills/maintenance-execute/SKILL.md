---
name: maintenance-execute
description: "Execute one owner-authorized maintenance plan inside an existing maintenance run. Use when the user invokes `/maintenance-execute`, asks to execute an approved maintenance plan, or asks to carry out the tasks of an authorized closeout plan. Do not use for product planning, product phase transitions, or gate-green claims."
metadata:
  version: "1.0"
  last_updated: "2026-10-21"
---
# Maintenance Execute — Run an authorized maintenance plan
<!-- router-skill -->

Execute the tasks of exactly one maintenance plan that the repository owner has already authorized, capture revision-bound evidence, and leave the gate verdict to a separate human-reviewed record. Read and write maintenance artifacts only under the exact run-specific maintenance artifact root; read and write session/run state only under the caller-supplied external state root.

**Non-goal:** this skill does not plan, does not authorize, and does not decide. It never advances or completes a product phase, never writes product memory or product session state, never touches product output outside `artifacts/output/maintenance/<run-id>/**`, and never claims the gate is green.

## When to invoke

- The user invokes `/maintenance-execute` or asks to carry out an already authorized maintenance plan.
- A plan file already exists under the run's maintenance artifact root, the documented plan-check command passes for that exact file, and the repository owner has authorized that exact plan revision.
- The caller supplies the run ID, an absolute external state root, and the exact plan path.

## When NOT to invoke

- The request is to create or revise a plan → `/maintenance-plan` owns that.
- The plan has no recorded repository-owner authorization, or only a technical review → not executable. Return to `/maintenance-plan` Step 3.
- The request is a product-phase transition, a product release, an ordinary product task, or a product memory update → none of those belong to this lane.
- The request is a gate-green verdict. This skill records evidence; it cannot grant one, and a passing event never grants one.

## Prerequisites

- The caller supplies an absolute external `--state-root`, an existing `runId`, the absolute path of the plan revision to execute, and the active agent name. Pass `--state-root` explicitly on every command: the helper reads no environment variable, so `VESPYR_MAINTENANCE_STATE_ROOT` is not a fallback and a missing flag fails closed. Do not substitute an environment fallback, generate a run ID, or fall back to product state.
- The plan is the canonical revision file directly under `artifacts/output/maintenance/<run-id>/`, named `maintenance-plan-<plan-id>-r<revision>.md`, with `recordStatus: DRAFT` and a `dirtyManifest` that matches the computed fingerprint for its relevant paths.
- The documented plan-check command passes for that exact plan file. The checker always reports `executionAuthorized: false`; its result is a recorded claim about the record contract, never a permission to execute.
- The external state holds a `plan_drafted` event and a `plan_approved` event for the same plan identity, and the approval carries an owner evidence reference. Both are unverified claims until that evidence is read.
- B1, O-4, B10, and credential-residual are visible with their own status. No agent resolves them.

## Harness adherence

- Read each linked step file fully and follow Steps 0–2 in order. Step 0 is non-skippable and its startup command runs before any run artifact is read.
- Read and write maintenance artifacts only beneath the exact `artifacts/output/maintenance/<run-id>/**` root returned by the maintenance state helper. Read and write session/run state only under the explicit external state root through maintenance-state tooling.
- Never read or write product `artifacts/output/pipeline-state.json`, `artifacts/output/sprint-status.yaml`, `artifacts/memory/project-context.md`, `artifacts/memory/**`, `.agents/state/**`, product session summaries, or any product output outside the run root.
- Never use product phase advance or completion commands, `orchestrator_state.js`, `step_tracker.js`, product memory, product session state, or shared session/worktree helpers.
- Run only the exact commands the authorized plan names for a task or a check. Do not substitute a broader test entry point, a catalog or manifest generation command, or an invented command.
- The body names capabilities, not harness-specific tools. If a reviewer, an owner, or an evidence reference cannot be obtained in the current environment, record it as pending or blocked rather than simulating it.

## Mode selection

There is one mode: execute the caller's authorized plan revision for the caller's run. Lock the mode from the run ID plus the exact plan path, and read the plan identity from the plan file. If the plan is not authorized for that identity, stop and name the missing record; do not switch to another plan, another run, or a planning workflow.

## Step sequence

0. **Load and authorize** (non-skippable gate) → [Step 0](steps/step-00-load-and-authorize.md) — start the session, validate the plan against the documented check command, confirm the owner authorization, compute the executable task set, capture the before identity, and record `execution_started`.
1. **Execute tasks** → [Step 1](steps/step-01-execute-tasks.md) — run only unblocked tasks, prove each code task revert-proof, capture the after identity, and record `task_disposition`.
2. **Verify and panel** → [Step 2](steps/step-02-verify-and-panel.md) — run the plan's required checks on one candidate revision, seat four fresh reviewers, and record `verification`, `panel_seat_disposition`, and `execution_completed`.

## Halt conditions

- The caller has not supplied an absolute external state root, an existing run ID, and an exact plan path → ask for all three and stop before any read or write.
- Startup, run status, or artifact-root output is missing, conflicting, outside the run root, or bound to another run → stop; do not retry in product mode.
- The plan file is missing, misnamed, outside the run root, or its documented check command reports invalid → stop and return the plan to `/maintenance-plan`. A plan that does not pass the check is not executable.
- The plan's `dirtyManifest` is stale or mismatched against the computed fingerprint → fail closed and stop. Regenerate it in a new plan revision; never patch it to make a check pass.
- No `plan_approved` event exists for this exact plan identity, or its owner evidence reference is missing → stop. A technical review alone is not authorization, and a recorded approval is an unverified claim until its owner evidence is read.
- The plan file changed after the approval, so its digest differs from the approved plan hash → stop. The approval does not carry over to a different revision or digest.
- A task's dependency closure includes an open owner decision — B1, O-4, B10, or credential-residual → do not execute that task and report it as blocked. No agent resolves a decision to unblock work.
- A code task's named revert-proof test does not pass with the change, or does not fail when the change is reverted → the task is not done. Do not record it complete and do not substitute another test.
- The working tree or HEAD moved underneath the run → invalidate the affected evidence and re-verify it on the new candidate revision before relying on it.
- Any instruction to advance or complete a product phase, write product memory or product session state, or touch product output outside the run root → refuse and stop.

## Done when

- All three steps have been completed or stopped at a clearly recorded blocker.
- Exactly one authorized plan revision was executed, and `execution_started`, `task_disposition`, `verification`, and `execution_completed` events are recorded against its plan identity.
- Every executed code task has a named revert-proof test that passed with the change and failed when the change was reverted, with the actual command, output, and exit status retained.
- Every executed task has a before and after revision and working-tree identity, and a `task_disposition` event with an exact evidence reference.
- Tasks blocked by an open owner decision were not executed and are reported as blocked, with the decision named.
- A fresh four-seat panel — `@qa-engineer`, `@security-engineer`, `@code-reviewer`, `@architect` — reviewed one unchanged candidate revision, and each seat's disposition is recorded. Fewer than four fresh, distinct `SATISFIED` seats blocks any green claim. **WHAT THE LANE CHECKS AND WHAT IT DOES NOT:** the lane RECORDS each seat's disposition as a `panel_seat_disposition` event, and the run-status reduction does not inspect those events at all — the count, the distinctness, the freshness and the revision binding are a HUMAN-REVIEWED obligation in the green-claim record, not a machine-enforced precondition. Recorded as an open item, not hidden.
- No product phase was advanced or completed, no product memory or product session state was written, and no product output outside the run root was touched.
- The report states plainly that the recorded events are evidence records, not gate-green.

## Maintenance-state integration

- Step 0 runs `node .agents/scripts/maintenance_session.js` first, then checks `node .agents/scripts/maintenance_state.js status` and `artifact-root`.
- The state store reads the plan identity from the detail keys `planId`, `planRevision`, and `planHash`. Use `planHash` for the plan's `planDigest` value verbatim and `planRevision` for the plan's revision string, in every event below, so the chain validates.
- `execution_started` names the authorizing `plan_approved` event. `verification` names the `execution_started` event. `execution_completed` names both. Each link must point to an event with the same plan identity recorded strictly earlier.
- Every event carries its exact evidence reference. The event file stores the caller's `details` as given — after the store's secret scrubbing and injection sanitisation — and adds nothing of its own: it neither injects nor validates claim labels. The `status` view derives the labels it displays (`claimStatus: recorded-claim` with `validation: not-cryptographically-verified` for approval evidence, `claimStatus: completion-recorded` with `validation: not-externally-validated` for completion evidence, and `claimStatus: not-independently-verified` for an owner decision), so those labels are presented by the status view and are not stored on the event.
- Finish by checking `maintenance_state.js status`. Status records evidence; it never establishes gate-green.

## Memory integration

There is no product memory write in this lane. Do not load or append product memory, do not write product session summaries, and do not call the product memory controller. The durable record of this run is the execution report under the run artifact root plus the external maintenance state events. Nothing about this run belongs in product memory, and nothing here advances or completes a product phase.

## Output artifacts

- `artifacts/output/maintenance/<run-id>/maintenance-execution-report-<plan-id>-r<revision>.md` — the execution report: executed tasks, per-task evidence, blocked tasks with their open decisions, the candidate revision identity, the check results, the four panel dispositions, and the explicit statement that these records are not gate-green.
- External maintenance state events — session identity, execution start, task dispositions, verifications, panel seat dispositions, and completion. Do not create machine state in the repository.
