# Phase 3a — Observability Engine & Macro-Telemetry Surface (04a)

**Decision:** Architect and implement the core runtime observability engine, distributed OpenTelemetry span ingestion pipeline, and LLM-consumable macro-telemetry surface for Phase 3 (v2.1).

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
│  • Memory Controller Step 0.4: snapshot <150ms + Graph-Assisted Blast Radius            │
│  • Graph query API for ADRs/topology + Empirical Cost-per-Verified-Pass               │
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
- `node .agents/scripts/telemetry_surface.js session`: Returns ≤20 lines of recent session spend, top agents by token usage, and biomarker pass rates.
- `node .agents/scripts/telemetry_surface.js hot-paths`: Identifies the top 3 most expensive skills or step transitions in the last 7 days.
- `node .agents/scripts/telemetry_surface.js compare --baseline evals/baseline.json`: Compares current execution metrics against historical baselines.

### 3.2 Memory Controller Session-Start Integration (Step 0.4)
At every session initialization, `@memory-controller` invokes `session_bootstrap.js` to execute `telemetry_surface.js session`:
- **Execution Budget:** <150ms.
- **Injected Context:** Injected directly into loaded context under `## Recent Telemetry`.
- **Purpose:** Gives agents cost and quality awareness before spending tokens on the active task.

---

## 4. Graph-Assisted Observability & Query API

Makes the codebase and documentation dependency graphs queryable via typed subcommands, eliminating 5,000+ token grep walks.

### 4.1 Lifecycle Moments for Graph Auto-Build (`auto_graph.js`)
1. **Session start:** `@memory-controller` runs `auto_graph.js check` (cached mtime walk, <500ms).
2. **After `/design` sign-off:** Doc-graph rebuild captures new PRDs, ADRs, and spec links.
3. **After `/develop` step 3:** Code-graph rebuild captures new implementation files and symbol dependencies.
4. **Before `/retro` step 1:** Both code and doc graphs rebuilt so cycle reviews reference current graph statistics.
5. **On `orchestrator_state.js complete`:** Updates state graph asynchronously in detached background mode.

### 4.2 Graph Query Contracts for Reasoning Agents
- **`@architect`:** Queries `blast-radius` before authoring ADRs; captures blast radius section in output (<50 tokens).
- **`@tech-lead`:** Queries `topology` before generating execution breakdowns.
- **`@code-reviewer`:** Flags any PR diff with `blast_size > 5` for deep regression audit.
- **`@developer`:** Queries `dependents` before renaming, moving, or refactoring symbols.

---

## 5. The 5 Hard Telemetry Invariants (Hybrid — per 02l Option A, imported)

1. **`INV-TEL-01` (Zero Blind Execution — Hybrid):** Every invocation MUST generate valid span with non-null `trace_id`, real `duration_ms`, and `usage.total_tokens`; prompt/completion exact where harness reports, `estimated=true` <20% window with retry child spans; `cost_usd` nullable Phase 1; <80% exact fails gate. Via `captureUsage()` at LLM call site + `session_bootstrap.js` propagation.
2. **`INV-TEL-02` (Deterministic Gate Contract):** Every deliverable MUST pass Tier 0 RQS-D (SCR/MSHA/PD/PCI/AC <25ms, 0 tokens) before write-to-disk.
3. **`INV-TEL-03` (Zero Human-in-the-Loop RQS-D Gate):** Workflow success requires `RQS-D ≥85%` and deterministic biomarkers (`PCI=0.0`, `PD=0.0`, `SCR=1.0`, `MSHA=1.0`) — RQS-J (SRSR/SDS) shadow only.
4. **`INV-TEL-04` (Regression Tripwire — Retry-Aware):** CI Exit 2 if token sum (including retry spans) > baseline `evals/baseline.json` by >15% or pass drop >0%.
5. **`INV-TEL-05` (Model-Tier Invariant):** Layer-0 architecture/threat verdicts MUST use Tier B; demotion triggers `TIER_DEMOTION` warning via `modelTierGuards.js`.

---

## 6. Workstream Implementation Tasks & Sizing

### WS-1: Span Aggregation & Surface Digests (Budget: 6h)
- [ ] **Task 04a.1 (2h)**: Build `.agents/scripts/telemetry_surface.js` with `session`, `hot-paths`, `summary`, and `compare` subcommands.
- [ ] **Task 04a.2 (1.5h)**: Integrate `telemetry_surface.js session` into `@memory-controller` step 0.4 (<150ms execution budget).
- [ ] **Task 04a.3 (1.5h)**: Update `/status` and `/retro` skills to display 7-day rolling token digests and biomarker health tables.
- [ ] **Task 04a.4 (1h)**: Update `orchestrator_state.js` to emit throttled per-step cost & biomarker alerts.

### WS-2: Graph Auto-Build & Query API (Budget: 5.5h)
- [ ] **Task 04a.5 (2h)**: Create `.agents/scripts/auto_graph.js` with cached mtime walk and detached background build.
- [ ] **Task 04a.6 (1.5h)**: Wire graph auto-build triggers into `design`, `develop`, `retro`, and `orchestrator_state.js`.
- [ ] **Task 04a.7 (2h)**: Add `## Graph Query Contract` blocks to `@architect`, `@tech-lead`, `@code-reviewer`, and `@developer`.

---

## 7. Definition of Done (DoD)

1. `telemetry_surface.js session` executes in <150ms and injects clean ≤20-line summaries at session start.
2. `auto_graph.js` maintains fresh code and doc dependency graphs across all 5 lifecycle triggers.
3. Graph query API responds in <100ms for blast radius and topology queries.
4. All 5 Telemetry Invariants (`INV-TEL-01..05`) pass automated verification in CI.

---

## 8. Sign-Off

> **Status update (2026-09-01 — Option A alignment):** Prior APPROVED lines remain but now explicitly import canonical `02l` schema. Re-certification against `tools/telemetry/schema.json` import test deferred to 04a implementation; boundary (§1.1 table) locked to thin-slice.

**@ml-ai-ops (Atlas):** APPROVED — Macro-telemetry surface imports `02l` canonical schema; hybrid `INV-TEL-01..05` locked (deferred re-check).  
**@architect (Vera):** APPROVED — Graph contracts + Phase 1/3 boundary as Option A thin slice.  
**@qa-engineer (Nina):** APPROVED — Deterministic RQS-D gates (Phase 1) vs RQS-J shadow (Phase 3) split validated.
