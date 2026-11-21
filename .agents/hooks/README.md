# Vespyr Lifecycle Hooks

13 command hooks with stable IDs. They are harness-agnostic: each reads one JSON event from stdin, acts, and communicates through exit codes and stdout/stderr. Per-harness adapters emit the wiring; the scripts themselves are shared.

## Hook IDs

| ID | Event | Blocking | Purpose |
|---|---|---|---|
| `session:start:load-context` | SessionStart | no | Surface `@memory-controller load` |
| `session:start:detect-package-manager` | SessionStart | no | Detect npm/yarn/pnpm/bun/poetry/cargo/go |
| `route:task` | UserPromptSubmit | no | Suggest a squad or agent |
| `pre:bash:safety` | PreToolUse (Bash) | **yes** | Block destructive commands |
| `pre:bash:tmux` | PreToolUse (Bash) | no | Suggest tmux for long tests |
| `pre:bash:delegation` | PreToolUse (Bash) | **yes** | Block unjustified direct I/O; log it |
| `pre:edit:delegation` | PreToolUse (Write/Edit) | **yes** | Same for files ≥ 50 lines |
| `post:edit:format` | PostToolUse (Write/Edit) | no | Run prettier / ruff / gofmt |
| `post:edit:dedupe` | PostToolUse (Write/Edit) | no | Dedupe-validate memory writes |
| `stop:session-end` | Stop | no | Run `session-write` |
| `stop:check-console-log` | Stop | no (strict: yes) | Warn on `console.log` |
| `pre:compact:save-state` | PreCompact | no | Snapshot state before compaction |
| `subagent:stop:telemetry` | SubagentStop | no | Emit telemetry event |

## Environment variables

| Variable | Values | Effect |
|---|---|---|
| `VESPYR_DISABLED_HOOKS` | comma-separated IDs, or `*` | Disable selected hooks; `*` disables all |
| `VESPYR_HOOK_PROFILE` | `minimal` \| `standard` \| `strict` | `minimal` = exactly 4 safety hooks; `standard` (default) = all 13; `strict` = all 13 and warnings block |
| `VESPYR_HOOK_AGENT` | agent name | Fallback when the harness does not report an agent on hook input |

`resolveActiveHooks(hooksJson, env)` in `scripts/hooks/lib.js` is a pure function — the active set is fixture-testable.

## Fail-closed contract

A crash inside any hook exits **2** (`[HOOK-FAIL-CLOSED]`), never a silent pass. Safety hooks also exit 2 to block an action. A `[DIRECT-IO-JUSTIFIED: task because reason]` marker is an escape hatch for delegation hooks, but it is **logged, not trusted** — `delegation_audit.js` flags implausible justification rates.

## Per-harness adapters

| Harness | Emitted config | Verification |
|---|---|---|
| Claude Code | `.claude/settings.json` (PascalCase events, stdin JSON, exit 2 blocks PreToolUse/PreCompact) | Official hooks reference |
| Cursor | `.cursor/hooks.json` (camelCase events, `failClosed`, `timeout`) | Official hooks docs — `subagentStop` and `preCompact` confirmed supported |
| GitHub Copilot / VS Code | `.github/hooks/vespyr.json` (camelCase events, `timeoutSec`; command errors fail closed, timeouts fail open) | Official Copilot hooks reference |
| OpenCode | Static `.agents/plugins/vespyr-hooks.ts`, discovered via the `.opencode → .agents` symlink (V2 `Plugin.define` with `ctx.tool.hook`, `ctx.session.hook`, `ctx.event.subscribe`; no `hooks` config key) | Official plugin docs |

Hook timeouts: Claude Code 60s default / 600s max; Cursor and Copilot use per-hook seconds. Keep hooks under their configured timeout.

## Verification sources (V1–V4, checked 2026-11-19)

- V1 OpenCode plugin event map: `ctx.tool.hook("execute.before"/"execute.after")`, `ctx.session.hook("context"/"compaction")`, `ctx.event.subscribe()`; direct `.ts`/`.js` files in `.opencode/plugins/` are loaded; no `hooks` key exists. Sources: https://opencode.ai/docs/build/plugins/server/ and https://opencode.ai/docs/build/plugins/migrate-v1/
- V2 Cursor event support: `subagentStop` and `preCompact` are supported (including cloud agents); `failClosed`, `timeout`, and `matcher` are per-hook options. Source: https://cursor.com/docs/agent/hooks
- V3 Copilot hook surface: `.github/hooks/*.json`, camelCase events (`preToolUse`, `sessionStart`, `subagentStop`, `preCompact`, `agentStop`), `timeoutSec`; command `preToolUse` errors fail closed, timeouts fail open. Sources: https://docs.github.com/en/copilot/reference/hooks-reference and https://code.visualstudio.com/docs/agent-customization/hooks
- V4 timeout semantics: Claude Code exit 2 blocks PreToolUse/PreCompact and is non-blocking on PostToolUse/SessionStart; Cursor/Copilot timeouts are per-hook seconds. Source: https://code.claude.com/docs/en/hooks
