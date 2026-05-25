# Vespyr — Multi-Agent Engine

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
