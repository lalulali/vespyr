# 6. Reference

> [← Back to Guide](index.md) | [Previous: Structural Graphs](structural-graphs.md)

## Agent Architecture

Vespyr's 21 agents are organized into three layers:

```
┌──────────────────────────────────────────────┐
│          REASONING AGENTS (17)               │
│  founder, PM, architect, developer, ...      │
│  NO file access, NO shell — by design.       │
│  Must delegate all I/O to sub-agents.        │
└──────────────────┬───────────────────────────┘
                   │ delegates to
                   ▼
┌──────────────────────────────────────────────┐
│          I/O SUB-AGENTS (3)                  │
│  @reader     — reads & summarizes            │
│  @writer     — writes & edits precisely      │
│  @executor   — runs shell commands           │
└──────────────────┬───────────────────────────┘
                   │ context via
                   ▼
┌──────────────────────────────────────────────┐
│          @memory-controller (1)              │
│  3-tier progressive load + pattern           │
│  pre-fetch + auto-compaction                 │
└──────────────────────────────────────────────┘
```

### Why I/O Is Denied

Reasoning agents (founder, developer, architect, etc.) cannot touch files or run commands. This isn't a limitation — it's the architecture:

1. **Context efficiency** — Reasoning agents stay at ~1,000 tokens. Without I/O noise, context windows stay lean. 85-95% API cost savings compared to agents that handle their own I/O.
2. **Structured output** — Sub-agents produce consistent, predictable output formats. No ad-hoc file diffs in the reasoning stream.
3. **Auditability** — Every file read and write goes through narrow, specialized agents. The delegation audit script (`delegation_audit.js`) tracks compliance.

### Delegation Policy

| Threshold | Rule |
|-----------|------|
| ≤3 small files | Read directly |
| >3 files | Delegate to `@reader` |
| ≤50 lines | Write directly |
| >50 lines | Delegate to `@writer` |
| Any shell command | Delegate to `@executor` |
| Any memory operation | Delegate to `@memory-controller` |

Direct I/O outside thresholds requires `[DIRECT-IO-JUSTIFIED: reason]` in the response.

## Agent Contracts

Each agent has a defined scope. `.agents/references/agent-contracts.md` is the canonical source.

| Agent | Owns | Does NOT Own |
|-------|------|-------------|
| `@founder` | Strategic decisions, GO/PIVOT/KILL | Implementation details |
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
| `@ml-engineer` | ML pipelines, model integration | Business metrics |
| `@data-analyst` | Telemetry, dashboards, experiments | System performance |
| `@devops-engineer` | CI/CD, infrastructure, deployment | Application code |
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
| **Squad** | A team preset of activated agents |
| **Harness** | The AI developer tool loading the agents (OpenCode, Claude Code, etc.) |

## Memory System Architecture

### 3-Tier Progressive Load

| Tier | Contents | Size | When Loaded |
|------|----------|------|-------------|
| Tier 1 | Core context (stack, constraints) | ~200 tokens | Every agent invocation |
| Tier 2 | Agent-specific patterns | ~300 tokens | On agent activation |
| Tier 3 | Task-relevant results | ~500 tokens | On task assignment |

### Pattern Pre-Fetch

Before the full context load, the memory controller surfaces relevant past decisions matching the current task. Example: before an architect reviews an auth change, it pre-fetches past auth-related ADRs and lessons.

### Persistent Files

```
artifacts/memory/
├── project-context.md            # Stack, constraints, architecture
├── active-decisions.md           # Critical choices in flight
├── lessons-learned.md            # Engineering insights, bugs fixed
├── patterns-and-conventions.md   # Established patterns
├── blockers-and-risks.md         # Active blockers
├── pending-questions/            # Open questions by topic
├── agent-notes/                  # Per-agent observations
├── archive/                      # Compacted old entries (NDJSON index)
└── structural/                   # Code-graph.json + doc-graph.json
```

### Compaction

When a memory file exceeds 200 lines, the memory controller compacts it — summarizing resolved entries, archiving them to the NDJSON index, and keeping the file lean. Search the archive with `/memory`.

## Socratic Stance

Every reasoning agent has a `## Socratic Stance` section declaring:
- **What it challenges** — assumptions it will push back on
- **What "change my mind" looks like** — what evidence it accepts
- **When to escalate** — when to bring in another agent

The `/grill-me` skill runs a 7+1-branch decision tree that stress-tests every assumption before a single line of code is written. It's not adversarial — it's structured skepticism backed into every agent.

## Core Behavioral Guidelines

All agents follow four principles:

1. **Think Before Acting** — State assumptions explicitly. Surface trade-offs. Push back on unnecessary complexity.
2. **Simplicity First** — Build the minimum. No speculative features. No "just-in-case" abstractions.
3. **Surgical Actions** — Touch only what's necessary. Preserve existing conventions. No side-effect cleanup.
4. **Goal-Driven Execution** — Define success before starting. Test-first. Close the loop with verified completion.
