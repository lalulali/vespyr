# Porting Vespyr to Other AI Coding Harnesses

Vespyr is built for [opencode](https://opencode.ai) by default. The agent definitions, delegation pattern, and shared memory system are all native to opencode's agent model.

This guide covers how to port the system to other harnesses. The core idea — specialized agents with defined roles, shared memory, and I/O delegation — translates to every major tool. The mechanics differ.

**Note on shared memory:** In opencode, all memory access goes through `@memory-controller` — a dedicated agent that handles progressive context loading (hybrid keyword+semantic scoring), automatic compaction, archiving, and session continuity. When porting to other harnesses, this controller cannot be replicated exactly. The sections below describe the closest equivalent for each harness. For the full memory protocol, see `.opencode/agents/memory-controller.md`.

---

## Quick Start for AI Agents

Users: Copy and paste this prompt to your AI assistant: 

``` markdown
Read @PORTING.md. Follow the <ai_instructions> at the top to automatically port this project to *[Insert Harness Name]*.

<ai_instructions>
If you are an AI agent reading this document to port the project to a new harness, follow these strict execution steps:
1. Locate the Target. Find the specific `## [Harness Name]` section in this document. If it doesn't exist, fall back to the `## Other Harnesses` section at the bottom.
2. Map the Files. Identify the required configuration files (e.g., `CLAUDE.md`, `.windsurfrules`, `.cursorrules`) and their designated contents listed in the target section.
3. Read Source Context. Automatically read the source files mentioned. Be aware that the native Vespyr source files are located in `.opencode/agents/*.md` (for agent prompts) and `.opencode/skills/*/SKILL.md` (for skill definitions). You must read these source files to populate any `[Paste body here]` or `[Body]` placeholders in the target templates.
4. Execute the Port. Use your file creation/editing tools to create the target files and directories required by the new harness, formatting the data exactly as specified in the code blocks. Do not ask for permission to create standard configuration files unless they already exist and would be destructively overwritten.
</ai_instructions>
```
---

## How the harnesses compare

| Harness | Type | Agent support | Instruction file | Skills/workflows |
|---|---|---|---|---|
| **opencode** | Terminal | Native subagents with permissions | `AGENTS.md` | `.opencode/skills/` |
| **Adal** | Terminal | Single agent | `AGENTS.md` | None native |
| **Aider** | Terminal | Single agent | `CONVENTIONS.md` | None native |
| **Auggie** | Terminal | Agentic CLI | `AGENTS.md` | Automated mode |
| **Augment Code** | IDE extension | Single agent + rules | `.augment/rules/*.md` | `.augment/skills/` |
| **Block Goose** | Terminal/Desktop | Single agent | `.goosehints` | Extensions (MCP) |
| **Claude Code** | Terminal | Native subagents | `CLAUDE.md` | `.claude/commands/` |
| **Cline** | IDE extension | Single agent | `.clinerules` / `.clinerules/` | None native |
| **CodeBuddy** | IDE/Terminal | Subagents + skills | `AGENTS.md` | `.codebuddy/skills/` |
| **Codex CLI** | Terminal | Single agent | `AGENTS.md` | None native |
| **Command Code** | Terminal | Single agent | `AGENTS.md` | None native |
| **Crush** | Terminal | Single agent | `AGENTS.md` | None native |
| **Cursor** | IDE | Rules per file/directory | `.cursor/rules/*.mdc` | None native |
| **Factory Droid** | Terminal/Cloud | Single agent | `AGENTS.md` | `.factory/skills/` |
| **Firebender** | IDE | Subagents + rules | `AGENTS.md` / `.firebender/rules/` | None native |
| **Gemini CLI** | Terminal | Native subagents | `.gemini/agents/*.md` | Tools |
| **GitHub Copilot** | IDE extension | Custom agents (VS Code) | `.github/copilot-instructions.md` | `.github/instructions/*.instructions.md` |
| **Google Antigravity** | IDE | Native subagents + Browser agent | `AGENTS.md` | Artifacts |
| **Hermes Agent** | Terminal/Gateway | Single agent + subagents | `AGENTS.md` / `SOUL.md` | `skills/` (SKILL.md) |
| **IBM Bob** | IDE/Terminal | Subagents + modes | `AGENTS.md` | Skills (platform) |
| **iFlow** | Terminal | SubAgent system | `IFLOW.md` | None native |
| **Junie** | IDE (JetBrains) | Single agent | `.junie/guidelines.md` / `AGENTS.md` | Agent skills |
| **Kilo Code** | IDE extension | Custom modes | `.kilocode/rules/` / `AGENTS.md` | Workflows |
| **Kimi Code** | Terminal/IDE | Subagents | `AGENTS.md` | None native |
| **Kiro** | IDE | Single agent | `.kiro/steering/*.md` | None native |
| **Kode** | Terminal | Single agent | `AGENTS.md` | None native |
| **Mistral Vibe** | Terminal | Subagents + skills | `AGENTS.md` | `.vibe/skills/` |
| **Mux** | Terminal | Single agent | `AGENTS.md` | None native |
| **Neovate** | IDE | Single agent | `AGENTS.md` | None native |
| **Ona** | Terminal | Single agent | `AGENTS.md` | None native |
| **OpenClaw** | Terminal/Gateway | Multi-agent (routing) | `AGENTS.md` / `SOUL.md` | `skills/` + clawhub |
| **OpenHands** | Web/Terminal | Single agent | `.openhands/microagents/repo.md` | Microagents |
| **Pi** | Terminal | Single agent | `AGENTS.md` | None native |
| **Pochi** | IDE | Single agent | `AGENTS.md` | None native |
| **Qoder** | Desktop/IDE | Autonomous Agents (Quest Mode) | `AGENTS.md` | None native |
| **Qwen Code** | Terminal | Single agent | `AGENTS.md` | None native |
| **Replit Agent** | Web IDE | Single agent | `replit.md` | None native |
| **Roo Code** | IDE extension | Custom modes | `.roo/rules/` / `.clinerules` | None native |
| **Rovo Dev** | Terminal/IDE | Subagents | `AGENTS.md` | Agent skills |
| **Snowflake Cortex Code** | Cloud/IDE | Single agent | `AGENTS.md` | None native |
| **Sourcegraph Amp** | Terminal/IDE | Single agent | `AGENTS.md` | None native |
| **Trae** | IDE | Rules | Trae Rules (UI) | None native |
| **Warp** | Terminal | Agent + skills | Rules (Warp Drive) | `.agents/skills/` |
| **Windsurf** | IDE | Rules + workflows | `.windsurfrules` / `AGENTS.md` | `.windsurf/workflows/` |
| **Zed** | IDE | Rules | `.rules` | None native |
| **Zencode (Zencoder)** | IDE extension | Agentic workflows | `AGENTS.md` | None native |

---

## opencode (default)

This is the native harness. No porting needed.

Vespyr uses opencode's subagent system directly:
- Agent definitions live in `.opencode/agents/*.md`
- Each agent has a frontmatter block with `mode: subagent`, permissions, and model assignment
- Agents are invoked with `@agent-name` in the chat
- Skills live in `.opencode/skills/*/SKILL.md`
- The main `AGENTS.md` at the project root gives opencode project-level context

**Docs:** [opencode.ai/docs/agents](https://opencode.ai/docs/agents)

---

## Claude Code

Claude Code has the closest conceptual match to opencode. It supports native subagents with their own context windows, a project-level memory file, and slash-command skills.

### How Claude Code handles agents

Claude Code reads `CLAUDE.md` at the start of every session. Subagents are defined as markdown files in `.claude/agents/`. Each subagent gets its own context window and can be invoked with `@agent-name` or spawned automatically by the main agent.

### What maps to what

| Vespyr (opencode) | Claude Code equivalent |
|---|---|
| `.opencode/agents/*.md` | `.claude/agents/*.md` |
| Agent frontmatter (`permission`, `mode`) | Agent frontmatter (`tools`, `description`) |
| `.opencode/skills/*/SKILL.md` | `.claude/commands/*.md` (slash commands) |
| `AGENTS.md` (project root) | `CLAUDE.md` (project root) |
| `artifacts/memory/` | `CLAUDE.md` sections or separate memory files |

### Steps to port

**1. Create `CLAUDE.md`**

Consolidate your `AGENTS.md` and `artifacts/memory/project-context.md` into a single `CLAUDE.md`:

```markdown
# Project: [Your Project]

## Tech stack
[Your stack]

## Coding conventions
[From patterns-and-conventions.md]

## Agent team
This project uses a multi-agent system. Agents are defined in .claude/agents/.
Invoke them with @agent-name or @mention them in your IDE chat.

## Shared memory
All memory access goes through @memory-controller. Never read artifacts/memory/
files directly. Use:
- @memory-controller load [agent-type] [task] — before starting any task
- @memory-controller write [file] [entry] — after completing work
- @memory-controller session-write [content] — at end of session
- @memory-controller search [query] — to find archived context
- @memory-controller status — health check

See .claude/agents/memory-controller.md for the full protocol.
```

**2. Convert agent files**

Copy `.opencode/agents/*.md` to `.claude/agents/*.md`. The prompt body stays identical. **Also copy `.opencode/agents/memory-controller.md` to `.claude/agents/memory-controller.md`** — this is the memory gatekeeper all other agents depend on. Update the frontmatter:

```markdown
---
# opencode format
description: Designs system architecture
version: "2.0"
mode: subagent
temperature: 0.1
permission:
  bash: deny
  edit: deny
---
```

becomes:

```markdown
---
# Claude Code format
name: architect
description: Designs system architecture and produces ADRs
tools:
  - Read
  - Glob
  - Grep
  - WebFetch
---
```

Claude Code uses `tools` (allowlist) instead of `permission` (deny/allow per tool). Map them:

| opencode permission | Claude Code tools |
|---|---|
| `bash: allow` | `Bash` |
| `edit: allow` | `Write`, `Edit` |
| `read: allow` | `Read` |
| `glob: allow` | `Glob` |
| `grep: allow` | `Grep` |
| `webfetch: allow` | `WebFetch` |

**3. Convert skills to slash commands**

Copy `.opencode/skills/*/SKILL.md` to `.claude/commands/*.md`. Slash commands are invoked with `/command-name` in the terminal.

```
.opencode/skills/humanizer/SKILL.md  →  .claude/commands/humanize.md
```

**4. Delegation pattern**

Claude Code does not enforce permission denial the same way opencode does. The delegation pattern still works, but it relies on the agent prompt rather than hard permission blocks. Add this to each thinking agent's prompt:

```markdown
## Delegation
- Use the Task tool to spawn @writer for file operations
- Use the Task tool to spawn @executor for bash commands
- Use the Task tool to spawn @reader for codebase search
Do not write files or run commands directly.
```

**Docs:** [docs.anthropic.com/claude-code](https://docs.anthropic.com/en/docs/claude-code/sub-agents)

---

## Codex CLI

Codex CLI (OpenAI) is a terminal agent. It does not have a native subagent system — it runs as a single agent. The port is a flattened version of Vespyr: one `AGENTS.md` that describes the full team and workflow, with the agent invoked by role in each prompt.

### How Codex handles instructions

Codex reads `AGENTS.md` at the project root automatically. It also reads `AGENTS.md` files in subdirectories when working in those directories. There are no subagents — you invoke the single agent and tell it which role to play.

### What maps to what

| Vespyr (opencode) | Codex CLI equivalent |
|---|---|
| `.opencode/agents/*.md` | Sections in `AGENTS.md` |
| Agent invocation (`@founder`) | Prompt prefix ("Act as the founder agent...") |
| `.opencode/skills/` | Sections in `AGENTS.md` or separate files referenced in prompt |
| `artifacts/memory/` | `AGENTS.md` sections + artifact files |

### Steps to port

**1. Create `AGENTS.md`**

Flatten the agent team into a single file. Each agent becomes a section:

```markdown
# Vespyr Agent Team

This project uses a multi-agent workflow. When asked to act as a specific agent,
follow that agent's role, responsibilities, and output format exactly.

## Shared memory
Read these files before starting any task:
- artifacts/memory/project-context.md
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this single-agent port, read the files directly and apply your own judgment
> about which sections are relevant to the current task.

## Agents

### @founder
[Paste the body of founder.md here]

### @product-manager
[Paste the body of product-manager.md here]

### @architect
[Paste the body of architect.md here]

...
```

**2. Invoke agents by role**

Since there are no subagents, you invoke the role in your prompt:

```
Act as @founder. I have an idea: [your idea]
```

```
Act as @architect. Read the PRD at artifacts/output/02-strategy/requirements.md
and design the system architecture.
```

**3. Limitations**

- No permission enforcement — the agent can write files and run commands regardless of role
- No separate context windows per agent — all agents share one context
- Delegation pattern is advisory only — the agent may not follow it consistently

For complex multi-phase workflows, run Codex in separate sessions per phase, passing the previous phase's output as context.

**Docs:** [opentools.ai/resources/codex-agents-md](https://opentools.ai/resources/codex-agents-md)

---

## Cursor

Cursor is an IDE fork. It does not have a native subagent system. Agents are simulated through rules — markdown files that get prepended to the model context for matching files or sessions.

### How Cursor handles rules

Rules live in `.cursor/rules/` as `.mdc` files. Each rule has frontmatter that controls when it applies:

```
alwaysApply: true          — included in every request
globs: ["src/**/*.ts"]     — included when matching files are in context
agentRequested: true       — agent can pull it in on demand
manual: true               — only included when explicitly referenced
```

The older `.cursorrules` single-file format still works but is deprecated.

### What maps to what

| Vespyr (opencode) | Cursor equivalent |
|---|---|
| `.opencode/agents/*.md` | `.cursor/rules/*.mdc` (one per agent) |
| Agent invocation (`@founder`) | `@agent-name` in chat (references the rule file) |
| `.opencode/skills/` | `.cursor/rules/` with `agentRequested: true` |
| `artifacts/memory/project-context.md` | `.cursor/rules/project-context.mdc` with `alwaysApply: true` |
| Permission system | Not available — advisory only |

### Steps to port

**1. Create the project context rule**

```
.cursor/rules/project-context.mdc
```

```markdown
---
description: Project context — always loaded
alwaysApply: true
---

# Project context

## Tech stack
[Your stack]

## Coding conventions
[From patterns-and-conventions.md]

## Agent team
This project uses a multi-agent workflow. Agents are defined as rules in
.cursor/rules/. Reference them with @rule-name in chat.
```

**2. Convert each agent to a rule file**

```
.opencode/agents/architect.md  →  .cursor/rules/architect.mdc
```

```markdown
---
description: Software architect — designs system architecture and produces ADRs
alwaysApply: false
---

You are a software architect. Your job is to design the system blueprint...

[Paste the body of architect.md here, minus the opencode frontmatter]
```

**3. Convert shared memory to always-on rules**

```
.cursor/rules/active-decisions.mdc   (alwaysApply: true)
.cursor/rules/patterns.mdc           (alwaysApply: true)
```

> **Note:** In the native opencode version, memory access goes through `@memory-controller` which handles filtering, compaction, and semantic search. In this Cursor port, the always-on rules are a simplified equivalent — they load the full files rather than filtered context. Keep these files under ~500 words each to avoid context bloat.

**4. Invoke agents in chat**

```
@architect Design the system architecture for the PRD at
artifacts/output/02-strategy/requirements.md
```

**5. Limitations**

- No subagents — all agents share one context window
- No permission enforcement
- Rule files have a size limit; keep agent prompts concise
- The delegation pattern (@writer, @executor, @reader) does not work natively — Cursor handles file writes and command execution itself

**Docs:** [docs.cursor.com/context/rules](https://docs.cursor.com/context/rules)

---

## Windsurf

Windsurf (Cascade) supports rules, `AGENTS.md` files, and workflows. It is the closest IDE-based match to opencode's model.

### How Windsurf handles agents

Windsurf reads `AGENTS.md` files automatically, scoped by directory. A root `AGENTS.md` applies globally; an `AGENTS.md` in `src/` applies only when Cascade is working in that directory. Rules (`.windsurfrules`) apply globally or per workspace. Workflows are markdown files that define multi-step processes.

### What maps to what

| Vespyr (opencode) | Windsurf equivalent |
|---|---|
| `.opencode/agents/*.md` | Sections in `AGENTS.md` or `.windsurfrules` |
| Agent invocation (`@founder`) | Prompt prefix or workflow step |
| `.opencode/skills/` | `.windsurf/workflows/*.md` |
| `artifacts/memory/project-context.md` | Root `AGENTS.md` header section |
| Permission system | Not available |

### Steps to port

**1. Create root `AGENTS.md`**

```markdown
# Vespyr agent team

## Project context
[From artifacts/memory/project-context.md]

## Coding conventions
[From artifacts/memory/patterns-and-conventions.md]

## Agents
When asked to act as a specific agent, follow that agent's role exactly.

### @founder
[Body of founder.md]

### @architect
[Body of architect.md]

...
```

**2. Create `.windsurfrules` for always-on context**

```markdown
This project uses a multi-agent workflow defined in AGENTS.md.
Always read artifacts/memory/active-decisions.md before making architectural changes.
Always read artifacts/memory/patterns-and-conventions.md before writing code.
```

> **Note:** In the native opencode version, memory access goes through `@memory-controller` which handles filtering, compaction, and semantic search. In this Windsurf port, the `.windsurfrules` directives are a simplified equivalent. Keep `active-decisions.md` and `patterns-and-conventions.md` under ~500 words each to avoid context bloat.

**3. Convert skills to workflows**

Windsurf workflows are markdown files in `.windsurf/workflows/`:

```
.opencode/skills/product-development/SKILL.md  →  .windsurf/workflows/product-development.md
```

Workflows are invoked with `/workflow-name` in Cascade.

**4. Invoke agents**

```
Act as @architect. Design the system for the PRD at
artifacts/output/02-strategy/requirements.md
```

**Docs:** [docs.windsurf.com/windsurf/cascade/agents-md](https://docs.windsurf.com/windsurf/cascade/agents-md)

---

## GitHub Copilot

GitHub Copilot (VS Code) supports custom agents, repository instructions, and per-file instructions. The agent system is the most structured of the IDE tools.

### How Copilot handles agents

Custom agents are defined as `.yml` files in `.github/agents/`. Each agent has a name, description, model, and instructions. Repository-level instructions live in `.github/copilot-instructions.md`. Per-file or per-directory instructions use `.instructions.md` files with glob frontmatter.

### What maps to what

| Vespyr (opencode) | GitHub Copilot equivalent |
|---|---|
| `.opencode/agents/*.md` | `.github/agents/*.yml` |
| Agent invocation (`@founder`) | `@agent-name` in Copilot Chat |
| `.opencode/skills/` | `.github/instructions/*.instructions.md` |
| `artifacts/memory/project-context.md` | `.github/copilot-instructions.md` |
| Permission system | `tools` allowlist in agent YAML |

### Steps to port

**1. Create `.github/copilot-instructions.md`**

```markdown
# Project context

## Tech stack
[Your stack]

## Coding conventions
[From patterns-and-conventions.md]

## Agent team
This project uses a multi-agent workflow. Agents are defined in .github/agents/.
Invoke them with @agent-name in Copilot Chat.
```

**2. Convert each agent to a YAML file**

```
.opencode/agents/architect.md  →  .github/agents/architect.yml
```

```yaml
name: architect
description: Designs system architecture and produces ADRs
model: claude-sonnet-4
instructions: |
  You are a software architect. Your job is to design the system blueprint...

  [Paste the body of architect.md here]
tools:
  - codebase
  - githubRepo
```

**3. Convert skills to instruction files**

```
.opencode/skills/humanizer/SKILL.md  →  .github/instructions/humanizer.instructions.md
```

```markdown
---
applyTo: "**"
---

[Paste SKILL.md content here]
```

**4. Invoke agents in VS Code**

Open Copilot Chat and select the agent from the dropdown, or type `@architect` in the chat.

**Docs:** [docs.github.com/en/copilot/how-tos/use-copilot-agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-custom-agents-in-your-ide)

---

## Aider

Aider is a terminal-based git-native coding assistant. It runs as a single agent with no subagent support. The port is minimal — a conventions file and a workflow guide.

### How Aider handles instructions

Aider reads a conventions file (typically `CONVENTIONS.md` or specified via `--read`) at the start of each session. There are no agents, skills, or workflows — just a single model with persistent instructions.

### Steps to port

**1. Create `CONVENTIONS.md`**

```markdown
# Vespyr conventions

## Workflow
This project uses a multi-agent workflow. When working on a task, identify
which agent role applies and follow that agent's standards.

## Agent roles and their standards

### Discovery phase (@founder, @market-researcher, @competitor-analyzer, @user-researcher)
- Output goes to artifacts/output/00-discovery/ and artifacts/output/01-research/
- Read artifacts/memory/project-context.md before starting

### Strategy phase (@product-manager, @product-designer)
- Output goes to artifacts/output/02-strategy/
- PRD format: requirements.md; user stories: user-stories.md

### Architecture phase (@architect, @tech-lead)
- Output goes to artifacts/output/03-architecture/ (ADRs) and artifacts/output/04-planning/
- Every architectural decision needs an ADR

### Development phase (@developer, @code-reviewer, @qa-engineer)
- Match existing code patterns exactly
- Tests alongside implementation, not after
- Code review before merge

## Coding conventions
[From patterns-and-conventions.md]

## Tech stack
[Your stack]
```

**2. Run Aider with the conventions file**

```bash
aider --read CONVENTIONS.md
```

Or add to `.aider.conf.yml`:

```yaml
read:
  - CONVENTIONS.md
  - artifacts/memory/active-decisions.md
  - artifacts/memory/patterns-and-conventions.md
```

**3. Invoke roles in prompts**

```
Acting as the architect agent: design the system architecture for the PRD
at artifacts/output/02-strategy/requirements.md. Save ADRs to
artifacts/output/03-architecture/.
```

**Docs:** [aider.chat/docs/usage/conventions.html](https://aider.chat/docs/usage/conventions.html)

---

## Zed

Zed is an IDE with an agent panel. It reads `.rules` files (and also `.cursorrules` and `CLAUDE.md` for compatibility). No native subagent system.

### Steps to port

**1. Create `.rules`**

```markdown
# Vespyr agent team

## Project context
[From artifacts/memory/project-context.md]

## Coding conventions
[From artifacts/memory/patterns-and-conventions.md]

## Shared memory
Read these files before starting any task:
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this Zed port, read the files directly and focus on sections relevant
> to your current task. Keep these files under ~500 words each.

## Agents
When asked to act as a specific agent, follow that agent's role exactly.
Agent definitions are in .opencode/agents/ — read the relevant file before responding.

## Workflow
[Brief summary of the phase workflow]
```

**2. Invoke agents**

```
Read .opencode/agents/architect.md and act as the architect agent.
Design the system for the PRD at artifacts/output/02-strategy/requirements.md.
```

**Docs:** [zed.dev/docs/ai/rules](https://zed.dev/docs/ai/rules)

---
## Augment Code

Augment Code is an IDE extension (VS Code and JetBrains) with a deep codebase indexing engine. It supports rules files for persistent instructions and skills for reusable workflows.

### How Augment handles instructions

Augment reads rules from `.augment/rules/` in the workspace. Rules are markdown files that are injected into every agent and chat session. Skills are reusable instruction sets that can be invoked on demand.

### What maps to what

| Vespyr (opencode) | Augment Code equivalent |
|---|---|
| `.opencode/agents/*.md` | Sections in `.augment/rules/agents.md` |
| Agent invocation (`@founder`) | Prompt prefix ("Act as the founder agent...") |
| `.opencode/skills/*/SKILL.md` | `.augment/skills/*.md` |
| `artifacts/memory/project-context.md` | `.augment/rules/project-context.md` |
| Permission system | Not available |

### Steps to port

**1. Create `.augment/rules/project-context.md`**

```markdown
# Project context

## Tech stack
[Your stack]

## Coding conventions
[From patterns-and-conventions.md]

## Agent team
This project uses a multi-agent workflow. When asked to act as a specific agent,
follow that agent's role exactly. Agent definitions are in .augment/rules/agents.md.

## Shared memory
Read these files before starting any task:
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this Augment port, read the files directly and focus on sections relevant
> to your current task. Keep these files under ~500 words each.
```

**2. Create `.augment/rules/agents.md`**

Flatten the agent team into a single rules file:

```markdown
# Agent definitions

### @founder
[Body of founder.md]

### @architect
[Body of architect.md]

...
```

**3. Convert skills**

```
.opencode/skills/humanizer/SKILL.md  →  .augment/skills/humanize.md
```

**4. Invoke agents**

```
Act as @architect. Design the system for the PRD at
artifacts/output/02-strategy/requirements.md.
```

**Docs:** [docs.augmentcode.com/setup-augment/guidelines](https://docs.augmentcode.com/setup-augment/guidelines)

---

## Block Goose

Goose (by Block, now part of the Agentic AI Foundation) is an open-source terminal and desktop agent. It uses a `.goosehints` file for project-level instructions and extends via MCP for additional tools.

### How Goose handles instructions

Goose reads `.goosehints` in the project root at the start of each session. There are no native subagents — Goose is a single agent that can be extended with MCP servers. The `.goosehints` file is plain markdown.

### What maps to what

| Vespyr (opencode) | Block Goose equivalent |
|---|---|
| `.opencode/agents/*.md` | Sections in `.goosehints` |
| Agent invocation (`@founder`) | Prompt prefix ("Act as the founder agent...") |
| `.opencode/skills/` | MCP server tools or prompt sections |
| `artifacts/memory/project-context.md` | `.goosehints` header section |
| Permission system | Not available |

### Steps to port

**1. Create `.goosehints`**

```markdown
# Vespyr project

## Project context
[From artifacts/memory/project-context.md]

## Coding conventions
[From artifacts/memory/patterns-and-conventions.md]

## Shared memory
Read these files before starting any task:
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this Goose port, read the files directly and focus on sections relevant
> to your current task. Keep these files under ~500 words each.

## Agent team
This project uses a multi-agent workflow. When asked to act as a specific agent,
follow that agent's role exactly.

### @founder
[Body of founder.md]

### @architect
[Body of architect.md]

...
```

**2. Invoke agents**

```
Act as @architect. Design the system for the PRD at
artifacts/output/02-strategy/requirements.md.
```

**Docs:** [block.github.io/goose](https://block.github.io/goose/docs/getting-started/goosehints)

---

## Cline

Cline is an open-source VS Code extension. It uses `.clinerules` files for persistent instructions — either a single file or a directory of markdown files.

### How Cline handles instructions

Cline reads `.clinerules` at the project root. This can be a single markdown file or a `.clinerules/` directory containing multiple `.md` files (loaded alphabetically). There are no native subagents — Cline is a single agent.

### What maps to what

| Vespyr (opencode) | Cline equivalent |
|---|---|
| `.opencode/agents/*.md` | `.clinerules/agents.md` |
| Agent invocation (`@founder`) | Prompt prefix ("Act as the founder agent...") |
| `.opencode/skills/` | `.clinerules/` files or prompt sections |
| `artifacts/memory/project-context.md` | `.clinerules/project-context.md` |
| Permission system | Not available |

### Steps to port

**1. Create `.clinerules/` directory**

Use a directory for better organization:

```
.clinerules/
  00-project-context.md
  01-agents.md
  02-conventions.md
```

**2. Create `.clinerules/00-project-context.md`**

```markdown
# Project context

## Tech stack
[Your stack]

## Shared memory
Read these files before starting any task:
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this Cline port, read the files directly and focus on sections relevant
> to your current task. Keep these files under ~500 words each.
```

**3. Create `.clinerules/01-agents.md`**

```markdown
# Agent team

When asked to act as a specific agent, follow that agent's role exactly.

### @founder
[Body of founder.md]

### @architect
[Body of architect.md]

...
```

**4. Invoke agents**

```
Act as @architect. Design the system for the PRD at
artifacts/output/02-strategy/requirements.md.
```

**Docs:** [cline.bot/blog/clinerules](https://cline.bot/blog/clinerules-version-controlled-shareable-and-ai-editable-instructions)

---

## Hermes Agent

Hermes Agent (Nous Research) is an open-source terminal and messaging gateway agent. It reads `AGENTS.md` as its primary project context file, supports subagent delegation, and has a built-in skill-generation loop.

### How Hermes handles instructions

Hermes discovers context files from the working directory. It loads `AGENTS.md` at startup and progressively discovers subdirectory `AGENTS.md` files as the agent navigates. `SOUL.md` (in `~/.hermes/`) defines the agent's persistent identity. Skills are stored in `skills/` directories and can be auto-generated from experience.

### What maps to what

| Vespyr (opencode) | Hermes Agent equivalent |
|---|---|
| `.opencode/agents/*.md` | Sections in `AGENTS.md` or `skills/` files |
| Agent invocation (`@founder`) | Prompt prefix ("Act as the founder agent...") |
| `.opencode/skills/*/SKILL.md` | `skills/*/SKILL.md` (same format — Hermes auto-generates these) |
| `AGENTS.md` (project root) | `AGENTS.md` (project root) — same file |
| `artifacts/memory/` | Hermes persistent memory (SQLite + FTS5) or `MEMORY.md` |

### Steps to port

**1. Create or update `AGENTS.md`**

Hermes already reads `AGENTS.md` from the project root. Flatten the agent team into sections:

```markdown
# Vespyr Agent Team

This project uses a multi-agent workflow. When asked to act as a specific agent,
follow that agent's role, responsibilities, and output format exactly.

## Shared memory
Read these files before starting any task:
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this Hermes port, read the files directly and focus on sections relevant
> to your current task.

## Agents
### @founder
[Body of founder.md]

### @architect
[Body of architect.md]

...
```

**2. Convert skills to Hermes skills**

Copy `.opencode/skills/*/SKILL.md` to `skills/*/SKILL.md`:

```
.opencode/skills/humanizer/SKILL.md  →  skills/humanizer/SKILL.md
```

Hermes loads skills from these locations (highest precedence first): project `skills/`, `.agents/skills/`, `~/.agents/skills/`, and `~/.hermes/skills/`.

**3. Optional: Create `SOUL.md` for agent identity**

Hermes reads `SOUL.md` from `~/.hermes/SOUL.md` as its persistent identity. This can reference the agent team structure:

```markdown
# SOUL.md

This Hermes instance runs the Vespyr project. When asked, adopt the role of
the relevant agent from AGENTS.md. Always read AGENTS.md first before
responding to project tasks.
```

**4. Invoke agents**

```
Act as @architect. Design the system for the PRD at
artifacts/output/02-strategy/requirements.md.
```

**Docs:** [hermes-agent.nousresearch.com/docs/user-guide/configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration/)

---

## OpenClaw

OpenClaw is an open-source terminal and messaging gateway agent. It supports multi-agent routing, workspace isolation, and a skills ecosystem. Instructions are provided through bootstrap markdown files injected into every session.

### How OpenClaw handles agents

OpenClaw runs a single embedded agent runtime per workspace. Each session, it injects bootstrap files from the workspace directory into the agent context:

- `AGENTS.md` — operating instructions and "memory"
- `SOUL.md` — persona, boundaries, tone
- `TOOLS.md` — user-maintained tool notes
- `USER.md` — user profile and preferences

Multi-agent setups use routing bindings to pin channel traffic to specific agents with their own workspaces. Skills are loaded from project and user `skills/` directories — plus clawhub for community skills.

### What maps to what

| Vespyr (opencode) | OpenClaw equivalent |
|---|---|
| `.opencode/agents/*.md` | Sections in `AGENTS.md` or `skills/` files |
| Agent invocation (`@founder`) | Prompt prefix in the channel or `AGENTS.md` role section |
| `.opencode/skills/*/SKILL.md` | `skills/*/SKILL.md` — same SKILL.md format |
| `AGENTS.md` (project root) | `AGENTS.md` in workspace — primary instructions |
| `artifacts/memory/` | `AGENTS.md` sections or workspace `MEMORY.md` |

### Steps to port

**1. Create workspace bootstrap files**

OpenClaw expects these files in the agent workspace (default: `~/.openclaw/workspace/`):

```
~/.openclaw/workspace/
  AGENTS.md
  SOUL.md
  TOOLS.md
  USER.md
```

**2. Create `AGENTS.md`**

Flatten the agent team into a single file as done for Codex CLI:

```markdown
# Vespyr Agent Team

This project uses a multi-agent workflow. When asked to act as a specific agent,
follow that agent's role, responsibilities, and output format exactly.

## Shared memory
Read these files before starting any task:
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this OpenClaw port, read the files directly and focus on sections relevant
> to your current task.

## Agents
### @founder
[Body of founder.md]

### @architect
[Body of architect.md]

...
```

**3. Create `SOUL.md`**

Define the agent's identity and operating principles:

```markdown
# SOUL.md

You are the Vespyr agent team lead. Your job is to coordinate specialized
agents for product development. When a task arrives, identify which agent
role is needed, load AGENTS.md for their instructions, and follow their
output format exactly.
```

**4. Convert skills**

Copy `.opencode/skills/*/SKILL.md` to the workspace `skills/` directory or install from clawhub.

**5. Invoke agents**

OpenClaw agents are invoked through channels (CLI, Telegram, Discord, etc.):

```
Act as @architect. Design the system for the PRD at
artifacts/output/02-strategy/requirements.md.
```

**Docs:** [docs.openclaw.ai](https://docs.openclaw.ai)

---

## Other Harnesses

For harnesses not explicitly detailed above (e.g., Adal, Auggie, Command Code, iFlow, Kode, Mux, Neovate, Ona, Pi, Pochi, Qoder, Snowflake Cortex Code, Zencode, and others), Vespyr can be ported using the **Universal Single-Agent Pattern**.

### The Universal Single-Agent Pattern

Most AI coding harnesses that don't have native subagent or rule-file support will by default read standard markdown files in your workspace, or you can point them to it. 

**1. Create a root `AGENTS.md`**

Flatten the agent team into a single file as done for Codex CLI.

```markdown
# Vespyr Agent Team

This project uses a multi-agent workflow. When asked to act as a specific agent,
follow that agent's role, responsibilities, and output format exactly.

## Shared memory
Read these files before starting any task:
- artifacts/memory/active-decisions.md
- artifacts/memory/patterns-and-conventions.md

> **Note:** In the native opencode version, memory access goes through
> `@memory-controller` which handles filtering, compaction, and semantic search.
> In this single-agent port, read the files directly and focus on sections
> relevant to your current task. Keep these files under ~500 words each.

## Agents
### @founder
[Body]
```

**2. Feed Context explicitly**

When starting a session with one of these tools, use this prompt:

> "Please read `AGENTS.md` for the team structure and `artifacts/memory/project-context.md` for the context. I want you to act as the @founder agent for this request."

**3. Tooling and Skills**

If the harness supports native custom tools or MCP (Model Context Protocol), you can map the skills from `.opencode/skills/` to the tool schema the harness requires. Otherwise, treat skills as standard operating procedures documented in `AGENTS.md` or dedicated skill markdown files.
