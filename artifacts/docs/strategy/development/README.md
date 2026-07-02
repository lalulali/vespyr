# Vespyr v2.0+ — Development Phases (Micro View)

> **Status:** Working view. Breaks the canonical v2.0 plan (`0. vespyr-master-roadmap.md`) into per-phase micro-tasks so the maintainer can focus on one phase at a time without re-reading the 535-line master doc.
> **Authoritative plan:** `0. vespyr-master-roadmap.md` is the source of truth. The 5 phase files here mirror its F-numbering. If they conflict, **master wins**; file an issue.
> **Audience:** Christian, sole maintainer. Each phase is independently shippable.

## Release structure (as of this update)

The v2.0 plan is split across two releases to right-size the surface for a solo maintainer:

- **v2.0** = pre-Phase 0 (Hermes & OpenClaw integration plan) + master plan **Phases 0 + 1** (foundation + skill restructure + artifact rigor). The structural rigor that protects Vespyr's differentiators.
- **v2.1** = master plan **Phases 2 + 3 + 4** (enablement + observability + modularity) + **Deeper Bench T1** (14 personas + 13 skills + 3 squads).
- **v2.2** = **Deeper Bench T2 + T3** (7 personas + 4 skills).

## Folder structure

```
strategy/development/
├── README.md                   ← this file (overview, alignment, sequencing)
├── 0a-hermes-openclaw.md       ← Pre-Phase 0: Hermes & OpenClaw integration plan (~6-10h)  [v2.0]
├── 0-foundation.md             ← Phase 0: contracts that everything else builds on (Week 1, ~18h)  [v2.0]
├── 1-skill-restructure.md      ← Phase 1: skills → folder + step files; artifacts → kernel + companions (Weeks 2–3, ~54h)  [v2.0]
├── 2-enablement.md             ← Phase 2: hooks, MCP, self-learning, witness, delegation, QA gate (Week 4, ~22h)  [v2.1]
├── 3-quality-observability.md  ← Phase 3: graph auto-build, query API, telemetry, catalog parity (Weeks 5–6, ~22h)  [v2.1]
├── 4-modularity.md             ← Phase 4: install-modules, rules/, builders, example project (Weeks 7–8, ~22h)  [v2.1]
└── 5-deeper-bench.md           ← Deeper Bench: T1 (14 personas + 13 skills, ~6 weeks) [v2.1]; T2 (6 personas + 4 skills, ~3 weeks) + T3 (1 persona, ~1 week) [v2.2]
```

## How to use this folder

1. **Pick a phase.** Open the matching `0-foundation.md` … `4-modularity.md`.
2. **Read the source column.** Each micro-task cites the master F-number and the source file/section that has the detailed code.
3. **Work in order.** The phases are linearly dependent (Phase 0 → 1 → 2 → 3 → 4). Within a phase, F-items can be parallelized unless noted.
4. **Tick the checkbox.** Each micro-task ends with `- [ ]`. Tick as you complete. The "Done when" block at the end of each phase is the gate to the next.
5. **If a phase slips** (see master roadmap Risk #14), ship the previous phase's release as v2.x intermediate. Phases 0, 1, 2 are independently shippable.

## Source alignment

This folder is a *view*, not a *plan*. Every micro-task traces back to one of three sources:

| Source | Role | Files in this folder that pull from it |
|---|---|---|
| `0. vespyr-master-roadmap.md` | The plan (sequencing, themes, DoD, risks) | All 5 phase files |
| `2. vespyr_evolution_plan.md` | The "how" (file-level code specs for tactical fixes) | `0-foundation.md`, `1-skill-restructure.md`, `2-enablement.md`, `3-quality-observability.md` |
| `3. adoption-plan-agents-and-skills.md` | The "what to adopt" (cross-framework patterns) | `0-foundation.md`, `1-skill-restructure.md`, `2-enablement.md`, `4-modularity.md` |
| `4. persona-skill-enrichment-plan.md` | The "deeper bench" (post-v2.0 enrichment) | `5-deeper-bench.md` only |

## Sequencing at a glance

```
v2.0 (pre-Phase 0 + Phases 0 + 1)
                            78-82h,  Weeks 1–4   T1, T2, T3
  ↓ Hermes/OpenClaw plan, then structural rigor
v2.0 SHIP
  ↓
v2.1 (Phases 2 + 3 + 4 + Deeper Bench T1)
                            126h, Weeks 5–12+  T3, T4, T5, T6
  ↓ hooks, MCP, self-learning, graph, telemetry, modularity
  ↓ +14 T1 personas, +13 T1 skills, +3 squads
v2.1 SHIP
  ↓
v2.2 (Deeper Bench T2 + T3)
                            ~24h, post-v2.1
  ↓ +7 personas (T2+T3), +4 skills (T2)
v2.2 SHIP
```

## Total effort budget

| Release | Hours | Status |
|---|---|---|
| v2.0 (pre-Phase 0 + Phases 0 + 1) | ~78-82h / 5-6 weeks | not started |
| v2.1 (Phases 2 + 3 + 4 + T1) | ~126h / 8-9 weeks | not started |
| v2.2 (T2 + T3) | ~24h / 2 weeks | not started |
| **Total** | **~228-232h / 15-17 weeks** | |

Per-phase breakdown (unchanged from master plan, just re-labeled):

| Phase | Hours | Ships in |
|---|---|---|
| pre-Phase 0 (Hermes/OpenClaw plan) | 6-10h | v2.0 |
| 0 | 18h | v2.0 |
| 1 | 54h | v2.0 |
| 2 | 22h | v2.1 |
| 3 | 22h | v2.1 |
| 4 | 22h | v2.1 |
| 5 (Deeper Bench T1) | ~60h | v2.1 |
| 5 (Deeper Bench T2+T3) | ~24h | v2.2 |

## Theme coverage

The 6 themes from master roadmap (T1–T6) are spread across phases. A theme may have work in multiple phases:

| Theme | Phase 0 (v2.0) | Phase 1 (v2.0) | Phase 2 (v2.1) | Phase 3 (v2.1) | Phase 4 (v2.1) | Phase 5 T1 (v2.1) | Phase 5 T2+T3 (v2.2) |
|---|---|---|---|---|---|---|---|
| T1 — Agent depth | ★★★ | ★ | ★ | ★ | ★★ | ★★★ | ★★ |
| T2 — Skill atomicity | – | ★★★ | – | – | – | ★★★ | ★★ |
| T3 — Artifact rigor | ★ | ★★ | – | ★★ | – | – | – |
| T4 — Harness contracts | – | – | ★★★ | ★ | – | – | – |
| T5 — Self-improvement | – | – | ★★★ | – | – | – | – |
| T6 — Modularity | – | – | – | – | ★★★ | ★ | – |

★★★ = primary work this phase; ★★ = secondary; ★ = light touch.

## Risks (carried from master, summarized)

1. **Phase 1 — Step-file split loses content.** Mitigation: run a content-audit script before the split.
2. **Phase 1 — Tri-modal mode detection misfires.** Mitigation: the first read of the SKILL.md is a literal mode selector.
3. **Phase 2 — Hooks break in different harnesses.** Mitigation: per-harness adapter in `bin/install.js`.
4. **Phase 2 — Self-learning promotes false patterns.** Mitigation: 3+ occurrences, 2+ agents, 7+ day span, all required; human-in-the-loop.
5. **Phase 3 — Graph auto-build adds latency.** Mitigation: `auto_graph.js check` is mtime-only, < 500ms.
6. **Phase 4 — Module split breaks existing installs.** Mitigation: `install-modules` is opt-in; default matches current behavior.

See master roadmap Part 5 for the full 14-row risk register.

## Definition of Done (rolled up from master Part 6)

The v2.0 release ships when **all 16 criteria** are met. The phase-level "Done when" blocks roll up to these:

1. All 21 agents have v2 frontmatter → Phase 0
2. The 5 skills are folder + step files → Phase 1
3. Resume semantics work → Phase 1
4. Spec-kernel is the canonical PRD shape → Phase 1
5. 10 lifecycle hooks are registered → Phase 2
6. MCP tool surface exposes 10 tools → Phase 2
7. `sprint-status.yaml` is the human-readable state → Phase 1
8. QA is a hard gate → Phase 2
9. Self-learning works end-to-end → Phase 2
10. Graph is auto-built at 5 lifecycle moments → Phase 3
11. Catalog parity test passes → Phase 3
12. `npx vespyr init --example` works → Phase 4
13. `@product-designer` (Ivy) generates `design.md` visual spec companion and dynamic HTML presentation on the fly (deleting the 56KB static template) adaptively based on Rigid vs. Creative style combinations → Phase 1
14. `orchestrator_state.js status` and `next` commands print human-readable ASCII dashboards by default when run in terminal, and agents enforce pipeline state checks at startup and shutdown → Phase 1
15. All 21 agents are upgraded with "See the Unseen" directive and response prefixes → Phase 3
16. `@data-analyst` has access to data_analyzer.js and dashboard_generator.js CLI tools → Phase 3

If only #1, #2, #3, #4, #7, #13, #14 pass, you can ship a **v2.0-rc1** (skills + agents only).
If #1–#7 pass, you can ship a **v2.0-rc2** (plus hooks, MCP, self-learning).
If #1–#11, #15, #16 pass, you can ship a **v2.0-rc3** (full release minus example).
When all 16 pass, ship **v2.0**.
