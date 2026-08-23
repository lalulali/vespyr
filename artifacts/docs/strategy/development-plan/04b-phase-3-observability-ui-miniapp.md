# Phase 3b — Local Observability & Evals Web Mini-App (`vespyr web`) (04b)

**Decision:** Architect and implement a zero-dependency, local-first web dashboard and CLI tool (`vespyr web` / `vespyr dashboard`) for interactive multi-agent trace visualization, biomarker inspection, and multi-model benchmark evaluation.

---

## 1. Mandate & Strategic Vision

### 1.1 Why a Local Web Mini-App?

Terminal ASCII scorecards are excellent for instantaneous, single-turn `[PASS/FAIL]` feedback in headless CI. However, they fail when inspecting:
1. **Hierarchical Multi-Agent DAGs:** Visualizing an orchestrator delegating to `@tech-lead` $\to$ `@architect` $\to$ 3 parallel `@developer` subagents with parent-child span timelines.
2. **Token & Latency Flamegraphs:** Pinpointing exactly which tool call or prompt iteration consumed 80% of execution time/cost.
3. **Side-by-Side Model Diffing:** Comparing the exact AST failures, token spend, and completion quality of Gemini 2.0 Flash vs. Claude 3.5 Sonnet on the same prompt.
4. **Interactive Failure Autopsies:** Drilliing down into AST error trees, stack traces, and compiler feedback loops without manually opening NDJSON files.

---

## 2. CLI Experience & Modular Installer Integration

### 2.1 Native Local CLI Subcommand: `vespyr web`

The dashboard is invoked directly from the local project repository without `npx` network resolve delays, booting in **<80ms**:

```bash
# Launch local dashboard and automatically open browser on http://localhost:4100
vespyr web

# Alias command
vespyr dashboard

# Custom port and headless flags
vespyr web --port 4200 --no-open
```

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  __  __                                         
│ /\ \/\ \                                        
│ \ \ \ \ \     __    ____  _____   __  __  _ __  
│  \ \ \ \ \  /'__`\ /',__\/\\'__`\/\\ \\/\\ \\/\\`'__\\
│   \ \ \_/ \/\\  __//\\__, `\\ \\ \\L\\ \\ \\ \\_\\ \\ \\ \\/ 
│    \ `\___/\\ \____\/\\____/\\ \\ ,__/\\/\`____ \\ \\_\\ 
│     `\/__/  \/____/\/___/  \\ \\ \\/  \`/___/> \\/_/ 
│                             \\ \\_\\     /\\___/    
│                              \/_/     \/__/     
│
│ 🚀 Vespyr Observability & Evals Dashboard running locally:
│    ➜ Local:   http://localhost:4100
│    ➜ Trace:   artifacts/telemetry/spans-2026-08-23.ndjson (Streaming)
│    ➜ Evals:   evals/baseline.json
│
│ [Press Ctrl+C to stop server]
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Modular Inclusion / Exclusion during `vespyr init` & `update`

To uphold the **"Simplicity First"** senior standard, the dashboard is an **opt-in / opt-out modular component**:

#### A. Interactive Prompt during `vespyr init`:
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ? Select optional components to install in this workspace:                             │
│   [x] Core Agent Swarm (20 personas + skills)                                          │
│   [x] vespyr-eval CLI & deterministic linters                                          │
│   [ ] Local Observability & Evals Web Dashboard (vespyr web)                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### B. Non-Interactive CLI Flags:
```bash
# Install with local web dashboard assets bundled
vespyr init --with-dashboard

# Install ultra-lean headless CLI only (pure Markdown + terminal scorecards)
vespyr init --no-dashboard

# Upgrade existing workspace and include dashboard
vespyr update --with-dashboard
```

- **If included:** Bundles the pre-compiled, zero-dependency static assets in `tools/dashboard/dist/` (<500KB total) and registers `vespyr web` in `bin/cli.js`.
- **If excluded:** The repository stays ultra-lean. Developers still retain 100% functionality via terminal scorecards and `vespyr-eval` CLI.

---

## 3. System Architecture & Zero-Cloud Invariants

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          vespyr web Local-First Architecture                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ Local Filesystem ]                                                                 │
│   ├── artifacts/telemetry/spans-*.ndjson (Append-only trace stream)                    │
│   └── evals/baseline.json & evals/results/*.json (Benchmark results)                   │
│             │                                                                          │
│             │ fs.watch / Tail Reader                                                   │
│             ▼                                                                          │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │           Embedded Node.js HTTP Server (bin/vespyr-ui.js, <80ms boot)          │   │
│   │   • Serves pre-built static SPA from tools/dashboard/dist/                     │   │
│   │   • Server-Sent Events (SSE) endpoint: /api/events (real-time trace push)      │   │
│   │   • Read-only REST endpoints: /api/spans, /api/evals, /api/models              │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │ SSE / JSON (localhost:4100)                │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │               Local Single-Page App (Preact / Tailwind / WASM)                 │   │
│   │   • Trace DAG Waterfall View (Multi-Agent parent/child timelines)              │   │
│   │   • Biomarker Radar & Result Quality Score (RQS) Matrix                        │   │
│   │   • Multi-Model Efficiency Frontier (Flash vs Sonnet Cost/Pass)                │   │
│   │   • AST Error & Closed-Loop Compiler Repair Diff Viewer                        │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. The 3 Non-Negotiable UI Invariants

1. **`INV-UI-01` (Headless & CI Primacy):** The CLI (`vespyr-eval`) and headless scripts remain the **sole source of truth for release gates**. CI pipelines MUST never launch a browser or require the web dashboard. Deterministic exit codes (`0`, `1`, `2`) govern CI.
2. **`INV-UI-02` (Dumb Read-Only Viewer):** The web dashboard contains **zero judging or evaluation math**. It is strictly a local visualization projection reading `artifacts/telemetry/spans-*.ndjson` and `evals/baseline.json`. All metrics (RQS, SCR, MSHA, PD) are computed in `tools/eval/lib/biomarkers.js`.
3. **`INV-UI-03` (Zero-Cloud Local-First Architecture):** 100% offline. Zero external databases, zero cloud dependencies, zero telemetry leaks, zero external CDN scripts.

---

## 5. Core Dashboard Views & Capabilities

### 5.1 Distributed Multi-Agent Trace Waterfall
- Renders hierarchical span DAGs (Orchestrator $\to$ Agents $\to$ Subagents $\to$ Tools).
- Visualizes step-by-step latency, token consumption (Prompt vs. Completion), and cost per subagent.
- Live streaming updates via SSE as agents execute tasks in real time.

### 5.2 Biomarker Radar & Quality Matrix
- Visualizes the composite **Result Quality Score (RQS)** and its 6 constituent biomarkers:
  - Schema Compliance Ratio (SCR: 100%)
  - Markdown Section Header Adherence (MSHA: 100%)
  - Placeholder Cleanliness (0.0% TODO/TBD)
  - Premature Convergence Index (PCI: 0.00)
  - Sycophantic Rubber-Stamp Rate (SRSR: 0.0%)
  - Acceptance Criteria Given/When/Then Testability (100%)

### 5.3 Multi-Model Quality & Cost Efficiency Matrix
- Side-by-side Pareto frontier comparing models across identical benchmark tasks:
  - **Gemini 2.0 Flash / Llama-3.3-70B:** Cost-per-Verified-Pass ($/pass), compiler repair success rate.
  - **Claude 3.5 Sonnet / GPT-4o:** Unbounded reasoning quality, strategic synthesis score.

### 5.4 Compiler Repair & AST Error Diff Viewer
- Step-by-step autopsy of closed-loop repair loops ($N \le 2$).
- Displays compiler stderr (`tsc`, `eslint`, `vitest`), exact line-number highlights, and the repaired code patch.

---

## 6. Workstream Implementation Tasks & Sizing

### WS-1: Embedded HTTP Server & CLI Subcommand (Budget: 4.5h)
- [ ] **Task 04b.1 (2h)**: Implement `bin/vespyr-ui.js` lightweight HTTP server (<80ms boot) serving static assets and reading local NDJSON spans.
- [ ] **Task 04b.2 (1.5h)**: Implement SSE `/api/events` endpoint streaming live trace updates via file watchers.
- [ ] **Task 04b.3 (1h)**: Wire `vespyr web` / `vespyr dashboard` subcommands into `bin/cli.js`.

### WS-2: Installer Modular Scaffolding (Budget: 3h)
- [ ] **Task 04b.4 (1.5h)**: Update `bin/cli.js` installer with `--with-dashboard` and `--no-dashboard` flags.
- [ ] **Task 04b.5 (1.5h)**: Add interactive optional component selector prompt in `performFreshInstall` and `performUpdate`.

### WS-3: Dashboard UI Bundle (Preact/Tailwind) (Budget: 6.5h)
- [ ] **Task 04b.6 (2.5h)**: Build Trace Waterfall & Multi-Agent DAG component.
- [ ] **Task 04b.7 (2h)**: Build Biomarker Radar & Result Quality Scorecard view.
- [ ] **Task 04b.8 (2h)**: Build Multi-Model Efficiency Matrix & AST Compiler Diff Viewer.

---

## 7. Definition of Done (DoD)

1. `vespyr web` starts in <80ms and automatically opens `http://localhost:4100`.
2. Live agent steps and subagent spans stream to the browser via SSE within <100ms of being written to `spans-*.ndjson`.
3. `vespyr init --no-dashboard` installs an ultra-lean workspace without bundling UI assets.
4. All 3 UI Invariants (`INV-UI-01..03`) pass automated headless CI checks.

---

## 8. Sign-Off

**@architect (Vera):** APPROVED — Local-first embedded architecture and `INV-UI-01..03` invariants locked.  
**@ml-ai-ops (Atlas):** APPROVED — Zero-cloud telemetry streaming and SSE trace pipeline verified.  
**@qa-engineer (Nina):** APPROVED — Headless CI primacy guaranteed; zero eval logic in UI layer.
