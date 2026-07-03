# Phase 3 — Quality + Observability

> **Release:** v2.1
> **Effort:** ~22h
> **Calendar:** Week 6
> **Themes:** T3 (Artifact rigor), T4 (Harness contracts)
> **Goal:** Make the graph a first-class tool (auto-build, query API), make telemetry a first-class surface (LLM-consumable digests), prove catalog consistency, and give all agents "See the Unseen" observability directives.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| F1.27-F1.28 (build-wiki) | Phase 1 (v2.0) | **Moved here as F3.17-F3.18** | Depends on doc-graph (Phase 3 work). Forward dependency resolved. |

## F3.1-F3.5 — Graph auto-build at 5 lifecycle moments

**Source:** Evolution §1.7 | **Theme:** T3

- [ ] F3.1 — Create `.agents/scripts/auto_graph.js` (~140 lines): `check` (returns `[OK] both` / `[STALE] code` / `[STALE] doc` / `[STALE] both`), `build [code|doc|both]`, `status`. Mtime comparison only (no parsing); < 500ms. **Implementation code:** See `10-implementation-specs.md` §5
- [ ] F3.2 — Update `memory-controller.md`: insert Step 0 (graph freshness check) before context loading. Parse one-line response; rebuild if stale.
- [ ] F3.3 — Update `code-graph/SKILL.md` and `doc-graph/SKILL.md`: add `## Auto-invocation triggers` section documenting 5 lifecycle moments
- [ ] F3.4 — Update 3 skills to invoke `auto_graph.js` at the right step:
  - `design/SKILL.md` (step-06/final) → `build doc`
  - `develop/SKILL.md` (step-03 close) → `build code`
  - `retro/SKILL.md` (step-01 open) → `build both`
- [ ] F3.5 — Update `orchestrator_state.js` `complete` handler: add doc-graph refresh after existing code-graph refresh. Wrap in try/catch; never block.

## F3.6-F3.7 — Graph query API (replaces raw-JSON reads)

**Source:** Evolution §1.11 | **Theme:** T3

- [ ] F3.6 — Create `.agents/scripts/graph_query.js` (~220 lines) with 9 subcommands:
  - `code blast-radius <file>` — imports, imported_by, blast_size
  - `code dependents <file>` — imported_by + count
  - `code dependencies <file> [--depth N]` — transitive deps
  - `code summary` — file_count, edge_count, top_connected
  - `code unreachable` — files with zero imports/importers
  - `doc trace <doc-path>` — outgoing + incoming edges
  - `doc story-impl <story-id>` — implements edges
  - `doc adr-constrains <module>` — ADRs constraining a module
  - `doc orphans` — docs with no edges
  - **Implementation code:** See `10-implementation-specs.md` §6
- [ ] F3.7 — Update 6 agents that read `code-graph.json` to use `graph_query.js`:
  - `architect.md` — blast-radius before proposing changes
  - `tech-lead.md` — summary for topology, blast-radius for parallelism
  - `code-reviewer.md` — blast-radius per changed file
  - `developer.md` — dependents before any rename/refactor
  - `memory-controller.md` — replace "must have checked code-graph.json" with `[GRAPH: ...]` marker requirement
  - Add `## Graph Query Contract` block to each of the 4 reasoning agents

## F3.8-F3.12 — Telemetry surface (LLM-consumable)

**Source:** Evolution §1.9 | **Theme:** T3

- [ ] F3.8 — Create `.agents/scripts/telemetry_surface.js` (~130 lines): `session` (last 7 days, ≤20 lines), `hot-paths` (last 30 days, ≤15 lines), `compare --agent=<name> --phase=<phase>`. **Implementation code:** See `10-implementation-specs.md` §7
- [ ] F3.9 — Update `memory-controller.md`: add Step 0.5 (telemetry snapshot) after graph check. Inject ≤20 lines under "## Recent Telemetry".
- [ ] F3.10 — Update `status/SKILL.md`: add "Surface telemetry" step. Append "## Telemetry (last 7 days)" with total tokens, top 3 agents by cost, top 3 events by frequency.
- [ ] F3.11 — Update `retro/SKILL.md` Step 1: also run `telemetry_surface.js hot-paths`, include top 3 in digest.
- [ ] F3.12 — Update `orchestrator_state.js`: after every `recordTelemetry('agent_invoke', ...)`, surface cost via `telemetry_surface.js compare`. Print `[COST] <agent> (<phase>): <one-line>`. Wrap in try/catch; never block.

## F3.13-F3.14 — Catalog parity test

**Source:** Evolution §3.4 | **Theme:** T1

- [ ] F3.13 — Create `tests/test_catalog_parity.js` (~100 lines): count agents in `.agents/agents/*.md`, skills in `.agents/skills/*/SKILL.md`, squads; read counts from README/AGENTS/ROADMAP; assert match; output diff and exit 1 on mismatch
- [ ] F3.14 — Update `package.json`: add `test:catalog` script; wire into `npm test`

**Note:** This test is *expected* to fail on first run — counts are already off. The v2.0 release is the fix.

## F3.15 — Universal Agent Upgrade ("See the Unseen")

**Source:** Plan Addendum | **Theme:** T1

This is the concrete implementation of the observability directive. Phase 0 T7.4 adds the identity docs; F3.15 adds the actual tool invocation directives.

- [ ] F3.15.a-u — Update all 21 agents to:
  - Add response format: "Begin every response with `{icon} {Human Name}:`" (reinforces Phase 0 F0.9)
  - Add directive to run `graph_query.js` to inspect blast-radius/dependencies before proposing refactors
  - Add directive to run `telemetry_surface.js` to review cost and warning thresholds
  - Add directive to actively highlight unseen risks, data-flow assumptions, architectural bottlenecks

**Specific agent mappings:**
- `@founder` — highlight unseen market assumptions, hidden trade-offs of skipping validation
- `@product-manager` — expose unseen dependency paths between user stories, unverified ACs
- `@architect` — map unseen structural blast radius, warn of circular dependencies
- `@tech-lead` — call out unseen parallel execution bottlenecks, estimate token cost impact
- `@developer` — run dependents checks before modifying files, alert to code that might break
- `@code-reviewer` — calculate blast radius of changes, point out unseen side-effects
- `@qa-engineer` — identify unseen edge cases, untested branches, test gaps
- `@security-engineer` — uncover unseen attack surfaces, dependency vulnerabilities, data flow leaks
- `@performance-engineer` — surface unseen bottlenecks in call stack and memory allocations

## F3.16 — Data Analyst Tools Upgrade

**Source:** Plan Addendum | **Theme:** T2

- [ ] F3.16.a — Create `.agents/scripts/data_analyzer.js`: funnel analysis (drop-offs, conversion rates), A/B testing calculator (Z-scores, p-values, significance), data validation (anomalies, null/duplicate values, schema drifts)
- [ ] F3.16.b — Create `.agents/scripts/dashboard_generator.js`: premium HTML view (responsive, KPI cards, SVG charts — bar/line), Markdown summary (tables, Unicode progress bars for LLM compatibility)
- [ ] F3.16.c — Update `data-analyst.md`: add tool command usage patterns, direct agent to execute statistics verification before writing reports
- [ ] F3.16.d — Create unit tests in `tests/test_data_tools.js`

## F3.17-F3.18 — Build-wiki skill (moved from Phase 1)

**Source:** Custom Requirement | **Theme:** T3

Moved from Phase 1 because it depends on doc-graph (Phase 3 work).

- [ ] F3.17 — Create `.agents/skills/build-wiki/SKILL.md` (~60 lines): when to invoke (compile artifacts into navigable wiki), done when (compilation complete, index/backlinks updated)
- [ ] F3.18 — Create `.agents/scripts/build_wiki.js` (~180 lines):
  - Scans `artifacts/` recursively as raw source
  - Compiles into styled static HTML in `wiki/` at project root
  - Integrates with doc-graph (from F3.6) for backlinks and traceback metadata
  - Embeds dynamic backlink navigation, forward links, Mermaid relationship diagrams
  - Generates interactive sidebar, searchable index, clean typography

---

## Done when

- [ ] `auto_graph.js check` returns status in < 500ms; modifying any file in `src/` or `artifacts/output/` flips `[OK]` → `[STALE]` on next session
- [ ] `/design`, `/develop`, `/retro` each trigger exactly one rebuild at their specified step
- [ ] `graph_query.js code blast-radius src/auth/login.ts` returns a structured response
- [ ] `telemetry_surface.js session` returns ≤ 20 lines, runs in < 1s
- [ ] `/status` output includes "## Telemetry (last 7 days)"
- [ ] `/retro` digest includes top 3 hot paths
- [ ] `npm test` passes, including `test_catalog_parity.js`
- [ ] `graph_query.js` used by 4 reasoning agents (architect, tech-lead, code-reviewer, developer)
- [ ] `memory-controller` enforces `[GRAPH: ...]` marker for API-related claims
- [ ] All 21 agents have "See the Unseen" directive + response identity formatting
- [ ] `@data-analyst` has access to `data_analyzer.js` and `dashboard_generator.js` via task delegation
- [ ] `build-wiki` compiles `artifacts/` into styled wiki with backlinks and doc-graph alignment

## Risks

- **Graph auto-build adds latency.** `check` is mtime-only, < 500ms. `build` only runs when `[STALE]`.
- **Catalog parity test fails on first run.** Expected — counts are already off. The test outputs the diff; v2.0 release is the fix.
- **Graph query returns too much data.** Each query is sized for LLM consumption; `summary` returns top 5, `blast-radius` returns just names.
- **Telemetry surface overwhelms context.** Cap at 20 lines for `session`, 15 for `hot-paths`. Never raw event data.

## Handoff to Phase 4

- Graph is fresh at session start, after every skill, after every `complete` call.
- Graph is queryable via typed API; agents never read raw JSON.
- Telemetry is a first-class surface; cost visible to every agent.
- Catalog counts tested on every CI run.
- All 21 agents have observability directives.
