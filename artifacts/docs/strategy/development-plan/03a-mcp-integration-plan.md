# MCP Integration Plan

**Status:** Planned  
**Date:** 2026-07-20  
**Depends on:** `03-phase-2-enablement.md` (first-party MCP tool signatures)

---

## 1. Principles

1. **Free & local-first.** All default MCP servers are open-source, run locally, require zero API keys or paid accounts.
2. **Curation over coverage.** 4 servers, not 40. Each must directly serve at least one of Vespyr's 21 personas.
3. **MCP complements sub-agents, not replaces them.** `@executor` still owns shell I/O. MCP servers provide structured data that shell commands can't return cleanly (DOM trees, typed diffs, LSP diagnostics).
4. **Hard context caps.** Every MCP response is truncated to 2,000 tokens max before entering the LLM context.

---

## 2. MCP vs. Sub-Agent Boundary

| Operation | Who handles it | Why |
|---|---|---|
| Read/write files, run shell commands | `@reader`, `@writer`, `@executor` | Simple I/O, no structured output needed |
| Load/write memory, pipeline status | `@vespyr/mcp` (1st-party) | Structured JSON from existing scripts |
| Git diffs, blame, log | Git MCP | Clean JSON diffs, no bash parsing |
| Browser DOM, screenshots, E2E | Playwright MCP | Headless browser can't be shell-scripted reliably |
| Type checks, lint, auto-imports | LSP/Ruff MCP | Language servers return structured diagnostics |
| UI component scaffolding | Shadcn MCP | Registry search + code generation |

**Rule:** If `@executor` can do it with a one-liner and clean output, don't add an MCP server for it.

---

## 3. Server Catalog

### Default (enabled on install)

| # | Server | License | Personas | Capability |
|---|---|---|---|---|
| 1 | **`@vespyr/mcp`** (1st-party) | MIT | All agents | 10 tools wrapping existing scripts (memory, pipeline, code graph, squads). See `03-phase-2-enablement.md` F2.6-F2.10. |
| 2 | **Playwright MCP** | Apache 2.0 | `@qa-engineer`, `@product-designer`, `@ux-researcher` | Headless browser: DOM inspection, screenshots, E2E tests. |
| 3 | **Git MCP** | GPL v2 | `@developer`, `@code-reviewer` | Structured diffs, commit logs, blame, file history as JSON. |
| 4 | **LSP/Ruff MCP** | MIT | `@developer`, `@architect`, `@code-reviewer` | Type diagnostics, symbol definitions, formatting for TS/JS/Python. |

### Opt-in (documented, not enabled by default)

| Server | Cost | Use case |
|---|---|---|
| **Shadcn MCP** | Free/MIT | UI component registry for projects using shadcn/ui |
| **GitHub MCP** | Free tier (PAT) | CI log retrieval, PR review integration |
| **Figma MCP** | Free tier | Design token extraction, SVG export |

### Rejected

Linear/Jira (paid SaaS), Postgres/SQLite (risk in dev loops), Snyk (paid), Storybook (redundant with Shadcn). Fallbacks: `kanban.md`/`sprint-status.yaml` for project tracking, `npm audit`/`pip audit` via `@executor` for security.

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
| MCP server fails to start | Log warning, disable tool for session, agent falls back to `@executor` shell equivalent |
| Tool call times out (>30s) | Return timeout error to agent, agent retries once or falls back |
| Tool returns malformed response | Truncation layer catches, returns `[MCP ERROR: malformed response]` |
| Server crashes mid-session | Harness restarts server on next tool call (standard MCP reconnect behavior) |

---

## 6. Implementation Plan

### Step 1: First-party `@vespyr/mcp` server (priority: high)

Build the internal MCP server that wraps existing scripts. This delivers the most value because it standardizes how all 21 agents interact with Vespyr's state machine.

- [ ] Create `packages/mcp/` with `src/server.ts`, `src/tools/`, `src/transport.ts`
- [ ] Implement 10 tools per `03-phase-2-enablement.md` F2.6-F2.10
- [ ] Each tool calls the corresponding `.agents/scripts/*.js` via child_process
- [ ] Add truncation middleware (2,000 token cap)
- [ ] Register in `opencode.json` under `mcpServers`
- [ ] Test: verify each tool returns correct output for known inputs

**Estimate:** 8-12 hours

### Step 2: Playwright MCP registration (priority: high)

Highest-impact 3rd-party server. Unblocks `@qa-engineer` visual verification, which is a hard gate for launch transitions.

- [ ] Add Playwright MCP to `opencode.json` `mcpServers`
- [ ] Document setup: `npx @playwright/mcp@latest` (no install needed)
- [ ] Test: `@qa-engineer` can take a screenshot and inspect DOM via MCP tool call
- [ ] Add truncation for large DOM/screenshot outputs

**Estimate:** 2-3 hours

### Step 3: Git MCP registration (priority: medium)

Replaces fragile `git` shell commands with structured JSON queries. Eliminates cross-platform shell differences.

- [ ] Evaluate available Git MCP servers (pick one that's maintained, local, JSON output)
- [ ] Register in `opencode.json`
- [ ] Test: `@code-reviewer` can get structured diff for current changes
- [ ] Update `@code-reviewer` and `@developer` agent prompts to prefer Git MCP over shell git

**Estimate:** 3-4 hours

### Step 4: LSP/Ruff MCP registration (priority: medium)

Catches type errors before code review. Reduces trivial review comments.

- [ ] Evaluate LSP MCP server options (TypeScript + Python coverage)
- [ ] Register in `opencode.json`
- [ ] Test: `@developer` gets type diagnostics after writing code
- [ ] Integrate with `/review` and `/test` skills

**Estimate:** 3-4 hours

### Step 5: Multi-harness sync (priority: low, defer)

Only implement when Vespyr actively supports 2+ harnesses. Until then, maintain `opencode.json` as the single config.

- [ ] When needed: create `bin/sync-mcp-configs.js` to read `opencode.json` mcpServers and write to `.claude/`, `.cursor/`, `.kiro/` formats

**Estimate:** 4-6 hours (deferred)

---

## 7. User Setup

After implementation, users enable MCP with a single command:

```bash
npx vespyr install  # already installs .agents/ — will also register MCP servers in opencode.json
```

No manual MCP configuration required. The installer (`bin/cli.js`) writes the `mcpServers` block into `opencode.json` automatically. Opt-in servers are added via:

```bash
npx vespyr install-module playwright-mcp
npx vespyr install-module github-mcp
```

---

## 8. Verification

| Check | Method |
|---|---|
| `@vespyr/mcp` tools return correct data | Unit tests in `packages/mcp/tests/` against known script outputs |
| Playwright MCP works in QA flow | `@qa-engineer` runs `/test` on a sample project, produces `qa-signoff.md` |
| Git MCP returns structured diffs | `@code-reviewer` runs `/review`, diff output is JSON not raw bash |
| Context stays under cap | Inspect truncated logs in `artifacts/tmp/mcp-logs/` during test runs |
| Error fallback works | Kill MCP server mid-session, verify agent falls back to `@executor` |
