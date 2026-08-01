# Phase 4 — Modularity + Handoff

> **Release:** v2.1
> **Calendar:** Weeks 7-8
> **Themes:** T6 (Modularity), T8 (UTTERLY SATISFIED culture)
> **Goal:** Core stays lean. Domain extras ship as install-modules. Language-specific rules layer. Builder skills let users create new agents/skills/workflows. Example project ships. Docs are rewritten. After this phase, Vespyr is "modular" without allowing modularity to weaken the UTTERLY SATISFIED release gate.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| 35-harness future table | ROADMAP.md (35 rows) | **Deleted** | Performative. Solo maintainer cannot port to 35 harnesses. |

## F4.1-F4.3 — install-modules (selective install)

**Source:** Evolution §3.1 | **Theme:** T6

**Problem:** The `game-studio` squad, the `ml-engineer` agent, and the `validate-game-idea` skill are not core to most users. Today they ship anyway. Users can't opt out.

**Target:** 7 installable modules with explicit dependencies. `core` is always required.

**Full install-modules.json structure:**

```json
{
  "version": "1.0",
  "modules": {
    "core": {
      "description": "Core orchestration: founder, PM, tech-lead, developer, code-reviewer, QA",
      "agents": ["founder", "product-manager", "tech-lead", "developer", "code-reviewer", "qa-engineer"],
      "skills": ["validate-idea", "design", "develop", "launch", "iterate", "retro"],
      "required": true
    },
    "research": {
      "description": "Research agents: market, user, UX researchers",
      "agents": ["researcher", "user-researcher"],
      "skills": ["explore-idea"]
    },
    "design": {
      "description": "Design agents and UX skills",
      "agents": ["product-designer", "ux-researcher"],
      "skills": ["design", "humanize"]
    },
    "architecture": {
      "description": "Architecture + specialist technical agents",
      "agents": ["architect", "security-engineer", "performance-engineer", "ml-engineer", "data-analyst", "devops-engineer"],
      "skills": ["incident"]
    },
    "game": {
      "description": "Game development overlay",
      "agents": [],
      "skills": ["validate-game-idea", "explore-game-idea"]
    },
    "memory": {
      "description": "Memory controller + memory skills",
      "agents": ["memory-controller"],
      "skills": ["memory", "retro"]
    },
    "orchestration": {
      "description": "Cross-cutting skills: grill, plan, review, test, kanban, status, phase, squad, delegate, code-graph, doc-graph, help-me",
      "agents": [],
      "skills": ["grill-me", "plan", "review", "test", "kanban", "status", "phase", "squad", "delegate", "code-graph", "doc-graph", "help-me", "round-table", "elicitation"]
    }
  },
  "default": ["core", "research", "design", "architecture", "memory", "orchestration"]
}
```

The `core` module always includes the T8 protocol, release templates, and
validator contract. A module may add domain reviewers, but it cannot remove or
override the core satisfaction states, escalation rules, or launch gate. The
manifest validator must reject a module that declares a conflicting state
vocabulary or a release path without a satisfaction check.

- [ ] F4.1 — Create `.agents/manifests/install-modules.json` (~180 lines, structure above)
- [ ] F4.2 — Create `.agents/scripts/install-modules.js` (~100 lines): `list`, `install <module-list>`, `remove <module-list>`, `--dry-run`. Reads manifest, resolves dependency closure, copies files, writes `install-state.json` for safe uninstall.
- [ ] F4.3 — Add `install-modules` subcommand to `bin/cli.js`: `npx vespyr install-modules core,design`, `--list`, `--remove`, `--dry-run`

## F4.4-F4.5 — Language-specific rules (CSS-like specificity)

**Source:** Adoption §4.1, ECC pattern | **Theme:** T6

**Problem:** Vespyr agents write code in 1-2 languages per project. With language-specific rules, `@developer` automatically follows that language's idioms (Python prefers pytest, Go prefers table tests, TypeScript prefers Vitest).

**Full rules/ directory structure:**

```
.agents/rules/
├── common/
│   ├── coding-style.md       # universal style (naming, file size, function size)
│   ├── testing.md            # universal testing rules (test the right layer)
│   ├── git-workflow.md       # branches, commits, worktrees
│   ├── performance.md        # universal perf rules
│   ├── patterns.md           # common patterns
│   ├── hooks.md              # how to use vespyr hooks
│   ├── agents.md             # how to use vespyr agents
│   └── security.md           # universal security baseline
├── typescript/
│   ├── coding-style.md       # TS-specific: interfaces over types, const assertions
│   ├── testing.md            # Vitest patterns
│   ├── git-workflow.md       # TS-specific: build before commit
│   ├── performance.md        # TS perf: avoid any, use satisfies
│   └── patterns.md           # TS patterns: discriminated unions, branded types
├── python/
│   ├── coding-style.md       # Pythonic style, type hints
│   ├── testing.md            # pytest patterns
│   ├── git-workflow.md       # Python-specific: venv, requirements.txt
│   ├── performance.md        # Python perf: generators, asyncio
│   └── patterns.md           # Python patterns: dataclasses, protocols
├── go/
│   ├── coding-style.md       # Go idioms: gofmt, error handling
│   ├── testing.md            # Table-driven tests
│   ├── git-workflow.md       # Go-specific: go mod, go build
│   ├── performance.md        # Go perf: goroutines, channels
│   └── patterns.md           # Go patterns: interfaces, context
└── rust/                     # lighter coverage as placeholder
    ├── coding-style.md
    └── testing.md
```

**Merge priority:** language > common. A `rules/python/testing.md` overrides `rules/common/testing.md` for Python projects. Most-specific (deepest) wins.

- [ ] F4.4 — Create `.agents/rules/common/` with 8 baseline rule files (~50 lines each, structure above)
- [ ] F4.5 — Create `.agents/rules/<lang>/` for 4 languages (structure above)
- [ ] Create `.agents/rules/README.md`: document merge order and specificity rule

## F4.6-F4.8 — Builder skills (eat your own dog food)

**Source:** Adoption §4.3, BMAD pattern | **Theme:** T6

**Problem:** Adding a new skill means hand-editing 4 files. A guided builder makes the cost of adding a domain-specific skill ~5 minutes.

**Agent-builder 5-step guided flow:**

```
Step 1: Define the role (one sentence)
Step 2: Pick the channeled mentor (1-2 references)
Step 3: Pick the icon
Step 4: Set the permissions (read + question for thinkers; bash + edit for doers)
Step 5: Write the charter (when to invoke, when NOT, output artifacts)
```
Output: one new agent file via `@writer`, validated by `validate_frontmatter.js`.

**Skill-builder 4-step guided flow:**

```
Step 1: Define the workflow goal
Step 2: Identify the steps (max 10)
Step 3: Pick the mode (single, tri-modal, or chained)
Step 4: Write the SKILL.md bootloader
```
Uses `@writer` for folder scaffolding. Output: folder + SKILL.md + steps/ + customize.toml.

**Workflow-builder 6-step guided flow:**

```
Step 1: Define the trigger
Step 2: Pick the agents
Step 3: Define the order
Step 4: Define the gates
Step 5: Pick the output format
Step 6: Pick the squad(s) that own the workflow
```
Output: a workflow file consumed by `bin/cli.js workflow`.

Every builder also emits the T8 extension contract:

- New agents declare collaborators, domain evidence, blockers, and escalation.
- New skills declare the handoff state and revalidation trigger.
- New workflows declare the active release participants and the hard gate.
- Generated output references `14-utter-satisfaction-dna.md` and passes the
  satisfaction validator before it is considered complete.

- [ ] F4.6 — Create `.agents/skills/agent-builder/SKILL.md` (~220 lines, 5-step flow above)
- [ ] F4.7 — Create `.agents/skills/skill-builder/SKILL.md` (~220 lines, 4-step flow above)
- [ ] F4.8 — Create `.agents/skills/workflow-builder/SKILL.md` (~240 lines, 6-step flow above)

## F4.9-F4.10 — Example project (worked example)

**Source:** Evolution §1.6 | **Theme:** T6

**Problem:** The README claims "tested with real projects," but the only artifacts are meta-plans about Vespyr itself. A new user has no example to learn from.

**Full example project file list:**

```
example-project/
├── 00-discovery/idea-brief.md       (~80 lines, sample)
├── 01-research/market-analysis.md   (~60 lines, sample)
├── 02-strategy/prd.md               (~120 lines, sample — uses spec-kernel)
├── 02-strategy/companions/
│   ├── glossary.md                   (~30 lines)
│   ├── acceptance-criteria.md        (~30 lines)
│   ├── user-journey.md               (~30 lines)
│   └── decision-log.md               (~30 lines)
├── 03-architecture/adr-001.md       (~40 lines, sample)
├── 04-planning/execution-plan.md    (~50 lines, sample)
├── 05-execution/code-sample.ts      (~30 lines, real working code)
├── 06-quality/qa-report.md          (~40 lines, sample)
├── 07-infrastructure/launch-log.md  (~30 lines, sample)
├── 08-documentation/iteration-backlog.md (~20 lines, sample)
└── 09-retro/action-items.md         (~30 lines, sample)
```

The example is a deliberately trivial project ("a CLI todo list") — the point is to show the **shape** of artifacts, not to solve a real problem. Each file has realistic-looking (not lorem-ipsum) content. Cross-references work (PRD cites the brief, execution plan cites the PRD, etc.).

- [ ] F4.9 — Create `.agents/templates/example-project/` with all 10 phase folders populated (structure above)
- [ ] F4.10 — Add `init --example` to `bin/cli.js`: copies example project to `artifacts/output/`, updates `project-context.md`, sets `squad: full-team`. Should complete in < 30 seconds.

## F4.11 — Rewrite README.md

- [ ] New sections: "What is Vespyr" (1 paragraph), "The 7 themes" (T1-T7, one line each), "The phases of v2.0" (link to this folder), "Squads" (table of 7→10), "Install" (`npx vespyr`, `--modules`, `mcp start`), "Hooks" (10 IDs, env-var disable), "MCP tools" (10 tools), "Scripts" (new scripts), "Customization" (2-file TOML), "Vespyr Identity" (3 differentiators — from Phase 0 T7.4), "Roadmap" (link to this folder)

## F4.12 — Rewrite AGENTS.md (canonical)

- [ ] Surface new contracts: frontmatter v2 schema, IDENTITY block, customization contract, hook graph (10 IDs), MCP tools, self-learning pipeline, spec-kernel + companions, 7 themes summary, Vespyr Identity section (3 differentiators)

## F4.13 — Update QUICK-REFERENCE.md

- [ ] Add new commands: `mcp start`/`list-tools`/`test`, `install-modules`, `witness check`/`sign`, `graph_query` (9 sub-commands), `self_learn scan`/`promote-pattern`/`promote-instinct`, `delegation_audit`, `qa_check`, `goal`/`automation` (Phase 6)

## F4.14 — Update ROADMAP.md

- [ ] Mark v1.x work as shipped
- [ ] Mark v2.0 as "this plan" with link to development-plan/ folder
- [ ] Add v3.0 backlog: multi-agent parallelism via git worktrees, MCP server-as-tool, agent marketplace, VS Code extension, Vespyr Cloud, multi-locale docs, language-specific reviewer agents, WDS persona handoff, critic consortium (v2.3+)
- [ ] **Delete the 35-harness future table.** Replace with: "Additional harnesses added as community demand warrants. See `07-harness-integration.md` for OpenClaw (v2.1+, can enforce permissions) and Hermes (v2.1+, degraded mode)."

## F4.15 — Add CHANGELOG.md v2.0 entry

- [ ] Summarize the 8 v2.0 DoD criteria
- [ ] List new and modified files per release
- [ ] Reference this development-plan/ folder

## F4.16 — Dogfood validation project

**Problem:** The plan builds infrastructure for building things but never validates it by building something real. The example project (F4.9-F4.10) is a CLI todo list — it doesn't stress-test 43 personas, 42 skills, hooks, MCP, self-learning, graph, and loop engineering together. Integration bugs are discovered by real users, not by the maintainer.

**Target:** A non-trivial dogfood project that exercises the full v2.0+v2.1 pipeline from `/validate-idea` through `/iterate`. The project must:

1. Start with `/validate-idea` → produce a GO/PIVOT/KILL brief
2. Run `/explore-idea` → market + user research
3. Run `/design` → spec-kernel PRD + user stories + design.md
4. Run `/plan` → execution plan with task breakdown
5. Run `/develop` → full 10-step cycle with QA hard gate, graph queries, delegation audit
6. Run `/launch` → readiness check + deploy
7. Run `/iterate` → analytics + iteration backlog
8. Exercise at least 3 different squads (startup, build, ship)
9. Trigger self-learning (produce episodes, promote at least 1 pattern)
10. Run at least 1 `/goal` loop and 1 automation
11. Complete one release with the UTTERLY SATISFIED team matrix: at least one
    feedback loop, one escalation, one revalidation, and an all-satisfied GO.

**Suggested project:** A small web app (e.g., a personal knowledge base or a team standup bot) — complex enough to need architecture, simple enough to finish in 1-2 weeks. The output artifacts live in `artifacts/output/dogfood/` and serve as both validation evidence and a second worked example.

- [ ] Define the dogfood project scope (1-page brief)
- [ ] Run the full pipeline end-to-end, documenting blockers and integration bugs
- [ ] File bugs found during dogfood as issues on GitHub
- [ ] Publish the dogfood artifacts as a second worked example alongside the CLI todo list

### Success metrics

These are quantitative pass/fail criteria. The dogfood project is NOT complete until every metric is measured and the human-in-the-loop gate (below) confirms the results.

| # | Metric | Target | How measured |
|---|---|---|---|
| M1 | **Pipeline step completion** | 10/10 steps (phases -1 through 9) | Orchestrator state: all phases marked complete |
| M2 | **Squad diversity** | ≥3 squads exercised | Squad switch log in `loop-state.json` |
| M3 | **Agent invocation breadth** | ≥15 of 21 agents invoked during the pipeline | `delegation-log.json` agent list |
| M4 | **Delegation rate** | ≥70% of I/O calls delegated to sub-agents | `delegation_audit.js --since 14d` |
| M5 | **Self-learning output** | ≥1 pattern promoted from episodes | Episodes count in `self_learn scan` output; at least 1 promoted |
| M6 | **QA hard gate exercised** | `qa-signoff.md` blocked advancement at least once | Orchestrator log shows a `BLOCKED` state before `qa-signoff.md` |
| M7 | **Loop engineering** | `/goal` converged within ≤10 iterations; 1 automation produced a triage file | `loop-state.json` + `artifacts/output/00-discovery/triage/` |
| M8 | **Latency budget** | All 6 session-start operations under budget (≤1000ms total per README §13) | `test_session_latency.js` exit 0 |
| M9 | **Bug discovery** | ≥5 integration bugs filed as GitHub issues | GitHub Issues count, label `dogfood` |
| M10 | **Time-to-completion** | Informational baseline — no target, just measured | Wall clock: `validate-idea` start → `/iterate` end |
| M11 | **UTTERLY SATISFIED gate** | 100% of active rows have evidence-backed `SATISFIED` before dogfood GO | `release-readiness.md` + machine-readable satisfaction record |

### Human-in-the-loop validation gate

> **⛔ STOP. Do not mark F4.16 complete without this step.**

After the automated pipeline runs, Chris (maintainer) must manually review the dogfood artifacts and confirm:

- [ ] **Artifact quality**: every output file is coherent, not LLM slop. The PRD reads like a real PRD. The ADR is arguable. The QA report is not a form letter.
- [ ] **Metrics honest**: M1-M10 numbers are measured, not estimated. No metric was gamed.
- [ ] **Integration bugs filed**: every blocker and rough edge is a GitHub issue. No "I'll remember this" bugs.
- [ ] **Self-learning sample**: the promoted pattern is reviewed, edited if needed, and confirmed as a pattern worth reusing.
- [ ] **Go/No-Go on metrics**: for each metric M1-M10, confirm PASS or FAIL with a 1-line note why. Failures are bugs, not excuses to lower the target.
- [ ] **UTTERLY SATISFIED review**: every active agent row has evidence; inactive rows have reasons; feedback, escalation, and revalidation records are present; no blocker was silently waived.

Write the validation sign-off to `artifacts/output/dogfood/validation-signoff.md`:
```markdown
# Dogfood Validation Sign-off
**Date:** YYYY-MM-DD
**Reviewer:** Chris
**Result:** GO / NO-GO / CONDITIONAL

## Metric review
| # | Metric | Result | Note |
|---|--------|--------|------|
| M1 | ... | PASS/FAIL | ... |

## Artifact quality review
...

## Filed issues
- #N
- #N+1
...

## Decision
[GO | NO-GO | CONDITIONAL — if CONDITIONAL, list what must be fixed]
```

Only after sign-off with **GO** or **CONDITIONAL** (with conditions satisfied) is F4.16 considered done.

## F4.17-F4.19 — New-user onboarding

**Problem:** After all 3 releases ship, a new user's first 10 minutes are undefined. `npx vespyr` → then what? The README rewrite (F4.11) lists sections but doesn't specify the onboarding flow. The `init --example` command exists but there's no guided path from "just installed" to "first skill completed."

**Target:** A maintained onboarding system with 3 surfaces:

### F4.17 — Web guide (maintained documentation site)

> **🧵 Discuss when reaching this phase.** Open questions:
> - Should the guide *replace* existing docs or *point to* them? (duplication vs. navigation layer)
> - Static site generator (VitePress/Docusaurus/Astro) vs. raw Markdown on GitHub Pages?
> - Versioning: (a) `docs/` folder from `main`, (b) `gh-pages` branch per release tag, or (c) subdirectories `/v2.0/`, `/v2.1/`?
> - Auto-generated from frontmatter vs. hand-authored? (maintenance friction for solo maintainer)

- [ ] Create a web-based guide (GitHub Pages or similar) covering:
  - **Getting started:** install → first session → first skill → first artifact
  - **Concepts:** themes, phases, squads, agents, skills, memory, customization
  - **Tutorials:** step-by-step walkthroughs for `/validate-idea`, `/design`, `/develop`
  - **Reference:** command reference, frontmatter schema, hook IDs, MCP tools
  - **FAQ:** common questions, troubleshooting, harness-specific notes
- [ ] The guide is versioned alongside the codebase (each release updates the guide)
- [ ] Link from README.md, `npx vespyr` output, and `QUICK-REFERENCE.md`

### F4.18 — README maintenance contract

- [ ] README.md is treated as a living document, not a one-time write:
  - Every new feature (hook, MCP tool, skill, agent) updates README in the same PR
  - `test_catalog_parity.js` (Phase 3) already checks counts; extend to check README section headers match the current feature set
  - README version badge matches `package.json` version
- [ ] Add a "Last verified" date to each major README section

### F4.19 — npx installer versioning

- [ ] `npx vespyr` output includes the installed version number
- [ ] `npx vespyr --version` prints the current version
- [ ] `npx vespyr doctor` runs a health check: validates frontmatter, checks hook registration, verifies MCP server, confirms memory files exist
- [ ] Installer pins to the tagged release (not `main` branch) — supply chain safety

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
- [ ] **Dogfood:** full pipeline exercised end-to-end on a real project; all 10 metrics (M1-M10) measured; integration bugs filed as GitHub issues; **human-in-the-loop validation sign-off** completed in `validation-signoff.md`
- [ ] **T8 dogfood:** M11 passes and the release record contains the UTTERLY SATISFIED team gate with an honest GO.
- [ ] **Onboarding:** web guide published; `npx vespyr doctor` runs health check; README has "Last verified" dates

## Risks

- **Module split breaks existing installs.** `install-modules` is opt-in; default matches current behavior. `core` always required.
- **Rules merge order is non-obvious.** Document specificity rule in `rules/README.md`; add `validate_rules.js` test.
- **Example project becomes maintenance burden.** It's an example, not a real product. Update only when schema changes.
- **Builders produce inconsistent output.** Each builder uses `@writer` with a hardcoded template; output is byte-identical to hand-written.
- **Modules or builders bypass the satisfaction gate.** Keep the protocol in `core`, validate generated manifests/workflows, and test an attempted `BLOCKED` to GO transition.

### Rollback plan

If Phase 4 breaks:
- **Module split:** `install-modules` defaults to installing all modules (matching v1.7.x behavior). If a module is removed incorrectly, `npx vespyr install-modules --all` restores it.
- **Rules:** if language-specific rules cause conflicts, delete `.agents/rules/<lang>/` — agents fall back to `rules/common/` only.
- **Builders:** if builders produce broken output, the generated files can be deleted and hand-written instead. Builders are convenience, not infrastructure.

## Handoff to v2.1 Ship

When Phase 4 is done, all v2.1 DoD criteria (9-14 and T8 criteria 23-25 from README.md §4) should pass. Ship v2.1 only after the UTTERLY SATISFIED team gate is GO.

Then begin Phase 5 (`06-phase-5-deeper-bench.md`) for the v2.2 enrichment.
