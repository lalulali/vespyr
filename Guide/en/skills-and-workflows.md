# 4. Skills & Workflows

> [← Back to Guide](index.md) | [Previous: Configuration](configuration.md) | [Next: Structural Graphs →](structural-graphs.md)

## All Slash Commands

Vespyr organizes complex operations into atomic skills. Each skill is a folder with a `SKILL.md` router + `steps/` directory.

### Curated Workflows (Lifecycle)

| Command | Phase | Description |
|---------|-------|-------------|
| `/validate-idea` | -1 | Stress-test product concepts before research |
| `/validate-game-idea` | -1 | Stress-test game concepts before production |
| `/explore-idea` | 0-1 | Market, competitor, and user research |
| `/explore-game-idea` | 0-1 | Genre market and player research |
| `/unpack-problem` | 0-1 | Problem-first exploration before solution ideation |
| `/design` | 2-3 | PRD and screen specs creation |
| `/develop` | 5 | MVP development cycle |
| `/launch` | 6 | Release readiness and deployment |
| `/iterate` | 7 | Post-launch behavior improvements |
| `/retro` | 9 | Post-cycle review and memory compaction |

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

### Idea Shaping & Brainstorming

| Command | Description |
|---------|-------------|
| `/shape-up` | Structure and stress-test semi-cooked ideas into design-ready briefs |
| `/brainstorming` | Select from 60 brainstorming methods (SCAMPER, Six Hats, etc.) |
| `/grill-me` | Relentless Socratic alignment and stress-testing interview |

### Operations

| Command | Description |
|---------|-------------|
| `/help-me` | Conversational project navigator and co-pilot |
| `/status` | Quick snapshot of current project state |
| `/phase` | Show/switch phases |
| `/squad` | Show available agent squads and switch active squad |
| `/plan` | Standalone execution planning |
| `/review` | Standalone code review |
| `/test` | Run tests, summarize failures |
| `/kanban` | Display and update Kanban board |
| `/memory` | Search archived project context |

### Intelligence

| Command | Description |
|---------|-------------|
| `/code-graph` | Generate/scan dependency graphs |
| `/doc-graph` | Generate/scan documentation links and trace coverage |
| `/humanize` | AI-writing style detector and normalizer |

### Other

| Command | Description |
|---------|-------------|
| `/customize-skill` | Guided agent customization authoring flow |
| `/create-skill` | Create, modify, and test skills with evals |
| `/incident` | Production incident response |

## Pipeline Phase Table

Vespyr's 11-phase pipeline. `.agents/references/phase-table.md` is the canonical source.

| Phase | ID | Folder | Primary Skill |
|-------|----|--------|---------------|
| Validation | -1 | `00-discovery/` | `/validate-idea` |
| Discovery | 0 | `00-discovery/` | `/unpack-problem` |
| Research | 1 | `01-research/` | `/explore-idea` |
| Strategy | 2 | `02-strategy/` | `/design` |
| Architecture | 3 | `03-architecture/` | Architecture ADRs |
| Planning | 4 | `04-planning/` | `/plan` |
| Implementation | 5 | `05-implementation/` | `/develop` |
| Launch | 6 | `06-launch/` | `/launch` |
| Iteration | 7 | `07-iteration/` | `/iterate` |
| Documentation | 8 | (cross-cutting) | Tech writer |
| Retrospective | 9 | `09-retro/` | `/retro` |

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
└── steps-create/      # Run when no PRD/spec exists
└── steps-edit/        # Run when PRD/spec exists and needs changes
└── steps-validate/    # Run when validating an existing design
```

### Resumable Execution

Output documents include a `stepsCompleted` array in their YAML frontmatter:

```yaml
stepsCompleted: [1, 2, 3]
```

Re-invoke the skill and it automatically resumes from step 4. No state needs to be maintained in the agent's context.

## Delegation Protocol

All reasoning agents delegate I/O to sub-agents per `.agents/references/delegation-policy.md`:

| Task | Sub-Agent | Threshold |
|------|-----------|-----------|
| Read files | `@reader` | >3 files delegated |
| Write files | `@writer` | >50 lines delegated |
| Run commands | `@executor` | Always delegated (reasoning agents have no shell access) |
| Memory operations | `@memory-controller` | Always delegated |

Direct I/O outside these rules requires `[DIRECT-IO-JUSTIFIED: ...]` in the agent's response.
