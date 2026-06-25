# Phase 0 — Foundation

> **Week 1, ~18 hours**
> **Themes:** T1 (Agent depth), T3 (Artifact rigor)
> **Goal:** Establish the contracts that everything else builds on. After this phase, vespyr is "rigorous" — agents are locked, customization works, entry points consolidated, terminology fixed.

## Source mapping

| F-item | Master ref | Source file/section |
|---|---|---|
| F0.1 | Phase 0 / T3 | Evolution 1.4 |
| F0.2–F0.4 | Phase 0 / T1 | Evolution 1.3 |
| F0.5 | Phase 0 / T3 | Evolution 1.4 |
| F0.6–F0.10 | Phase 0 / T1 | Adoption 3.4, 3.10, 3.11 |
| F0.11–F0.12 | Phase 0 / T1, T3 | Evolution 3.3 |
| F0.13–F0.18 | Phase 0 / T1, T3 | Evolution 1.1 |
| F0.19 | Phase 0 / T1 | Evolution 1.5 |
| F0.20–F0.22 | Phase 0 / T1 | Adoption 3.3 |

---

## F0.1 — Canonical phase table (`.agents/references/phase-table.md`)

**Source:** Evolution §1.4 (file 17, ~60 lines)

- [ ] Create `.agents/references/phase-table.md` with the 11-row table (Phase -1 to Phase 9)
- [ ] Conventions block: 2-digit zero-padded folders, 0-indexed phases, folder may contain 2 phases
- [ ] Update `.opencode/skills/phase/SKILL.md` to reference this file (not duplicate the table)
- [ ] Update `workflow.md` to reference this file
- [ ] Update `README.md` "Workflow" section to link to this file

## F0.2–F0.4 — Single-source entry points

**Source:** Evolution §1.3 (files 12–16)

- [ ] F0.2 — Move canonical version to `.opencode/agent.md.canonical` (consolidate with `templates/AGENTS.md.canonical`)
- [ ] F0.3 — Replace `AGENTS.md`, `agent.md`, `CLAUDE.md` with symlinks to `.opencode/agent.md.canonical`
- [ ] F0.4 — Create `.agents/scripts/sync-entry-points.js` (~80 lines):
  - [ ] Reads `.opencode/agent.md.canonical`
  - [ ] Replaces harness dotfolder references per target
  - [ ] Writes to `AGENTS.md`, `agent.md`, `CLAUDE.md`, and per-harness `AGENTS.md` in `.claude/`, `.kiro/`, etc.
  - [ ] Validates each output is non-empty and contains canonical sections
- [ ] Hook `sync-entry-points.js` into `bin/cli.js init` command

## F0.5 — `bin/cli.js` `phase` command reads from `phase-table.md`

**Source:** Evolution §1.4 (file 18)

- [ ] Refactor the `phase` command in `bin/cli.js` to read from `.agents/references/phase-table.md` instead of hardcoded table
- [ ] Test all `phase` subcommands: `show`, `set`, `next`, `prev`

## F0.6 — All 21 agents — frontmatter v2 (schema migration)

**Source:** Adoption §3.4, Evolution 1.1

This is 21 micro-tasks, one per agent. Use a scripted migration where possible.

- [ ] F0.6.a — `.agents/agents/founder.md` — add `name`, `icon`, `capabilities`, `default_squad`, `origin: core`
- [ ] F0.6.b — `.agents/agents/product-manager.md` — same
- [ ] F0.6.c — `.agents/agents/product-designer.md` — same
- [ ] F0.6.d — `.agents/agents/architect.md` — same
- [ ] F0.6.e — `.agents/agents/tech-lead.md` — same
- [ ] F0.6.f — `.agents/agents/developer.md` — same
- [ ] F0.6.g — `.agents/agents/code-reviewer.md` — same
- [ ] F0.6.h — `.agents/agents/qa-engineer.md` — same
- [ ] F0.6.i — `.agents/agents/researcher.md` — same
- [ ] F0.6.j — `.agents/agents/user-researcher.md` — same
- [ ] F0.6.k — `.agents/agents/ux-researcher.md` — same
- [ ] F0.6.l — `.agents/agents/data-analyst.md` — same
- [ ] F0.6.m — `.agents/agents/security-engineer.md` — same
- [ ] F0.6.n — `.agents/agents/performance-engineer.md` — same
- [ ] F0.6.o — `.agents/agents/ml-engineer.md` — same
- [ ] F0.6.p — `.agents/agents/devops-engineer.md` — same
- [ ] F0.6.q — `.agents/agents/technical-writer.md` — same
- [ ] F0.6.r — `.agents/agents/reader.md` — same
- [ ] F0.6.s — `.agents/agents/writer.md` — same
- [ ] F0.6.t — `.agents/agents/executor.md` — same
- [ ] F0.6.u — `.agents/agents/memory-controller.md` — same

**Icon assignments** (for F0.10 persona prefix):
- founder 🧭, product-manager 📋, product-designer 🎨, architect 🏗️, tech-lead 📐
- developer 💻, code-reviewer 🔍, qa-engineer 🧪, researcher 🔬, user-researcher 👥
- ux-researcher 🎭, data-analyst 📊, security-engineer 🔒, performance-engineer ⚡
- ml-engineer 🤖, devops-engineer 🚀, technical-writer ✍️
- reader 📖, writer ✏️, executor ⚙️, memory-controller 🧠

## F0.7 — All 21 agents — `channeled_mentor` field

**Source:** Evolution §3.2 (file 23)

- [ ] F0.7.a–u — Add `channeled_mentor:` to each of the 21 agents (1–2 references per agent, no more)

Suggested channeled mentors (1–2 per agent, can refine):
- founder: Andy Rachleff (IMVU), Paul Graham
- product-manager: Marty Cagan, Teresa Torres
- product-designer: Don Norman, Luke Wroblewski
- architect: Martin Fowler, Werner Vogels
- tech-lead: Will Larson, Camille Fournier
- developer: Kent Beck, Robert C. Martin
- code-reviewer: Mike Bland, Adrian Cockcroft
- qa-engineer: James Bach, Michael Bolton
- researcher: Clayton Christensen, Michael Porter
- user-researcher: Indi Young, Steve Portigal
- ux-researcher: Don Norman, Jared Spool
- data-analyst: Avinash Kaushik, Edward Tufte
- security-engineer: Bruce Schneier, OWASP team
- performance-engineer: Brendan Gregg, Gil Tene
- ml-engineer: Andrew Ng, François Chollet
- devops-engineer: Kelsey Hightower, Gene Kim
- technical-writer: John McPhee, Barbara Minto
- reader: librarian archetype
- writer: scrivener archetype
- executor: operator archetype
- memory-controller: Mnemosyne (Greek goddess of memory)

## F0.8 — All 21 agents — `<!-- IDENTITY: do not edit -->` block

**Source:** Adoption §3.11

- [ ] F0.8.a–u — For each of the 21 agents, add the `<!-- IDENTITY: do not edit -->` block separating hardcoded identity (name, icon, role) from customizable behavior (principles, capabilities, persistent facts)

Pattern:
```markdown
<!-- IDENTITY: do not edit — hardcoded persona -->
# @{name} ({Human Name})
You are a {role} with {depth}.
## Persona voice
## Persona principles (non-negotiable)
<!-- /IDENTITY -->

# Customizable surface (overridable via .agents/custom/{name}.toml)
## Project-specific configuration
```

## F0.9 — All 21 agents — icon-prefixed responses

**Source:** Adoption §3.10

- [ ] F0.9.a–u — Add to each agent body (after the IDENTITY block):
  ```markdown
  ## Response format
  Begin every response with `{icon} {Human Name}:` so the user always knows which persona is in control.
  ```

## F0.10 — Frontmatter validator (`.agents/scripts/validate_frontmatter.js`)

**Source:** Adoption §3.4

- [ ] Create the validator (~120 lines):
  - [ ] Parse YAML frontmatter of every agent file
  - [ ] Required fields: `name`, `icon`, `description`, `version`, `human_name`, `mode`, `permission`, `capabilities`, `default_squad`, `origin`, `channeled_mentor`
  - [ ] Validate `name` matches filename
  - [ ] Validate `icon` is a single emoji
  - [ ] Validate `default_squad` is in the known squad list
  - [ ] Validate `origin` is `core` or `module:<name>`
  - [ ] Exit 0 if all 21 pass; exit 1 with file list if any fail
- [ ] Add `npm run validate:frontmatter` to `package.json`
- [ ] Wire into `bin/cli.js init`

## F0.11 — Glossary (`.agents/references/glossary.md`)

**Source:** Evolution §3.3 (file 24, ~100 lines)

- [ ] Create the glossary with locked terminology:
  - [ ] `squad` (not team, not group)
  - [ ] `capability` (not feature, not function)
  - [ ] `artifacts/memory/` (not context/, not state/)
  - [ ] `pipeline-state.json` + `sprint-status.yaml` (dual-format state)
  - [ ] `<!-- IDENTITY: do not edit -->` block
  - [ ] `stepsCompleted` (YAML frontmatter key)
  - [ ] `companion` (spec-kernel companion file)
  - [ ] `channeled mentor` (1–2 references per agent)
  - [ ] `hook ID` (stable string like `pre:bash:safety`)
  - [ ] `MCP tool` (mcp__vespyr__* prefix)
- [ ] Cross-link from `AGENTS.md` and `agent.md.canonical`

## F0.12 — Agent contracts (`.agents/references/agent-contracts.md`)

**Source:** Evolution §3.3 (file 25, ~120 lines)

- [ ] Create the contracts file with an owns/doesn't-own table for all 21 agents:
  - [ ] For each agent: 3–5 things they OWN, 2–3 things they explicitly DON'T own
  - [ ] Format: a single Markdown table grouped by phase (Discovery / Strategy / Architecture / Development / Quality / Operations)
  - [ ] Cross-link to the WDS handoff pattern (in spirit; not implementation)

## F0.13 — Expand `.agents/skills/grill-me/SKILL.md` (11 → 180+ lines)

**Source:** Evolution §1.1 (file 1)

- [ ] Write the 7-branch decision tree (Product reqs, Architecture trade-offs, Edge cases, Codebase logic, Cost & timeline, Risks, Success criteria)
- [ ] Add `## When to use` and `## When NOT to use` sections
- [ ] Add `## Workflow` with 5 steps (Scope lock → Question loop → Decision log → Cross-branch consistency → Lock + handoff)
- [ ] Add `## Output artifacts` section
- [ ] Add `## State machine integration` (status check at start, complete call at end)
- [ ] Add `## Anti-patterns to avoid` (no bundling questions, no uncritical agreement, etc.)
- [ ] Verify file is ≥ 180 lines

## F0.14 — Expand `.agents/skills/squad/SKILL.md` (42 → 100+ lines)

**Source:** Evolution §1.1 (file 2)

- [ ] List all 7 squads with member agents and squad-specific output expectations
- [ ] Document the activation ceremony (`@squad activate build` → writes to `artifacts/memory/active-squad.md`)
- [ ] Document the deactivation ceremony
- [ ] Document how to add a custom squad (file format reference)
- [ ] Verify file is ≥ 100 lines

## F0.15 — Expand `.agents/skills/delegate/SKILL.md` (50 → 90+ lines)

**Source:** Evolution §1.1 (file 3)

- [ ] Document the `@reader` / `@writer` / `@executor` / `@memory-controller` contract per task type
- [ ] Add decision tree: "If your task is X, delegate to Y because Z"
- [ ] Document the `IsArtifact: false` safeguard in detail
- [ ] Document token economics (per `delegation-pattern.md`)
- [ ] Verify file is ≥ 90 lines

## F0.16 — Expand `.agents/skills/plan/SKILL.md` (65 → 120+ lines)

**Source:** Evolution §1.1 (file 4)

- [ ] Detailed execution plan template
- [ ] Task granularity rules (1-4 hours per task, per `tech-lead` charter)
- [ ] Dependency declaration syntax
- [ ] Worktree allocation for parallel developers
- [ ] Verify file is ≥ 120 lines

## F0.17 — Expand `.agents/skills/code-graph/SKILL.md` (59 → 100+ lines)

**Source:** Evolution §1.1 (file 5)

- [ ] When to use the graph (cross-file refactors, understanding blast radius)
- [ ] Output schema (what's in `code-graph.json`)
- [ ] Self-healing wrapper invocation (`ensure_graph.js` with mtime check)
- [ ] Read-only query patterns (will be replaced by `graph_query.js` in Phase 3, but document the legacy read path here)
- [ ] Verify file is ≥ 100 lines

## F0.18 — Expand `.agents/skills/memory/SKILL.md` (44 → 80+ lines)

**Source:** Evolution §1.1 (file 6)

- [ ] When to write to memory (systemic patterns only, not single-instance)
- [ ] The 5 files: `project-context.md`, `active-decisions.md`, `lessons-learned.md`, `patterns-and-conventions.md`, `blockers-and-risks.md`
- [ ] Format strings for each entry type (`[DOMAIN]`, `[CODE]`, `[PROCESS]`, `[ARCH]`, `[LESSON]`, `[RISK]`, `[DECISION]`)
- [ ] Compaction triggers and outcomes
- [ ] Verify file is ≥ 80 lines

## F0.19 — Humanize third-party notice (`.agents/skills/humanize/THIRD-PARTY-NOTICE.md`)

**Source:** Evolution §1.5 (file 19)

- [ ] Note the upstream (blader/humanizer), license, last-synced date
- [ ] One-line "to update, follow these steps"

## F0.20 — Customization merge (`.agents/scripts/merge_customization.js`)

**Source:** Adoption §3.3

- [ ] Create the 2-file TOML merge script (~80 lines):
  - [ ] Read `<agent>/customize.toml` (defaults)
  - [ ] Read `.agents/custom/<agent>.toml` (override)
  - [ ] Apply merge rules: scalars override-wins, tables deep-merge, arrays of tables with `code` or `id` keyed-merge, other arrays append
  - [ ] Output merged config to stdout or write to a target file
- [ ] Hand-write minimal TOML parser (no external deps) or use a vetted TOML library

## F0.21 — Customization contract docs (`.agents/custom/README.md`)

**Source:** Adoption §3.3

- [ ] Create `.agents/custom/.gitkeep` and `.agents/custom/README.md` explaining:
  - [ ] What the override file is for
  - [ ] Merge rules in plain English
  - [ ] Worked example (override `@developer` temperature to 0.2)
  - [ ] "How do I know it worked?" test instructions

## F0.22 — Customization skill (`.agents/skills/customize/SKILL.md`)

**Source:** Adoption §3.3

- [ ] Create the guided authoring flow (~200 lines):
  - [ ] "Describe intent" prompt (what do you want to change?)
  - [ ] "Map to override field" logic (which TOML key corresponds?)
  - [ ] "Write the override" step (delegated to `@writer`)
  - [ ] "Verify" step (run `node .agents/scripts/merge_customization.js developer` and check output)
- [ ] Test with 2 real overrides (`@developer` temperature, `@founder` capabilities)

---

## Done when

- [ ] `npx vespyr init` produces a working install with the new frontmatter schema
- [ ] `node .agents/scripts/validate_frontmatter.js` exits 0 on all 21 agents
- [ ] `node bin/cli.js phase` reads from `phase-table.md` (not hardcoded)
- [ ] The 6 thin skills (grill-me, squad, delegate, plan, code-graph, memory) are all ≥ 80 lines
- [ ] `AGENTS.md`, `agent.md`, `CLAUDE.md` are symlinks (or generated), not hand-maintained duplicates
- [ ] Customization test: editing `.agents/custom/developer.toml` to override `temperature` actually overrides it on next agent load
- [ ] `glossary.md` and `agent-contracts.md` exist and are linked from `AGENTS.md`
- [ ] All 21 agents have: v2 frontmatter, channeled mentor, IDENTITY block, icon-prefix instruction

## Risks specific to this phase

- **Frontmatter migration is repetitive** (21 files). Use a script, not 21 hand-edits.
- **IDENTITY block boundaries** can drift if not enforced at install time. Validator must reject agents without it.
- **Channeled mentor overload**: hard rule = 1–2 references per agent. Reject 3+.
- **Glossary becomes a bikeshed magnet**: lock it at end of phase; future changes require explicit review.

## Handoff to Phase 1

Once Phase 0 is done, every new file in Phase 1+ can assume:
- Frontmatter is v2.
- Agents are locked behind an IDENTITY block.
- Customization works via `.agents/custom/<agent>.toml`.
- Entry points are symlinks (one source).
- Phase table is canonical.
- Glossary and contracts are the single source of terminology.
