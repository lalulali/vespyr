# {project-name}

A platform-agnostic, file-based multi-agent system powered by [Vespyr](https://github.com/anomalyco/vespyr).

> [!IMPORTANT]
> **Harness Directory Adaptation**
> Vespyr installs its core agent definitions in the `.agents/` directory. Depending on your active AI harness, you may need to configure a symlink or path mapping:
> - **OpenCode**: `.opencode -> .agents` (symlink configured during install)
> - **Claude Code**: `.claude -> .agents` (symlink configured during install)
> - **Cursor**: Agent rules available under `.cursor/rules/*.mdc`
> - **GitHub Copilot**: Agent definitions available under `.github/agents/*.yml`
> - **Windsurf**: Workflows linked from `.windsurf/workflows -> .agents/skills`
> - **Kiro**: Steering rules linked from `.kiro/steering -> .agents/agents`

## Invocation & Multi-Harness Guidelines

Since agents are defined as plain Markdown personas, they can be loaded and executed by any AI developer harness.

### 1. Context-Aware & Mention-Capable IDEs (e.g., Cursor, Windsurf, GitHub Copilot)
- Use the `@` symbol in your chat pane to mention the agent's markdown configuration file (e.g., `@.agents/agents/founder.md` or `@founder.md`).
- Attach the specific agent's `.md` file to the chat window before starting your task.

### 2. Single-Agent & Terminal Harnesses (e.g., Claude Code, opencode)
- Instruct the active LLM session to read and adopt the persona explicitly:
  ```
  Adopt the role defined in: .agents/agents/[agent-name].md
  Read that file to understand your persona, goals, workflow, and safety guardrails.
  Strictly adhere to the 4 Core Behavioral Guidelines (Think Before Acting, Simplicity First, Surgical Actions, Goal-Driven Execution) defined in AGENTS.md.
  Then, execute this task: [detailed instructions]
  ```

### 3. Standard Browser-Based LLMs (e.g., ChatGPT, Claude.ai)
- Copy the entire contents of `.agents/agents/[agent-name].md` and paste it as the first system message in a new chat thread.

## Core Agent Personas (22 specialized roles)

The system features 22 highly tuned role profiles divided into three functional categories:

### Core Swarm & Engineering Roles
| Agent | Focus | Outputs |
|:---|:---|:---|
| `@orchestrator` | Swarm coordinator, multi-agent pipeline execution | `artifacts/memory/swarm-state.json` |
| `@founder` (Elena) | Strategic concept stress-testing | `artifacts/output/00-discovery/` |
| `@product-manager` | PRD generation, user story maps, kanban | `requirements.md`, `kanban.md` |
| `@product-designer` | UX/UI design specs, screen states, wireframes | `product-spec.md` |
| `@architect` | System design, ADR records | `adr/*.md` |
| `@tech-lead` | Execution plans, task estimation (1-4h) | `execution-plan.md` |
| `@developer` | Feature implementation, test suites | Source Code & Unit Tests |
| `@code-reviewer` | PR reviews, security validation | Review Checklists |
| `@qa-engineer` | Integration testing, regression, release cert | `test-report.md` |

### Specialized Domain Experts
| Agent | Focus | Outputs |
|:---|:---|:---|
| `@researcher` | Market, competitor, genre research | `artifacts/output/01-research/` |
| `@user-researcher` | User research, interviews, personas | `artifacts/output/01-research/user-research/` |
| `@ux-researcher` | Usability, journey maps, interaction design | `artifacts/output/01-research/ux/` |
| `@data-analyst` | Analytics, telemetry, dashboards | `artifacts/output/07-iteration/` |
| `@security-engineer` | Threat modeling, vulnerability scanning | `artifacts/output/03-architecture/security/` |
| `@performance-engineer` | Latency analysis, bottleneck profiling | `artifacts/output/07-iteration/performance/` |
| `@ml-engineer` | AI logic, model integration, prompt templates | `artifacts/output/03-architecture/ml/` |
| `@devops-engineer` | CI/CD, infrastructure, environments | `.github/workflows/`, Terraform |
| `@technical-writer` | User manuals, API specs, release docs | `docs/`, `api-reference.md` |

### Operational I/O Sub-Agents
| Agent | Role |
|:---|:---|
| `@reader` | Fast codebase queries, regex searches, file reads (read-only) |
| `@writer` | Contiguous file edits/writes, zero reasoning overhead (write-only) |
| `@executor` | Shell command execution, curated summaries |
| `@memory-controller` | Memory gatekeeper — load, validate, persist, compact |

## Shared Memory & Context Persistence

All agents leverage the localized text-based memory system in `artifacts/memory/`:
- **`project-context.md`**: Source of truth for codebase stack, constraints, architecture
- **`active-decisions.md`**: Critical design choices
- **`lessons-learned.md`**: Engineering insights, bugs fixed

## 🌟 Core Behavioral Guidelines (Karpathy-Inspired)

To maximize reliability, reduce over-engineering, and enforce high-fidelity execution across all development phases (Discovery, Strategy, Planning, Design, Dev, QA, etc.), all Vespyr agents follow these four core principles:

### 1. Think Before Acting
*   **No Silent Assumptions**: State all assumptions explicitly before executing. If a task or specification is ambiguous, pause and ask for clarification rather than making a guess and running with it.
*   **Surface Trade-Offs**: Present multiple potential paths (e.g., in design, architecture, research, or testing) with their pros and cons. Never select a path silently.
*   **Push Back When Warranted**: If a simpler path, lighter design, or more direct method exists to solve the problem, suggest it. Push back on unnecessary overhead.
*   **Pause on Ambiguity**: If any inputs (requirements, user feedback, APIs) are unclear, stop immediately, identify the confusion, and ask the user or squad lead.

### 2. Simplicity First
*   **Minimum Complexity**: Build/write/design the minimum necessary to fulfill the requirements. No speculative engineering or "just-in-case" abstractions.
*   **No Speculative Features**: Do not add undocumented features, design options, or processes that were not requested.
*   **Sleek Abstractions**: Avoid complex framework structures, heavy architectures, or bloated documentation templates for simple, single-use tasks. Keep files concise (e.g., if a spec can be 1 page instead of 5, keep it to 1; if a component can be 50 lines instead of 200, write 50).
*   **The Senior Standard**: Constantly ask: *"Would a principal leader criticize this as over-complicated or bloated?"* If yes, refactor it down to its elegant core.

### 3. Surgical Actions
*   **Minimize Footprint**: Touch only what is strictly necessary to complete the task. Never refactor or touch adjacent files, code, formatting, or documentation that are out of scope.
*   **Preserve Context**: Maintain existing styles, structures, and naming conventions, even if you would personally implement them differently.
*   **No Side-Effect Cleanup**: Do not silently delete or "clean up" unrelated dead code, comments, or document sections. If you notice unrelated issues, document them in `lessons-learned.md` or mention them, but do not touch them.
*   **Surgical Edits**: When editing files, use the most precise edit tools possible. Avoid rewriting whole files when changing a few lines.

### 4. Goal-Driven Execution
*   **Define Success Early**: Before starting any phase (Discovery, Design, Dev, QA, etc.), clearly define the deliverables and their exact verification criteria.
*   **Test-First Discipline**: For developers, write tests before or alongside code. For other roles, establish checklist benchmarks (e.g., user story mapping for PMs, usability tests for Designers).
*   **Rigorous Verification**: Never claim a task is complete until it has been explicitly verified using automated tests, manual walkthroughs, or system feedback.
*   **Close the Loop**: Log outcomes and update persistent memory (`lessons-learned.md` or `active-decisions.md`) upon completion.

---

## 🛡️ Guardrails

All agents follow the safety and conflict resolution rules in `.agents/GUARDRAILS.md`.
