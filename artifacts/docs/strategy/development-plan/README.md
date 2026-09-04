# Vespyr Development Plan

> **Status:** v2.0 — Phase 1 in progress. Executed: 02a–02j (02i re-certified 2026-08-26). 02k (round-table skill) WIP. 02o (parallel-session safety) executing 2026-08-28. Pending: 02l, then 02n record-integrity reconciliation (closure stamps deferred). **Resequenced 2026-08-28:** 02o before 02l (owner ruling); series renumbered same day — intent-routing 02k→02m, record-integrity 02m→02n, round-table skill inserted as 02k.
> **Maintainer:** Chris (solo, AI-assisted)
> **Created:** 2026-07-02 — consolidates and corrects the original strategy folder (7,330 lines → this folder)

---

## Plan Registry (allocation record — 02o.5)

Every `NN[X]-*.md` file in this directory MUST have a row here; numbers are claimed by committing the file first. `node .agents/scripts/check_plan_reservation.js` enforces this.

| File | Title | Status (2026-08-28) |
|---|---|---|
| `01-phase-0-foundation.md` | Phase 0 foundation | Shipped (v1.7) |
| `01a-phase-0-framework-analysis.md` | Framework analysis | Shipped |
| `01b-phase-0-risk-register.md` | Risk register | Live |
| `02-phase-1-skills.md` | Phase 1 skills (parent) | In progress |
| `02a-phase-1-step-tracker.md` | Step tracker | Audit pending (02n) |
| `02b-phase-1-agent-memory-fix.md` | Agent memory fix | Audit pending (02n) |
| `02c-phase-1-teaching-partner.md` | Teaching partner | Audit pending (02n) |
| `02d-phase-1-ai-ready-team.md` | AI-ready team | Executed (verified 2026-08-08) |
| `02e-phase-1-agentskills-standardization.md` | Skills standardization | Executed |
| `02f-phase-1-security-and-integrity-architecture.md` | Security & integrity | Executed |
| `02g-phase-1-harness-honesty.md` | Harness honesty | Executed (record corrected forward; 02n owns §7.3) |
| `02h-phase-1-graph-shutup-and-cli.md` | Graph/shut-up/CLI | Executed 2026-08-25 |
| `02i-phase-1-memory-consolidation.md` | Memory consolidation | Executed + re-certified 2026-08-26 |
| `02j-phase-1-evals-and-agnostic-harness.md` | Evals & harness | Executed (fixture-tier caveat, 02m record) |
| `02k-phase-1-round-table-skill.md` | Round-table skill | WIP (concurrent session) |
| `02l-phase-1-observability-biomarkers-and-small-model-harness.md` | Observability & biomarkers | Not started (after 02o, owner ruling) |
| `02m-phase-1-intent-routing-and-anti-premature-execution.md` | Intent routing | Implemented + evidence-stamped (was 02k; re-homed) |
| `02n-phase-1-record-integrity-recovery.md` | Record integrity recovery | Pending (last; formerly 02m) |
| `02o-phase-1-parallel-session-safety.md` | Parallel session safety | Executed 2026-08-28 (incl. 02o.7–9 worktree automation) |
| `03-phase-2-enablement.md` | Phase 2 enablement | Planned (v2.1) |
| `03a-phase-2-external-skills-research-and-ingestion.md` | External skills research & ingestion | Planned |
| `03b-phase-2-mcp-integration-plan.md` | MCP integration | Planned |
| `03c-phase-2-multi-agent-orchestration.md` | Multi-agent orchestration | Planned |
| `03d-phase-2-harness-integration.md` | Harness integration | Planned |
| `03e-phase-2-implementation-specs.md` | Implementation specs | Planned |
| `03f-phase-2-token-effective-mode.md` | Token-effective mode | Planned |
| `03g-phase-2-mcp-implementation.md` | MCP implementation | Planned |
| `03h-phase-2-self-learning-architecture.md` | Self-learning | Planned |
| `03i-phase-2-release-signing.md` | Release signing | Planned |
| `04-phase-3-observability.md` | Phase 3 observability | Planned (v2.2) |
| `04a-phase-3-observability-engine.md` | Observability engine | Planned |
| `04b-phase-3-observability-ui-miniapp.md` | Observability UI | Planned |
| `05-phase-4-modularity.md` | Phase 4 modularity | Planned |
| `06-phase-5-deeper-bench.md` | Phase 5 deeper bench | Planned |
| `07-phase-6-loop-engineering.md` | Phase 6 loop engineering | Planned |
| `08-cross-cutting-utter-satisfaction-dna.md` | Utter-satisfaction DNA | Cross-cutting |
| `09-phase-7-pkm-knowledge-engine.md` | PKM knowledge engine | Planned (Phase 7) |

---

## What this folder replaces

This folder supersedes the following files in `strategy/`:

| Original file | Status | What happened to its content |
|---|---|---|
| `0. vespyr-master-roadmap.md` (546 lines) | Superseded | Consolidated into this README + phase files |
| `1. framework_comparison_*.md` (412 lines) | Condensed | → `01a-phase-0-framework-analysis.md` |
| `2. vespyr_evolution_plan.md` (2,375 lines) | Superseded | Code specs → `03e-phase-2-implementation-specs.md`; micro-tasks merged into phase files |
| `3. adoption-plan-*.md` (687 lines) | Superseded | Adoption matrix → this README §3; details merged into phase files |
| `4. persona-skill-enrichment-plan.md` (1,190 lines) | Condensed | → `06-phase-5-deeper-bench.md` |
| `ROADMAP.md` (442 lines) | Keep as public-facing | This README is the internal source; ROADMAP.md is the public mirror |
| `development/` (1,678 lines) | Superseded | Corrected and merged into `01-06` phase files |

**Original total: 8,318 lines across 15 files (strategy + harness plans). This folder: ~5,500 lines across 12 files.** The reduction comes from de-duplication (themes were defined 4x, DoD 3x, risks 4x, adoption matrix 2x). The enrichment comes from adding full implementation context (proposed content, templates, persona charters, JS code, tool mappings) to every phase file so an AI developer has everything needed to build.

---

## 1. Release Structure

Three releases. Each is independently shippable. If a release slips, the previous release is valid.

| Release | Scope | Calendar | Themes |
|---|---|---|---|
| **v2.0** | **Phase 1 only** (Phase 0 = v1.7 dev, already shipped) — identity, skill restructure, artifact rigor, worktree tooling, security-and-integrity (02f) | In progress | T1, T2, T3, T7, T8 |
| **v2.1** | Phase 2 + 3 + 4 + 6 — hooks, MCP, self-learning, graph, telemetry, modularity, loop engineering | ~6 weeks | T3, T4, T5, T6, T7, T8 |
| **v2.2** | Phase 5 — Deeper Bench (T1 + T2 + T3 personas) | ~6 weeks | T1, T2, T8 |

**v2.0 ships the differentiators.** The original plan buried Vespyr's 3 unique moats (permission-denial I/O split, Socratic depth, 3-tier memory) in a "T7 Backlog" while spending 138h importing BMAD/Ruflo/ECC patterns. This plan promotes T7 to Phase 0. The differentiators ship first, not last. T8, the UTTERLY SATISFIED working culture, is cross-cutting and applies to every release rather than being deferred to a later phase.

---

## 2. The 8 Themes

Every phase file in the plan maps to its primary capability themes. T8 is the
intentional exception: it is a cross-cutting DNA contract applied to every
theme. Themes are capability-shaped, not implementation-shaped.

| # | Theme | One-line statement | Ships in |
|---|---|---|---|
| **T1** | Agent depth | Role-locked personas with structured customization that survives updates | v2.0, v2.2 |
| **T2** | Skill atomicity | A skill is a folder of self-contained step files, not a single Markdown blob | v2.0, v2.2 |
| **T3** | Artifact rigor | Every artifact has a kernel + companions, a status, a hash witness, a traceability graph | v2.0, v2.1 |
| **T4** | Harness contracts | Policy enforced at the harness layer (hooks), primitives exposed via MCP | v2.1 |
| **T5** | Self-improvement | Sessions leave patterns → patterns promote to conventions → conventions promote to instincts → instincts auto-load | v2.1 |
| **T6** | Modularity | Core stays lean. Domain extras ship as installable modules | v2.1 |
| **T7** | Vespyr identity | The 3 differentiators (permission-denial, Socratic depth, 3-tier memory) are explicitly advanced, not just preserved | v2.0 (NEW — promoted from backlog) |
| **T8** | UTTERLY SATISFIED culture | Active agents collaborate through evidence-backed feedback loops and no release ships with unresolved blocking concerns | Every release (cross-cutting) |

**T7 is new.** The original plan had it buried in "Backlog (no timeline)." This plan promotes it to Phase 0 because the differentiators are the moat. Without T7, v2.0 is "BMAD v6.8 with different file names" — the exact failure mode the original plan warned against.

**T8 is permanent.** Unlike a feature theme, the UTTERLY SATISFIED culture is
part of how every theme is developed, reviewed, and shipped. It cannot be
deferred, disabled by a harness, or removed by a module.

---

## 3. Phase Table (Canonical)

| Phase | Release | Themes | What ships | File |
|---|---|---|---|---|
| **0** | v1.7 (shipped) | T1, T3, T7, T8 | Frontmatter v2, IDENTITY block, customization TOML, thin skills ≥80 lines, entry-point consolidation, phase table, glossary, agent contracts, **+ T7: worktree delegation enforcement + tooling (T7.1b), memory auto-loading, Socratic minimum bar, identity docs; + T8: shared satisfaction contract** | `01-phase-0-foundation.md` |
| **1** | v2.0 (in progress) | T1, T2, T3, T8 | 5 long skills → folder + steps (develop, validate-idea, retro, design, launch); tri-modal flows; spec-kernel PRD; sprint-status.yaml; ASCII CLI dashboards; 9 domain experts ≥200 lines; code-reviewer 15-item false-positive guard; Ivy design.md + dynamic HTML; **Teaching Partner: @shifu (Kong Qiu) agent + /teach-me + /craft-lesson skills; T8 handoff states; security & integrity architecture (02f); harness honesty (02g); graph/cli modernization (02h); memory consolidation (02i); agent evals (02j); intent triage & anti-premature execution (02k)** | `02-phase-1-skills.md`, `02a`–`02k` sub-plans |
| **2** | v2.1 | T4, T5, T8 | 13 lifecycle hooks; MCP server (17 first-party tools); **self-learning swarm architecture (03g: 5-stage trajectory distillation, 3-tier progressive cache, 3-signal deduplication, secret scrubbing, zero-loss LSM compaction)**; SHA-256 witness; delegation enforcement; QA as hard gate; **multi-agent orchestration (solo/parallel modes, CLI orchestrator, structured output, T8 runtime validation)** | `03-phase-2-enablement.md`, `03a`–`03g` sub-plans |
| **3** | v2.1 | T3, T4, T8 | Graph auto-build at 5 lifecycle moments; graph query API; telemetry surface; catalog parity test; "See the Unseen" on all 23 agents (v2.0 state); data analyst CLI tools; **satisfaction health telemetry** | `04-phase-3-observability.md` |
| **4** | v2.1 | T6, T8 | install-modules (7 modules); rules/common + per-language; agent-builder/skill-builder/workflow-builder; worked example project; README/AGENTS/QUICK-REFERENCE/CHANGELOG rewrite; **core T8 inheritance and dogfood gate** | `05-phase-4-modularity.md` |
| **5** | v2.2 | T1, T2, T8 | Deeper Bench: T1 (14 net-new personas + 14 skills + 3 squads), T2 (7 personas + 4 skills), T3 (1 persona); **new-surface T8 validation** | `06-phase-5-deeper-bench.md` |
| **6** | v2.1 | T4, T7, T8 | Loop Engineering: `/goal` primitive (run-until-verifiable-condition with separate verifier), automations/heartbeat (scheduled task execution, starts with 1 CI-failure triage), loop state on disk; **satisfaction-aware completion** | `07-phase-6-loop-engineering.md` |
| **7** | v2.3 | T3, T6, T8 | Personal Knowledge Management (PKM) & Knowledge Engine: discovery & exploration tracks for Zettelkasten, PARA, Karpathy LLM-Wiki, and Andy Matuschak Evergreen Notes & Sliding-Pane Navigation | `09-phase-7-pkm-knowledge-engine.md` |

**Total: 3 releases.**

**T8 applies to every phase.** Read [08-cross-cutting-utter-satisfaction-dna.md](08-cross-cutting-utter-satisfaction-dna.md) before implementing any phase, skill, agent, module, harness adapter, MCP tool, or loop. Phase files may add domain-specific checks, but none may weaken the T8 contract.

---

## 4. Definition of Done (Canonical — 25 Criteria)

This is the single DoD list.

### v2.0 DoD (criteria 1-8)

1. All agent files (23 at v2.0 shipped) have v2 frontmatter (`name`, `icon`, `capabilities`, `default_squad`, `origin`, `channeled_mentor`) + `<!-- IDENTITY: do not edit -->` block. `validate_frontmatter.js` exits 0.
2. The 5 long skills are folder + step files with resume semantics: `develop` (10 steps), `validate-idea` (tri-modal 7+5+5), `retro` (5), `design` (tri-modal 6+4+4), `launch` (5).
3. Spec-kernel is the canonical PRD shape (`templates/prd/SPEC.md` + companions). Old `prd-template.md` removed.
4. `sprint-status.yaml` is the human-readable state of truth. `orchestrator_state.js status`/`next` read from it.
5. `code-reviewer.md` has the 15-item false-positive guard.
6. `@product-designer` (Ivy) generates `design.md` + dynamic HTML. 56KB static template deleted.
7. Orchestrator CLI prints ASCII dashboards by default. Agents enforce pipeline state checks at startup/shutdown.
8. **T7 — Vespyr Identity:** 3 differentiators explicitly advanced — (a) worktree delegation enforcement + tooling (T7.1b, ~160 lines), (b) cross-session memory pattern auto-loading (~80 lines), (c) Socratic universal minimum bar (~40 lines). Identity section added to AGENTS.md + README.
8b. **Citation Protocol (F0.29):** All 17 reasoning agents have `## Citation Protocol` section. `.agents/references/citation-format.md` exists. `validate_frontmatter.js` warns on missing protocol. Step files declare `citations:` in output contract.

### v2.1 DoD (criteria 9-14)

9. 13 lifecycle hooks registered, env-var-disablable, documented.
10. MCP tool surface exposes 17 first-party tools (10 from 03a + 6 from 13 + `vespyr_spawn_agent` from 03b), callable from Claude Code or OpenCode.
11. `orchestrator_state.js next` refuses to advance out of `development` without `qa-signoff.md`.
12. Self-learning works end-to-end (episode → pattern → instinct). `instincts.md` loaded FIRST by `@memory-controller`.
13. Catalog parity test passes (`npm test` includes `test_catalog_parity.js`). All 23 agent files (v2.0 state) have "See the Unseen" directive + response prefixes. `@data-analyst` has `data_analyzer.js` + `dashboard_generator.js`.

### v2.1 DoD — Loop Engineering (criteria 15-17)

15. `vespyr goal "<condition>"` runs iterations, invokes @goal-verifier, stops when the condition passes. @goal-verifier reads only the verification output (not the maker's code) and returns `DONE` or `NOT-DONE`.
16. `automation.js create/list/run/archive` works. The starter automation (CI-failure triage) runs and produces a triage file in `artifacts/output/01-discovery/triage/`.
17. `loop-state.json` persists goal + automation state across sessions. `memory-controller` surfaces paused goals and overdue automations on session start.

### v2.1 DoD — Validation & Onboarding (criteria 18-21)

18. **Dogfood project:** full pipeline exercised end-to-end (`/validate-idea` → `/iterate`) on a real project. Integration bugs filed as GitHub issues. Artifacts published as a second worked example.
19. **Migration path:** `npx vespyr migrate` converts v1.7.x hand-edits into `.agents/custom/*.toml` overrides with backup. Migration report lists every action taken.
20. **Onboarding:** web guide published covering getting started, concepts, tutorials, and reference. `npx vespyr doctor` runs a health check. README has "Last verified" dates per section.
21. **See the Unseen DNA:** all agent files have "See the Unseen" in their IDENTITY block (non-negotiable, not customizable). `validate_frontmatter.js` checks for the section.

### T8 DoD (criteria 22-25; applies across releases)

22. **UTTERLY SATISFIED contract:** `.agents/references/utter-satisfaction.md`, global guardrails, canonical entry points, and all participating persona definitions agree on the state vocabulary and collaboration loop.
23. **Handoff enforcement:** every release-affecting workflow records active-agent satisfaction states, evidence, residual risks, and revalidation triggers; `CHANGES REQUESTED` and `BLOCKED` stop advancement.
24. **Launch enforcement:** `release-readiness.md` and `go-nogo-decision.md` contain the team gate; every active agent is `SATISFIED`, every inactive optional domain has a reason, and no unresolved blocker can ship.
25. **Future-surface inheritance:** builders, modules, harness adapters, MCP tools, Flint/solo modes, automations, and loop primitives preserve T8 and have a failing test for an attempted bypass.

### Release candidates

- **v2.0-rc1:** DoD 1, 2, 8 (frontmatter, skill folders, T7 identity) — minimum structural rigor
- **v2.0-rc2:** + DoD 3, 4, 19 (spec-kernel, sprint-status, migration path) — upgrade-safe
- **v2.0-rc3:** + DoD 5, 6, 7, 8b, 21, 22, 23, 24 (false-positive guard, Ivy, ASCII dashboards, citation protocol, See the Unseen DNA, UTTERLY SATISFIED baseline and release gate) — release-ready

---

## 5. What Was Cut or Deferred (Reprioritization)

The original plan had scope creep and wrong priorities. Here's what changed:

| Item | Original status | New status | Why |
|---|---|---|---|
| **T7 Vespyr Identity** (3 differentiators) | Backlog (no timeline) | **Phase 0** (v2.0) | The moat ships first, not last. Without T7, v2.0 is all imports. |
| **F0.23-F0.28** (critic infrastructure: multi-agent patterns, critic-review skill, 5 rubrics, patterns/critics frontmatter) | Phase 0 (v2.0) | **Deferred to v2.3+** | Speculative engineering. No critic personas exist until v2.2. The infrastructure has no consumers. Violates "Simplicity First." |
| **F1.27-F1.28 / T1.28** (build-wiki & llm-wiki) | Phase 1 / Phase 3 / Phase 5 | **Moved to Phase 7** (v2.3) | Consolidated into dedicated PKM & Knowledge Engine exploration phase (`09-phase-7-pkm-knowledge-engine.md`). |
| **Pre-Phase 0** (Hermes/OpenClaw integration) | v2.0 (6-10h) | **Deferred to v2.3+** | Scope creep for 2 non-top-8 harnesses. Folded into 03c's M1-M4 adapter work. OpenClaw prioritized above Hermes (can enforce permissions); security gate (Hunt.io) must pass first. See `03d-phase-2-harness-integration.md`. |
| **35-harness future table** | ROADMAP.md (35 rows) | **Deleted** | Performative. A solo maintainer cannot port to 35 harnesses. Replaced with: "additional harnesses added as community demand warrants." |
| **Critic consortium** (4 critic personas + consortium pattern + 3 loading modes + discriminated loading) | v2.1 (Phase 5 T1) | **Deferred to v2.3+** | 600 lines of spec for 4 personas with no consumers. Ship 1 critic + the skill first; add the other 3 if the first one gets used. |
| **Hermes integration** (623-line plan) | Pre-Phase 0 (v2.0) | **v2.3+, degraded mode** | Hermes cannot enforce permission-denial (Vespyr's #1 moat) or route I/O to cheap models. Degraded experience. See `03d-phase-2-harness-integration.md`. |
| **OpenClaw integration** (365-line plan) | Pre-Phase 0 (v2.0) | **v2.3+, prioritized above Hermes** | OpenClaw CAN enforce permissions via sandbox. Better fit. Security review required first (unconditional `VESPYR_OPENCLAW=off` default). See `03d-phase-2-harness-integration.md`. |

---

## 6. Adoption Matrix (Source → Vespyr)

Principle: **adopt the idea, not the inventory.** We do not want Vespyr to look like BMAD v6.8 with different file names.

| Source pattern | Adopted in | Phase | Notes |
|---|---|---|---|
| BMAD — step-file / micro-file architecture | T2 | 1 | Folder + `steps/`, plain Markdown (no XML DSL) |
| BMAD — tri-modal workflows (create/edit/validate) | T2 | 1 | `steps-c/`, `steps-e/`, `steps-v/` |
| BMAD — CSV technique libraries | T2 | 1 | Extend `elicitation/methods.csv`, add 2 new CSVs |
| BMAD — 5-field spec kernel | T3 | 1 | 2-file split (kernel + companions) |
| BMAD — 2-file customization TOML | T1 | 0 | Simplified from BMAD's 3-file/4-layer |
| BMAD — hardcoded identity + customizable behavior | T1 | 0 | `<!-- IDENTITY: do not edit -->` block |
| BMAD — icon-prefixed persona | T1 | 0 | First line of every response |
| BMAD — frontmatter schema | T1 | 0 | `name`, `icon`, `capabilities`, `default_squad`, `origin` |
| BMAD — channeled mentor | T1 | 0 | 1-5 references per agent (prefer 2) |
| BMAD — sprint-status.yaml | T3 | 1 | Layered on pipeline-state.json |
| BMAD — glossary + agent-contracts | T1, T3 | 0 | One definition per term, owns/doesn't-own table |
| Ruflo — lifecycle hooks | T4 | 2 | 13 hooks with stable IDs + env-var disable |
| Ruflo — MCP tool surface | T4 | 2 | 17 first-party tools wrapping existing scripts + new capability tools |
| Ruflo — witness/verification | T3 | 2 | SHA-256 (no Ed25519 — overkill for local-first) |
| Ruflo — self-learning / instincts | T5 | 2 | 3-tier episode → pattern → instinct |
| Ruflo — delegation enforcement | T1 | 2 | `delegation-policy.md` + `[DIRECT-IO-JUSTIFIED]` + audit |
| Ruflo — telemetry surface | T3 | 3 | LLM-consumable digests |
| Ruflo — QA as hard gate | T1 | 2 | `qa-signoff.md` blocks phase advance |
| ECC — code-reviewer false-positive guard | T1 | 1 | 15-item skip-list |
| ECC — language-specific rules | T6 | 4 | `rules/common/` + `rules/<lang>/` |
| ECC — env-var hook profile | T4 | 2 | `VESPYR_HOOK_PROFILE=minimal\|standard\|strict` |
| ECC — install profiles | T6 | 4 | `install-modules.json` |
| ECC — example project | T6 | 4 | CLI todo list, all 10 phase folders |

### Patterns explicitly NOT adopted

| Pattern | Source | Why not |
|---|---|---|
| Vector DB / HNSW / embeddings | Ruflo | Vespyr is file-based. `memory_filter.js` keyword scoring is the right primitive. |
| Plugin marketplace (30+ plugins) | Ruflo | v3.0 backlog. |
| Federation / multi-node trust | Ruflo | Single-repo, single-machine. |
| WASM neural runtime | Ruflo | No model fine-tuning in Vespyr. |
| 10+ harness dotfolder mirrors | BMAD | We use symlinks + thin shims. |
| `<workflow>` XML pseudo-DSL | BMAD | Plain Markdown is just as expressive for short step files. |
| 3-file TOML with 4-layer merge | BMAD | 2-file is enough. |
| WDS persona handoff | BMAD | Round-table skill already does multi-agent spawning. |
| AIDefence 3-gate PII pipeline | Ruflo | Dev framework, not a production PII handler. |
| 12-locale README translations | ECC | High effort, low value. Backlog for v3.0+. |
| 20+ language-specific reviewer agents | ECC | Captured as language subagents of `@developer`/`@code-reviewer`, not 20 top-level personas. |

---

## 7. Persona & Skill Counts (Canonical)

The original docs had 5 different counts for T1 personas (14, 18, 18, 19, 25). This is the canonical count, as reconciled in the 2026-08-08 round-table review (see `06-phase-5-deeper-bench.md` §Canonical counts and `04-phase-3-observability.md` F3.13 — counts are DERIVED FROM DISK, never hardcoded).

### Current (v2.0 shipped, on disk)

| Entity | Count |
|---|---|
| Agent files | 23 (19 reasoning + 4 I/O) — incl. @shifu, @ml-ai-engineer, @ml-ai-ops |
| Skills | 43 |
| Squads | 7 |
| Internal agents (v2.1+: @goal-verifier, flint.md — `origin: internal`, validated but excluded from persona counts) | +2 files |

### After v2.2 (full Deeper Bench — ALL tiers ship in v2.2)

| Tier | New personas | New skills | New squads | Ships in |
|---|---|---|---|---|
| T1 | 14 net-new (+2 promoted in v2.0) | 14 (llm-wiki moved to Phase 7 PKM) | 3 (growth, data-platform, migration) | v2.2 |
| T2 | 7 | 4 | 0 | v2.2 |
| T3 | 1 | 0 | 0 | v2.2 |
| **Total new** | **22** | **19** | **3** | |
| **Grand total** | **45 personas / 62 skills / 10 squads** | | | |

### Deferred to v2.3+ (critic consortium)

| Item | Count | Why deferred |
|---|---|---|
| Critic personas (@research-critic, @code-critic, @ux-critic, @doc-critic) | 4 | Depends on critic infrastructure (F0.23-F0.28) which is deferred. Ship 1 critic first; add others if used. |
| /critic-review skill | 1 | Same. |
| Multi-agent patterns reference | 1 | Same. |
| Domain rubrics (research, user-research, ux, code, docs) | 5 | Same. |
| OpenClaw / Hermes adapters (from `03d-phase-2-harness-integration.md`) | 2 | Folded into 03c M1-M4 adapter work; OpenClaw security gate (Hunt.io) must pass first. |

### T1 personas (14 net-new; T1.10/T1.10b promoted to v2.0) — ship in v2.2

brainstormer, innovation-strategist, problem-solver, storyteller, presentation-master, growth-marketer, seo-specialist, database-engineer, api-designer, accessibility-architect, migration-engineer, customer-success, support-engineer, artifact-judge

### T1 skills (15) — ship in v2.2

brainstorming, pr-faq, epics-and-stories, market-research, storytelling, presentation, design-thinking, accessibility-audit, cost-analysis, api-design, database-migration, migrate-stack, correct-course, grade-artifact

### T2 personas (7) — ship in v2.2

narrative-engineer, game-designer, game-developer, level-designer, brand-voice-curator, content-engineer, finance-analyst

### T2 skills (4) — ship in v2.2

game-design-doc, narrative-design, playtest-plan, domain-research

### T3 personas (1) — ship in v2.2

legal-counsel (read-only, privacy-focused)

### Persona gating (applies to all new personas)

Each new persona must clear **one of two gates** before shipping:
- **Gate A — Demand:** 3+ community requests with named use cases
- **Gate B — Depth:** ≥ 200 lines with persona depth, decision tree, failure modes, escalation patterns, memory write-back contracts

The "1-day ECC repackage" pattern is insufficient. Personas that don't clear either gate move to the backlog.

---

## 8. This Folder's Files

| File | What it contains |
|---|---|
| `README.md` (this file) | Single source of truth: releases, phases, DoD, themes, counts, adoption matrix |
| `01-phase-0-foundation.md` | Phase 0: full templates (phase table, glossary, agent contracts, grill-me, IDENTITY block, frontmatter v2) + T7 identity work |
| `01a-phase-0-framework-analysis.md` | Condensed 4-framework comparison (insights only) |
| `01b-phase-0-risk-register.md` | Consolidated risk register (62 risks, single source) |
| `02-phase-1-skills.md` | Phase 1: full templates (spec-kernel, spec-law, sprint-status.yaml, Ivy rubric, 15-item false-positive guard, step-file architecture) |
| `02a-phase-1-step-tracker.md` | Step Tracker — debug-mode step enforcement audit breadcrumbs |
| `02b-phase-1-agent-memory-fix.md` | Memory prefetch, tiering, and agent-level context optimization |
| `02c-phase-1-teaching-partner.md` | Teaching Partner: @shifu (Kong Qiu) persona + /teach-me and /craft-lesson workflows |
| `02d-phase-1-ai-ready-team.md` | AI-Ready Team: 9 domain expert personas + tooling depth |
| `02e-phase-1-agentskills-standardization.md` | Skill frontmatter and metadata standardization (agentskills.io spec) |
| `02f-phase-1-security-and-integrity-architecture.md` | Security & Integrity Architecture: supply-chain integrity, trust boundaries (T0–T3), prompt injection defense, audit-spec, and security scanner |
| `02g-phase-1-harness-honesty.md` | Harness Honesty: capability-based delegation phrasing and No-Subagent Fallback |
| `02h-phase-1-graph-shutup-and-cli.md` | Structural graph cleanup, `/shut-up` concise mode, and CLI update safety |
| `02i-phase-1-memory-consolidation.md` | Memory persistence consolidation, machine-fenced state blocks, and token bounding |
| `02j-phase-1-evals-and-agnostic-harness.md` | Agent evals Horizon 1: dogfooding test matrix, deterministic gates, and G-Eval benchmarks |
| `03a-phase-2-external-skills-research-and-ingestion.md` | External Skills Research & Ingestion: automated discovery, consulting/agency practice skills, pre-install safety gate |
| `03b-phase-2-mcp-integration-plan.md` | MCP Integration: first-party + 3rd-party MCP servers, 17 tools |
| `03c-phase-2-multi-agent-orchestration.md` | Multi-Agent Orchestration: solo/parallel mode, CLI orchestrator, structured output |
| `03d-phase-2-harness-integration.md` | Harness integration: Hermes, OpenClaw, and cross-harness adapters |
| `03e-phase-2-implementation-specs.md` | Full JS code specifications for Phase 2 scripts and test suites |
| `03f-phase-2-token-effective-mode.md` | Quick Mode — token-effective discussion mode |
| `03g-phase-2-mcp-implementation.md` | Model Context Protocol (MCP) implementation specs and tool wiring |
| `03h-phase-2-self-learning-architecture.md` | Self-learning architecture and instinct tracking |
| `03i-phase-2-release-signing.md` | Release signing and artifact provenance |
| `04-phase-3-observability.md` | Phase 3: graph query contracts per agent, See the Unseen directives, telemetry protocol |
| `05-phase-4-modularity.md` | Phase 4: install-modules, rules/ directory structure, builder flows |
| `06-phase-5-deeper-bench.md` | Phase 5: Deep bench persona charters and skill catalog expansions |
| `07-phase-6-loop-engineering.md` | Loop Engineering: `/goal` primitive + automations + loop state |
| `08-cross-cutting-utter-satisfaction-dna.md` | Cross-cutting culture contract, state model, collaboration loop, runtime enforcement |
| `09-phase-7-pkm-knowledge-engine.md` | Personal Knowledge Management (PKM) & Knowledge Engine |

---

## 9. How to Use This Folder

1. **Read the DNA contract.** Open `08-cross-cutting-utter-satisfaction-dna.md` first. It applies to every future change.
2. **Pick a phase.** Open the matching `01-phase-0-foundation.md` … `06-phase-5-deeper-bench.md`.
3. **Read the "Source mapping" table.** Each micro-task cites the original F-number and source.
4. **Work in order.** Phases are linearly dependent (0 → 1 → 2 → 3 → 4 → 5). Within a phase, F-items can be parallelized unless noted.
5. **Tick the checkbox.** Each micro-task ends with `- [ ]`. The "Done when" block at the end of each phase is the gate to the next.
6. **If a phase slips**, ship the previous phase's release as a valid intermediate. Phases 0, 1, 2 are independently shippable, but each still requires the T8 gate.
7. **For implementation code**, see `03e-phase-2-implementation-specs.md` — it has the full JS specs for every new script.
8. **For harness work**, see `03d-phase-2-harness-integration.md` — it has the honest assessments for Hermes and OpenClaw.

---

## 10. Decision Authority

When a phase is mid-execution and a new constraint emerges (e.g., a phase overruns by 1 week), **Chris has sole decision authority**. The default: **defer to the next release, do not slip the current release date**. The phased rc cutoffs make this easier — anything that doesn't hit the current rc is the next release's work, by definition.

---

## 11. Version History

| Version | Status | What shipped |
|---|---|---|
| v2.2 | Planned | Deeper Bench — ALL tiers (T1+T2+T3: +22 personas, +19 skills, +3 squads) |
| v2.1 | Planned | Phases 2+3+4+6 (13 hooks, MCP 17 tools, self-learning, witness, graph, telemetry, modularity, loop engineering, T8 runtime gate) — infrastructure only; no Deeper Bench T1 |
| **v2.0** | **Phase 1 — in progress** | Phases: identity, skill restructure, artifact rigor (02a-02e done; 02f security-and-integrity pending) — 8 DoD criteria |
| v1.7.x | Stable | `npx create-vespyr` installer, 8 active harnesses |
| v1.1-v1.6 | Shipped | Per CHANGELOG |
| v1.0 | Shipped | 21 agents, opencode native, delegation pattern, shared memory, game mode, humanizer |

---

## 12. Community Feedback & Persona Gating

**Channel:** All feature requests, persona requests, and bug reports go through [GitHub Issues](https://github.com/lalulali/vespyr/issues).

**Persona gating feedback loop:**

- Gate A (demand) requires 3+ community requests with named use cases — tracked via the `persona-request` label on GitHub Issues
- Before shipping any new persona, the maintainer checks the issue tracker for matching requests
- If a persona has < 3 requests, it must clear Gate B (depth) or defer to backlog
- Quarterly review: triage open `persona-request` issues, consolidate duplicates, update the canonical persona list

**Feature requests:**

- Use the `feature-request` label
- Each request must include: what problem it solves, which agent/skill it touches, and a concrete use case
- Requests that map to an existing theme (T1-T8) get prioritized; requests outside all themes go to v3.0 backlog

**Bug reports:**

- Use the `bug` label
- Include: harness name + version, Vespyr version, reproduction steps, expected vs actual behavior

---

## 13. Session-Start Latency Budget

**Problem:** Multiple phases add session-start hooks: memory pre-fetch (Phase 0), instinct loading (Phase 2), graph freshness check (Phase 3), telemetry snapshot (Phase 3), loop state loading (Phase 6). Each is individually fast (<500ms), but stacked together, session start could take 5-10 seconds. There's no total latency budget or ordering spec.

**Target:** A defined ordering and total budget for session-start operations:

| Order | Operation | Phase | Budget | Source |
|---|---|---|---|---|
| 1 | Load `instincts.md` | 2 | < 50ms | `memory_filter.js` |
| 2 | Load `project-context.md` + `active-decisions.md` | 0 | < 100ms | `memory_filter.js` |
| 3 | Pattern pre-fetch (current agent + phase) | 0 | < 100ms | `memory_filter.js --prefetch-patterns` |
| 4 | Graph freshness check | 3 | < 500ms | `auto_graph.js check` |
| 5 | Telemetry snapshot (last 7 days) | 3 | < 200ms | `telemetry_surface.js session` |
| 6 | Loop state check (paused goals, overdue automations) | 6 | < 50ms | `loop-state.json` read |
| **Total** | | | **< 1000ms** | |

**Rules:**

- Total session-start overhead must not exceed 1 second
- Operations 4-6 are non-blocking: if they exceed their budget, they're skipped with a `[SKIPPED: timeout]` marker
- Graph rebuild (if `[STALE]`) runs in the background, not at session start — it's triggered by the first agent that needs the graph
- The latency budget is tested in CI: `npm test` includes a `test_session_latency.js` that measures the full session-start sequence

---

## 14. UTTERLY SATISFIED DNA

T8 is the behavioral DNA of Vespyr. It is not a team slogan or a post-launch
review ritual. It is the contract that connects Vespyr's role depth, artifact
rigor, orchestration, observability, modularity, harness adapters, and loops.

The detailed implementation contract lives in
[08-cross-cutting-utter-satisfaction-dna.md](08-cross-cutting-utter-satisfaction-dna.md). The short rule is:

> Work until every active, relevant agent is satisfied with evidence. Resolve
> or escalate every blocking concern. Do not ship until the team gate is GO.

Future work must update the DNA plan when it introduces a new agent, skill,
phase, module, harness, MCP tool, automation, or release path. A feature that
cannot preserve T8 is not ready for inclusion in the roadmap.
