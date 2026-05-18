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
| **Validation** | Pink | `game-idea-validation` | Game concept needs stress-testing before production |
| **Exploration** | Purple | `game-product-exploration` | Validated concept needs genre market, competitive landscape, and player research |
| **Design → Development** | Amber → Green | `product-design` → `product-development` | Same as product pipeline |

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
| @market-researcher | **deny** | **deny** | allow | yes | Premium (default) | Market research synthesis via @writer |
| @competitor-analyzer | **deny** | **deny** | allow | yes | Premium (default) | Competitive intelligence via @writer |
| @user-researcher | **deny** | **deny** | allow | yes | Premium (default) | User research synthesis via @writer |
| @product-manager | **deny** | **deny** | allow | yes | Premium (default) | Writes PRD + user stories via @writer |
| @product-designer | **deny** | **deny** | allow | yes | Premium (default) | Writes product specs + design tokens via @writer |
| @architect | **deny** | **deny** | allow | yes | Premium (default) | Writes ADRs via @writer |
| @tech-lead | allow | allow | allow | yes | Premium (default) | Writes execution plans, runs git worktrees |
| @developer | **deny** | **deny** | allow | no | Premium (default) | Writes production code and tests (via @writer/@executor) |
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

**Enforced delegation (bash + edit denied):** @developer, @founder, @architect, @product-manager, @product-designer, @project-manager, @data-analyst, @market-researcher, @competitor-analyzer, @user-researcher, @ux-researcher.
**Partially enforced (bash denied, edit allowed):** @technical-writer (writes directly, but never runs commands).

## Flow

### Product Pipeline

```
Validation (Red) → Exploration (Indigo) → Design (Amber) → Development (Green)
     ↓ GO              ↓                      ↓                    ↓
   idea-validation   product-exploration   product-design    product-development
      ↓ KILL
    Stop (save time)
```

### Game Development Pipeline

```
Validation (Pink) → Exploration (Purple) → Design (Amber) → Development (Green)
     ↓ GO               ↓                       ↓                    ↓
 game-idea-validation  game-product-exploration  product-design    product-development
      ↓ KILL
    Stop (save time)
```

Within each phase, subagents are invoked by **@mention** (e.g., `@founder`, `@architect`).
Validation is optional but recommended — you can skip to Exploration if the idea is already validated.

## Optional Skills — Invoke on Demand

| Skill | Loads Into | When to invoke | How to invoke |
|-------|-----------|----------------|---------------|
| **humanizer** | @writer | Any text needs to sound less like AI — email, docs, specs, comments, PR descriptions | Say "humanize this" or "use the humanizer skill" |

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
| `session-summaries/latest.md` | Most recent session context | All agents (Tier 2) | Any agent ending a session |
| `archive/` | Compacted historical entries | On-demand via @memory-controller search | @memory-controller (automatic) |

**Protocol:**
- **Read:** Invoke `@memory-controller load [agent-type] [task-description]` before starting. Do NOT read memory files directly — the controller filters and compresses context for you.
- **Write:** Invoke `@memory-controller write [file] [entry]` after completing. Use the format in `.opencode/templates/memory-entry-template.md`.

### Memory Entry Format

Every entry written to memory must follow the structured format in `.opencode/templates/memory-entry-template.md`:
- Domain tag: `[AUTH]`, `[CODE]`, `[RISK]`, etc.
- Date tag: `[date: YYYY-MM-DD]`
- Agent tag: `[agent: @agent-name]`
- Status field: `active`, `resolved`, or `superseded`

Entries without this format will be rejected by `@memory-controller`.

### Progressive Context Loading

`@memory-controller` loads memory in three tiers to minimize token consumption:

| Tier | Content | Approx. tokens |
|------|---------|----------------|
| Tier 1 — Core | Project name, stack, phase, sprint, blocker count | ~200 |
| Tier 2 — Agent-specific | Files relevant to the agent's role | ~300 |
| Tier 3 — Task-specific | Chunks scoring ≥ 4 against task keywords | ~500 |
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

Compaction moves `resolved` and `stale` entries to `artifacts/memory/archive/YYYY-QN/` and updates the searchable `archive/index.json`. Entries tagged `[CRITICAL]` are never archived. Nothing is ever deleted.

### Archive Search

To retrieve historical context that has been compacted:

```
@memory-controller search [your query]
```

The controller scores archived entries against your query keywords and returns the top 5 matches with summaries and file locations.

*See [workflow.md](./workflow.md) for the full orchestration graph and handoff contracts.*
*See [GUARDRAILS.md](./GUARDRAILS.md) for the full guardrails specification.*
