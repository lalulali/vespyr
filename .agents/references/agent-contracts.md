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
