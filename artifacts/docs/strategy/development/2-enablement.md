# Phase 2 — Enablement

> **Week 4, ~22 hours**
> **Themes:** T4 (Harness contracts), T5 (Self-improvement)
> **Goal:** Vespyr enforces policy at the harness layer (hooks), exposes primitives externally (MCP), tracks its own work (self-learning), has delegation enforced (not just documented), and makes QA a hard gate. After this phase, vespyr is "enabled" — hooks enforce, MCP exposes, self-learning harvests.

## Source mapping

| F-item | Master ref | Source file/section |
|---|---|---|
| F2.1–F2.5 | Phase 2 / T4 | Adoption §3.5 (lifecycle hooks) |
| F2.6–F2.10 | Phase 2 / T4 | Adoption §3.6 (MCP tool surface) |
| F2.11–F2.15 | Phase 2 / T5 | Evolution Part 4 (self-learning) |
| F2.16–F2.18 | Phase 2 / T3 | Evolution §2.5 (witness) |
| F2.19–F2.22 | Phase 2 / T1 | Evolution §1.8 (delegation policy) |
| F2.23–F2.27 | Phase 2 / T1 | Evolution §1.10 (QA hard gate) |

---

## F2.1–F2.5 — Lifecycle hooks (10 hooks with stable IDs)

**Source:** Adoption §3.5

- [ ] F2.1 — Create `.agents/hooks/hooks.json` with 10 hook entries:
  - [ ] `SessionStart` → `session:start:load-context`
  - [ ] `SessionStart` → `session:start:detect-package-manager`
  - [ ] `UserPromptSubmit` → `route:task`
  - [ ] `PreToolUse` (Bash) → `pre:bash:safety`
  - [ ] `PreToolUse` (Bash) → `pre:bash:tmux`
  - [ ] `PostToolUse` (Write|Edit) → `post:edit:format`
  - [ ] `PostToolUse` (Write|Edit) → `post:edit:dedupe`
  - [ ] `Stop` → `stop:session-end`
  - [ ] `Stop` → `stop:check-console-log`
  - [ ] `PreCompact` → `pre:compact:save-state`
  - [ ] `SubagentStop` → `subagent:stop:telemetry`
- [ ] F2.2 — Create `.agents/scripts/hooks/` with 10 Node.js hook scripts (one per hook, ~30–50 lines each):
  - [ ] `session-start-load-context.js`
  - [ ] `session-start-detect-package-manager.js`
  - [ ] `route-task.js`
  - [ ] `pre-bash-safety.js` (must support `exit 2` to block)
  - [ ] `pre-bash-tmux.js`
  - [ ] `post-edit-format.js`
  - [ ] `post-edit-dedupe.js`
  - [ ] `stop-session-end.js`
  - [ ] `stop-check-console-log.js`
  - [ ] `pre-compact-save-state.js`
  - [ ] `subagent-stop-telemetry.js`
- [ ] F2.3 — Update `bin/install.js` with a per-harness adapter:
  - [ ] For Claude Code: write hooks to `.claude/settings.json`
  - [ ] For OpenCode: write hooks to `opencode.json` `plugin` block
  - [ ] For Cursor: write hooks to `.cursor/hooks/hooks.json`
  - [ ] For each harness: read the canonical `.agents/hooks/hooks.json` and reformat
- [ ] F2.4 — Add env-var support:
  - [ ] `VESPYR_DISABLED_HOOKS=<comma,separated,hook,ids>`
  - [ ] `VESPYR_HOOK_PROFILE=minimal|standard|strict`
  - [ ] Default profile = `standard`
- [ ] F2.5 — Create `.agents/hooks/README.md`:
  - [ ] List all 10 hook IDs
  - [ ] Document what each does
  - [ ] Document `VESPYR_DISABLED_HOOKS` and `VESPYR_HOOK_PROFILE`
  - [ ] Document the per-harness adapter behavior

## F2.6–F2.10 — MCP tool surface (10 tools)

**Source:** Adoption §3.6

- [ ] F2.6 — Create `packages/mcp/` monorepo path:
  - [ ] `package.json` (name: `@vespyr/mcp`, type: `module`, main: `dist/server.js`)
  - [ ] `tsconfig.json`
  - [ ] `src/server.ts` (stdio MCP server, ~50 lines)
  - [ ] `src/tools/` (10 tool implementations, ~60 lines each)
  - [ ] `src/transport.ts` (stdio transport)
  - [ ] `README.md`
- [ ] F2.7 — Implement the MCP server (`packages/mcp/src/server.ts`, ~300 lines):
  - [ ] JSON-RPC over stdio
  - [ ] Tool registration via `ListToolsRequestSchema` and `CallToolRequestSchema`
  - [ ] Per-tool error handling with structured responses
- [ ] F2.8 — Implement the 10 tools (each as a thin wrapper around existing scripts):
  - [ ] `mcp__vespyr__memory_load` → wraps `memory_filter.js`
  - [ ] `mcp__vespyr__memory_write` → wraps `dedupe_validator.js` + append
  - [ ] `mcp__vespyr__pipeline_status` → wraps `orchestrator_state.js status`
  - [ ] `mcp__vespyr__pipeline_next` → wraps `orchestrator_state.js next`
  - [ ] `mcp__vespyr__code_graph_scan` → wraps `ensure_graph.js code`
  - [ ] `mcp__vespyr__code_graph_query` → wraps `graph_query.js` (Phase 3, but stub now)
  - [ ] `mcp__vespyr__elicitation_methods` → wraps `match_methods.js`
  - [ ] `mcp__vespyr__squad_list` → wraps `squads.js list`
  - [ ] `mcp__vespyr__squad_switch` → wraps `squads.js switch`
  - [ ] `mcp__vespyr__agent_resolve` → wraps `resolve_agents.js`
- [ ] F2.9 — Update `opencode.json` to register the MCP server by default:
  - [ ] Add `mcp.vespyr` block pointing to `npx @vespyr/mcp start`
  - [ ] Verify with `npx vespyr init` then `opencode` in a test project
- [ ] F2.10 — Add `mcp start` subcommand to `bin/cli.js`:
  - [ ] `npx vespyr mcp start` → spawns the MCP server
  - [ ] `npx vespyr mcp list-tools` → lists the 10 tools
  - [ ] `npx vespyr mcp test <tool-name>` → invokes a tool with sample input

## F2.11–F2.15 — Self-learning (3-tier episode → pattern → instinct)

**Source:** Evolution Part 4 (self-learning)

- [ ] F2.11 — Create `.agents/skills/self-learning/SKILL.md` (~280 lines):
  - [ ] `## When to invoke`
  - [ ] `## 3-tier model` (episode → pattern → instinct)
  - [ ] `## Scan episodes` (last 30 days of `artifacts/memory/`)
  - [ ] `## Promote pattern` (3+ occurrences, 2+ agents, 7+ day span)
  - [ ] `## Promote instinct` (human-in-the-loop approval)
  - [ ] `## Auto-load on session start` (read `instincts.md` FIRST)
  - [ ] `## Demote instinct` (when it stops being useful)
- [ ] F2.12 — Create `.agents/scripts/self_learn.js` (~280 lines):
  - [ ] `scan-episodes --since=30d` — read all entries, group by `code` tag
  - [ ] `find-patterns --min-occurrences=3 --min-agents=2 --min-span-days=7`
  - [ ] `promote-pattern --code=X --evidence=<file-list>` (writes to `patterns-and-conventions.md`)
  - [ ] `promote-instinct --code=X` (interactive, requires human approval)
  - [ ] `demote-instinct --code=X --reason=...` (removes from `instincts.md`)
  - [ ] `scan` (full pipeline: episodes → patterns → instincts)
- [ ] F2.13 — Create `artifacts/memory/instincts.md` (empty starter, ~20 lines):
  - [ ] Header with format spec
  - [ ] Empty body with `## Active Instincts` and `## Demoted Instincts` sections
- [ ] F2.14 — Update `.agents/agents/memory-controller.md`:
  - [ ] Add a new Step 0.25: "Load instincts.md FIRST (before any other context)"
  - [ ] The instinct content goes at the very top of the loaded context
- [ ] F2.15 — Update `.agents/scripts/memory_filter.js`:
  - [ ] Add `instincts.md` to the list of loadable files
  - [ ] Highest priority (loads before `project-context.md`, `active-decisions.md`, etc.)
  - [ ] Cap at ~200 tokens

## F2.16–F2.18 — Witness (artifact integrity)

**Source:** Evolution §2.5

- [ ] F2.16 — Create `.agents/scripts/witness.js` (~150 lines):
  - [ ] `witness sign --file=<path>` — compute SHA-256, append to `artifacts/state/witness.json`
  - [ ] `witness verify --file=<path>` — recompute, compare to recorded hash
  - [ ] `witness check` — verify all tracked files
  - [ ] `witness list` — show all tracked files with their hashes
  - [ ] Storage: `.agents/state/witness.json` (committed to repo, not a binary file)
- [ ] F2.17 — Update `.agents/agents/memory-controller.md`:
  - [ ] After every `write` operation, invoke `witness.js sign --file=<written-path>`
- [ ] F2.18 — Update `.agents/skills/retro/SKILL.md`:
  - [ ] Step 5 (compact) runs `witness.js check` before compaction
  - [ ] First `[INTEGRITY-WARNING]` is informational, not blocking
  - [ ] Second occurrence on the same file is blocking

## F2.19–F2.22 — Delegation enforcement

**Source:** Evolution §1.8

- [ ] F2.19 — Create `.agents/references/delegation-policy.md` (~100 lines):
  - [ ] `## Rule` — reasoning agents delegate I/O by default
  - [ ] `## Task → Sub-agent mapping` table:
    - [ ] Read 1-3 small files (< 500 lines total) → direct
    - [ ] Read 1+ large file OR 4+ files → `@reader`
    - [ ] Search codebase (grep/glob) → `@reader`
    - [ ] Write a single file < 50 lines → direct
    - [ ] Write 1+ file OR > 50 lines → `@writer`
    - [ ] Refactor across N files → `@writer` (batch mode)
    - [ ] Run any bash command → `@executor`
    - [ ] Read/write memory files → `@memory-controller`
    - [ ] Read/write skill/agent files → `@writer`
  - [ ] `## Override protocol` — `[DIRECT-IO-JUSTIFIED: <reason>]` line in response
  - [ ] `## Anti-patterns` list
- [ ] F2.20 — Add `## Delegation Contract` block to 13 reasoning agents:
  - [ ] F2.20.a — `developer.md`
  - [ ] F2.20.b — `code-reviewer.md`
  - [ ] F2.20.c — `architect.md`
  - [ ] F2.20.d — `tech-lead.md`
  - [ ] F2.20.e — `qa-engineer.md`
  - [ ] F2.20.f — `product-manager.md`
  - [ ] F2.20.g — `product-designer.md`
  - [ ] F2.20.h — `security-engineer.md`
  - [ ] F2.20.i — `performance-engineer.md`
  - [ ] F2.20.j — `data-analyst.md`
  - [ ] F2.20.k — `devops-engineer.md`
  - [ ] F2.20.l — `ml-engineer.md`
  - [ ] F2.20.m — `researcher.md`
- [ ] F2.21 — Create `.agents/scripts/delegation_audit.js` (~110 lines):
  - [ ] Reads `.agents/state/delegation-log.json`
  - [ ] Produces per-agent breakdown: delegated count, direct count, rate
  - [ ] Flags agents with < 50% delegation rate
  - [ ] Runs in < 500ms
- [ ] F2.22 — Add `## Invocation Logging` block to 3 sub-agents:
  - [ ] F2.22.a — `reader.md`
  - [ ] F2.22.b — `writer.md`
  - [ ] F2.22.c — `executor.md`
  - [ ] Each writes to `.agents/state/delegation-log.json` on every invocation

## F2.23–F2.27 — QA as hard gate

**Source:** Evolution §1.10

- [ ] F2.23 — Update `orchestrator_state.js`:
  - [ ] Before allowing `next` out of `development`, check for `artifacts/output/06-quality/qa-signoff.md`
  - [ ] If missing: return `{ ok: false, reason: "QA gate: qa-signoff.md missing. Invoke /develop Step 7a (@qa-engineer)." }`
  - [ ] If present: regex-check for `Release recommendation:\s*(GO|CONDITIONAL)`
  - [ ] If missing the recommendation: return `{ ok: false, reason: "QA gate: qa-signoff.md lacks GO/CONDITIONAL recommendation." }`
- [ ] F2.24 — Rewrite `develop/SKILL.md` Step 7 (from Phase 1) as sequential, blocking:
  - [ ] Step 7a: QA — HARD GATE (mandatory)
  - [ ] Step 7b: Security audit (only after 7a passes; if applicable)
  - [ ] Step 7c: Performance review (only after 7b passes; if applicable)
  - [ ] Step 7d: QA sign-off artifact (gate token)
- [ ] F2.25 — Update `.agents/agents/qa-engineer.md`:
  - [ ] Add `## Mandatory Invocation Contract` block
  - [ ] Read ACs from `artifacts/output/02-strategy/user-stories.md`
  - [ ] Write + run tests
  - [ ] Produce `qa-report.md` and `qa-signoff.md` with GO/NO-GO/CONDITIONAL verdict
  - [ ] Record `qa_run` telemetry event
- [ ] F2.26 — Create `.agents/scripts/qa_check.js` (~60 lines):
  - [ ] Pre-handoff verification
  - [ ] Checks both `qa-report.md` and `qa-signoff.md` exist
  - [ ] Checks `qa-signoff.md` is dated today
  - [ ] Checks `qa-signoff.md` contains `Release recommendation: GO|CONDITIONAL`
  - [ ] Exit 0 on pass, exit 1 on fail
- [ ] F2.27 — Document the gate token (no file to create; it's an artifact produced by `@qa-engineer`)

---

## Done when

- [ ] 10 hooks registered, env-var-disablable, documented
- [ ] `mcp__vespyr__memory_load` returns valid context for the calling agent (test from a Claude Code or OpenCode session)
- [ ] `npx vespyr mcp start` works
- [ ] `/self-learning` runs end-to-end on a real project, producing a digest
- [ ] `node .agents/scripts/witness.js check` exits 0 on a clean project
- [ ] `node .agents/scripts/delegation_audit.js` shows ≥ 5 sub-agent invocations after a typical `/develop` cycle
- [ ] `orchestrator_state.js next` refuses to advance out of `development` without `qa-signoff.md`
- [ ] `VESPYR_DISABLED_HOOKS=pre:bash:tmux` actually disables that hook
- [ ] `VESPYR_HOOK_PROFILE=minimal` strips the format/quality hooks

## Risks specific to this phase

- **Hooks break in different harnesses.** Per-harness adapter in `bin/install.js`; CI runs against all 3 harnesses. Safety hooks `exit 0` by default; `exit 2` only for explicit safety events.
- **MCP tools become a second source of truth.** MCP tools are *wrappers* around existing scripts. The script is the truth. MCP never owns state.
- **`witness.js` false positives.** Re-sign on every `@memory-controller write`; the witness is a *history*, not a *lock*. The first integrity warning is informational.
- **Self-learning promotes false patterns too aggressively.** 3+ occurrences, 2+ agents, 7+ day span is *all required*. Every promotion is human-in-the-loop.
- **Delegation audit reveals low delegation rate.** This is the audit's *job*; don't game the metric.

## Handoff to Phase 3

Once Phase 2 is done, every new file in Phase 3+ can assume:
- 10 hooks are live, with stable IDs and env-var disable.
- 10 MCP tools are callable from external harnesses.
- `instincts.md` is the first thing loaded in every session.
- `witness.json` tracks every critical artifact's hash.
- Delegation is enforced (or auditable).
- QA is a hard gate.
