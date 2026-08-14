# Agent Evals, Metrics & Internal Dogfooding Harness Architecture (02j)

**Decision:** Author and construct `vespyr-eval` as a standalone, deterministic-first evaluation engine and test harness. Focus Phase 1 execution **100% on Horizon 1 (Dogfooding Vespyr Core)** to benchmark the 20-agent swarm and prevent prompt/workflow regressions. Horizons 2 (Chatbot Evals) and 3 (B2B SaaS) are documented for strategic context and vision only, with zero implementation in Phase 1.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 11th in the `02*` series, positioned immediately prior to `03-phase-2-enablement.md`. Must be completed and verified before Phase 2 enablement.

**Gate Reviews:** Round table 2026-08-14 (@founder, @ml-ai-engineer, @ml-ai-ops, @architect, @tech-lead, @qa-engineer, @product-manager), unanimous alignment recorded in `artifacts/memory/active-decisions.md`.

---

## 1. Vision & Strategic Rationale

### 1.1 The Blind Tuning Gap
In traditional software development, no team ships code without unit and integration tests. Yet in AI multi-agent frameworks, prompts, personas, and workflows are frequently modified "on vibes" without automated regression testing. When an agent prompt is edited, there is no way to know whether reasoning quality improved, token costs spiked, or workflow adherence degraded without a deterministic evaluation suite.

### 1.2 The Three Horizons (Phase 1 Scope Gate)

1. **Horizon 1 (Internal Dogfooding — ACTIVE PHASE 1 SCOPE)**: A local CLI test runner (`vespyr-eval`) executing inside ephemeral sandboxes that evaluates Vespyr's core agents, skills, and prompt templates against deterministic assertions and calibrated rubrics.
2. **Horizon 2 (Enterprise Chatbot Evaluation — FUTURE VISION / OUT OF SCOPE)**: Modular extension to ingest support logs. Contextual vision only; **NO development in Phase 1**.
3. **Horizon 3 (Standalone B2B SaaS Platform — FUTURE VISION / OUT OF SCOPE)**: Multi-tenant control plane, web dashboards, and CI/CD webhooks. Contextual vision only; **NO development in Phase 1**.

```
┌────────────────────────────────────────────────────────────────────────┐
│               vespyr-eval Architecture (Phase 1: Horizon 1)            │
├────────────────────────────────────────────────────────────────────────┤
│  1. Ephemeral Sandbox Runner (CLI / Subprocess / Isolated Temp Dir)    │
├────────────────────────────────────────────────────────────────────────┤
│  2. Two-Tier Evaluator Engine                                          │
│     ├── Tier 0 (Deterministic Gates): Lint, Build, Test, Regex, AST    │
│     │   └── (Hard abort on failure — 0 tokens wasted on broken code)   │
│     └── Tier 1 (Calibrated Semantic Judges): G-Eval rubrics (Temp=0)   │
├────────────────────────────────────────────────────────────────────────┤
│  3. Vespyr Core Benchmark Suites (Phase 1 MVP Archetypes)              │
│     ├── @developer: 10 fixed tasks (Spec + Failing Test -> Passing)    │
│     ├── @architect: ADR structure, trade-off depth, schema consistency │
│     ├── @product-manager: PRD completeness, story mapping validity    │
│     └── System/Skill: /shut-up brevity ceiling & token budget checks   │
├────────────────────────────────────────────────────────────────────────┤
│  4. Baseline & Telemetry (baseline.json, Token spend, Latency p50/p95) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 7 Core Evaluation Dimensions

Every evaluation scenario in `vespyr-eval` is scored across seven distinct, measurable dimensions with **Deterministic-First** prioritization:

| # | Dimension | Target Roles | Verification Mechanism | Key Metrics |
|---|---|---|---|---|
| **1** | **Research & Grounding** | `@researcher`, `@user-researcher`, `@ux-researcher` | Fact-checking, citation resolution, source verification, hallucination checks. | Citation Precision %, Hallucination Rate, Evidence Coverage. |
| **2** | **Planning & PRD** | `@product-manager`, `@tech-lead` | Spec completeness, User Story structure, acceptance criteria validity, task estimation realism. | PRD Structural Rubric Score (1–5), Ambiguity Index. |
| **3** | **Design & A11y** | `@product-designer` | Design token consistency, screen state coverage (empty, error, loading), WCAG 2.1 AA compliance. | Accessibility Score (a11y), State Completeness %. |
| **4** | **Code Quality & Correctness** | `@developer`, `@code-reviewer` | Static analysis (ESLint/TypeScript), compiler diagnostics, unit test pass rates, pattern adherence. | Build Pass Rate, Test Pass %, Lint Violation Count. |
| **5** | **Req ➔ Impl Accuracy** | Cross-Swarm (`@product-manager` ➔ `@developer` ➔ `@qa-engineer`) | End-to-end trace: Does the final code implement *all* acceptance criteria without unrequested scope creep? | Acceptance Criteria Pass Rate (E2E), Scope Drift Score. |
| **6** | **Memory & Rule Adherence** | All Agents | Did agent adopt Socratic stance? Did `/shut-up` stay ultra-minimal? Did memory load stay under token budget (<500 tokens)? | Rule Violation Count, Context Overhead Ratio. |
| **7** | **Workflow, Script & Template Adherence** | All Agents | Did the agent run required lifecycle scripts (`step_tracker.js`, `orchestrator_state.js`)? Did it conform to Markdown templates without breaking headers? | Script Execution Fidelity %, Template AST Match %. |

---

## 3. Benchmark Suite Scoping (Phase 1 MVP)

To avoid combinatorial explosion, Phase 1 prioritizes deep benchmark coverage on **3 Core Archetypes + System Skills** before rolling out across all 20 agents:

### 3.1 Primary Focus Archetypes
- **`@developer` (Rex)**: 10 fixed reference coding tasks (Spec + Failing Test ➔ Working Implementation ➔ Passing Tests), minimal response verification under `/shut-up`.
- **`@architect` (Vera)**: Scenarios evaluating ADR structure, trade-off completeness, distributed boundary isolation, and schema validity.
- **`@product-manager` (Sarah)**: Scenarios evaluating PRD completeness, acceptance criteria validity, and scope boundary enforcement.

### 3.2 System & Skill Invariants
- **`/shut-up` Skill**: Automated brevity test suite asserting token output ceilings (<100 tokens per turn) and safety confirmation on destructive actions.
- **Memory Layer Invariants**: Token budget assertions (<500 tokens on `patterns-and-conventions.md`, clean section boundaries in `project-context.md`).

---

## 4. Evaluation Engine Guardrails & Calibration

1. **Deterministic-First Abort Gate**: If a run fails compilation, linting, or unit test execution, evaluation halts immediately. Zero LLM judge tokens are consumed on broken runs.
2. **Calibrated Semantic Scoring (G-Eval)**: Qualitative scoring uses explicit binary/weighted rubrics, structured JSON scoring explanations, temperature=0, and fixed seed comparisons.
3. **Ephemeral Sandboxing**: Every evaluation scenario executes in an isolated temporary workspace to prevent workspace corruption or git state pollution.
4. **Tiered CI Runner Strategy**:
   - *Tier 0 (Pre-Commit / Smoke)*: Deterministic checks only (<5s, $0 cost).
   - *Tier 1 (PR Diff Run)*: Fast targeted evaluation on modified agent personas/skills (<1 min).
   - *Tier 2 (Nightly Regression Baseline)*: Full benchmark suite executed against `baseline.json` with 95% confidence intervals.

---

## 5. Workstreams & Execution Tasks (Horizon 1 Focus)

### WS-1: Core Runner Engine & CLI (`vespyr-eval`)
- [ ] **Task 1.1**: Build `vespyr-eval` core CLI runner supporting ephemeral directory sandboxing, parallel test execution, and JSON/NDJSON logging.
- [ ] **Task 1.2**: Implement Tier 0 deterministic assertion judges (build, lint, unit test exit codes, AST header validation).
- [ ] **Task 1.3**: Implement Tier 1 G-Eval scoring engine with calibrated rubrics, temperature=0, and JSON output parsing.

### WS-2: Phase 1 Reference Benchmark Suites
- [ ] **Task 2.1**: Author 10 fixed reference tasks for `@developer` (Spec + Failing Test ➔ Passing Code).
- [ ] **Task 2.2**: Author benchmark suites for `@product-manager` (PRD generation) and `@architect` (ADR formulation).
- [ ] **Task 2.3**: Author verification suite for `/shut-up` skill (ensuring <100 token ceiling and destructive gate compliance).
- [ ] **Task 2.4**: Author memory constraint assertions (verifying machine comment block isolation and <500 token budget limits).

### WS-3: Telemetry, Baseline & Regression Reporting
- [ ] **Task 3.1**: Implement baseline tracking (`baseline.json`) to compare runs against historical pass rates and token costs.
- [ ] **Task 3.2**: Add markdown and terminal summary generators displaying pass/fail matrices, latency percentiles (p50/p95), and token spend per agent.
- [ ] **Task 3.3**: Integrate Tier 0/1 `vespyr-eval` checks into local test suites and pre-commit hooks.

*(Note: Horizon 2 Chatbot Evaluator and Horizon 3 SaaS Platform workstreams are strictly deferred to future phases post-v2.0.0).*

---

## 6. Definition of Done (DoD) & Verification

1. `npx vespyr-eval run --suite core` executes in an isolated temporary sandbox across all 10 developer reference tasks and core persona benchmarks, outputting a structured summary.
2. Tier 0 deterministic abort gates prevent unneeded LLM judge token consumption on failing code.
3. Prompt or skill changes produce quantifiable diffs in pass rate, latency, and token consumption against `baseline.json`.
4. `/shut-up` and memory layer token invariants are strictly enforced via automated assertions.
5. All deliverables pass security and integrity scans prior to Phase 2 Enablement.

---

## 7. Completion Checklist

**02j plan authoring status: COMPLETE.**

**Execution Checklist:**
- [x] Epic 02j authored and positioned as 11th sub-plan in Phase 1 series
- [x] Round-table review completed; scope locked 100% to Horizon 1 (internal dogfooding)
- [ ] Task 1.1 — Build `vespyr-eval` core CLI runner with ephemeral sandboxing and JSON/NDJSON logging
- [ ] Task 1.2 — Implement Tier 0 deterministic assertion judges (build, lint, unit test exit codes, AST checks)
- [ ] Task 1.3 — Implement Tier 1 G-Eval scoring engine with calibrated rubrics (temperature=0, JSON output)
- [ ] Task 2.1 — Author 10 fixed reference coding tasks for `@developer`
- [ ] Task 2.2 — Author benchmark suites for `@product-manager` (PRDs) and `@architect` (ADRs)
- [ ] Task 2.3 — Author verification suite for `/shut-up` skill (<100 token ceiling, safety confirmation)
- [ ] Task 2.4 — Author memory layer constraint assertions (fenced block isolation, <500 token budget)
- [ ] Task 3.1 — Implement baseline tracking (`baseline.json`) for historical regression diffs
- [ ] Task 3.2 — Add summary generators (pass/fail matrices, latency p50/p95, token spend per agent)
- [ ] Task 3.3 — Integrate Tier 0/1 `vespyr-eval` checks into local test suites and pre-commit hooks

---

## 8. Sign-Off

**@founder (Elena):** APPROVED — SATISFIED (2026-08-14). Scope: strict Horizon 1 focus on dogfooding Vespyr core without premature SaaS bloat.  
**@architect (Vera):** APPROVED — SATISFIED (2026-08-14). Scope: ephemeral sandbox isolation and deterministic/stochastic boundary separation.  
**@tech-lead (Grant):** APPROVED — SATISFIED (2026-08-14). Scope: MVP benchmark suite scoped to 3 core archetypes (@developer, @architect, @product-manager).  
**@qa-engineer (Nina):** APPROVED — SATISFIED (2026-08-14). Scope: Tier 0 deterministic-first abort gates and hermetic fixture runner.  
**@ml-ai-engineer (Kai):** APPROVED — SATISFIED (2026-08-14). Scope: calibrated G-Eval rubrics, temperature=0 scoring, and token budget caps.
