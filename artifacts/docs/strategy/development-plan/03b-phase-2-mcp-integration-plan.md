# MCP Integration Plan

**Status:** Planned  
**Date:** 2026-07-20  
**Depends on:** Existing `.agents/scripts/*.js` (memory_filter, orchestrator_state, squads, resolve_agents, etc.) — all functional today. MCP tools are thin wrappers, no new script logic.

---

## 1. Principles

1. **Free & local-first.** All default MCP servers are open-source, run locally, require zero API keys or paid accounts.
2. **Curation over coverage.** 5 default servers. Each must directly serve at least one of Vespyr's personas (20 advertised / 23 agent files). Add a server only when multiple personas need it and a harness-native subagent (or direct call) can't provide the same capability cleanly.
3. **MCP complements native I/O, not replaces it.** Harness-native subagents (or direct calls) still own shell I/O. MCP servers provide structured data that shell commands can't return cleanly (DOM trees, typed diffs, LSP diagnostics).
4. **Hard context caps.** Every MCP response is truncated to 2,000 tokens max before entering the LLM context.
5. **UTTERLY SATISFIED is preserved.** MCP tools may return evidence and validation results, but they cannot infer approval, erase blockers, or bypass the canonical satisfaction and release gate.

---

## 2. MCP vs. Sub-Agent Boundary

| Operation | Who handles it | Why |
|---|---|---|
| Read/write files, run shell commands | harness subagent / direct | Simple I/O, no structured output needed |
| Pipeline status/next, agent resolve | harness execution / direct | Shell one-liners, JSON output already clean |
| Memory load/write/search/session-diff | `@vespyr/mcp` (1st-party) | Ranked search, diffs, dedup — not shell-friendly |
| ~~Code/artifact graph queries~~ | ❌ removed | Graph subsystem cut (owner [NO-GO] 2026-09-24); no graph MCP tools |
| Elicitation methods | `@vespyr/mcp` (1st-party) | Ranked method matching against catalog |
| Task history, persona fidelity check | `@vespyr/mcp` (1st-party) | Similarity lookup + rule matching — new capabilities |
| Web search, fetch, crawl | Hound MCP | Multi-engine keyless search + Cloudflare bypass + PDF/OCR |
| Git diffs, blame, log | Git MCP | Clean JSON diffs, no bash parsing |
| Browser DOM, screenshots, E2E | Playwright MCP | Headless browser can't be shell-scripted reliably |
| Type checks, lint, auto-imports | LSP/Ruff MCP | Language servers return structured diagnostics |
| UI component scaffolding | Shadcn MCP | Registry search + code generation |

**Rule:** If a harness-native subagent (or a direct call) can do it with a one-liner and clean output, don't add an MCP server for it.

---

## 3. Server Catalog

### Default (enabled on install)

| # | Server | License | Personas | Capability |
|---|---|---|---|---|
| 1 | **`@vespyr/mcp`** (1st-party) | MIT | All agents | 7 tools: 3 wrappers (memory load/write, elicitation) + 4 capability tools (memory_search, session_diff, task_history, fidelity_check). See §3a. _(2 graph tools removed 2026-09-24.)_ |
| 2 | **Playwright MCP** | Apache 2.0 | `@qa-engineer`, `@product-designer`, `@ux-researcher` | Headless browser: DOM inspection, screenshots, E2E tests. |
| 3 | **Git MCP** | GPL v2 | `@developer`, `@code-reviewer` | Structured diffs, commit logs, blame, file history as JSON. |
| 4 | **LSP/Ruff MCP** | MIT | `@developer`, `@architect`, `@code-reviewer` | Type diagnostics, symbol definitions, formatting for TS/JS/Python. |
| 5 | **Hound MCP** (master-fetch) | MIT | `@researcher`, `@product-manager`, `@user-researcher`, `@ux-researcher`, `@security-engineer`, `@developer`, `@architect`, `@technical-writer` | Keyless local web search (10 engines), smart fetch with Cloudflare bypass, same-domain crawl, PDF + OCR extraction, screenshot. Replaces `opencode-websearch-cited@1.2.0`. |

### Opt-in (documented, not enabled by default)

| Server | Cost | Personas | Use case |
|---|---|---|---|
| **Shadcn MCP** | Free/MIT | `@product-designer`, `@developer` | UI component registry for projects using shadcn/ui |
| **GitHub MCP** | Free tier (PAT) | `@developer`, `@code-reviewer` | CI log retrieval, PR review integration |
| **Figma MCP** | Free tier | `@product-designer` | Design token extraction, SVG export |
| **Reddit MCP Buddy** (`karanb192/reddit-mcp-buddy`) | Free / Reddit API | `@researcher`, `@user-researcher` | Organic market sentiment analysis, competitor pain point mining, community discussion scraping, and trend validation |

### Rejected

Linear/Jira (paid SaaS), Postgres/SQLite (risk in dev loops), Snyk (paid), Storybook (redundant with Shadcn). Fallbacks: `kanban.md`/`sprint-status.yaml` for project tracking, `npm audit`/`pip audit` via a harness-native shell call for security.

---

## 3a. First-Party `@vespyr/mcp` Tools

The `@vespyr/mcp` server exposes 7 tools. Three wrap existing scripts to provide structured, typed access. Four are **new capability tools** — things agents need that a plain shell call can't do cleanly. _(The former code-graph and artifact-graph tools were removed with the graph subsystem, owner [NO-GO] 2026-09-24.)_

Tools that remain as simple shell calls (a harness-native call handles them fine today) are [listed below](#shell-one-liners-kept-as-executor-calls) and *not* MCP-wrapped.

### Memory (4 tools)

| # | Tool | Source | Input | Output | Primary Personas |
|---|---|---|---|---|---|
| 1 | `memory_load` | Wrap: `memory_filter.js` | `agent`, `task`, `tier` (`core`\|`balanced`\|`full`) | `{ context, tokens, sources[] }` | All agents |
| 2 | `memory_write` | Wrap: `dedupe_validator.js` + append | `file`, `entry` (markdown) | `{ ok, deduped, id }` | All agents |
| 3 | `memory_search` | **New** | `query` (natural language), `limit?`, `files?[]` | `{ results[{ snippet, file, line, score }] }` | All agents |

`memory_load` surfaces the right context tier before each session. `memory_write` deduplicates then appends — prevents duplicate entries from flooding `lessons-learned.md`.

`memory_search` is the biggest single win. Today an agent that needs a pattern either reads every memory file (hundreds of tokens wasted) or runs a raw regex read via a harness-native subagent. This returns 3–5 ranked snippets using sparse retrieval (BM25) across all memory files. **80%+ token savings on memory lookups.**

| # | Tool | Source | Input | Output | Primary Personas |
|---|---|---|---|---|---|
| 4 | `session_diff` | **New** | `since` (timestamp\|"last") | `{ added[], removed[], changed[], unchanged[] }` | All agents |

On session start, agents re-read `project-context.md`, `active-decisions.md`, `lessons-learned.md` even when nothing changed. `session_diff` computes the delta from the last recorded session — **reduces startup context from ~800 tokens to ~50**.

### Elicitation (1 tool)

| # | Tool | Source | Input | Output | Primary Personas |
|---|---|---|---|---|---|
| 8 | `elicitation_methods` | Wrap: `match_methods.js` | `count`, `context` (e.g. `"PRD section"`) | `{ methods[{ name, description, output_pattern }] }` | `@product-manager`, `@architect`, `@founder` |

Returns the top-N elicitation methods (from a catalog of 60+) matched to the given context. Used by `/grill-me`, `/unpack-problem`, and `/brainstorming` to surface Socratic questions, first-principles probes, or pre-mortem patterns.

### Self-Awareness (2 tools)

| # | Tool | Source | Input | Output | Primary Personas |
|---|---|---|---|---|---|
| 9 | `task_history` | **New** | `description` (natural language), `limit?` | `{ tasks[{ description, hours, agent, date, outcome }] }` | `@tech-lead`, `@product-manager` |
| 10 | `fidelity_check` | **New** | (none) | `{ violations[{ rule, snippet, severity }], score }` | All reasoning agents |

`task_history` makes `@tech-lead` estimates data-driven instead of guesses. Queries historical task log (`artifacts/telemetry/tasks.json`) by similarity — "last 3 auth tasks averaged 11 hours."

`fidelity_check` scans the agent's last output against its persona contract (Socratic stance, delegation rules, guardrails) and flags violations. Gives reasoning agents a self-audit before they ship output to the user. Complement to Phase 2 hooks — hooks block at the harness layer, this warns at the agent layer.

### Shell One-Liners (Kept as Harness-Native Calls)

These 5 tools are simple CLI invocations — no new capability from MCP wrapping:

| Operation | Shell call |
|---|---|
| Pipeline status | `node orchestrator_state.js status` |
| Pipeline next | `node orchestrator_state.js next` |
| Squad list | `node squads.js list` |
| Squad switch | `node squads.js switch` |
| Agent resolve | `node resolve_agents.js --query "..."` |

---

## 4. Context Truncation

1. **Cap:** 2,000 tokens per MCP response (~100 lines).
2. **Spillover:** Output exceeding the cap is written to `artifacts/tmp/mcp-logs/<tool>-<timestamp>.log`. The LLM receives a summary:
   ```
   [MCP OUTPUT TRUNCATED]
   Tool: Playwright MCP
   Status: 2 Passed, 1 Failed
   Failure: "expect(element).toBeVisible() failed at line 42"
   Full log: artifacts/tmp/mcp-logs/playwright-1721500000.log
   ```
3. **Enforcement:** Truncation runs in the MCP server's response handler, not in the agent prompt. Agents never see raw oversized output.

---

## 5. Error Handling

| Failure | Behavior |
|---|---|
| MCP server fails to start | Log warning, disable tool for session, agent falls back to a direct harness-native shell call |
| Tool call times out (>30s) | Return timeout error to agent, agent retries once or falls back |
| Tool returns malformed response | Truncation layer catches, returns `[MCP ERROR: malformed response]` |
| Server crashes mid-session | Harness restarts server on next tool call (standard MCP reconnect behavior) |

---

## 6. Implementation Plan

### Step 1: First-party `@vespyr/mcp` server (priority: high)

The internal MCP server delivers two things: structured access to existing scripts (3 wraps) and new capabilities agents can't get via shell (4 new tools).

**Problem:** `opencode.json` currently registers zero first-party MCP tools. All internal operations require shelling out to raw scripts. Worse, agents cannot do ranked memory search, session diffs, task lookups, or persona fidelity checks at all.

**Target:** See §3a for the full 7-tool catalog. 3 tools wrap existing scripts (memory_load, memory_write, elicitation_methods). 4 tools require new scripts (memory_search, session_diff, task_history, fidelity_check). _(The former code_graph/artifact_graph tools were removed with the graph subsystem.)_

**New script dependencies:**

| New Tool | New Script | Purpose | Est. lines |
|---|---|---|---|
| `memory_search` | `.agents/scripts/memory_search.js` | BM25 index + ranked query across memory files | ~120 |
| `session_diff` | `.agents/scripts/session_diff.js` | Compare current memory state vs. last snapshot | ~80 |
| `task_history` | `.agents/scripts/task_history.js` | Query `artifacts/telemetry/tasks.json` by similarity | ~80 |
| `fidelity_check` | `.agents/scripts/fidelity_check.js` | Parse agent output, match against persona constraints | ~100 |

**Tasks:**

- [ ] Create `packages/mcp/` monorepo path (`package.json`, `tsconfig.json`, `src/server.ts`, `src/tools/`, `src/transport.ts`, `README.md`)
- [ ] Implement MCP server (`src/server.ts`, ~300 lines): JSON-RPC over stdio, tool registration, per-tool error handling
- [ ] Implement 3 wrapper tools (each ~60 lines, thin wrapper around existing scripts)
- [ ] Implement 4 capability tools + their backing scripts (~380 new lines across 4 scripts)
- [ ] Register in `opencode.json` under `mcpServers`
- [ ] Add `mcp start` / `mcp list-tools` / `mcp test <tool>` subcommands to `bin/cli.js`
- [ ] Add truncation middleware (2,000 token cap) in the server response handler
- [ ] Test: `memory_search("auth pattern")` returns ranked snippets across all memory files
- [ ] Test: `session_diff` reports only changed files on second session
- [ ] Test: `fidelity_check` flags a delegation-policy violation
- [ ] Test: `npx vespyr mcp start` works end-to-end

**Rollback:** Remove the MCP registration from `opencode.json`. All 5 wrapper tools still work via CLI. The 5 capability tools are new scripts that can be called via CLI independently.

**Estimate:** 16-20 hours (up from 8-12 due to 5 new scripts)

### Step 2: Hound MCP registration (priority: high)

Replaces `opencode-websearch-cited@1.2.0` with local-first web research. Benefits 10+ personas — `@researcher`, `@product-manager`, `@user-researcher`, `@ux-researcher`, and `@developer` all need web fetch/search regularly. Shares the same Chromium browser as Playwright MCP (single install).

- [ ] Install: `pip install hound-mcp[all] && playwright install chromium`
- [ ] Register in `opencode.json` under `mcpServers` (`hound` command, no arguments, no API keys)
- [ ] Remove `opencode-websearch-cited@1.2.0` from plugins
- [ ] Test: `@researcher` can `smart_search` + `smart_fetch` a competitor analysis page
- [ ] Test: PDF extraction works for research papers
- [ ] Add truncation for large page/screenshot outputs

**Estimate:** 2-3 hours

### Step 3: Playwright MCP registration (priority: high)

Highest-impact 3rd-party server. Unblocks `@qa-engineer` visual verification, which is a hard gate for launch transitions.

- [ ] Add Playwright MCP to `opencode.json` `mcpServers`
- [ ] Document setup: `npx @playwright/mcp@latest` (no install needed)
- [ ] Test: `@qa-engineer` can take a screenshot and inspect DOM via MCP tool call
- [ ] Add truncation for large DOM/screenshot outputs

**Estimate:** 2-3 hours

### Step 4: Git MCP registration (priority: medium)

Replaces fragile `git` shell commands with structured JSON queries. Eliminates cross-platform shell differences.

- [ ] Evaluate available Git MCP servers (pick one that's maintained, local, JSON output)
- [ ] Register in `opencode.json`
- [ ] Test: `@code-reviewer` can get structured diff for current changes
- [ ] Update `@code-reviewer` and `@developer` agent prompts to prefer Git MCP over shell git

**Estimate:** 3-4 hours

### Step 5: LSP/Ruff MCP registration (priority: medium)

Catches type errors before code review. Reduces trivial review comments.

- [ ] Evaluate LSP MCP server options (TypeScript + Python coverage)
- [ ] Register in `opencode.json`
- [ ] Test: `@developer` gets type diagnostics after writing code
- [ ] Integrate with `/review` and `/test` skills

**Estimate:** 3-4 hours

### Step 6: Multi-harness sync (priority: low, defer)

Only implement when Vespyr actively supports 2+ harnesses. Until then, maintain `opencode.json` as the single config.

- [ ] When needed: create `bin/sync-mcp-configs.js` to read `opencode.json` mcpServers and write to `.claude/`, `.cursor/`, `.kiro/` formats

**Estimate:** 4-6 hours (deferred)

---

## 7. User Setup

After implementation, users enable MCP with a single command:

```bash
npx vespyr install  # installs .agents/ + registers all default MCP servers in opencode.json
```

No manual MCP configuration required. The installer (`bin/cli.js`) writes the `mcpServers` block into `opencode.json` automatically. Hound and Playwright share the same Chromium browser (`playwright install chromium`); the installer runs this once. Opt-in servers are added via:

```bash
npx vespyr install-module shadcn-mcp
npx vespyr install-module github-mcp
npx vespyr install-module figma-mcp
npx vespyr install-module reddit-mcp
```

---

## 8. Verification

| Check | Method |
|---|---|
| `@vespyr/mcp` tools return correct data | Unit tests in `packages/mcp/tests/` against known script outputs |
| `memory_search` returns ranked results | Query "auth pattern" returns snippet from `lessons-learned.md` ranked above `patterns-and-conventions.md` |
| `session_diff` reports only deltas | Run on clean project → all files unchanged. Add entry to memory → only that file shown as changed. |
| `fidelity_check` catches violations | Feed agent output with direct shell call → flags "run shell via a harness-native call, not inline." |
| `task_history` finds similar tasks | Query "implement auth" returns prior auth tasks with hours + agent + outcome |
| Hound MCP works for web research | `@researcher` runs `smart_search` + `smart_fetch`, returns cited markdown content |
| Playwright MCP works in QA flow | `@qa-engineer` runs `/test` on a sample project, produces `qa-signoff.md` |
| Git MCP returns structured diffs | `@code-reviewer` runs `/review`, diff output is JSON not raw bash |
| Context stays under cap | Inspect truncated logs in `artifacts/tmp/mcp-logs/` during test runs |
| Error fallback works | Kill MCP server mid-session, verify agent falls back to a direct harness-native shell call |

---

## Completion Checklist

**03b status: PLANNED (v2.1 Scope — Not Started).**

- [ ] Core `@vespyr/mcp` tools implemented (`memory_search`, `session_diff`, `fidelity_check`, `task_history`, etc.)
- [ ] Third-party MCP integration configured (Hound, Playwright, Git, shadcn, GitHub, Figma)
- [ ] Installer MCP auto-registration in `bin/cli.js`
- [ ] Fallback handling from MCP tools to harness-native bash calls

---

## Sign-Off

**@architect (Vera):** PENDING — MCP server protocol and schema review.  
**@tech-lead (Grant):** PENDING — Execution scheduled for v2.1.  
**@qa-engineer (Nina):** PENDING — Tool verification suite and context cap tests.
