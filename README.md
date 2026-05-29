# Vespyr: AI Agent Team for Product Development

![Vespyr Version](https://img.shields.io/badge/version-1.6.7-blue)

> A multi-agent system that runs a full product development team — from raw idea to production code.

**Vespyr** (from *vespula* + *zephyr*) is a set of 23 AI agents, each with a defined role, that coordinate through a shared workflow to build software products. Think of it as a staffed team you configure once and invoke per project.

---

## What it does

Vespyr covers the full product development lifecycle:

- Discovery & Research — market analysis, competitive intelligence, user research
- Strategy & Design — PRDs, user stories, UX/UI specs
- Architecture & Planning — system design, ADRs, task breakdown
- Development & Quality — implementation, code review, testing, security
- Infrastructure & Deployment — CI/CD, infra as code, release management

The system separates reasoning from I/O. Thinking agents design and decide; utility agents handle file reads, writes, and command execution. A dedicated memory controller manages shared context — filtering, compressing, and serving only what each agent needs. This keeps context lean and costs down.

---

## Getting started

### 1. Clone the repository

First, clone the Vespyr repository to your local machine:

```bash
git clone https://github.com/lalulali/vespyr.git
cd vespyr
```

### 2. Copy the agent system to your project

Copy the `.opencode` system to your target project. Agents auto-create the `artifacts/` directory structure on first use — no manual setup required.

```bash
cp -r .opencode /path/to/your-project/.opencode
```

### 3. Start a session

Invoke a skill via slash command or mention the founder agent directly:

| Command | When to use |
|---------|-------------|
| `/squad` | Switch between curated agent squads (e.g. `startup`, `build`, `ship`) to optimize context size and skip redundant lifecycle phases |
| `/validate-idea` | Product concepts — stress-test before investing research cycles |
| `/validate-game-idea` | Game concepts — player experience, core loop, genre fit |
| `/help-me` | Conversational next-step navigator. Unsure what to do or where to start? Check phase readiness & get scannable guidance |
| `/grill-me` | Socratic alignment loop. Pressure-test plans, specs, ideas, or architectural designs before committing |
| `@founder` or `#founder`| Raw idea — shortcut to jump straight to the founder agent |

### 4. Navigate your next steps

If you are ever unsure what to do next, what artifacts/files are missing, or what phase is currently active, just run `/help-me`. It will scan your workspace and give you a conversational navigation recommendation tailored to your exact project state.

### 5. Let the workflow run

```
Discovery → Research → Strategy → Architecture → Planning → Execution → Quality → Deployment
```

Each agent loads context from shared memory via `@memory-controller`, produces its output, and the next agent picks up from there.

---

## File structure

```
.opencode/
├── squads/                    # Curated squad presets (7 presets, e.g. startup, build)
│   ├── startup.md
│   ├── build.md
│   └── ...
├── agents/                    # Agent definitions (23 agents)
│   ├── founder.md
│   ├── product-manager.md
│   ├── developer.md
│   ├── memory-controller.md   # Memory gatekeeper
│   └── ...
├── scripts/                   # Infrastructure scripts
│   ├── archive_manager.js     # NDJSON archive operations
│   ├── memory_filter.js       # Deterministic keyword + recency scoring
│   ├── incremental_graph.js   # mtime-based structural scan
│   ├── orchestrator_state.js  # DAG pipeline state machine
│   ├── swarm_telemetry.js     # Token usage tracking
│   ├── token_profiler.js      # Static token analysis
│   ├── pipeline_simulator.js  # Telemetry generation
│   ├── hot_path_analyzer.js   # Cost analysis
│   └── ...
├── skills/                    # Reusable workflows
│   ├── product-development/
│   ├── game-idea-validation/
│   └── ...
├── templates/                 # Output templates
│   ├── idea-brief-template.md
│   ├── memory-entry-template.md
│   ├── session-summary-template.md
│   └── ...
├── references/                # Reference documents and guidelines
│   ├── founder-frameworks.md  # Stress-testing frameworks
│   ├── developer-guidelines.md# Coding standards and patterns
│   ├── pm-frameworks.md       # Product management frameworks
│   ├── pm-workflows.md        # PM operational workflows
│   ├── socratic-universal.md  # Universal Socratic rules for critical inquiry
│   ├── socratic/              # Per-agent Socratic rules
│   └── templates/             # Reference templates for agent instructions
├── delegation-pattern.md      # I/O delegation architecture
├── GUARDRAILS.md              # Shared safety rules
├── skills.md                  # Skills index
├── workflow.md                # Execution graph and handoff contracts
└── improvement-plan.md        # System optimization changelog
```

---

## System architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    THINKING AGENTS                          │
│  (Reasoning, Decision-Making, Design)                       │
│  • Founder, Product Manager, Architect, Developer, etc.     │
└─────────────────────────────────────────────────────────────┘
                            ↓ delegates to
┌─────────────────────────────────────────────────────────────┐
│                    I/O AGENTS                               │
│  (File Operations, Command Execution, Search)               │
│  • @writer — file creation and editing                      │
│  • @executor — command execution with summarized output     │
│  • @reader — file reading and codebase search               │
└─────────────────────────────────────────────────────────────┘
                            ↓ reads/writes via
┌─────────────────────────────────────────────────────────────┐
│                  @memory-controller                         │
│  (Script-based scoring, ~1,000 tokens/load)                 │
│  • 3-tier context loading (core → agent → task)             │
│  • Deterministic keyword + recency scoring (memory_filter)  │
│  • Automatic compaction + searchable archive (NDJSON)       │
│  • Session continuity across agent invocations              │
│  • Preflight checks for high-risk operations                │
└─────────────────────────────────────────────────────────────┘
                            ↓ manages
┌─────────────────────────────────────────────────────────────┐
│                    SHARED MEMORY                            │
│  • Project context, active decisions, patterns              │
│  • Agent notes, blockers, lessons learned                   │
│  • Session summaries, archive                               │
└─────────────────────────────────────────────────────────────┘
```

Core design rules:
- Each agent owns one concern
- Agents delegate I/O to @writer, @executor, @reader (configurable per task)
- All agents access shared memory through `@memory-controller` — never directly
- `@memory-controller` loads ~1,000 tokens of filtered context per agent vs ~15,000 raw (85–95% savings)
- Upstream/downstream dependencies are explicit in each agent file
- Multiple review stages act as quality gates before handoff
- Change Request Protocol prevents circular dependency loops
- Small files (< 200 lines) can be written directly by thinking agents
- Every thinking agent applies Socratic critical inquiry — universal rules plus per-agent diagnostics — to surface blind spots and challenge assumptions

---

## The agent team

### Discovery & Research (Phase 0–1)

#### @founder

Takes a raw idea and produces one validated concept before any research cycles start. Applies structured stress-tests (Golden Circle, First Principles, Pre-mortem, unit economics) paired with Socratic questioning to expose hidden assumptions and kill weak directions early. Decides which optional agents to activate.

Output: `validation-brief.md` (if validating) or `idea-brief.md` (if exploring)

To customize: edit the stress-testing tools, add industry-specific validation criteria, or change what gets flagged as a red flag.

---

#### @researcher

Researches market size (TAM/SAM/SOM), trends, customer segments, and competitive landscape. Operates in two modes: `market` for market analysis and `competitive` for competitor intelligence. States methodology and confidence levels explicitly. Will tell you the market is too small if the data says so.

Outputs: `market-analysis.md`, `competitive-analysis.md`

To customize: add industry-specific data sources, change the sizing methodology, or adjust competitor analysis frameworks.

---

#### @user-researcher

Defines target users, maps their jobs-to-be-done and pain points, and builds 2–3 personas (primary, secondary, anti-persona). Translates findings into "How Might We" opportunity statements.

Output: `user-personas.md`

To customize: change persona templates or add domain-specific user attributes.

---

### Strategy & Design (Phase 2)

#### @product-manager

Synthesizes research into two documents: a PRD for business stakeholders and user stories for engineering. Every user story has acceptance criteria across three categories — happy path, unhappy path, and edge cases. Enforces strict bi-directional traceability: every story traces back to a PRD feature (`Traces to PRD`) and forward to a product specification screen or flow (`Traces to Product Spec`). User stories must conform to both the approved requirements and the product spec visual designs with zero divergences.

Outputs: `requirements.md`, `user-stories.md`

To customize: change PRD templates, adjust user story formats, or add domain-specific acceptance criteria patterns.

---

#### @product-designer

Turns requirements into a product spec with no ambiguity left for developers. Maps every user flow (primary, alternative, error), defines all screen states (default, loading, success, error, empty), and specifies interaction details including accessibility. Enforces bi-directional traceability via a mandatory **Reciprocal Traceability Verification** step: every screen and flow must reference the user story IDs it satisfies (spec→stories), and every user story must have at least one corresponding spec element (stories→spec). Zero orphans on either side.

Output: `product-spec.md`

To customize: change design system tokens, add platform-specific guidelines, or adjust accessibility standards.

---

#### @ux-researcher (optional)

Evaluates whether the design is usable before development starts. Runs heuristic evaluations, usability tests, and accessibility audits. Signs off the design or blocks it.

Output: `ux-research-report.md`

Summon when: complex multi-step workflows, novel interaction patterns, or accessibility-critical features.

---

### Architecture & Planning (Phase 3–4)

#### @architect

Designs the system blueprint. Makes tech stack decisions with explicit trade-off rationale, defines data models and API contracts, and documents every architectural decision as an ADR.

Outputs: ADRs in `03-architecture/`

To customize: add technology-specific ADR templates or change the decision-making framework.

---

#### @tech-lead

Assumes sprint planning leadership to evaluate task dependencies and backlog complexity, determining sprint-specific developer parallelism (1 to N). Breaks system architecture and user stories into modular tasks on the Kanban board. Assigns a **Role tag** (`FE`/`BE`/`Full-Stack`) to each task, which governs the assigned developer's focus area and communication permissions for the duration of that task.

Output: `kanban.md` updates (To Do, sprint tasks)

To customize: change task sizing guidelines or add team-specific planning patterns.

---

### Development & Quality (Phase 5–6)

#### @developer

Implements features following existing patterns. **Enforces Spec & Story Reading Mandate:** MUST load and read Product Spec and User Stories prior to coding. Covers happy/unhappy/edge acceptance criteria. Delegates file writes to @writer and command runs to @executor. Communication permissions are governed by the **Role tag** assigned by `@tech-lead`:
- **FE:** Focuses strongly on implementation accuracy, visual polish, and user experience. Permitted to converse with the **human, `@product-designer`, or `@product-manager`** for clarifications.
- **BE:** Focuses on API contracts, database, and system safety. Permitted to converse with the **human or `@product-manager`** for clarifications.
- **Full-Stack:** Both FE and BE communication channels apply.

Outputs: production code, tests

To customize: change coding standards, test patterns, or add language-specific guidelines.

---

#### @code-reviewer

Reviews code before merge. Read-only — reports findings, does not make changes. Categorizes issues as blocking, major, minor, or nit. Escalates systemic patterns to @tech-lead rather than commenting on every instance.

Outputs: review comments, sign-off or block decision

To customize: change review checklists or severity definitions.

---

#### @qa-engineer

Writes and runs tests against every acceptance criterion. Runs regression testing, performs exploratory testing, and produces a release readiness report. Will not approve a release with unresolved blocking bugs.

Outputs: test results, coverage reports, bug reports, `release-readiness.md`

To customize: change coverage thresholds or add domain-specific quality gates.

---

#### @security-engineer (optional)

Audits authentication flows, checks for OWASP Top 10 vulnerabilities, scans dependencies for CVEs, and runs threat modeling. Audit-only — does not make changes. Critical and high findings block release.

Outputs: `findings-report.md`, `threat-model.md`, `dependency-scan.md`

Summon when: the feature touches auth, payments, or PII.

---

#### @performance-engineer (optional)

Profiles the application, analyzes query performance, reviews caching strategy, and runs load tests. Analysis-only — does not make changes.

Outputs: `performance-report.md`, benchmark results

Summon when: performance SLAs exist or before major releases.

---

### Infrastructure & Documentation (Phase 7–8)

#### @devops-engineer

Owns the pipeline from commit to production. Designs CI/CD with quality gates, manages infrastructure as code, configures environments with proper secrets management, and implements rollback strategies.

Outputs: CI/CD configs, infrastructure definitions, deployment runbooks

To customize: change deployment strategies or add platform-specific configurations.

---

#### @technical-writer

Keeps documentation in sync with the implementation. Creates API references, user guides, runbooks, and migration guides. Updates docs when code changes — not after the release.

Outputs: API reference, user guide, runbooks, changelogs

To customize: change documentation templates or add domain-specific doc types.

---

#### @ml-engineer (optional)

Designs and deploys ML components. Covers the full pipeline: data ingestion, feature engineering, training, evaluation, serving, and drift monitoring. Starts with a baseline before building anything complex.

Outputs: ML architecture ADRs, pipeline code, model registry, evaluation results

Summon when: ML/AI is core to the product, not just a wrapper around an API.

---

#### @data-analyst (optional)

Ensures features can be measured before they ship. Defines SMART success metrics, plans instrumentation, designs dashboards, and recommends A/B test designs. Coordinates with @developer so tracking is built in from day one.

Outputs: `measurement-plan.md`, dashboard specs, data dictionary

Summon when: the feature needs adoption or business impact tracking.

---

### Utility agents (always available)

#### @memory-controller

The memory gatekeeper. Loads filtered, relevant context for every agent using a 3-tier pipeline — core context, agent-specific files, and task-relevant keyword scoring via `memory_filter.js`. Handles automatic compaction, NDJSON archive search, session continuity, deduplication, preflight checks for high-risk operations, and per-agent profile tuning. Runs on a lightweight model (DeepSeek Flash) to keep costs minimal.

Commands: `load`, `load-full`, `load blockers`, `write`, `search`, `compact`, `session-write`, `status`, `preflight`

#### @writer

Writes and edits files exactly as specified. Does not interpret, improve, or refactor. Confirms every operation with a one-line summary.

#### @executor

Runs bash commands and returns summarized output — exit code, pass/fail counts, first few errors. Strips the noise so the calling agent's context stays focused.

#### @reader

Reads files and searches the codebase. Returns structured summaries scaled to file size. Does not analyze or suggest changes.

---

## Reusable skills & workflows

Vespyr organizes complex, multi-agent operations into highly structured **skills** (located in `.opencode/skills/`). Each skill is an end-to-end workflow designed for a specific product milestone, operational phase, or utility concern. They guide agents through sequence gates, coordinate parallel execution paths, and enforce quality control.

### Skill lifecycle & architecture

```
                               ┌───────────────────────┐
                               │       RAW IDEA        │
                               └───────────┬───────────┘
                                           │
                                           ▼
                               ┌───────────────────────┐
                               │   VALIDATION PHASE    │
                               │ • idea-validation     │
                               │ • game-idea-val (opt) │
                               └─────┬───────────┬─────┘
                                     │           │
                             GO      │           │ KILL
           ┌─────────────────────────┘           └─────────────────────────┐
           │                                                               │
           ▼                                                               ▼
 ┌───────────────────┐                                            ┌─────────────────┐
 │ EXPLORATION PHASE │                                            │      STOP       │
 │ • product-explor  │                                            │ (Save weeks of  │
 │ • game-explor(opt)│                                            │  wasted effort) │
 └─────────┬─────────┘                                            └─────────────────┘
           │
           ▼
 ┌───────────────────┐
 │   DESIGN PHASE    │
 │ • product-design  │
 └─────────┬─────────┘
           │
           ▼
 ┌───────────────────┐
 │ DEVELOPMENT PHASE │
 │ • product-develop │
 └─────────┬─────────┘
           │
           ▼
 ┌───────────────────┐
 │   LAUNCH PHASE    │
 │ • product-launch  │
 └─────────┬─────────┘
           │
           ▼
 ┌───────────────────┐          REACTIVE          ┌───────────────────┐
 │  ITERATION PHASE  ├───────────────────────────►│ INCIDENT RESPONSE │
 │ • product-iter    │      Production Bug/       │ • incident-resp   │
 └─────────┬─────────┘        Degradation         └─────────┬─────────┘
           │                                                │
           │             ┌──────────────────────────────────┘
           ▼             ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                              RETROSPECTIVE                               │
 │ • retrospective (After launches, incidents, or every 5 iteration cycles) │
 └──────────────────────────────────────────────────────────────────────────┘
```


### Core Product Pipeline Skills

#### 1. `validate-idea`
* **Purpose**: Stress-test new product concepts before wasting research or development resources. Serves as a Socratic thinking partner rather than a cheerleader — applies critical inquiry to expose blind spots, test assumptions, and kill weak directions early.
* **When to use**: Whenever you have a rough idea, a problem space, or a feature proposal without validated demand.
* **Key Agents**: Led by `@founder` with I/O delegated to `@writer` and `@reader`.
* **Output**: `artifacts/output/00-discovery/validation-brief.md` (using `validation-brief-template.md`).

#### 2. `explore-idea`
* **Purpose**: Conduct deep-dive market, competitor, and user research to build a comprehensive foundation for product strategy.
* **When to use**: Once an idea is successfully validated.
* **Key Agents**: Led by `@founder` and research agents (`@researcher` with `market` and `competitive` modes, `@user-researcher`).
* **Outputs**: `market-analysis.md`, `competitive-analysis.md`, `user-personas.md`.

#### 3. `design`
* **Purpose**: Define comprehensive product requirements and create highly detailed, developer-ready interface and behavior specifications. Enforces a strict **tri-directional traceability standard**: PRD features → user stories → product spec screens, and back. Every story traces to a spec screen (`Traces to Product Spec`); every spec screen references its story IDs. Zero orphans on either side.
* **When to use**: After exploration is completed and the opportunity is validated.
* **Key Agents**: `@product-manager` and `@product-designer`.
* **Outputs**: `requirements.md` (PRD), `user-stories.md` (with happy/unhappy/edge acceptance criteria and bi-directional spec tracing), and `product-spec.md` (with associated story references per screen and reciprocal traceability verification).

#### 4. `develop`
* **Purpose**: Design code architecture, plan execution tasks, write tests and clean code, and execute multi-layer QA verification.
* **When to use**: When product specifications are signed off and the feature is ready to be built.
* **Key Agents**: Led by `@tech-lead` and `@developer` with verification by `@code-reviewer` and `@qa-engineer`.
* **Outputs**: High-quality production code, comprehensive tests, ADRs, `execution-plan.md`, and test reports.

---

### Game Studio Mode Skills

#### 5. `validate-game-idea`
* **Purpose**: A creative-first Socratic validation diagnostic that evaluates the concept's core loops, player emotions, platform suitability, and genre landscape rather than standard SaaS/startup metrics.
* **When to use**: Game concept needs stress-testing before investing production time.
* **Key Agents**: `@founder` acting as Creative Director.
* **Output**: `artifacts/output/00-discovery/game-validation-brief.md`.

#### 6. `explore-game-idea`
* **Purpose**: Synthesizes genre landscape competitive intelligence, player demographic studies, and market/audience sizing for a validated game concept.
* **When to use**: A game concept has passed validation and needs a complete, data-backed research foundation.
* **Key Agents**: `@founder` and game research specialists.
* **Outputs**: `game-market-analysis.md` and `game-competitive-analysis.md`.

---

### Operations, Maintenance & Utility Skills

#### 7. `humanize` (Utility — On Demand)
* **Purpose**: Remove AI-generated writing tells to ensure generated text, emails, code comments, and documentation sound natural, clear, and uniquely human. It detects and eliminates inflated symbolism, passive-voice overuses, copula avoidance, and overused AI vocabulary.
* **When to use**: Any text artifact needs a pulse, personality, and natural phrasing.
* **How to invoke**: Command any thinking agent or `@writer`: *"Use the humanize skill on [text/file]"*.

#### 8. `help-me` (Utility — On Demand)
* **Purpose**: Conversational next-step navigator that evaluates the current project state, checks active/missing files, scans the skill catalog, and gives a tailored, scannable recommendation on what to do next.
* **When to use**: If you are unsure where to start on a fresh project or what phase/step is next in an active one.
* **How to invoke**: Command `help me`, `/help-me`, or `/help-me [query]`.

#### 9. `grill-me` (Utility — On Demand)
* **Purpose**: Socratic stress-testing loop. Interviews you relentlessly—one question at a time—to pressure-test plans, specifications, ideas, or architectural designs, helping surface hidden assumptions and saving alignment decisions straight to `active-decisions.md`.
* **When to use**: Before committing to a plan, spec, or design, to make sure it's fully aligned and bulletproof.
* **How to invoke**: Command `grill me`, `/grill-me`, or `/grill-me [query]`.

#### 10. `product-launch` (Post-Dev — Release)
* **Purpose**: Orchestrate the transition from development to live production. Runs a rigorous multi-point Release Readiness checklist, facilitates formal Go/No-Go release decisions, prepares infrastructure, and monitors post-release metrics for 24–72 hours.
* **Key Agents**: `@product-manager`, `@devops-engineer`, `@technical-writer`, `@data-analyst`.
* **Outputs**: `release-readiness.md`, `go-nogo-decision.md`, `launch-log.md`, and `post-launch-report.md`.

#### 11. `product-iteration` (Post-Launch — Optimization)
* **Purpose**: Rapidly improve live features by analyzing user behavior patterns, prioritizing enhancements using RICE frameworks, and running agile code loops (max 5 cycles before a retro).
* **Key Agents**: `@data-analyst`, `@product-manager`, `@product-designer`, `@developer`.
* **Outputs**: `analytics-insights.md`, `iteration-backlog.md`, `iteration-spec.md`, and `iteration-plan.md`.

#### 12. `incident-response` (Ops — Reactive)
* **Purpose**: Manage production downtime, critical bugs, security vulnerabilities, or performance spikes under strict SLAs. Follows a robust process: triage severity, mitigate user-impact first (rollback/flag off), conduct a blameless 5 Whys Root-Cause Analysis (RCA), deploy QA'd fixes, and update team knowledge.
* **Key Agents**: `@product-manager` (Incident Commander), `@architect`/`@tech-lead` (RCA), responders (`@devops-engineer`, `@developer`, `@security-engineer`, `@qa-engineer`).
* **Outputs**: `triage.md`, `mitigation.md`, `rca.md`, and `post-incident-review.md`.

#### 13. `retrospective` (Ops — Continuous Improvement)
* **Purpose**: Reflect on completed milestones, compare planned vs. actual effort, identify collaboration or handoff bottlenecks, log action items with clear ownership, and run the memory compaction protocol to keep system context lean.
* **Key Agents**: `@tech-lead`, `@product-manager`, `@architect`.
* **Outputs**: `execution-review.md`, `process-review.md`, `action-items.md`.

---

## Game development mode

Vespyr includes a game development variant with game-specific templates and skills.

@founder adapts automatically when the project type is set to game studio. It thinks like a Creative Director — player experience, core loop, genre gap, platform fit — rather than a startup founder.

Game-specific templates: `game-idea-brief-template.md`, `game-validation-brief-template.md`, `game-competitive-analysis-template.md`, `game-market-analysis-template.md`

Game-specific skills: `validate-game-idea`, `explore-game-idea`

To activate, set the project type in `artifacts/memory/project-context.md`:

```markdown
## Project Type
Game Studio / Indie Game Development
```

---

## How to customize

### Agent structure

Each agent is a markdown file in `.opencode/agents/` with a frontmatter block:

```markdown
---
description: Brief description of the agent's role
version: "2.0"
mode: subagent
temperature: 0.1
permission:
  bash: allow/deny/ask
  edit: allow/deny/ask
  glob: allow/deny
  grep: allow/deny
  question: allow/deny
  read: allow/deny
  webfetch: allow/deny
tools:
  write: true/false
optional: true/false
summon_when: "Conditions for activating this agent"
upstream_dependencies:
  - "@agent-name"
downstream_consumers:
  - "@agent-name"
---

[Agent prompt]
```

The frontmatter controls permissions. If `bash: deny`, the agent physically cannot run commands — it must delegate to @executor. This is intentional.

### Changing agent behavior

Edit the agent's markdown file. The prompt is plain text — change the decision criteria, add domain knowledge, adjust output formats, or add new frameworks. The agent will follow whatever you write.

Example: add DDD to @architect

```markdown
## How to design

When given product specs and user stories:
1. Define service boundaries using Domain-Driven Design
2. Design inter-service communication (REST, gRPC, events)
3. Define data ownership per service
...
```

### Adding a new agent

1. Create `.opencode/agents/your-agent.md`
2. Define role, responsibilities, and workflow position
3. Set `upstream_dependencies` and `downstream_consumers`
4. Reference the new agent in related agents' prompts

Example:

```markdown
---
description: Designs and implements mobile applications for iOS and Android
version: "1.0"
mode: subagent
temperature: 0.1
permission:
  bash: allow
  edit: deny
  read: allow
upstream_dependencies:
  - "@product-designer"
  - "@architect"
downstream_consumers:
  - "@qa-engineer"
---

You are a mobile engineer...
```

### Changing the workflow

Workflow order is defined by `upstream_dependencies` and `downstream_consumers` in each agent file. To reorder phases, update those fields and adjust the `Workflow Position` table inside each affected agent.

### Customizing templates

Templates in `.opencode/templates/` define output formats. Add required fields, change section order, or include domain-specific content. Agents follow the template exactly.

### Adjusting shared memory

`artifacts/memory/` is where agents coordinate, accessed through `@memory-controller`. The key files:

- `project-context.md` — tech stack, team size, constraints (use `[CORE]` section format)
- `patterns-and-conventions.md` — coding standards and established patterns
- `active-decisions.md` — architectural and product decisions in effect
- `agent-notes/*.md` — per-agent knowledge bases
- `session-summaries/latest.md` — most recent session context (~100 tokens)

Agents never read these files directly. They call `@memory-controller load [agent-type] [task]` which returns filtered, relevant context using hybrid keyword+semantic scoring (~1,000 tokens vs ~15,000 raw). See `.opencode/agents/memory-controller.md` for the full protocol.

### Configuring and defining squads

Squads are defined as Markdown files inside `.opencode/squads/` with a YAML frontmatter block listing the active agents:

```markdown
---
name: startup
description: Early-stage product from idea to MVP
agents:
  - founder
  - developer
  - ...
---
```

You can create new squads by adding a `{squad-name}.md` file inside `.opencode/squads/` specifying your custom subset of agents. 
Once created, you can switch to your custom squad using the command `/squad {squad-name}`.

### Configuring optional agents

Optional agents are activated by @founder based on concept characteristics. To add your own:

```markdown
| Agent | Summon when... | Adds to timeline |
|-------|---------------|-------------------|
| @your-agent | Your condition | +X weeks |
```

### Modifying the delegation pattern

See `.opencode/delegation-pattern.md`. You can add new I/O agent types, change summarization rules, or swap model assignments per agent.

### Adding skills

Skills are reusable workflows in `.opencode/skills/`. Create a directory with a `SKILL.md` and agents can invoke it when needed.

```
.opencode/skills/your-skill/
  └── SKILL.md
```

### Customizing Socratic rules

Every thinking agent applies Socratic critical inquiry via shared universal rules (`.opencode/references/socratic-universal.md`) plus a per-agent rule file (`.opencode/references/socratic/{agent}.md`). Edit these to tune how aggressively agents challenge assumptions, or add domain-specific diagnostic questions.

### Adjusting output tone

The `@technical-writer` agent matches the tone and style of existing documentation. For text artifacts, the `humanizer` skill removes AI-writing tells and adjusts formality level. See `.opencode/skills/humanizer/SKILL.md`.

---

## Tips

**For users:**
- Give @founder enough detail to stress-test. Vague inputs produce vague outputs.
- Review each phase's artifacts before the next phase starts. Catching a bad assumption in research is cheaper than catching it in development.
- Agents can iterate. If an output is wrong, say so and they'll revise.
- Use `@memory-controller status` to check memory health. Use `@memory-controller search [query]` to find archived context.

**For customizers:**
- Keep agent boundaries clean. One agent, one concern.
- The delegation pattern is configurable: `required`, `optional`, or `none` per task (see @developer).
- Small files (< 200 lines) can be written directly by thinking agents — no double-hop tax.
- Don't read memory files directly. Always use `@memory-controller load` — it filters and compresses context automatically.
- Use `@memory-controller tune [agent] [feedback]` to adjust what gets loaded for specific agent types.
- Test workflow changes end-to-end before using on a real project.
- Profile token usage with `node .opencode/scripts/token_profiler.js --verbose`.
- Simulate pipeline runs with `node .opencode/scripts/pipeline_simulator.js`.
- Analyze hot paths with `node .opencode/scripts/hot_path_analyzer.js`.

**For contributors:**
- Use the standard frontmatter structure.
- Don't break upstream/downstream contracts without updating both sides.
- Bump the version number in the frontmatter when behavior changes.
- Memory entries must follow the format in `.opencode/templates/memory-entry-template.md` — the controller validates on write.

---

## Contributing

Vespyr is open source and contributions are welcome. Whether you're adding a new agent, improving an existing one, fixing a bug, adding a template, modifying a workflow, or porting to a new harness — PRs are open.

### Adding or modifying templates

Templates in `.opencode/templates/` define the output format agents follow. Each template is a markdown file with placeholder sections that agents fill in.

To add a new template:
1. Create a new `.md` file in `.opencode/templates/` following the naming convention `{output-type}-template.md`
2. Define sections and placeholders using markdown
3. Reference the template in the relevant agent's prompt (e.g., `Use the template at .opencode/templates/your-template.md`)
4. The agent will follow the template structure exactly

To modify an existing template:
1. Edit the template file directly
2. Add, remove, or reorder sections as needed
3. Update any agents that reference the template if the contract changes

### Adding or modifying workflows

Workflows define the end-to-end process agents follow. The primary phase workflow is ordered by `upstream_dependencies` and `downstream_consumers` in each agent file.

To add a new workflow phase:
1. Create a new agent in `.opencode/agents/`
2. Set its position with `upstream_dependencies` and `downstream_consumers`
3. Update the `Workflow Position` table in the agent's prompt
4. Add the agent to this README's agent list
5. Create the corresponding output directory in `artifacts/output/`

To modify the existing workflow order:
1. Update `upstream_dependencies` and `downstream_consumers` in the affected agents
2. Adjust their `Workflow Position` tables
3. Verify no dependency cycles exist between agents

For reusable cross-cutting workflows (skills):
- Create a directory in `.opencode/skills/` with a `SKILL.md`
- Define activation conditions and invocation patterns
- Register the skill in `.opencode/skills.md`
- Agents invoke skills when specified conditions match

### Agent contributions

To add a new agent: create the file, define dependencies, add it to this README, and submit a PR with an example of it in use.

To improve an existing agent: test on a real project first, maintain backward compatibility where possible, and document breaking changes in the PR.

To add a skill: create the directory, write `SKILL.md`, add activation conditions, and update `skills.md`.

---

## Infrastructure scripts

Vespyr includes a suite of scripts for memory management, profiling, and telemetry:

| Script | Purpose |
|--------|---------|
| `archive_manager.js` | NDJSON archive operations (append, search, migrate, merge) |
| `memory_filter.js` | Deterministic keyword + recency scoring for memory loading |
| `incremental_graph.js` | mtime-based structural codebase scan (only changed files) |
| `orchestrator_state.js` | DAG pipeline state machine (init, status, next, complete, file-cr, validate) |
| `swarm_telemetry.js` | Token usage tracking per agent per phase (record, summary, report, baseline) |
| `token_profiler.js` | Static token analysis of agent prompts, templates, and scripts |
| `pipeline_simulator.js` | Simulates full pipeline runs to generate telemetry data |
| `hot_path_analyzer.js` | Identifies highest-cost paths and optimization opportunities |
| `dedupe_validator.js` | Duplicate detection for memory writes |
| `compaction_guard.js` | Threshold checking for memory file compaction |
| `shallow_graph.js` | Full structural codebase scan (imports/exports) |

### Telemetry

Token and duration tracking is built into the orchestrator state machine. When agents complete artifacts, they pass `--tokens` and `--duration-ms` flags which are automatically recorded as telemetry events.

```bash
# View per-agent-per-phase breakdown
node .opencode/scripts/swarm_telemetry.js report

# View general summary (last 7 days)
node .opencode/scripts/swarm_telemetry.js summary --days 7

# Profile static token sizes
node .opencode/scripts/token_profiler.js --verbose

# Simulate a pipeline run
node .opencode/scripts/pipeline_simulator.js --runs 3

# Analyze hot paths
node .opencode/scripts/hot_path_analyzer.js
```

---

## Learn more

- [ROADMAP.md](./ROADMAP.md) — what's planned: npx installer, squad presets, docs site, continuous improvement
- [PORTING.md](./PORTING.md) — how to use Vespyr with Claude Code, Cursor, Windsurf, Copilot, Codex CLI, Aider, Zed, Hermes Agent, OpenClaw, and more
- `.opencode/agents/memory-controller.md` — full memory protocol: 3-tier loading, NDJSON compaction, preflight checks
- `.opencode/delegation-pattern.md` — how the I/O separation works and why
- `.opencode/GUARDRAILS.md` — shared safety rules all agents follow, including Change Request Protocol
- `.opencode/TROUBLESHOOTING.md` — common issues and fixes including memory tuning
- `.opencode/workflow.md` — execution graph, handoff contracts, and conflict resolution
- `.opencode/skills.md` — skills index
- `.opencode/templates/` — output format examples
- `.opencode/profiling-report.md` — token profiling analysis and optimization recommendations
- `.opencode/improvement-plan.md` — system optimization changelog and decision log

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

## Acknowledgments

The delegation pattern and agent architecture work in any AI coding harness — Cursor, Windsurf, Claude Code, opencode, Hermes Agent, OpenClaw, or raw API.

The name combines *vespula* (yellowjacket — organized, efficient colonies) with *zephyr* (a light wind — the idea that the right process should feel effortless).

**Third-party credits:** The `@writer` agent's humanizer capability uses the [humanizer](https://github.com/blader/humanizer) skill by [@blader](https://github.com/blader), MIT licensed. Based on Wikipedia's ["Signs of AI writing"](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) guide. Extended with tone-aware rewriting for formality, voice consistency, and domain-appropriate language. Version 2.5.1.

---

## Support

Open an issue on [GitHub Issues](https://github.com/lalulali/vespyr/issues).

---

**Built by a PM who got tired of context-switching.**
