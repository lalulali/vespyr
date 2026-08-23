# Phase 3a — Observability Engine & Macro-Telemetry Surface (04a)

**Decision:** Architect and implement the core runtime observability engine, distributed OpenTelemetry span ingestion pipeline, and LLM-consumable macro-telemetry surface for Phase 3 (v2.1).

---

## 1. Mandate & Strategic Vision

### 1.1 The Phase 1 / Phase 3 Observability Boundary

In accordance with the Round Table dialectic (2026-08-21), observability is cleanly bifurcated across project phases:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Observability Scope Allocation Across Phases                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 1 (02l-Core: In-Session Gates & Distributed Spans)                              │
│  • tools/eval/tier0-judge.js: Deterministic AST & Schema validation (<25ms, 0 tokens)  │
│  • Programmatic Biomarkers: SCR=1.0, MSHA=1.0, Placeholder Density PD=0.0%           │
│  • swarm_telemetry.js: OpenTelemetry distributed spans (spans-*.ndjson)                │
│  • Terminal Quality Scorecard: Instant step-level feedback in CLI                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 3a (04a: Macro-Telemetry Surface & Graph Observability)                         │
│  • telemetry_surface.js: 7-day rolling cost digests, hot-path analysis, token heatmaps  │
│  • Graph-Assisted Blast Radius: Query API for ADRs, topology, and refactor analysis    │
│  • Memory Controller Step 0.4: Context injection of telemetry snapshot (<150ms)        │
│  • Automated Model Profiling: Empirical Cost-per-Verified-Pass across model tiers      │
│  • Socratic Anti-Sycophancy Scoring: Multi-agent PCI/SRSR evaluation                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Distributed Span Pipeline & OpenTelemetry Data Model

### 2.1 Distributed Span Schema (`artifacts/telemetry/spans-YYYY-MM-DD.ndjson`)

```typescript
interface VespyrTelemetrySpan {
  trace_id: string;            // UUID identifying the end-to-end task execution
  span_id: string;             // UUID identifying this specific agent step
  parent_span_id: string | null; // Supports nested multi-agent DAGs
  timestamp: string;           // ISO 8601 UTC
  session_id: string;
  workflow: string;            // e.g. "discovery/validate-idea", "delivery/develop"
  agent_persona: string;       // e.g. "architect", "developer", "qa-engineer"
  model: {
    provider: string;          // e.g. "anthropic", "google", "ollama"
    model_id: string;          // e.g. "gemini-2.0-flash", "claude-3-5-sonnet"
    temperature: number;
  };
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  duration_ms: number;
  quality_scorecard: {
    rqs_score: number;         // Composite Result Quality Score (0.0 to 1.0)
    rating: "EXCELLENT" | "PASS" | "NEEDS_REPAIR" | "REJECTED";
    biomarkers: {
      scr: number;             // Schema Compliance Ratio (1.0 = 100%)
      msha: number;            // Markdown Section Header Adherence (1.0 = 100%)
      placeholder_density: number; // % lines with TODO/TBD (0.0 target)
      pci: number;             // Premature Convergence Index (0.0 target)
      srsr: number;            // Sycophantic Rubber-Stamp Rate (0.0 target)
      scope_drift: number;     // Scope Drift Score (0.0 target)
      ac_testability: number;  // Given/When/Then compliance ratio (1.0 target)
    };
  };
  tier0_evaluation: {
    executed: boolean;
    passed: boolean;
    checks: Array<{
      type: "markdown_ast" | "json_schema" | "eslint" | "unit_tests" | "token_ceiling";
      status: "PASS" | "FAIL";
      details?: string;
    }>;
  };
  error: {
    code: string;
    message: string;
  } | null;
}
```

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

## 5. The 5 Hard Telemetry Invariants

1. **`INV-TEL-01` (Zero Blind Execution):** Every agent invocation, skill step, and subagent handoff MUST generate a valid span with a non-null `trace_id`, real `duration_ms`, and exact prompt/completion `tokens`. Zero-token logs are treated as engine faults.
2. **`INV-TEL-02` (Deterministic Gate Contract):** Every output deliverable MUST pass Tier 0 static assertions before write-to-disk. A failure terminates the span with a structured error payload and blocks downstream execution.
3. **`INV-TEL-03` (Zero Human-in-the-Loop Biomarker Gate):** A workflow is marked "successful" ONLY if the Result Quality Score meets $\text{RQS} \ge 85.0\%$ and all hard biomarkers (`PCI = 0.0`, `placeholder_density = 0.0`, `SCR = 1.0`) pass.
4. **`INV-TEL-04` (Regression Tripwire):** If token spend exceeds baseline by $>15\%$ or pass rate drops by $>0\%$ on identical test suites in `evals/baseline.json`, CI fails with Exit Code 2.
5. **`INV-TEL-05` (Model-Tier Invariant):** Subagents assigned to Layer-0 architecture, threat modeling, or strategic verdicts MUST use Tier B frontier models. Demoting these roles to Tier A triggers an immediate telemetry audit warning.

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

**@ml-ai-ops (Atlas):** APPROVED — Distributed span schema, macro-telemetry surface, and `INV-TEL-01..05` locked.  
**@architect (Vera):** APPROVED — Graph query contracts and lifecycle triggers formalized.  
**@qa-engineer (Nina):** APPROVED — Deterministic regression tripwires and DoD verification criteria validated.
