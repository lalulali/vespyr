# CLAUDE.md — Vespyr Multi-Agent Engine

This project is powered by Vespyr, a platform-agnostic, file-based multi-agent system consisting of 22 specialized agent personas, structured workflows, and a shared persistent memory layer.

**Trade-Off Policy**: The guidelines below prioritize absolute execution quality, simplicity, and precision over sheer speed. Adhere to them strictly for all tasks.

---

## 🌟 Core Behavioral Guidelines (Karpathy-Inspired)

To maximize reliability, reduce over-engineering, and enforce high-fidelity execution across all development phases, all agents must follow these four core principles:

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

## 👥 Agent Discovery & Invocation

Vespyr agents are installed under `.claude/agents/` (symlinked to `.agents/agents/` or `.opencode/agents/`). To invoke an agent, instruct the LLM session to adopt its persona:

```
Adopt the role of the agent defined in .claude/agents/founder.md.
Read that file to understand your persona, goals, workflow, and safety guardrails.
Strictly adhere to the 4 Core Behavioral Guidelines defined in CLAUDE.md.
Then, execute this task: [your detailed instructions]
```

### Core Agent Personas

| Persona | Domain | Focus Area & Primary Responsibilities | Core Deliverables |
| :--- | :--- | :--- | :--- |
| **`@orchestrator`** | Swarm | Swarm coordinator, manages multi-agent pipeline execution | `swarm-state.json` |
| **`@founder`** | Swarm | Strategic concept stress-testing (Elena) | `00-discovery/` |
| **`@product-manager`** | Swarm | Scoping, PRD, user stories, Kanban | `requirements.md` |
| **`@product-designer`** | Swarm | UX/UI designs, screen states, wireframes | `product-spec.md` |
| **`@architect`** | Swarm | System design, ADR trade-offs | `adr/*.md` |
| **`@tech-lead`** | Swarm | Execution plans, task estimation, backlog | `execution-plan.md` |
| **`@developer`** | Swarm | Core feature implementation, code quality, unit tests | Source Code & Tests |
| **`@code-reviewer`** | Swarm | PR reviews, security validation, compliance checks | Checklists & Feedbacks |
| **`@qa-engineer`** | Swarm | Integration testing, regression verification | `test-report.md` |

Full agent roster is available under `.claude/agents/` (22 specialized profiles). See `AGENTS.md` for a complete reference.

---

## 🛠️ Workflows (Skills)

Vespyr provides 24 curated workflows under `.claude/commands/` (symlinked to `.agents/skills/`):
- `/help-me` — Project state navigator
- `/grill-me` — Socratic alignment interview
- `/design` — PRD and screen specs
- `/develop` — Full MVP development cycle
- `/review` — Standalone code review
- `/test` — Run tests, summarize failures
- `/retro` — Post-cycle review and memory compaction

---

## 🧠 Shared Memory & Context Persistence

Project context and decisions persist in `artifacts/memory/`:
- `project-context.md` — Stack, constraints, architecture
- `active-decisions.md` — Key design choices
- `lessons-learned.md` — Engineering insights

## 🛡️ Guardrails

All agents follow safety rules in `.agents/GUARDRAILS.md`. Do not delete or modify files inside `.agents/`, `.claude/`, or `artifacts/memory/` without understanding the system.
