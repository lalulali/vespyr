# Vespyr Roadmap

This document tracks what's planned, what's in progress, and what's done. It's a living document — priorities shift based on community feedback and adoption patterns.

> **Canonical v2.0 plan:** The 6-theme, 5-phase master plan at [`0. vespyr-master-roadmap.md`](./0.%20vespyr-master-roadmap.md) is the source of truth for sequencing, ownership, and acceptance criteria. This file is the high-level summary; the [`development/`](./development/) sub-folder breaks each phase into micro-tasks.
>
> **Source materials:**
> - [`1. framework_comparison_vespyr_ecc_bmad_ruflo.md`](./1.%20framework_comparison_vespyr_ecc_bmad_ruflo.md) — 4-framework analysis that drove the v2.0 plan
> - [`2. vespyr_evolution_plan.md`](./2.%20vespyr_evolution_plan.md) — tactical fixes *(superseded by the master plan; kept for historical reference)*
> - [`3. adoption-plan-agents-and-skills.md`](./3.%20adoption-plan-agents-and-skills.md) — cross-framework adoptions *(superseded by the master plan; kept for historical reference)*
> - [`4. persona-skill-enrichment-plan.md`](./4.%20persona-skill-enrichment-plan.md) — "Deeper Bench" enrichment (T1 → v2.1, T2 + T3 → v2.2)

---

## Release structure

The v2.0 master plan is split across three releases to right-size the surface for a solo maintainer. The driver: v2.0 as a single 8-week release is 138 hours of work where most of the new code is imported from other frameworks (BMAD, ECC, Ruflo). Splitting gives the differentiators room to breathe.

| Release | Scope | Effort | Themes |
|---|---|---|---|
| **v2.0** | **Pre-Phase 0** (Hermes & OpenClaw integration plan) + master plan **Phases 0 + 1** — foundation + skill restructure + artifact rigor | ~78-82h / 5-6 weeks | T1, T2, T3 |
| **v2.1** | Master plan **Phases 2 + 3 + 4** + **Deeper Bench T1** (14 personas + 13 skills + 3 squads) | ~126h / 8-9 weeks | T3, T4, T5, T6 |
| **v2.2** | **Deeper Bench T2 + T3** (7 personas + 4 skills) | ~24h / 2 weeks | T1, T2 |

If a release slips, the previous release is valid. **The plan is resilient to delay.**

---

## Now — v2.0 (Active development)

The v2.0 release makes Vespyr's architecture **executable, customizable, and verifiable** by landing the structural rigor (Phases 0 + 1 of the master plan). It does **not** include hooks, MCP, self-learning, witness, graph, telemetry, modularity, or the Deeper Bench — those move to v2.1+.

**v2.0 budget:** ~78-82 hours (pre-Phase 0 + Phases 0 + 1), ~5-6 weeks at 15h/week. **48 new + ~30 modified files (Phases 0 + 1 subset) + the Hermes/OpenClaw integration plan (~6-10h, no code yet).**

### The 6 themes

Every file in the plan maps to exactly one theme. Themes are capability-shaped, not implementation-shaped — they describe what Vespyr becomes, not how the work is sequenced.

| # | Theme | One-line statement |
|---|---|---|
| **T1** | **Agent depth** | Agents are *role-locked* personas, not editable prompts. Customization is structured and survives updates. |
| **T2** | **Skill atomicity** | A skill is a *folder of self-contained step files*, not a single Markdown blob. Skills resume; skills have phases; skills are first-class tools. |
| **T3** | **Artifact rigor** | Every artifact has a kernel + companions, a status, a hash witness, and a traceability graph. Nothing is silent. |
| **T4** | **Harness contracts** | Vespyr enforces policy at the harness layer (hooks), exposes its primitives to other tools (MCP), and ports cleanly across IDEs. *(v2.1)* |
| **T5** | **Self-improvement loop** | Sessions leave behind patterns. Patterns promote to conventions. Conventions promote to instincts. Instincts auto-load. *(v2.1)* |
| **T6** | **Modularity** | The core stays lean. Domain extras (game, ML, security, finance) ship as separate packages. Selective install is the default. *(v2.1)* |

### The v2.0 phases

Phases 0 + 1 only. The remaining phases move to v2.1.

| Phase | Week | Hours | Themes | What ships |
|---|---|---|---|---|
| **Phase 0** — Foundation | Week 1 | ~18h | T1, T3 | Frontmatter schema v2 (`name`, `icon`, `capabilities`, `default_squad`, `origin`); `<!-- IDENTITY: do not edit -->` block; channeled-mentor references; canonical phase table; entry-point consolidation (one canonical, symlinks out); 2-file customization TOML + `customize` skill; thin skills (`grill-me`, `squad`, `delegate`, `plan`, `code-graph`, `memory`) promoted to ≥ 80 lines |
| **Phase 1** — Skill restructure + artifact rigor | Weeks 2–3 | ~54h | T2, T3 | 5 long skills → folder + `steps/` (`develop`, `validate-idea`, `retro`, `design`, `launch`); tri-modal flows on `validate-idea` and `design`; spec-kernel PRD shape (`templates/prd/SPEC.md` + companions); `sprint-status.yaml` as the human-readable state; `code-reviewer` 15-item false-positive guard; Ivy `design.md` companion + dynamic HTML presentation; ASCII CLI dashboards; 9 domain-expert agents expanded to ≥ 200 lines |

### Pre-Phase 0 — Hermes & OpenClaw integration plan (~6-10h)

Two harnesses get dedicated pre-Phase 0 treatment instead of staying in the future-harnesses backlog. Rationale: Hermes is a "loyal niche" with a distinct agent invocation model; OpenClaw has a unique no-dotfolder, root-level deployment model that conflicts with Vespyr's default `artifacts/` layout and warrants design work before scaffolding can be generalized.

This work is positioned as a **separate pre-Phase 0 phase** (rather than absorbed into the existing 18h Phase 0 budget) so the foundation work stays at its planned size. If the investigation finishes in < 6h, it can be folded back into Phase 0 as F0.23+ and the pre-Phase 0 label dropped.

**Why these two (not the other 35 future harnesses):**

- **Hermes** — currently undifferentiated in the future-harness list. Pre-Phase 0 work will determine if it warrants promotion to "active" alongside the 8 already supported harnesses.
- **OpenClaw** — has explicit friction: no dotfolder prefix, root-level deployment, and a documented security concern (Hunt.io reported 17,470 publicly-exposed instances in 2024, cited in the comparative review's security section). Integration requires a threat-model review before scaffolding.

**Planning deliverables (P0.1–P0.4):**

- **P0.1** — Hermes adapter investigation (~3h): read Hermes docs; identify config format, tool/permission model, agent file format, how it handles `.hermes/skills/`
- **P0.2** — OpenClaw adapter investigation (~3h): same, with explicit treatment of the no-dotfolder quirk and a current-state threat-model review
- **P0.3** — Per-harness adapter design (~2h): extend `bin/install.js` with a Phase 0 stub for both harnesses (full implementation is v2.1 Phase 2 F2.3)
- **P0.4** — Smoke-test plan (~2h): design the "does this install work?" check for each new harness, including the OpenClaw root-level verification

**OpenClaw no-dotfolder deployment model.** OpenClaw expects `skills/` at the project root, not `.agents/skills/` or similar. This conflicts with Vespyr's default per-harness dotfolder convention. The pre-Phase 0 adapter must answer: (a) does Vespyr mirror skills to the root on install, (b) does OpenClaw read from a configurable path, or (c) does Vespyr add a `.openclaw` symlink at the root? Each option has different security implications:

- **Mirror (a):** skills exist in two places post-install → drift risk, double the disk footprint
- **Configurable path (b):** OpenClaw reads from `artifacts/memory/` or wherever Vespyr stores them → requires OpenClaw to support custom paths, which may or may not be supported
- **Symlink (c):** cleanest from Vespyr's perspective, but exposes the dotfolder convention to OpenClaw's security model

**OpenClaw security review.** The Hunt.io finding is a 2024-era snapshot. P0.2 must include a current-state threat-model check: have the upstream issues been patched? Is integration effectively a "distribute insecurely" risk? If unresolved, the OpenClaw adapter ships in v2.0-rc3 only, behind a feature flag `VESPYR_OPENCLAW=off` by default, and the GUARDRAILS.md upstream-artifact read policy is updated to flag OpenClaw-sourced content.

**Open questions (blockers for P0.1):**

1. What is the current Hermes agent file format and tool/permission model? Not yet documented in the strategy folder.
2. Has the OpenClaw exposure issue been patched upstream, or is the risk still live?
3. Does Vespyr need separate OpenClaw/Hermes test fixtures, or share with existing harness tests?
4. Should Hermes/OpenClaw integration ship in v2.0-rc1, v2.0-rc2, or v2.0-rc3 (release-ready)?

**Implementation (v2.1 Phase 2 F2.3).** The full Hermes and OpenClaw adapter implementation is v2.1 work (master plan F2.3: "per-harness adapter that writes the right hook config"). Pre-Phase 0 is planning + investigation only.

### The 10 v2.0 DoD criteria

The v2.0 release ships when all 10 pass (subset of master plan Part 6 — 5 of the 14 criteria moved to v2.1 with their parent phases):

1. All 21 agents have v2 frontmatter
2. All 21 agents have channeled-mentor reference
3. The 5 long skills are folder + step files with resume semantics
4. Spec-kernel is the canonical PRD shape (`templates/prd/SPEC.md` + companions)
5. `sprint-status.yaml` is the human-readable state of truth
6. `code-reviewer.md` has the 15-item false-positive guard
7. `@product-designer` (Ivy) generates `design.md` + dynamic HTML adaptively
8. Orchestrator CLI prints human-readable ASCII dashboards by default
9. 9 domain-expert agents (code-reviewer, ml-engineer, devops, data-analyst, security, performance, researcher, user-researcher, ux-researcher) are all ≥ 200 lines
10. Hermes and OpenClaw integration plans are written and approved (P0.1–P0.4). Full adapter implementation is v2.1 Phase 2 F2.3.

The remaining 5 master DoD criteria (10 hooks, 10 MCP tools, self-learning, graph auto-build, catalog parity) are v2.1 work.

### v2.0 release mechanics

These were missing from the original master plan and are added here.

**Rollback plan.** v2.0 ships behind a feature flag `VESPYR_V2=off` that reverts to v1.7.x behavior. The `npx vespyr migrate` command is reversible — `npx vespyr migrate --down` rolls back to the pre-v2.0 state from a backup written at install time. If a v2.0 install breaks, the user is never more than one command away from a working v1.7.x.

**Release candidate cutoffs.** Each rc is independently shippable:

- **v2.0-rc1** — DoD #1, #2, #3, #10 (frontmatter, channeled mentor, skill folders, Hermes/OpenClaw integration plans). Minimum structural rigor + harness roadmap.
- **v2.0-rc2** — + DoD #4, #5 (spec-kernel, sprint-status).
- **v2.0-rc3** — + DoD #6, #7, #8, #9 (false-positive guard, Ivy, ASCII dashboards, ≥ 200-line domain experts). **Release-ready.**

**Decision authority for in-flight trade-offs.** When a phase is mid-execution and a new constraint emerges (e.g., a phase overruns by 1 week), **Christian has sole decision authority**. The default: **defer to v2.1, do not slip v2.0's release date**. Reasoning: v2.0 is the structural rigor release; if a feature can't make it in cleanly, it doesn't make it in. The phased rc cutoffs make this easier — anything that doesn't hit rc3 is v2.1 work, by definition.

### v1.7.x (current stable) — `npx create-vespyr` installer

Vespyr v1.7.x is the shipping version while v2.0 is in development. The headline is a single-command installer that scaffolds the system into any project, for any harness.

```bash
npx create-vespyr
```

**Planned flow:**

```
? Which harness are you using?
  ❯ opencode (default)
    Claude Code
    Cursor
    Windsurf
    GitHub Copilot
    Codex CLI
    Aider
    Zed

? Which squad do you want to start with?
  ❯ full-team
    startup
    build
    research
    design
    ship
    game-studio

? Where should Vespyr be installed?
  ❯ Current directory (.)
    Enter a path

Installing Vespyr for opencode with the startup squad...
✓ Created .agents/agents/ (21 agents)
✓ Created .agents/skills/
✓ Created .agents/templates/
✓ Created artifacts/memory/
✓ Created artifacts/output/
✓ Created AGENTS.md
✓ Created QUICK-REFERENCE.md

Done. Run `opencode` to start.
```

**Harness priority order** (based on adoption data and community size):

| Priority | Harness | Rationale |
|---|---|---|
| 1 | opencode | Native — already done |
| 2 | Claude Code | Fastest-growing terminal agent, native subagent support, closest architecture match |
| 3 | Cursor | Largest IDE user base (~$1B ARR), most community demand |
| 4 | GitHub Copilot | 4.7M paid subscribers, enterprise reach |
| 5 | Windsurf | Strong growth, acquired for $250M, good agent support |
| 6 | Codex CLI | OpenAI ecosystem, growing terminal user base |
| 7 | Aider | Loyal niche, git-native workflow |
| 8 | Zed | Small but fast-growing, developer-focused |

Each harness port generates the correct file structure for that tool — `.cursor/rules/` for Cursor, `.claude/agents/` for Claude Code, `.github/agents/` for Copilot, etc.

### Future additional harnesses (Backlog)

> **Note:** Hermes Agent and OpenClaw have been moved from this list to the **Pre-Phase 0 integration plan** above (planning in v2.0, full implementation in v2.1 Phase 2 F2.3). The remaining 35 harnesses below are unchanged.

We plan to expand auto-detection and dedicated symlink/config output support for other emerging developer agents and CLI harnesses. These will be prioritized in future releases:

| Harness | Target Dotfolder Prefix | Configuration & Rules Directory |
|:---|:---|:---|
| **AiderDesk** | `.aider-desk/` | `.aider-desk/skills/` |
| **Augment** | `.augment/` | `.augment/skills/` |
| **IBM Bob** | `.bob/` | `.bob/skills/` |
| **CodeArts Agent** | `.codeartsdoer/` | `.codeartsdoer/skills/` |
| **CodeBuddy** | `.codebuddy/` | `.codebuddy/skills/` |
| **Codemaker** | `.codemaker/` | `.codemaker/skills/` |
| **Code Studio** | `.codestudio/` | `.codestudio/skills/` |
| **Command Code** | `.commandcode/` | `.commandcode/skills/` |
| **Continue** | `.continue/` | `.continue/skills/` |
| **Cortex Code** | `.cortex/` | `.cortex/skills/` |
| **Crush** | `.crush/` | `.crush/skills/` |
| **Devin for Terminal** | `.devin/` | `.devin/skills/` |
| **Droid** | `.factory/` | `.factory/skills/` |
| **ForgeCode** | `.forge/` | `.forge/skills/` |
| **Goose** | `.goose/` | `.goose/skills/` |
| **Junie** | `.junie/` | `.junie/skills/` |
| **iFlow CLI** | `.iflow/` | `.iflow/skills/` |
| **Kilo Code** | `.kilocode/` | `.kilocode/skills/` |
| **Kiro CLI** | `.kiro/` | `.kiro/skills/` |
| **Kode** | `.kode/` | `.kode/skills/` |
| **MCPJam** | `.mcpjam/` | `.mcpjam/skills/` |
| **Mistral Vibe** | `.vibe/` | `.vibe/skills/` |
| **Mux** | `.mux/` | `.mux/skills/` |
| **OpenHands** | `.openhands/` | `.openhands/skills/` |
| **Pi** | `.pi/` | `.pi/skills/` |
| **Qoder** | `.qoder/` | `.qoder/skills/` |
| **Qwen Code** | `.qwen/` | `.qwen/skills/` |
| **Rovo Dev** | `.rovodev/` | `.rovodev/skills/` |
| **Roo Code** | `.roo/` | `.roo/skills/` |
| **Tabnine CLI** | `.tabnine/` | `.tabnine/agent/skills/` |
| **Trae / Trae CN** | `.trae/` | `.trae/skills/` |
| **Zencoder** | `.zencoder/` | `.zencoder/skills/` |
| **Neovate** | `.neovate/` | `.neovate/skills/` |
| **Pochi** | `.pochi/` | `.pochi/skills/` |
| **AdaL** | `.adal/` | `.adal/skills/` |

---

## Then — v2.1 (Phases 2 + 3 + 4 + Deeper Bench T1)

The v2.1 release is the second half of the v2.0 master plan (Phases 2 + 3 + 4) plus the Deeper Bench T1 (14 personas + 13 skills + 3 new squads). v2.1 ships **hooks, MCP, self-learning, witness, graph, telemetry, modularity, and the deeper bench**.

**v2.1 budget:** ~126 hours, ~8-9 weeks at 15h/week. **+28 new + ~35 modified files (Phases 2-4) + ~40 new files (T1).**

### Phases 2 + 3 + 4

| Phase | Week | Hours | Themes | What ships |
|---|---|---|---|---|
| **Phase 2** — Enablement | Week 4 | ~22h | T4, T5 | 10 lifecycle hooks (env-var-disablable via `VESPYR_DISABLED_HOOKS` / `VESPYR_HOOK_PROFILE`); **MCP server with 10 tools** (`mcp__vespyr__memory_load` etc.) — *MCP was originally v2.0 in master plan; deferred here to reduce v2.0 surface*; self-learning pipeline (episode → pattern → instinct, 3+ occurrences / 2+ agents / 7+ days required for promotion); SHA-256 witness; QA as a hard gate (`qa-signoff.md` blocks phase advance) |
| **Phase 3** — Quality + observability | Weeks 5–6 | ~22h | T3, T4 | Graph auto-built at 5 lifecycle moments (`auto_graph.js check` < 500ms); typed graph query API (`graph_query.js`); telemetry surface (`telemetry_surface.js`); catalog parity test (`test_catalog_parity.js` in `npm test`); Universal Agent Upgrade ("See the Unseen") on all 21 agents; data analyst CLI tools (`data_analyzer.js` + `dashboard_generator.js`) |
| **Phase 4** — Modularity + handoff | Weeks 7–8 | ~22h | T6 | `install-modules` with 7 manifest modules (`install-modules.json`); `rules/common/` + per-language overrides (`rules/typescript/`, `python/`, `go/`); `agent-builder` / `skill-builder` / `workflow-builder` meta-skills; worked example project (CLI todo list, `npx vespyr init --example` in 30s); README / AGENTS / QUICK-REFERENCE / CHANGELOG refresh |

### Deeper Bench T1 (14 personas + 13 skills + 3 squads)

After v2.1's Phase 2-4 work lands, the persona + skill library expands to fill gaps that the comparative review surfaced. Full plan in [`4. persona-skill-enrichment-plan.md`](./4.%20persona-skill-enrichment-plan.md).

**T1 personas (14):** brainstormer, innovation-strategist, problem-solver, storyteller, presentation-master, growth-marketer, seo-specialist, database-engineer, api-designer, ml-ops, accessibility-architect, migration-engineer, customer-success, support-engineer

**T1 skills (13):** brainstorming, pr-faq, epics-and-stories, market-research, storytelling, presentation, design-thinking, accessibility-audit, cost-analysis, api-design, database-migration, migrate-stack, correct-course (+ llm-wiki)

**T1 squads (+3):** `growth`, `data-platform`, `migration` (opt-in; not in default `startup` / `build`)

**T1 cross-cutting upgrades:**
- **Universal Agent Upgrade ("See the Unseen")** — all 21+ agents query code/doc graphs (blast radius, dependents, unreachable), surface hidden token costs vs. baselines, list unseen assumptions in every plan, and prefix every response with `{icon} {human_name}:`.
- **Data Analyst Tools** — `data_analyzer.js` (funnel / A-B testing / data validation) + `dashboard_generator.js` (responsive HTML with KPI cards + SVG charts; lightweight Markdown for LLM) exposed as CLI commands for `@data-analyst`.

### T1 persona gating (added per the v2.0 review)

Each T1 persona must clear **one of two gates** before it ships:

- **Gate A — Demand:** 3+ community requests with named use cases (GitHub issues, Discord threads, or 1:1 feedback).
- **Gate B — Depth:** Substantive charter matching the existing 21 personas' depth — ≥ 200 lines with persona depth, decision tree, failure modes, escalation patterns, memory write-back contracts.

The "1-day ECC repackage" pattern from the Deeper Bench draft is **insufficient**. Personas that don't clear either gate move to v2.2+ or back to the backlog. The drift risk (ECC's 117 skills out of sync with `agent.yaml`) is the cautionary tale.

### T1 coordination rules (added per the v2.0 review)

**`@ml-ops` ↔ `@ml-engineer` handoff rule.** `@ml-engineer` (Kai) owns model development (training, evaluation, experimentation). `@ml-ops` (Atlas) owns the production system (serving, monitoring, drift detection, rollback). The handoff trigger is an **artifact, not a direct inter-agent call**: `@ml-engineer` writes `artifacts/output/architecture/model-approved-for-production.md` (model card, evaluation results, SLA targets) when a model is ready. `@ml-ops` reads the artifact and owns the deployment pipeline from that point. The artifact is the contract.

**`@brainstormer` ↔ `@founder` pairing.** `@brainstormer` is divergent (widens the option space). `@founder` is convergent (narrows it). The two are intentionally complementary; brainstorming ends only when the user calls it. Documented in `AGENTS.md`.

### v2.1 DoD criteria (master DoD 10-14 + Deeper Bench T1)

The remaining 5 master plan DoD criteria (now v2.1) plus the Deeper Bench T1 ACs:

10. 10 lifecycle hooks registered, env-var-disablable, documented
11. MCP tool surface exposes 10 tools, all callable from a Claude Code or OpenCode session
12. `orchestrator_state.js next` refuses to advance out of `development` without `qa-signoff.md`
13. Self-learning works end-to-end (episode → pattern → instinct)
14. Graph is auto-built at 5 lifecycle moments; `auto_graph.js check` runs in < 500ms
15. Catalog parity test passes (`npm test` includes `test_catalog_parity.js`)
16. All 14 T1 personas have v2 frontmatter, IDENTITY block, icon, channeled-mentor, charter; each cleared Gate A or Gate B
17. All 13 T1 skills are folder + `SKILL.md` + `steps/`, integrated with orchestrator
18. The 10 squads are updated; 3 new squads are opt-in
19. `@ml-ops` ↔ `@ml-engineer` handoff rule is in the artifacts-output contract, not a direct call
20. All 21+ agents upgraded with "See the Unseen" directive and response prefixes
21. `@data-analyst` has access to `data_analyzer.js` and `dashboard_generator.js` CLI tools via task delegation

---

## Then — v2.2 (Deeper Bench T2 + T3)

The v2.2 release finishes the Deeper Bench.

**v2.2 budget:** ~24 hours, ~2 weeks. **~7 new files (personas) + ~4 new files (skills).**

**T2 personas (6):** narrative-engineer, game-designer, game-developer, level-designer, brand-voice-curator, content-engineer

**T2 skills (4):** domain-research, game-design-doc, playtest-plan, narrative-design

**T3 personas (1):** legal-counsel (read-only)

Same persona gating as T1 (Gate A or Gate B). Game-studio cohort requires a working game project (even a prototype) that exercises every game persona before any of them ship; if we can't find one, the game personas defer to a separate minor release.

---

## Later

### Proper documentation site

The current README and PORTING.md are functional but not scalable. The goal is a documentation site structured like BMAD Method's docs — four sections, each serving a different reader intent:

| Section | Purpose | Examples |
|---|---|---|
| **Tutorials** | Learning-oriented, step-by-step | "Build your first product with Vespyr", "Run a design sprint" |
| **How-to guides** | Task-oriented, solve a specific problem | "Add a new agent", "Port to Cursor", "Create a squad" |
| **Explanation** | Concept-oriented, understand why | "Why the delegation pattern", "How shared memory works", "Agent boundaries" |
| **Reference** | Information-oriented, look things up | Agent catalog, frontmatter schema, squad definitions, template specs |

**Tech stack candidates:** Starlight (Astro), Docusaurus, VitePress. Starlight is the leading candidate — it's what BMAD uses, it's fast, and it generates an `llms-full.txt` for AI-optimized context (useful for a project that is itself about AI agents).

**Planned pages:**

```
docs/
├── index.md                          # Welcome + quick start
├── tutorials/
│   ├── getting-started.md            # Install + first run
│   ├── startup-workflow.md           # Full startup lifecycle
│   ├── build-workflow.md             # Build squad walkthrough
│   └── game-studio-workflow.md       # Game dev walkthrough
├── how-to/
│   ├── add-agent.md                  # Create a new agent
│   ├── create-squad.md               # Define a squad
│   ├── port-to-cursor.md             # Cursor port guide
│   ├── port-to-claude-code.md        # Claude Code port guide
│   ├── port-to-copilot.md            # Copilot port guide
│   ├── customize-templates.md        # Change output formats
│   └── use-humanizer.md              # Humanizer skill guide
├── explanation/
│   ├── delegation-pattern.md         # Why I/O separation matters
│   ├── shared-memory.md              # How agents coordinate
│   ├── agent-boundaries.md           # Why one agent, one concern
│   └── squad-design.md              # How squads are designed
└── reference/
    ├── agent-catalog.md              # All 21 agents, full spec
    ├── squad-catalog.md              # All squads
    ├── frontmatter-schema.md         # Agent file format
    ├── template-specs.md             # Output template formats
    ├── shared-memory-schema.md       # Memory file formats
    └── harness-compatibility.md      # What works where
```

### Continuous improvement system

**1. Agent calibration**

Agents track their own estimation accuracy and decision quality in `artifacts/memory/agent-notes/`. Over time, patterns emerge — which agents consistently over-estimate, which quality gates catch the most issues, which phases produce the most rework. This data feeds back into agent prompts.

**2. Community improvement loop**

A structured process for community-contributed agent improvements:

- Users submit agent prompt improvements via PR
- Changes are tagged with the problem they solve and the evidence behind them
- Accepted changes are versioned in agent frontmatter
- A changelog tracks what changed and why

This is different from arbitrary prompt tweaking — every change needs a stated problem and a rationale.

---

## Backlog (no timeline)

These are ideas that have been raised but not yet prioritized. They need more definition before they move up.

**Multi-agent parallelism**
Run multiple developer agents on separate git worktrees simultaneously. The developer agent already has a multi-developer mode section — this would make it a first-class feature with proper worktree-aware coordination.

**MCP server integration**
Expose Vespyr agents as MCP tools so they can be invoked from any MCP-compatible harness without manual porting. *(Already covered for *primitive exposure* in v2.1; this item is about exposing *agents* themselves, not primitives.)*

**Agent marketplace**
A community registry for custom agents and squads. Users can publish domain-specific agents (e.g., `@solidity-engineer`, `@ios-developer`, `@data-engineer`) and install them via `npx create-vespyr --add @community/solidity-engineer`.

**VS Code extension**
A dedicated extension that surfaces the agent team in the VS Code sidebar — squad selector, agent status, shared memory viewer, artifact browser.

**Vespyr Cloud**
Hosted shared memory and artifact storage for teams. Multiple developers working on the same project share one `artifacts/memory/` state rather than each maintaining their own copy.

**T7 — Vespyr Identity (deferred from v2.0)**
A small ~200-line workstream to advance at least one existing differentiator, addressing the v2.0 review's concern that v2.0's import-heavy plan doesn't advance Vespyr's unique differentiators. Candidates:
- **Multi-developer worktree delegation enforcement** (~60 lines) — extends the permission-denial I/O split, the #1 moat.
- **Cross-session memory pattern auto-loading** (~80 lines) — extends the 3-tier progressive memory.
- **Socratic universal minimum bar** (~40 lines) — extends Socratic depth; enforced via `validate_frontmatter.js`.
- Plus a "Vespyr identity" section in AGENTS.md / README explicitly stating the 3 differentiators (permission-denial, Socratic depth, 3-tier memory).

**Patterns explicitly not adopted** (sourced from the comparative review — would dilute Vespyr's focus):

| Pattern | Source | Why deferred |
|---|---|---|
| **20+ language-specific reviewer agents** (typescript-reviewer, go-reviewer, …) | ECC | Captured as language subagents of `@developer` / `@code-reviewer` in v2.1, not 20 top-level personas |
| **Multi-locale docs** (12 locales) | ECC | v2.2+; high effort, low value at current scale |
| **WDS-style persona handoff** for multi-session projects | BMAD | v3.0; rare use case |
| **Module marketplace** (`vespyr-module-*` npm packages) | BMAD | v3.0; `install-modules.json` ships in v2.1 but multi-tenant packages are v3.0 |
| **Vector DB / HNSW embeddings** | Ruflo | Out of scope; Vespyr is file-based, `memory_filter.js` keyword scoring is the right primitive |
| **Federation / multi-node trust** (mTLS + ed25519) | Ruflo | Out of scope; single-machine only |
| **AIDefence 3-gate PII pipeline** | Ruflo | Out of scope; Vespyr is a dev framework, not a production PII handler |
| **WASM neural runtime** (SONA, EWC++, LoRA) | Ruflo | Out of scope; no model fine-tuning in Vespyr |
| **Plugin marketplace (30+ plugins)** | Ruflo | Out of scope; v3.0 |
| **`<workflow>` XML pseudo-DSL** | BMAD | Plain Markdown is just as expressive for short step files |
| **3-file TOML with 4-layer merge** | BMAD | Overkill; v2.0's 2-file split is enough |

**Principle:** adopt the *idea*, not the *inventory*. We do not want Vespyr to look like BMAD v6.8 with different file names.

---

## Version history

| Version | Status | What shipped |
|---|---|---|
| v2.2 | 📋 Planned | Deeper Bench T2 + T3 (+7 personas, +4 skills) |
| v2.1 | 📋 Planned | Phases 2 + 3 + 4 of master plan (hooks, MCP, self-learning, witness, graph, telemetry, modularity) + Deeper Bench T1 (+14 personas, +13 skills, +3 squads) |
| **v2.0** | 🚧 **Active** | **Phases 0 + 1 of master plan — frontmatter v2, identity/customization, 5 long skills as folder + step files, spec-kernel PRD, sprint-status.yaml, false-positive guard, Ivy `design.md` + dynamic HTML, ASCII CLI dashboards. 9 DoD criteria. 21 personas, 23 skills, 7 squads (counts unchanged from v1.7.x).** |
| v1.7.x | ✅ Stable | `npx create-vespyr` installer, 8 active + 37 future harness dotfolders |
| v1.6.x | ✅ Shipped | (per CHANGELOG; mid-cycle improvements) |
| v1.5.x | ✅ Shipped | (per CHANGELOG; mid-cycle improvements) |
| v1.4 | ✅ Shipped | (per CHANGELOG; mid-cycle improvements) |
| v1.3 | ✅ Shipped | (per CHANGELOG; mid-cycle improvements) |
| v1.2 | ✅ Shipped | (per CHANGELOG; mid-cycle improvements) |
| v1.1 | ✅ Shipped | Squad-based team presets, active phase skipping, CLI and project-context integration |
| v1.0 | ✅ Shipped | 21 agents, opencode native, delegation pattern, shared memory, game mode, humanizer skill |

---

## How to influence the roadmap

Open an issue on [GitHub Issues](https://github.com/lalulali/vespyr/issues) with the label `roadmap`. Describe the problem you're trying to solve, not the solution — that helps prioritize correctly.

Items with the most real-world problem evidence move up. Items that are technically interesting but solve hypothetical problems stay in the backlog. The T1 persona gating (Gate A: 3+ community requests; Gate B: ≥ 200-line charter) applies to *new* personas — the same evidence rule that moves backlog items up also gates Deeper Bench additions.
