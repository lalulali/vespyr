# 1. Installation

> [← Back to Guide](index.md) | [Next: Getting Started →](getting-started.md)

## Prerequisites

- **Node.js** ≥ 18
- An **AI developer harness** (any of: OpenCode, Claude Code, Cursor, Windsurf, GitHub Copilot, Kiro, Aider, Google Antigravity)
- A terminal or IDE with agent invocation support

## Install

```bash
# Option 1: Install as a local or global package
npm install vespyr
npm install -g vespyr

# Option 2: Run directly without pre-installing using npx
npx vespyr

# Option 3: Clone the repo and run from source
git clone https://github.com/lalulali/vespyr.git
cd vespyr
npm install
node bin/cli.js --yes --harness opencode,claude
```

The interactive CLI wizard walks you through:

1. **Harness selection** — choose your IDE/CLI harness (OpenCode, Claude Code, Cursor, etc.)
2. **Project target** — which repository to install into (defaults to `cwd`)
3. **Squad preset** — which agent squad to activate (full team / lean / solo)

## What Gets Created

After installation, your project root gets:

```
your-project/
├── .agents/              # Agent personas, skills, scripts, config, references
│   ├── agents/           # 21 agent persona markdown files
│   ├── skills/           # 31+ atomic skill workflows
│   ├── scripts/          # Orchestrator, graph, memory, telemetry
│   ├── config.yaml       # Project configuration
│   └── references/       # Phase table, glossary, contracts
├── artifacts/
│   ├── memory/           # Persistent shared memory
│   │   ├── project-context.md
│   │   ├── active-decisions.md
│   │   ├── lessons-learned.md
│   │   └── structural/   # Code-graph & doc-graph
│   ├── input/            # User-provided raw materials
│   └── output/           # Agent-generated artifacts (by phase)
├── agent.md              # Harness entry point (for OpenCode/Copilot)
├── AGENTS.md             # Harness entry point (for Claude/Cursor)
├── CLAUDE.md             # Harness entry point (for Claude Code/Cursor)
└── README.md             # Project overview
```

> **Harness note:** The configuration directory is `.agents/`. Some harnesses expect a different dotfolder (e.g., Claude Code uses `.claude/`). Rename `.agents/` to match your harness if needed.

## Quick Install (Skip Wizard)

```bash
# Install with defaults, target current directory
npx vespyr --yes

# Target a specific project with specific harnesses
npx vespyr --yes --target /path/to/my-project --harness opencode,claude

# Run the CLI directly from the repo
node bin/cli.js --yes --target /path/to/my-project
```

## Verifying Installation

After install, invoke the help-me navigator to confirm everything is wired:

```
/help-me
```

This should produce a navigation report showing your current phase, available skills, and recommended next actions.

If you see errors, check that:
- `.agents/config.yaml` exists
- `artifacts/memory/project-context.md` exists
- Your harness can read `.agents/agents/*.md` files

## Upgrading

```bash
npm update vespyr
```

Your customizations in `.agents/custom/` survive upgrades. Agent persona files in `.agents/agents/` are updated, but your overrides in `.agents/custom/` take precedence.
