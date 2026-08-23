# Phase 3 — Quality + Observability

> **Release:** v2.1
> **Calendar:** Week 6
> **Themes:** T3 (Artifact rigor), T4 (Harness contracts), T8 (UTTERLY SATISFIED culture)
> **Goal:** Make the graph a first-class tool (auto-build, query API), make telemetry a first-class surface (LLM-consumable digests), prove catalog consistency, give all agents "See the Unseen" observability directives, and make satisfaction health visible without turning it into a vanity score.

## Sub-Plans & Execution Architecture

Phase 3 is divided into two dedicated implementation sub-plans:
- **`04a-phase-3-observability-engine.md`**: Core OpenTelemetry distributed span engine, macro-telemetry surface (`telemetry_surface.js`), 7-day memory controller snapshots, and graph query API.
- **`04b-phase-3-observability-ui-miniapp.md`**: Zero-dependency local web dashboard and CLI tool (`vespyr web` / `vespyr dashboard`), modular installer options (`--with-dashboard`), and real-time SSE trace DAG waterfall viewer.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| F1.27-F1.28 (build-wiki) | Phase 1 (v2.0) | **Moved to Phase 7** | Consolidated into dedicated PKM & Knowledge Engine phase (`09-phase-7-pkm-knowledge-engine.md`). |
| F3.8-F3.12 (Observability Engine) | Monolithic Phase 3 | **Detailed in `04a`** | Bifurcated runtime span emission and macro-telemetry surface from Phase 1. |
| F3.21-F3.23 (Web Dashboard) | Unspecified / CLI-only | **Detailed in `04b`** | Added local-first `vespyr web` CLI tool and modular installer options. |

## F3.1-F3.5 — Graph auto-build at 5 lifecycle moments

**Source:** Evolution §1.7 | **Theme:** T3


**Target:** Make graph generation automatic at 5 lifecycle moments:

1. **Session start** — `@memory-controller` runs `auto_graph.js check` (file freshness)
2. **After `/design` sign-off** — doc-graph rebuild (new PRD/ADR links to capture)
3. **After `/develop` step 3** — code-graph rebuild (new code to capture)
4. **Before `/retro` step 1** — both rebuilds (so the cycle digest references a current graph)
5. **On `orchestrator_state.js complete`** — already wired for code-graph; extend to doc-graph

**Memory-controller session-start integration (canonical step 0.3 — the full
order table lives in 03 F2.14; earlier drafts numbered this "Step 0"):**

```markdown
### Step 0.3: Graph freshness check (non-blocking)

After the memory load (step 0.1), invoke:
@executor node .agents/scripts/session_bootstrap.js graph  # or auto_graph.js check via the shared bootstrap spawn

Parse the one-line response:
- [OK] both — no action
- [STALE] code — run node .agents/scripts/auto_graph.js build code --background (DETACHED — never blocks session start)
- [STALE] doc — run node .agents/scripts/auto_graph.js build doc --background
- [STALE] both — run node .agents/scripts/auto_graph.js build both --background

Budget: 300ms; on timeout emit `[SKIPPED: graph check timed out]` and continue.
After a rebuild completes, inject into the next context load: "Graph rebuilt: {files_indexed} code, {docs_indexed} doc files."
```

- [ ] F3.1 — Create `.agents/scripts/auto_graph.js` (~160 lines): single-pass cached mtime walk (one walk per check, cache in `graph-last-built.json`, 24h re-walk, skip-list incl. vendor/build/.turbo/coverage), `check` < 500ms on ≤30k files, `build --background` detached mode. **Implementation code:** See `03d-phase-2-implementation-specs.md` §5
- [ ] F3.2 — Update `memory-controller.md`: insert step 0.3 (graph freshness check) per the canonical order table in 03 F2.14 (text above; the older "Step 0" numbering is retired)
- [ ] F3.3 — Update `code-graph/SKILL.md` and `doc-graph/SKILL.md`: add `## Auto-invocation triggers` section documenting the 5 lifecycle moments
- [ ] F3.4 — Update 3 skills to invoke `auto_graph.js` at the right step:
  - `design/SKILL.md` (step-06/final) → `build doc`
  - `develop/SKILL.md` (step-03 close) → `build code`
  - `retro/SKILL.md` (step-01 open) → `build both`
  - Each trigger appends a tagged entry to `state/graph-builds.log` so "exactly one rebuild per trigger" is testable
- [ ] F3.5 — Update `orchestrator_state.js` `complete` handler: add doc-graph refresh after existing code-graph refresh. Wrap in try/catch; never block.

## F3.6-F3.7 — Graph query API (replaces raw-JSON reads)

**Source:** Evolution §1.11 | **Theme:** T3


**Target:** A typed query API with 9 subcommands. Every agent invokes this, never the raw JSON file. All queries are read-only after a single-flight build lock (concurrent round-table queries cannot race duplicate full builds).

**Graph Query Contract blocks (to add to each reasoning agent):**

**`architect.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

Before proposing ANY structural change:

Emit the result as a "## Blast Radius" section in the ADR. Cost: ~1 query, ~50 tokens output. Without the graph: read every file in src/ and grep for the target — ~5000+ tokens.
```

**`tech-lead.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

Before breaking the architecture into tasks:

Emit a "## Topology" section in the execution plan citing the graph stats.
```

**`code-reviewer.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

For every PR review:
- Identify files changed (git diff --name-only)
- Flag any change with blast_size > 5 as a "high-blast-radius" finding — these deserve extra scrutiny

This catches refactors that miss dependent callers.
```

**`developer.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

Before any refactor (rename, signature change, file move):
- Update every file in the response before committing

Cost: 1 query. Without it: break the build, then re-grep and fix in a second pass (~3x the tokens).
```

  - `architect.md` — blast-radius before proposing changes (contract block above)
  - `tech-lead.md` — summary for topology, blast-radius for parallelism (contract block above)
  - `code-reviewer.md` — blast-radius per changed file (contract block above)
  - `developer.md` — dependents before any rename/refactor (contract block above)
  - Add `## Graph Query Contract` block to each of the 4 reasoning agents (text above)

## F3.8-F3.12 — Telemetry Surface & Distributed Span Observability (LLM-Consumable & Machine-Verifiable)

**Source:** Evolution §1.9, Round Table 2026-08-21 | **Theme:** T3 | **Cross-Reference:** Epic 02l (`02l-phase-1-observability-biomarkers-and-small-model-harness.md`)

**Problem:** `swarm_telemetry.js` currently writes unstructured, unindexed event logs (`tokens: 0`, `duration_ms: null` in `artifacts/telemetry/events-*.ndjson`). Evaluating workflow health currently forces a human to open markdown documents and read them line-by-line. This is unscalable and provides zero machine-verifiable feedback.

**Target:** Upgrade telemetry from passive log-dumping into an **OpenTelemetry-compatible distributed span pipeline** (`artifacts/telemetry/spans-*.ndjson`) and a first-class machine-verifiable surface that 4 consumers see automatically:
1. Every session start — `@memory-controller` loads last 7 days' summary (<150ms)
2. Every skill's end — orchestrator surfaces "tokens used this skill: N (vs. baseline M)" and automated biomarker pass/fail
3. The `/status` skill — adds a "Telemetry & Biomarkers" section
4. The `/retro` skill — Step 1 includes a "hot path" and token cost digest

**Distributed Span Schema (`artifacts/telemetry/spans-YYYY-MM-DD.ndjson`):**

```typescript
interface VespyrTelemetrySpan {
  trace_id: string;            // UUID identifying the end-to-end task execution
  span_id: string;             // UUID identifying this specific agent step
  parent_span_id: string | null;
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
  tier0_evaluation: {
    executed: boolean;
    passed: boolean;
    checks: Array<{
      type: "markdown_ast" | "json_schema" | "eslint" | "unit_tests" | "token_ceiling";
      status: "PASS" | "FAIL";
      details?: string;
    }>;
  };
  biomarkers: {
    scr: number;               // Schema Compliance Ratio (1.0 = 100%)
    msha: number;              // Markdown Section Header Adherence (1.0 = 100%)
    placeholder_density: number;// % of lines containing TODO/TBD (0.0 = 0%)
    pci: number;               // Premature Convergence Index (0.0 target)
    srsr: number;              // Sycophantic Rubber-Stamp Rate (0.0 target)
    scope_drift: number;       // Scope Drift Score (0.0 target)
  };
  error: { code: string; message: string } | null;
}
```

**The 5 Hard Telemetry Invariants:**
- `INV-TEL-01` (Zero Blind Execution): Non-null trace_id, duration_ms, and exact token counts on every span.
- `INV-TEL-02` (Deterministic Gate Contract): Mandatory Tier 0 AST/schema assertion before disk commit.
- `INV-TEL-03` (Zero Human-in-the-Loop Biomarker Gate): Workflow success requires all biomarkers (SCR=1.0, placeholder_density=0.0, PCI=0.0) to pass. Zero line-by-line human reading required.
- `INV-TEL-04` (Regression Tripwire): CI failure (Exit Code 2) on >15% token inflation or pass rate drop vs `evals/baseline.json`.
- `INV-TEL-05` (Model-Tier Invariant): Tier B frontier models mandated for `@architect`, `@founder`, and `@security-engineer`.

**Memory-controller session-start integration (canonical step 0.4 — the full order table lives in 03 F2.14; earlier drafts numbered this "Step 0.5"):**

```markdown
### Step 0.4: Telemetry snapshot

After the graph check, invoke (via the shared session_bootstrap.js spawn):
@executor node .agents/scripts/telemetry_surface.js session

Budget: 150ms; output ≤ 20 lines (never raw event data). Inject the output into the loaded context under a "## Recent Telemetry" heading. This gives the agent cost awareness before it starts spending tokens.
```

- [ ] F3.8 — Create `.agents/scripts/telemetry_surface.js` (~130 lines): **fix the spread bug from the first draft** (array-spread, not string-spread, when slicing lines — a string spread yields characters and mangles the digest). Supports `session`, `hot-paths`, `summary`, and `compare`. **Implementation code:** See `03d-phase-2-implementation-specs.md` §7
- [ ] F3.9 — Update `memory-controller.md`: add step 0.4 (text above). Inject ≤20 lines under "## Recent Telemetry". Budget 150ms via session_bootstrap.js.
- [ ] F3.10 — Update `status/SKILL.md`: add "Surface telemetry" step. Append "## Telemetry (last 7 days)" with total tokens, top 3 agents by cost, top 3 events by frequency, and biomarker pass rates.
- [ ] F3.11 — Update `retro/SKILL.md` Step 1: also run `telemetry_surface.js hot-paths`, include top 3 in digest.
- [ ] F3.12 — Update `orchestrator_state.js`: after every `recordTelemetry('agent_invoke', ...)`, surface cost and biomarker status via `telemetry_surface.js compare` — **throttled to once per skill step**. Print `[COST] <agent> (<phase>): <one-line> [BIOMARKERS: PASS]`. Wrap in try/catch; never block.

## F3.13-F3.14 — Catalog parity test (derive from disk, don't hardcode)

**Source:** Evolution §3.4 | **Theme:** T1

**Problem:** No test ensures README/AGENTS/ROADMAP counts match on-disk reality. ECC had this exact problem (117 skills out of sync with agent.yaml). Earlier drafts hardcoded expected counts — but the v2.1/v2.2 persona totals were self-contradictory (44/43/10 vs 43/42/10 vs a stale 21-agent baseline) and new agent files (`@goal-verifier` in Phase 6, `flint.md` in Flint mode) were counted nowhere.

**Design (round-table fix):**
- **Count from disk:** agents = `.agents/agents/*.md` files that pass `validate_frontmatter.js`; skills = `SKILL.md` glob; squads = `squads.js list` output (single sources of truth).
- **Docs are the assert target:** the test fails with a diff when README/AGENTS/ROADMAP counts drift. The v2.1 task list (F4.11-F4.14 + 06 T5.61) includes "update doc counts to match disk" so the test passes at done-when.
- **Origin-based persona count:** personas with `origin: internal` (e.g. `@goal-verifier`, `flint.md` — added in v2.1) are validated but excluded from the advertised persona count. Canonical numbers as of v2.0 shipped state: 23 agent files (19 reasoning + 4 I/O — incl. @shifu, @ml-ai-engineer, @ml-ai-ops) / 43 skills / 7 squads; v2.1 adds 2 internal agents; Phase 5 adds 22 net-new personas / 19 skills / 3 squads → 45 personas / 62 skills / 10 squads.

- [ ] F3.13 — Create `tests/test_catalog_parity.js` (~120 lines): derive counts from disk + `validate_frontmatter.js`; read counts from README/AGENTS/ROADMAP; assert match; output diff and exit 1 on mismatch. Internal-origin agents excluded from persona counts per the rule above.
- [ ] F3.14 — Update `package.json`: add `test:catalog` script; wire into `npm test`. Also add `test:session-latency` (F3.21), `test:qa-gate` (F2.29), `test:satisfaction` (F2.29).

**Note:** Expected to fail on the first CI run after Phase 1 — the stale baseline (21 agents/24 skills) is still in README/AGENTS/ROADMAP. **The fix is the v2.1 Phase 4 documentation rewrite (F4.11-F4.14) + 06 T5.61-T5.64, not "the v2.0 release"** — by the end of Phase 4 the test must pass (`npm test` exit 0, 04:241).

## F3.15 — Universal Agent Upgrade ("See the Unseen")

**Source:** Plan Addendum | **Theme:** T1

**Problem:** Users are blind to internal state, dependencies, costs, and hidden risks of the swarm. Agents don't proactively surface what the user can't see.

**Target:** All agents must be upgraded to actively surface "the unseen."

**Core directives (add to every agent's system prompt):**

```markdown
## Observability & "See the Unseen"

- **Surface hidden token costs & telemetry:** Check recent telemetry using telemetry_surface.js and warn the user of hot-paths or high token costs if they exceed historical baselines.
- **Expose hidden assumptions:** Every plan or diagnostic must list "unseen assumptions" — things that are implicitly assumed but not verified.
- **Enforce response identity:** Every response must begin with {icon} {Human Name}: so that agent transitions are never hidden.
```

**Specific agent mappings (add to each agent's body):**

- `@founder`: Highlight unseen market assumptions and the hidden trade-offs of skipping validation.
- `@product-manager`: Expose unseen dependency paths between user stories and highlight stories with unverified acceptance criteria.
- `@architect`: Map the unseen structural blast radius of proposed modules and warn of structural circular dependencies.
- `@tech-lead`: Call out unseen parallel execution bottlenecks and estimate token cost impact of task execution.
- `@developer`: Run dependents checks before modifying files and alert the user to code that might break elsewhere.
- `@code-reviewer`: Calculate the blast radius of changes and point out unseen side-effects or magic numbers.
- `@qa-engineer`: Identify unseen edge cases, untested branches, and test gaps.
- `@security-engineer`: Uncover unseen attack surfaces, dependency vulnerabilities, and data flow leaks.
- `@performance-engineer`: Surface unseen bottlenecks in the call stack and memory allocations.

- [ ] F3.15.a-u — Update ALL agents (loop over `.agents/agents/`, not a hardcoded 21 — self-healing as the bench grows) with the "See the Unseen" directives + per-agent specific mappings (above). Graph/telemetry checks are session-scoped (cached per session, re-run on mtime change) so per-response hot-path accumulation stays bounded.

## F3.16 — Data Analyst Tools Upgrade

**Source:** Plan Addendum | **Theme:** T2

- [ ] F3.16.a — Create `.agents/scripts/data_analyzer.js`: funnel analysis (drop-offs, conversion rates), A/B testing calculator (Z-scores, p-values, significance), data validation (anomalies, null/duplicate values, schema drifts)
- [ ] F3.16.b — Create `.agents/scripts/dashboard_generator.js`: premium HTML view (responsive, KPI cards, SVG charts — bar/line), Markdown summary (tables, Unicode progress bars for LLM compatibility)
- [ ] F3.16.c — Update `data-analyst.md`: add tool command usage patterns, direct agent to execute statistics verification before writing reports
- [ ] F3.16.d — Create unit tests in `tests/test_data_tools.js`

## F3.17-F3.18 — Wiki & PKM System (Moved to Phase 7)

**Source:** Strategy Consolidation | **Theme:** T3

*Note: All Wiki / PKM skills, build-wiki scripts, and knowledge vault features have been moved out of Phase 3 and consolidated into dedicated Phase 7 (`09-phase-7-pkm-knowledge-engine.md`).*

---

## F3.19-F3.20 — UTTERLY SATISFIED observability

**Source:** `08-cross-cutting-utter-satisfaction-dna.md` | **Theme:** T8

The system must expose where collaboration is healthy, blocked, stale, or
being skipped. It must measure evidence and revalidation, not agent enthusiasm
or the number of approvals.

- [ ] **F3.19** — Extend `swarm_telemetry.js` with `satisfaction_state`,
  `feedback_requested`, `feedback_resolved`, `escalation`, and
  `revalidation_required` events. Include `{release, skill, phase, agent,
  state, evidence_count, blocker_count, cycle}`. **Schema additions (round-table
  fix):** `feedback_requested`/`feedback_resolved` events pair on a
  `feedback_id` (+ optional `requested_at`) — without it, feedback-resolution
  time (14 §9) is uncomputable; add a `revalidation_completed {release, agent}`
  event so the revalidation rate has a completion signal, not just a
  `revalidation_required` flag. Coverage/evidence rows are derived from
  `validate_satisfaction.js` output (single source, no dual counting).
- [ ] **F3.20** — Extend `telemetry_surface.js` and `/status` with a compact
  satisfaction section (schema pinned in `03d-phase-2-implementation-specs.md` §16,
  fixture tests T-SAT-1..5): active coverage, evidence completeness, unresolved
  blockers (with linked artifact paths), stale sign-offs, feedback resolution
  time, and escalation count. Never expose a single "agent quality score" as a
  proxy for satisfaction — the fixture suite includes a negative assertion that
  no per-agent scalar quality/score key is emitted.

**Acceptance:** A release with a missing, stale, or blocked satisfaction row is
visible in status before launch and is linked to the blocking artifact
(T-SAT-1..5 assert the fields and the negative no-score rule).

## F3.21 — Session-start latency instrument (new — was referenced but unowned)

**Problem:** `test_session_latency.js` is cited by 05 M8, 09 R38, and README §13
but no F-item created it — a CI-enforced DoD with no implementing task ships as
a phantom.

- [ ] F3.21 — Create `tests/test_session_latency.js` (~80 lines): measures the 6 canonical session-start steps (03 F2.14 table) against their budgets — each ≤ budget, total < 1000ms, non-blocking steps emit `[SKIPPED]` on timeout. Owner: @tech-lead (budget) / @memory-controller (pipeline). Wire into `npm test` (F3.14). **Spec:** `03d-phase-2-implementation-specs.md` §16

---

## Done when

- [ ] `auto_graph.js check` returns status in < 500ms on ≤30k files (single-pass cached walk); modifying any file in `src/` or `artifacts/output/` flips `[OK]` → `[STALE]`; `build --background` never blocks a session
- [ ] `/design`, `/develop`, `/retro` each trigger exactly one rebuild at their specified step (verified via tagged entries in `state/graph-builds.log`)
- [ ] `telemetry_surface.js session` returns ≤ 20 lines, runs in ≤ 150ms (no string-spread mangling)
- [ ] `/status` output includes "## Telemetry (last 7 days)"
- [ ] `/retro` digest includes top 3 hot paths
- [ ] `npm test` passes, including `test_catalog_parity.js` (derive-from-disk; docs updated in Phase 4 so it passes at done-when — no "expected to fail" line remains), `test_session_latency.js` (F3.21), `test_qa_gate.mjs`, `test_satisfaction.mjs`
- [ ] `memory-controller` enforces `[GRAPH: ...]` marker for API-related claims (via `fidelity_check.js` rule or grep-test)
- [ ] All agents (looped over `.agents/agents/`) have "See the Unseen" directive + response identity formatting
- [ ] `@data-analyst` has access to `data_analyzer.js` and `dashboard_generator.js` (specs committed to 03d-phase-2-implementation-specs.md §17 before implementation)
- [ ] Graph auto-build and query API functional
- [ ] T8 satisfaction events emitted with `feedback_id` pairing; `/status` identifies missing evidence, blocked rows, and stale sign-offs without subjective scoring (T-SAT-1..5 pass)

## Risks

- **Graph auto-build adds latency.** `check` is a single cached mtime walk, < 500ms on ≤30k files; `build` runs detached (`--background`) and only when `[STALE]`. On repos > 100k files the walk budget is extended via the `find -newer` fallback (10 §5).
- **Catalog parity test fails on first run.** Expected once — counts are off. The test derives from disk and outputs the diff; the **v2.1 Phase 4 documentation rewrite** (F4.11-F4.14) is the fix, not "the v2.0 release".
- **Graph query returns too much data.** Each query is sized for LLM consumption; `summary` returns top 5, `blast-radius` returns just names. Single-flight build lock prevents concurrent duplicate builds.
- **Telemetry surface overwhelms context.** Cap at 20 lines for `session`, 15 for `hot-paths`. Never raw event data. One 150ms budget number everywhere (the <1s claim is retired).
- **Satisfaction telemetry becomes a popularity contest.** Report coverage, evidence, blockers, revalidation, and resolution time; never rank agents by approval count or speed (negative-assertion fixture).

### Rollback plan

If Phase 3 breaks:
- **Telemetry:** remove step 0.4 from `memory-controller.md`. Telemetry data is still written by `swarm_telemetry.js`; only the surface layer is removed.
- **Catalog parity test:** if the test is too noisy, move it from `npm test` to a manual `npm run test:catalog` until counts stabilize.

## Handoff to Phase 4

- Graph is fresh at session start, after every skill, after every `complete` call.
- Graph is queryable via typed API; agents never read raw JSON.
- Telemetry is a first-class surface; cost visible to every agent.
- Catalog counts tested on every CI run.
- All agents have observability directives.
- Satisfaction health is observable, evidence-linked, and independent of subjective agent scoring.

---

## Completion Checklist

**Phase 3 Observability status: PLANNED (Future v2.1+ Scope — Not Started).**

- [ ] Telemetry surface & session latency tracking (`telemetry_surface.js`, `test_session_latency.js`)
- [ ] Swarm telemetry event stream (`swarm_telemetry.js`) with UTTERLY SATISFIED event tracking
- [ ] Data analyst tools (`data_analyzer.js`, `dashboard_generator.js`)
- [ ] Catalog parity tests and automated CI regression sweeps

---

## Sign-Off

**@data-analyst (Nova):** PENDING — Gated on Phase 2 enablement completion.  
**@performance-engineer (Felix):** PENDING — Gated on latency telemetry tooling.  
**@tech-lead (Grant):** PENDING — Execution scheduled for Phase 3.
