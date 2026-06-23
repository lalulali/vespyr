# Vespyr: The AI Agent Team for Product Development

![Vespyr Version](https://img.shields.io/badge/version-1.8.0-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Most AI coding assistants struggle because they are asked to do everything at once. They build before they design, skip writing tests, and lose context as files grow.

**Vespyr** solves this by installing a structured, file-based product development team directly inside your repository. It provides 21 specialized agent personas that collaborate through a shared workflow—taking your project from a raw idea to validated, tested production code.

---

## ⚡ The Team in Your Repo

Vespyr divides the software development lifecycle into clean, sequential gates:

*   **Discovery & Research** — Validate ideas, assess market sizing, analyze competitors, and map user personas.
*   **Strategy & Design** — Write clear PRDs (requirements) and detailed screen specifications with mandatory bi-directional tracing.
*   **Architecture & Planning** — Make stack trade-off decisions, write Architecture Decision Records (ADRs), and scaffold the backlog.
*   **Development & Quality** — Implement clean code, run code reviews, audit security vulnerabilities, and verify every acceptance criterion with tests.
*   **Operations & Iteration** — Set up CI/CD pipelines, generate API documentation, track live product metrics, and run blameless RCAs for production incidents.

---

## 🚀 Easy Installation

Vespyr comes with an interactive CLI setup wizard that configures the agent engine for your preferred developer environment.

To install Vespyr into your project:

```bash
# Add to your project dependencies
npm install vespyr

# Run the setup wizard
npx vespyr
```

### What the installer does:
1. **Scaffolds the directory tree**: Sets up `artifacts/memory/` and `artifacts/output/` where agents record state and write documents.
2. **Generates starter memory**: Bootstraps the `project-context.md`, `active-decisions.md`, and `patterns-and-conventions.md` files.
3. **Tailors to your IDE harness**: Creates symlinks and custom rules specifically for your developer setup:
   * **Cursor**: Compiles the 21 agents into Cursor Rules (`.cursor/rules/*.mdc`)
   * **Claude Code**: Creates `.claude` symlink and scaffolds a workspace `CLAUDE.md`
   * **Windsurf**: Maps workflows to `.windsurf/workflows` and rules to `.windsurfrules`
   * **GitHub Copilot**: Transpiles instructions into `.github/agents/*.yml`
   * **Kiro**: Scaffolds `.kiro/steering/` manual agent folders
   * **Hermes Agent**: Links skills to `.hermes/skills`
   * **OpenClaw**: Scaffolds `.openclaw/workspace/`
   * **OpenCode**: Links `.opencode` to your local agent directory

### CLI Flags

You can bypass the wizard and automate the setup using command-line flags:

```bash
# Install with defaults for Cursor and Claude Code in a specific directory
npx vespyr --yes --target /path/to/my-project --harness cursor,claude

# Sync agent documentation definitions
npx vespyr --sync-docs

# Dry run to see what would change
npx vespyr --dry-run
```

---

## 🛠 How It Works

Vespyr uses a modular **Thinking vs. I/O** separation to keep models fast, accurate, and cost-effective:

```
┌─────────────────────────────────────────────────────────────┐
│                    THINKING AGENTS                          │
│  (Reasoning, Decision-Making, Design)                       │
│  • Founder, Product Manager, Architect, Developer, etc.     │
└─────────────────────────────────────────────────────────────┘
                            │ delegates to
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    I/O AGENTS (Utility)                     │
│  • @writer  — Focused, exact file writes and edits          │
│  • @executor — Command execution with noise-stripped logs    │
│  • @reader  — Structured codebase reads and regex searches  │
└─────────────────────────────────────────────────────────────┘
                            │ reads/writes via
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  @memory-controller                         │
│  • Compiles context using memory_filter.js                 │
│  • Automatic NDJSON archive search and compaction           │
└─────────────────────────────────────────────────────────────┘
```

### The Memory Gateway (`memory_filter.js`)

Feeding a massive codebase and folder history into an LLM on every turn is slow and expensive. Vespyr uses a deterministic keyword and recency filter. 

When an agent invokes the `@memory-controller`, it pulls a highly compressed bundle of context (typically ~1,000 tokens instead of 15,000+), preventing context drift and saving 85–95% on API costs.

---

## 👥 Core Squads & Agents

Vespyr organizes its 21 specialized agents into roles that activate based on your project phase:

| Phase / Category | Agent Role | Primary Responsibility | Core Outputs / Role |
| :--- | :--- | :--- | :--- |
| **0. Discovery & Research** | `@founder` (Elena) | Socratic stress-testing of raw ideas | `validation-brief.md` |
| | `@researcher` (Iris) | Market sizing and competitor research | `market-analysis.md` |
| | `@user-researcher` (Paige) | Persona mapping & jobs-to-be-done | `user-personas.md` |
| | `@ux-researcher` (Zara) | Usability, journey maps, interaction patterns | `ux-research-report.md` |
| **1. Strategy & Design** | `@product-manager` (Sarah) | Requirements mapping with full traceability | `requirements.md` |
| | `@product-designer` (Ivy) | UI specifications and screen states | `product-spec.md` |
| **2. Architecture & Plan** | `@architect` (Vera) | System blueprints & data models | `03-architecture/adr/` |
| | `@tech-lead` (Grant) | Backlog planning and task estimation | `kanban.md` |
| **3. Dev & Quality** | `@developer` (Rex) | Test-driven feature implementation | Production Code |
| | `@code-reviewer` (Scout) | Read-only security and design audits | Review Comments |
| | `@qa-engineer` (Nina) | Integration & edge-case test verification | `test-report.md` |
| | `@security-engineer` (Victor) | OWASP vulnerability scans & threat models | `findings-report.md` |
| | `@performance-engineer` (Felix) | Latency profiling and query optimization | `performance-report.md` |
| **4. Ops & Optimization** | `@devops-engineer` (Axel) | CI/CD automation & infra orchestration | Infrastructure Configs |
| | `@technical-writer` (Clara) | Documentation, runbooks, and changelogs | API References & Guides |
| | `@ml-engineer` (Kai) | ML baseline models and pipeline drift | ML ADRs & Baselines |
| | `@data-analyst` (Nova) | Telemetry, instrumenting metrics & A/B tests | `measurement-plan.md` |
| **5. Operational I/O** | `@reader` (Page) | High-speed read-only file queries & search | Code Reads |
| | `@writer` (Quill) | Contiguous file edits & write redirection | File Writes |
| | `@executor` (Max) | Shell command execution & log summary | Bash Execution |
| | `@memory-controller` (Mnemos) | Context filtering, NDJSON archive gatekeeper | Shared Memory |

---

## 🧭 Navigating Next Steps

Once installed, use these built-in workflows (skills) to drive the lifecycle:

*   **/help-me** — Scans your workspace and suggests what artifact is missing or what phase to tackle next.
*   **/validate-idea** — Stress-tests a new concept before committing design or engineering time.
*   **/grill-me** — Engages in a relentless Socratic alignment interview to iron out design decisions.
*   **/squad** — Switch active teams (e.g. `startup` for validation, `build` for coding, `ship` for deployment) to keep your context lean.
*   **/memory** — Scan your archived memory logs using keyword scoring.

---

## 🎨 Customizing the System

Every agent and workflow is defined in plain Markdown. Customize how the team behaves by editing:
*   **Agents**: `.agents/agents/*.md` — adjust guidelines, tools, permissions, and Socratic questions.
*   **Squads**: `.agents/squads/*.md` — define custom team subsets.
*   **Templates**: `.agents/templates/*.md` — alter standard output formats for PRDs, user stories, and specs.

---

## ⚖️ License & Support

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
For issues or feature requests, open a ticket on [GitHub Issues](https://github.com/lalulali/vespyr/issues).

---
**Built by a product team that got tired of context-switching.**
