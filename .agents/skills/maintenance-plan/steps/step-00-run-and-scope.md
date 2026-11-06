---
step: 0
name: Run and scope
output_contract:
  citations: not-required
---

# Step 0 — Run and scope

Establish the maintenance boundary before reading a run artifact. A missing or mismatched run identity can send planning into product state, so this gate cannot be skipped. Step 0 checks the maintenance session, run status, and artifact root; it does not inspect repository source or tests.

## Required caller inputs

- Absolute repository root.
- Caller-supplied, absolute external state root. Do not use an environment fallback.
- Existing caller-supplied `runId` for which maintenance planning is approved.
- Explicit plan scope and the active agent name.

If any input is absent, ask for it and stop before reading or writing repository files.

## Start and verify the session

Choose a fresh, never-reused `sessionId` for this invocation. The first command is:

```sh
node .agents/scripts/maintenance_session.js --scope maintenance --agent <agent> --repo-root <absolute-repo-root> --state-root <caller-supplied-absolute-external-root> --run-id <caller-supplied-run-id> --session-id <fresh-unique-session-id>
```

Stop if the command rejects the root or run. Do not call product session startup, shared worktree helpers, or any fallback.

Check the run status and the allowed artifact root:

```sh
node .agents/scripts/maintenance_state.js status --scope maintenance --repo-root <absolute-repo-root> --state-root <caller-supplied-absolute-external-root> --run-id <caller-supplied-run-id>
node .agents/scripts/maintenance_state.js artifact-root --scope maintenance --repo-root <absolute-repo-root> --state-root <caller-supplied-absolute-external-root> --run-id <caller-supplied-run-id>
```

Continue only when all of these hold:

- Startup output reports `scope: maintenance`, the exact supplied `runId` and `sessionId`, the exact caller-supplied external root, and an artifact root equal to `artifacts/output/maintenance/<run-id>` under the supplied repository root.
- The helper accepts the external root as canonical, non-symlink, and disjoint from the repository. The artifact-root command returns the same run-specific path.
- Status names the same `runId`, has no lifecycle issues, and includes an approval-recorded entry with an evidence reference for this maintenance run. Treat that entry as a recorded, unverified claim only; it does not authorize execution of a later plan.
- Status includes a T005 completion disposition with an evidence reference. This is also a recorded claim; Step 1 must still verify the migrated artifacts and their internal consistency.

If any status field is absent, conflicting, or points elsewhere, preserve the result and stop. Do not create an event to manufacture approval or mark the run owner-approved.

## Lock the boundary

Record the exact `runId`, `sessionId`, external root, and returned artifact root for this session. For all remaining steps:

- Read and write maintenance artifacts only under that exact artifact root. Read and write session/run state only under the explicit external state root through maintenance-state tooling.
- Step 1 may inspect repository sources read-only only after reconciling the maintenance inputs, and only at exact paths linked from `maintenance-work-items.md` or required to verify a named finding or estimate. This covers relevant source, test, spec, baseline, and script files/sections; do not broad-scan unrelated directories. Record exact `path:line` or test name and the full revision/tree identity checked. Do not edit or execute these files as part of planning.
- Never read or write product `artifacts/output/pipeline-state.json`, `artifacts/output/sprint-status.yaml`, `artifacts/memory/project-context.md`, `artifacts/memory/**`, `.agents/state/**`, product session summaries, or unrelated product output. The read-only source exception does not permit product-state access.
- External/web sources not reopened remain inherited and unverified unless separately authorized.

**Step 0 is complete** only after identity and both roots match. No plan artifact is written in this step.
