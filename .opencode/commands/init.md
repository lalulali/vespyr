---
description: Bootstrap project — analyze codebase, create artifact tree, initialize memory layer, detect project type
agent: developer
---

Override the built-in `/init`. Do NOT just create AGENTS.md — do the full bootstrap.

## Step 1: Analyze the project

> [!WARNING]
> **Dotfolder Isolation Rule**:
> You MUST NOT read, scan, or analyze any files inside the system dotfolder `.opencode/`
> The dotfolder contains files, commands, schemas, and agents that belong to the harness system itself, NOT the user's project. Looking inside it will cause you to falsely assume the project is a "Vespyr engine clone" or has node/typescript dependencies when it might be completely empty or belong to a different language.
> Keep all scans strictly restricted to files *outside* the system dotfolder `.opencode/` and the `artifacts/` directory.

Use `@reader` to scan the codebase (**EXCLUDING** the system dotfolder `.opencode/` and the `artifacts/` directory):
- Directory structure (top 2 levels, ignoring the system dotfolder and `artifacts/` folder)
- Tech stack (package.json, requirements.txt, go.mod, Cargo.toml, etc., outside the system dotfolder)
- Existing patterns and conventions (outside the system dotfolder)
- Test framework
- CI/CD config if present

Use `@executor` to run:
- `git log --oneline -10` (if git repo and outside dotfolder context)
- `find . -name "*.md" -maxdepth 1` (existing docs, ignoring those in dotfolders)

## Step 2: Create AGENTS.md and agent.md

Read the scaffold templates from `.opencode/commands/`:
- `scaffold-agents.md` — source of truth for `AGENTS.md`
- `scaffold-agent.md` — source of truth for `agent.md`

Create `AGENTS.md` in the project root by copying `scaffold-agents.md`. Replace `{Project Name}` with the actual project name discovered in Step 1.

Create `agent.md` in the project root by copying `scaffold-agent.md`. This file is identical to `AGENTS.md` except the System Directive Prompt Pattern references `agent.md` instead of `this document`.

## Step 2b: Create CLAUDE.md (if Claude Code harness is detected)

If a `.claude` folder is present, or if the user is using the Claude Code harness, scaffold a `CLAUDE.md` in the project root by copying `.opencode/commands/scaffold-claude.md`.

## Step 3: Initialize artifact tree

Create these directories under `artifacts/output/`:
- `00-discovery/`
- `01-research/`
- `02-strategy/`
- `03-architecture/`
- `04-planning/`
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
- `project-context.md` — pre-populate with discovered project info and chosen squad preset (e.g. `Squad: startup` or chosen `--squad` flag, defaulting to `full-team` if unspecified)
- `active-decisions.md` — empty, ready for entries
- `patterns-and-conventions.md` — pre-populate with discovered code patterns
- `lessons-learned.md` — empty
- `blockers-and-risks.md` — empty
- `agent-notes/` — empty directory
- `session-summaries/` — empty directory
- `pending-questions/` — create a subdirectory inside for each of the core agent personas (e.g. `founder/`, `architect/`, etc.)
- `archive/` — empty directory

## Step 4: Detect project type

Based on the codebase analysis (strictly ignoring all files inside the system dotfolder `.opencode/` and the `artifacts/` directory), determine the project context:
- **If the project is empty / blank** (i.e. contains no codebase/source files, manifest files like package.json/cargo.toml, or documentation files in the root or directories outside the dynamic system dotfolder and standard git config):
  - You **MUST NOT** write assumptions, make guesses about the project stack, or read/access any files inside `.opencode/` to infer what kind of project this is.
  - You **MUST** state clearly and explicitly in `artifacts/memory/project-context.md` that it is a **blank project starting from scratch**.
  - Configure the following exact neutral fallback values in `project-context.md`:
    - **Name**: "Blank Project / New Product Concept"
    - **Type**: "Blank/Undetermined (Ready for Idea Validation)"
    - **Stack**: "None (Starting from scratch)"
    - **Pipeline**: Offer both `/validate-idea` and `/validate-game-idea` so the user can choose the correct pipeline for their new concept.
- **Otherwise, for existing/brownfield codebases (containing files outside the system dotfolder)**:
  - Determine if it is a **Product** or **Game** (or other).
  - Determine if it is greenfield or brownfield.
  - Set the recommended pipeline: `validate-idea` → `explore-idea` → `design` → `develop` → `launch` → `iterate` → `retro` OR `validate-game-idea` → `explore-game-idea` → `design` → `develop` → `launch` → `iterate` → `retro`.

Write these findings to `artifacts/memory/project-context.md`. Do not include any dotfolder files or scripts in your analysis.

## Step 5: Set operation mode

Default to `semi-autonomous` in `artifacts/memory/project-context.md`.

## Step 6: Report

Return a summary:

```
## Project Initialized
**Name:** {detected project name OR "Blank Project / New Product Concept"}
**Type:** {product/game/other OR "Blank/Undetermined (Ready for Idea Validation)"}
**Stack:** {detected stack OR "None (Starting from scratch)"}
**Pipeline:** {recommended pipeline OR "validate-idea / validate-game-idea"}
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
- `/help-me` — Conversational next-step navigator and co-pilot
- `/grill-me` — Relentless Socratic alignment and stress-testing interview
- `/humanize` — AI-writing tell detector and style normalizer
- `/status` — Quick project state snapshot
- `/memory` — Search archived project context
- `/phase` — Show/switch phases
- `/squad` — Show available agent squads and switch active squad
- `/delegate` — Quick I/O offload
- `/plan` — Standalone execution planning
- `/review` — Standalone code review
- `/test` — Run tests, summarize failures
- `/kanban` — Display and update Kanban board
- `/code-graph` — Generate/scan dependency graphs
- `/doc-graph` — Generate/scan documentation links and trace coverage

### Next Step
Start with `/validate-idea` (or `/validate-game-idea`) if you have an unvalidated concept.
Or use `/status` to see the current project state.
```
