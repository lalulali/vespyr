---
name: squad
description: Show available agent squads, switch active squad, and initialize the team preset
---

## What this skill does

Manages Vespyr squads. Displays available squads, describes active agents for a squad, and configures the active squad in `project-context.md` and `pipeline-state.json`.

## When to use

- "Show squads"
- "Switch to startup squad"
- "@squad:startup [your idea]"
- "/squad build"

## Workflow

### Step 1: Detect current squad

Read `artifacts/memory/project-context.md` to see if a squad is already configured. If not, default is `full-team`.

If the project is brand new (no `project-context.md` exists), initialize it first using the template: `.opencode/templates/project-context-template.md`. Fill in the `[CORE]` section with the project name, type, stack, phase, and squad.

### Step 2: List squads or switch squad

If the user does not specify a squad, or says "show squads":
1. Use `@reader` to read the `.opencode/squads/` directory.
2. List all available squads, their descriptions, and the active agents in each.
3. Ask the user which squad they would like to activate.

If the user specifies a squad (e.g., `/squad startup` or via `@squad:startup`):
1. Use `@reader` to read the squad's file under `.opencode/squads/{squadName}.md`.
2. Extract the name and active agents from the squad file.
3. Update `artifacts/memory/project-context.md` to set the squad:
   - In the `[CORE]` section, ensure `Squad: {squadName}` is set. If `Squad` field is missing, append it under `Blockers`.
4. Run via `@executor`:
   ```bash
   node .opencode/scripts/orchestrator_state.js init --name "{projectName}" --type {projectType} --squad {squadName}
   ```
   *(Note: Extract the `{projectName}` and `{projectType}` from the `[CORE]` section of `project-context.md` first, or default to "Blank Project" and "startup" if not found).*
5. Report the switch to the user, displaying the active agents for the selected squad and the new starting phase.
