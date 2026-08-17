# 4. Skills & Workflows

> [← Back to Guide](index.md) | [Previous: Configuration](configuration.md) | [Next: Structural Graphs →](structural-graphs.md)

## All Slash Commands

Vespyr organizes complex operations into atomic skills. Each skill is a folder with a `SKILL.md` router + `steps/` directory.

### Curated Workflows (Lifecycle & Execution)

| Command | Phase | Description |
|---------|-------|-------------|
| `/validate-idea` | -1 | Stress-test product concepts before research |
| `/validate-game-idea` | -1 | Stress-test game concepts before production |
| `/explore-idea` | 0-1 | Market, competitor, and user research |
| `/explore-game-idea` | 0-1 | Genre market and player research |
| `/unpack-problem` | 0-1 | Problem-first exploration before solution ideation |
| `/shape-up` | 1-2 | Bridge semi-cooked ideas into design-ready specs (standalone or lifecycle) |
| `/design` | 2-3 | PRD and screen specs creation |
| `/motion` | 2-4 | Motion research, motion specification, and explicit handoff to `/develop` |
| `/plan` | 4 | Standalone or sprint execution planning |
| `/develop` | 5 | MVP development cycle |
| `/launch` | 6 | Release readiness and deployment |
| `/iterate` | 7 | Post-launch behavior improvements |
| `/retro` | 9 | Post-cycle review and memory compaction |
| `/incident` | Operational | Production incident response and triage |

### Design Thinking & Discovery

| Command | Description |
|---------|-------------|
| `/research-plan` | Research goals, methodology, and interview guide |
| `/empathy-map` | User empathy quadrant canvas (Says/Thinks/Does/Feels) |
| `/journey-map` | User touchpoint and emotional state journey mapping |
| `/jtbd` | Jobs-to-be-Done statements + How Might We opportunity questions |
| `/discovery-report` | Compile design thinking outputs into unified report |
| `/root-cause` | Socratic 5-Whys and Fishbone root cause analysis |
| `/validation-patterns` | Apply validation from 30-method catalog |
| `/brainstorming` | Select from 60 brainstorming methods (SCAMPER, Six Hats, etc.) |

### Learning & Teaching

| Command | Description |
|---------|-------------|
| `/teach-me` | Personal learning partner — Quick, Explain, or Deep Dive on any topic |
| `/craft-lesson` | Create multi-format educational materials (syllabus, detailed handbook, cheatsheet, presentation, class, video script) |

### Socratic Alignment & Intelligence

| Command | Description |
|---------|-------------|
| `/grill-me` | Relentless Socratic alignment and stress-testing interview |
| `/elicitation` | 98 structured methods to push LLM to refine output |
| `/round-table` | Multi-agent stage-based roundtable discussions across all 11 phases and 20 agent roles |

### Data & Analytics

| Command | Description |
|---------|-------------|
| `/analyze-data` | Data analysis companion — EDA, visualization, metric co-piloting |

### Operations & State

| Command | Description |
|---------|-------------|
| `/help-me` | Conversational project navigator and co-pilot |
| `/status` | Quick snapshot of current project state |
| `/sprint-status` | Display pipeline status as an interactive Kanban table |
| `/phase` | Show/switch phases and list phase artifacts |
| `/kanban` | Display and update Kanban board |
| `/memory` | Search archived project context |

### Engineering Intelligence & Quality Gates

| Command | Description |
|---------|-------------|
| `/review` | Standalone read-only code review and security audit |
| `/test` | Run tests, analyze failures, and generate QA reports |
| `/code-graph` | Generate/scan codebase dependency graphs |
| `/doc-graph` | Generate/scan documentation links and trace coverage |
| `/humanize` | AI-writing style detector and normalizer |

### Authoring & Customization

| Command | Description |
|---------|-------------|
| `/create-skill` | Create new skills, major rewrites, and evals |
| `/customize-skill` | Surgically customize an existing skill |
| `/create-agent` | Scaffold and register new agent personas |
| `/customize-agent` | Preview TOML customization declarations for agents |

## Pipeline Phase Table

Vespyr's 11-phase pipeline. `.agents/references/phase-table.md` is the canonical source.

| Phase | ID | Folder | Primary Skill |
|-------|----|--------|---------------|
| Validation | 1 | `01-discovery/` | `/validate-idea` |
| Discovery | 1 | `01-discovery/` | `/unpack-problem` |
| Research | 2 | `02-research/` | `/explore-idea` |
| Shaping Bridge | 1-2 | `01-discovery/` | `/shape-up` |
| Strategy | 3 | `03-strategy/` | `/design` |
| Architecture | 4 | `04-architecture/` | Architecture ADRs |
| Planning | 5 | `05-planning/` | `/plan` |
| Implementation | 6 | `root` | `/develop` |
| Launch | 7 | `06-launch/` | `/launch` |
| Iteration | 8 | `07-iteration/` | `/iterate` |
| Documentation | 9 | (cross-cutting) | Tech writer |
| Retrospective | 10 | `09-retro/` | `/retro` |

## How Skills Work

Every skill follows the same architecture:

```
.agents/skills/<skill-name>/
├── SKILL.md              # Router: ≤60 lines, defines when/how to use
└── steps/                # Operational steps (30-80 lines each)
    ├── step-01-read.md
    ├── step-02-plan.md
    └── ...
```

Each step file declares:
- **Halt conditions** — what must be true before proceeding
- **Delegation contract** — which sub-agents handle reads, writes, and runs
- **Output spec** — what artifact is produced

### Multi-Mode Skills

Some skills auto-detect their mode based on existing artifacts:

```
.agents/skills/design/
├── SKILL.md
└── steps/
    ├── step-01a-load-prd-brief.md   # Create mode (run when no PRD/spec exists)
    ├── step-01b-load-existing.md    # Edit mode (PRD/spec exists and needs changes)
    ├── step-01c-heuristic-eval.md   # Validate mode (validating an existing design)
    └── ...
```

### Resumable Execution

Output documents include a `stepsCompleted` array in their YAML frontmatter:

```yaml
stepsCompleted: [1, 2, 3]
```

Re-invoke the skill and it automatically resumes from step 4. No state needs to be maintained in the agent's context.

### Multi-Agent Roundtable (/round-table)

`/round-table` orchestrates multi-agent group discussions where each agent acts as a real subagent with independent reasoning. The skill dynamically selects stage-aware agent rosters across all 11 product development phases:

- **Validation (Phase -1)**: `@founder`, `@product-manager`, `@researcher`
- **Discovery & Research (Phases 0 & 1)**: `@founder`, `@researcher`, `@user-researcher`, `@ux-researcher`
- **Strategy & Requirements (Phase 2)**: `@product-manager`, `@founder`, `@product-designer`, `@user-researcher`
- **Architecture & System Design (Phase 3)**: `@architect`, `@tech-lead`, `@security-engineer`, `@performance-engineer`
- **Planning & Breakdown (Phase 4)**: `@tech-lead`, `@product-manager`, `@architect`, `@devops-engineer`
- **Development & Implementation (Phase 5)**: `@tech-lead`, `@developer`, `@qa-engineer`, `@code-reviewer`
- **Launch & Deployment (Phase 6)**: `@devops-engineer`, `@product-manager`, `@qa-engineer`, `@technical-writer`
- **Post-Launch Iteration & Telemetry (Phase 7)**: `@product-manager`, `@data-analyst`, `@ux-researcher`, `@performance-engineer`
- **Documentation & Knowledge Transfer (Phase 8)**: `@technical-writer`, `@shifu`, `@architect`, `@developer`
- **Retro & Process Improvement (Phase 9)**: `@product-manager`, `@tech-lead`, `@shifu`, `@qa-engineer`

Cross-cutting domain experts (`@security-engineer`, `@performance-engineer`, `@ml-ai-engineer`, `@ml-ai-ops`, `@devops-engineer`, `@data-analyst`, `@technical-writer`, `@shifu`) can be dynamically brought into any discussion based on topic relevance.
