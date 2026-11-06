---
step: 1
name: Load and reconcile inputs
output_contract:
  citations: not-required
---

# Step 1 — Load and reconcile inputs

Read only the required files beneath the artifact root returned by Step 0:

- `maintenance-bootstrap-plan.md`
- `maintenance-brief.md`
- `maintenance-spec.md`
- `maintenance-work-items.md`
- `maintenance-plan-contract.md`

Do not inspect repository source or tests until the five run-root inputs have been reconciled below.

## Reconcile the run inputs

1. Confirm all five files exist beneath the exact run root; reject symlinks or paths resolving outside it.
2. Confirm the bootstrap plan identifies the same maintenance track and preserves the boundary: external state, one run-specific artifact subtree, no product state or phase transition, and separate plan creation from execution authorization.
3. Compare the external T005 completion claim with the actual migrated brief, spec, and work-items files. Keep the prior comparison claim labelled unverified; do not reopen the removed `03-strategy` sources.
4. Check the internal ID and trace links: `FR-###`, `NFR-###`, `CAP-#`, `MS-2.x`, `US-###`, and `AC-*`. Confirm that capability-to-requirement-to-story mappings resolve within these inputs and that local Markdown links point to files/anchors beneath the run root.
5. Reconcile B1, O-4, B10, and `credential-residual` against both the inputs and external status. Keep all four `[OPEN]`. If any record says otherwise without exact owner-authored evidence, preserve the conflict and halt; do not choose a policy or infer an exception.
6. Read the plan contract as the required record shape, but preserve its stated draft/unapproved status. A draft contract is not owner authorization.

## Inspect exact repository sources (read-only)

Only after the run inputs and their IDs/local links reconcile without a blocking conflict:

1. Build a finite source list from exact repository paths linked in `maintenance-work-items.md`. Add another exact repository path only when it is required to verify a named finding or estimate; record that finding/estimate and why the path is needed. Do not search directories to discover candidate files.
2. Open only the relevant files and sections for the linked source, test, spec, baseline, or script references. This is read-only inspection: do not edit files or run tests/scripts. A citation alone does not verify that the current source or test matches.
3. For each opened reference, record the exact repository-relative `path:line` or test name and the full revision/tree identity checked. If the tree is dirty, record a sorted content-hash manifest for relevant files only; do not hash the whole checkout or read product runtime state to construct the identity.
4. Mark a repository source verified/current only after actually opening it at the recorded revision/tree identity. External/web sources and inherited references not reopened remain `NOT REOPENED — inherited/unverified` unless separately authorized.

## Reconciliation record for the plan

In the plan's input table, record each required file, the IDs and local links checked, the result, and any limitation. Separate:

- **Checked within the run inputs:** definitions, internal links, and cross-document ID mappings.
- **Repository sources inspected read-only:** exact `path:line` or test name, the finding/estimate supported, and the revision/tree identity checked.
- **Inherited/unverified:** external/web references not reopened, and repository citations not actually opened at the recorded revision.
- **Blocked/conflicting:** missing IDs, broken local links, conflicting statuses, or absent evidence.

Do not create a separate reconciliation file. If an ID or local-reference conflict cannot be resolved from the allowed inputs, stop before writing a plan revision and identify the exact conflicting rows for the caller.

**Step 1 is complete** when all five inputs are accounted for, the ID/link check has a recorded result, any permitted source inspection is tied to exact references and a revision/tree identity, inherited references are clearly labelled, and the four owner decisions remain open.
