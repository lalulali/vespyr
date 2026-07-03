# Phase 4 — Modularity + Handoff

> **Release:** v2.1
> **Effort:** ~22h
> **Calendar:** Weeks 7-8
> **Theme:** T6 (Modularity)
> **Goal:** Core stays lean. Domain extras ship as install-modules. Language-specific rules layer. Builder skills let users create new agents/skills/workflows. Example project ships. Docs are rewritten. After this phase, Vespyr is "modular."

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| 35-harness future table | ROADMAP.md (35 rows) | **Deleted** | Performative. Solo maintainer cannot port to 35 harnesses. Replaced with: "additional harnesses added as community demand warrants." |

## F4.1-F4.3 — install-modules (selective install)

**Source:** Evolution §3.1 | **Theme:** T6

- [ ] F4.1 — Create `.agents/manifests/install-modules.json` (~180 lines):
  - 7 modules: `core` (required), `research`, `design`, `architecture`, `game`, `memory`, `orchestration`
  - Each module: `name`, `version`, `description`, `depends_on`, `agents` (list), `skills` (list), `templates` (list), `squads` (list)
  - `core` always required; default install = all 7
- [ ] F4.2 — Create `.agents/scripts/install-modules.js` (~100 lines): `list`, `install <module-list>`, `remove <module-list>`, `--dry-run`. Reads manifest, resolves dependency closure, copies files, writes `install-state.json` for safe uninstall.
- [ ] F4.3 — Add `install-modules` subcommand to `bin/cli.js`: `npx vespyr install-modules core,design`, `--list`, `--remove`, `--dry-run`

## F4.4-F4.5 — Language-specific rules (CSS-like specificity)

**Source:** Adoption §4.1, ECC pattern | **Theme:** T6

- [ ] F4.4 — Create `.agents/rules/common/` with 8 baseline rule files (~50 lines each):
  - `coding-style.md`, `testing.md`, `git-workflow.md`, `performance.md`, `patterns.md`, `hooks.md`, `agents.md`, `security.md`
- [ ] F4.5 — Create `.agents/rules/<lang>/` for 4 languages:
  - `typescript/` (5 files, ~60 lines each)
  - `python/` (5 files)
  - `go/` (5 files)
  - `rust/` (3 files, lighter coverage as placeholder)
- [ ] Create `.agents/rules/README.md`: document merge order (common first, language overrides second; most-specific wins)

## F4.6-F4.8 — Builder skills (eat your own dog food)

**Source:** Adoption §4.3, BMAD pattern | **Theme:** T6

- [ ] F4.6 — Create `.agents/skills/agent-builder/SKILL.md` (~220 lines): 5-step guided flow (Define role → Pick channeled mentor → Pick icon → Set permissions → Write charter). Output: one new agent file via `@writer`, validated by `validate_frontmatter.js`.
- [ ] F4.7 — Create `.agents/skills/skill-builder/SKILL.md` (~220 lines): 4-step flow (Define goal → Identify steps max 10 → Pick mode single/tri-modal/chained → Write SKILL.md bootloader). Uses `@writer` for folder scaffolding.
- [ ] F4.8 — Create `.agents/skills/workflow-builder/SKILL.md` (~240 lines): 6-step flow (Define trigger → Pick agents → Define order → Define gates → Pick output format → Pick squad(s)). Output: a workflow file consumed by `bin/cli.js workflow`.

## F4.9-F4.10 — Example project (worked example)

**Source:** Evolution §1.6 | **Theme:** T6

- [ ] F4.9 — Create `.agents/templates/example-project/` with all 10 phase folders populated:
  - `00-discovery/idea-brief.md` (~80 lines)
  - `01-research/market-analysis.md` (~60 lines)
  - `02-strategy/prd.md` (~120 lines, uses spec-kernel)
  - `02-strategy/companions/` (glossary, acceptance-criteria, user-journey, decision-log — each ~30 lines)
  - `03-architecture/adr-001.md` (~40 lines)
  - `04-planning/execution-plan.md` (~50 lines)
  - `05-execution/code-sample.ts` (~30 lines, real working code)
  - `06-quality/qa-report.md` (~40 lines)
  - `07-infrastructure/launch-log.md` (~30 lines)
  - `08-documentation/iteration-backlog.md` (~20 lines)
  - `09-retro/action-items.md` (~30 lines)
  - All cross-references intact; deliberately trivial project (CLI todo list)
- [ ] F4.10 — Add `init --example` to `bin/cli.js`: copies example project to `artifacts/output/`, updates `project-context.md`, sets `squad: full-team`. Should complete in < 30 seconds.

## F4.11 — Rewrite README.md

- [ ] New sections: "What is Vespyr" (1 paragraph), "The 7 themes" (T1-T7, one line each), "The phases of v2.0" (link to this folder), "Squads" (table of 7→10), "Install" (`npx vespyr`, `--modules`, `mcp start`), "Hooks" (10 IDs, env-var disable), "MCP tools" (10 tools), "Scripts" (new scripts), "Customization" (2-file TOML), "Vespyr Identity" (3 differentiators — from Phase 0 T7.4), "Roadmap" (link to this folder)

## F4.12 — Rewrite AGENTS.md (canonical)

- [ ] Surface new contracts: frontmatter v2 schema, IDENTITY block, customization contract, hook graph (10 IDs), MCP tools, self-learning pipeline, spec-kernel + companions, 7 themes summary, Vespyr Identity section (3 differentiators)

## F4.13 — Update QUICK-REFERENCE.md

- [ ] Add new commands: `mcp start`/`list-tools`/`test`, `install-modules`, `witness check`/`sign`, `graph_query` (9 sub-commands), `self_learn scan`/`promote-pattern`/`promote-instinct`, `delegation_audit`, `qa_check`

## F4.14 — Update ROADMAP.md

- [ ] Mark v1.x work as shipped
- [ ] Mark v2.0 as "this plan" with link to development-plan/ folder
- [ ] Add v3.0 backlog: multi-agent parallelism via git worktrees, MCP server-as-tool, agent marketplace, VS Code extension, Vespyr Cloud, multi-locale docs, language-specific reviewer agents, WDS persona handoff, critic consortium (v2.3+)
- [ ] **Delete the 35-harness future table.** Replace with: "Additional harnesses added as community demand warrants. See `07-harness-integration.md` for OpenClaw (v2.1+, can enforce permissions) and Hermes (v2.1+, degraded mode)."

## F4.15 — Add CHANGELOG.md v2.0 entry

- [ ] Summarize the 8 v2.0 DoD criteria (from README.md §4)
- [ ] List the ~48 new files, ~30 modified files
- [ ] Note the effort (78h over 5 weeks)
- [ ] Reference this development-plan/ folder

---

## Done when

- [ ] `npx vespyr install-modules core,design` produces a slimmed install
- [ ] `npx vespyr init --example` produces a working project skeleton in 30 seconds
- [ ] A new agent can be created in 5 minutes via `agent-builder`
- [ ] A new skill can be created in 5 minutes via `skill-builder`
- [ ] A new workflow can be defined in 10 minutes via `workflow-builder`
- [ ] `rules/common/` + `rules/typescript/` merged at install time produces correct precedence
- [ ] A user can disable the orchestration module and still have a working core install
- [ ] `README.md` reflects v2.0 architecture (7 themes, identity section, hooks, MCP, modules)
- [ ] `AGENTS.md` (canonical) surfaces all new contracts
- [ ] `ROADMAP.md` no longer has the 35-harness table

## Risks

- **Module split breaks existing installs.** `install-modules` is opt-in; default matches current behavior. `core` always required.
- **Rules merge order is non-obvious.** Document specificity rule in `rules/README.md`; add `validate_rules.js` test.
- **Example project becomes maintenance burden.** It's an example, not a real product. Update only when schema changes.
- **Builders produce inconsistent output.** Each builder uses `@writer` with a hardcoded template; output is byte-identical to hand-written.

## Handoff to v2.1 Ship

When Phase 4 is done, all v2.1 DoD criteria (9-14 from README.md §4) should pass. Ship v2.1.

Then begin Phase 5 (`06-phase-5-deeper-bench.md`) for the v2.2 enrichment.
