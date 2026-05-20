# Skills & Tabs

Four phases for product building. Switch between them with **Tab**. Each phase has a primary agent with scoped permissions.

| Phase | Tab Color | Primary Agent | Permission | When to use |
|-------|-----------|---------------|------------|-------------|
| **Validation** | Red | `@founder` | Full access (writes validation brief) | Rough idea or problem space. Stress-test through Socratic diagnostic before investing research cycles. |
| **Exploration** | Indigo | `@founder` + researchers | Full access (writes research artifacts) | Idea survived validation. Synthesize → validate through market, competitor, and user research. |
| **Design** | Amber | `@product-manager` + `@product-designer` | Full access (writes PRD, specs) | Idea is validated. Define requirements (PRD) → create detailed specs with flows, interactions, visual design. |
| **Development** | Green | `@tech-lead` + `@developer` | Full edit/bash access | Specs are ready, time to build. Implement features from specs with quality gates. |

### Game Development Pipeline

Games follow the same phases but use **game-specific skills** that speak in player experience, core loops, and genre landscapes instead of pain points and workflows:

| Phase | Tab Color | Primary Skill | When to use |
|-------|-----------|---------------|-------------|
| **Validation** | Pink | `validate-game-idea` | Game concept needs stress-testing before production |
| **Exploration** | Purple | `explore-game-idea` | Validated concept needs genre market, competitive landscape, and player research |
| **Design → Development** | Amber → Green | `design` → `develop` | Same as product pipeline |

> **Note:** After exploration, game and product pipelines converge. Design and development skills are domain-agnostic.

## Subagent Permissions

> **Source of truth:** These permissions match the frontmatter in each agent's `.md` file.
> If there's ever a discrepancy, the **agent's own frontmatter** is authoritative.

| Agent | Bash | Edit | Read | Write Tool | Model Tier | Purpose |
|-------|------|------|------|------------|------------|---------|
| @reader | **deny** | **deny** | allow | no | **Lightweight** (DS Flash) | Read/search codebase — summarized results |
| @writer | **deny** | allow | ask | yes | **Lightweight** (DS Flash) | Write/edit files — precise execution |
| @executor | allow | **deny** | **deny** | no | **Lightweight** (DS Flash) | Run commands — summarized output |
| @founder | **deny** | **deny** | allow | yes | Premium (default) | Strategic ideation, writes idea brief via @writer |
| @researcher | **deny** | **deny** | allow | yes | Premium (default) | Market + competitive research via @writer |
| @user-researcher | **deny** | **deny** | allow | yes | Premium (default) | User research synthesis via @writer |
| @product-manager | **deny** | **deny** | allow | yes | Premium (default) | Writes PRD + user stories via @writer |
| @product-designer | **deny** | **deny** | allow | yes | Premium (default) | Writes product specs + design tokens via @writer |
| @architect | **deny** | **deny** | allow | yes | Premium (default) | Writes ADRs via @writer |
| @tech-lead | allow | allow | allow | yes | Premium (default) | Writes execution plans, runs git worktrees |
| @developer | allow | allow | allow | yes | Premium (default) | Writes production code and tests. Delegation: required/optional/none per task. |
| @ml-engineer | allow | allow | allow | yes | Premium (default) | Writes ML pipelines, models, serving code |
| @data-analyst | **deny** | **deny** | allow | yes | Premium (default) | Writes measurement plans, instrument code via @writer |
| @code-reviewer | allow | **deny** | allow | no | Premium (default) | Read code, report findings — no edits |
| @qa-engineer | allow | allow | allow | yes | Premium (default) | Writes tests, validates behavior |
| @security-engineer | allow | **deny** | allow | no | Premium (default) | Audit code and infra — report only |
| @performance-engineer | allow | **deny** | allow | no | Premium (default) | Profile and benchmark — report only |
| @devops-engineer | allow | allow | allow | yes | Premium (default) | Writes CI/CD, infra, deployment configs |
| @ux-researcher | **deny** | **deny** | allow | yes | Premium (default) | Evaluates usability — writes report via @writer |
| @technical-writer | **deny** | allow | allow | yes | Premium (default) | Writes and updates documentation (no commands allowed) |
| @project-manager | **deny** | **deny** | allow | yes | Premium (default) | Writes project plans, Kanban, status via @writer |
| @memory-controller | **deny** | **deny** | allow | yes | Premium (default) | Memory I/O, preflight checks, compaction |
| @orchestrator | allow | **deny** | allow | yes | Premium (default) | Pipeline state management, agent coordination |

## Delegation Layer

The agent system separates reasoning from execution. Thinking agents (@developer, @architect, @tech-lead, etc.) handle the cognitive work — designing, planning, analyzing, deciding. Operational I/O is delegated to specialized sub-agents that are efficient at their narrow tasks:

```
Thinking Agent
  │ reason, design, plan, decide
  │
  ├─→ @reader     — read/search files, return structured summary
  ├─→ @writer     — write/edit files precisely, confirm result
  └─→ @executor   — run commands, return condensed output
```

**Why separation matters:** Command output is the largest source of token waste. A test run can dump 10K+ tokens into context. @executor reduces that to ~200 tokens (pass/fail count, failed names, first errors). @writer handles file transcription so thinking agents don't pay for output tokens. @reader provides structural summaries so thinking agents don't consume raw file dumps.

The model tier doesn't matter as much as the architecture: even if all agents used the same model, the separation is valuable because each sub-agent's context stays narrow and focused.

**Enforced delegation (bash + edit denied):** @developer, @founder, @architect, @product-manager, @product-designer, @project-manager, @data-analyst, @researcher, @user-researcher, @ux-researcher.
**Partially enforced (bash denied, edit allowed):** @technical-writer (writes directly, but never runs commands).

## Flow

### Product Pipeline

```
Validation (Red) → Exploration (Indigo) → Design (Amber) → Development (Green)
      ↓ GO              ↓                      ↓                    ↓
    validate-idea     explore-idea           design            develop
       ↓ KILL
     Stop (save time)
```

### Game Development Pipeline

```
Validation (Pink) → Exploration (Purple) → Design (Amber) → Development (Green)
      ↓ GO               ↓                       ↓                    ↓
  validate-game-idea  explore-game-idea         design            develop
       ↓ KILL
     Stop (save time)
```

Within each phase, subagents are invoked by **@mention** (e.g., `@founder`, `@architect`).
Validation is optional but recommended — you can skip to Exploration if the idea is already validated.

## Optional Skills — Invoke on Demand

| Skill | Loads Into | When to invoke | How to invoke |
|-------|-----------|----------------|---------------|
| **humanize** | @writer | Any text needs to sound less like AI — email, docs, specs, comments, PR descriptions | Say "humanize this" or "use the humanize skill" |

## Optional Agents — Invoke on Demand

| Agent | Permission | Summon When |
|-------|-----------|-------------|
| @ml-engineer | Full access | ML/AI is core to the concept |
| @ux-researcher | Full access | Complex workflows, novel interactions, accessibility-critical |
| @data-analyst | Full access | Feature needs measurement or A/B testing |
| @performance-engineer | Read + bash (no edit) | Performance SLAs exist or before major release |
| @security-engineer | Read + bash (no edit) | Sensitive data (payments, PII, health) |
| @technical-writer | Full access | Public-facing API or user-facing feature changes |
| @devops-engineer | Full access | Deploying, changing infrastructure, or setting up CI/CD |
| @project-manager | Full access | Multi-phase projects needing timeline and coordination |

---

## Shared Guardrails

All agents follow the rules in [GUARDRAILS.md](./GUARDRAILS.md). This includes:
- Bash safety, deletion approval, user questioning, scope restriction
- **Feedback loop limits:** max 2 cycles on the same issue before escalation
- **Context budget:** prioritize task-relevant sections when input is large

## Shared Memory

All agents read from and write to `artifacts/memory/` through `@memory-controller` for cross-session continuity and token-optimized context loading.

| File | Purpose | Read By | Written By |
|------|---------|---------|------------|
| `project-context.md` | Project basics, tech stack | All agents (via @memory-controller Tier 1) | @founder, @architect |
| `active-decisions.md` | Current decisions and rationale | All agents (filtered by relevance) | Any agent via @memory-controller write |
| `patterns-and-conventions.md` | Discovered patterns | All agents (filtered by relevance) | @developer, @architect, @product-designer via @memory-controller write |
| `lessons-learned.md` | Insights from each phase | All agents (filtered by relevance) | Any agent via @memory-controller write |
| `blockers-and-risks.md` | Active blockers | All agents (filtered by relevance) | @tech-lead, any agent via @memory-controller write |
| `agent-notes/*.md` | Per-agent accumulated knowledge | Specific agent (Tier 2) | Specific agent via @memory-controller write |
| `session-summaries/latest.md` | Most recent session context (~100 tokens) | Tier 1 (5 lines only) | @memory-controller session-write |
| `session-summaries/history.md` | Full session log | Never loaded directly — search only | @memory-controller session-write (append) |
| `archive/` | Compacted historical entries | On-demand via @memory-controller search | @memory-controller (automatic) |

**Protocol:**
- **Read:** Invoke `@memory-controller load [agent-type] [task-description]` before starting. Do NOT read memory files directly — the controller filters and compresses context for you.
- **Write:** Invoke `@memory-controller write [file] [entry]` after completing. Use the format in `.opencode/templates/memory-entry-template.md`.
- **End of session:** Invoke `@memory-controller session-write [content]` when wrapping up. Use the format in `.opencode/templates/session-summary-template.md`. This gives the next session ~100 tokens of recent context instead of re-reading everything.

### Memory Entry Format

Every entry written to memory must follow the structured format in `.opencode/templates/memory-entry-template.md`:
- Domain tag: `[AUTH]`, `[CODE]`, `[RISK]`, etc.
- Date tag: `[date: YYYY-MM-DD]`
- Agent tag: `[agent: @agent-name]`
- Status field: `active`, `resolved`, or `superseded`

Entries without this format will be rejected by `@memory-controller`.

### Hybrid Scoring (Phase 3)

`@memory-controller` delegates Tier 3 scoring to `.opencode/scripts/memory_filter.js` — a deterministic Node.js script. No LLM mental arithmetic.

- **Keyword matching:** Stop word removal + synonym expansion (hardcoded map)
- **Recency weighting:** Sections < 14 days get +1, > 90 days get -1, > 180 days get -2
- **Threshold:** Sections scoring >= 2 are returned, capped at 10 results
- **Archive search:** Same script, `--search` mode, scans `archive/index.ndjson`

**Usage:**
```
node .opencode/scripts/memory_filter.js --agent developer --task "implement auth login"
node .opencode/scripts/memory_filter.js --search "JWT authentication decision"
```

### Incremental Graph Scan

`@architect`, `@tech-lead`, and `@memory-controller` (Operation 7) use `.opencode/scripts/incremental_graph.js` for structural analysis.

- **First run:** Full scan of all source files
- **Subsequent runs:** Only scans changed files (mtime-based)
- **Output:** `artifacts/memory/structural/graph.json` with imports, exports, imported_by

**Usage:**
```
node .opencode/scripts/incremental_graph.js --src src/ --out artifacts/memory/structural/graph.json
```

### Archive Format (NDJSON)

The archive index uses newline-delimited JSON for append-only writes:

- **First line:** Metadata (`schema_version`, `created`, `last_updated`)
- **Each subsequent line:** One archive entry as JSON
- **Append:** Zero read, ~100 bytes write
- **Search:** `node .opencode/scripts/archive_manager.js search-ndjson --file index.ndjson --query "auth"`
- **Migration:** `node .opencode/scripts/archive_manager.js migrate --from index.json --to index.ndjson`

### Progressive Context Loading

`@memory-controller` loads memory in three tiers:

| Tier | Content | Approx. tokens |
|------|---------|----------------|
| Tier 1 — Core | Project name, stack, phase, sprint, blocker count + last session (5 lines) | ~200 |
| Tier 2 — Agent-specific | Files relevant to the agent's role | ~300 |
| Tier 3 — Task-specific | Hybrid-scored chunks (keyword + semantic) | ~500 |
| **Total** | | **~1,000 tokens** |

Without the controller, loading all memory files costs ~10,000–20,000 tokens per agent invocation. The controller reduces this by 85–95%.

### Automatic Compaction

`@memory-controller` compacts memory files automatically when they exceed their word thresholds:

| File | Threshold |
|------|-----------|
| `active-decisions.md` | 1,800 words |
| `patterns-and-conventions.md` | 1,500 words |
| `lessons-learned.md` | 1,300 words |
| `blockers-and-risks.md` | 900 words |
| `agent-notes/*.md` (each) | 1,100 words |
| `session-summaries/latest.md` | 600 words |

Compaction moves `resolved` and `stale` entries to `artifacts/memory/archive/YYYY-QN/` and appends to the searchable `archive/index.ndjson`. Entries tagged `[CRITICAL]` are never archived. Nothing is ever deleted.

### Archive Search

To retrieve historical context that has been compacted:

```
@memory-controller search [your query]
```

The controller delegates to `memory_filter.js --search` which scans `archive/index.ndjson` using keyword matching + recency weighting. Returns top 5 matches with relevance scores, summaries, and file locations.

*See [workflow.md](./workflow.md) for the full orchestration graph and handoff contracts.*
*See [GUARDRAILS.md](./GUARDRAILS.md) for the full guardrails specification.*
