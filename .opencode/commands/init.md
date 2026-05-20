---
description: Bootstrap project — analyze codebase, create artifact tree, initialize memory layer, detect project type
agent: developer
---

Override the built-in `/init`. Do NOT just create AGENTS.md — do the full bootstrap.

## Step 1: Analyze the project

Use `@reader` to scan the codebase:
- Directory structure (top 2 levels)
- Tech stack (package.json, requirements.txt, go.mod, Cargo.toml, etc.)
- Existing patterns and conventions
- Test framework
- CI/CD config if present

Use `@executor` to run:
- `git log --oneline -10` (if git repo)
- `find . -name "*.md" -maxdepth 1` (existing docs)

## Step 2: Create AGENTS.md

Create `AGENTS.md` in the project root with:

```markdown
# {Project Name}

## Tech Stack
{detected from package.json, go.mod, etc.}

## Key Directories
- `src/` — source code
- `test/` — tests
- `.opencode/` — agent skills, workflows, templates

## Coding Conventions
{discovered from existing code}

---

## Memory Protocol — MANDATORY

All agents (default, sub-agents, and any tab) MUST follow these rules:

**Never read memory files directly.** Always use:
`@memory-controller load [agent-type] [task description]`

**Never write memory files directly.** Always use:
`@memory-controller write [file] [entry]`

**End of session:**
`@memory-controller session-write [content]`

This reduces context from ~15,000 tokens to ~1,000 per invocation.

## Delegation

Use sub-agents for I/O to keep context focused:
- `@reader` — read/search files, return summaries
- `@writer` — write/edit files precisely
- `@executor` — run commands, summarize output

## Guardrails

All agents follow the rules in `.opencode/GUARDRAILS.md`.
```

## Step 3: Initialize artifact tree

Create these directories under `artifacts/output/`:
- `00-discovery/`
- `01-research/`
- `02-strategy/`
- `03-architecture/`
- `04-planning/`
- `05-project-management/`
- `06-launch/`
- `07-iteration/`
- `08-incidents/`
- `09-retro/`

Create `artifacts/telemetry/` — agent execution logs, token usage, and performance metrics.

Create these directories under `artifacts/`:
- `directions/` — document templates direction
- `input/` — raw input materials folder
- `input/example/` — reference examples
- `input/data/` — datasets and analytics exports
- `input/designs/` — design files, mockups, assets
- `input/documents/` — external documents, briefs, research, raw notes
- `input/flows/` — user flows, journey maps, wireframes

Create `artifacts/memory/` with:
- `project-context.md` — pre-populate with discovered project info
- `active-decisions.md` — empty, ready for entries
- `patterns-and-conventions.md` — pre-populate with discovered code patterns
- `lessons-learned.md` — empty
- `blockers-and-risks.md` — empty
- `agent-notes/` — empty directory
- `session-summaries/` — empty directory
- `archive/` — empty directory

## Step 4: Detect project type

Based on the codebase analysis, determine:
- **Product** or **Game** (or other)
- Greenfield or brownfield
- Recommended pipeline: `validate-idea` → `explore-idea` → `design` → `develop` → `launch` → `iterate` → `retro`
  OR `validate-game-idea` → `explore-game-idea` → `design` → `develop` → `launch` → `iterate` → `retro`

Write this to `artifacts/memory/project-context.md`.

## Step 5: Set operation mode

Default to `semi-autonomous` in `artifacts/memory/project-context.md`.

## Step 6: Report

Return a summary:

```
## Project Initialized
**Name:** {detected or from package.json}
**Type:** {product/game/other}
**Stack:** {detected stack}
**Pipeline:** {recommended skill sequence}
**Operation Mode:** semi-autonomous

### Available Skills
- `/validate-idea` — Stress-test your idea before investing research
- `/validate-game-idea` — Stress-test game concepts before production
- `/explore-idea` — Market, competitor, and user research
- `/explore-game-idea` — Genre market and player research
- `/design` — PRD, user stories, product specs
- `/develop` — Architecture, planning, implementation, QA
- `/launch` — Release readiness, deployment, monitoring
- `/iterate` — Post-launch improvements from user data
- `/incident` — Production incident response
- `/retro` — Post-cycle review and process improvement
- `/status` — Quick project state snapshot
- `/memory` — Search archived project context
- `/phase` — Show/switch phases
- `/delegate` — Quick I/O offload
- `/plan` — Standalone execution planning
- `/review` — Standalone code review
- `/test` — Run tests, summarize failures
- `/kanban` — Display and update Kanban board

### Next Step
Start with `/validate-idea` (or `/validate-game-idea`) if you have an unvalidated concept.
Or use `/status` to see the current project state.
```
