# Vespyr v2.0 — Development Phases (Micro View)

> **Status:** Working view. Breaks the canonical v2.0 plan (`0. vespyr-master-roadmap.md`) into per-phase micro-tasks so the maintainer can focus on one phase at a time without re-reading the 535-line master doc.
> **Authoritative plan:** `0. vespyr-master-roadmap.md` is the source of truth. The 5 phase files here mirror its F-numbering. If they conflict, **master wins**; file an issue.
> **Audience:** Christian, sole maintainer. Each phase is independently shippable.

## Folder structure

```
strategy/development/
├── README.md                 ← this file (overview, alignment, sequencing)
├── 0-foundation.md           ← Phase 0: contracts that everything else builds on (Week 1, ~18h)
├── 1-skill-restructure.md    ← Phase 1: skills → folder + step files; artifacts → kernel + companions (Weeks 2–3, ~54h)
├── 2-enablement.md           ← Phase 2: hooks, MCP, self-learning, witness, delegation, QA gate (Week 4, ~22h)
├── 3-quality-observability.md ← Phase 3: graph auto-build, query API, telemetry, catalog parity (Weeks 5–6, ~22h)
├── 4-modularity.md           ← Phase 4: install-modules, rules/, builders, example project (Weeks 7–8, ~22h)
└── 5-deeper-bench.md         ← Post-v2.0 enrichment (T1–T3 from file 4: 18 personas + 16 skills) — NOT in master F-numbering yet
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
Phase 0 (Foundation)        18h,  Week 1      T1, T3
  ↓ contracts established
Phase 1 (Skill Restructure) 54h,  Weeks 2–3    T2, T3
  ↓ skills atomic, artifacts rigorous
Phase 2 (Enablement)        22h,  Week 4      T4, T5
  ↓ hooks, MCP, self-learning, witness live
Phase 3 (Quality+Obs)       22h,  Weeks 5–6   T3, T4
  ↓ graph queryable, telemetry surfaced
Phase 4 (Modularity)        22h,  Weeks 7–8   T6
  ↓ selective install, builders, example
v2.0 SHIP
  ↓
Phase 5 (Deeper Bench)     ~60h,  post-v2.0   persona + skill enrichment
  ↓ 18 personas, 16 skills, 3 new squads (growth, data-platform, migration)
v2.1 (or v3.0) SHIP
```

## Total effort budget

| Phase | Hours | Status |
|---|---|---|
| 0 | 18h | not started |
| 1 | 54h | not started |
| 2 | 22h | not started |
| 3 | 22h | not started |
| 4 | 22h | not started |
| 5 (post-v2.0) | ~60h | not started |
| **Total v2.0** | **~138h / 8 weeks** | |
| **Total incl. Phase 5** | **~198h / 12 weeks** | |

## Theme coverage

The 6 themes from master roadmap (T1–T6) are spread across phases. A theme may have work in multiple phases:

| Theme | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---|---|---|---|---|---|---|
| T1 — Agent depth | ★★★ | ★ | ★ | ★ | ★★ | (enrichment) |
| T2 — Skill atomicity | – | ★★★ | – | – | – | ★★★ |
| T3 — Artifact rigor | ★ | ★★ | – | ★★ | – | – |
| T4 — Harness contracts | – | – | ★★★ | ★ | – | – |
| T5 — Self-improvement | – | – | ★★★ | – | – | – |
| T6 — Modularity | – | – | – | – | ★★★ | ★ |

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

The v2.0 release ships when **all 14 criteria** are met. The phase-level "Done when" blocks roll up to these:

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

If only #1, #2, #3, #4, #7, #13, #14 pass, you can ship a **v2.0-rc1** (skills + agents only).
If #1–#7 pass, you can ship a **v2.0-rc2** (plus hooks, MCP, self-learning).
If #1–#11 pass, you can ship a **v2.0-rc3** (full release minus example).
When all 12 pass, ship **v2.0**.
