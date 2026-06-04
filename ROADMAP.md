# Vespyr Roadmap

This document tracks what's planned, what's in progress, and what's done. It's a living document — priorities shift based on community feedback and adoption patterns.

Current status: **v1.1 — squad-based team presets, shipped.**

---

## Shipped — v1.1

### Squad-based team presets

Right now Vespyr ships as one team of 21 agents. Most users don't need all of them for every project. The plan is to introduce **squads** — curated subsets of agents for specific use cases.

A squad is a named configuration that activates a subset of agents, sets their shared memory defaults, and optionally pre-configures the workflow phases relevant to that squad's purpose.

**Proposed squads:**

| Squad | Agents included | Use case |
|---|---|---|
| `full-team` | All 21 agents | Default — full product development lifecycle |
| `startup` | founder, market-researcher, competitor-analyzer, user-researcher, product-manager, product-designer, architect, tech-lead, developer, code-reviewer, qa-engineer, devops-engineer | Early-stage product from idea to MVP |
| `build` | architect, tech-lead, developer, code-reviewer, qa-engineer, devops-engineer, technical-writer | You have a spec, you need to build it |
| `research` | founder, market-researcher, competitor-analyzer, user-researcher, product-manager | Discovery and validation only, no code |
| `design` | product-manager, product-designer, ux-researcher, data-analyst | Strategy and design sprint |
| `ship` | developer, code-reviewer, qa-engineer, security-engineer, performance-engineer, devops-engineer | Existing codebase, focus on quality and delivery |
| `game-studio` | founder (game mode), market-researcher, user-researcher, product-manager, product-designer, architect, tech-lead, developer, qa-engineer | Game development variant |

**How it works:**

```bash
# opencode — invoke a squad
@squad:startup I have an idea: [your idea]

# or set in project context
## Squad
startup
```

Squad definitions will live in `.opencode/squads/*.md` with a manifest listing which agents are active and any squad-specific shared memory defaults.

---

## Now — v1.2 (Active)

### `npx create-vespyr` installer

Installing Vespyr today means cloning the repo and copying files manually. The goal is a single command that scaffolds the system into any project, for any harness.

```bash
npx vespyr
```

**Planned flow:**

```
? Which harness are you using?
  ❯ opencode (default)
    Claude Code
    Cursor
    Windsurf
    GitHub Copilot
    Codex CLI
    Aider
    Zed

? Which squad do you want to start with?
  ❯ full-team
    startup
    build
    research
    design
    ship
    game-studio

? Where should Vespyr be installed?
  ❯ Current directory (.)
    Enter a path

Installing Vespyr for opencode with the startup squad...
✓ Created .opencode/agents/ (21 agents)
✓ Created .opencode/skills/
✓ Created .opencode/templates/
✓ Created artifacts/memory/
✓ Created artifacts/output/
✓ Created AGENTS.md
✓ Created QUICK-REFERENCE.md

Done. Run `opencode` to start.
```

**Harness priority order** (based on adoption data and community size):

| Priority | Harness | Rationale |
|---|---|---|
| 1 | opencode | Native — already done |
| 2 | Claude Code | Fastest-growing terminal agent, native subagent support, closest architecture match |
| 3 | Cursor | Largest IDE user base (~$1B ARR), most community demand |
| 4 | GitHub Copilot | 4.7M paid subscribers, enterprise reach |
| 5 | Windsurf | Strong growth, acquired for $250M, good agent support |
| 6 | Codex CLI | OpenAI ecosystem, growing terminal user base |
| 7 | Aider | Loyal niche, git-native workflow |
| 8 | Zed | Small but fast-growing, developer-focused |

Each harness port generates the correct file structure for that tool — `.cursor/rules/` for Cursor, `.claude/agents/` for Claude Code, `.github/agents/` for Copilot, etc.

### Future Additional Harnesses (Backlog)

We plan to expand auto-detection and dedicated symlink/config output support for other emerging developer agents and CLI harnesses. These will be prioritized in future releases:

| Harness | Target Dotfolder Prefix | Configuration & Rules Directory |
|:---|:---|:---|
| **AiderDesk** | `.aider-desk/` | `.aider-desk/skills/` |
| **Augment** | `.augment/` | `.augment/skills/` |
| **IBM Bob** | `.bob/` | `.bob/skills/` |
| **OpenClaw** | N/A (Root) | `skills/` |
| **CodeArts Agent** | `.codeartsdoer/` | `.codeartsdoer/skills/` |
| **CodeBuddy** | `.codebuddy/` | `.codebuddy/skills/` |
| **Codemaker** | `.codemaker/` | `.codemaker/skills/` |
| **Code Studio** | `.codestudio/` | `.codestudio/skills/` |
| **Command Code** | `.commandcode/` | `.commandcode/skills/` |
| **Continue** | `.continue/` | `.continue/skills/` |
| **Cortex Code** | `.cortex/` | `.cortex/skills/` |
| **Crush** | `.crush/` | `.crush/skills/` |
| **Devin for Terminal** | `.devin/` | `.devin/skills/` |
| **Droid** | `.factory/` | `.factory/skills/` |
| **ForgeCode** | `.forge/` | `.forge/skills/` |
| **Goose** | `.goose/` | `.goose/skills/` |
| **Hermes Agent** | `.hermes/` | `.hermes/skills/` |
| **Junie** | `.junie/` | `.junie/skills/` |
| **iFlow CLI** | `.iflow/` | `.iflow/skills/` |
| **Kilo Code** | `.kilocode/` | `.kilocode/skills/` |
| **Kiro CLI** | `.kiro/` | `.kiro/skills/` |
| **Kode** | `.kode/` | `.kode/skills/` |
| **MCPJam** | `.mcpjam/` | `.mcpjam/skills/` |
| **Mistral Vibe** | `.vibe/` | `.vibe/skills/` |
| **Mux** | `.mux/` | `.mux/skills/` |
| **OpenHands** | `.openhands/` | `.openhands/skills/` |
| **Pi** | `.pi/` | `.pi/skills/` |
| **Qoder** | `.qoder/` | `.qoder/skills/` |
| **Qwen Code** | `.qwen/` | `.qwen/skills/` |
| **Rovo Dev** | `.rovodev/` | `.rovodev/skills/` |
| **Roo Code** | `.roo/` | `.roo/skills/` |
| **Tabnine CLI** | `.tabnine/` | `.tabnine/agent/skills/` |
| **Trae / Trae CN** | `.trae/` | `.trae/skills/` |
| **Zencoder** | `.zencoder/` | `.zencoder/skills/` |
| **Neovate** | `.neovate/` | `.neovate/skills/` |
| **Pochi** | `.pochi/` | `.pochi/skills/` |
| **AdaL** | `.adal/` | `.adal/skills/` |

---

## Later — v1.3

### Proper documentation site

The current README and PORTING.md are functional but not scalable. The goal is a documentation site structured like BMAD Method's docs — four sections, each serving a different reader intent:

| Section | Purpose | Examples |
|---|---|---|
| **Tutorials** | Learning-oriented, step-by-step | "Build your first product with Vespyr", "Run a design sprint" |
| **How-to guides** | Task-oriented, solve a specific problem | "Add a new agent", "Port to Cursor", "Create a squad" |
| **Explanation** | Concept-oriented, understand why | "Why the delegation pattern", "How shared memory works", "Agent boundaries" |
| **Reference** | Information-oriented, look things up | Agent catalog, frontmatter schema, squad definitions, template specs |

**Tech stack candidates:** Starlight (Astro), Docusaurus, VitePress. Starlight is the leading candidate — it's what BMAD uses, it's fast, and it generates an `llms-full.txt` for AI-optimized context (useful for a project that is itself about AI agents).

**Planned pages:**

```
docs/
├── index.md                          # Welcome + quick start
├── tutorials/
│   ├── getting-started.md            # Install + first run
│   ├── startup-workflow.md           # Full startup lifecycle
│   ├── build-workflow.md             # Build squad walkthrough
│   └── game-studio-workflow.md       # Game dev walkthrough
├── how-to/
│   ├── add-agent.md                  # Create a new agent
│   ├── create-squad.md               # Define a squad
│   ├── port-to-cursor.md             # Cursor port guide
│   ├── port-to-claude-code.md        # Claude Code port guide
│   ├── port-to-copilot.md            # Copilot port guide
│   ├── customize-templates.md        # Change output formats
│   └── use-humanizer.md              # Humanizer skill guide
├── explanation/
│   ├── delegation-pattern.md         # Why I/O separation matters
│   ├── shared-memory.md              # How agents coordinate
│   ├── agent-boundaries.md           # Why one agent, one concern
│   └── squad-design.md              # How squads are designed
└── reference/
    ├── agent-catalog.md              # All 21 agents, full spec
    ├── squad-catalog.md              # All squads
    ├── frontmatter-schema.md         # Agent file format
    ├── template-specs.md             # Output template formats
    ├── shared-memory-schema.md       # Memory file formats
    └── harness-compatibility.md      # What works where
```

---

## Later — v1.4

### Continuous improvement system

Vespyr agents don't learn between sessions today. Each session starts from the same static prompts. The continuous improvement system adds a feedback loop.

**Three components:**

**1. Session retrospective agent (`@retrospective`)**

After a project phase completes, `@retrospective` reviews what happened and updates shared memory:

```
@retrospective

Phase: Development
What worked: [summary]
What didn't: [summary]
Update lessons-learned.md and patterns-and-conventions.md accordingly.
```

The retrospective skill already exists in `.opencode/skills/retrospective/`. This formalizes it as a named agent with a defined trigger.

**2. Agent calibration**

Agents track their own estimation accuracy and decision quality in `artifacts/memory/agent-notes/`. Over time, patterns emerge — which agents consistently over-estimate, which quality gates catch the most issues, which phases produce the most rework. This data feeds back into agent prompts.

**3. Community improvement loop**

A structured process for community-contributed agent improvements:

- Users submit agent prompt improvements via PR
- Changes are tagged with the problem they solve and the evidence behind them
- Accepted changes are versioned in agent frontmatter
- A changelog tracks what changed and why

This is different from arbitrary prompt tweaking — every change needs a stated problem and a rationale.

---

## Backlog (no timeline)

These are ideas that have been raised but not yet prioritized. They need more definition before they move up.

**Multi-agent parallelism**
Run multiple developer agents on separate git worktrees simultaneously. The developer agent already has a multi-developer mode section — this would make it a first-class feature with proper worktree-aware coordination.

**MCP server integration**
Expose Vespyr agents as MCP tools so they can be invoked from any MCP-compatible harness without manual porting.

**Agent marketplace**
A community registry for custom agents and squads. Users can publish domain-specific agents (e.g., `@solidity-engineer`, `@ios-developer`, `@data-engineer`) and install them via `npx create-vespyr --add @community/solidity-engineer`.

**VS Code extension**
A dedicated extension that surfaces the agent team in the VS Code sidebar — squad selector, agent status, shared memory viewer, artifact browser.

**Vespyr Cloud**
Hosted shared memory and artifact storage for teams. Multiple developers working on the same project share one `artifacts/memory/` state rather than each maintaining their own copy.

---

## Version history

| Version | Status | What shipped |
|---|---|---|
| v1.1 | ✅ Shipped | Squad-based team presets, active phase skipping, CLI and project-context integration |
| v1.0 | ✅ Shipped | 21 agents, opencode native, delegation pattern, shared memory, game mode, humanizer skill |

---

## How to influence the roadmap

Open an issue on [GitHub Issues](https://github.com/christianhadianto/vespyr/issues) with the label `roadmap`. Describe the problem you're trying to solve, not the solution — that helps prioritize correctly.

Items with the most real-world problem evidence move up. Items that are technically interesting but solve hypothetical problems stay in the backlog.
