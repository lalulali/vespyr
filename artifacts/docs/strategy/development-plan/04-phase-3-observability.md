# Phase 3 — Quality + Observability

> **Release:** v2.1
> **Calendar:** Week 6
> **Themes:** T3 (Artifact rigor), T4 (Harness contracts), T8 (UTTERLY SATISFIED culture)
> **Goal:** Make telemetry a first-class surface (LLM-consumable digests), prove catalog consistency, give all agents "See the Unseen" observability directives, and make satisfaction health visible without turning it into a vanity score.
> **Note (2026-09-24):** the graph work (former F3.1–F3.7: auto-build + query API) was **removed by owner [NO-GO]** — it conflicted with the shipped graph-deprecation decision. See the removal record at F3.1–F3.7 below. The rest of Phase 3 never depended on it.

## Sub-Plans & Execution Architecture — Aligned to 02l Option A Thin Slice

Phase 3 is divided into two dedicated implementation sub-plans that **import the 02l canonical span schema and defer, not duplicate, Phase-1 thin-slice work**:
- **`04a-phase-3-observability-engine.md`**: Macro-telemetry surface (`telemetry_surface.js` session <150ms, 7-day digests, hot-paths) and RQS-J semantic shadow (SRSR/SDS G-Eval κ≥0.7). **Imports** `tools/telemetry/schema.json` from `02l §5.1`; does not redefine spans. (Graph query API removed — see F3.1–F3.7.)
- **`04b-phase-3-observability-ui-miniapp.md`**: Zero-dependency local web dashboard and CLI tool (`vespyr web` / `vespyr dashboard`), modular installer options (`--with-dashboard`), and real-time SSE trace DAG waterfall viewer. Reads `tools/telemetry/schema.json` + `spans-*.ndjson` + `rqs_d_score`/`rqs_j_score` shadow.

Single-owner registry: see `02l §11`.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| F1.27-F1.28 (build-wiki) | Phase 1 (v2.0) | **Moved to Phase 7** | Consolidated into dedicated PKM & Knowledge Engine phase (`09-phase-7-pkm-knowledge-engine.md`). |
| F3.8-F3.12 (Observability Engine) | Monolithic Phase 3 | **Detailed in `04a`** | Bifurcated runtime span emission and macro-telemetry surface from Phase 1. |
| F3.21-F3.23 (Web Dashboard) | Unspecified / CLI-only | **Detailed in `04b`** | Added local-first `vespyr web` CLI tool and modular installer options. |

## F3.1-F3.7 — Graph auto-build + query API — ❌ REMOVED (owner [NO-GO], 2026-09-24)

**Source:** Evolution §1.7, §1.11 | **Theme:** T3 (was) | **Status:** cut from the plan.

The structural graph subsystem (auto-build at lifecycle moments, a typed query API, per-agent "Graph Query Contract" blocks, and the `[GRAPH: …]` marker) was **removed from Phase 3 by owner decision**. The graph was already deleted from the engine in Phase 1 (see `02h-phase-1-graph-shutup-and-cli.md` and `active-decisions.md`), and its absence is enforced by `tests/graph-deprecation.test.js`. Rebuilding it here would have reversed a shipped decision the codebase actively guards, so F3.1–F3.7 are cut, not deferred.

**What this removal deletes from the plan:**
- F3.1–F3.5 (graph auto-build script + 5 lifecycle triggers + session-start step 0.3).
- F3.6–F3.7 (graph query API + the `## Graph Query Contract` blocks on `@architect`, `@tech-lead`, `@code-reviewer`, `@developer`).
- The `[GRAPH: …]` marker contract everywhere it appeared (F3.7, session-start table, Done-when).
- The graph rows in the `03` F2.14 session-start table (step 0.3) and README §13 latency budget.

**What replaces the intent (kept, non-graph):** blast-radius awareness now lives in the "See the Unseen" directives (F3.15) as prose reasoning — agents reason about dependents from `git diff` + targeted `grep`, not a cached graph. No new tooling is scheduled.

**If the graph is ever wanted again:** it is a fresh proposal, not a resume of F3.1–F3.7. It must first reverse the deletion decision in `active-decisions.md` with dated rationale and update `tests/graph-deprecation.test.js`, then be re-scoped from scratch.

## F3.8-F3.12 — Telemetry Surface & Distributed Span Observability (LLM-Consumable & Machine-Verifiable)

**Source:** Evolution §1.9, Round Table 2026-08-21 | **Theme:** T3 | **Cross-Reference:** Epic 02l (`02l-phase-1-observability-biomarkers-and-small-model-harness.md`)

**Problem:** `swarm_telemetry.js` currently writes unstructured, unindexed event logs (`tokens: 0`, `duration_ms: null` in `artifacts/telemetry/events-*.ndjson`). Evaluating workflow health currently forces a human to open markdown documents and read them line-by-line. This is unscalable and provides zero machine-verifiable feedback. **Option A note:** Phase-1 thin slice `02l` ships the minimal `spans-*.ndjson` pipeline + RQS-D gates (see `02l §5-6`); Phase 3 upgrades it into this macro surface — not a parallel replacement.

**Target:** Upgrade the thin `02l` span pipeline into a first-class macro surface that 4 consumers see automatically:
1. Every session start — `@memory-controller` loads last 7 days' summary (<150ms)
2. Every skill's end — orchestrator surfaces "tokens used this skill: N (vs. baseline M)" and automated biomarker pass/fail
3. The `/status` skill — adds a "Telemetry & Biomarkers" section
4. The `/retro` skill — Step 1 includes a "hot path" and token cost digest

**Distributed Span Schema (`artifacts/telemetry/spans-YYYY-MM-DD.ndjson`) — Canonical Import (Option A):**

> **Single-owner — do not redefine.** Canonical schema lives at `tools/telemetry/schema.json` owned by `02l-phase-1-observability-biomarkers-and-small-model-harness.md §5.1` (Option A Thin Slice). This section **imports** via `require('../telemetry/schema.json')`; any drift copies violate `INV-TEL-01` hybrid. Phase 1 shape: `usage.cost_usd: number | null` (nullable, Phase 3 enriches via `pricing.json`), `usage.estimated: boolean` (<20% estimated, ≥80% exact coverage), `quality_scorecard: { rqs_d_score, rqs_j_score: number | null, rating derived from RQS-D }`, `biomarkers: { scr,msha,placeholder_density,pci,ac_testability: RQS-D deterministic; srsr,scope_drift: RQS-J shadow nullable }` — see `02l §5.1` for full TypeScript.

**The 6 Hard Telemetry Invariants (Hybrid & Multi-Day Continuity — per 02l Option A):**
- `INV-TEL-01` (Zero Blind Execution — Hybrid): Non-null trace_id, real duration_ms, and usage.total_tokens; prompt/completion exact where harness reports, `estimated=true` allowed <20% window with retry child spans; `cost_usd` nullable in Phase 1; <80% exact fails gate.
- `INV-TEL-02` (Deterministic Gate Contract): Mandatory Tier 0 RQS-D (SCR/MSHA/PD/PCI/AC <25ms, 0 tokens) assertion before disk commit.
- `INV-TEL-03` (Zero Human-in-the-Loop RQS-D Gate): Workflow success requires `RQS-D ≥85%` and deterministic biomarkers (`SCR=1.0, MSHA=1.0, PD=0.0, PCI=0.0`) — RQS-J (SRSR/SDS) shadow only, never gates Phase 1.
- `INV-TEL-04` (Regression Tripwire — Retry-Aware): CI Exit 2 on >15% token inflation (sum including retry spans) or pass drop vs `evals/baseline.json`.
- `INV-TEL-05` (Model-Tier Invariant): Tier B frontier models mandated for `@architect`, `@founder`, and `@security-engineer` (enforced via `modelTierGuards.js`).
- `INV-TEL-06` (Multi-Day Session & Trace Continuity): Continuous sessions spanning UTC date boundaries must stitch spans across `spans-*.ndjson` files via `session_id`; day rollovers auto-emit `session_resume` linkage.

**Memory-controller session-start integration (canonical step 0.4 — the full order table lives in 03 F2.14; earlier drafts numbered this "Step 0.5"):**

```markdown
### Step 0.4: Telemetry snapshot

After the memory load, invoke (via the shared session_bootstrap.js spawn):
node .agents/scripts/telemetry_surface.js session

Budget: 150ms; output ≤ 20 lines (never raw event data). Inject the output into the loaded context under a "## Recent Telemetry" heading. This gives the agent cost awareness before it starts spending tokens.
```

- [ ] F3.8 — Create `.agents/scripts/telemetry_surface.js` (~130 lines): **fix the spread bug from the first draft** (array-spread, not string-spread, when slicing lines — a string spread yields characters and mangles the digest). Supports `session`, `hot-paths`, `summary`, and `compare`, with multi-day session span stitching by `session_id`. **Implementation code:** See `03e-phase-2-implementation-specs.md` §7
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
  satisfaction section (schema pinned in `03e-phase-2-implementation-specs.md` §16,
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

- [ ] F3.21 — Create `tests/test_session_latency.js` (~80 lines): measures the 6 canonical session-start steps (03 F2.14 table) against their budgets — each ≤ budget, total < 1000ms, non-blocking steps emit `[SKIPPED]` on timeout. Owner: @tech-lead (budget) / @memory-controller (pipeline). Wire into `npm test` (F3.14). **Spec:** `03e-phase-2-implementation-specs.md` §16

---

## Done when

- [ ] `telemetry_surface.js session` returns ≤ 20 lines, runs in ≤ 150ms (no string-spread mangling)
- [ ] `/status` output includes "## Telemetry (last 7 days)"
- [ ] `/retro` digest includes top 3 hot paths
- [ ] `npm test` passes, including `test_catalog_parity.js` (derive-from-disk; docs updated in Phase 4 so it passes at done-when — no "expected to fail" line remains), `test_session_latency.js` (F3.21), `test_qa_gate.mjs`, `test_satisfaction.mjs`
- [ ] All agents (looped over `.agents/agents/`) have "See the Unseen" directive + response identity formatting
- [ ] `@data-analyst` has access to `data_analyzer.js` and `dashboard_generator.js` (specs committed to 03e-phase-2-implementation-specs.md §17 before implementation)
- [ ] T8 satisfaction events emitted with `feedback_id` pairing; `/status` identifies missing evidence, blocked rows, and stale sign-offs without subjective scoring (T-SAT-1..5 pass)

_(Graph auto-build, query API, and the `[GRAPH: …]` marker were removed by owner [NO-GO] 2026-09-24 — see F3.1–F3.7.)_

## Risks

- **Catalog parity test fails on first run.** Expected once — counts are off. The test derives from disk and outputs the diff; the **v2.1 Phase 4 documentation rewrite** (F4.11-F4.14) is the fix, not "the v2.0 release".
- **Telemetry surface overwhelms context.** Cap at 20 lines for `session`, 15 for `hot-paths`. Never raw event data. One 150ms budget number everywhere (the <1s claim is retired).
- **Satisfaction telemetry becomes a popularity contest.** Report coverage, evidence, blockers, revalidation, and resolution time; never rank agents by approval count or speed (negative-assertion fixture).

### Rollback plan

If Phase 3 breaks:
- **Telemetry:** remove step 0.4 from `memory-controller.md`. Telemetry data is still written by `swarm_telemetry.js`; only the surface layer is removed.
- **Catalog parity test:** if the test is too noisy, move it from `npm test` to a manual `npm run test:catalog` until counts stabilize.

## Handoff to Phase 4

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
