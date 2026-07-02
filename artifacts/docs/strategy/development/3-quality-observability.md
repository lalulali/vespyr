# Phase 3 — Quality + Observability

> **Weeks 5–6, ~22 hours**
> **Themes:** T3 (Artifact rigor), T4 (Harness contracts)
> **Goal:** Make the graph a first-class tool (auto-build, query API), make telemetry a first-class surface (LLM-consumable digests), and prove catalog consistency (counts in README match on-disk reality). After this phase, vespyr is "observable" — graph queryable, telemetry surfaced, catalog tests pass.

## Source mapping

| F-item | Master ref | Source file/section |
|---|---|---|
| F3.1–F3.5 | Phase 3 / T3 | Evolution §1.7 (graph auto-build) |
| F3.6–F3.7 | Phase 3 / T3 | Evolution §1.11 (graph query API) |
| F3.8–F3.12 | Phase 3 / T3 | Evolution §1.9 (telemetry surface) |
| F3.13–F3.14 | Phase 3 / T1 | Evolution §3.4 (catalog parity) |

---

## F3.1–F3.5 — Graph auto-build at 5 lifecycle moments

**Source:** Evolution §1.7 (files 78–82)

- [ ] F3.1 — Create `.agents/scripts/auto_graph.js` (~140 lines):
  - [ ] `check` — returns one of `[OK] both`, `[STALE] code`, `[STALE] doc`, `[STALE] both`
  - [ ] `build [code|doc|both]` — invokes `ensure_graph.js` for the target
  - [ ] `status` — shows last-build timestamps from `state/graph-last-built.json`
  - [ ] Use mtime comparison (no parsing) for the `check` path; must run in < 500ms
- [ ] F3.2 — Update `.agents/agents/memory-controller.md`:
  - [ ] Insert Step 0 (graph freshness check) before existing context loading
  - [ ] Parse the one-line response from `auto_graph.js check`
  - [ ] If `[STALE] code` or `[STALE] both` → run `build code`
  - [ ] If `[STALE] doc` or `[STALE] both` → run `build doc`
  - [ ] After rebuild, inject "Graph rebuilt: {files_indexed} code, {docs_indexed} doc files." into context
- [ ] F3.3 — Update `.agents/skills/code-graph/SKILL.md` and `.agents/skills/doc-graph/SKILL.md`:
  - [ ] Add new top section: `## Auto-invocation triggers`
  - [ ] Document the 5 lifecycle moments:
    - [ ] Session start → `auto_graph.js check`
    - [ ] After `/design` sign-off → `auto_graph.js build doc`
    - [ ] After `/develop` Step 3 → `auto_graph.js build code`
    - [ ] Before `/retro` Step 1 → `auto_graph.js build both`
    - [ ] On orchestrator `complete` → code + doc
- [ ] F3.4 — Update 3 skills to invoke `auto_graph.js` at the right step:
  - [ ] F3.4.a — `.agents/skills/design/SKILL.md` (step-06 or final step) → `build doc`
  - [ ] F3.4.b — `.agents/skills/develop/SKILL.md` (step-03 close) → `build code`
  - [ ] F3.4.c — `.agents/skills/retro/SKILL.md` (step-01 open) → `build both`
- [ ] F3.5 — Update `orchestrator_state.js` `complete` handler (around line 422):
  - [ ] After the existing code-graph refresh, add a doc-graph refresh
  - [ ] Wrap in try/catch; log failures to `artifacts/telemetry/`
  - [ ] Never block the `complete` call on a graph refresh failure

## F3.6–F3.7 — Graph query API (replaces raw-JSON reads)

**Source:** Evolution §1.11 (files 96–99)

- [ ] F3.6 — Create `.agents/scripts/graph_query.js` (~220 lines):
  - [ ] `code blast-radius <file>` — returns `{ file, imports, imported_by, blast_size }`
  - [ ] `code dependents <file>` — returns `{ file, imported_by, count }`
  - [ ] `code dependencies <file> [--depth N]` — returns transitive deps
  - [ ] `code summary` — returns `{ file_count, edge_count, top_connected }`
  - [ ] `code unreachable` — returns `{ unreachable: [files] }`
  - [ ] `doc trace <doc-path>` — outgoing + incoming edges
  - [ ] `doc story-impl <story-id>` — implements edges
  - [ ] `doc adr-constrains <module>` — ADRs that constrain a module
  - [ ] `doc orphans` — docs with no incoming or outgoing edges
  - [ ] Auto-invoke `ensure_graph.js` before each query
- [ ] F3.7 — Update 6 agents that read `code-graph.json` to use `graph_query.js` instead:
  - [ ] F3.7.a — `architect.md` — `blast-radius` before proposing changes
  - [ ] F3.7.b — `tech-lead.md` — `summary` for topology, `blast-radius` for parallelism check
  - [ ] F3.7.c — `code-reviewer.md` — `blast-radius` per changed file
  - [ ] F3.7.d — `developer.md` — `dependents` before any rename/refactor
  - [ ] F3.7.e — `memory-controller.md` — replace line 270 "must have checked code-graph.json" with `[GRAPH: ...]` marker requirement
  - [ ] F3.7.f — `docs/architecture/cross-harness.md` (or wherever the graph is documented)
  - [ ] Add `## Graph Query Contract` block to each (4 agents from F3.7.a–d)
  - [ ] Update `memory-controller.md` with the evidence requirement

## F3.8–F3.12 — Telemetry surface (LLM-consumable)

**Source:** Evolution §1.9 (files 87–91)

- [ ] F3.8 — Create `.agents/scripts/telemetry_surface.js` (~130 lines):
  - [ ] `session` — returns last 7 days' summary, max 20 lines
  - [ ] `hot-paths` — returns top hot paths from last 30 days, max 15 lines
  - [ ] `compare --agent=<name> --phase=<phase>` — returns the agent's baseline cost for that phase
  - [ ] Each output is a structured, LLM-consumable digest
- [ ] F3.9 — Update `.agents/agents/memory-controller.md`:
  - [ ] Add Step 0.5 (after graph check from F3.2): "Telemetry snapshot"
  - [ ] Invoke `telemetry_surface.js session`
  - [ ] Inject the output into the loaded context under a "## Recent Telemetry" heading
  - [ ] Max 20 lines
- [ ] F3.10 — Update `.agents/skills/status/SKILL.md`:
  - [ ] Add a new step (between "Load last session summary" and final output): "Surface telemetry"
  - [ ] Invoke `telemetry_surface.js session`
  - [ ] Append "## Telemetry (last 7 days)" section with: total tokens, top 3 agents by cost, top 3 events by frequency
- [ ] F3.11 — Update `.agents/skills/retro/SKILL.md`:
  - [ ] Step 1 (after the auto_graph build from F3.4.c) also runs `telemetry_surface.js hot-paths`
  - [ ] Include the top 3 hot paths in the retro digest
- [ ] F3.12 — Update `orchestrator_state.js`:
  - [ ] After every `recordTelemetry('agent_invoke', ...)` call (around line 416)
  - [ ] Also surface the cost via `telemetry_surface.js compare --agent=<X> --phase=<Y>`
  - [ ] Print `[COST] <agent> (<phase>): <one-line>` to stdout
  - [ ] Wrap in try/catch; never block

## F3.13–F3.14 — Catalog parity test

**Source:** Evolution §3.4 (file 26)

- [ ] F3.13 — Create `tests/test_catalog_parity.js` (~100 lines):
  - [ ] Read `README.md`, `AGENTS.md`, `ROADMAP.md` for agent/squad/skill counts
  - [ ] Read `.agents/agents/*.md` and count files
  - [ ] Read `.agents/skills/*/SKILL.md` and count folders
  - [ ] Read `.agents/squads/*.md` and count files
  - [ ] Assert: count(agents) = 21 (or new count if Phase 0's expansion is done)
  - [ ] Assert: count(skills) = 23 (or new count)
  - [ ] Assert: count(squads) = 7 (or new count)
  - [ ] Assert: docs in `docs/` cover every agent, every skill, every squad
  - [ ] Output diff and exit 1 if mismatch
- [ ] F3.14 — Update `package.json`:
  - [ ] Add `test:catalog` script → `node tests/test_catalog_parity.js`
  - [ ] Add to `test` script: `"test": "npm run test:catalog && <existing tests>"`
  - [ ] Document in `package.json` `scripts` block with comments

## F3.15 — Universal Agent Upgrade ("See the Unseen")

**Source:** Plan Addendum

- [ ] F3.15.a–u — Update all 21 agents to:
  - [ ] Add explicit response format instructions: "Begin every response with `{icon} {Human Name}:` so the user always knows which persona is in control."
  - [ ] Add explicit directives to run `graph_query.js` to inspect and highlight unseen blast-radius or codebase dependencies before proposing refactors/changes.
  - [ ] Add explicit directives to run `telemetry_surface.js` to review cost and warning thresholds.
  - [ ] Direct agents to actively highlight unseen risks, data-flow assumptions, or architectural bottlenecks to the user.

## F3.16 — Data Analyst Tools Upgrade (Analytics & Dashboards)

**Source:** Plan Addendum

- [ ] F3.16.a — Create `.agents/scripts/data_analyzer.js`
- [ ] F3.16.b — Create `.agents/scripts/dashboard_generator.js`
- [ ] F3.16.c — Update `.agents/agents/data-analyst.md`
- [ ] F3.16.d — Create unit tests in `tests/test_data_tools.js`

---

## Done when

- [ ] `auto_graph.js check` returns one of `[OK] both`, `[STALE] code`, `[STALE] doc`, `[STALE] both` in < 500ms
- [ ] Modifying any file in `src/` or `artifacts/output/` flips the status on the next session
- [ ] `/design`, `/develop`, `/retro` each trigger exactly one rebuild at their specified step
- [ ] `graph_query.js code blast-radius src/auth/login.ts` returns a structured response
- [ ] `telemetry_surface.js session` returns ≤ 20 lines, runs in < 1s
- [ ] `/status` output includes "## Telemetry (last 7 days)"
- [ ] `/retro` digest includes top 3 hot paths
- [ ] `npm test` passes, including `test_catalog_parity.js`
- [ ] `graph_query.js` is used by 4 reasoning agents (architect, tech-lead, code-reviewer, developer)
- [ ] `memory-controller` enforces `[GRAPH: ...]` marker for API-related claims
- [ ] All 21 agents have the "See the Unseen" directive and response identity formatting instructions in their prompt definitions.
- [ ] @data-analyst has access to validated data_analyzer.js and dashboard_generator.js CLI tools through task delegation.

## Risks specific to this phase

- **Graph auto-build adds 2-5s latency to every skill.** Mitigation: `check` is mtime-only, < 500ms. `build` only runs when `[STALE]`.
- **Catalog parity test fails on first run.** This is *expected* — counts are already off. The test outputs the diff and exits 1; v2.0 release is the fix.
- **Graph query API returns too much data.** Each query is sized for LLM consumption; `summary` returns top 5, `blast-radius` returns just the names.
- **Telemetry surface overwhelms the context.** Cap at 20 lines for `session`, 15 for `hot-paths`. Never include raw event data.

## Handoff to Phase 4

Once Phase 3 is done, every new file in Phase 4+ can assume:
- The graph is fresh at session start, after every skill, and after every `complete` call.
- The graph is queryable via a typed API; agents never read the raw JSON.
- Telemetry is a first-class surface; cost is visible to every agent.
- Catalog counts are tested on every CI run.
