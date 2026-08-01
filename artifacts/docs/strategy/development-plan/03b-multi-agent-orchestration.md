# Plan 03b — Cross-Harness Multi-Agent Orchestration

**Status:** Planned
**Date:** 2026-07-22
**Depends on:** Phase 0 (agent personas, delegation-pattern.md), Phase 2 hooks F2.1-F2.5 (lifecycle hooks for enforcement), Plan 03a (§3a MCP server for tool exposure)
**Themes:** T4 (Harness contracts), T8 (UTTERLY SATISFIED culture)
**Release:** v2.1

---

## 1. Problem Statement

Vespyr's two core multi-agent patterns function ONLY in OpenCode today:

| Pattern | What it does | Harnesses where it works |
|---|---|---|
| **I/O Delegation** (Pattern A) | Reasoning agents delegate reads, writes, shell commands, memory operations to narrow I/O sub-agents (@reader, @writer, @executor, @memory-controller) | OpenCode only |
| **Multi-Agent Reasoning** (Pattern B) | Skills invoke multiple reasoning agents (@founder, @architect, @developer, @qa-engineer) that produce independent analysis | OpenCode only |

This means **Vespyr's #1 differentiator (permission-denial I/O split) delivers zero value in 4 of 5 active harnesses**. The Socratic depth (#2 differentiator) evaporates when one LLM roleplays all personas. The 3-tier memory (#3 differentiator) still functions via `@memory-controller` but without the I/O agent that's supposed to marshal it.

**The core misconception:** The existing architecture treats "spawn a subagent" as an OpenCode-specific feature. But multiple harnesses have their OWN subagent mechanisms — they just differ from OpenCode's implementation:

| Harness | Subagent Mechanism | Parallelism | Agent Definition Format | SDK |
|---|---|---|---|---|
| **OpenCode** | `"mode": "subagent"` with per-agent permissions | ✅ Parallel | `opencode.json` entries | ❌ |
| **Claude Code** | Custom subagents (`agent_type` in `.claude/agents/`), agent teams, background agents, dynamic workflows (JS) | ✅ Parallel | Markdown + YAML in `.claude/agents/` | ✅ Python/TypeScript |
| **VS Code Copilot** | `agent/runSubagent`, coordinator/worker, nested agents (depth 5) | ✅ Parallel | `.agent.md` or `.claude/agents/` (Claude-compatible) | ⚠️ REST API |
| **Cursor** | Cloud agents (separate compute instances) + automations (scheduled) | ✅ Parallel (cloud) | Internal API only | ❌ |
| **Windsurf/Devin** | Simultaneous Cascade conversations | ⚠️ Parallel (no orchestration) | Internal only | ❌ |
| **Aider** | Architect/editor two-model split | ❌ Single-process | N/A | ⚠️ CLI scripting |

**The gap:** Vespyr's agent definitions live in `.agents/agents/*.md` — a format that NONE of these harnesses natively consume. The delegation contract in `delegation-policy.md` assumes OpenCode's subagent model. There is no adapter, no CLI bridge, no MCP tool, no harness-specific configuration that maps Vespyr's 21 personas to ANY harness's subagent system.

**What this plan is NOT:** A better solo mode. Solo mode (roleplaying agents in a single response) is a degraded fallback for harnesses with no shell access. It should be documented as such, not centered in the architecture.

**What this plan IS:** A harness-agnostic multi-agent orchestration layer that:
1. Maps Vespyr's agent definitions to each harness's native subagent format (adapter layer)
2. Provides a CLI orchestrator as a universal bridge for harnesses with shell access
3. Exposes agent spawning as MCP tools for harnesses with MCP support
4. Provides solo mode as an explicitly degraded last resort with mandatory guardrails

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                   Vespyr Skill (e.g., /develop)              │
│                                                               │
│  "Delegate to @executor: npm test"                            │
│  "Invoke @qa-engineer for quality gate"                       │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Orchestration Mode Selector                 │ │
│  │  Detects harness capabilities, selects best mechanism:   │ │
│  └──────┬──────────────┬──────────────┬────────────────────┘ │
│         │              │              │                       │
│         ▼              ▼              ▼                       │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐               │
│  │ M1: Native │  │ M2: MCP   │  │ M3: CLI    │  ───► M4: Solo │
│  │ Adapter    │  │ Tool      │  │ Orchestr.  │      (last)     │
│  └─────┬──────┘  └─────┬─────┘  └─────┬──────┘               │
│        │               │              │                       │
│        ▼               ▼              ▼                       │
│  Harness-specific  MCP server     npx vespyr                  │
│  subagent format   spawn_agent    agent-run                   │
│  (.claude/agents/, .opencode/,    --agent=X                   │
│   .github/agents/)                --prompt="..."              │
│                                                               │
│  All produce: Structured output (unified schema)              │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Satisfaction control plane

The orchestration layer is also the control plane for Vespyr's behavioral DNA.
Native adapters, MCP calls, CLI processes, and solo fallback must all return
the same satisfaction state vocabulary defined in
`14-utter-satisfaction-dna.md`.

- A participating agent returns a state, evidence references, feedback closure,
  and residual risks, not only a free-text verdict.
- The orchestrator routes `CHANGES REQUESTED` back to the responsible owner and
  routes `BLOCKED` to the binding decision authority.
- `SATISFIED` is never inferred from a zero exit code, a successful tool call,
  or a majority vote.
- Solo mode is an honest degraded mode. It cannot create fake multi-agent
  satisfaction and remains blocked from release-affecting development/QA paths
  unless the explicit release gate still passes.
- A material artifact or scope change sets affected rows to
  `revalidation_required` until reviewed again.

The orchestration adapter is successful only when it preserves this control
plane across harnesses, not merely when it can spawn a process.

---

## 3. Harness Capability Tiers (Mechanism-Based)

Frame tiers around **mechanisms**, not harness identity. A harness may support multiple mechanisms.

| Tier | Mechanism | What it enables | Quality | Harnesses |
|---|---|---|---|---|
| **M1** | **Native Adapter** — Vespyr definitions transpile to harness-specific subagent format | Full I/O delegation + multi-agent reasoning, parallel, per-agent model selection, permission enforcement | Highest | OpenCode (opencode.json), Claude Code (.claude/agents/), VS Code Copilot (.github/agents/) |
| **M2** | **MCP-Based** — Agent spawning exposed as MCP tool | Full I/O delegation + multi-agent reasoning, parallel (MCP supports parallel calls), per-agent model routing | High | Any MCP-capable harness (Claude Code, VS Code, Cursor, Windsurf) |
| **M3** | **CLI-Orchestrated** — `npx vespyr agent-run` spawns processes | Near-full I/O delegation + multi-agent reasoning, sequential API calls, real independence | Medium | Any harness with shell access (Aider, CLI tools, custom scripts) |
| **M4** | **Solo Mode** — Single LLM roleplays agents with guardrails | Degraded I/O delegation + degraded reasoning, simulated independence, high groupthink risk | Low | Browser LLMs, harnesses with no shell/MCP access |

**Key reframe:** M1 is NOT "OpenCode mode." M1 is an **adapter layer** that transpiles Vespyr's `.agents/agents/*.md` format into each harness's native subagent definition format. The same Vespyr agent works on OpenCode, Claude Code, and VS Code Copilot via different adapters.

**Quality comparison (corrected):**

| Attribute | M1 (Native) | M2 (MCP) | M3 (CLI) | M4 (Solo) |
|---|---|---|---|---|
| Agent independence | Real (separate windows) | Real (separate API calls) | Real (separate API calls) | Simulated (same window) |
| Groupthink risk | Low | Low | Low | High |
| Parallelism | Yes (N concurrently) | Yes (MCP parallel calls) | No (sequential shell) | No (sequential text) |
| Permission enforcement | Yes (harness-level) | Partial (tool-level) | No (API-only) | No |
| I/O cost savings | Best (flash models) | Good (MCP routes to flash) | Good (CLI uses flash for I/O) | Worst (all on reasoning model) |
| Latency (4 agents) | ~5s (parallel) | ~5s (parallel MCP) | ~15s (4 × ~3-5s seq) | ~10s (single response) |

---

## 4. Implementation Plan

### F3b.1-F3b.5 — Harness Detection & Capability Profiling

**Problem:** Skills have no way to know what the current harness supports. The existing plan detects OpenCode-specific config (`opencode.json` subagent entries). This doesn't generalize.

**Target:** Detection that identifies which **mechanisms** the current harness supports, and which M1 adapter to use.

**Mechanism detection logic:**
1. **Check for native subagent support** (M1): Look for harness-specific config files that indicate subagent capabilities
2. **Check for MCP support** (M2): Look for MCP server configurations
3. **Check for shell access** (M3): Attempt `echo "test"` — if it works, CLI orchestration is available
4. **Otherwise** (M4): Solo mode

**Capability profile format** (`.agents/state/harness-capabilities.json`):

```json
{
  "harness": "claude-code",
  "detected_at": "2026-07-22T10:00:00Z",
  "mechanisms": {
    "native_subagents": {
      "supported": true,
      "adapter": "claude-code",
      "definition_path": ".claude/agents/",
      "format": "markdown-yaml",
      "parallel": true,
      "permissions": true
    },
    "mcp": {
      "supported": true,
      "parallel_calls": true
    },
    "shell": {
      "supported": true,
      "parallel": false
    }
  },
  "recommended_mode": "native",
  "available_modes": ["native", "mcp", "cli", "solo"],
  "vespyr_agents_supported": 21
}
```

- [ ] **F3b.1** — Create `.agents/scripts/detect_harness.js` (~120 lines): detects harness identity (OpenCode, Claude Code, Cursor, Windsurf, VS Code Copilot, Aider, unknown), checks for mechanism support (native subagents, MCP, shell), writes capability profile. Detection is based on filesystem artifacts, not environment assumptions.
- [ ] **F3b.2** — Define mechanism detection rules per harness: OpenCode (check `opencode.json` for `"mode": "subagent"` entries), Claude Code (check for `.claude/` directory + agent definition support), VS Code (check for `.github/agents/` support), Cursor (check for `.cursor/` + cloud agent availability), Windsurf (check for `.windsurf/`), Aider (check for `aider` in PATH), unknown (shell-only → M3).
- [ ] **F3b.3** — Add `VESPYR_MODE` env var for override: `native` (M1), `mcp` (M2), `cli` (M3), `solo` (M4), `auto` (default — detect). If forced mode exceeds harness capabilities, warn and downgrade with explanation.
- [ ] **F3b.4** — Add `detect` subcommand to `bin/cli.js`: `npx vespyr detect` prints harness name, all supported mechanisms, recommended mode, available modes, and any limitations.
- [ ] **F3b.5** — Update all 9 pipeline skills to read capability profile in their first step and log `[ORCHESTRATION: native|mcp|cli|solo]` to the session log.

**Estimate:** 4-5 hours

---

### F3b.6-F3b.12 — M1: Native Subagent Adapters

**Problem:** Vespyr's agent definitions (`.agents/agents/*.md`) use a custom frontmatter format that no harness natively consumes. There is zero mapping between Vespyr's delegation contract and any harness's subagent system — even Claude Code and VS Code Copilot, which BOTH have full subagent support.

**Target:** Adapter scripts that transpile Vespyr agent definitions into each harness's native format. The adapters are run once (on `npx vespyr install` or `npx vespyr sync-agents`), not on every invocation.

**Harness native formats:**

| Harness | Adapter output | Format | Key mappings |
|---|---|---|---|
| **OpenCode** | `opencode.json` entries | JSON | Vespyr agent → `"mode": "subagent"`, permissions, model |
| **Claude Code** | `.claude/agents/{name}.md` | Markdown + YAML | Vespyr agent → Claude subagent with tools, model, hooks |
| **VS Code Copilot** | `.github/agents/{name}.agent.md` | YAML frontmatter | Vespyr agent → Copilot agent with tools, model, handoffs |

**Adapter architecture:**

```
.agents/agents/founder.md ────────┬──► adapter-opencode ──► opencode.json entries
                                  ├──► adapter-claude ────► .claude/agents/founder.md
                                  └──► adapter-vscode ────► .github/agents/founder.agent.md
```

Each adapter reads the Vespyr agent definition, extracts the relevant fields (name, description, capabilities, permissions, model tier, Socratic stance, delegation contract), and maps them to the target harness's format.

**Vespyr → Claude Code adapter mapping:**

| Vespyr field | Claude Code field |
|---|---|
| `name` + `icon` | Frontmatter `name`, icon in description |
| `capabilities` | `tools` array (Read, Write, Edit, Bash, Grep, Glob) restricted per delegation contract |
| `default_squad` | `agents` array (which other agents this can spawn) |
| Model tier (reasoning agent) | `model: "claude-sonnet-4"` (or `opus-4` for premium) |
| Model tier (I/O agent) | `model: "claude-haiku-4"` |
| Delegation contract | `permissionMode: "default"` with tool restrictions |
| Socratic stance | Injected into `instructions` as behavior guard |

**Vespyr → VS Code Copilot adapter mapping:**

| Vespyr field | VS Code field |
|---|---|
| `name` | `name` |
| `description` | `description` |
| `capabilities` | `tools` array (mapped to VS Code tool names) |
| Model tier | `model` (single string or prioritized array) |
| Delegate permissions | `agents` array (which agents are allowed as subagents) |
| I/O sub-agents | `disable-model-invocation: true` (prevent direct model use without delegation) |

- [ ] **F3b.6** — Create `.agents/scripts/adapters/adapter_opencode.js` (~80 lines): reads all Vespyr agent `.md` files, produces `opencode.json` subagent entries. Already partially exists — formalize and make config-driven.
- [ ] **F3b.7** — Create `.agents/scripts/adapters/adapter_claude.js` (~120 lines): reads all Vespyr agent `.md` files, produces `.claude/agents/{name}.md` files with Claude-compatible YAML frontmatter. Maps Vespyr permissions to Claude tool allowlists, maps model tiers, injects delegation contract into instructions.
- [ ] **F3b.8** — Create `.agents/scripts/adapters/adapter_vscode.js` (~120 lines): reads all Vespyr agent `.md` files, produces `.github/agents/{name}.agent.md` files with VS Code-compatible YAML frontmatter. Maps Vespyr permissions to VS Code tool lists, sets up handoff configurations for sequential agent workflows.
- [ ] **F3b.9** — Create `.agents/scripts/sync_agents.js` (~60 lines): orchestrator that runs all applicable adapters based on detected harnesses. Called by `npx vespyr install` and `npx vespyr sync-agents`. Produces a sync report: which harnesses were configured, how many agents were synced, any warnings.
- [ ] **F3b.10** — Add `sync-agents` subcommand to `bin/cli.js`: `npx vespyr sync-agents` runs all adapters, `npx vespyr sync-agents --harness claude-code` runs a specific adapter.
- [ ] **F3b.11** — Update `delegation-pattern.md` §"Harness-Specific Implementations": replace aspirational instructions ("create custom hook scripts") with concrete adapter references ("run `npx vespyr sync-agents` to generate .claude/agents/ definitions; then use @agent-name in your harness").
- [ ] **F3b.12** — Create test: `npm run test:adapters` — verifies that adapter output for each harness is valid (correct YAML/JSON syntax, all required fields present, tool names map correctly).

**Estimate:** 8-10 hours

---

### F3b.13-F3b.18 — M2: MCP-Based Agent Invocation

**Problem:** The MCP integration plan (03a) exposes Vespyr scripts as MCP tools but does NOT expose agent spawning. Harnesses with MCP support (Claude Code, VS Code, Cursor, Windsurf — 4 of 5 active harnesses) could invoke Vespyr agents as MCP tools, but no tool exists for this.

**Target:** Add a `vespyr_spawn_agent` MCP tool to the `@vespyr/mcp` server (defined in Plan 03a §3a). This tool routes agent invocations through the same engine as the CLI orchestrator (F3b.19), but via MCP's parallel-call mechanism instead of sequential shell calls.

**Tool specification:**

```json
{
  "name": "vespyr_spawn_agent",
  "description": "Invoke a Vespyr agent persona for reasoning or I/O delegation. The agent runs as an independent process with its own model and context.",
  "parameters": {
    "agent": {
      "type": "string",
      "description": "Agent name matching Vespyr persona",
      "enum": ["founder", "product-manager", "product-designer", "architect", "tech-lead", "developer", "code-reviewer", "qa-engineer", "researcher", "user-researcher", "ux-researcher", "data-analyst", "security-engineer", "performance-engineer", "ml-engineer", "devops-engineer", "technical-writer", "reader", "writer", "executor", "memory-controller"]
    },
    "prompt": {
      "type": "string",
      "description": "The task or question for the agent"
    },
    "context": {
      "type": "string",
      "description": "Optional context to inject (project state, other agent outputs, file contents)"
    },
    "model_tier": {
      "type": "string",
      "enum": ["auto", "fast", "balanced", "premium"],
      "default": "auto",
      "description": "Model tier. auto selects based on agent type (fast for I/O, premium for reasoning)."
    }
  },
  "returns": {
    "agent": "string",
    "verdict": "string (GO|NO-GO|CONDITIONAL|COMPLETE|ERROR|TIMEOUT)",
    "summary": "string (one-line digest)",
    "full_response": "string (markdown)",
    "confidence": "string (high|medium|low)",
    "caveats": ["string"],
    "token_cost": "number",
    "mode": "string (mcp)"
  }
}
```

**MCP advantages over CLI (F3b.19):**
- **Parallel invocation:** MCP supports parallel tool calls natively. 4 agents invoked simultaneously vs. sequential shell calls.
- **Cleaner integration:** No shell parsing, no stdout encoding issues. Structured JSON in, structured JSON out.
- **Better error handling:** MCP timeout and retry semantics are already built into the harness.
- **Model routing:** The MCP server selects the appropriate model per agent type internally.

- [ ] **F3b.13** — Implement `vespyr_spawn_agent` tool in the `@vespyr/mcp` server (extend `packages/mcp/src/tools/` from Plan 03a). The tool loads the agent persona, builds the prompt, calls the configured LLM API, and returns structured output.
- [ ] **F3b.14** — Implement model-tier routing in the MCP server: read `models.json` config (see F3b.19), route `auto` to the appropriate tier based on agent type. Fast for I/O agents, premium for reasoning agents, balanced for review agents.
- [ ] **F3b.15** — Add context truncation for MCP agent responses (2,000 token cap, same as Plan 03a §4). Spillover written to `artifacts/tmp/mcp-logs/agent-{name}-{timestamp}.log`.
- [ ] **F3b.16** — Add MCP agent invocation to `round-table/SKILL.md`: when running on an MCP-capable harness, spawn agents as parallel MCP tool calls instead of sequential subagent spawning. This enables round-table discussions in Claude Code, VS Code, and any MCP-capable harness.
- [ ] **F3b.17** — Add MCP agent invocation to `develop/SKILL.md` Step 7 (QA gate): `@qa-engineer` is spawned via MCP tool, produces structured output with `verdict: GO|NO-GO|CONDITIONAL`. Step 6 (code review): `@code-reviewer` spawned via MCP tool.
- [ ] **F3b.18** — Test: `npm run test:mcp-agent` — starts `@vespyr/mcp` server, calls `vespyr_spawn_agent` with test prompts, verifies structured output, verifies model routing (I/O agent uses fast model, reasoning agent uses premium), verifies timeout behavior.

**Estimate:** 6-8 hours

---

### F3b.19-F3b.24 — M3: CLI Orchestrator (`npx vespyr agent-run`)

**Problem:** Harnesses without MCP support (Aider, custom scripts, some terminal-based tools) can run shell commands but have no way to invoke Vespyr agents. There's no CLI tool that takes an agent persona + context + prompt and returns a structured agent response.

**Target:** A CLI tool that bridges harnesses with shell access to near-M2 quality:

```bash
# I/O delegation — @developer's "run tests" becomes:
npx vespyr agent-run --agent executor --prompt "Run npm test and summarize failures" --model fast

# Multi-agent reasoning — @architect invokes @security-engineer:
npx vespyr agent-run --agent security-engineer --prompt "Review auth flow" --model premium --context "@./adr-auth.md"

# Batch multi-agent (sequential):
npx vespyr agent-run --agents founder,product-manager --prompt "Evaluate scope change: add dark mode"

# Context from file:
npx vespyr agent-run --agent developer --prompt "Fix the login bug" --context "@./bug-report.md" --context "@./src/auth/login.ts"
```

**How it works:**
1. Read agent persona from `.agents/agents/{agent}.md`
2. Build prompt: persona frontmatter + Socratic stance + delegation contract + context (from `--context` flags) + user prompt
3. Select model based on `--model` flag: `auto` (detect from agent type), `fast`, `balanced`, `premium`
4. Call the configured LLM API using the harness's existing credentials
5. Capture response
6. Format as structured JSON
7. Return via stdout (exit 0 on success, exit 1 on error)

**Key design constraints:**
- **Stateless.** Each invocation is independent. No session memory between calls. The calling harness manages state.
- **API-agnostic.** Uses the same model provider the harness uses. Detected from environment or config file. Supports OpenAI-compatible APIs, Anthropic, and DeepSeek.
- **No tools for invoked agents.** Agents invoked via `agent-run` cannot use tools (read, write, bash, edit). They reason and respond only. This prevents side effects from CLI-orchestrated agents. Exception: `@executor` can specify a command that the CLI wrapper runs and summarizes.
- **Timeout.** Default 30s for reasoning agents, 15s for I/O agents. Configurable via `--timeout`.
- **Provider auto-detection.** The CLI detects the active model provider from the harness configuration. Priority: `VESPYR_PROVIDER` env var → harness config → `.agents/config/models.json` default.

**Model tier configuration** (`.agents/config/models.json`):

```json
{
  "provider": "auto",
  "tiers": {
    "fast": {
      "openai": "gpt-4o-mini",
      "anthropic": "claude-haiku-4",
      "deepseek": "deepseek-v4-flash",
      "local": "llama-3.2-3b"
    },
    "balanced": {
      "openai": "gpt-4o",
      "anthropic": "claude-sonnet-4",
      "deepseek": "deepseek-v4-balanced"
    },
    "premium": {
      "openai": "gpt-5",
      "anthropic": "claude-opus-4",
      "deepseek": "deepseek-v4-pro"
    }
  },
  "agent_tier_map": {
    "reader": "fast", "writer": "fast", "executor": "fast", "memory-controller": "fast",
    "founder": "premium", "product-manager": "premium", "product-designer": "premium",
    "architect": "premium", "developer": "premium", "tech-lead": "premium",
    "code-reviewer": "balanced", "qa-engineer": "balanced", "security-engineer": "balanced",
    "performance-engineer": "balanced", "researcher": "balanced", "user-researcher": "balanced",
    "ux-researcher": "balanced", "data-analyst": "balanced", "devops-engineer": "balanced",
    "ml-engineer": "balanced", "technical-writer": "balanced"
  }
}
```

**@executor special handling:** The `@executor` agent in CLI mode works differently from other agents:
1. The CLI wrapper receives a command (not a question)
2. If the harness has a specific command to run, the CLI wrapper executes it directly and captures output
3. The output is summarized (pass/fail counts, first N errors) and returned as structured JSON
4. The `@executor` agent persona is used only when the command needs interpretation (e.g., "analyze this test output and identify the root cause")

- [ ] **F3b.19** — Create `.agents/scripts/agent_run.js` (~350 lines): the core CLI orchestrator. Parses flags (`--agent`, `--agents`, `--prompt`, `--context`, `--model`, `--format`, `--timeout`), loads agent persona, builds prompt, calls LLM API, formats output. Supports single-agent and batch multi-agent (sequential) modes.
- [ ] **F3b.20** — Create `.agents/config/models.json` (~50 lines): model tier configuration with agent-to-tier mapping.
- [ ] **F3b.21** — Implement provider auto-detection in `agent_run.js`: detect provider from harness config (opencode.json, Claude Code env, Cursor config) → fallback to `VESPYR_PROVIDER` env var → fallback to model.json default → hardcoded fallback.
- [ ] **F3b.22** — Add `agent-run` subcommand to `bin/cli.js`: register `npx vespyr agent-run` with full help text, usage examples, model tier documentation, and provider configuration guide.
- [ ] **F3b.23** — Add `@executor` special handling in CLI mode: when `--agent executor` is called with `--command "npm test"`, the CLI wrapper executes the command directly, captures output, summarizes, and returns structured JSON. The LLM is only invoked if the output needs interpretation.
- [ ] **F3b.24** — Create test: `npm run test:agent-run` — invokes `agent-run --agent founder --prompt "Is this a good idea: a CLI tool for running agents?" --format json`, verifies structured output, verifies model routing (executor uses fast model, founder uses premium), verifies timeout behavior, verifies batch mode (--agents founder,product-manager).

**Estimate:** 8-10 hours

---

### F3b.25-F3b.28 — M4: Solo Mode (Degraded Fallback)

**Problem:** When no other mechanism is available (M1-M3 all unavailable), Vespyr must fall back to solo mode — a single LLM roleplaying all agents. The current plan centers solo mode around round-table discussions only. It doesn't distinguish between I/O delegation and multi-agent reasoning, and it doesn't enforce quality guardrails.

**Target:** Solo mode as an **explicitly degraded fallback** with:
1. Separate behavior for I/O delegation (no disagreement injection) vs. multi-agent reasoning (with guardrails)
2. Mandatory quality guardrails that cannot be suppressed
3. Clear documentation that M4 output should NOT be trusted for development/QA decisions
4. A mode watermark that appears on every solo-mode output

**Solo mode activation (all skills):**
```
[ORCHESTRATION: solo] Running with {N} roleplayed agents. No subagent spawning, MCP, or CLI 
orchestration available. Agent responses are SIMULATED — weight accordingly.
→ {N} agents will be roleplayed sequentially.
→ Disagreement injection: ON (multi-agent only)
→ Confidence downgrade: ON
→ Blind-spot enumeration: ON
→ Mode watermark: ON (cannot be suppressed)
→ Development/QA phases: WARNING — solo mode produces unreliable results in these phases.
```

**I/O delegation in solo mode (Pattern A):**
When a reasoning agent says "delegate to @executor" and no executor subagent exists:
- The LLM performs the I/O inline (runs the command or reads the file directly)
- The output is annotated: `[SOLO-IO: @executor roleplayed — not an independent agent. Output may be hallucinated.]`
- **No disagreement injection.** You don't want `@executor` to "disagree" about whether `npm test` was run.
- **No confidence downgrade.** It's a command result, not an opinion.
- The `@executor` persona is loaded but only for its summarization style — not for independent reasoning.

**Multi-agent reasoning in solo mode (Pattern B):**
When a skill invokes multiple reasoning agents (@founder, @architect, @qa-engineer):
- The LLM roleplays each agent sequentially, in dependency order
- Each agent sees previous agents' responses
- Each response opens with `**{Name} ({icon}) [SOLO]:**` and stays faithful to the agent's persona
- **Disagreement injection:** At least 1 agent must express a reservation, caveat, or alternative viewpoint. Configurable: `VESPYR_SOLO_MIN_DISAGREEMENT=1` (default: 1). If all agents agree naturally, the orchestrator flags: `[SOLO-GROUPTHINK-WARNING] All {N} agents converged.`
- **Confidence downgrade:** All confidences lowered by one level (`high` → `medium`, `medium` → `low`). Annotated: `[downgraded: solo mode]`.
- **Blind-spot enumeration:** Orchestrator lists perspectives NOT covered by the selected roster.
- **Mode watermark:** Every solo-mode output includes the non-suppressible watermark.

**Solo mode restrictions:**
- Solo mode is **blocked from development and QA phases** unless explicitly allowed via `VESPYR_ALLOW_SOLO_DEV=1`. The orchestrator state machine refuses to advance out of `development` with solo-mode outputs.
- Solo-mode `qa-signoff.md` (from Phase 2 F2.23-F2.27) is marked `INVALID — solo mode` and cannot pass the QA hard gate.
- `VESPYR_ALLOW_SOLO_DEV=1` is an experimentation override only. It never bypasses the T8 satisfaction validator or permits a release.

- [ ] **F3b.25** — Create `.agents/references/solo-mode-protocol.md` (~150 lines): the complete solo-mode specification with separate sections for I/O delegation behavior and multi-agent reasoning behavior. Documents all 5 guardrails, activation pattern, output format, and restrictions.
- [ ] **F3b.26** — Update solo-mode activation in all 9 pipeline skills: replace any ad-hoc solo mode descriptions with a reference to `solo-mode-protocol.md`. Every skill must distinguish between I/O delegation solo (Pattern A) and multi-agent reasoning solo (Pattern B) when activating.
- [ ] **F3b.27** — Implement solo mode in `orchestrator_state.js`: block phase advance out of `development` if outputs were produced in solo mode (check for mode watermark). Allow override via `VESPYR_ALLOW_SOLO_DEV=1` env var with explicit warning.
- [ ] **F3b.28** — Create test: `npm run test:solo-mode` — feeds a known project state to solo mode, verifies disagreement injection (multi-agent), verifies no disagreement injection (I/O delegation), verifies confidence downgrade, verifies watermark presence, verifies blind-spot enumeration covers missing domain experts.

**Estimate:** 4-5 hours

---

### F3b.29-F3b.32 — Structured Multi-Agent Output Format

**Problem:** Agent outputs are free-text Markdown. Downstream automation cannot parse agent verdicts, confidence levels, or I/O results. The format must work for ALL four orchestration modes and BOTH delegation patterns.

**Target:** A unified output schema that works for I/O delegation results AND multi-agent reasoning results, across all modes.

**Unified schema** (`multi-agent-output`):

```json
{
  "schema": "vespyr/multi-agent-output@1.0",
  "mode": "native|mcp|cli|solo",
  "harness": "claude-code",
  "timestamp": "2026-07-22T10:00:00Z",
  "skill": "develop",
  "phase": "quality",
  "orchestrator_notes": "QA gate complete. @security-engineer flagged one medium finding.",
  "quality": {
    "mode": "native",
    "groupthink_risk": "low",
    "disagreement_count": 2,
    "blind_spots": ["No accessibility review", "No i18n review"],
    "solo_mode_penalty_applied": false
  },
  "satisfaction": {
    "state": "SATISFIED",
    "evidence_refs": ["artifacts/output/05-execution/quality/qa-report.md"],
    "feedback_resolved": ["CR-001"],
    "blocking_issues": [],
    "revalidation_required": false
  },
  "agents": [
    {
      "name": "qa-engineer",
      "icon": "🛡️",
      "type": "reasoning",
      "verdict": "CONDITIONAL",
      "confidence": "medium",
      "satisfaction_state": "CHANGES REQUESTED",
      "evidence_refs": ["artifacts/output/05-execution/quality/qa-report.md"],
      "feedback_resolved": [],
      "summary": "42/45 tests pass. 3 failures in edge cases.",
      "full_response": "**Nina (🛡️):** ...",
      "caveats": ["3 test failures in rate-limit edge cases"],
      "token_cost": 450
    },
    {
      "name": "executor",
      "icon": "⚡",
      "type": "io",
      "io_result": "COMPLETE",
      "exit_code": 0,
      "summary": "npm test: 42 passed, 3 failed, 0 errors. Failures in auth.test.ts.",
      "full_response": "42 passed, 3 failed: authExpiry...",
      "token_cost": 120
    }
  ],
  "consensus": {
    "applicable": true,
    "verdict": "CONDITIONAL",
    "blocking_issues": ["3 test failures", "API key exposure"],
    "recommended_next_step": "Fix blocking issues, re-run QA gate",
    "satisfaction_gate": "NO-GO"
  }
}
```

**Field distinctions by agent type:**

| Field | Reasoning agents | I/O agents |
|---|---|---|
| `type` | `"reasoning"` | `"io"` |
| `verdict` | GO, NO-GO, CONDITIONAL, PIVOT, KILL | Not applicable |
| `io_result` | Not applicable | COMPLETE, ERROR, TIMEOUT |
| `exit_code` | Not applicable | 0 (success), non-zero (failure) |
| `confidence` | high, medium, low | Not applicable |
| `caveats` | Reservations, concerns | Error details |
| `disagrees_with` | Other agent names (if applicable) | Not applicable |

- [ ] **F3b.29** — Create `.agents/references/multi-agent-output-schema.md` (~100 lines): full schema specification with field descriptions, allowed values, examples for each agent type and each orchestration mode.
- [ ] **F3b.30** — Create `.agents/scripts/format_agent_output.js` (~100 lines): takes raw agent responses + mode + metadata, validates required fields, produces unified JSON. Warns on missing disagreement in solo mode.
- [ ] **F3b.31** — Wire structured output into `orchestrator_state.js`: `check-verdict` subcommand reads structured output and extracts the consensus verdict. Used by `next` to gate phase advances. `qa-signoff.md` generation (Phase 2 F2.23-F2.27) includes a hash of the structured output.
- [ ] **F3b.32** — Add output format enforcement to all 9 pipeline skills: every multi-agent operation must produce a `multi-agent-output.json` artifact alongside any human-readable output. This artifact is the machine-readable source of truth and must include the T8 satisfaction state, evidence references, feedback closure, blockers, and revalidation flag.

**Estimate:** 3-4 hours

---

### F3b.33-F3b.36 — Orchestration Mode Selection & Telemetry

**Problem:** Skills currently have no logic for choosing orchestration mode. There's no decision tree, no fallback chain, and no logging of which mode was used.

**Target:** A mode selection protocol embedded in every multi-agent skill's first step, with telemetry logging.

**Mode selection decision tree:**

```
Skill starts
    │
    ▼
Read harness-capabilities.json
    │
    ├── M1 (native subagents) supported? ──► Use M1 adapter
    │
    ├── M2 (MCP) supported? ──► Use MCP agent invocation
    │
    ├── M3 (shell) supported? ──► Use CLI orchestrator
    │         │
    │         └── Warn if skill is development/QA phase
    │
    └── None ──► Solo mode (M4)
              │
              ├── Block if development/QA phase (unless override)
              └── Activate with guardrails
```

**Per-skill mode requirements:**

| Skill | I/O Delegation | Multi-Agent Reasoning | Minimum Viable | What Degrades Below M3 |
|---|---|---|---|---|
| `/validate-idea` | Low (writer only) | @founder (single) | M4 (solo OK) | Founder analysis simulated |
| `/explore-idea` | Medium (writer, reader) | @founder, @researcher | M4 (solo OK) | Research agents simulated |
| `/design` | High (writer, reader) | PM → designer | **M3** | Spec quality drops; no real review |
| `/develop` | **Very High** (executor, writer, reader) | architect → TL → dev → review → QA | **M3** | Code review + QA simulated; dangerous |
| `/launch` | Medium (executor) | PM, devops, security | M3 | Deploy checks simulated |
| `/iterate` | Low | Data analyst, PM | M4 (solo OK) | Data analysis simulated |
| `/retro` | Low | Multiple agents | M4 (solo OK) | Cross-agent insights simulated |
| `/incident` | Medium (executor) | Devops, developer | M3 | Diagnostics simulated |
| `/round-table` | None | N agents | M4 (solo OK) | Discussion depth reduced |

- [ ] **F3b.33** — Create `.agents/scripts/select_mode.js` (~80 lines): reads `harness-capabilities.json`, checks per-skill minimums, returns selected mode, quality flags, and any warnings. Called by skills at startup.
- [ ] **F3b.34** — Add mode selection to all 9 pipeline skills' Step 0 or Step 1: call `select_mode.js`, log the result, branch to the appropriate execution path (native, MCP, CLI, or solo). Warn if the selected mode is below the skill's minimum viable tier.
- [ ] **F3b.35** — Log mode selection to telemetry: every multi-agent operation writes to `artifacts/telemetry/mode-log.json` with `{timestamp, skill, phase, mode, agent_count, mechanism, harness, groupthink_risk}`. Feeds into self-learning metrics (Phase 2 F2.15.a-c).
- [ ] **F3b.36** — Add mode summary to `npx vespyr status`: display current harness, orchestration mode, supported mechanisms, and per-skill mode warnings.

**Estimate:** 4-5 hours

---

### F3b.37-F3b.40 — Integration & Documentation

**Integration points with existing infrastructure:**

| Integration | What changes | Risk |
|---|---|---|
| `workflow.md` | Add §1.7 "Multi-Agent Orchestration Modes" with mechanism tiers (M1-M4), per-phase mode requirements, mode selection decision tree | Low — additive section |
| `delegation-pattern.md` | Replace aspirational per-harness instructions with concrete adapter references and CLI orchestrator usage | Medium — core documentation |
| `orchestrator_state.js` | Add mode-aware phase gating: block development → QA transition if outputs are solo-mode; add `check-verdict` subcommand for structured output | Medium — state machine |
| `round-table/SKILL.md` | Replace `--solo` flag with `--mode native|mcp|cli|solo`. Add MCP agent invocation path. Reference solo-mode protocol instead of inline description | Medium — most-used skill |
| `develop/SKILL.md` | Add mode selection to Step 1. Step 3 (architecture), Step 6 (code review), and Step 7 (QA) all branch on selected mode | High — most complex skill |
| `delegate/SKILL.md` | Update task mapping table: note that `@reader`/`@writer`/`@executor`/`@memory-controller` require M1, M2, or M3. Add CLI orchestrator invocation syntax | Low |
| `opencode.json` | No structural changes needed — adapter handles this | None |
| Plan 03a MCP server | Add `vespyr_spawn_agent` tool to `@vespyr/mcp` server (see F3b.13-F3b.18) | Medium — extends existing plan |
| `phase-table.md` | Add "Minimum Orchestration Mode" column per phase | Low |
| `14-utter-satisfaction-dna.md` | Define the shared state vocabulary, evidence contract, and release gate consumed by every mode | Low |
| `bin/cli.js` | Add `detect`, `sync-agents`, `agent-run` subcommands | Medium |

- [ ] **F3b.37** — Update `workflow.md`: add §1.7 "Multi-Agent Orchestration Modes" (~100 lines) with the M1-M4 mechanism tiers, per-phase mode requirements table, mode selection decision tree, I/O delegation in non-M1 harnesses, solo mode limitations, and the rule that development/QA outputs from solo mode block phase advance.
- [ ] **F3b.38** — Update `delegation-pattern.md`: rewrite per-harness implementation guides. Replace "create custom hook scripts" with concrete instructions: for Claude Code → `npx vespyr sync-agents --harness claude-code`, for VS Code → `npx vespyr sync-agents --harness vscode`, for shell-only harnesses → `npx vespyr agent-run --agent executor --prompt "..."`. Wire hook enforcement (Phase 2 `pre:bash:delegation`) to recommend `npx vespyr agent-run --agent executor` instead of blocking outright.
- [ ] **F3b.39** — Update `round-table/SKILL.md`: add `--mode native|mcp|cli|solo` flag (backward compatible — `--solo` is alias for `--mode solo`). Add MCP agent invocation as Step 1.5 (when M2 is available, spawn agents as parallel MCP tool calls). Reference `solo-mode-protocol.md` and `multi-agent-output-schema.md`.
- [ ] **F3b.40** — Update `AGENTS.md` and `agent.md.canonical`: add "Multi-Agent Orchestration" section documenting the 4 mechanism tiers, per-harness setup, and mode selection behavior.
- [ ] **F3b.41** — Test T8 preservation across M1/M2/M3/M4: no adapter may infer `SATISFIED`, drop evidence, hide `BLOCKED`, or let a stale sign-off reach launch.

**Estimate:** 6-8 hours

---

## 5. The `.claude/agents/` Cross-Harness Standard

The researcher identified a critical finding: **VS Code Copilot already supports `.claude/agents/` format** [^1][^2]. This is the only working cross-harness bridge. Vespyr should standardize its M1 adapter outputs on this format where possible.

**Opportunity:** If Vespyr's adapter produces `.claude/agents/` format, it immediately works in:
- Claude Code (native format)
- VS Code Copilot (compatible format, maps Claude tool names to VS Code equivalents)

This covers the two most capable subagent systems outside OpenCode.

**Approach:**
- The Claude Code adapter (F3b.7) produces `.claude/agents/` format as the canonical cross-harness format
- The VS Code adapter (F3b.8) produces `.github/agents/` format with explicit Claude compatibility annotations
- The OpenCode adapter (F3b.6) produces `opencode.json` format (harness-specific)
- Other harnesses (Cursor, Windsurf) use MCP or CLI mechanisms until native formats are documented

**Not in scope for v2.1:** Proposing `.claude/agents/` as a formal cross-harness standard. This requires community coordination and is tracked separately.

---

## 6. Total Estimate & Timeline

| Section | F-numbers | Hours |
|---|---|---|
| Harness Detection & Profiling | F3b.1-F3b.5 | 4-5 |
| M1: Native Subagent Adapters | F3b.6-F3b.12 | 8-10 |
| M2: MCP-Based Agent Invocation | F3b.13-F3b.18 | 6-8 |
| M3: CLI Orchestrator | F3b.19-F3b.24 | 8-10 |
| M4: Solo Mode (Degraded Fallback) | F3b.25-F3b.28 | 4-5 |
| Structured Output Format | F3b.29-F3b.32 | 3-4 |
| Mode Selection & Telemetry | F3b.33-F3b.36 | 4-5 |
| Integration & Documentation | F3b.37-F3b.40 | 6-8 |
| **Total** | **41 items** | **43-55 hours** |

**Calendar:** ~3 weeks (can run in parallel with Plan 03a MCP integration; they share the `@vespyr/mcp` server but touch different tool surfaces).

**Priority ordering (what to ship first):**
1. **Week 1:** M3 CLI Orchestrator (F3b.19-F3b.24) — unblocks 4 of 5 harnesses immediately
2. **Week 2:** M2 MCP Agent Invocation (F3b.13-F3b.18) — superior mechanism for MCP-capable harnesses
3. **Week 3:** M1 Adapters (F3b.6-F3b.12), detection (F3b.1-F3b.5), solo mode (F3b.25-F3b.28), integration (F3b.37-F3b.40)

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Claude Code subagent format changes** | Low | Medium | Adapter generates the format; if it changes, update the adapter. Agent definitions in `.agents/agents/` remain the source of truth. |
| **CLI orchestrator latency too high for interactive use** | Medium | Medium | Sequential calls for 4 agents ≈ ~15s. Mitigation: MCP parallel invocation for supported harnesses. For M3, batch agents where dependency order allows. |
| **Solo mode produces convincing but wrong outputs in dev/QA** | High | High | Solo mode is blocked from development/QA phases by default. Mode watermark is non-suppressible. |
| **Adapter output diverges from source agent definitions** | Medium | Medium | `npx vespyr sync-agents` is idempotent — run it to regenerate. `validate_frontmatter.js` checks for drift. |
| **MCP server adds deployment complexity** | Medium | Low | MCP agent invocation is a tool on the existing `@vespyr/mcp` server (Plan 03a). No new server. |
| **Model provider auto-detection fails** | Medium | Low | Fallback chain: harness config → env var → `models.json` default → hardcoded. Documents how to set `VESPYR_PROVIDER`. |
| **Windsurf/Devin rebranding causes detection failure** | Low | Low | Detection is mechanism-based, not harness-name-based. Rebranding doesn't break detection. |
| **Cursor adds native subagent support mid-development** | Low | Positive | Detection picks up new capabilities. Adapter can be added as a fast-follow. |
| **Adapter or solo mode fabricates satisfaction** | Medium | High | Validate the structured satisfaction object, require evidence, watermark degraded modes, and keep release advancement blocked on incomplete or stale rows. |

---

## 8. Verification

| Check | Method |
|---|---|
| Harness detection works on all supported harnesses | `npx vespyr detect` on OpenCode, Claude Code, VS Code, Cursor, Windsurf configs — returns correct mechanism map |
| Adapter output is valid for each harness | `npm run test:adapters` — validates YAML/JSON syntax, required fields, tool name mappings |
| CLI orchestrator returns valid structured output | `npx vespyr agent-run --agent founder --prompt "test" --format json` exits 0 with valid schema |
| CLI orchestrator routes models correctly | `--agent executor` uses fast model, `--agent founder` uses premium model |
| MCP agent tool works end-to-end | Start `@vespyr/mcp`, call `vespyr_spawn_agent`, verify structured output |
| MCP agent tool supports parallel invocation | Call `vespyr_spawn_agent` 3 times in parallel, verify all 3 return correctly |
| Solo mode injects disagreement (multi-agent) | `npm run test:solo-mode` — consensus-prone scenario, ≥1 agent disagrees |
| Solo mode does NOT inject disagreement (I/O) | Same test — I/O delegation path, no disagreement flag |
| Solo mode downgrades confidence | Reasoning agents in solo mode show one level lower confidence |
| Orchestrator blocks solo-mode development outputs | `orchestrator_state.js next` from `development` with solo-mode artifact → blocked |
| Round-table works in all modes | Manual test: `/round-table --mode native`, `--mode mcp`, `--mode cli`, `--mode solo` |
| No regression on existing OpenCode path | Run `/develop` on test project in OpenCode — all existing behavior preserved |
| VS Code adapter produces valid format | Generated `.github/agents/*.agent.md` loads correctly in VS Code Copilot |
| T8 state preservation | Run the same blocked, revalidation, and all-satisfied scenarios through M1/M2/M3/M4; only the final scenario can reach GO |

---

## 9. Rollback Plan

If Plan 03b breaks:
- **Adapters:** Delete generated harness files (`.claude/agents/`, `.github/agents/`). Vespyr agent definitions in `.agents/agents/` are untouched.
- **CLI orchestrator:** Don't use `agent-run`. Harnesses without M1 fall back to M4 (solo).
- **MCP agent tool:** Remove `vespyr_spawn_agent` from `@vespyr/mcp` server registration. The rest of the MCP server continues working.
- **Solo mode guardrails:** Set `VESPYR_SOLO_MIN_DISAGREEMENT=0` to disable mandatory disagreement. `VESPYR_ALLOW_SOLO_DEV=1` to bypass dev/QA block.
- **Mode selection:** Set `VESPYR_MODE=solo` globally to bypass all detection and force the simplest path.
- **State machine:** `orchestrator_state.js next` with `--skip-mode-check` bypasses mode-aware gating.
- **T8 exception:** rollback or mode flags never bypass `validate_satisfaction.js`; a release still requires the complete team gate.

---

## 10. Handoff to Phase 3

- Harness capabilities are auto-detected across all 5+ active harnesses.
- M1 adapters map Vespyr agents to Claude Code, VS Code Copilot, and OpenCode native formats.
- M2 MCP agent tool enables parallel agent invocation in all MCP-capable harnesses.
- M3 CLI orchestrator enables agent invocation in any harness with shell access.
- M4 solo mode provides a degraded but guarded fallback.
- All multi-agent operations produce structured output consumed by the state machine.
- Mode telemetry feeds into self-learning metrics.
- Per-skill mode requirements are enforced in `orchestrator_state.js`.
- Every orchestration mode emits the T8 state/evidence contract; degraded modes cannot bypass the release gate.

---

## References

[^1]: Anthropic, "Create custom subagents," Claude Code Documentation. https://code.claude.com/docs/en/sub-agents
[^2]: Microsoft, "Custom agents in VS Code," VS Code Documentation. https://code.visualstudio.com/docs/agent-customization/custom-agents
[^3]: Microsoft, "Subagents in Visual Studio Code," VS Code Documentation. https://code.visualstudio.com/docs/agents/subagents
[^4]: Anthropic, "Orchestrate teams of Claude Code sessions" (Agent Teams). https://code.claude.com/docs/en/agent-teams
[^5]: Anthropic, "A harness for every task: dynamic workflows in Claude Code." https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code
[^6]: Anthropic, "Agent SDK overview." https://code.claude.com/docs/en/agent-sdk/overview
[^7]: Cursor, "Cursor: AI coding agent." https://cursor.com
[^8]: Devin Desktop, "Welcome to Devin Desktop." https://docs.devin.ai
[^9]: Aider, "FAQ." https://aider.chat/docs/faq.html
