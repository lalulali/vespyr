# Multi-Agent & Subagent Invocation Across AI Coding Harnesses

> **Research Report &#124; 2026-07-22 &#124; @researcher (Iris)**
> Purpose: Understand which AI coding harnesses can and cannot spawn independent agent processes, and what mechanisms exist to bridge the gap.

---

## Executive Summary

**Claude Code is the clear leader in multi-agent capabilities**, offering four distinct mechanisms: custom subagents (native, markdown-based), agent teams (experimental, inter-agent communication), background agents (research preview, parallel sessions), and dynamic workflows (JavaScript-based orchestration). **VS Code/GitHub Copilot** is a strong second with custom agents, subagents, handoffs, and coordinator/worker patterns. **Cursor** offers parallel cloud agents and automations but no programmable subagent spawning within the IDE. **Windsurf/Devin Desktop** offers simultaneous Cascade conversations and workflows but no multi-agent orchestration. **Aider** has a two-model architect/editor split but no true subagent spawning. **Kiro** could not be found as a publicly documented harness.

**The critical gap**: No cross-harness subagent definition standard exists. VS Code Copilot partially supports Claude's `.claude/agents/` format — the closest thing to a bridge. Every other harness has its own proprietary mechanism or none at all.

---

## Per-Harness Capability Matrix

| Capability | Claude Code | VS Code/Copilot | Cursor | Windsurf/Devin | Aider | Kiro |
|---|---|---|---|---|---|---|
| **Custom Subagents (native)** | ✅ Full | ✅ Full | ❌ None | ❌ None | ❌ None | ❓ Unknown |
| **Subagent Definition Format** | Markdown + YAML frontmatter (`.md` in `.claude/agents/`) | `.agent.md` + YAML frontmatter + Claude `.md` compat | N/A | N/A | N/A | ❓ Unknown |
| **Parallel Subagent Execution** | ✅ Yes | ✅ Yes | ⚠️ Cloud only | ⚠️ Simultaneous Cascades | ❌ No | ❓ Unknown |
| **Nested Subagents** | ✅ Yes | ✅ Yes (max depth 5) | ❌ No | ❌ No | ❌ No | ❓ Unknown |
| **Inter-Agent Messaging** | ✅ Yes (agent teams) | ⚠️ Handoffs only | ❌ No | ❌ No | ❌ No | ❓ Unknown |
| **Agent Teams (shared tasks)** | ✅ Experimental | ❌ No | ❌ No | ❌ No | ❌ No | ❓ Unknown |
| **Background/Cloud Agents** | ✅ Research preview | ✅ Cloud agents | ✅ Cloud agents | ❌ No | ❌ No | ❓ Unknown |
| **Dynamic Workflows (JS)** | ✅ `ultracode` | ❌ No | ❌ No | ❌ No | ❌ No | ❓ Unknown |
| **Programmatic SDK** | ✅ Python/TypeScript | ⚠️ REST API only | ❌ No | ❌ No | ⚠️ CLI scripting | ❓ Unknown |
| **Shell Access** | ✅ Full Bash | ✅ Full Bash | ✅ Full Bash | ✅ Full | ✅ Full | ❓ Unknown |
| **MCP Server Support** | ✅ Full | ✅ Full | ✅ Yes | ✅ Yes | ❌ No | ❓ Unknown |
| **Worktree Isolation** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No | ❓ Unknown |
| **Per-Agent Model Selection** | ✅ Yes | ✅ Yes | N/A | N/A | ⚠️ Architect/editor split | ❓ Unknown |
| **Hooks (lifecycle events)** | ✅ SubagentStart/Stop | ⚠️ Preview | ❌ No | ❌ No | ❌ No | ❓ Unknown |
| **Architect/Editor Model Split** | ⚠️ Via subagents | ⚠️ Via subagents | ❌ No | ❌ No | ✅ Native | ❓ Unknown |

**Legend**: ✅ = Full support, ⚠️ = Partial/limited, ❌ = Not available, ❓ = Unknown

---

## Detailed Harness Analysis

### 1. Claude Code (Anthropic) — Leader

Claude Code offers the most sophisticated multi-agent capabilities of any harness, with four distinct tiers:

#### 1a. Custom Subagents (Native, GA)

**Mechanism**: Markdown files with YAML frontmatter, stored in:
- `~/.claude/agents/` (user-level, available across all projects)
- `.claude/agents/` (project-level, version-controllable)
- Plugin's `agents/` directory
- `--agents` CLI flag (JSON, session-only)
- Managed settings (organization-wide deployment)

**Priority**: Managed settings > `--agents` CLI > `.claude/agents/` > `~/.claude/agents/` > Plugins

**Key capabilities**:
- Custom system prompts, tool allowlists/denylists, model selection
- Permission modes (default, acceptEdits, auto, dontAsk, bypassPermissions, plan)
- Lifecycle hooks (SubagentStart, SubagentStop, PreToolUse, PostToolUse)
- Skills preloading into subagent context
- MCP servers scoped to individual subagents
- Persistent memory (`user`, `project`, `local` scopes)
- Git worktree isolation (`isolation: worktree`)
- Effort level configuration, background execution
- Nested subagents (subagents can spawn subagents)

**Built-in subagents**: Explore (read-only codebase search), Plan (read-only planning research), General-purpose (full capabilities), plus utility agents.

**Invocation**: Automatic delegation based on subagent description + natural language request, @-mention for explicit invocation, `--agent` flag for session-wide use.

**Sources**: [^1]

#### 1b. Agent Teams (Experimental)

**Mechanism**: Enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Spawns separate Claude Code instances (not subagents within a session). Each has its own context window and can communicate directly with others.

**Key capabilities**:
- Shared task list with file-lock-based claiming
- Inter-agent messaging via mailbox system (JSON files)
- Direct user interaction with any teammate
- Plan approval workflow (teammates plan first, lead approves)
- Two display modes: in-process (single terminal) or split-panes (tmux/iTerm2)
- Subagent definitions can serve as teammate templates
- Hooks for quality gates: `TeammateIdle`, `TaskCreated`, `TaskCompleted`

**Limitations**: One team per session, no nested teams, lead is fixed, no session resumption with in-process teammates.

**Sources**: [^2]

#### 1c. Background Agents (Research Preview)

**Mechanism**: `claude agents` command opens agent view — a terminal dashboard for managing multiple parallel Claude Code sessions. Sessions can be dispatched, peeked at, attached to, and backgrounded.

**Key capabilities**:
- Dispatch multiple independent sessions from a single dashboard
- Sessions keep running when terminal is closed (supervisor process)
- Git worktree isolation for parallel file edits
- Session peeking, replying, attaching/detaching
- State icons (Working, Needs Input, Idle, Completed, Failed)
- Pull request status tracking
- `/fork` to copy a session, `/bg` to background current session

**Sources**: [^3]

#### 1d. Dynamic Workflows (JavaScript)

**Mechanism**: Claude Code can write and execute JavaScript orchestrator files that spawn and coordinate subagents. Triggered by the keyword "`ultracode`" or by asking Claude to create a workflow.

**Documented patterns**:
- **Classify-and-act**: Classifier agent routes to specialized agents
- **Fan-out-and-synthesize**: Parallel agents + merge step
- **Adversarial verification**: Verification agents challenge output
- **Generate-and-filter**: Generate candidates, filter by rubric
- **Tournament**: Agents compete, pairwise judging
- **Loop until done**: Iterative spawning until stop condition

**Sources**: [^4]

#### 1e. Agent SDK (Programmatic)

**Mechanism**: Python and TypeScript SDK (`@anthropic-ai/claude-agent-sdk` / `claude-agent-sdk`). Full Claude Code tool execution, subagent spawning, MCP, hooks, sessions — all programmable.

**Sources**: [^5]

---

### 2. VS Code / GitHub Copilot (Microsoft) — Strong Second

#### 2a. Custom Agents

**Mechanism**: `.agent.md` files with YAML frontmatter, stored in:
- `.github/agents/` (workspace-level)
- `.claude/agents/` (workspace-level, Claude-compatible format)
- `~/.copilot/agents/` (user-level)
- Organization-level (GitHub organization settings)

**Key capabilities**:
- Tool allowlists (`tools` array) including MCP tools
- Agent allowlists (`agents` array) — restrict which agents can be used as subagents
- Model selection (single string or prioritized array)
- `user-invocable` / `disable-model-invocation` flags for access control
- Handoffs: guided sequential workflows with interactive buttons
- Handoff properties: label, agent, prompt, send (auto-submit), model
- Hooks (Preview): scoped to agent with `chat.useCustomAgentHooks` setting

**Claude compatibility**: VS Code detects `.md` files in `.claude/agents/` and maps Claude-specific tool names to VS Code equivalents. This is the **only cross-harness bridge** found in this research.

**Sources**: [^6]

#### 2b. Subagents

**Mechanism**: Agent-initiated via `agent/runSubagent` tool. The main agent decides when to delegate.

**Key capabilities**:
- Nested subagents (max depth 5, requires `chat.subagents.allowInvocationsFromSubagents`)
- Parallel subagent execution
- Multi-model subagents (explicit model parameter or custom agent model)
- Custom agents as subagents (with own tools, model, instructions)
- Coordinator/worker pattern (documented)
- Multi-perspective code review pattern (parallel specialized subagents)
- Recursive self-referential agents (divide-and-conquer)

**Restrictions**: Agents can be restricted to specific subagents via `agents` property. `disable-model-invocation: true` prevents agent from being used as subagent.

**Sources**: [^7]

---

### 3. Cursor (Anysphere) — Parallel Execution, No Programmatic Subagents

**Multi-agent collaboration** listed as a 2024 research project — indicates investment but no publicly documented subagent spawning mechanism within the IDE.

**What Cursor does offer**:
- **Cloud Agents**: Separate compute instances that "use their own computers to build, test, and demo features." Can run multiple in parallel from the Cursor interface.
- **Automations**: Always-on agents that run on schedules or triggers (e.g., "Fix CI failures on main"). Includes agent instructions, tools/MCPs, and triggers.
- **CLI**: `cursor-agent` command for terminal-based agent execution.
- **Composer 2**: Custom-trained coding model (fine-tuned Kimi K2.5) for agentic software engineering, trained via RL in realistic Cursor sessions.

**Gap**: No documented mechanism for users to define custom subagent personas, spawn agents programmatically from within the IDE, or orchestrate multi-agent workflows with inter-agent communication. The "agent mode" is a single-agent experience.

**Sources**: [^8][^9]

---

### 4. Windsurf / Devin Desktop (Cognition AI) — Simultaneous Chats, No Orchestration

> **Note**: Windsurf (originally by Codeium) was acquired by Cognition AI. The product is now "Devin Desktop" (formerly Windsurf Editor). The docs now live at `docs.devin.ai`.

**What it offers**:
- **Cascade**: The primary AI assistant with Code and Chat modes.
- **Simultaneous Cascades**: Multiple Cascade conversations can run in parallel (dropdown to switch). Warning about file race conditions.
- **Planning agent**: Specialized planning agent runs in background while main model executes.
- **Workflows**: Automate repetitive trajectories.
- **MCP, Memories, Rules**: Standard AI IDE features.

**Gap**: No subagent spawning, no custom agent personas, no inter-agent communication, no agent teams. Simultaneous Cascades are independent sessions, not orchestrated agents.

**Sources**: [^10][^11]

---

### 5. Aider — Single-Process, No Subagents

Aider is a terminal-based AI pair programming tool with a fundamentally single-process architecture.

**What it offers**:
- **Architect mode**: Two-model pipeline — a main "architect" model proposes solutions, an "editor" model translates proposals into file edits. This is the closest thing to multi-agent behavior but runs sequentially in the same process.
- **Chat modes**: `code`, `ask`, `architect`, `help` — mode switching within one session.
- **Scripting**: Can be scripted via CLI (`aider --message`) or Python for automation.
- **Repository map**: Automatic codebase context for the LLM.

**Gap**: No subagent spawning, no parallel agents, no inter-agent communication, no custom agent personas. The architect/editor split is model routing, not true multi-agent orchestration.

**Sources**: [^12][^13]

---

### 6. Kiro — Not Found

No publicly accessible documentation, GitHub repository, or product page was found for "Kiro" as an AI coding harness with multi-agent capabilities. Searches for "Kiro AI subagent", "Kiro multi-agent", and `github.com/Kiro-ai/Kiro` returned no results.

**Status**: Unknown / likely not a publicly available product at this time.

---

## Community & Ecosystem Insights

### The Anthropic Harness Design Philosophy

Anthropic has published extensive guidance on agent harness design that's relevant to multi-agent orchestration [^4][^14]:

1. **Lean on the model, not the harness**: Use general tools (Bash, text editor) that Claude already knows, rather than building rigid, task-specific tools.
2. **Strip the harness down**: Let Claude orchestrate its own actions (code execution rather than token-by-token tool loops), manage its own context (skills for progressive disclosure, subagents for context isolation, compaction for long-running tasks), and persist its own context (memory folders).
3. **Set boundaries carefully**: Maximize cache hits, use declarative tools for UX/observability/security, and continually re-evaluate what the harness needs to enforce.

### Multi-Agent Design Patterns (from Dynamic Workflows)

The Claude Code team documented these orchestration patterns [^4]:
- Classify-and-act
- Fan-out-and-synthesize
- Adversarial verification
- Generate-and-filter
- Tournament (pairwise comparison)
- Loop until done

### What Users Are Actually Doing

Based on the documented use cases and community patterns:
- **Claude Code users**: Using subagents for context isolation, agent teams for adversarial review and parallel research, background agents for unattended tasks, and dynamic workflows for complex orchestration.
- **VS Code/Copilot users**: Building coordinator/worker architectures with custom agents and subagents, using handoffs for guided sequential workflows.
- **Cursor users**: Relying on cloud agents for parallel autonomous work, automations for scheduled tasks.
- **Aider users**: Using architect mode for complex changes where one model isn't sufficient.

### The Claude `.claude/agents/` Bridge

The most notable cross-harness compatibility finding: **VS Code Copilot detects and loads `.md` files from `.claude/agents/`**, following the Claude subagent format. This means:
- Agent definitions written for Claude Code's subagent system also work in VS Code Copilot
- This is the only working bridge between two different harnesses
- VS Code maps Claude-specific tool names to VS Code equivalents

---

## Gap Analysis: What's Missing Across All Harnesses

### 1. No Cross-Harness Agent Definition Standard
Every harness defines agents differently. Even VS Code's Claude-compatible format is a one-way bridge (Claude → VS Code), not bidirectional.

### 2. No Universal Agent Spawning Protocol
There is no standard way for one harness to say "spawn an agent of type X with prompt Y." Each harness has its own internal mechanism:
- Claude Code: `Agent` tool with `agent_type` parameter
- VS Code: `agent/runSubagent` tool
- Cursor: Cloud agent dispatch (internal API)
- Windsurf: Simultaneous Cascade (UI-only)

### 3. Terminal-First Harnesses Lag Behind
Aider has no subagent infrastructure. Most terminal-based tools (outside Claude Code) focus on single-agent interaction.

### 4. No Inter-Harness Agent Communication
Agent teams in Claude Code can communicate within the same session. But there's no mechanism for a Claude Code agent to communicate with a VS Code Copilot agent or a Cursor cloud agent.

### 5. Programmatic Orchestration Is Proprietary
- Claude Code: Agent SDK (Python/TypeScript) — the most capable
- VS Code: No public SDK for agent orchestration
- Cursor: No public SDK
- Aider: CLI scripting only

### 6. Model Routing Varies Widely
- Claude Code: Per-agent model, effort, extended thinking
- VS Code: Per-agent prioritized model list
- Cursor: Model picker per session
- Aider: Architect/editor model split only

---

## Recommendations: Mechanisms to Bridge the Gap

### Recommendation 1: MCP as a Universal Agent Bridge
**Model Context Protocol (MCP)** is the most promising cross-harness standard. Both Claude Code and VS Code Copilot support MCP servers. If multi-agent orchestration were exposed as MCP tools, any MCP-compatible harness could spawn and coordinate agents.

**Approach**: Define MCP tools for:
- `agent.spawn(name, prompt, tools, model)` → returns agent_id
- `agent.status(agent_id)` → returns state/progress
- `agent.message(agent_id, message)` → inter-agent communication
- `agent.result(agent_id)` → returns final output
- `agent.stop(agent_id)` → terminate agent

### Recommendation 2: Standardize on `.claude/agents/` Format
Since VS Code already supports Claude Code's agent definition format, standardizing on this as a cross-harness format would maximize compatibility. The format is simple (Markdown + YAML frontmatter) and already proven.

**Approach**: 
- Propose this as a community standard
- Build converters for other harnesses
- Advocate for Cursor, Windsurf, and Aider to support this format

### Recommendation 3: CLI-Based Agent Spawning
For harnesses without native subagent support (Aider, Cursor CLI), a CLI-based bridge could work:
```bash
claude --agent researcher --prompt "research X" --output result.md
```

**Approach**: Build a CLI wrapper that:
- Accepts agent definitions in a standard format
- Spawns the appropriate underlying harness
- Collects and returns results
- Abstracts away harness-specific details

### Recommendation 4: Agent SDK as Orchestration Layer
For programmatic use, Claude Code's Agent SDK is the most capable option today. Building orchestration on top of this SDK provides:
- Full tool access (Read, Write, Edit, Bash, etc.)
- Subagent spawning
- MCP integration
- Session management
- Hooks and permissions

### Recommendation 5: File-Based Inter-Agent Communication (Agent Teams Pattern)
Claude Code's agent team mailbox system (JSON files in `~/.claude/teams/`) demonstrates a harness-agnostic pattern: agents communicate via the filesystem. This pattern could work across any harness that has file read/write access.

**Approach**: Define a standard mailbox format:
```json
{
  "id": "msg-001",
  "from": "researcher:session-abc",
  "to": "developer:session-def",
  "type": "task_result | query | handoff",
  "content": "...",
  "timestamp": "2026-07-22T..."
}
```

### Recommendation 6: GitHub Actions as Universal Agent Runtime
GitHub Actions provide a universal compute environment with filesystem access. Multi-agent orchestration could be implemented as:
- Each agent runs as a separate GitHub Actions job
- Communication via artifacts, issue comments, or PR comments
- Coordination via a "lead" agent job

---

## Sources

[^1]: Anthropic, "Create custom subagents," Claude Code Documentation. URL: https://code.claude.com/docs/en/sub-agents. Accessed: 2026-07-22.

[^2]: Anthropic, "Orchestrate teams of Claude Code sessions," Claude Code Documentation. URL: https://code.claude.com/docs/en/agent-teams. Accessed: 2026-07-22.

[^3]: Anthropic, "Manage multiple agents with agent view," Claude Code Documentation. URL: https://code.claude.com/docs/en/agent-view. Accessed: 2026-07-22.

[^4]: Thariq Shihipar and Sid Bidasaria, "A harness for every task: dynamic workflows in Claude Code," Anthropic Blog, June 2, 2026. URL: https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code. Accessed: 2026-07-22.

[^5]: Anthropic, "Agent SDK overview," Claude Code Documentation. URL: https://code.claude.com/docs/en/agent-sdk/overview. Accessed: 2026-07-22.

[^6]: Microsoft, "Custom agents in VS Code," VS Code Documentation, July 15, 2026. URL: https://code.visualstudio.com/docs/agent-customization/custom-agents. Accessed: 2026-07-22.

[^7]: Microsoft, "Subagents in Visual Studio Code," VS Code Documentation, July 15, 2026. URL: https://code.visualstudio.com/docs/agents/subagents. Accessed: 2026-07-22.

[^8]: Cursor, "Cursor: AI coding agent," Product Page. URL: https://cursor.com. Accessed: 2026-07-22.

[^9]: Sasha Rush, "A technical report on Composer 2," Cursor Blog, March 27, 2026. URL: https://cursor.com/blog/composer-2-technical-report. Accessed: 2026-07-22.

[^10]: Devin Desktop, "Welcome to Devin Desktop," Documentation. URL: https://docs.devin.ai. Accessed: 2026-07-22.

[^11]: Devin Desktop, "Cascade Overview," Documentation. URL: https://docs.devin.ai/desktop/cascade. Accessed: 2026-07-22.

[^12]: Aider, "FAQ," Documentation. URL: https://aider.chat/docs/faq.html. Accessed: 2026-07-22.

[^13]: Aider, "Chat modes," Documentation. URL: https://aider.chat/docs/usage/modes.html. Accessed: 2026-07-22.

[^14]: Lance Martin, "Agent Harness Design: 3 Patterns for Harnessing Claude's Intelligence," Anthropic Blog, April 2, 2026. URL: https://claude.com/blog/harnessing-claudes-intelligence. Accessed: 2026-07-22.

---

*Research completed by @researcher (Iris). Methodology: Direct documentation fetch from official sources for all known AI coding harnesses. No fabricated citations. Harnesses not publicly documented are noted as such.*
