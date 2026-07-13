# Phase 3 — Quality + Observability

> **Release:** v2.1
> **Calendar:** Week 6
> **Themes:** T3 (Artifact rigor), T4 (Harness contracts)
> **Goal:** Make the graph a first-class tool (auto-build, query API), make telemetry a first-class surface (LLM-consumable digests), prove catalog consistency, and give all agents "See the Unseen" observability directives.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| F1.27-F1.28 (build-wiki) | Phase 1 (v2.0) | **Moved here as F3.17-F3.18** | Depends on doc-graph (Phase 3 work). |

## F3.1-F3.5 — Graph auto-build at 5 lifecycle moments

**Source:** Evolution §1.7 | **Theme:** T3

**Problem:** `code-graph/SKILL.md` ships with a self-healing wrapper, and `orchestrator_state.js` has an `ensure-graph` subcommand called after developer/architect/tech-lead finish work. But nothing invokes either at session start, and `doc-graph` is only seeded on `init` — never refreshed. The user must call `/code-graph` manually. Consequence: cross-file refactors all read a stale graph. The infrastructure is built but inert.

**Target:** Make graph generation automatic at 5 lifecycle moments:

1. **Session start** — `@memory-controller` runs `auto_graph.js check` (file freshness)
2. **After `/design` sign-off** — doc-graph rebuild (new PRD/ADR links to capture)
3. **After `/develop` step 3** — code-graph rebuild (new code to capture)
4. **Before `/retro` step 1** — both rebuilds (so the cycle digest references a current graph)
5. **On `orchestrator_state.js complete`** — already wired for code-graph; extend to doc-graph

**Memory-controller Step 0 (graph freshness check):**

```markdown
### Step 0: Graph freshness check

After reading instincts.md (or any context-loading step), invoke:
@executor node .agents/scripts/auto_graph.js check

Parse the one-line response:
- [OK] both — no action
- [STALE] code — run node .agents/scripts/auto_graph.js build code
- [STALE] doc — run node .agents/scripts/auto_graph.js build doc
- [STALE] both — run node .agents/scripts/auto_graph.js build both

After any rebuild, inject into the loaded context: "Graph rebuilt: {files_indexed} code, {docs_indexed} doc files."
```

- [ ] F3.1 — Create `.agents/scripts/auto_graph.js` (~140 lines). **Implementation code:** See `10-implementation-specs.md` §5
- [ ] F3.2 — Update `memory-controller.md`: insert Step 0 (graph freshness check) before context loading (text above)
- [ ] F3.3 — Update `code-graph/SKILL.md` and `doc-graph/SKILL.md`: add `## Auto-invocation triggers` section documenting the 5 lifecycle moments
- [ ] F3.4 — Update 3 skills to invoke `auto_graph.js` at the right step:
  - `design/SKILL.md` (step-06/final) → `build doc`
  - `develop/SKILL.md` (step-03 close) → `build code`
  - `retro/SKILL.md` (step-01 open) → `build both`
- [ ] F3.5 — Update `orchestrator_state.js` `complete` handler: add doc-graph refresh after existing code-graph refresh. Wrap in try/catch; never block.

## F3.6-F3.7 — Graph query API (replaces raw-JSON reads)

**Source:** Evolution §1.11 | **Theme:** T3

**Problem:** The graph is built, the LLM is told to use it, but the LLM has no API. It either reads the entire JSON and burns context (50-500 KB), or skips the graph and grep's the source tree (defeating the purpose). No `query_graph.js`, `get_dependencies.js`, `blast_radius.js`, or any read-side utility exists.

**Target:** A typed query API with 9 subcommands. Every agent invokes this, never the raw JSON file.

**Graph Query Contract blocks (to add to each reasoning agent):**

**`architect.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

Before proposing ANY structural change:
- @executor node .agents/scripts/graph_query.js code blast-radius <target-file>
- @executor node .agents/scripts/graph_query.js doc adr-constrains <module>

Emit the result as a "## Blast Radius" section in the ADR. Cost: ~1 query, ~50 tokens output. Without the graph: read every file in src/ and grep for the target — ~5000+ tokens.
```

**`tech-lead.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

Before breaking the architecture into tasks:
- @executor node .agents/scripts/graph_query.js code summary — get topology
- For each candidate parallel task: @executor node .agents/scripts/graph_query.js code blast-radius <file> — verify the tasks touch non-overlapping files (parallelism check)

Emit a "## Topology" section in the execution plan citing the graph stats.
```

**`code-reviewer.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

For every PR review:
- Identify files changed (git diff --name-only)
- For each: @executor node .agents/scripts/graph_query.js code blast-radius <file>
- Flag any change with blast_size > 5 as a "high-blast-radius" finding — these deserve extra scrutiny

This catches refactors that miss dependent callers.
```

**`developer.md` — after the Delegation Contract:**
```markdown
## Graph Query Contract

Before any refactor (rename, signature change, file move):
- @executor node .agents/scripts/graph_query.js code dependents <target-file>
- Update every file in the response before committing

Cost: 1 query. Without it: break the build, then re-grep and fix in a second pass (~3x the tokens).
```

- [ ] F3.6 — Create `.agents/scripts/graph_query.js` (~220 lines) with 9 subcommands. **Implementation code:** See `10-implementation-specs.md` §6
- [ ] F3.7 — Update 6 agents that read `code-graph.json` to use `graph_query.js`:
  - `architect.md` — blast-radius before proposing changes (contract block above)
  - `tech-lead.md` — summary for topology, blast-radius for parallelism (contract block above)
  - `code-reviewer.md` — blast-radius per changed file (contract block above)
  - `developer.md` — dependents before any rename/refactor (contract block above)
  - `memory-controller.md` — replace "must have checked code-graph.json" with `[GRAPH: ...]` marker requirement
  - Add `## Graph Query Contract` block to each of the 4 reasoning agents (text above)

## F3.8-F3.12 — Telemetry surface (LLM-consumable)

**Source:** Evolution §1.9 | **Theme:** T3

**Problem:** `swarm_telemetry.js` writes to telemetry on every event, but nothing reads it. No skill surfaces "what's the cost so far?" or "which agent is the bottleneck?" The data is written into a void.

**Target:** Make telemetry a first-class surface that 4 consumers see automatically:
1. Every session start — `@memory-controller` loads last 7 days' summary
2. Every skill's end — orchestrator surfaces "tokens used this skill: N (vs. baseline M)"
3. The `/status` skill — adds a "Telemetry" section
4. The `/retro` skill — Step 1 includes a "hot path" digest

**Memory-controller Step 0.5 (telemetry snapshot):**

```markdown
### Step 0.5: Telemetry snapshot

After the graph check, invoke:
@executor node .agents/scripts/telemetry_surface.js session

Inject the output into the loaded context (max 20 lines) under a "## Recent Telemetry" heading. This gives the agent cost awareness before it starts spending tokens.
```

- [ ] F3.8 — Create `.agents/scripts/telemetry_surface.js` (~130 lines). **Implementation code:** See `10-implementation-specs.md` §7
- [ ] F3.9 — Update `memory-controller.md`: add Step 0.5 (text above). Inject ≤20 lines under "## Recent Telemetry".
- [ ] F3.10 — Update `status/SKILL.md`: add "Surface telemetry" step. Append "## Telemetry (last 7 days)" with total tokens, top 3 agents by cost, top 3 events by frequency.
- [ ] F3.11 — Update `retro/SKILL.md` Step 1: also run `telemetry_surface.js hot-paths`, include top 3 in digest.
- [ ] F3.12 — Update `orchestrator_state.js`: after every `recordTelemetry('agent_invoke', ...)`, surface cost via `telemetry_surface.js compare`. Print `[COST] <agent> (<phase>): <one-line>`. Wrap in try/catch; never block.

## F3.13-F3.14 — Catalog parity test

**Source:** Evolution §3.4 | **Theme:** T1

**Problem:** No test ensures README/AGENTS/ROADMAP counts match on-disk reality. ECC had this exact problem (117 skills out of sync with agent.yaml).

- [ ] F3.13 — Create `tests/test_catalog_parity.js` (~100 lines): count agents in `.agents/agents/*.md`, skills in `.agents/skills/*/SKILL.md`, squads; read counts from README/AGENTS/ROADMAP; assert match; output diff and exit 1 on mismatch
- [ ] F3.14 — Update `package.json`: add `test:catalog` script; wire into `npm test`

**Note:** Expected to fail on first run — counts are already off. The v2.0 release is the fix.

## F3.15 — Universal Agent Upgrade ("See the Unseen")

**Source:** Plan Addendum | **Theme:** T1

**Problem:** Users are blind to internal state, dependencies, costs, and hidden risks of the swarm. Agents don't proactively surface what the user can't see.

**Target:** All 21 agents must be upgraded to actively surface "the unseen."

**Core directives (add to every agent's system prompt):**

```markdown
## Observability & "See the Unseen"

- **Expose codebase dependencies & blast radius:** Before proposing any changes, query the code/doc graphs using graph_query.js and report blast radius, dependents, or unreachable code to the user.
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

- [ ] F3.15.a-u — Update all 21 agents with the "See the Unseen" directives + per-agent specific mappings (above)

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
- [ ] F3.18 — Create `.agents/scripts/build_wiki.js` (~180 lines): scans `artifacts/` recursively, compiles into styled static HTML in `wiki/` at project root, integrates with doc-graph for backlinks/traceback metadata, embeds dynamic backlink navigation + Mermaid diagrams, generates interactive sidebar + searchable index

---

## Done when

- [ ] `auto_graph.js check` returns status in < 500ms; modifying any file in `src/` or `artifacts/output/` flips `[OK]` → `[STALE]`
- [ ] `/design`, `/develop`, `/retro` each trigger exactly one rebuild at their specified step
- [ ] `graph_query.js code blast-radius src/auth/login.ts` returns a structured response
- [ ] `telemetry_surface.js session` returns ≤ 20 lines, runs in < 1s
- [ ] `/status` output includes "## Telemetry (last 7 days)"
- [ ] `/retro` digest includes top 3 hot paths
- [ ] `npm test` passes, including `test_catalog_parity.js`
- [ ] `graph_query.js` used by 4 reasoning agents (architect, tech-lead, code-reviewer, developer)
- [ ] `memory-controller` enforces `[GRAPH: ...]` marker for API-related claims
- [ ] All 21 agents have "See the Unseen" directive + response identity formatting
- [ ] `@data-analyst` has access to `data_analyzer.js` and `dashboard_generator.js`
- [ ] `build-wiki` compiles `artifacts/` into styled wiki with backlinks and doc-graph alignment

## Risks

- **Graph auto-build adds latency.** `check` is mtime-only, < 500ms. `build` only runs when `[STALE]`.
- **Catalog parity test fails on first run.** Expected — counts are already off. The test outputs the diff; v2.0 release is the fix.
- **Graph query returns too much data.** Each query is sized for LLM consumption; `summary` returns top 5, `blast-radius` returns just names.
- **Telemetry surface overwhelms context.** Cap at 20 lines for `session`, 15 for `hot-paths`. Never raw event data.

### Rollback plan

If Phase 3 breaks:
- **Graph auto-build:** remove the Step 0 graph freshness check from `memory-controller.md`. Agents can still invoke `/code-graph` and `/doc-graph` manually.
- **Graph query API:** if `graph_query.js` returns incorrect results, agents fall back to reading `code-graph.json` directly (the raw JSON still exists).
- **Telemetry:** remove Step 0.5 from `memory-controller.md`. Telemetry data is still written by `swarm_telemetry.js`; only the surface layer is removed.
- **Catalog parity test:** if the test is too noisy, move it from `npm test` to a manual `npm run test:catalog` until counts stabilize.

## Handoff to Phase 4

- Graph is fresh at session start, after every skill, after every `complete` call.
- Graph is queryable via typed API; agents never read raw JSON.
- Telemetry is a first-class surface; cost visible to every agent.
- Catalog counts tested on every CI run.
- All 21 agents have observability directives.
