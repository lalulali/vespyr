# 1. Installation

> [← Back to Guide](index.md) | [Next: Getting Started →](getting-started.md)

## Prerequisites

- **Node.js** ≥ 18
- An **AI developer harness** — first-class installs for OpenCode, Claude Code, Kiro, and GitHub Copilot; Google Antigravity and Codex read the universal `.agents/` store natively; Aider and Gemini CLI adopt it via `AGENTS.md`. Cursor/Windsurf installs are legacy-cleanup-only pending the Phase-2 redesign.
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

1. **Harness selection** — choose your IDE/CLI harness (OpenCode, Claude Code, Kiro, GitHub Copilot)
2. **Project target** — which repository to install into (defaults to `cwd`)

## What Gets Created

After installation, your project root gets:

```
your-project/
├── .agents/              # Agent personas, skills, scripts, config, references
│   ├── agents/           # 20 agent persona markdown files
│   ├── skills/           # 40 atomic skill workflows
│   ├── scripts/          # Orchestrator, memory, telemetry
│   ├── config.yaml       # Project configuration
│   └── references/       # Phase table, glossary, contracts
├── artifacts/
│   ├── memory/           # Persistent shared memory
│   │   ├── project-context.md
│   │   ├── active-decisions.md
│   │   └── lessons-learned.md
│   ├── input/            # User-provided raw materials
│   └── output/           # Agent-generated artifacts (by phase)
├── agent.md              # Entry point (agent.md-convention tools)
├── AGENTS.md             # Universal instruction baseline (Copilot personas ride this)
├── CLAUDE.md             # Entry point (Claude Code)
└── README.md             # Project overview
```

> **Harness note:** The canonical configuration directory is `.agents/`. The installer creates the per-harness links your selections need (`.opencode`, `.claude`, `.kiro/skills`, `.github/skills`) — do not rename or move `.agents/`, or those links break.

## Supported harnesses

| Harness | Install | What you get |
|---|---|---|
| OpenCode | First-class | `.opencode -> .agents` symlink |
| Claude Code | First-class | `.claude -> .agents` symlink + `CLAUDE.md` |
| Kiro | First-class (hybrid) | `.kiro/skills` symlink + `.kiro/steering/vespyr-steering.md` |
| GitHub Copilot | First-class | `.github/copilot-instructions.md` + `.github/skills -> .agents/skills`; personas ride the root `AGENTS.md` |
| Google Antigravity | None needed | reads `.agents/skills/` (plus `.agents/rules/`, `.agents/workflows/`) natively |
| Codex | None needed | reads root `AGENTS.md` and scans `.agents/` skills natively |
| Cursor / Windsurf | Legacy cleanup | detect/uninstall of old installs only; redesign in Phase 2 |
| Aider / Gemini CLI | Read-and-adopt | use the root `AGENTS.md` invocation pattern |

**Caveats:** GitHub Copilot consumes personal skills from `~/.agents/skills` but does not list them in autocomplete/picker (functional-but-invisible), and VS Code's `/` picker resolves project skills through the emitted `.github/skills` link — not root `.agents/skills`. Antigravity's `.agents/agents.md` team-file does not collide with Vespyr's `.agents/agents/` persona directory. The canonical, always-current matrix lives at `.agents/references/harness-matrix.md`.

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

## Integrity & Security Verification

You can verify the supply-chain integrity and security compliance of your installation:

```bash
# Verify .agents/ integrity against pinned SHA-256 manifest
npx vespyr verify

# Run supply-chain security and content integrity scanner
npx vespyr audit

# Recompute and output manifest checksums
npx vespyr manifest
```

## Upgrading

```bash
npm update vespyr
```

Your customization declarations in `.agents/custom/` survive upgrades. They can be previewed with `node .agents/scripts/merge_customization.js <agent-name>`, but no runtime component currently consumes them when an agent loads, so they do not yet change agent behavior.
