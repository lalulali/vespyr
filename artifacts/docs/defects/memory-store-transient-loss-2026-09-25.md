# Memory Store Rename and Restore — Investigation Record (Resolved)

**Date:** 2026-09-25
**Status:** `[CONFIRMED]` — owner confirmed a manual folder rename and restore caused the observed state
**Owner decision:** Treat the disappearance as resolved; keep the separate line-446 witness defect open
**Affected area:** `artifacts/memory/`
**Production handoff:** Remains `BLOCKED`

## Finding

The memory folder had been manually renamed before the one-file state was observed, and Chris later restored it. This explains both the temporary directory state and the return of the full store. No sanctioned memory-writer or compactor defect is indicated.

The original observations are retained below as an audit trail. The earlier concurrent-process hypothesis is withdrawn.

## Owner correction — 2026-09-25

Chris clarified that the rename and restore were intentional manual filesystem operations. The incident is therefore resolved as an operator action, not a product or memory-pipeline failure. The malformed entry at `artifacts/memory/active-decisions.md:446` is a separate pre-existing witness defect and remains open.

## Timeline

| Time | Observation | Confidence |
|---|---|---|
| 2026-09-25 14:47:19 | Immediately after the sanctioned `memory_write.js` call, a directory check showed only `active-decisions.md` at 665 bytes. The owner later clarified that the memory folder had already been renamed. | `[CONFIRMED]` operator clarification explains the state |
| 2026-09-25 14:48–16:10 | The renamed memory folder was observed under a temporary-looking path during the investigation, then the owner restored it. | `[CONFIRMED]` operator clarification |
| 2026-09-25 16:10:48 | The owner’s restore returned the live `artifacts/memory/active-decisions.md` to 141,227 bytes. The other memory files were present again. | `[CONFIRMED]` |
| 2026-09-25 16:39+ | `witness.js check --dir artifacts/memory` checked 11 targets: 10 passed and 1 failed. No memory lock, stale stolen lock, worktree, or open file handle was present at the final check. | `[CONFIRMED]` |

## Current state

- `artifacts/memory/active-decisions.md`: 783 lines, 17,067 words, 141,227 bytes.
- The A7/A8 owner decision is present at `artifacts/memory/active-decisions.md:779`.
- The current witness failure is limited to the header at line 446, which lacks the required `[date: YYYY-MM-DD]` tag.
- The current memory store is present. Restoration was performed by Chris; no agent restoration was performed.

## Code-path audit

| Path | Observed behavior | Conclusion |
|---|---|---|
| `.agents/scripts/memory_write.js:242-285` | Resolves one allow-listed target, appends one entry, appends the write ledger, and invokes the compaction guard. | No sibling-file deletion path found |
| `.agents/scripts/compaction_guard.js:43-98` | Reads the target and reports threshold status. | Read-only for the target; no directory mutation |
| `.agents/scripts/orchestrator_state.js:54-167` | Compaction reads and rewrites `active-decisions.md` and may write the archive. It does not remove the other memory files. | Not invoked by the observed `memory_write.js` call |
| `.agents/scripts/worktree.js:69-123` | Can replace empty/placeholder shared directories and create memory symlinks in a worktree. | No current worktree was present; no evidence links this event to worktree creation |

These observations do not indicate a memory-pipeline defect. The owner’s manual rename and restore explain the directory transition; the earlier concurrent-process hypothesis is withdrawn.

## Freeze manifest

The following hashes were captured from the restored live store. They are a detection baseline, not a restoration source.

| File | SHA-256 |
|---|---|
| `active-decisions.md` | `708454b23565a471e2d08b940d0ca40f0428b18d2915d3935df0d4269d3a086a` |
| `archive/2026-Q3/active-decisions.md` | `4c27e37e460738259f1532f33a26857306ee984cad7d035749774f483701c963` |
| `archive/2026-Q3/lessons-learned.md` | `a6751d74ad85af564e9f8b29c86a5dd9450c6af9d47dec4ec3b8a568f0d9cd02` |
| `archive/index.ndjson` | `b6c238e5346b93a6239511a5ba9e4a58425294d5acac7d7fc3ed9d1ef778b75b` |
| `blockers-and-risks.md` | `cd5b5c35643ec37961e4943433845c1dfd27f6fb565f9797e77767496e27b71b` |
| `lessons-learned.md` | `e903989567a60d8a6ecca574d1ea2e2093936d90a350d949ee2a7e9ec0321ed6` |
| `patterns-and-conventions.md` | `50c26940fea1377f0157682f90bebfbfafa8c3bfa87e07c4741637208b9410d3` |
| `project-context.md` | `d023136013c4fd307c0b4839a2e542312931462485fe35bbacdf153f4aa5d26f` |
| `quarantine/quarantine-log.json` | `5ce6f57b25c51a53201fc110f01f150df73fde119813e0474bd2613d2ca311e5` |
| `session-summaries/history.md` | `42360f66777607cf5f98e5de55d3eea675d05cddaedc281bc59befee558a7546` |
| `session-summaries/latest.md` | `e6b078890f78a18e0cce5370e93996ba4f1c3e8017114569d9aedb56f057c9e3` |
| `teaching-style.md` | `86d1ffe22d87554bb8a272470b712ca346aa39ccc7fa0ebead44ddea72bb40fc` |

## Containment and next steps

1. No recovery action is required for the rename incident; preserve the current freeze manifest as the detection baseline.
2. Treat future memory-folder renames as explicit filesystem operations and record them before inspecting or repairing the store.
3. The line-446 witness defect is independent. Repair it only through the sanctioned memory-maintainer path or a controlled compaction, then rerun `node .agents/scripts/witness.js check --dir artifacts/memory`.
4. Do not use this incident to authorize production handoff, `/develop`, commit, or push. The reverse-PRD handoff remains blocked by its separate production-boundary decisions.

## Non-actions taken

- No fixture code was changed.
- No production code or contract was changed.
- No commit or push was performed.
- No agent memory restoration or repair was performed; the owner performed the restore.
