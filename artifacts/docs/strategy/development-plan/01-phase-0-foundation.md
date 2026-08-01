# Phase 0 — Foundation + Vespyr Identity

> **Release:** v2.0
> **Calendar:** Week 1-2
> **Themes:** T1 (Agent depth), T3 (Artifact rigor), T7 (Vespyr identity), T8 (UTTERLY SATISFIED culture)
> **Goal:** Establish the contracts that everything else builds on AND advance Vespyr's 3 differentiators. After this phase, Vespyr is "rigorous" and "identity-locked" — agents are locked, customization works, entry points consolidated, terminology fixed, the 3 moats (permission-denial, Socratic depth, 3-tier memory) are explicitly strengthened, and every participating agent inherits the UTTERLY SATISFIED contract.

## What changed from the original plan

| Item | Original | This file | Why |
|---|---|---|---|
| F0.23-F0.28 (critic infrastructure) | In Phase 0 (12h) | **Removed — deferred to v2.3+** | Speculative engineering. No critic personas exist until v2.2. The infrastructure has no consumers. |
| T7 Vespyr Identity | Backlog (no timeline) | **Added to Phase 0** (6h) | The differentiators are the moat. Ship first, not last. |
| F0.29 (citation & footnote protocol) | Not in original plan | **Added to Phase 0** (~4h) | All reasoning agents + skills must cite real sources. Expands "Honesty & Fact-Checking" from internet-only to all sources. |
| Budget | 18h (master) / 30h (phase file with F0.23-F0.28) | **28h** (18h + 6h T7 + 4h F0.29) | F0.29 adds ~4h for 17 agent files + reference + validator. |

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
| F0.29 | **New** | User request — citation & footnote protocol for information integrity |

---

## T8 — UTTERLY SATISFIED DNA baseline

**Source:** User requirement | **Theme:** T8 (cross-cutting)

Phase 0 establishes the behavioral contract that later hooks, skills,
orchestration modes, modules, and harness adapters must preserve.

- [x] Create `.agents/references/utter-satisfaction.md` as the canonical state,
  collaboration, evidence, escalation, and release-gate contract.
- [x] Add the culture to the global guardrails and canonical entry points.
- [x] Add the contract to all 19 participating persona definitions.
- [x] Add the handoff rule to `workflow.md` and the team matrix to launch
  readiness templates.
- [ ] Add machine validation in Phase 2; the Phase 0 baseline remains valid
  without claiming runtime enforcement that does not yet exist.

**Foundation rule:** a new persona, skill, or harness adapter cannot be
considered complete unless it references and preserves the T8 contract. The
full future implementation is in
[`14-utter-satisfaction-dna.md`](14-utter-satisfaction-dna.md).

---

## F0.1 — Canonical phase table

**Source:** Evolution §1.4 | **Theme:** T3

- [x] Create `.agents/references/phase-table.md` (11-row table: Phase -1 to Phase 9)
  - Columns: #, Folder, Phase Name, Primary Skill, Primary Agent, Gate
  - Conventions: 2-digit zero-padded folders, 0-indexed phases, folder may contain 2 phases
- [x] Update `.agents/skills/phase/SKILL.md` to reference this file (not duplicate the table)
- [x] Update `workflow.md` to reference this file — **skipped: file does not exist in repo**
- [x] Update `README.md` "Workflow" section to link to this file

### Problem
`phase` skill says Phase -1: validation, Phase 7: launch, Phase 8: iteration. Folders are `00-discovery`, `06-launch/`, `07-iteration/`. Workflow.md says Phase 9: retro. The phase numbering is inconsistent across three places.

### Target
Single canonical phase table referenced from all docs.

### Proposed content

Create `.agents/references/phase-table.md` with the following full content:

```markdown
# Canonical Phase Table (Single Source of Truth)

| # | Folder | Phase Name | Primary Skill | Primary Agent | Gate |
|---|--------|-----------|---------------|---------------|------|
| -1 | (none) | Validation | `validate-idea` | `@founder` | GO/PIVOT/KILL |
| 0 | `00-discovery/` | Discovery | `explore-idea` | `@researcher` + `@user-researcher` | Brief sign-off |
| 1 | `01-research/` | Research | (sub-skill of explore-idea) | parallel researchers | Quality gate |
| 2 | `02-strategy/` | Strategy | `design` (PRD) | `@product-manager` | PRD approval |
| 3 | `03-architecture/` | Architecture | (sub-skill of design) | `@architect` | ADR sign-off |
| 4 | `04-planning/` | Planning | `plan` (execution plan) | `@tech-lead` | Plan approval |
| 5 | `05-execution/` | Execution | `develop` | `@developer` (multi-worktree) | All tests green |
| 6 | `06-launch/` | Launch | `launch` | `@devops-engineer` + `@product-manager` | Production deploy |
| 7 | `07-iteration/` | Iteration | `iterate` | `@product-manager` + `@data-analyst` | Insights reviewed |
| 8 | `08-documentation/` | Documentation | (cross-cutting) | `@technical-writer` | Docs current |
| 9 | `09-retro/` | Retro | `retro` | `@product-manager` | Action items filed |

**Conventions:**
- Folder names use 2-digit zero-padded numbers (00, 01, ..., 09)
- Phase numbers are 0-indexed (Phase 0 = Discovery)
- The folder name does not always equal the phase number when 2 phases share a folder (e.g., 02-strategy contains both Phase 2 and Phase 3 outputs)
- Validation (Phase -1) has no folder by design — it is a pre-phase gate, not a phase. Its output is a GO/PIVOT/KILL decision that seeds `00-discovery/idea-brief.md`, not a folder of its own.

**Known inconsistency:** Several agents (`security-engineer.md`, `qa-engineer.md`, `performance-engineer.md`) and `develop/SKILL.md` reference `06-quality/` for QA/security/performance artifacts. This folder is not in the canonical table. These references should be consolidated to `05-execution/` (QA happens during execution) during Phase 1.
```

### Why this matters
Three documents currently disagree on phase numbering. A canonical table eliminates drift and gives the `phase` CLI command a single source to read from.

---

## F0.2-F0.4 — Single-source entry points

**Source:** Evolution §1.3 | **Theme:** T1

- [x] F0.2 — Move canonical version to `.agents/agent.md.canonical` (consolidate with `templates/system/AGENTS.md.canonical`)
- [x] F0.3 — Replace `AGENTS.md`, `agent.md`, `CLAUDE.md` with symlinks to `.agents/agent.md.canonical`
- [x] F0.4 — Create `.agents/scripts/sync-entry-points.js` (~80 lines)
  - Reads `.agents/agent.md.canonical`
  - Replaces harness dotfolder references per target (`.agents/`, `.claude/`, `.kiro/`)
  - Writes to `AGENTS.md`, `agent.md`, `CLAUDE.md`, and per-harness `AGENTS.md`
  - Validates each output is non-empty and contains canonical sections
- [x] Hook `sync-entry-points.js` into `bin/cli.js init` command
- [x] **Implementation code:** See `10-implementation-specs.md` §1

### Problem
`CLAUDE.md`, `agent.md`, `AGENTS.md` are three near-identical files (~168 lines each) with only minor path swaps (`.claude/` vs `.agents/`). They drift independently and are a maintenance burden.

### Target
Single source of truth + generated derivatives.

### Proposed content

**F0.2 — Canonical file:** Move the canonical version to `.agents/agent.md.canonical` (already exists as `templates/system/AGENTS.md.canonical` — consolidate).

**F0.3 — Symlinks:**

```bash
cd /Users/christianhadianto/Documents/TechSmith/vespyr
ln -sf .agents/agent.md.canonical AGENTS.md
ln -sf .agents/agent.md.canonical agent.md
ln -sf .agents/agent.md.canonical CLAUDE.md
```

**F0.4 — `sync-entry-points.js` (~80 lines):** A Node.js script that:
- Reads `.agents/agent.md.canonical`
- Replaces the harness dotfolder references per target (`.agents/`, `.claude/`, `.kiro/`, etc.)
- Writes to `AGENTS.md`, `agent.md`, `CLAUDE.md`, and per-harness `AGENTS.md` in `.claude/`, `.kiro/`, etc.
- Validates each output is non-empty and contains the canonical sections

### Why this matters
Only ONE hand-maintained file (`agent.md.canonical`). All entry-point files are symlinks OR generated. `bin/cli.js` `init` command regenerates them on every install, eliminating drift.

---

## F0.5 — `bin/cli.js` phase command reads from phase-table.md

**Source:** Evolution §1.4 | **Theme:** T3

- [~] Refactor `phase` command to read from `.agents/references/phase-table.md` instead of hardcoded table — **SKIPPED: no phase CLI command exists in bin/cli.js; the hardcoded table was in phase/SKILL.md, already fixed in F0.1**
- [~] Test all subcommands: `show`, `set`, `next`, `prev` — **SKIPPED: no phase CLI subcommands exist**

### Problem
The `phase` command hardcodes the phase table in `bin/cli.js`, duplicating the data that also lives in `phase/SKILL.md` and `workflow.md`. When one changes, the others drift.

### Target
`bin/cli.js phase` reads from the canonical `phase-table.md` (created in F0.1).

### Why this matters
All 3 places (`phase/SKILL.md`, `workflow.md`, `phase-table.md`) reference the canonical table. The CLI is no longer a fourth source of truth.

---

## F0.6 — All 21 agents — frontmatter v2 (schema migration)

**Source:** Adoption §3.4, Evolution §1.1 | **Theme:** T1

This is 21 micro-tasks. Use a scripted migration.

- [x] Add `name`, `icon`, `capabilities`, `default_squad`, `origin: core` to each of the 21 agent files
- [x] F0.6.a-u — one task per agent (founder, product-manager, product-designer, architect, tech-lead, developer, code-reviewer, qa-engineer, researcher, user-researcher, ux-researcher, data-analyst, security-engineer, performance-engineer, ml-engineer, devops-engineer, technical-writer, reader, writer, executor, memory-controller)

**Icon assignments:**
- founder 🧭, product-manager 📋, product-designer 🎨, architect 🏗️, tech-lead 📐
- developer 💻, code-reviewer 🔍, qa-engineer 🧪, researcher 🔬, user-researcher 👥
- ux-researcher 🎭, data-analyst 📊, security-engineer 🔒, performance-engineer ⚡
- ml-engineer 🤖, devops-engineer 🚀, technical-writer ✍️
- reader 📖, writer ✏️, executor ⚙️, memory-controller 🧠

**Channeled mentors (1-2 per agent):** See canonical table in F0.7 below. I/O sub-agent archetypes:
- reader: librarian archetype
- writer: scrivener archetype
- executor: operator archetype
- memory-controller: Mnemosyne (Greek goddess of memory)

### Problem
The current frontmatter is missing fields (`name`, `icon`, `capabilities`, `default_squad`, `origin`) that would unlock better tool/IDE integration, persona-prefixed responses, capability-based routing, and expansion-pack namespacing.

### Target
All 21 agents carry the v2 frontmatter schema.

### Proposed content

The v2 frontmatter schema (all fields required unless marked optional):

```yaml
---
# v2 frontmatter — all fields required unless marked optional
name: developer                    # NEW: kebab-case, matches filename
description: ...                   # existing
version: "3.0"                     # existing
last_updated: 2026-05-19           # existing
human_name: Rex                    # existing
icon: 💻                           # NEW: emoji prefix carried in every response
mode: subagent                     # existing
temperature: 0.1                   # existing
permission: { ... }                # existing
tools: { write: true, ... }        # existing
model: - # optional — set to "-" if per-call routing chooses (harness default applies); see CR-002 Row 11
capabilities:                      # NEW: enumerated capability list
  - code-generation
  - refactoring
  - test-writing
upstream_dependencies: [...]       # existing
downstream_consumers: [...]        # existing
default_squad: build               # NEW: which squad(s) include this agent by default
origin: core                       # NEW: core | module:<name> for expansion packs
---
```

### Why this matters
1. The `icon` field enables persona-prefixed responses (see F0.9). Every reply starts with `💻 Rex: ...`. The user always knows which agent is in control.
2. `capabilities` is a routing surface. The `round-table` and `help-me` skills can match a user query against agent capabilities, not just descriptions. Better routing → less manual `@mention` fatigue.
3. `default_squad` makes squad definitions redundant. Today squads list agents by hand. With `default_squad` on agents, squads become *overrides* of the default membership, not parallel sources of truth.
4. `origin: core | module:<name>` is the v2.1 hook for expansion packs. Module agents are namespaced cleanly.
5. `name` is required for BMAD-compatibility — external tooling that parses our frontmatter expects it.

---

## F0.7 — All 21 agents — `channeled_mentor` field

**Source:** Evolution §3.2 | **Theme:** T1

- [x] Add `channeled_mentor:` to each agent's frontmatter (1-2 references, no more — hard rule)
- [x] The persona body should reference the mentor's principles in voice/tone

### Problem
Vespyr agents have `human_name` (Elena, Sarah, Ivy, etc.) but no mentor references. The persona voice is generic — there's no anchoring to real-world expertise that informs the agent's decision-making style.

### Target
Every agent's frontmatter has a `channeled_mentor` field (1-2 real-world experts), and the persona body references the mentor's principles.

### Proposed content

Canonical mentor assignments (1-2 per agent, hard rule). Add `channeled_mentor:` to each agent's frontmatter using this table:

| Agent | Channeled Mentor |
|---|---|
| `@founder` | Paul Graham + Ben Horowitz |
| `@product-manager` | Marty Cagan + Teresa Torres |
| `@product-designer` | Don Norman + Julie Zhuo |
| `@architect` | Rich Hickey + John Carmack |
| `@tech-lead` | Will Larson + Camille Fournier |
| `@developer` | Kent Beck + Robert C. Martin |
| `@code-reviewer` | Dave Cheney + John Regehr |
| `@qa-engineer` | James Bach + Michael Bolton |
| `@researcher` | Clayton Christensen + Cindy Alvarez |
| `@user-researcher` | Steve Krug + Erika Hall |
| `@ux-researcher` | Don Norman + Jakob Nielsen |
| `@data-analyst` | Avinash Kaushik + Edward Tufte |
| `@security-engineer` | Bruce Schneier + OWASP contributors |
| `@performance-engineer` | Brendan Gregg + Aleksey Shipilëv |
| `@ml-engineer` | Andrej Karpathy + François Chollet |
| `@devops-engineer` | Kelsey Hightower + Charity Majors |
| `@technical-writer` | Strunk + White |
| I/O sub-agents | Archetypes (see F0.6 above) |

The persona body should reference the mentor's principles in voice/tone.

### Why this matters
A new `references/persona-roster.md` cross-references all 21. The persona body references the mentor's principles, giving each agent a grounded voice rather than generic LLM output.

---

## F0.8 — All 21 agents — `<!-- IDENTITY: do not edit -->` block

**Source:** Adoption §3.11 | **Theme:** T1

- [x] For each agent, add the IDENTITY block separating hardcoded identity from customizable behavior:

### Problem
Agent identity is in frontmatter (`human_name`, `description`) and is freely editable. A user can rename `@developer` to `@bob`. Without a split between hardcoded identity and customizable behavior, customization destroys identity.

### Target
Split agent identity into two surfaces: hardcoded identity (not customizable) and customizable behavior (overridable via `.agents/custom/<agent>.toml`).

### Proposed content

In the agent file, hardcode the core identity at the top with a clear `<!-- IDENTITY: do not edit -->` block. The customizable surface lives below it:

```markdown
<!-- IDENTITY: do not edit — hardcoded persona -->
# @{name} ({Human Name})
You are a {role} with {depth}.
## Persona voice
## Persona principles (non-negotiable)
## UTTERLY SATISFIED Culture (non-negotiable)
## See the Unseen (non-negotiable)
Before producing any output:
- Query the code/doc graphs for blast radius and dependents of any proposed change
- Surface hidden assumptions that are implicit but not verified
- Check recent telemetry for cost anomalies relevant to this task
- Begin every response with {icon} {Human Name}: so agent transitions are never hidden
<!-- /IDENTITY -->

# Customizable surface (overridable via .agents/custom/{name}.toml)
## Project-specific configuration
```

### Why this matters
Without this split, customization destroys identity. With it, `@developer` is *always* `@developer` — the senior software engineer persona — but every project's `@developer` is tuned to that project's stack and conventions. The customize skill (F0.22) enforces that overrides can only touch fields *below* the identity block.

---

## F0.9 — All 21 agents — icon-prefixed responses

**Source:** Adoption §3.10 | **Theme:** T1

- [x] Add to each agent body (after the IDENTITY block):

### Problem
Agents have a `human_name` (e.g., "Rex") but no `icon`. Responses do not prefix the agent's identity. When the user sees 8 paragraphs of agent output, they don't know which agent spoke.

### Target
Every agent declares an `icon: 💻` in frontmatter (added in F0.6). Every agent's first line of every response prefixes with `<icon> <human_name>:`.

### Proposed content

Add to each agent body (after the IDENTITY block):

```markdown
## Response format
Begin every response with `{icon} {Human Name}:` so the user always knows which persona is in control.
```

Example output:

> 💻 **Rex:** I'll start by reading the spec at `artifacts/output/02-strategy/product-spec.md`...

### Why this matters
This is a trivial change with outsized UX impact. BMAD does it, and once you see an icon-prefixed conversation you can't go back. Users always know which persona is in control. We approximate BMAD's full icon-as-character rule with a prefix line — the LLM is reliable at prefixing, less reliable at remembering to put the icon mid-response.

---

## F0.10 — Frontmatter validator

**Source:** Adoption §3.4 | **Theme:** T1

- [x] Create `.agents/scripts/validate_frontmatter.js` (~120 lines)
  - Parse YAML frontmatter of every agent file
  - Required fields: `name`, `icon`, `description`, `version`, `human_name`, `mode`, `permission`, `capabilities`, `default_squad`, `origin`, `channeled_mentor`
  - Validate `name` matches filename
  - Validate `icon` is a single emoji
  - Validate `default_squad` is in known squad list
  - Validate `origin` is `core` or `module:<name>`
  - Exit 0 if all 21 pass; exit 1 with file list if any fail
- [x] Add `npm run validate:frontmatter` to `package.json`
- [x] Wire into `bin/cli.js init`
- [x] **Implementation code:** See `10-implementation-specs.md` §2

### Problem
There is no enforcement of the v2 frontmatter schema. A missing `icon` or a `name` that doesn't match the filename silently breaks routing and persona-prefixing.

### Target
A validator that enforces v2 schema on all 21 agents, wired into `init` and `npm test`.

### Why this matters
The validator is the gate that keeps the schema honest. Without it, the 21-file migration (F0.6) will drift within a week. Exit 0 if all 21 pass; exit 1 with a file list if any fail.

---

## F0.11 — Glossary

**Source:** Evolution §3.3 | **Theme:** T3

- [x] Create `.agents/references/glossary.md` (~100 lines) with locked terminology:
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
  - `Citation Protocol` (cite real sources inline with footnotes)
  - `footnote` (`[^N]` markdown footnote — only permitted format)
  - `citation` (inline `[N]` marker linking to a footnote)
- [x] Cross-link from `AGENTS.md` and `agent.md.canonical`

### Problem
Vespyr has no locked terminology. "User story" is also called "ticket," "issue," "feature," "spec," "story," or "requirement" depending on which agent or doc you read. This creates ambiguity in routing, contracts, and memory entries.

### Target
One definition per term. No synonyms. No aliases.

### Proposed content

Create `.agents/references/glossary.md` with the following full content:

```markdown
# Vespyr Glossary — Locked Terminology

**Rule:** One definition per term. No synonyms. No aliases. If you mean "user story," write "user story" — not "ticket," "issue," "feature," "spec," "story," or "requirement."

## Pipeline terms
- **Phase** — A numbered stage in the development pipeline (Phase -1 through Phase 9). See `phase-table.md`.
- **Step** — A sub-stage within a skill. Loaded sequentially in step-file architecture.
- **Skill** — A multi-step workflow defined in `.agents/skills/<name>/SKILL.md`.
- **Squad** — A named bundle of agents that activate together. See `references/squads.md`.
- **Sub-agent** — A small, single-purpose agent (reader, writer, executor, memory-controller) that reasoning agents delegate to.

## Agent terms
- **Reasoning agent** — A persona that thinks and decides but cannot perform I/O directly (denied `bash`/`edit` permissions).
- **I/O sub-agent** — A small, fast sub-agent that performs a single type of I/O (read, write, execute, memory).
- **Channeled mentor** — A real-world expert whose principles inform the agent's persona. See agent frontmatter.
- **Persona** — The full character definition of an agent, including role, principles, voice, and decision tree.

## Artifact terms
- **PRD** — Product Requirements Document. The output of `/design` after PRD sign-off.
- **ADR** — Architecture Decision Record. The output of `@architect` for any non-trivial decision.
- **User story** — A small, testable feature description with ACs. Output of `@product-manager` during `/design`.
- **Acceptance criterion (AC)** — A testable condition that defines "done" for a user story.
- **Change request (CR)** — A formal request to revise an upstream artifact. Filed in `artifacts/output/04-planning/change-requests.md`.
- **Decision log** — A running record of resolved decisions, written to `artifacts/memory/active-decisions.md`.

## Process terms
- **Squad mode** — A predefined subset of agents active for a given project type. Set via `/squad`.
- **Operating mode** — `autonomous`, `semi-autonomous` (default), or `manual`. Controls pause points.
- **Halt condition** — An explicit condition under which a skill stops and surfaces the issue.
- **Escalation ladder** — The named-decision-authority chain for resolving agent disputes.
- **Memory write-back** — The contract by which an agent commits patterns to shared memory.
- **Preflight check** — A check that runs before high-risk tasks to verify required context is loaded.
```

### Why this matters
Locked terminology is the foundation for agent contracts (F0.12), memory entries, and routing. Without it, "user story" in a memory entry doesn't match "user story" in a contract, and the LLM can't reason across them.

---

## F0.12 — Agent contracts

**Source:** Evolution §3.3 | **Theme:** T1

- [x] Create `.agents/references/agent-contracts.md` (~120 lines)
  - For each agent: 3-5 things they OWN, 2-3 things they explicitly DON'T own
  - Single Markdown table grouped by phase (Discovery / Strategy / Architecture / Development / Quality / Operations)
  - Cross-link to GUARDRAILS.md escalation ladder

### Problem
There is no "owns / does NOT own" boundary table. When a task falls between two agents, the LLM guesses who owns it, leading to overstepping or dropped work.

### Target
Each agent has a clear scope. Use the table to decide who to invoke. If a task falls outside an agent's "owns" column, escalate per the escalation ladder in `GUARDRAILS.md`.

### Proposed content

Create `.agents/references/agent-contracts.md` with the following full content:

```markdown
# Agent Contracts — Owns vs. Does NOT Own

Each agent has a clear scope. Use this table to decide who to invoke. If a task falls outside an agent's "owns" column, escalate per the escalation ladder in `GUARDRAILS.md`.

| Agent | Owns (does this) | Does NOT own (delegate up) |
|---|---|---|
| `@founder` | Strategic concept stress-testing, GO/PIVOT/KILL, scope disputes between PM and tech-lead | Tactical execution, code review, design |
| `@product-manager` | PRD, user stories, kanban, success metrics, scope vs. business disputes | Architecture, code quality, design fidelity |
| `@product-designer` | UX/UI specs, screen states, wireframes, design system tokens, design vs. accessibility disputes | Backend logic, copy writing, market research |
| `@architect` | ADRs, system components, DDL/types, API contracts, tech debt catalog | Business logic, UI implementation, deployment |
| `@tech-lead` | Execution plans, task breakdown, estimation, parallel coordination, spec vs. implementation disputes | Strategic direction, product priorities, design |
| `@developer` | Code implementation, unit tests, bug fixes, refactoring | Architecture, design fidelity, product priorities |
| `@code-reviewer` | PR reviews, false-positive filtering, pattern violations, systemic issue escalation | Implementation, design feedback, security deep audit |
| `@qa-engineer` | Test plans, regression runs, release certification, QA process | Code review, security audit, performance tuning |
| `@researcher` | Market analysis, competitive landscape, technology trends | User research, UX, product strategy |
| `@user-researcher` | User interviews, personas, JTBD analysis | Market research, UX evaluation, product metrics |
| `@ux-researcher` | Usability evaluation, journey mapping, design vs. accessibility disputes | Visual design, code, market research |
| `@data-analyst` | Telemetry instrumentation, dashboards, funnel analysis, experiment results | Product strategy, user research, code |
| `@security-engineer` | Threat models, vulnerability scans, security findings, security vs. timeline disputes | Implementation, performance, product priorities |
| `@performance-engineer` | Latency analysis, optimization, load testing, performance benchmarks | Architecture, code quality, security |
| `@ml-engineer` | Model integration, prompt templates, eval harnesses, model versioning | Data analysis, infrastructure, product |
| `@devops-engineer` | CI/CD, cloud provisioning, monitoring, deployment, infra cost | Application code, security policy, product |
| `@technical-writer` | User manuals, API specs, release notes, documentation site | Code, design, product copy |

## Cross-cutting principles

1. **When in doubt, escalate.** If a task falls between two agents, the lower-numbered one (in the workflow position table) gets first refusal. The other can be consulted but does not own the decision.

2. **The "owns" column is non-negotiable.** An agent that tries to do work outside their column is overstepping. File a CR or escalate to `@founder`.

3. **The "does NOT own" column lists who to delegate TO.** Use the table to find the right agent, not to find reasons to refuse work.

4. **UTTERLY SATISFIED is shared ownership.** Every active agent involved in a handoff reviews its domain, records evidence-backed satisfaction, and fixes or escalates concerns before the handoff advances. `NOT ACTIVATED` requires an explicit out-of-scope reason.
```

### Why this matters
The contracts table is the routing surface for the entire swarm. Without it, the LLM invokes the wrong agent for edge-case tasks, and disputes between agents have no resolution reference. Cross-linked from each agent's `## Conflict Resolution` section.

---

## F0.13-F0.18 — Expand thin skills to ≥ 80 lines

**Source:** Evolution §1.1 | **Theme:** T1, T3

- [x] F0.13 — `grill-me/SKILL.md` (11 → 109 lines): 7+1-branch decision tree, when to use/not use, 5-step workflow (Scope lock → Question loop → Decision log → Cross-branch consistency → Lock + handoff), output artifacts, state machine integration, anti-patterns
- [x] F0.14 — `squad/SKILL.md` (42 → 104 lines): all 7 squads with members, activation/deactivation ceremony, custom squad creation
- [x] F0.15 — `delegate/SKILL.md` (50 → 93 lines): @reader/@writer/@executor/@memory-controller contract per task type, decision tree, IsArtifact safeguard, token economics
- [x] F0.16 — `plan/SKILL.md` (65 → 130 lines): execution plan template, task granularity rules (1-4h), dependency syntax, worktree allocation
- [x] F0.17 — `code-graph/SKILL.md` (59 → 105 lines): when to use, output schema, self-healing wrapper, query patterns
- [x] F0.18 — `memory/SKILL.md` (44 → 109 lines): when to write, the 5 files, format strings ([DOMAIN], [CODE], [PROCESS], [ARCH], [LESSON], [RISK], [DECISION]), compaction triggers

### Problem
`grill-me/SKILL.md` is 11 lines. `squad/SKILL.md` is 42 lines. `delegate/SKILL.md` is 50 lines. `plan/SKILL.md` is 65 lines. `code-graph/SKILL.md` is 59 lines. `memory/SKILL.md` is 44 lines. These skills are positioned as primary user-facing workflows (grill-me, squad) but their content is a fraction of the depth of `validate-idea/SKILL.md` (299 lines) or `develop/SKILL.md` (278 lines). No prerequisites, no structured flow, no state-machine integration, no output contract. A user invoking `/grill-me` gets whatever the LLM decides.

### Target
Expand each thin skill to a minimum 80-line workflow with: when-to-use, prerequisites, step-by-step procedure, integration with state machine, integration with `@memory-controller`, output artifacts.

### Proposed content

#### F0.13 — `grill-me/SKILL.md` (11 → 180+ lines)

Full proposed content (template from Evolution §1.1):

```markdown
---
name: grill-me
description: End-to-end Socratic alignment loop — stress-tests requirements, specifications, and architecture decisions before implementation. Use when user wants to be grilled on a plan, design, or idea.
version: "2.0"
last_updated: 2026-06-23
---

# Grill-Me — Socratic Stress-Test Loop

## What this skill does
[3-5 lines: this skill runs a relentless Socratic interview, branch by branch, until the user can articulate the decision tree in writing]

## When to use
- User says "grill me on this plan/architecture/spec/idea"
- Before `/validate-idea` exits the loop phase
- Before any ADR is written (forces decisions to be explicit)
- After `/design` produces a PRD (sanity check before `/develop`)

## When NOT to use
- For open-ended brainstorming (use `/validate-idea` first)
- For technical debugging (use `/incident` instead)
- For retrospective analysis (use `/retro` instead)

## Prerequisites
- A concrete artifact to interrogate (plan, spec, architecture, hypothesis, design)
- If no artifact exists, run `/validate-idea` first to produce a brief

## The 7-branch decision tree
1. **Product requirements** — who is the user, what job are they hiring this for, how will we know it worked?
2. **Architecture trade-offs** — what did we choose, what did we reject, why is the chosen option reversible (or not)?
3. **Edge cases** — what happens at N=0, N=∞, at the failure mode of every external dependency?
4. **Codebase logic** — where does this touch existing code, what does it assume, what assumptions are still unverified?
5. **Cost & timeline** — what does this cost, what's the rollback plan, what's the off-ramp if it's wrong?
6. **Risks** — what's the worst plausible outcome, what's the second-worst, how do we detect each?
7. **Success criteria** — what does done look like, measured how, by when, for whom?

## Workflow

### Step 1: Scope lock
Ask the user which branch to start at. Default: 1 (Product requirements). Recommend starting at 1 unless the user has already articulated the user/job-to-be-done clearly.

### Step 2: Question loop
For each open question in the active branch:
1. Ask the question, ONE at a time
2. Provide your recommended answer with reasoning
3. Wait for the user's response (recommend / counter / refine)
4. Update the running decision log

**Stop asking questions in a branch when:**
- All open questions are resolved, OR
- The user explicitly says "skip the rest of this branch"

**Move to the next branch when:**
- The current branch is exhausted, OR
- The user says "next branch"

### Step 3: Decision log
After each resolved question, write to `artifacts/memory/active-decisions.md`:
```
### [DECISION] {question-summary} [date: YYYY-MM-DD] [agent: @grill-me-facilitator]
**Question:** {verbatim question}
**Answer:** {user's chosen answer}
**Rejected alternatives:** {list of other options considered}
**Rationale:** {why this answer}
**Status:** active
```

### Step 4: Cross-branch consistency check
After all 7 branches are exhausted, scan the decision log for contradictions:
- Does branch 3 (edge cases) contradict branch 1 (product requirements)?
- Does branch 6 (risks) invalidate branch 2 (architecture trade-offs)?
- Does branch 7 (success criteria) require something branch 5 (cost) didn't budget for?

If contradictions found, present them to the user and ask which branch to revisit.

### Step 5: Lock + handoff
Append a summary block to `artifacts/output/{phase}/grill-me-decisions.md` with:
- Date
- Branches covered
- Number of decisions resolved
- Cross-branch contradictions found
- Handoff recommendation (e.g., "ready for /design" or "needs /validate-idea first")

## Output artifacts
- `artifacts/memory/active-decisions.md` (running decision log)
- `artifacts/output/{current-phase}/grill-me-decisions.md` (final summary)

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At end: `node .agents/scripts/orchestrator_state.js complete --agent grill-me --artifact grill-me-decisions.md`

## Anti-patterns to avoid
- **Do not ask multiple questions at once.** The interview loses its depth if you bundle.
- **Do not recommend the user's first answer uncritically.** "That's interesting — what if the opposite is true?" is more useful than "yes, that works."
- **Do not skip branches because they feel settled.** The user often hasn't articulated the obvious-to-them decision; making it explicit catches conflicts later.
- **Do not let the user ramble into a different branch mid-question.** Gently redirect: "Good point — let's park that and circle back when we hit branch 5."
```

**Acceptance criteria:**
- File is ≥ 180 lines
- All 7 branches enumerated with example questions
- Decision log format matches `active-decisions.md` schema
- State machine integration at start and end
- Anti-patterns section is non-empty

#### F0.14 — `squad/SKILL.md` (42 → 100+ lines)

Currently a routing table. Promote to a real skill that:
- Lists all 7 squads with member agents and squad-specific output expectations
- Documents the activation ceremony (`@squad activate build` → writes to `artifacts/memory/active-squad.md`)
- Documents the deactivation ceremony
- Documents how to add a custom squad

#### F0.15 — `delegate/SKILL.md` (50 → 90+ lines)

Currently a routing table. Promote to a real skill that:
- Documents the `@reader` / `@writer` / `@executor` / `@memory-controller` contract per task type
- Includes decision tree: "If your task is X, delegate to Y because Z"
- Documents the `IsArtifact: false` safeguard in detail
- Documents token economics (per `delegation-pattern.md`)

#### F0.16 — `plan/SKILL.md` (65 → 120+ lines)

Currently a 5-step outline. Add:
- Detailed execution plan template
- Task granularity rules (1-4 hours per task, per `tech-lead` charter)
- Dependency declaration syntax
- Worktree allocation for parallel developers

#### F0.17 — `code-graph/SKILL.md` (59 → 100+ lines)

Currently a thin pointer. Add:
- When to use the graph (cross-file refactors, understanding blast radius)
- Output schema (what's in `code-graph.json`)
- Self-healing wrapper invocation (`ensure_graph.js` with mtime check)
- Read-only query patterns

#### F0.18 — `memory/SKILL.md` (44 → 80+ lines)

Currently explains the search but not the writing. Add:
- When to write to memory (systemic patterns only, not single-instance)
- The 5 files: `project-context.md`, `active-decisions.md`, `lessons-learned.md`, `patterns-and-conventions.md`, `blockers-and-risks.md`
- Format strings for each entry type ([DOMAIN], [CODE], [PROCESS], [ARCH], [LESSON], [RISK], [DECISION])
- Compaction triggers and outcomes

### Why this matters
These 6 skills are the primary user-facing workflows for orchestration, delegation, planning, and memory. At 11-65 lines, they give the LLM no structure to follow — the output is non-deterministic. At 80-180+ lines with explicit workflows, the LLM has a procedure to execute.

---

## F0.19 — Humanize third-party notice

**Source:** Evolution §1.5 | **Theme:** T1

- [x] Adopted `humanize` skill as first-party — stripped source/compatibility fields from frontmatter, kept MIT license. No separate THIRD-PARTY-NOTICE.md needed.

### Problem
`humanize` skill is 565 lines but is third-party-sourced (blader/humanizer) and will go stale with no attribution or update path documented.

### Target
Vendor with attribution. Add a `THIRD-PARTY-NOTICE.md` noting the source and license.

### Proposed content

Create `.agents/skills/humanize/THIRD-PARTY-NOTICE.md` (~20 lines) noting:
- The upstream (blader/humanizer)
- License
- Last-synced date
- A one-line "to update, follow these steps"

### Why this matters
Without attribution and an update path, the third-party skill becomes an orphan. Future maintainers won't know where it came from or how to refresh it.

---

## F0.20-F0.22 — Customization merge (2-file TOML)

**Source:** Adoption §3.3 | **Theme:** T1

- [x] F0.20 — Create `.agents/scripts/merge_customization.js` (~120 lines)
  - Read `<agent>/customize.toml` (defaults, regenerated on update)
  - Read `.agents/custom/<agent>.toml` (override, committed)
  - Merge rules: scalars override-wins, tables deep-merge, arrays of tables with `code`/`id` keyed-merge, other arrays append
  - Zero-dependency TOML parser (stdlib only)
- [x] F0.21 — Create `.agents/custom/README.md` (~60 lines): what the override file is for, merge rules in plain English, worked example (override @developer temperature), "How do I know it worked?" test
- [x] F0.22 — Create `.agents/skills/customize/SKILL.md` (~130 lines): guided authoring flow (describe intent → map to override field → write via @writer → verify via merge_customization.js)

### Problem
Agent customization is done by editing the agent's `.md` file directly. There is no override layer, so a user's tweaks to `@developer` survive until the next `npx vespyr` upgrade, at which point they get overwritten. We have no customization-vs-update story. Either users fork the agent (high friction) or they lose their tweaks on update (low trust).

### Target
Adopt BMAD's 3-file contract, simplified to 2 files (we don't need the per-user private layer because vespyr is committed to the repo).

### Proposed content

**F0.20 — 2-file customization structure:**

```
.agents/agents/developer/customize.toml   # defaults (regenerated on update)
.agents/custom/developer.toml              # team-level override (committed, shared)
```

**Merge rules — adopted verbatim from BMAD, simplified to 2 layers:**

| Type | Rule |
|---|---|
| Scalars | override wins |
| Tables | deep merge |
| Arrays of tables where every item has `code` OR `id` | keyed merge (matching replace, new append) |
| All other arrays | append |

The merge is a single ~80-line script in `.agents/scripts/merge_customization.js`. Stdlib only (`fs`, `path`); we hand-write a minimal TOML parser (or vendor the BMAD Python resolver's logic as JS).

**F0.21 — `.agents/custom/README.md` (~60 lines):** Explains what the override file is for, the merge rules in plain English, a worked example (override @developer temperature), and a "How do I know it worked?" test.

**F0.22 — `.agents/skills/customize/SKILL.md` (~200 lines):** A guided authoring flow — describe intent → map to override field → write via @writer → verify via merge_customization.js.

### Why this matters
1. **Customizations survive updates.** Project-level overrides are in `.agents/custom/`, not in the agent file. The installer regenerates the agent file; the override stays.
2. **Onboarding by example.** New users see `developer.toml` and learn the override surface by reading a real one.
3. **Cross-project portability.** The same agent file is identical across projects. Only the override changes.

We don't adopt BMAD's 3-file + 4-layer because two layers is enough for our commit-based workflow. The personal-override layer (`.user.toml`, gitignored) is only valuable for shared multi-user installs, which are not vespyr's target.

---

## T7 — Vespyr Identity (NEW — promoted from backlog)

**Source:** ROADMAP §T7 (was "Backlog, no timeline") | **Theme:** T7

The original plan spent 138h importing BMAD/Ruflo/ECC patterns and 0h advancing Vespyr's own differentiators. This section fixes that. The 3 moats are explicitly strengthened in Phase 0.

### T7.1 — Worktree delegation enforcement (~60 lines)

**Differentiator:** Permission-denial reasoning/I/O split — the #1 moat.

- [x] Strengthen the delegation enforcement in `delegation-pattern.md`:
  - Add multi-developer worktree delegation rules (when @developer spawns parallel worktrees, each worktree's I/O is isolated)
  - Add `[DIRECT-IO-JUSTIFIED: {reason}]` protocol (originally planned for Phase 2 F2.19 — pulled forward because it's the moat)
  - Add the task→sub-agent mapping table (Read 1-3 small files → direct; Read 4+ files → @reader; Write > 50 lines → @writer; Run bash → @executor)
- [x] Add `## Delegation Contract` block to the 13 reasoning agents (developer, code-reviewer, architect, tech-lead, qa-engineer, product-manager, product-designer, security-engineer, performance-engineer, data-analyst, devops-engineer, ml-engineer, researcher)
  - Each block: "You delegate I/O to sub-agents by default. Direct I/O requires a `[DIRECT-IO-JUSTIFIED: ...]` line."
- [x] Note: The `delegation_audit.js` script and `delegation-log.json` infrastructure stay in Phase 2 (they need hooks). Phase 0 ships the policy + the contract blocks.

### Problem
`.agents/agents/reader.md`, `writer.md`, `executor.md`, `memory-controller.md` are positioned as "narrow, high-performance sub-agents" for I/O delegation. The reasoning agents (`developer.md:37-38`, `code-reviewer.md:31-33`, `architect.md:35-47`) all have delegation language — *"Delegate writing files to `@writer`"*, *"Use `@executor` for running tests"*, *"Send ADRs to `@writer` with exact path"*. But this is policy text, not enforcement. The LLM does whatever is easier, and direct I/O is easier.

Consequence:
- **Context bloat** — read outputs land in the main thread, not a sub-agent context
- **No batching** — 5 file reads happen serially in the main thread, not as one `@reader` call
- **No token economics** — the entire rationale for the sub-agent pattern (delegation-pattern.md) is bypassed
- **Inconsistent formatting** — every reasoning agent formats its own diffs/output

### Target
Make sub-agent delegation the default path for high-volume I/O, with a single-line justification for any reasoning agent that does I/O directly. Add a `delegation_log` that proves it.

### Proposed content

Create `.agents/references/delegation-policy.md` (new, ~90 lines) with the following full content:

```markdown
# Delegation Policy — When to Use Sub-Agents

**Rule:** Reasoning agents (developer, code-reviewer, architect, qa-engineer, etc.) delegate I/O to sub-agents by default. Direct I/O requires a `[DIRECT-IO-JUSTIFIED: ...]` line in the response.

## Task → Sub-agent mapping

| Task type | Delegate to | Why |
|---|---|---|
| Read 1-3 small files (< 500 lines total) | direct | overhead exceeds benefit |
| Read 1+ large file OR 4+ files | `@reader` | keeps main context lean |
| Search codebase (grep/glob) | `@reader` | fast regex, condensed output |
| Write a single file < 50 lines | direct | overhead exceeds benefit |
| Write 1+ file OR > 50 lines | `@writer` | atomic write, consistent format |
| Refactor across N files | `@writer` (batch mode) | one transaction, N outputs |
| Run any bash command | `@executor` | parses output, returns summary |
| Read/write memory files | `@memory-controller` | validates schema, enforces format |
| Read/write skill/agent files | `@writer` | versioned, reviewable diff |

## Override protocol

If you must do I/O directly (outside the table above), emit one line:

```
[DIRECT-IO-JUSTIFIED: {task} because {reason}]
```

Allowed for tiny, low-risk operations. The justification is logged to `state/delegation-log.json` for audit.

## Anti-patterns
- **Reading 5 files then summarizing inline** — that's `@reader`'s job
- **Running `npm test` and pasting output** — that's `@executor`'s job
- **Writing 3 related files in 3 separate edit calls** — batch into one `@writer` call
- **Direct memory writes without `@memory-controller`** — bypasses schema validation
```

**Delegation Contract block** — add to each of the 13 reasoning agents (`developer.md`, `code-reviewer.md`, `architect.md`, `tech-lead.md`, `qa-engineer.md`, `product-manager.md`, `product-designer.md`, `security-engineer.md`, `performance-engineer.md`, `data-analyst.md`, `devops-engineer.md`, `ml-engineer.md`, `researcher.md`) as the first section after frontmatter:

```markdown
## Delegation Contract

**You delegate I/O to sub-agents by default.** See `.agents/references/delegation-policy.md` for the task→agent mapping. Direct I/O requires a `[DIRECT-IO-JUSTIFIED: ...]` line in your response.

Common patterns (don't think, just follow):
- Reading code or docs → `@reader`
- Writing files → `@writer`
- Running shell → `@executor`
- Memory updates → `@memory-controller`

Your output is graded on how often you delegated. The user runs `delegation_audit.js` weekly.
```

### Why this matters
The delegation policy is the #1 moat — permission-denial reasoning/I/O split. Without enforcement, the LLM bypasses sub-agents because direct I/O is easier, defeating the entire token-economics rationale. The policy + contract blocks make delegation the default path. The audit infrastructure (delegation_audit.js, delegation-log.json) stays in Phase 2 because it needs hooks; Phase 0 ships the policy + the contract blocks.

### T7.1b — Worktree isolation tooling (~100 lines)

**Differentiator:** Permission-denial reasoning/I/O split — parallel agents must not collide.

T7.1 ships the *policy* (delegation rules for worktrees). This ships the *tooling*. Without it, parallel agents share one checkout and collide. This is the foundation for Phase 6 (Loop Engineering) — a loop that spawns parallel agents needs isolation.

- [x] Create `.agents/scripts/worktree.js` (~100 lines): `create <branch>`, `list`, `clean <branch>`, `clean-all`. Uses `git worktree add` into `.agents/worktrees/<branch>/`. Each worktree is a separate checkout on its own branch sharing repo history. `clean` removes the worktree and deletes the branch. Tracks active worktrees in `.agents/state/loop-state.json`.
- [x] Update `@developer`: when spawning parallel tasks, each task gets its own worktree via `worktree.js create`
- [x] Add `.agents/worktrees/` to `.gitignore`
- [x] Add `npm run worktree:create <branch>` and `npm run worktree:clean <branch>` to `package.json`

### Problem
When @developer spawns parallel worktrees today, each worktree's I/O is NOT isolated — they share one checkout and collide. This makes parallel agent execution unsafe.

### Target
A `worktree.js` script that creates, lists, and cleans isolated git worktrees, so parallel agents don't collide.

### Why this matters
This is the foundation for Phase 6 (Loop Engineering). A loop that spawns parallel agents needs isolation. Without it, parallel agents overwrite each other's files. T7.1 ships the policy; T7.1b ships the tooling that makes the policy enforceable.

### T7.2 — Cross-session memory pattern auto-loading (~80 lines)

**Differentiator:** 3-tier progressive memory.

- [x] Update `memory-controller.md` loading protocol:
  - Add a "pattern pre-fetch" step that scans `patterns-and-conventions.md` for entries tagged with the current phase + agent before loading full context
- [x] Update `memory_filter.js` to support a `--prefetch-patterns` flag that returns matching patterns first

### Problem
The memory-controller loads context in a fixed tier order, but doesn't proactively surface patterns relevant to the current phase + agent. Relevant patterns are buried in Tier 2, loaded after Tier 1, even when they're the most useful context for the task at hand.

### Target
A "pattern pre-fetch" step that scans `patterns-and-conventions.md` for entries tagged with the current phase + agent before loading full context. Relevant patterns get promoted to the front of the context window.

### Why this matters
This is a lighter version of the self-learning instinct loading (Phase 2). It doesn't auto-promote patterns to instincts — it just surfaces relevant ones proactively. This strengthens the 3-tier progressive memory moat by making Tier 2 patterns actionable in real-time, not just at retro time.

### T7.3 — Socratic universal minimum bar (~40 lines)

**Differentiator:** Socratic methodology depth.

- [x] Add a "Socratic minimum bar" to `validate_frontmatter.js`:
  - Every reasoning agent (13 agents, not I/O sub-agents) must have a `## Socratic Stance` section in its body
  - The section declares: (a) what this agent challenges, (b) what "change my mind" looks like, (c) when to escalate vs. when to accept
  - Validator checks for the section header; warns (doesn't fail) if missing
- [x] Added Socratic Stance to all 13 reasoning agents
- [x] Cross-link from `grill-me/SKILL.md` (the 7-branch decision tree is the universal Socratic procedure; each agent's stance is the domain-specific voice)

### Problem
Vespyr's Socratic depth is concentrated in `grill-me/SKILL.md` (the 7-branch decision tree), but individual reasoning agents don't declare their own Socratic stance. The depth is procedural, not persona-level.

### Target
Every reasoning agent (13 agents) has a `## Socratic Stance` section declaring: (a) what this agent challenges, (b) what "change my mind" looks like, (c) when to escalate vs. when to accept.

### Why this matters
The 7-branch decision tree in `grill-me/SKILL.md` is the universal Socratic procedure; each agent's stance is the domain-specific voice. Together, they make Socratic depth a system-wide property, not a single skill. This strengthens the Socratic methodology depth moat.

### T7.4 — Vespyr identity docs

- [x] Add a "## Vespyr Identity" section to `AGENTS.md` (canonical) and `README.md`:
  - State the 3 differentiators explicitly: (1) Permission-denial reasoning/I/O split, (2) Socratic methodology depth, (3) 3-tier progressive memory
  - For each: what it is, why it matters, what other frameworks do instead, why Vespyr's approach is better
- [x] Add concise version to `QUICK-REFERENCE.md`

### Problem
Vespyr's 3 differentiators are implicit in the codebase but never stated explicitly in the docs. A new user (or a comparison reviewer) can't see why Vespyr exists alongside BMAD/ECC/Ruflo without reading 20 files.

### Target
A "## Vespyr Identity" section in `AGENTS.md`, `README.md`, and `QUICK-REFERENCE.md` stating the 3 differentiators explicitly.

### Why this matters
This section is the "elevator pitch" for why Vespyr exists. It states: (1) Permission-denial reasoning/I/O split, (2) Socratic methodology depth, (3) 3-tier progressive memory — and for each, what it is, why it matters, what other frameworks do instead, and why Vespyr's approach is better.

---

## F0.29 — Citation & Footnote Protocol (cross-cutting)

**Source:** User request — information integrity for all reasoning agents + skills | **Theme:** T1, T3

### Problem

The existing "Honesty & Fact-Checking" guideline in the Core Behavioral Guidelines (`agent.md.canonical` §1, Think Before Acting) says: "When using information retrieved from the internet, provide clear citations and footnotes so the user can easily confirm and fact-check the source." This is:

1. **Scoped only to internet-retrieved info** — not books, papers, code, interviews, data, benchmarks, or framework attributions.
2. **A general guideline, not enforced per-agent** — no reasoning agent has a citation protocol section; the guideline lives only in the canonical contract.
3. **Not machine-checked** — `validate_frontmatter.js` does not verify the presence of a citation protocol.
4. **Not integrated into skill step files** — step output contracts don't require citations, so artifacts ship with factual claims that have no traceable sources.

Consequence: agents produce artifacts (research reports, ADRs, PRDs, launch copy, retro digests) with factual claims, statistics, quotes, and data points that users cannot validate. This violates the "Honesty & Fact-Checking" guideline's intent and undermines artifact credibility — especially for `@researcher`, `@user-researcher`, `@data-analyst`, and `@architect` outputs that are evidence-dependent.

### Target

Five changes, all foundational:
1. **Expand the canonical guideline** from internet-only to all real sources.
2. **Add `## Citation Protocol` to all 17 reasoning agents** (not the 4 I/O sub-agents — they transcribe, not claim).
3. **Create `.agents/references/citation-format.md`** — the canonical citation format spec.
4. **Add `citations:` to skill step-file output contracts** — step files declare whether their output requires citations.
5. **Extend `validate_frontmatter.js`** to warn on missing Citation Protocol sections.

### Proposed content

#### F0.29.a — Expand the "Honesty & Fact-Checking" guideline

Update the guideline in `agent.md.canonical` §1 (Think Before Acting → Honesty & Fact-Checking) from:

> When using information retrieved from the internet, provide clear citations and footnotes so the user can easily confirm and fact-check the source.

To:

> When using information from any real source (web, books, papers, code, interviews, data, benchmarks, frameworks), provide inline citations `[N]` with footnotes so the user can validate. See `.agents/references/citation-format.md` for the format. If you cannot find the source, say "Source: unverified" — never fabricate a citation.

#### F0.29.b — Citation Protocol section in all 17 reasoning agents

Add a `## Citation Protocol` section to each of the 17 reasoning agents (founder, product-manager, product-designer, architect, tech-lead, developer, code-reviewer, qa-engineer, researcher, user-researcher, ux-researcher, data-analyst, security-engineer, performance-engineer, ml-engineer, devops-engineer, technical-writer). NOT the 4 I/O sub-agents (reader, writer, executor, memory-controller) — they transcribe/summarize/execute, they don't produce original factual claims.

The shared section (~20 lines, identical across all 17):

```markdown
## Citation Protocol

When your output includes facts, quotes, statistics, data, or claims from a real source, you MUST cite the source inline and provide a footnote.

**Inline format:** `[N]` — bracketed number linking to the footnote at the end of the artifact.

**Footnote format:**
[^N]: Author/Org, "Title," Source, Date. URL (if applicable). Accessed: YYYY-MM-DD.

**What requires a citation:**
- Direct quotes (verbatim text from a source)
- Paraphrased claims from a specific source
- Statistics, numbers, benchmarks, survey results
- Frameworks, methodologies, or models attributed to a person/org
- Code patterns or algorithms from external sources

**What does NOT require a citation:**
- Your own analysis or reasoning (original thought)
- General knowledge not attributable to a specific source
- Internal project artifacts (cite by file path, not footnote)
- Spec-kernel content (already has CAP-IDs for traceability)

**If you cannot find the source:** say "Source: unverified" and flag it for the user. Never fabricate a citation.

See `.agents/references/citation-format.md` for the full format spec.
```

**Agent-specific citation emphasis** (1-2 lines appended after the shared block):

| Agent | Citation emphasis |
|---|---|
| `@researcher` | Every market statistic, competitor data point, and trend claim gets a footnote |
| `@user-researcher` | Every interview quote gets a participant ID + date; survey results get source + sample size |
| `@data-analyst` | Every metric, funnel number, and experiment result gets a telemetry source + date range |
| `@architect` | Every trade-off claim references the ADR or external paper that informs it |
| `@ml-engineer` | Every model benchmark references the paper, model card, or eval harness |
| `@security-engineer` | Every vulnerability reference gets a CVE ID or OWASP reference |
| `@performance-engineer` | Every latency benchmark references the measurement method + hardware |
| `@technical-writer` | Every API claim references the source file:line or spec section |
| `@founder` | Every market-sizing or competitive claim in the GO/PIVOT/KILL gets a source |
| `@product-manager` | Every user need, JTBD claim, and market reference in the PRD gets a source |
| `@product-designer` | Every design principle reference (Norman, Nielsen, etc.) gets a source |
| `@tech-lead` | Every estimation benchmark or pattern reference gets a source |
| `@developer` | Every code pattern, library usage, or API reference gets a source link |
| `@code-reviewer` | Every pattern violation reference gets a source (style guide, lint rule, etc.) |
| `@qa-engineer` | Every test standard or compliance reference gets a source |
| `@ux-researcher` | Every usability heuristic reference (Nielsen, WCAG, etc.) gets a source |
| `@devops-engineer` | Every infrastructure best-practice or cloud reference gets a source |

#### F0.29.c — Citation format reference

Create `.agents/references/citation-format.md` (~60 lines) with:
- Inline citation format: `[N]` bracketed number
- Footnote format per source type:

| Source type | Format |
|---|---|
| Web page | Author/Org, "Title," URL, Date published. Accessed: YYYY-MM-DD. |
| Book | Author, *Title*, Publisher, Year, page(s). |
| Paper | Author(s), "Title," Journal/Conference, Year. DOI/URL. |
| Code/library | Library name, version, URL. File:line if specific. |
| Interview | Participant ID (anonymized), "Quote," interview date. |
| Data/telemetry | Source system, metric name, date range, filter. |
| Benchmark | Tool name, version, hardware spec, date, methodology. |

- The "Source: unverified" protocol (what to do when you can't find the source)
- Edge cases: citing a citation (use "as cited in"), multi-source claims (one footnote per source), conflicting sources (cite both + note the conflict)
- 1 worked example per source type

#### F0.29.d — Skill step-file integration

Add an `output_contract.citations` field to the step-file frontmatter template (the template from F1.24.a/F1.24.b.2 in Phase 1):

```yaml
output_contract:
  citations: "required"  # or "not-required" for pure-reasoning steps
```

- **`required`** — the step's output artifact contains factual claims from real sources; inline `[N]` citations + footnotes are mandatory.
- **`not-required`** — the step is pure reasoning (e.g., Socratic stress-test, brainstorming) with no external-source claims.

Step files created in Phase 1 (F1.1-F1.14) and Phase 5 (T1.15-T1.28b) declare this field. The CI check from F1.24.a/F1.24.b.3 verifies the field is present.

#### F0.29.e — Validator extension

Extend `validate_frontmatter.js`:
- Warn (not fail) if a reasoning agent (17 agents) is missing `## Citation Protocol` section — same pattern as the Socratic Stance check (T7.3).
- Warn (not fail) if a step file in `.agents/skills/**/step*.md` is missing `citations:` in its output contract frontmatter.

### Why this matters

1. **Information integrity.** Every factual claim in every artifact is traceable to a source. The user can validate by checking the footnote — one click, not a re-search.
2. **Ease of validation.** Footnotes give the user a single place to check every claim. This is the "Honesty & Fact-Checking" guideline made enforceable.
3. **Anti-hallucination.** "Source: unverified" catches hallucinated citations. An agent that fabricates a source will produce a footnote the user can't verify — and the unverified protocol makes this visible.
4. **@artifact-judge integration.** The Accuracy/Factuality axis (Phase 5, T1.14b `@artifact-judge`) checks "every claim traceable to a source." The Citation Protocol makes this checkable — without citations, the judge can't verify accuracy, and the score is 1 (hard floor → REJECT).
5. **Cross-harness portability.** Citations are plain Markdown footnotes (`[^N]:`) — they render in any Markdown viewer, any harness. No tooling dependency.

### Why we don't make this a hard gate (fail, not warn)

The Socratic Stance validator (T7.3) warns, not fails — because it's a behavioral guideline, not a structural requirement. The Citation Protocol follows the same pattern. A hard gate would block agent loading if the section is missing, which is too aggressive for a guideline. The warn level surfaces the issue without blocking. The `@artifact-judge` (Phase 5, T1.14b) is the hard gate — it rejects artifacts with uncited claims. The pipeline is: warn at agent-load time, reject at artifact-grade time.

### Why we don't scope this to I/O sub-agents

The 4 I/O sub-agents (reader, writer, executor, memory-controller) transcribe, summarize, and execute — they don't produce original factual claims. The reasoning agent that delegated the I/O owns the claim and the citation. Adding a Citation Protocol to sub-agents would blur the I/O/reasoning split (Vespyr's #1 differentiator) by implying sub-agents have agency over content.

### Checklist

- [x] F0.29.a — Expand "Honesty & Fact-Checking" guideline in `agent.md.canonical` to cover all real sources (not just internet); link to `citation-format.md`; add the "Source: unverified" protocol
- [x] F0.29.b — Add `## Citation Protocol` section to all 17 reasoning agents:
  - [x] Core Swarm: founder, product-manager, product-designer, architect, tech-lead, developer, code-reviewer, qa-engineer (8)
  - [x] Domain Experts: researcher, user-researcher, ux-researcher, data-analyst, security-engineer, performance-engineer, ml-engineer, devops-engineer, technical-writer (9)
  - [x] Add agent-specific citation emphasis (1-2 lines per agent from the table above)
- [x] F0.29.c — Create `.agents/references/citation-format.md` (~110 lines): inline format, footnote format per source type (web/book/paper/code/interview/data/benchmark), "Source: unverified" protocol, edge cases, 1 worked example per type
- [x] F0.29.e — Extend `validate_frontmatter.js`: warn if a reasoning agent (17) is missing `## Citation Protocol` section
- [x] Add "Citation Protocol" to the glossary (F0.11): "the contract by which reasoning agents cite real sources inline with footnotes"
- [x] Add "citation" and "footnote" to the glossary as locked terms

---

## Deferred to v2.3+

The following items were removed from Phase 0 and deferred:

| Item | Original plan | Deferred to |
|---|---|---|
| F0.23 — v1.7.x migration path | Phase 0 (v2.0) | **v2.3+** — not needed until first upgrade path exists |
| F0.24 — Glossary compliance audit | Phase 0 (v2.0) | **v2.3+** — manual audit when agents get deep rewrite in Phase 5 |
| F0.25-F0.28 — Critic infrastructure | Phase 0 (v2.0) | **v2.3+** — speculative engineering; no critic personas until v2.2 |

See `development-plan/README.md` §Deferred items and `development-plan/06-phase-5-deeper-bench.md` for the full critic consortium plan.

---

## Done when

- [x] `npx vespyr init` produces a working install with the new frontmatter schema
- [x] `node .agents/scripts/validate_frontmatter.js` exits 0 on all 21 agents
- [~] `node bin/cli.js phase` reads from `phase-table.md` (not hardcoded) — **SKIPPED: no phase CLI command exists**
- [x] The 6 thin skills (grill-me, squad, delegate, plan, code-graph, memory) are all ≥ 80 lines
- [x] `AGENTS.md`, `agent.md`, `CLAUDE.md` are generated from canonical, not hand-maintained duplicates
- [x] Customization test: editing `.agents/custom/developer.toml` to override `temperature` actually overrides it (verified via merge_customization.js)
- [x] `glossary.md` and `agent-contracts.md` exist and are linked from `AGENTS.md`
- [x] All 21 agents have: v2 frontmatter, channeled mentor, IDENTITY block, icon-prefix instruction; 13 reasoning agents have Socratic Stance section
- [x] **T7:** `delegation-pattern.md` cross-linked to `delegation-policy.md` (worktree rules + `[DIRECT-IO-JUSTIFIED]` protocol); 13 reasoning agents have Delegation Contract blocks
- [x] **T7.1b:** `worktree.js create/list/clean` works; `.agents/worktrees/` gitignored; npm scripts added
- [x] **T7:** `memory-controller.md` has the pattern pre-fetch step; `memory_filter.js` supports `--prefetch-patterns`
- [x] **T7:** `validate_frontmatter.js` checks for `## Socratic Stance` section on reasoning agents (warn, not fail)
- [x] **T7:** `AGENTS.md` and `README.md` have the "Vespyr Identity" section stating the 3 differentiators
- [x] **See the Unseen:** IDENTITY block includes the "See the Unseen" section as non-negotiable DNA for all agents; validator enforces it
- [x] **F0.29:** All 17 reasoning agents have `## Citation Protocol` section; `citation-format.md` exists; `validate_frontmatter.js` warns on missing protocol; `citations:` in step-file output contract deferred to Phase 1 (F1.24.a)
- [x] **T8:** UTTERLY SATISFIED protocol, 19 persona contracts, global guardrail, workflow handoff rule, and launch team matrix are present; runtime validator deferred to Phase 2

## Risks

- **Frontmatter migration is repetitive** (21 files). Use a script, not 21 hand-edits.
- **IDENTITY block boundaries** can drift if not enforced at install time. Validator must reject agents without it.
- **Channeled mentor overload**: hard rule = 1-2 references per agent. Reject 3+.
- **Glossary becomes a bikeshed magnet**: lock it at end of phase; future changes require explicit review.
- **T7.1 delegation contract blocks** add boilerplate to 13 agents. Keep each block ≤ 8 lines. The policy lives in `delegation-pattern.md`, not in each agent.
- **T8 becomes performative if it is prompt-only.** Keep the Phase 0 contract concise, then add machine validation, state telemetry, and release blocking in Phases 2-3.

### Rollback plan

If Phase 0 breaks:
- **Frontmatter migration:** `git checkout -- .agents/agents/` reverts all agent files.
- **Entry-point syncing:** `sync-entry-points.js` can regenerate all entry points from `agent.md.canonical`. If files become stale, delete them and re-run.
- **Customization TOML:** if merge script produces wrong output, delete `.agents/custom/*.toml` — agents fall back to defaults.

## Handoff to Phase 1

Once Phase 0 is done, every new file in Phase 1+ can assume:
- Frontmatter is v2.
- Agents are locked behind an IDENTITY block.
- Customization works via `.agents/custom/<agent>.toml`.
- Entry points are symlinks (one source).
- Phase table is canonical.
- Glossary and contracts are the single source of terminology.
- Delegation is policy-enforced (audit + harness-level hooks come in Phase 2).
- Memory pre-fetches relevant patterns.
- Every reasoning agent has a Socratic stance.
- Every reasoning agent has a Citation Protocol (facts from real sources get inline `[N]` citations + footnotes).
- AGENTS.md states the 3 differentiators explicitly.
- Every participating agent inherits the UTTERLY SATISFIED contract; future runtime enforcement is explicitly owned by Phase 2.
