# Phase 4 — Modularity + Handoff

> **Weeks 7–8, ~22 hours**
> **Theme:** T6 (Modularity)
> **Goal:** Core stays lean. Domain extras ship as install-modules (not separate npm packages yet). Language-specific rules layer. Builder skills let users create new agents/skills/workflows. Example project ships. Docs are rewritten to reflect the v2.0 architecture. After this phase, vespyr is "modular" — selective install works, builders exist, example project ships, docs are current.

## Source mapping

| F-item | Master ref | Source file/section |
|---|---|---|
| F4.1–F4.3 | Phase 4 / T6 | Evolution §3.1 (install-modules) |
| F4.4–F4.5 | Phase 4 / T6 | Adoption §4.1, ECC pattern (rules/) |
| F4.6–F4.8 | Phase 4 / T6 | Adoption §4.3, BMAD pattern (builders) |
| F4.9–F4.10 | Phase 4 / T6 | Evolution §1.6 (example project) |
| F4.11–F4.15 | Phase 4 / T1 | New (docs rewrite) |

---

## F4.1–F4.3 — `install-modules` (selective install)

**Source:** Evolution §3.1

- [ ] F4.1 — Create `.agents/manifests/install-modules.json` (~180 lines):
  - [ ] 7 modules: `core` (required), `research`, `design`, `architecture`, `game`, `memory`, `orchestration`
  - [ ] Each module declares: `name`, `version`, `description`, `depends_on`, `agents` (list of file paths), `skills` (list of folder paths), `templates` (list), `squads` (list)
  - [ ] `core` is always required; cannot be excluded
  - [ ] Default install = all 7 modules
  - [ ] `depends_on` chains (e.g., `game` depends on `core`, `design`)
- [ ] F4.2 — Create `.agents/scripts/install-modules.js` (~100 lines):
  - [ ] `list` — show all modules with their dependencies
  - [ ] `install <module-list>` — copy selected modules' files into the project
  - [ ] `remove <module-list>` — remove a module's files (only files tracked in the install state)
  - [ ] Read manifest, resolve dependency closure, copy files
  - [ ] Write `artifacts/state/install-state.json` (provenance for safe uninstall)
- [ ] F4.3 — Add `install-modules` subcommand to `bin/cli.js`:
  - [ ] `npx vespyr install-modules core,design` — slim install
  - [ ] `npx vespyr install-modules --list` — show available modules
  - [ ] `npx vespyr install-modules --remove orchestration` — remove a module
  - [ ] `--dry-run` flag for all subcommands

## F4.4–F4.5 — Language-specific rules (CSS-like specificity)

**Source:** Adoption §4.1, ECC pattern

- [ ] F4.4 — Create `.agents/rules/common/` with 8 baseline rule files (~50 lines each):
  - [ ] `coding-style.md` — universal style (naming, file size, function size)
  - [ ] `testing.md` — universal testing rules (test the right layer, integration over unit where it matters)
  - [ ] `git-workflow.md` — branches, commits, worktrees
  - [ ] `performance.md` — universal perf rules
  - [ ] `patterns.md` — common patterns
  - [ ] `hooks.md` — how to use vespyr hooks
  - [ ] `agents.md` — how to use vespyr agents
  - [ ] `security.md` — universal security baseline (no secrets in code, parameterized queries)
- [ ] F4.5 — Create `.agents/rules/<lang>/` for 4 languages (3 first, 1 placeholder):
  - [ ] F4.5.a — `.agents/rules/typescript/` (5 files, ~60 lines each)
  - [ ] F4.5.b — `.agents/rules/python/` (5 files)
  - [ ] F4.5.c — `.agents/rules/go/` (5 files)
  - [ ] F4.5.d — `.agents/rules/rust/` (3 files, lighter coverage as a placeholder)
- [ ] Update `validate_frontmatter.js` (or create `validate_rules.js`) to enforce:
  - [ ] Each language folder must reference `../common/<file>.md` at the top
  - [ ] Language-specific overrides use `>` markers
- [ ] Document merge order in `.agents/rules/README.md`:
  - [ ] Common applies first; language-specific overrides apply second
  - [ ] "Specificity" rule: most-specific (deepest in `rules/<lang>/<file>.md`) wins

## F4.6–F4.8 — Builder skills (eat your own dog food)

**Source:** Adoption §4.3, BMAD pattern

- [ ] F4.6 — Create `.agents/skills/agent-builder/SKILL.md` (~220 lines):
  - [ ] `## When to invoke` (creating a new domain-specific persona)
  - [ ] `## What you'll produce` (one new agent file)
  - [ ] `## 5-step guided flow`:
    - [ ] Step 1: Define the role (one sentence)
    - [ ] Step 2: Pick the channeled mentor (1–2 references)
    - [ ] Step 3: Pick the icon
    - [ ] Step 4: Set the permissions (read + question for thinkers; bash + edit for doers)
    - [ ] Step 5: Write the charter (when to invoke, when NOT, output artifacts)
  - [ ] `## Acceptance criteria` (file is created via `@writer`; v2 frontmatter validated)
- [ ] F4.7 — Create `.agents/skills/skill-builder/SKILL.md` (~220 lines):
  - [ ] `## When to invoke` (creating a new workflow)
  - [ ] `## What you'll produce` (folder + SKILL.md + steps/ + customize.toml)
  - [ ] `## 4-step guided flow`:
    - [ ] Step 1: Define the workflow goal
    - [ ] Step 2: Identify the steps (max 10)
    - [ ] Step 3: Pick the mode (single, tri-modal, or chained)
    - [ ] Step 4: Write the SKILL.md bootloader
  - [ ] `## Folder scaffolding` — uses `@writer` to create the folder structure
- [ ] F4.8 — Create `.agents/skills/workflow-builder/SKILL.md` (~240 lines):
  - [ ] `## When to invoke` (creating a multi-agent workflow that spans squads)
  - [ ] `## What you'll produce` (a workflow file consumed by `bin/cli.js workflow`)
  - [ ] `## 6-step guided flow`:
    - [ ] Step 1: Define the trigger
    - [ ] Step 2: Pick the agents
    - [ ] Step 3: Define the order
    - [ ] Step 4: Define the gates
    - [ ] Step 5: Pick the output format
    - [ ] Step 6: Pick the squad(s) that own the workflow

## F4.9–F4.10 — Example project (worked example)

**Source:** Evolution §1.6

- [ ] F4.9 — Create `.agents/templates/example-project/` with all 10 phase folders populated:
  - [ ] `00-discovery/idea-brief.md` (~80 lines, sample)
  - [ ] `01-research/market-analysis.md` (~60 lines, sample)
  - [ ] `02-strategy/prd.md` (~120 lines, sample — uses spec-kernel)
  - [ ] `02-strategy/companions/glossary.md` (~30 lines)
  - [ ] `02-strategy/companions/acceptance-criteria.md` (~30 lines)
  - [ ] `02-strategy/companions/user-journey.md` (~30 lines)
  - [ ] `03-architecture/adr-001.md` (~40 lines, sample)
  - [ ] `04-planning/execution-plan.md` (~50 lines, sample)
  - [ ] `05-execution/code-sample.ts` (~30 lines, real working code)
  - [ ] `06-quality/qa-report.md` (~40 lines, sample)
  - [ ] `07-infrastructure/launch-log.md` (~30 lines, sample)
  - [ ] `08-documentation/iteration-backlog.md` (~20 lines, sample)
  - [ ] `09-retro/action-items.md` (~30 lines, sample)
  - [ ] All cross-references intact (PRD cites brief, execution plan cites PRD, etc.)
  - [ ] Deliberately trivial project (a CLI todo list)
- [ ] F4.10 — Add `init --example` to `bin/cli.js`:
  - [ ] `npx vespyr init --example` → copies the example project to `artifacts/output/`
  - [ ] Updates `artifacts/memory/project-context.md` to reflect the example project
  - [ ] Sets `squad: full-team`
  - [ ] Time: should complete in < 30 seconds

## F4.11 — Rewrite `README.md` to reflect v2.0

- [ ] New sections:
  - [ ] "What is Vespyr" (1 paragraph)
  - [ ] "The 6 themes" (T1–T6, one line each)
  - [ ] "The 4 phases of v2.0" (link to master roadmap)
  - [ ] "Squads" (table of 7 squads)
  - [ ] "Install" (`npx vespyr`, `npx vespyr --modules=core,design`, `npx vespyr mcp start`)
  - [ ] "Hooks" (10 IDs, env-var disable, profile)
  - [ ] "MCP tools" (10 tools)
  - [ ] "Scripts" (the 12 new scripts)
  - [ ] "Customization" (the 2-file TOML contract)
  - [ ] "Roadmap" (link to master + Phase 5 enrichment)

## F4.12 — Rewrite `AGENTS.md` (canonical)

- [ ] Surface the new contracts:
  - [ ] Frontmatter v2 schema
  - [ ] IDENTITY block
  - [ ] Customization contract
  - [ ] Hook graph (10 IDs)
  - [ ] MCP tools
  - [ ] Self-learning pipeline
  - [ ] Spec-kernel + companions
  - [ ] 6 themes summary

## F4.13 — Update `QUICK-REFERENCE.md`

- [ ] Add new commands:
  - [ ] `mcp start` / `mcp list-tools` / `mcp test`
  - [ ] `install-modules` subcommand
  - [ ] `witness check` / `witness sign`
  - [ ] `graph_query` (with all 9 sub-commands)
  - [ ] `self_learn scan` / `self_learn promote-pattern` / `self_learn promote-instinct`
  - [ ] `delegation_audit`
  - [ ] `qa_check`

## F4.14 — Update `ROADMAP.md`

- [ ] Mark v1.2-v1.4 (current) work as "shipped" or "in v1.x line, not v2.0"
- [ ] Mark v2.0 (Phases 0-4) as "THIS PLAN" with link to master
- [ ] Add v3.0 backlog:
  - [ ] Multi-agent parallelism via git worktrees (move from ROADMAP §Backlog)
  - [ ] MCP server-as-tool (vespyr exposed as a tool in other apps)
  - [ ] Agent marketplace (community agents via `vespyr-module-*` packages)
  - [ ] VS Code extension
  - [ ] Vespyr Cloud (shared team memory)
  - [ ] Multi-locale docs (12 locales like ECC)
  - [ ] Language-specific reviewer agents (20+ subagents)
  - [ ] WDS-style persona handoff for multi-session projects

## F4.15 — Add `CHANGELOG.md` v2.0 entry

- [ ] Summarize the 12 DoD criteria
- [ ] List the 76 new files, 65 modified files
- [ ] Note the 5.5-week effort (matches the 8-week estimate minus Phase 5)
- [ ] Reference the master roadmap for the full plan

---

## Done when

- [ ] `npx vespyr install-modules core,design` produces a slimmed install (only core + design agents/skills copied)
- [ ] `npx vespyr init --example` produces a working project skeleton in 30 seconds
- [ ] A new agent can be created in 5 minutes via `agent-builder`
- [ ] A new skill can be created in 5 minutes via `skill-builder`
- [ ] A new workflow can be defined in 10 minutes via `workflow-builder`
- [ ] `rules/common/` + `rules/typescript/` merged at install time produces the right precedence
- [ ] A user can disable the orchestration module and still have a working core install
- [ ] `README.md` reflects the v2.0 architecture
- [ ] `AGENTS.md` (canonical) surfaces the new contracts

## Risks specific to this phase

- **Module split breaks existing installs.** Mitigation: `install-modules` is opt-in; default install matches current behavior. The `core` module is always required.
- **Rules merge order is non-obvious.** Document the specificity rule in `rules/README.md` and add a `validate_rules.js` test.
- **Example project becomes a maintenance burden.** It's an example, not a real product. Update only when the schema changes.
- **Builders produce inconsistent output.** Each builder uses `@writer` with a hardcoded template; the output is byte-identical to hand-written.

## Handoff to v2.0 Ship

When Phase 4 is done, all 12 Definition-of-Done criteria from master roadmap Part 6 should pass. Ship v2.0.

Then begin Phase 5 (`5-deeper-bench.md`) for the post-v2.0 enrichment.
