---
name: squad
description: Show available agent squads, switch active squad, and initialize the team preset
version: "2.0"
last_updated: 2026-07-10
---

# Squad — Team Preset Manager

## What this skill does

Manages Vespyr squads — predefined subsets of agents that activate together for specific project phases. Displays available squads, describes active agents, configures the active squad in `project-context.md`, and supports custom squad creation.

## When to use

- "Show squads"
- "Switch to startup squad"
- "@squad:startup [your idea]"
- "/squad build"
- "Create a custom squad for..."
- "Deactivate current squad"

## When NOT to use

- For single-agent invocation (use `@agent-name` directly)
- For phase switching (use `/phase`)

## Available squads

| Squad | Description | Member Agents |
|---|---|---|
| `startup` | Early-stage, idea to MVP | founder, researcher, user-researcher, product-manager, product-designer, architect, tech-lead, developer, code-reviewer, qa-engineer, devops-engineer |
| `research` | Discovery and validation only, no code | founder, researcher, user-researcher, product-manager |
| `design` | Strategy and design sprint | product-manager, product-designer, ux-researcher, data-analyst |
| `build` | You have a spec, you need to build it | architect, tech-lead, developer, code-reviewer, qa-engineer, devops-engineer, technical-writer |
| `ship` | Quality and delivery focus | developer, code-reviewer, qa-engineer, security-engineer, performance-engineer, devops-engineer |
| `game-studio` | Game development workflow | founder, product-manager, product-designer, architect, tech-lead, developer |
| `full-team` | All agents available | All 21 agents |

## Workflow

### Step 1: Detect current squad

Read `artifacts/memory/project-context.md` to see if a squad is already configured. If not, default is `full-team`.

If the project is brand new (no `project-context.md` exists), initialize it first using the template: `.agents/templates/project-context-template.md`. Fill in the `[CORE]` section with the project name, type, stack, phase, and squad.

### Step 2: List squads or switch squad

If the user does not specify a squad, or says "show squads":
1. Use `@reader` to read the `.agents/squads/` directory.
2. List all available squads, their descriptions, and the active agents in each.
3. Ask the user which squad they would like to activate.

If the user specifies a squad (e.g., `/squad startup` or via `@squad:startup`):
1. Use `@reader` to read the squad's file under `.agents/squads/{squadName}.md`.
2. Extract the name and active agents from the squad file.
3. Update `artifacts/memory/project-context.md` to set the squad:
   - In the `[CORE]` section, ensure `Squad: {squadName}` is set. If `Squad` field is missing, append it under `Blockers`.
4. Run via `@executor`:
   ```bash
   node .agents/scripts/orchestrator_state.js init --name "{projectName}" --type {projectType} --squad {squadName}
   ```
   *(Note: Extract the `{projectName}` and `{projectType}` from the `[CORE]` section of `project-context.md` first, or default to "Blank Project" and "startup" if not found).*
5. Report the switch to the user, displaying the active agents for the selected squad and the new starting phase.

### Step 3: Activation ceremony

When a squad is activated:
1. Write `artifacts/memory/active-squad.md`:
   ```
   # Active Squad
   **Squad:** {squadName}
   **Activated:** YYYY-MM-DD HH:MM
   **Agents:** {comma-separated list}
   **Context:** {reason for switching, from user}
   ```
2. Log the activation to `artifacts/memory/active-decisions.md`.
3. Report to the user which agents are now active and which phase to start from.

### Step 4: Deactivation ceremony

When a squad is deactivated (switching to a new squad):
1. Append a deactivation timestamp to `active-squad.md`.
2. Note any incomplete work that the next squad inherits.
3. Log to `active-decisions.md`.

### Step 5: Custom squad creation

If the user wants a custom squad:
1. Ask for: squad name, description, member agents (from the 21).
2. Create `.agents/squads/{name}.md` with frontmatter listing agents.
3. The new squad is immediately available for activation.

## Output artifacts

- `artifacts/memory/active-squad.md` (current squad state)
- `artifacts/memory/active-decisions.md` (activation log entry)
- `.agents/squads/{name}.md` (custom squad, if created)

## State machine integration

At start: `node .agents/scripts/orchestrator_state.js status`
After switch: `node .agents/scripts/orchestrator_state.js init --squad {squadName}`
