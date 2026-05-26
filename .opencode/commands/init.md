---
description: Bootstrap project — analyze codebase, create artifact tree, initialize memory layer, detect project type
agent: developer
---

Override the built-in `/init`. Do NOT just create AGENTS.md — do the full bootstrap.

## Step 1: Analyze the project

> [!WARNING]
> **Dotfolder Isolation Rule**:
> You MUST NOT read, scan, or analyze any files inside the system dotfolder `.opencode/`
> The dotfolder contains files, commands, schemas, and agents that belong to the harness system itself, NOT the user's project. Looking inside it will cause you to falsely assume the project is a "Vespyr engine clone" or has node/typescript dependencies when it might be completely empty or belong to a different language.
> Keep all scans strictly restricted to files *outside* the system dotfolder `.opencode/` and the `artifacts/` directory.

Use `@reader` to scan the codebase (**EXCLUDING** the system dotfolder `.opencode/` and the `artifacts/` directory):
- Directory structure (top 2 levels, ignoring the system dotfolder and `artifacts/` folder)
- Tech stack (package.json, requirements.txt, go.mod, Cargo.toml, etc., outside the system dotfolder)
- Existing patterns and conventions (outside the system dotfolder)
- Test framework
- CI/CD config if present

Use `@executor` to run:
- `git log --oneline -10` (if git repo and outside dotfolder context)
- `find . -name "*.md" -maxdepth 1` (existing docs, ignoring those in dotfolders)

## Step 2: Create AGENTS.md

Create `AGENTS.md` and `agent.md` files in the project root with:

```markdown
# {Project Name} — Vespyr Multi-Agent Engine

A platform-agnostic, file-based multi-agent system configured to streamline product development and engineering operations. This system consists of 22 specialized agent personas, structured workflows, and a shared persistent memory layer.

---

## 🚀 Invocation & Multi-Harness Guidelines

Since agents are defined as plain Markdown personas, they can be loaded and executed by any AI developer harness. Choose the method corresponding to your current environment:

### 1. Context-Aware & Mention-Capable IDEs (e.g., Cursor, Windsurf, GitHub Copilot)
- **Direct Invocation**: Use the `@` symbol in your chat pane to mention the agent's markdown configuration file (e.g., `@.opencode/agents/founder.md` or `@founder.md`).
- **Context Injection**: Attach the specific agent's `.md` file to the chat window before starting your task to ensure the assistant adopts the exact profile and guardrails.

### 2. Single-Agent & Terminal Harnesses (e.g., Claude Code, Aider, CLI Assistants, Google Antigravity)
- Instruct the active LLM session to read and adopt the persona explicitly. 
- **System Directive Prompt Pattern**:
  ```
  Adopt the role of the agent defined in: .opencode/agents/[agent-name].md
  Read that file to understand your persona, goals, workflow, and safety guardrails.
  Then, execute this task: [detailed instructions]
  ```

### 3. Standard Browser-Based LLMs (e.g., ChatGPT Web, Claude.ai, Gemini Web)
- Copy the entire contents of the desired agent file from `.opencode/agents/[agent-name].md` and paste it as the very first system message or instruction in a new chat thread.
- Append your query at the end of the prompt to initialize the agent's behavior.

---

## 👥 Core Agent Personas (22 specialized roles)

The system features 22 highly tuned role profiles divided into three functional categories:

### 1. Core Swarm & Engineering Roles

| Agent Persona | Focus Area & Primary Responsibilities | Core Outputs & Artifacts |
| :--- | :--- | :--- |
| **`@orchestrator`** | Swarm coordinator. Manages multi-agent execution pipelines and sequence handoffs. | `artifacts/memory/swarm-state.json` |
| **`@founder` (Elena)** | Strategic concept stress-testing. Challenges assumptions with a GO/PIVOT/KILL verdict. | `artifacts/output/00-discovery/` |
| **`@product-manager`** | Comprehensive requirements scoping, PRD generation, user story maps, and Kanban board maintenance. | `requirements.md`, `kanban.md` |
| **`@product-designer`** | Low-to-high fidelity UX/UI design specifications, screen states, and wireframes. | `product-spec.md` & visual mockups |
| **`@architect`** | Technical system designs, architecture trade-offs, and ADR records. | `adr/*.md` (ADRs) |
| **`@tech-lead`** | Granular execution plans, technical breakdowns, task estimations (1-4 hours). | `execution-plan.md` |
| **`@developer`** | Core feature implementation, code quality, and writing comprehensive test suites. | Source Code & Unit Tests |
| **`@code-reviewer`** | High-fidelity, read-only code audits, pull request reviews, and security validation. | Review Checklists & Feedback |
| **`@qa-engineer`** | End-to-end integration testing, regression validation, and release certification. | `test-report.md` |

### 2. Specialized Domain Experts

| Agent Persona | Focus Area & Primary Responsibilities | Core Outputs & Artifacts |
| :--- | :--- | :--- |
| **`@researcher`** | Conducts market, competitor, and genre research, synthesizing findings to back decisions. | `artifacts/output/01-research/` |
| **`@user-researcher`** | Structures user research plans, executes interviews, and maps persona segments. | `artifacts/output/01-research/user-research/` |
| **`@ux-researcher`** | Evaluates usability, designs user journey maps, and builds interaction paradigms. | `artifacts/output/01-research/ux/` |
| **`@data-analyst`** | Sets up analytics instrumentation, synthesizes telemetry, and builds dashboards. | `artifacts/output/07-iteration/` |
| **`@security-engineer`** | Conducts security reviews, threat modeling, vulnerability scanning, and secure defaults. | `artifacts/output/03-architecture/security/` |
| **`@performance-engineer`** | Analyzes system latency, identifies performance bottlenecks, and runs optimization audits. | `artifacts/output/07-iteration/performance/` |
| **`@ml-engineer`** | Standardizes AI logic, validates model integrations, and drafts prompt templates. | `artifacts/output/03-architecture/ml/` |
| **`@devops-engineer`** | Designs CI/CD automation pipelines, provisions cloud infrastructure, and configures environments. | `.github/workflows/`, Terraform files |
| **`@technical-writer`** | Formulates user manuals, maintains API specifications, and drafts release documentation. | `docs/`, `api-reference.md` |

### 3. Operational I/O Sub-Agents

For optimal efficiency, cognitive reasoning is separated from operational tasks. Thinking agents delegate I/O to these narrow, high-performance sub-agents:

- **`@reader`**: Fast codebase queries, regex searches, and file views (Read-Only).
- **`@writer`**: Ultra-focused, contiguous file edits and writes with zero reasoning overhead (Write-Only).
- **`@executor`**: Executes shell commands and returns clean, curated execution summaries (Bash execution).
- **`@memory-controller`**: Memory gatekeeper. Loads progressive context tiers, validates writes, and compacts history.

---

## 🧠 Shared Memory & Context Persistence Protocol

To ensure seamless collaboration across different agent steps and avoid context drift or high token costs, all agents leverage the localized text-based memory system located in `artifacts/memory/`.

- **`project-context.md`**: Tracks the absolute source of truth for the codebase stack, constraints, and architecture.
- **`active-decisions.md`**: Captures critical design choices made by the agents.
- **`lessons-learned.md`**: Stores engineering insights, bugs fixed, and architectural gotchas.

### 💾 Interacting with Memory

1. **For Tool/MCP-Enabled Environments**:
   Use the specialized `@memory-controller` sub-agent to query, read, or append entries to preserve state cleanly:
   - Load context: `Run the memory-controller to load the latest state for [task]`
   - Update decisions: `Run the memory-controller to write [decision] to active decisions`
2. **For General Terminal/File-Writing Environments**:
   Directly view or modify the standard markdown memory files using your standard file read/edit tools.

## 🛡️ Guardrails

All agents follow the safety and conflict resolution rules in `.opencode/GUARDRAILS.md`.
```

## Step 3: Initialize artifact tree

Create these directories under `artifacts/output/`:
- `00-discovery/`
- `01-research/`
- `02-strategy/`
- `03-architecture/`
- `04-planning/`
- `06-launch/`
- `07-iteration/`
- `08-incidents/`
- `09-retro/`

Create `artifacts/telemetry/` — agent execution logs, token usage, and performance metrics.

Create these directories under `artifacts/`:
- `directions/` — document templates direction
- `input/` — raw input materials folder
- `input/example/` — reference examples
- `input/data/` — datasets and analytics exports
- `input/designs/` — design files, mockups, assets
- `input/documents/` — external documents, briefs, research, raw notes
- `input/flows/` — user flows, journey maps, wireframes

Create `artifacts/memory/` with:
- `project-context.md` — pre-populate with discovered project info and chosen squad preset (e.g. `Squad: startup` or chosen `--squad` flag, defaulting to `full-team` if unspecified)
- `active-decisions.md` — empty, ready for entries
- `patterns-and-conventions.md` — pre-populate with discovered code patterns
- `lessons-learned.md` — empty
- `blockers-and-risks.md` — empty
- `agent-notes/` — empty directory
- `session-summaries/` — empty directory
- `pending-questions/` — create a subdirectory inside for each of the core agent personas (e.g. `founder/`, `architect/`, etc.)
- `archive/` — empty directory

## Step 4: Detect project type

Based on the codebase analysis (strictly ignoring all files inside the system dotfolder `.opencode/` and the `artifacts/` directory), determine the project context:
- **If the project is empty / blank** (i.e. contains no codebase/source files, manifest files like package.json/cargo.toml, or documentation files in the root or directories outside the dynamic system dotfolder and standard git config):
  - You **MUST NOT** write assumptions, make guesses about the project stack, or read/access any files inside `.opencode/` to infer what kind of project this is.
  - You **MUST** state clearly and explicitly in `artifacts/memory/project-context.md` that it is a **blank project starting from scratch**.
  - Configure the following exact neutral fallback values in `project-context.md`:
    - **Name**: "Blank Project / New Product Concept"
    - **Type**: "Blank/Undetermined (Ready for Idea Validation)"
    - **Stack**: "None (Starting from scratch)"
    - **Pipeline**: Offer both `/validate-idea` and `/validate-game-idea` so the user can choose the correct pipeline for their new concept.
- **Otherwise, for existing/brownfield codebases (containing files outside the system dotfolder)**:
  - Determine if it is a **Product** or **Game** (or other).
  - Determine if it is greenfield or brownfield.
  - Set the recommended pipeline: `validate-idea` → `explore-idea` → `design` → `develop` → `launch` → `iterate` → `retro` OR `validate-game-idea` → `explore-game-idea` → `design` → `develop` → `launch` → `iterate` → `retro`.

Write these findings to `artifacts/memory/project-context.md`. Do not include any dotfolder files or scripts in your analysis.

## Step 5: Set operation mode

Default to `semi-autonomous` in `artifacts/memory/project-context.md`.

## Step 6: Report

Return a summary:

```
## Project Initialized
**Name:** {detected project name OR "Blank Project / New Product Concept"}
**Type:** {product/game/other OR "Blank/Undetermined (Ready for Idea Validation)"}
**Stack:** {detected stack OR "None (Starting from scratch)"}
**Pipeline:** {recommended pipeline OR "validate-idea / validate-game-idea"}
**Operation Mode:** semi-autonomous

### Available Skills
- `/validate-idea` — Stress-test your idea before investing research
- `/validate-game-idea` — Stress-test game concepts before production
- `/explore-idea` — Market, competitor, and user research
- `/explore-game-idea` — Genre market and player research
- `/design` — PRD, user stories, product specs
- `/develop` — Architecture, planning, implementation, QA
- `/launch` — Release readiness, deployment, monitoring
- `/iterate` — Post-launch improvements from user data
- `/incident` — Production incident response
- `/retro` — Post-cycle review and process improvement
- `/status` — Quick project state snapshot
- `/memory` — Search archived project context
- `/phase` — Show/switch phases
- `/squad` — Show available agent squads and switch active squad
- `/delegate` — Quick I/O offload
- `/plan` — Standalone execution planning
- `/review` — Standalone code review
- `/test` — Run tests, summarize failures
- `/kanban` — Display and update Kanban board

### Next Step
Start with `/validate-idea` (or `/validate-game-idea`) if you have an unvalidated concept.
Or use `/status` to see the current project state.
```
