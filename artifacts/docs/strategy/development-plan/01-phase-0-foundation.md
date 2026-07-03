# Phase 0 — Foundation + Vespyr Identity

> **Release:** v2.0
> **Effort:** ~24h (18h foundation + 6h T7 identity)
> **Calendar:** Week 1-2
> **Themes:** T1 (Agent depth), T3 (Artifact rigor), T7 (Vespyr identity)
> **Goal:** Establish the contracts that everything else builds on AND advance Vespyr's 3 differentiators. After this phase, Vespyr is "rigorous" and "identity-locked" — agents are locked, customization works, entry points consolidated, terminology fixed, and the 3 moats (permission-denial, Socratic depth, 3-tier memory) are explicitly strengthened.

## What changed from the original plan

| Item | Original | This file | Why |
|---|---|---|---|
| F0.23-F0.28 (critic infrastructure) | In Phase 0 (12h) | **Removed — deferred to v2.3+** | Speculative engineering. No critic personas exist until v2.2. The infrastructure has no consumers. |
| T7 Vespyr Identity | Backlog (no timeline) | **Added to Phase 0** (6h) | The differentiators are the moat. Ship first, not last. |
| Budget | 18h (master) / 30h (phase file with F0.23-F0.28) | **24h** (18h + 6h T7) | Matches the master's 78h total for v2.0. |

## Source mapping

| F-item | Master ref | Source |
|---|---|---|
| F0.1 | Phase 0 / T3 | Evolution §1.4 |
| F0.2-F0.4 | Phase 0 / T1 | Evolution §1.3 |
| F0.5 | Phase 0 / T3 | Evolution §1.4 |
| F0.6-F0.10 | Phase 0 / T1 | Adoption §3.4, 3.10, 3.11 |
| F0.11-F0.12 | Phase 0 / T1, T3 | Evolution §3.3 |
| F0.13-F0.18 | Phase 0 / T1, T3 | Evolution §1.1 |
| F0.19 | Phase 0 / T1 | Evolution §1.5 |
| F0.20-F0.22 | Phase 0 / T1 | Adoption §3.3 |
| F0.23-F0.28 | **Removed** | Deferred to v2.3+ (critic infrastructure) |
| T7.1-T7.4 | **New** (was backlog) | ROADMAP §T7 — promoted to Phase 0 |

---

## F0.1 — Canonical phase table

**Source:** Evolution §1.4 | **Theme:** T3

- [ ] Create `.agents/references/phase-table.md` (11-row table: Phase -1 to Phase 9)
  - Columns: #, Folder, Phase Name, Primary Skill, Primary Agent, Gate
  - Conventions: 2-digit zero-padded folders, 0-indexed phases, folder may contain 2 phases
- [ ] Update `.opencode/skills/phase/SKILL.md` to reference this file (not duplicate the table)
- [ ] Update `workflow.md` to reference this file
- [ ] Update `README.md` "Workflow" section to link to this file

## F0.2-F0.4 — Single-source entry points

**Source:** Evolution §1.3 | **Theme:** T1

- [ ] F0.2 — Move canonical version to `.opencode/agent.md.canonical` (consolidate with `templates/AGENTS.md.canonical`)
- [ ] F0.3 — Replace `AGENTS.md`, `agent.md`, `CLAUDE.md` with symlinks to `.opencode/agent.md.canonical`
- [ ] F0.4 — Create `.agents/scripts/sync-entry-points.js` (~80 lines)
  - Reads `.opencode/agent.md.canonical`
  - Replaces harness dotfolder references per target (`.agents/`, `.claude/`, `.kiro/`)
  - Writes to `AGENTS.md`, `agent.md`, `CLAUDE.md`, and per-harness `AGENTS.md`
  - Validates each output is non-empty and contains canonical sections
- [ ] Hook `sync-entry-points.js` into `bin/cli.js init` command
- [ ] **Implementation code:** See `10-implementation-specs.md` §1

## F0.5 — `bin/cli.js` phase command reads from phase-table.md

**Source:** Evolution §1.4 | **Theme:** T3

- [ ] Refactor `phase` command to read from `.agents/references/phase-table.md` instead of hardcoded table
- [ ] Test all subcommands: `show`, `set`, `next`, `prev`

## F0.6 — All 21 agents — frontmatter v2 (schema migration)

**Source:** Adoption §3.4, Evolution §1.1 | **Theme:** T1

This is 21 micro-tasks. Use a scripted migration.

- [ ] Add `name`, `icon`, `capabilities`, `default_squad`, `origin: core` to each of the 21 agent files
- [ ] F0.6.a-u — one task per agent (founder, product-manager, product-designer, architect, tech-lead, developer, code-reviewer, qa-engineer, researcher, user-researcher, ux-researcher, data-analyst, security-engineer, performance-engineer, ml-engineer, devops-engineer, technical-writer, reader, writer, executor, memory-controller)

**Icon assignments:**
- founder 🧭, product-manager 📋, product-designer 🎨, architect 🏗️, tech-lead 📐
- developer 💻, code-reviewer 🔍, qa-engineer 🧪, researcher 🔬, user-researcher 👥
- ux-researcher 🎭, data-analyst 📊, security-engineer 🔒, performance-engineer ⚡
- ml-engineer 🤖, devops-engineer 🚀, technical-writer ✍️
- reader 📖, writer ✏️, executor ⚙️, memory-controller 🧠

**Channeled mentors (1-2 per agent):**
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

## F0.7 — All 21 agents — `channeled_mentor` field

**Source:** Evolution §3.2 | **Theme:** T1

- [ ] Add `channeled_mentor:` to each agent's frontmatter (1-2 references, no more — hard rule)
- [ ] The persona body should reference the mentor's principles in voice/tone

## F0.8 — All 21 agents — `<!-- IDENTITY: do not edit -->` block

**Source:** Adoption §3.11 | **Theme:** T1

- [ ] For each agent, add the IDENTITY block separating hardcoded identity from customizable behavior:

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

**Source:** Adoption §3.10 | **Theme:** T1

- [ ] Add to each agent body (after the IDENTITY block):

```markdown
## Response format
Begin every response with `{icon} {Human Name}:` so the user always knows which persona is in control.
```

## F0.10 — Frontmatter validator

**Source:** Adoption §3.4 | **Theme:** T1

- [ ] Create `.agents/scripts/validate_frontmatter.js` (~120 lines)
  - Parse YAML frontmatter of every agent file
  - Required fields: `name`, `icon`, `description`, `version`, `human_name`, `mode`, `permission`, `capabilities`, `default_squad`, `origin`, `channeled_mentor`
  - Validate `name` matches filename
  - Validate `icon` is a single emoji
  - Validate `default_squad` is in known squad list
  - Validate `origin` is `core` or `module:<name>`
  - Exit 0 if all 21 pass; exit 1 with file list if any fail
- [ ] Add `npm run validate:frontmatter` to `package.json`
- [ ] Wire into `bin/cli.js init`
- [ ] **Implementation code:** See `10-implementation-specs.md` §2

## F0.11 — Glossary

**Source:** Evolution §3.3 | **Theme:** T3

- [ ] Create `.agents/references/glossary.md` (~100 lines) with locked terminology:
  - `squad` (not team, not group)
  - `capability` (not feature, not function)
  - `artifacts/memory/` (not context/, not state/)
  - `pipeline-state.json` + `sprint-status.yaml` (dual-format state)
  - `<!-- IDENTITY: do not edit -->` block
  - `stepsCompleted` (YAML frontmatter key)
  - `companion` (spec-kernel companion file)
  - `channeled mentor` (1-2 references per agent)
  - `hook ID` (stable string like `pre:bash:safety`)
  - `MCP tool` (mcp__vespyr__* prefix)
- [ ] Cross-link from `AGENTS.md` and `agent.md.canonical`

## F0.12 — Agent contracts

**Source:** Evolution §3.3 | **Theme:** T1

- [ ] Create `.agents/references/agent-contracts.md` (~120 lines)
  - For each agent: 3-5 things they OWN, 2-3 things they explicitly DON'T own
  - Single Markdown table grouped by phase (Discovery / Strategy / Architecture / Development / Quality / Operations)
  - Cross-link to GUARDRAILS.md escalation ladder

## F0.13-F0.18 — Expand thin skills to ≥ 80 lines

**Source:** Evolution §1.1 | **Theme:** T1, T3

- [ ] F0.13 — `grill-me/SKILL.md` (11 → 180+ lines): 7-branch decision tree, when to use/not use, 5-step workflow (Scope lock → Question loop → Decision log → Cross-branch consistency → Lock + handoff), output artifacts, state machine integration, anti-patterns
- [ ] F0.14 — `squad/SKILL.md` (42 → 100+ lines): all 7 squads with members, activation/deactivation ceremony, custom squad creation
- [ ] F0.15 — `delegate/SKILL.md` (50 → 90+ lines): @reader/@writer/@executor/@memory-controller contract per task type, decision tree, IsArtifact safeguard, token economics
- [ ] F0.16 — `plan/SKILL.md` (65 → 120+ lines): execution plan template, task granularity rules (1-4h), dependency syntax, worktree allocation
- [ ] F0.17 — `code-graph/SKILL.md` (59 → 100+ lines): when to use, output schema, self-healing wrapper, query patterns (legacy read path; replaced by graph_query.js in Phase 3)
- [ ] F0.18 — `memory/SKILL.md` (44 → 80+ lines): when to write, the 5 files, format strings ([DOMAIN], [CODE], [PROCESS], [ARCH], [LESSON], [RISK], [DECISION]), compaction triggers

## F0.19 — Humanize third-party notice

**Source:** Evolution §1.5 | **Theme:** T1

- [ ] Create `.agents/skills/humanize/THIRD-PARTY-NOTICE.md` (~20 lines)
  - Note upstream (blader/humanizer), license, last-synced date
  - One-line "to update, follow these steps"

## F0.20-F0.22 — Customization merge (2-file TOML)

**Source:** Adoption §3.3 | **Theme:** T1

- [ ] F0.20 — Create `.agents/scripts/merge_customization.js` (~80 lines)
  - Read `<agent>/customize.toml` (defaults, regenerated on update)
  - Read `.agents/custom/<agent>.toml` (override, committed)
  - Merge rules: scalars override-wins, tables deep-merge, arrays of tables with `code`/`id` keyed-merge, other arrays append
  - **Implementation code:** See `10-implementation-specs.md` §3
- [ ] F0.21 — Create `.agents/custom/README.md` (~60 lines): what the override file is for, merge rules in plain English, worked example (override @developer temperature), "How do I know it worked?" test
- [ ] F0.22 — Create `.agents/skills/customize/SKILL.md` (~200 lines): guided authoring flow (describe intent → map to override field → write via @writer → verify via merge_customization.js)

---

## T7 — Vespyr Identity (NEW — promoted from backlog)

**Source:** ROADMAP §T7 (was "Backlog, no timeline") | **Theme:** T7

The original plan spent 138h importing BMAD/Ruflo/ECC patterns and 0h advancing Vespyr's own differentiators. This section fixes that. The 3 moats are explicitly strengthened in Phase 0.

### T7.1 — Worktree delegation enforcement (~60 lines)

**Differentiator:** Permission-denial reasoning/I/O split — the #1 moat.

- [ ] Strengthen the delegation enforcement in `delegation-pattern.md`:
  - Add multi-developer worktree delegation rules (when @developer spawns parallel worktrees, each worktree's I/O is isolated)
  - Add `[DIRECT-IO-JUSTIFIED: {reason}]` protocol (originally planned for Phase 2 F2.19 — pulled forward because it's the moat)
  - Add the task→sub-agent mapping table (Read 1-3 small files → direct; Read 4+ files → @reader; Write > 50 lines → @writer; Run bash → @executor)
- [ ] Add `## Delegation Contract` block to the 13 reasoning agents (developer, code-reviewer, architect, tech-lead, qa-engineer, product-manager, product-designer, security-engineer, performance-engineer, data-analyst, devops-engineer, ml-engineer, researcher)
  - Each block: "You delegate I/O to sub-agents by default. Direct I/O requires a `[DIRECT-IO-JUSTIFIED: ...]` line."
- [ ] Note: The `delegation_audit.js` script and `delegation-log.json` infrastructure stay in Phase 2 (they need hooks). Phase 0 ships the policy + the contract blocks.

### T7.2 — Cross-session memory pattern auto-loading (~80 lines)

**Differentiator:** 3-tier progressive memory.

- [ ] Update `memory-controller.md` loading protocol:
  - Add a "pattern pre-fetch" step that scans `patterns-and-conventions.md` for entries tagged with the current phase + agent before loading full context
  - Auto-load relevant patterns BEFORE the full 3-tier load (patterns are Tier 2, but relevant ones get promoted to the front of the context window)
  - This is a lighter version of the self-learning instinct loading (Phase 2) — it doesn't auto-promote patterns, just surfaces relevant ones proactively
- [ ] Update `memory_filter.js` to support a `--prefetch-patterns` flag that returns matching patterns first
- [ ] **Implementation code:** See `10-implementation-specs.md` §4

### T7.3 — Socratic universal minimum bar (~40 lines)

**Differentiator:** Socratic methodology depth.

- [ ] Add a "Socratic minimum bar" to `validate_frontmatter.js`:
  - Every reasoning agent (13 agents, not I/O sub-agents) must have a `## Socratic Stance` section in its body
  - The section declares: (a) what this agent challenges, (b) what "change my mind" looks like, (c) when to escalate vs. when to accept
  - Validator checks for the section header; warns (doesn't fail) if missing
- [ ] Cross-link from `grill-me/SKILL.md` (the 7-branch decision tree is the universal Socratic procedure; each agent's stance is the domain-specific voice)

### T7.4 — Vespyr identity docs

- [ ] Add a "## Vespyr Identity" section to `AGENTS.md` (canonical) and `README.md`:
  - State the 3 differentiators explicitly: (1) Permission-denial reasoning/I/O split, (2) Socratic methodology depth, (3) 3-tier progressive memory
  - For each: what it is, why it matters, what other frameworks do instead, why Vespyr's approach is better
  - This section is the "elevator pitch" for why Vespyr exists alongside BMAD/ECC/Ruflo
- [ ] Add the same section to `QUICK-REFERENCE.md`

---

## Done when

- [ ] `npx vespyr init` produces a working install with the new frontmatter schema
- [ ] `node .agents/scripts/validate_frontmatter.js` exits 0 on all 21 agents
- [ ] `node bin/cli.js phase` reads from `phase-table.md` (not hardcoded)
- [ ] The 6 thin skills (grill-me, squad, delegate, plan, code-graph, memory) are all ≥ 80 lines
- [ ] `AGENTS.md`, `agent.md`, `CLAUDE.md` are symlinks (or generated), not hand-maintained duplicates
- [ ] Customization test: editing `.agents/custom/developer.toml` to override `temperature` actually overrides it on next agent load
- [ ] `glossary.md` and `agent-contracts.md` exist and are linked from `AGENTS.md`
- [ ] All 21 agents have: v2 frontmatter, channeled mentor, IDENTITY block, icon-prefix instruction, Socratic Stance section
- [ ] **T7:** `delegation-pattern.md` has the worktree rules + `[DIRECT-IO-JUSTIFIED]` protocol; 13 reasoning agents have Delegation Contract blocks
- [ ] **T7:** `memory-controller.md` has the pattern pre-fetch step; `memory_filter.js` supports `--prefetch-patterns`
- [ ] **T7:** `validate_frontmatter.js` checks for `## Socratic Stance` section on reasoning agents
- [ ] **T7:** `AGENTS.md` and `README.md` have the "Vespyr Identity" section stating the 3 differentiators

## Risks

- **Frontmatter migration is repetitive** (21 files). Use a script, not 21 hand-edits.
- **IDENTITY block boundaries** can drift if not enforced at install time. Validator must reject agents without it.
- **Channeled mentor overload**: hard rule = 1-2 references per agent. Reject 3+.
- **Glossary becomes a bikeshed magnet**: lock it at end of phase; future changes require explicit review.
- **T7.1 delegation contract blocks** add boilerplate to 13 agents. Keep each block ≤ 8 lines. The policy lives in `delegation-pattern.md`, not in each agent.

## Handoff to Phase 1

Once Phase 0 is done, every new file in Phase 1+ can assume:
- Frontmatter is v2.
- Agents are locked behind an IDENTITY block.
- Customization works via `.agents/custom/<agent>.toml`.
- Entry points are symlinks (one source).
- Phase table is canonical.
- Glossary and contracts are the single source of terminology.
- Delegation is policy-enforced (audit comes in Phase 2).
- Memory pre-fetches relevant patterns.
- Every reasoning agent has a Socratic stance.
- AGENTS.md states the 3 differentiators explicitly.
