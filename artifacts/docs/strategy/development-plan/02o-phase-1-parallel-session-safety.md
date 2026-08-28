# Parallel Session Safety & Shared-Memory Serialization (02o)

**Decision:** Make concurrent agent sessions safe by default. Today, two sessions writing one working tree can silently destroy each other's records — this happened live on 2026-08-28 (a second window overwrote `session-summaries/latest.md` mid-review and renumbered the 02-series while another epic was executing) and caused the 2026-08-14 02f/02g record corruption. This epic makes every shared-state write **serialized (lock-protected), attributed (session-stamped), and recoverable (append-only + derived views)**, and codifies the parallel-work protocol so parallel workers multiply throughput instead of destroying memory.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 14th in the `02*` series (next free number after `02n`). **Sequencing recommendation: execute BEFORE `02l`.** Rationale: every remaining epic (02l included) writes shared state; this epic is 8h and removes the hazard class for all of them. No dependency on 02l.

**Relationship to 02l (observability):** complementary layers. 02o is the **lock** (prevents damage); 02l is the **camera** (records what happened). 02o ships independently on the 02i lock primitive; after 02l lands, its spans (`session_id`, `trace_id`, parent/child propagation) upgrade 02o's collision detection from timestamp-heuristic to trace-verified. Integration point recorded in 02o.4; not a build dependency. This plan also implements the "single-owner rule for shared schemas/scripts" recommended by the 2026-08-23 review of 02l.

**Gate Reviews:** PENDING — roundtable to be scheduled before execution; owner (Chris) approves scope.

---

## 1. Mandate

**Mandate (from Chris, 2026-08-28):** "Add a plan in the right phase to handle agent parallel workers so they don't destroy the memory." Trigger: live collision during the 02k review roundtable — foreign session clobbered `latest.md`, renumbered the dev-plan series, and edited skills inside an uncommitted tree holding another session's work.

### 1.1 In scope

| Item | Detail |
|---|---|
| Lock coverage | Verify + wire `.agents/scripts/lib/lock.js` (02i primitive) around ALL shared-state writers: `memory_write.js`, `orchestrator_state.js session-write`, `memory_filter.js` sync paths, `step-audit.json` appends |
| `latest.md` redesign | Replace last-writer-wins hand-written `latest.md` with a **generated view** derived from append-only `history.md` (regenerated at session start); direct writes deprecated |
| Session provenance | Every memory entry + session row stamped with `session_id` (host+pid+boot-time hash) |
| Collision detection | `drift_monitor.js` flags interleaved writers (two session_ids on one shared file inside a window); emits telemetry event (02l hook point) |
| Plan-file reservation | Dev-plan numbers claimed by committing a stub first; `development-plan/README.md` index is the allocation record |
| Protocol | GUARDRAILS section: one epic per window; `git worktree` per session for true parallelism; commit-per-build-item |

### 1.2 Out of scope

| Item | Rationale |
|---|---|
| Real-time multi-writer merge logic (CRDT/operational transforms) | Over-engineering; file-based engine needs serialization + attribution, not merging |
| 02l span pipeline | Owned by 02l; 02o only defines the hook point |
| History rewriting for past collisions | Correct-forward discipline (02n owns reconciliation) |
| Cross-machine distributed locking | Single-repo scope; hostname-scoped session_id is sufficient provenance |

---

## 2. First Principles

1. **Shared state is either locked or append-only — never last-writer-wins.** Every destroyed record in this repo's history traces to an unprotected shared file.
2. **Attribution before arbitration.** A write without a session_id cannot be arbitrated, reverted, or audited.
3. **Derived views, authoritative logs.** `latest.md` is a convenience view of `history.md`, not a second source of truth.
4. **Reuse the 02i lock.** `lib/lock.js` is shipped and tested (mkdir-atomic, stale-takeover, PID-liveness, ownership release). Do not build a second locking mechanism.
5. **The protocol is enforceable, not advisory.** Every rule lands as a script check or an eval, per the 08-23 ruling: "deterministic may only describe behavior backed by an on-disk script with a named test."

---

## 3. Root Cause: The 2026-08-28 Collision (verified)

1. Two sessions, one working tree, zero mutual exclusion → interleaved writes to `artifacts/memory/session-summaries/latest.md` (last-writer-wins by design).
2. Dev-plan filenames are allocated by convention only → concurrent session renumbered 02k/02m/02n mid-execution; cross-references in other plans/memory went stale instantly.
3. Uncommitted trees make attribution impossible → cannot tell which session produced which byte; commit-per-build-item was skipped.
4. No detection: the collision was discovered by a human reading diffs, not by the engine.

---

## 4. Build Items (8h)

| ID | Task | Est | Verify |
|---|---|---|---|
| 02o.1 | Lock coverage: audit all shared-state writers; wire `lib/lock.js` around `memory_write.js`, `orchestrator_state.js session-write`, step-audit appends where missing | 1h | Parallel probe: 8 concurrent `memory_write.js` processes → all entries present, zero corruption |
| 02o.2 | `latest.md` becomes a generated view: `session_start.js` derives it from the last `history.md` entry; `orchestrator_state.js session-write` appends history only; direct latest.md writes removed | 1.5h | `latest.md` matches history tail after regeneration; no code path writes it directly |
| 02o.3 | Session provenance: `session_id` (hostname+pid+boot hash) stamped into every memory entry and session row via the sanctioned pipeline | 1h | Every new entry carries `session_id`; grep-verified |
| 02o.4 | Collision detection: `drift_monitor.js` detects two session_ids on one shared file inside the window → warning + guidance; emits telemetry event (02l span hook point) | 1.5h | Forced interleaved-write probe → warning logged with both session_ids |
| 02o.5 | GUARDRAILS "Parallel Session Protocol" (one epic per window; worktree-per-session for true parallel; commit-per-build-item; plan-number reservation via committed stub + README index) | 1h | Section live; index updated |
| 02o.6 | Evals + tests: `evals/suites/invariants/parallel-safety.json` + N-writer regression test in `tests/` | 1.5h | Suite passes; suite fails when lock is bypassed (falsifiability check) |

**Total: 8h serial.** Single-writer execution; commit-per-build-item mandatory.

---

## 5. Definition of Done

1. **Zero-loss parallel writes:** the N-writer probe passes (8 concurrent writers, all entries survive, lock serializes).
2. **No last-writer-wins state:** `latest.md` is derived; the engine contains no direct-write path to it.
3. **Full attribution:** every new memory row carries `session_id`.
4. **Collision is loud:** interleaved writers produce a detection warning naming both sessions.
5. **Falsifiable eval:** the parallel-safety suite fails when the lock is bypassed (proven by a planted-bypass probe, R0.2 pattern).
6. **Protocol codified:** GUARDRAILS section + dev-plan README index live; existing suite green (168+ tests).

---

## 6. Risk Register

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R56 | Concurrent sessions corrupt shared state (occurred 2026-08-14, 2026-08-28) | High (until 02o) | High | This epic is the primary mitigation |
| R58 | Lock contention deadlock on stale holders | Low | Med | 02i lock already has grace-period stale takeover + PID-liveness eviction; add probe |
| R59 | Derived `latest.md` breaks consumers expecting hand-written format | Med | Low | Keep output format identical; consumers read, never write |

---

*Author: @developer (Rex) at Chris's request, 2026-08-28, from the 02k review roundtable collision evidence. Gate review PENDING — do not execute before roundtable + owner approval.*
