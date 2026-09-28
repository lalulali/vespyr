# Phase 3a — Observability Engine & Macro-Telemetry Surface (04a)

**Decision:** Architect and implement the core runtime observability engine, distributed OpenTelemetry span ingestion pipeline, and LLM-consumable macro-telemetry surface for Phase 3 (v2.1). _(Graph query API scope removed by owner [NO-GO] 2026-09-24 — see §4.)_

---

## 1. Mandate & Strategic Vision

### 1.1 The Phase 1 / Phase 3 Observability Boundary

In accordance with Round Table 2026-08-21 + 2026-09-01 Option A Thin Slice, observability is cleanly bifurcated (single-owner schema per `02l §5.1` / `tools/telemetry/schema.json`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Observability Scope Allocation Across Phases                    │
│                              (Option A Thin Slice)                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 1 (02l Thin Slice — In-Session Gates & Minimal Spans)                           │
│  • swarm_telemetry.js: Minimal OTel spans (spans-*.ndjson, captureUsage hybrid ~02l)  │
│  • tools/eval/tier0-judge.js + biomarkers.js: RQS-D deterministic (<25ms,0tok)         │
│  • RQS-D scorecard inline per skill-step (exact/estimated flag)                        │
│  • Hybrid INV-TEL-01 (≥80% exact, estimated <20%, cost nullable)                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 3a (04a: Macro-Telemetry Surface & Graph Observability)                         │
│  • telemetry_surface.js: 7-day rolling digests, hot-paths, token heatmaps (F3.8)       │
│  • RQS-J shadow (SRSR/SDS G-Eval κ≥0.7) + pricing.json cost enrichment                │
│  • Memory Controller Step 0.4: snapshot <150ms                                          │
│  • RQS-J shadow (SRSR/SDS G-Eval κ≥0.7) + pricing.json cost enrichment + Cost-per-Pass │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
*Canonical span schema owned by `02l`; Phase 3 imports — no redefinition.*

---

## 2. Distributed Span Pipeline & OpenTelemetry Data Model

### 2.1 Distributed Span Schema (`artifacts/telemetry/spans-YYYY-MM-DD.ndjson`) — Canonical Import (Option A)

> **Single-owner — do not redefine.** Canonical schema lives at `tools/telemetry/schema.json` owned by `02l §5.1` Option A Thin Slice. This section **imports** it: `const schema = require('../../tools/telemetry/schema.json')`. Minimal Phase-1 pipeline `02l` emits `spans-*.ndjson` with hybrid exactness (`usage.estimated`, `cost_usd: number | null` nullable, `quality_scorecard: { rqs_d_score, rqs_j_score: number | null }`, deterministic `scr/msha/placeholder_density/pci/ac_testability` + shadow `srsr/scope_drift nullable`). Phase-3 adds exact `cost_usd` enrichment via `pricing.json` and macro digests — see `02l §5.1` for full TypeScript; do not copy it here to avoid drift.

---

## 3. Macro-Telemetry Surface (`telemetry_surface.js`)

`telemetry_surface.js` transforms raw span streams into high-density, LLM-consumable and human-readable digests:

### 3.1 CLI Commands & Interfaces
- `node .agents/scripts/telemetry_surface.js session`: Returns ≤20 lines of recent session spend, top agents by token usage, and biomarker pass rates, stitched across multi-day calendar boundaries using `session_id`.
- `node .agents/scripts/telemetry_surface.js hot-paths`: Identifies the top 3 most expensive skills or step transitions in the last 7 days.
- `node .agents/scripts/telemetry_surface.js compare --baseline evals/baseline.json`: Compares current execution metrics against historical baselines.

### 3.2 Memory Controller Session-Start Integration (Step 0.4)
At every session initialization, `@memory-controller` invokes `session_bootstrap.js` to execute `telemetry_surface.js session`:
- **Execution Budget:** <150ms.
- **Injected Context:** Injected directly into loaded context under `## Recent Telemetry`.
- **Purpose:** Gives agents cost and quality awareness before spending tokens on the active task.

---

## 4. Graph-Assisted Observability & Query API — ❌ REMOVED (owner [NO-GO], 2026-09-24)

This section previously scoped a rebuilt structural graph subsystem (`auto_graph.js`, a typed query API, `code-graph`/`doc-graph` rebuilds at 5 lifecycle moments, and per-agent Graph Query Contracts). It was **removed by owner decision**: the graph was already deleted from the engine in Phase 1, and its absence is enforced by `tests/graph-deprecation.test.js` — rebuilding it here would reverse a shipped decision the codebase guards. See the removal record at `04-phase-3-observability.md` F3.1–F3.7.

WS-2 (below) and DoD items #2–#3 are cut with it. 04a now scopes the macro-telemetry surface only (§3, §5, WS-1). Blast-radius awareness lives in the "See the Unseen" directives (`04` F3.15) as prose reasoning over `git diff` + targeted `grep`, not a cached graph.

---

## 5. The 6 Hard Telemetry Invariants (Hybrid & Multi-Day Continuity — per 02l Option A, imported)

1. **`INV-TEL-01` (Zero Blind Execution — Hybrid):** Every invocation MUST generate valid span with non-null `trace_id`, real `duration_ms`, and `usage.total_tokens`; prompt/completion exact where harness reports, `estimated=true` <20% window with retry child spans; `cost_usd` nullable Phase 1; <80% exact fails gate. Via `captureUsage()` at LLM call site + `session_bootstrap.js` propagation.
2. **`INV-TEL-02` (Deterministic Gate Contract):** Every deliverable MUST pass Tier 0 RQS-D (SCR/MSHA/PD/PCI/AC <25ms, 0 tokens) before write-to-disk.
3. **`INV-TEL-03` (Zero Human-in-the-Loop RQS-D Gate):** Workflow success requires `RQS-D ≥85%` and deterministic biomarkers (`PCI=0.0`, `PD=0.0`, `SCR=1.0`, `MSHA=1.0`) — RQS-J (SRSR/SDS) shadow only.
4. **`INV-TEL-04` (Regression Tripwire — Retry-Aware):** CI Exit 2 if token sum (including retry spans) > baseline `evals/baseline.json` by >15% or pass drop >0%.
5. **`INV-TEL-05` (Model-Tier Invariant):** Layer-0 architecture/threat verdicts MUST use Tier B; demotion triggers `TIER_DEMOTION` warning via `modelTierGuards.js`.
6. **`INV-TEL-06` (Multi-Day Session & Trace Continuity):** Continuous sessions spanning UTC date boundaries must stitch spans across `spans-*.ndjson` files via `session_id`; day rollovers auto-emit `session_resume` linkage.

---

## 6. Workstream Implementation Tasks & Sizing

### WS-1: Span Aggregation & Surface Digests (Budget: 6h)
- [ ] **Task 04a.1 (2h)**: Build `.agents/scripts/telemetry_surface.js` with `session`, `hot-paths`, `summary`, and `compare` subcommands, including multi-day span stitching across date shards via `session_id`.
- [ ] **Task 04a.2 (1.5h)**: Integrate `telemetry_surface.js session` into `@memory-controller` step 0.4 (<150ms execution budget).
- [ ] **Task 04a.3 (1.5h)**: Update `/status` and `/retro` skills to display 7-day rolling token digests and biomarker health tables.
- [ ] **Task 04a.4 (1h)**: Update `orchestrator_state.js` to emit throttled per-step cost & biomarker alerts.

### WS-2: Graph Auto-Build & Query API — ❌ REMOVED (owner [NO-GO] 2026-09-24; see §4). Tasks 04a.5–04a.7 are cut. Budget reclaimed: −5.5h.

---

## 7. Definition of Done (DoD)

1. `telemetry_surface.js session` executes in <150ms, stitches multi-day sessions across date shards by `session_id`, and injects clean ≤20-line summaries at session start.
2. ~~`auto_graph.js` maintains fresh code and doc dependency graphs across all 5 lifecycle triggers.~~ ❌ REMOVED (§4).
3. ~~Graph query API responds in <100ms for blast radius and topology queries.~~ ❌ REMOVED (§4).
4. All 6 Telemetry Invariants (`INV-TEL-01..06`) pass automated verification in CI.

---

## 8. Sign-Off

> **Status update (2026-09-01 — Option A alignment):** Prior APPROVED lines remain but now explicitly import canonical `02l` schema. Re-certification against `tools/telemetry/schema.json` import test deferred to 04a implementation; boundary (§1.1 table) locked to thin-slice.

**@ml-ai-ops (Atlas):** APPROVED — Macro-telemetry surface imports `02l` canonical schema; hybrid `INV-TEL-01..05` locked (deferred re-check).  
**@architect (Vera):** APPROVED — Phase 1/3 boundary as Option A thin slice. _(Graph contracts withdrawn — graph scope removed 2026-09-24, §4.)_  
**@qa-engineer (Nina):** APPROVED — Deterministic RQS-D gates (Phase 1) vs RQS-J shadow (Phase 3) split validated.
