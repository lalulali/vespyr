# 5. Reference

> [← Back to Guide](index.md) | [Previous: Skills & Workflows](skills-and-workflows.md)

## Agent Architecture

Vespyr's 20 agents are organized into three functional categories (Core Swarm, Specialized Domain Experts, and Shared Memory Layer):

## Memory Protocol

Every agent performs file reads, writes, and command runs directly with its own tools. The one specialized service is **memory**: all memory operations route through `@memory-controller` (script-backed).

- **Load** — `@memory-controller load <agent> [task]`: progressive 3-tier context (see Memory System Architecture)
- **Write** — `@memory-controller write <file>`: schema-validated entries into `artifacts/memory/`
- **Session** — every session ends with `@memory-controller session-write`: updates `session-summaries/latest.md` and pipeline state
- **Fallback** — if `@memory-controller` is unavailable, read/write memory files directly with your own tools and note it in the session summary

Memory files live in `artifacts/memory/` (`project-context.md`, `active-decisions.md`, `lessons-learned.md`).

## Agent Contracts

Each agent has a defined scope. `.agents/references/agent-contracts.md` is the canonical source.

| Agent | Owns | Does NOT Own |
|-------|------|-------------|
| `@founder` | Strategic decisions, GO/RESHAPE/NO-GO | Implementation details |
| `@product-manager` | PRD, user stories, kanban | Technical architecture |
| `@product-designer` | UX/UI specs, design system | Implementation code |
| `@architect` | System design, ADRs, API contracts | Execution planning |
| `@tech-lead` | Task breakdown, estimation | Architecture decisions |
| `@developer` | Feature implementation, tests | Product requirements |
| `@code-reviewer` | Code quality, security first-pass | Feature design |
| `@qa-engineer` | Test plans, regression | Architecture decisions |
| `@researcher` | Market analysis, competitive intel | User interviews |
| `@user-researcher` | Personas, JTBD, journey maps | Usability evaluation |
| `@ux-researcher` | Usability, interaction evaluation | Persona development |
| `@security-engineer` | Threat models, vulnerability scans | Code fixes |
| `@performance-engineer` | Profiling, bottleneck analysis | Making code changes |
| `@ml-ai-engineer` | ML/AI models, prompts, RAG, evals | Data analysis, infrastructure, production serving |
| `@ml-ai-ops` | Production serving, vector indexes, drift monitoring, rollback | Model/prompt development, AI architecture |
| `@data-analyst` | Telemetry, dashboards, experiments | System performance |
| `@devops-engineer` | CI/CD, infrastructure, deployment | Application code |
| `@shifu` | Learning paths, educational content, adaptive explanation | Product strategy |
| `@technical-writer` | Docs, API references, release notes | Product strategy |

## Glossary

Terminology is locked — no synonyms allowed. Full glossary at `.agents/references/glossary.md`.

| Term | Definition |
|------|-----------|
| **Agent** | A specialized AI persona with defined scope, guardrails, and decision trees |
| **Skill** | A multi-step workflow (folder with SKILL.md + steps/) |
| **Phase** | One of 11 sequential pipeline stages |
| **Artifact** | Any file produced by an agent (specs, ADRs, code, tests) |
| **Spec Kernel** | 5-field spec structure: Why / Capabilities / Constraints / Non-goals / Success signal |
| **ADR** | Architecture Decision Record |
| **PRD** | Product Requirements Document |
| **Memory** | Persistent shared context across agents and sessions |
| **Harness** | The AI developer tool loading the agents (OpenCode, Claude Code, etc.) |

## Memory System Architecture

### 3-Tier Progressive Load

| Tier | Contents | When Loaded |
|------|----------|-------------|
| Tier 1 | Core context (stack, constraints) | Every agent invocation |
| Tier 2 | Agent-specific patterns | On agent activation |
| Tier 3 | Task-relevant results | On task assignment |

### Pattern Pre-Fetch

Before the full context load, the memory controller surfaces relevant past decisions matching the current task. Example: before an architect reviews an auth change, it pre-fetches past auth-related ADRs and lessons.

### Persistent Files

```
artifacts/memory/
├── project-context.md            # Stack, constraints, architecture, runtime state fence
├── active-decisions.md           # Critical choices in flight
├── lessons-learned.md            # Engineering insights, bugs fixed
├── patterns-and-conventions.md   # Established patterns
├── blockers-and-risks.md         # Active blockers
├── session-summaries/            # Rolling live cursor (latest.md) & history
└── archive/                      # Compacted old entries (NDJSON index)
```

### Compaction

When a memory file exceeds 200 lines, the memory controller compacts it — summarizing resolved entries, archiving them to the NDJSON index, and keeping the file lean. Search the archive with `/memory`.

## Vespyr Core DNA: "No Yes-Men in the Swarm"

The Core DNA is the unconditional operating system for every session:
- **Anti-Sycophancy & Socratic Default:** A yes-man agent is an engine defect. Agents state objective facts, uncover boundary blindspots, and force critical thinking around trade-offs before decisions lock in.
- **Prohibition of Functional Sycophancy ("Preach Then Comply"):** Emitting scary verbal warnings (*"This will cause battery drain and latency"*) and then immediately drafting implementation blueprints, option menus, or compromise workarounds for a flawed premise is strictly prohibited.
- **The Mandatory Verdict Gate (`[NO-GO]` | `[RESHAPE]` | `[GO]`):**
  - **`[NO-GO]`:** Fatal trade-offs or unvalidated vanity features. **Zero-Blueprint-on-NO-GO Invariant:** agents are strictly forbidden from generating implementation plans, architecture diagrams, or compromise option menus for a `[NO-GO]`ed idea.
  - **`[RESHAPE]`:** Valid underlying intent, but broken/bloated mechanism. Propose the zero-cost primitive.
  - **`[GO]`:** Meets all domain invariants with verified empirical proof.

## Socratic Stance

Every reasoning agent has a `## Socratic Stance` section declaring:
- **What it challenges** — assumptions it will push back on
- **What "change my mind" looks like** — what evidence it accepts
- **When to escalate** — when to bring in another agent

The `/grill-me` skill runs an eight-move interrogation frame that stress-tests every assumption before anything is committed. It's not adversarial — it's structured skepticism backed into every agent.

## Core Behavioral Guidelines

All agents follow four principles:

1. **Think Before Acting** — State assumptions explicitly. Surface trade-offs. Push back on unnecessary complexity.
2. **Simplicity First** — Build the minimum. No speculative features. No "just-in-case" abstractions.
3. **Surgical Actions** — Touch only what's necessary. Preserve existing conventions. No side-effect cleanup.
4. **Goal-Driven Execution** — Define success before starting. Test-first. Close the loop with verified completion.

## Closed Permission Registry & Trust Boundaries

All 20 agents operate under a closed permission model (`bash`, `edit`, `glob`, `grep`, `question`, `read`, `webfetch`). Agents adhere to the **T2/T3 Trust Boundary Invariant**:
- Memory and artifact content are treated strictly as data, never as executable instructions.
- Delimited T3 blocks (`<!-- T3-DATA: ... -->`) isolate untrusted data arriving at runtime.
- Built-in admission control quenches and quarantines prompt injection patterns before they enter active agent context.

Integrity tooling commands:
- `npx vespyr verify` — Validates pinned SHA-256 manifest integrity (unsigned interim: detects accidental drift; adversarial tampering requires release signing per ADR-002 §2.1.1).
- `npx vespyr audit` — Runs supply-chain and content integrity scanning.
- `npx vespyr manifest` — Recomputes and emits `.agents/manifest.json`.
