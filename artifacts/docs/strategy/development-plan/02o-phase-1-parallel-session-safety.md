# Parallel Session Safety & Shared-Memory Serialization (02o)

**Decision:** Make concurrent agent sessions safe by default. Today, two sessions writing one working tree can silently destroy each other's records — this happened live on 2026-08-28 (a second window overwrote `session-summaries/latest.md` mid-review and renumbered the 02-series while another epic was executing) and caused the 2026-08-14 02f/02g record corruption. This epic makes every shared-state write **serialized (lock-protected), attributed (session-stamped), and recoverable (append-only + derived views)**, and codifies the parallel-work protocol so parallel workers multiply throughput instead of destroying memory.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 14th in the `02*` series (next free number after `02n`). **Sequencing recommendation: execute BEFORE `02l`.** Rationale: every remaining epic (02l included) writes shared state; this epic is 8h and removes the hazard class for all of them. No dependency on 02l.

**Relationship to 02l (observability):** complementary layers. 02o is the **lock** (prevents damage); 02l is the **camera** (records what happened). 02o ships independently on the 02i lock primitive; after 02l lands, its spans (`session_id`, `trace_id`, parent/child propagation) upgrade 02o's collision detection from timestamp-heuristic to trace-verified. Integration point recorded in 02o.4; not a build dependency. This plan also implements the "single-owner rule for shared schemas/scripts" recommended by the 2026-08-23 review of 02l.

**Gate Reviews:** **[GATE CLEARED 2026-08-28]** — compact roundtable, 3 seats, all `[PIVOT]` (no KILL): amendments below incorporated into the plan text before execution. Owner approval: Chris ruled 02o before 02l (active-decisions.md [OWNER] 2026-08-28).
- **@architect [PIVOT]:** session identity via pid is defective (memory_write.js is a fresh process per write) → session-state file `.agents/state/session-current.json` (written by session-start, read by writers, `unattributed` fallback, harness env-var preferred where present). 02o.2 must also amend the docs that instruct direct `latest.md` overwrites (`.agents/agents/memory-controller.md:321,408`, `.agents/skills/round-table/SKILL.md:167`) — those instructions ARE writer paths. Root-cause correction: orchestrator mutating commands already hold a global lock (orchestrator_state.js:1224-1237, since 02i) — the 2026-08-28 clobber went through persona-instructed direct writes, not the pipeline. Lock must scope dedupe+append atomically (TOCTOU).
- **@tech-lead [PIVOT]:** `memory_filter.js:44,62` writes latest.md/history.md on every READ — that write path must be removed and 4 consumers migrated (witness.js, session_checkpoint.js, delegation_audit.js, compaction_guard.js). Re-estimate: ~11h total. Reorder: provenance (02o.3) before derived view (02o.2). 02o.4 relocated OUT of security-owned drift_monitor.js into a new `collision_detector.js`. 02o.5 needs a named reservation-check script + test. 02o.6 adds lock-timeout rejection semantics + failure-path eval. Regression set: test_memory_fixes F4/F9/F10, test_memory_consolidation, test_cli, run-all ≥168.
- **@qa-engineer [PIVOT]:** 8-writer probe must assert 4 corruption modes (lost entry / duplicate / torn structure / exact-once membership), spawn()-parallel per test_memory_fixes F4 precedent; memory_write.js header-init atomic-rename can wipe a concurrent append (verified unlocked today). Falsifiability spelled out: sandbox copy of scripts, stub lock.js pass-through, re-run probe, assert ≥1 corruption mode trips under bypass. DoD #2 = grep-invariant test (no writeFileSync/appendFileSync targeting latest.md under .agents/scripts/**) + behavioral regeneration check.

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

## 3. Root Cause: The 2026-08-28 Collision (corrected forward per gate review)

1. Two sessions, one working tree, zero mutual exclusion on the paths that matter. **Corrected:** the orchestrator's own mutating commands (session-write etc.) have been globally locked since 02i (`orchestrator_state.js:1224-1237`) — the collision came through the UNLOCKED paths: persona/skill docs instructing agents to hand-write `latest.md` (`memory-controller.md:321,408`, `round-table/SKILL.md:167`), `memory_filter.js` writing `latest.md`/`history.md` on every read, and `memory_write.js` (no lock; header-init atomic-rename can wipe a concurrent append).
2. Dev-plan filenames allocated by convention only → concurrent renumbering made cross-references stale instantly.
3. Uncommitted trees make attribution impossible.
4. No detection: discovered by a human reading diffs, not by the engine.

---

## 4. Build Items (11.5h, amended per gate review — order fixed: provenance before derived view)

| ID | Task | Est | Verify |
|---|---|---|---|
| 02o.1 | Lock `memory_write.js`: dedupe+append atomic under the global lock (lib/lock.js); step-audit appends under lock; lock-timeout rejection = loud loss + exit 1 (never silent) | 1.5h | 8-writer parallel probe → 4 corruption modes asserted absent |
| 02o.2 | Session provenance: `session_start.js` writes `.agents/state/session-current.json`; writers read it (env-var preferred, `unattributed` fallback); `session_id` stamped in memory entries + session rows | 1.5h | Every new entry carries session_id; grep-verified |
| 02o.3 | Derived latest.md: REMOVE `memory_filter.js` write paths (:44,62); remove orchestrator session-write latest.md write; `session_start.js` regenerates from history tail (byte-format identical); migrate consumers (witness.js, session_checkpoint.js, delegation_audit.js, compaction_guard.js); amend the doc instructions that hand-write it (memory-controller.md:321,408; round-table/SKILL.md:167) | 2.5h | grep-invariant: no writeFileSync/appendFileSync targeting latest.md under .agents/scripts/**; delete latest.md → session-start regenerates |
| 02o.4 | New `collision_detector.js` (NOT security-owned drift_monitor.js): ledger of file→session→ts from memory writes; two session_ids on one shared file inside window → warning naming both + telemetry event hook (02l span point) | 2.5h | Forced two-writer probe → both session_ids named in warning |
| 02o.5 | GUARDRAILS "Parallel Session Protocol" + dev-plan README reservation index + named reservation-check script + test | 1.5h | Section + script + test live |
| 02o.6 | Evals/tests: 4-mode parallel corruption test (spawn-parallel, F4 precedent) in tests/; falsifiability = sandbox script copy + stub lock.js pass-through + rerun probe + assert ≥1 corruption mode trips; failure-path eval (lock timeout → exit 1) | 2h | Suite fails under planted bypass |

**Total: 11.5h serial.** Single-writer execution; commit-per-build-item mandatory. Regression gate per item: `tests/run-all.js` green (≥168), specifically test_memory_fixes F4/F9/F10, test_memory_consolidation, test_cli.

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
