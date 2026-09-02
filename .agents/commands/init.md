---
description: Bootstrap project — analyze codebase, create artifact tree, initialize memory layer, detect project type
agent: developer
---

Override the built-in `/init`. Do NOT just create AGENTS.md — do the full bootstrap.

## Step 1: Analyze the project

> [!WARNING]
> **Dotfolder Isolation Rule**:
> You MUST NOT read, scan, or analyze any files inside the system dotfolder `.agents/`
> The dotfolder contains files, commands, schemas, and agents that belong to the harness system itself, NOT the user's project. Looking inside it will cause you to falsely assume the project is a "Vespyr engine clone" or has node/typescript dependencies when it might be completely empty or belong to a different language.
> Keep all scans strictly restricted to files *outside* the system dotfolder `.agents/` and the `artifacts/` directory.

Scan the codebase directly (**EXCLUDING** the system dotfolder `.agents/` and the `artifacts/` directory):
- Directory structure (top 2 levels, ignoring the system dotfolder and `artifacts/` folder)
- Tech stack (package.json, requirements.txt, go.mod, Cargo.toml, etc., outside the system dotfolder)
- Existing patterns and conventions (outside the system dotfolder)
- Test framework
- CI/CD config if present

Run directly:
- `git log --oneline -10` (if git repo and outside dotfolder context)
- `find . -name "*.md" -maxdepth 1` (existing docs, ignoring those in dotfolders)

## Step 2: Create AGENTS.md, agent.md, and CLAUDE.md from canonical single source

Run `node .agents/scripts/sync-entry-points.js` (or read `.agents/templates/system/AGENTS.md.canonical` directly).

This reads `.agents/templates/system/AGENTS.md.canonical` as the single source of truth and generates:
- `AGENTS.md` (project root, replacing `{Project Name}` with the project name discovered in Step 1)
- `agent.md` (project root)
- `CLAUDE.md` (project root, configured with `.claude/` dotfolder references if the Claude Code harness is detected)

## Step 3: Initialize artifact tree

Create `artifacts/output/` — base output directory.
> [!NOTE]
> **On-Demand Subdirectory Creation**: Do NOT pre-create empty phase subdirectories (`01-discovery/`, `02-research/`, `03-strategy/`, etc.). When agents produce deliverables, file creation tools automatically create the designated phase folder on demand.

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
- `session-summaries/` — empty directory
- `archive/` — empty directory

## Step 4: Detect project type & recommended pipeline

Based on the codebase analysis (strictly ignoring all files inside the system dotfolder `.agents/` and the `artifacts/` directory), determine the project context:
- **If the project is empty / blank** (i.e. contains no codebase/source files, manifest files like package.json/cargo.toml, or documentation files in the root or directories outside the dynamic system dotfolder and standard git config):
  - You **MUST NOT** write assumptions, make guesses about the project stack, or read/access any files inside `.agents/` to infer what kind of project this is.
  - You **MUST** state clearly and explicitly in `artifacts/memory/project-context.md` that it is a **blank project starting from scratch**.
  - Configure the following exact neutral fallback values in `project-context.md`:
    - **Name**: "Blank Project / New Product Concept"
    - **Type**: "Blank/Undetermined (Ready for Intake & Validation)"
    - **Stack**: "None (Starting from scratch)"
    - **Pipeline Options**: Offer `/unpack-problem` (problem-first), `/validate-idea` (concept stress-testing), `/validate-game-idea` (game stress-testing), and `/shape-up` (shaping raw pitches/notes).
- **Otherwise, for existing/brownfield codebases (containing files outside the system dotfolder)**:
  - Determine if it is a **Product** or **Game** (or other).
  - Determine if it is greenfield or brownfield.
  - Set the recommended pipeline:
    - **Product Pipeline**: `/unpack-problem` (or `/validate-idea` / `/shape-up`) → `/explore-idea` → `/shape-up` → `/design` (with optional `/motion`) → `/plan` → `/develop` → `/launch` → `/iterate` → `/retro`.
    - **Game Pipeline**: `/validate-game-idea` → `/explore-game-idea` → `/design` → `/plan` → `/develop` → `/launch` → `/iterate` → `/retro`.
    - **Note on `/shape-up`**: Zero prerequisites. Can be run standalone (`shape-up` → `design`), pre-research, post-validation, post-research, or for iterative re-shaping.

Write these findings to `artifacts/memory/project-context.md`. Do not include any dotfolder files or scripts in your analysis.

## Step 5: Set operation mode

Default to `semi-autonomous` in `artifacts/memory/project-context.md`.

## Step 6: Report

Return a summary:

```
## Project Initialized
**Name:** {detected project name OR "Blank Project / New Product Concept"}
**Type:** {product/game/other OR "Blank/Undetermined (Ready for Intake & Validation)"}
**Stack:** {detected stack OR "None (Starting from scratch)"}
**Pipeline:** {recommended pipeline OR "unpack-problem / validate-idea / shape-up"}
**Operation Mode:** semi-autonomous

### Available Core Skills
- `/unpack-problem` — Problem-first exploration before solution ideation
- `/validate-idea` — Stress-test product concepts before research (GO/RESHAPE/NO-GO)
- `/validate-game-idea` — Stress-test game concepts before production
- `/explore-idea` — Market, competitor, and user research
- `/explore-game-idea` — Genre market and player research
- `/shape-up` — Structure and stress-test semi-cooked ideas into design-ready briefs (zero prerequisites)
- `/design` — PRD, user stories, product specs
- `/motion` — Motion research, motion spec, and implementation handoff
- `/plan` — Standalone execution planning
- `/develop` — Core MVP workflow (architecture, planning, implementation, QA)
- `/launch` — Release readiness, deployment, monitoring
- `/iterate` — Post-launch improvements from telemetry and user data
- `/incident` — Production incident triage and resolution
- `/retro` — Post-cycle review and memory compaction

### Navigation & Helper Skills
- `/help-me` — Conversational next-step navigator and co-pilot
- `/status` — Quick project state snapshot
- `/phase` — Show/switch phases
- `/grill-me` — Relentless Socratic alignment and stress-testing interview
- `/teach-me` — Personal learning partner (Quick, Explain, or Deep Dive)
- `/craft-lesson` — Create multi-format educational materials
- `/humanize` — AI-writing tell detector and style normalizer
- `/kanban` — Display and update Kanban board
- `/sprint-status` — Pipeline state CLI Kanban table
- `/analyze-data` — EDA, metrics, and visualization mapping
- `/round-table` — Orchestrate multi-agent group discussions
- `/elicitation` — Socratic & first-principles critique
- `/create-skill` — Author and evaluate custom skills
- `/customize-skill` — Surgically customize existing skills (triggering, workflow, references)
- `/create-agent` — Author and register new agent personas
- `/customize-agent` — Guided TOML authoring for agent settings, permissions, and models

### Next Step
Start with `/unpack-problem` (for pain points), `/validate-idea` (for new concepts), or `/shape-up` (for raw notes/pitches).
Or run `/help-me` or `/status` anytime for guided next steps.
```
