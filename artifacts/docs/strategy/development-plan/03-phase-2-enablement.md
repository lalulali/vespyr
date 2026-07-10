# Phase 2 — Enablement

> **Release:** v2.1
> **Calendar:** Week 5
> **Themes:** T4 (Harness contracts), T5 (Self-improvement)
> **Goal:** Vespyr enforces policy at the harness layer (hooks), exposes primitives externally (MCP), tracks its own work (self-learning), has delegation audited (not just documented), and makes QA a hard gate.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| F2.19 (delegation policy + contract blocks) | Phase 2 only | **Split:** policy + blocks in Phase 0 T7.1; audit script + invocation logging in Phase 2 | T7 promotes the policy to Phase 0 (the moat ships first). Phase 2 ships the enforcement tooling. |
| Pre-Phase 0 (Hermes/OpenClaw) | v2.0 | **Deferred to v2.1+** | See `07-harness-integration.md` |

## F2.1-F2.5 — Lifecycle hooks (12 hooks with stable IDs)

**Source:** Adoption §3.5 | **Theme:** T4

**Problem:** Vespyr has zero lifecycle hooks. The agent's only contract with the harness is the frontmatter and the markdown body. There is no PreToolUse, no PostToolUse, no SessionStart, no PreCompact. We cannot enforce policy at the harness layer.

**Target:** Add a hook graph in `.agents/hooks/hooks.json` with 12 hooks, each with a stable ID so users can disable selectively via env var.

**Full hook table:**

| Event | Hook ID | What it does |
|---|---|---|
| `SessionStart` | `session:start:load-context` | Auto-invoke `@memory-controller load` to surface the last session summary. |
| `SessionStart` | `session:start:detect-package-manager` | Detect npm/yarn/pnpm/poetry/cargo and surface in `project-context.md`. |
| `UserPromptSubmit` | `route:task` | Run a routing pass: classify the user query, suggest a squad or agent, surface the suggestion to the calling agent. |
| `PreToolUse` (Bash) | `pre:bash:safety` | Block destructive commands (`rm -rf /`, `diskutil eraseDisk`, `mkfs.*`, etc.) — the GUARDRAILS rules are enforced at the harness layer. Must support `exit 2` to block. |
| `PreToolUse` (Bash) | `pre:bash:tmux` | If a long-running test is launched, suggest tmux to free the main thread. |
| `PreToolUse` (Bash) | `pre:bash:delegation` | If the invoking agent is a reasoning agent (developer, architect, code-reviewer, etc.), block the bash call with `exit 2` unless the response contains `[DIRECT-IO-JUSTIFIED: ...]`. Forces delegation to `@executor`. |
| `PreToolUse` (Write\|Edit) | `pre:edit:delegation` | If the invoking agent is a reasoning agent, block the write/edit call with `exit 2` unless the response contains `[DIRECT-IO-JUSTIFIED: ...]` OR the file is < 50 lines. Forces delegation to `@writer`. |
| `PostToolUse` (Write\|Edit) | `post:edit:format` | Auto-format the edited file via the project's formatter (prettier, ruff, gofmt). |
| `PostToolUse` (Write\|Edit) | `post:edit:dedupe` | Run `@memory-controller dedupe-validate` on the last write to `artifacts/memory/`. |
| `Stop` | `stop:session-end` | Invoke `@memory-controller session-write` automatically. |
| `Stop` | `stop:check-console-log` | Warn if the change added a `console.log` (catches agent slip-ups). |
| `PreCompact` | `pre:compact:save-state` | Snapshot the current state machine + session before compaction. |
| `SubagentStop` | `subagent:stop:telemetry` | Emit a telemetry event to `artifacts/telemetry/`. |

**Why this matters:** Enforcement at the harness layer. GUARDRAILS.md is documentation today. Hooks turn it into a runtime contract. `rm -rf /` is blocked even if `@developer` somehow tries it. Less cognitive load on agents — the agent doesn't need to remember to format, dedupe, or save state. The hooks do it.

**Why we don't adopt Ruflo's 27 hooks + 12 background workers.** That's the Ruflo ceiling. Vespyr's hook graph should be 10–14 hooks. Adding more is easy later; the cost of removing or rewriting a hook grows.

**Why we don't adopt Ruflo's "always exit 0" rule.** It's correct for hooks that learn / train. For our safety hooks, we want to be able to block an action — exit 2 to refuse.

- [ ] F2.1 — Create `.agents/hooks/hooks.json` with the 12 hooks above
- [ ] F2.2 — Create `.agents/scripts/hooks/` with 12 Node.js hook scripts (~30-50 lines each)
- [ ] F2.3 — Update `bin/install.js` with per-harness adapter (Claude Code → `.claude/settings.json`; OpenCode → `opencode.json`; Cursor → `.cursor/hooks/hooks.json`)
- [ ] F2.4 — Add env-var support: `VESPYR_DISABLED_HOOKS=<comma,separated>` + `VESPYR_HOOK_PROFILE=minimal|standard|strict` (default: standard)
  - `minimal`: safety hooks only (pre:bash:safety, pre:bash:delegation, pre:edit:delegation, stop:session-end)
  - `standard`: all 12 (default)
  - `strict`: all 12 + block on warnings (not just errors)
- [ ] F2.5 — Create `.agents/hooks/README.md`: list all 12 IDs, document env vars, document per-harness adapter

## F2.6-F2.10 — MCP tool surface (10 tools)

**Source:** Adoption §3.6 | **Theme:** T4

**Problem:** `opencode.json` registers exactly one MCP plugin: `opencode-websearch-cited@1.2.0`. No first-party vespyr MCP. External tools cannot call our primitives.

**Target:** Ship an `@vespyr/mcp` package that exposes the core primitives as MCP tools. The package is a thin Node.js server (stdio transport, JSON-RPC) that wraps the existing scripts.

**Full MCP tool signatures:**

```typescript
// mcp__vespyr__memory_load — wraps memory_filter.js
mcp__vespyr__memory_load({
  agent: "developer",
  task: "implement auth login flow",
  tier: "balanced"  // "core" | "balanced" | "full"
}) → { context: string, tokens: number, sources: string[] }

// mcp__vespyr__memory_write — wraps the dedupe-validate + append flow
mcp__vespyr__memory_write({
  file: "patterns-and-conventions.md",
  entry: "### [CODE] ..."
}) → { ok: boolean, deduped: boolean, id: string }

// mcp__vespyr__pipeline_status — wraps orchestrator_state.js status
mcp__vespyr__pipeline_status() → { phase: string, next: string, missing: string[] }

// mcp__vespyr__pipeline_next
mcp__vespyr__pipeline_next() → { action: "advance-phase" | "generate-artifacts", required: string[] }

// mcp__vespyr__code_graph_scan
mcp__vespyr__code_graph_scan({ path: "src/" }) → { nodes: number, edges: number, hotspots: string[] }

// mcp__vespyr__code_graph_query
mcp__vespyr__code_graph_query({ symbol: "auth.login" }) → { callers: string[], callees: string[] }

// mcp__vespyr__elicitation_methods
mcp__vespyr__elicitation_methods({ count: 5, context: "PRD section" })
  → { methods: [{ name, description, output_pattern }] }

// mcp__vespyr__squad_list
mcp__vespyr__squad_list() → { squads: [{ name, agents, description }] }

// mcp__vespyr__squad_switch
mcp__vespyr__squad_switch({ squad: "build" }) → { ok: boolean, active: string }

// mcp__vespyr__agent_resolve
mcp__vespyr__agent_resolve({ query: "who reviews PRs" }) → { agent: "code-reviewer", confidence: number }
```

**Rule:** MCP tools are *wrappers* around existing scripts. The script is the truth. MCP never owns state.

**Why we don't adopt Ruflo's 314-tool scale.** Our 10 tools cover the 90% of useful operations. Adding more is a 1-day script per tool.

- [ ] F2.6 — Create `packages/mcp/` monorepo path (`package.json`, `tsconfig.json`, `src/server.ts`, `src/tools/`, `src/transport.ts`, `README.md`)
- [ ] F2.7 — Implement MCP server (`src/server.ts`, ~300 lines): JSON-RPC over stdio, tool registration, per-tool error handling
- [ ] F2.8 — Implement 10 tools (each ~60 lines, thin wrapper around existing scripts)
- [ ] F2.9 — Update `opencode.json` to register MCP server by default
- [ ] F2.10 — Add `mcp start` / `mcp list-tools` / `mcp test <tool>` subcommands to `bin/cli.js`

## F2.11-F2.15 — Self-learning (3-tier episode → pattern → instinct)

**Source:** Evolution Part 4 | **Theme:** T5

**Problem:** Vespyr has all the infrastructure for self-learning (memory-controller, lessons-learned.md, retro skill, patterns-and-conventions.md) but no active promotion pipeline — the part that decides "this lesson learned is now a general principle."

**Target:** A 3-tier instinct system:

**Tier 1: Episodes** (raw, ephemeral)
- Stored in `artifacts/memory/agent-notes/<agent>.md` as individual entries with date + context + outcome
- Lifetime: until next `@retro` (compacted out if not promoted)
- Volume: high (every agent produces dozens per session)

**Tier 2: Patterns** (curated, stable)
- Promoted from episodes when: same pattern appears 3+ times across 2+ agents, spanning 7+ days
- Stored in `artifacts/memory/patterns-and-conventions.md`
- Lifetime: until manually archived or replaced
- Volume: medium (10-50 per project)

**Tier 3: Instincts** (auto-applied, opinionated)
- Promoted from patterns when: pattern has been stable for 30+ days AND is referenced by ≥ 2 ADRs
- Stored in `artifacts/memory/instincts.md`
- Auto-loaded by `@memory-controller` on every session (highest priority, before everything else)
- Lifetime: permanent until manually demoted
- Volume: low (3-10 per project — like a "house style")

- [ ] F2.11 — Create `.agents/skills/self-learning/SKILL.md` (~280 lines): when to invoke, 3-tier model, scan episodes, promote pattern (3+ occurrences, 2+ agents, 7+ day span — all required), promote instinct (human-in-the-loop), auto-load on session start, demote instinct, anti-patterns (don't promote too quickly, don't promote on age alone, don't auto-promote, don't delete demoted patterns, don't over-fit)
- [ ] F2.12 — Create `.agents/scripts/self_learn.js` (~280 lines): `scan-episodes --since=30d`, `find-patterns --min-occurrences=3 --min-agents=2 --min-span-days=7`, `promote-pattern`, `promote-instinct` (interactive, requires human approval), `demote-instinct`, `scan` (full pipeline). **Implementation code:** See `10-implementation-specs.md` §9
- [ ] F2.13 — Create `artifacts/memory/instincts.md` (empty starter, ~20 lines): header with format spec, `## Active Instincts` and `## Demoted Instincts` sections
- [ ] F2.14 — Update `memory-controller.md`: add Step 0.25 "Load instincts.md FIRST (before any other context)". Loading order: (1) instincts.md, (2) project-context.md, (3) active-decisions.md, (4) patterns-and-conventions.md, (5) lessons-learned.md, (6) agent-notes/<this-agent>.md
- [ ] F2.15 — Update `memory_filter.js`: add `instincts.md` to loadable files with highest priority, cap at ~200 tokens

### Self-learning outcome metrics

**Problem:** Episodes → patterns → instincts is well-specified as a pipeline, but there's no mechanism to answer: "did promoting this instinct actually improve agent outcomes?" Without measuring whether instincts help, the system could accumulate noise that costs tokens without adding value.

**Target:** Add 3 metrics to the self-learning system:

1. **Instinct hit rate:** How often does an auto-loaded instinct get referenced by an agent during a session? Tracked by `memory_filter.js` — when an instinct is loaded, log it; when an agent's output cites the instinct pattern, count a "hit." Target: > 50% of loaded instincts get at least 1 hit per week.

2. **Pattern freshness:** How many patterns are > 90 days old with < 3 occurrences? These are stale patterns that should be archived. `self_learn.js scan-patterns` reports stale patterns alongside instinct candidates.

3. **Token cost of instincts:** How many tokens does `instincts.md` consume per session? Capped at ~200 tokens (F2.15), but if the instinct count grows beyond 10, the cap forces truncation. Track: instinct count × average tokens per instinct. If total exceeds 200, flag for demotion review.

- [ ] F2.15.a — Add instinct hit tracking to `memory_filter.js`: log loaded instincts to `state/instinct-hits.json`; increment counter when agent output matches an instinct pattern
- [ ] F2.15.b — Add stale pattern reporting to `self_learn.js scan-patterns`: flag patterns > 90 days old with < 3 occurrences
- [ ] F2.15.c — Add token cost tracking to `memory_filter.js`: report total tokens consumed by `instincts.md` on each load

## F2.16-F2.18 — Witness (artifact integrity)

**Source:** Evolution §2.5 | **Theme:** T3

**Problem:** When a Vespyr skill produces an artifact, there's no way to detect if it was silently corrupted between sessions.

**Target:** A lightweight SHA-256 witness system (no Ed25519 — overkill for local-first).

- [ ] F2.16 — Create `.agents/scripts/witness.js` (~150 lines): `sign`, `verify`, `check`, `list`. Storage: `.agents/state/witness.json` (committed to repo). **Implementation code:** See `10-implementation-specs.md` §8
- [ ] F2.17 — Update `memory-controller.md`: after every `write`, invoke `witness.js sign --file=<written-path>`. The witness is a history, not a lock. First `[INTEGRITY-WARNING]` is informational.
- [ ] F2.18 — Update `retro/SKILL.md` Step 5: run `witness.js check` before compaction. Second occurrence on same file is blocking.

## F2.19-F2.22 — Delegation enforcement (audit + logging)

**Source:** Evolution §1.8 | **Theme:** T1

**Note:** The policy (`delegation-policy.md`) and the contract blocks on 13 reasoning agents ship in Phase 0 T7.1. Phase 2 ships the audit script and invocation logging.

**Full delegation-policy.md content (if not already created in Phase 0):**

```markdown
# Delegation Policy — When to Use Sub-Agents

**Rule:** Reasoning agents delegate I/O to sub-agents by default. Direct I/O requires a `[DIRECT-IO-JUSTIFIED: ...]` line in the response.

## Task → Sub-agent mapping

| Task type | Delegate to | Why |
|---|---|---|
| Read 1-3 small files (< 500 lines total) | direct | overhead exceeds benefit |
| Read 1+ large file OR 4+ files | `@reader` | keeps main context lean |
| Search codebase (grep/glob) | `@reader` | fast regex, condensed output |
| Write a single file < 50 lines | direct | overhead exceeds benefit |
| Write 1+ file OR > 50 lines | `@writer` | atomic write, consistent format |
| Refactor across N files | `@writer` (batch mode) | one transaction, N outputs |
| Run any bash command | `@executor` | parses output, returns summary |
| Read/write memory files | `@memory-controller` | validates schema, enforces format |
| Read/write skill/agent files | `@writer` | versioned, reviewable diff |

## Override protocol

If you must do I/O directly (outside the table above), emit one line:
[DIRECT-IO-JUSTIFIED: {task} because {reason}]

## Anti-patterns
- Reading 5 files then summarizing inline — that's @reader's job
- Running npm test and pasting output — that's @executor's job
- Writing 3 related files in 3 separate edit calls — batch into one @writer call
- Direct memory writes without @memory-controller — bypasses schema validation
```

- [ ] F2.19 — Create `.agents/references/delegation-policy.md` (~100 lines) if not already created in Phase 0
- [ ] F2.20 — Verify all 13 reasoning agents have `## Delegation Contract` block (should be done in Phase 0 T7.1)
- [ ] F2.21 — Create `.agents/scripts/delegation_audit.js` (~110 lines): reads `state/delegation-log.json`, produces per-agent breakdown (delegated count, direct count, rate), flags agents < 50% delegation rate. **Implementation code:** See `10-implementation-specs.md` §10
- [ ] F2.22 — Add `## Invocation Logging` block to `reader.md`, `writer.md`, `executor.md`: each writes to `state/delegation-log.json` on every invocation (`{timestamp, agent, sub_agent, task, token_estimate, delegated: true}`)

## F2.23-F2.27 — QA as hard gate

**Source:** Evolution §1.10 | **Theme:** T1

**Problem:** `develop/SKILL.md` Step 7 makes QA skippable in practice — the wording says "can run in parallel" and "if applicable," which the LLM reads as "optional." No QA artifact is required to transition out of development. `@qa-engineer` is the most under-invoked specialist agent.

**Target:** Make QA a hard gate with three enforcement layers: skill wording, orchestrator state machine, and a pre-handoff checklist.

**Full Step 7 rewrite (sequential, blocking):**

```markdown
### Step 7: Quality Gates (sequential, blocking)

**This step is mandatory. The skill CANNOT complete without it.**

Steps 7a → 7b → 7c → 7d run sequentially (not in parallel). 7a (QA) is a hard gate — 7b, 7c only run after 7a passes.

#### Step 7a: QA — HARD GATE
**You MUST invoke @qa-engineer here. Do not skip. Do not claim completion without an actual QA report file.**

Invoke @qa-engineer to:
1. Read the user story acceptance criteria from artifacts/output/02-strategy/user-stories.md
2. Write and run comprehensive tests (unit, integration, e2e as appropriate)
3. Produce artifacts/output/06-quality/qa-report.md with:
   - Test run summary (N passed, M failed)
   - Per-AC pass/fail (AC-H, AC-U, AC-E)
   - Coverage percentage
   - Open defects (if any)
   - Release recommendation: GO / NO-GO / CONDITIONAL
4. Halt condition: if NO-GO, the developer must fix and re-run. Max 2 QA-dev cycles, then escalate to @tech-lead.

#### Step 7b: Security Audit (if applicable)
Run ONLY after 7a is GO or CONDITIONAL.

#### Step 7c: Performance Review (if applicable)
Run ONLY after 7b passes (or is N/A).

#### Step 7d: QA Sign-off Artifact (gate token)
After 7a (and optionally 7b/7c), write artifacts/output/06-quality/qa-signoff.md:
# QA Sign-off — {feature name}
**Date:** {YYYY-MM-DD}
**QA Engineer:** @qa-engineer
**Release recommendation:** {GO | NO-GO | CONDITIONAL}
**Linked artifacts:** qa-report.md, {findings-report.md if security ran}, {perf-report.md if perf ran}
**Signature:** {hash of qa-report.md + mtime}
The orchestrator reads this file's existence as the gate token to advance from development.
```

- [ ] F2.23 — Update `orchestrator_state.js`: before allowing `next` out of `development`, check for `qa-signoff.md`. If missing: block with reason. If present: regex-check for `Release recommendation:\s*(GO|CONDITIONAL)`
- [ ] F2.24 — Rewrite `develop/SKILL.md` Step 7 as sequential, blocking (text above)
- [ ] F2.25 — Update `qa-engineer.md`: add `## Mandatory Invocation Contract` block (read ACs, write+run tests, produce qa-report.md + qa-signoff.md with GO/NO-GO/CONDITIONAL, record telemetry. If cannot run tests: emit NO-GO with clear reason — do NOT silently pass.)
- [ ] F2.26 — Create `.agents/scripts/qa_check.js` (~60 lines). **Implementation code:** See `10-implementation-specs.md` §11
- [ ] F2.27 — Document the gate token (artifact produced by @qa-engineer, no file to create)

---

## Done when

- [ ] 12 hooks registered, env-var-disablable, documented
- [ ] `mcp__vespyr__memory_load` returns valid context (test from Claude Code or OpenCode)
- [ ] `npx vespyr mcp start` works
- [ ] `/self-learning` runs end-to-end on a real project, producing a digest
- [ ] `node .agents/scripts/witness.js check` exits 0 on a clean project
- [ ] `node .agents/scripts/delegation_audit.js` shows ≥ 5 sub-agent invocations after a typical `/develop` cycle
- [ ] `orchestrator_state.js next` refuses to advance out of `development` without `qa-signoff.md`
- [ ] `VESPYR_DISABLED_HOOKS=pre:bash:tmux` actually disables that hook
- [ ] `VESPYR_HOOK_PROFILE=minimal` strips the format/quality hooks
- [ ] **Delegation enforcement:** `pre:bash:delegation` and `pre:edit:delegation` hooks block direct I/O from reasoning agents unless `[DIRECT-IO-JUSTIFIED: ...]` is present
- [ ] **Self-learning metrics:** instinct hit tracking, stale pattern reporting, and token cost tracking all functional

## Risks

- **Hooks break in different harnesses.** Per-harness adapter; CI runs against all 3. Safety hooks `exit 0` by default; `exit 2` only for explicit safety events.
- **MCP tools become a second source of truth.** MCP tools are wrappers around existing scripts. The script is the truth. MCP never owns state.
- **`witness.js` false positives.** Re-sign on every `@memory-controller write`. Witness is a history, not a lock. First warning is informational.
- **Self-learning promotes false patterns.** 3+ occurrences, 2+ agents, 7+ day span — all required. Every promotion is human-in-the-loop.
- **Delegation audit reveals low rate.** This is the audit's job; don't game the metric.
- **Delegation hooks block legitimate direct I/O.** The `[DIRECT-IO-JUSTIFIED: ...]` protocol is the escape hatch. If the hook blocks too aggressively, users can disable it via `VESPYR_DISABLED_HOOKS=pre:bash:delegation,pre:edit:delegation`. The hook checks for the justification string in the agent's response — if present, it passes.

### Rollback plan

If Phase 2 breaks:
- **Hooks:** `VESPYR_DISABLED_HOOKS=*` disables all hooks. Or delete `.agents/hooks/hooks.json` — hooks are opt-in per harness.
- **MCP server:** remove the MCP registration from `opencode.json`. The underlying scripts still work via CLI.
- **Self-learning:** delete `instincts.md` — the system falls back to the 2-tier memory (project-context + patterns). No data is lost; episodes and patterns remain.
- **QA hard gate:** if `qa-signoff.md` blocks a legitimate release, create a manual signoff with `Release recommendation: CONDITIONAL` and a note explaining the bypass.

## Handoff to Phase 3

- 12 hooks live, with stable IDs and env-var disable.
- 10 MCP tools callable from external harnesses.
- `instincts.md` is the first thing loaded in every session.
- `witness.json` tracks every critical artifact's hash.
- Delegation is enforced at the harness layer (hooks block direct I/O) and auditable (audit script).
- QA is a hard gate.
