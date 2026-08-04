# 2. Getting Started

> [← Back to Guide](index.md) | [Previous: Installation](installation.md) | [Next: Configuration →](configuration.md)

## Your First Project

Vespyr is organized around an 11-phase pipeline. You don't need to memorize it — the `/help-me` skill always tells you what's next. Here's the essential flow:

```
/validate-idea   →   /explore-idea   →   /design   →   /develop   →   /launch
```

### Step-by-Step First Run

**1. Start with `/validate-idea`**

Tell the founder agent about your product concept. It stress-tests with frameworks (Golden Circle, Pre-mortem, First Principles, Moat & Defensibility) and returns a GO/PIVOT/KILL verdict.

```
/validate-idea create "A collaborative whiteboard for remote teams"
```

**2. Research with `/explore-idea`**

If you get a GO, run market and user research. This dispatches `@researcher`, `@user-researcher`, and `@ux-researcher` in parallel.

```
/explore-idea
```

**3. Design with `/design`**

Generate a PRD (`requirements.md`), product spec (`product-spec.md`), and exhaustive user stories (`user-stories.md`). The `/design` skill auto-detects create/edit/validate mode.

```
/design create
```

**4. Develop with `/develop`**

The full MVP cycle: tech-lead execution plan → architecture review → implementation → code review → QA testing.

```
/develop
```

**5. Launch with `/launch`**

Release readiness, deployment, smoke testing, post-launch monitoring.

```
/launch
```

## Invoking Agents

Agents are plain Markdown files. Invoke them in any of three ways:

### Method 1: Mention in IDE (Cursor, Windsurf, Copilot)
```
@founder.md Review this idea: "A marketplace for vintage audio gear"
```

### Method 2: System Directive (Claude Code, Aider, CLI)
```
Adopt the role of the agent defined in: .agents/agents/founder.md
Then execute: Review this idea: "A marketplace for vintage audio gear"
```

### Method 3: Copy-Paste (ChatGPT Web, Claude.ai)
Copy the entire contents of `.agents/agents/founder.md` as your first message, then append your task.

## Understanding the Pipeline

Vespyr uses 11 sequential phases. View your current phase at any time:

```
/phase
```

Switch phases manually:

```
/phase 2
```

The pipeline enforces ordering — you can't execute development without passing the design gate. The `sprint-status.yaml` file (at `artifacts/output/sprint-status.yaml`) is the canonical state record.

### Key Navigation Commands

| Command | What It Does |
|---------|-------------|
| `/help-me` | Dynamic navigator — tells you what to do next |
| `/status` | Quick snapshot of phase, blockers, memory health |
| `/phase` | Show or switch phases |
| `/squad` | List and switch agent squads |
| `/kanban` | Display and update the Kanban board |
| `/memory` | Search archived project context |

## Project Structure

```
artifacts/
├── memory/          # Persistent: project context, decisions, lessons
├── input/           # User-provided: raw ideas, notes, requirements
└── output/          # Agent-generated, organized by phase:
    ├── 01-discovery/
    ├── 02-research/
    ├── 03-strategy/
    ├── 04-architecture/
    ├── 05-planning/
    ├── 06-launch/
    ├── 07-iteration/
    ├── 08-incidents/
    └── 09-retro/
```

## Next Steps

- Learn about [Configuration](configuration.md) to customize your setup
- Explore the [Skills & Workflows](skills-and-workflows.md) catalog
- Dive into [Structural Graphs](structural-graphs.md) for codebase and document intelligence
