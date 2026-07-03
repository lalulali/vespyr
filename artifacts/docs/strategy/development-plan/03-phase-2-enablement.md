# Phase 2 — Enablement

> **Release:** v2.1
> **Effort:** ~22h
> **Calendar:** Week 5
> **Themes:** T4 (Harness contracts), T5 (Self-improvement)
> **Goal:** Vespyr enforces policy at the harness layer (hooks), exposes primitives externally (MCP), tracks its own work (self-learning), has delegation audited (not just documented), and makes QA a hard gate.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| F2.19 (delegation policy + contract blocks) | Phase 2 only | **Split:** policy + blocks in Phase 0 T7.1; audit script + invocation logging in Phase 2 | T7 promotes the policy to Phase 0 (the moat ships first). Phase 2 ships the enforcement tooling. |
| Pre-Phase 0 (Hermes/OpenClaw) | v2.0 | **Deferred to v2.1+** | See `07-harness-integration.md` |

## F2.1-F2.5 — Lifecycle hooks (10 hooks with stable IDs)

**Source:** Adoption §3.5 | **Theme:** T4

- [ ] F2.1 — Create `.agents/hooks/hooks.json` with 10 hook entries:
  - `SessionStart` → `session:start:load-context`
  - `SessionStart` → `session:start:detect-package-manager`
  - `UserPromptSubmit` → `route:task`
  - `PreToolUse (Bash)` → `pre:bash:safety` (must support `exit 2` to block)
  - `PreToolUse (Bash)` → `pre:bash:tmux`
  - `PostToolUse (Write|Edit)` → `post:edit:format`
  - `PostToolUse (Write|Edit)` → `post:edit:dedupe`
  - `Stop` → `stop:session-end`
  - `Stop` → `stop:check-console-log`
  - `PreCompact` → `pre:compact:save-state`
  - `SubagentStop` → `subagent:stop:telemetry`
- [ ] F2.2 — Create `.agents/scripts/hooks/` with 10 Node.js hook scripts (~30-50 lines each)
- [ ] F2.3 — Update `bin/install.js` with per-harness adapter (Claude Code → `.claude/settings.json`; OpenCode → `opencode.json`; Cursor → `.cursor/hooks/hooks.json`)
- [ ] F2.4 — Add env-var support: `VESPYR_DISABLED_HOOKS=<comma,separated>` + `VESPYR_HOOK_PROFILE=minimal|standard|strict` (default: standard)
- [ ] F2.5 — Create `.agents/hooks/README.md`: list all 10 IDs, document env vars, document per-harness adapter

## F2.6-F2.10 — MCP tool surface (10 tools)

**Source:** Adoption §3.6 | **Theme:** T4

- [ ] F2.6 — Create `packages/mcp/` monorepo path (`package.json`, `tsconfig.json`, `src/server.ts`, `src/tools/`, `src/transport.ts`, `README.md`)
- [ ] F2.7 — Implement MCP server (`src/server.ts`, ~300 lines): JSON-RPC over stdio, tool registration, per-tool error handling
- [ ] F2.8 — Implement 10 tools (each ~60 lines, thin wrapper around existing scripts):
  - `mcp__vespyr__memory_load` → wraps `memory_filter.js`
  - `mcp__vespyr__memory_write` → wraps dedupe + append
  - `mcp__vespyr__pipeline_status` → wraps `orchestrator_state.js status`
  - `mcp__vespyr__pipeline_next` → wraps `orchestrator_state.js next`
  - `mcp__vespyr__code_graph_scan` → wraps `ensure_graph.js code`
  - `mcp__vespyr__code_graph_query` → wraps `graph_query.js` (Phase 3, stub now)
  - `mcp__vespyr__elicitation_methods` → wraps `match_methods.js`
  - `mcp__vespyr__squad_list` → wraps squad listing
  - `mcp__vespyr__squad_switch` → wraps squad switching
  - `mcp__vespyr__agent_resolve` → wraps agent resolution
- [ ] F2.9 — Update `opencode.json` to register MCP server by default
- [ ] F2.10 — Add `mcp start` / `mcp list-tools` / `mcp test <tool>` subcommands to `bin/cli.js`

**Rule:** MCP tools are *wrappers* around existing scripts. The script is the truth. MCP never owns state.

## F2.11-F2.15 — Self-learning (3-tier episode → pattern → instinct)

**Source:** Evolution Part 4 | **Theme:** T5

- [ ] F2.11 — Create `.agents/skills/self-learning/SKILL.md` (~280 lines): when to invoke, 3-tier model, scan episodes, promote pattern (3+ occurrences, 2+ agents, 7+ day span), promote instinct (human-in-the-loop), auto-load on session start, demote instinct
- [ ] F2.12 — Create `.agents/scripts/self_learn.js` (~280 lines): `scan-episodes --since=30d`, `find-patterns`, `promote-pattern`, `promote-instinct` (interactive), `demote-instinct`, `scan` (full pipeline). **Implementation code:** See `10-implementation-specs.md` §9
- [ ] F2.13 — Create `artifacts/memory/instincts.md` (empty starter, ~20 lines): header with format spec, `## Active Instincts` and `## Demoted Instincts` sections
- [ ] F2.14 — Update `memory-controller.md`: add Step 0.25 "Load instincts.md FIRST (before any other context)"
- [ ] F2.15 — Update `memory_filter.js`: add `instincts.md` to loadable files with highest priority, cap at ~200 tokens

## F2.16-F2.18 — Witness (artifact integrity)

**Source:** Evolution §2.5 | **Theme:** T3

- [ ] F2.16 — Create `.agents/scripts/witness.js` (~150 lines): `sign`, `verify`, `check`, `list`. SHA-256 (no Ed25519 — overkill for local-first). Storage: `.agents/state/witness.json` (committed). **Implementation code:** See `10-implementation-specs.md` §8
- [ ] F2.17 — Update `memory-controller.md`: after every `write`, invoke `witness.js sign --file=<written-path>`
- [ ] F2.18 — Update `retro/SKILL.md` Step 5: run `witness.js check` before compaction. First `[INTEGRITY-WARNING]` is informational, second on same file is blocking.

## F2.19-F2.22 — Delegation enforcement (audit + logging)

**Source:** Evolution §1.8 | **Theme:** T1

**Note:** The policy (`delegation-policy.md`) and the contract blocks on 13 reasoning agents ship in Phase 0 T7.1. Phase 2 ships the audit script and invocation logging.

- [ ] F2.19 — Create `.agents/references/delegation-policy.md` (~100 lines) if not already created in Phase 0:
  - Task → Sub-agent mapping table (Read 1-3 small files → direct; Read 4+ → @reader; Write > 50 lines → @writer; Run bash → @executor; Memory → @memory-controller)
  - `[DIRECT-IO-JUSTIFIED: <reason>]` override protocol
  - Anti-patterns list
- [ ] F2.20 — Verify all 13 reasoning agents have `## Delegation Contract` block (should be done in Phase 0 T7.1; verify here)
- [ ] F2.21 — Create `.agents/scripts/delegation_audit.js` (~110 lines): reads `state/delegation-log.json`, produces per-agent breakdown (delegated count, direct count, rate), flags agents < 50% delegation rate, runs in < 500ms. **Implementation code:** See `10-implementation-specs.md` §10
- [ ] F2.22 — Add `## Invocation Logging` block to `reader.md`, `writer.md`, `executor.md`: each writes to `state/delegation-log.json` on every invocation (`{timestamp, agent, sub_agent, task, token_estimate, delegated: true}`)

## F2.23-F2.27 — QA as hard gate

**Source:** Evolution §1.10 | **Theme:** T1

- [ ] F2.23 — Update `orchestrator_state.js`: before allowing `next` out of `development`, check for `artifacts/output/06-quality/qa-signoff.md`. If missing: block with reason. If present: regex-check for `Release recommendation:\s*(GO|CONDITIONAL)`
- [ ] F2.24 — Rewrite `develop/SKILL.md` Step 7 (from Phase 1) as sequential, blocking:
  - Step 7a: QA — HARD GATE (mandatory @qa-engineer invocation)
  - Step 7b: Security audit (only after 7a passes; if applicable)
  - Step 7c: Performance review (only after 7b passes; if applicable)
  - Step 7d: QA sign-off artifact (gate token)
- [ ] F2.25 — Update `qa-engineer.md`: add `## Mandatory Invocation Contract` block (read ACs, write+run tests, produce qa-report.md + qa-signoff.md with GO/NO-GO/CONDITIONAL, record telemetry)
- [ ] F2.26 — Create `.agents/scripts/qa_check.js` (~60 lines): checks both qa-report.md and qa-signoff.md exist, signoff dated today, contains GO|CONDITIONAL. Exit 0 on pass, 1 on fail. **Implementation code:** See `10-implementation-specs.md` §11
- [ ] F2.27 — Document the gate token (artifact produced by @qa-engineer, no file to create)

---

## Done when

- [ ] 10 hooks registered, env-var-disablable, documented
- [ ] `mcp__vespyr__memory_load` returns valid context (test from Claude Code or OpenCode)
- [ ] `npx vespyr mcp start` works
- [ ] `/self-learning` runs end-to-end on a real project, producing a digest
- [ ] `node .agents/scripts/witness.js check` exits 0 on a clean project
- [ ] `node .agents/scripts/delegation_audit.js` shows ≥ 5 sub-agent invocations after a typical `/develop` cycle
- [ ] `orchestrator_state.js next` refuses to advance out of `development` without `qa-signoff.md`
- [ ] `VESPYR_DISABLED_HOOKS=pre:bash:tmux` actually disables that hook
- [ ] `VESPYR_HOOK_PROFILE=minimal` strips the format/quality hooks

## Risks

- **Hooks break in different harnesses.** Per-harness adapter; CI runs against all 3. Safety hooks `exit 0` by default; `exit 2` only for explicit safety events.
- **MCP tools become a second source of truth.** MCP tools are wrappers around existing scripts. The script is the truth. MCP never owns state.
- **`witness.js` false positives.** Re-sign on every `@memory-controller write`; the witness is a history, not a lock. First warning is informational.
- **Self-learning promotes false patterns.** 3+ occurrences, 2+ agents, 7+ day span — all required. Every promotion is human-in-the-loop.
- **Delegation audit reveals low rate.** This is the audit's job; don't game the metric.

## Handoff to Phase 3

- 10 hooks live, with stable IDs and env-var disable.
- 10 MCP tools callable from external harnesses.
- `instincts.md` is the first thing loaded in every session.
- `witness.json` tracks every critical artifact's hash.
- Delegation is auditable.
- QA is a hard gate.
