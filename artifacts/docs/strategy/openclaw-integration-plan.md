# Vespyr → OpenClaw Integration: Improvement Plan

> **Goal:** Make all 21 vespyr agent personas and their workflows function as first-class OpenClaw skills, leveraging OpenClaw's sandboxing, skill system, and sub-agent architecture.
>
> **Status:** Draft
> **Author:** Hermes Agent (on behalf of user)
> **Date:** 2026-06-26

---

## Current State Assessment

### What works
- Vespyr's `npx vespyr` installer **scaffolds `.openclaw/workspace/`** for OpenClaw harness
- It symlinks `.agents/` → `.openclaw/workspace/` so agent files are accessible
- The **AGENTS.md** engine document describes all 21 agents and their workflows
- OpenClaw's skill system (SKILL.md with YAML frontmatter) is structurally identical to Hermes

### Key Differences vs Hermes

| Aspect | Hermes | OpenClaw | Impact |
|--------|--------|----------|--------|
| Skill loading | `skill_view(name)` | `~/.openclaw/skills/<name>/SKILL.md` | Same concept, different path |
| Delegation | `delegate_task()` | Sub-agents doc | Similar concept, check API |
| Memory | `memory()` + `session_search()` | Memory wiki plugin, LanceDB | Different memory system |
| Permissions | None (self-discipline) | **Sandbox with per-tool allow/deny** | OpenClaw has proper role enforcement |
| Tool exec | `terminal()`, `read_file()`, etc. | `exec`, `apply_patch`, browser, etc. | Tool names differ |
| Sub-agents | `delegate_task()` | Sub-agents, ACP agents, `sessions_spawn` | More options in OpenClaw |
| Visual output | File attachments | Canvas / A2UI | Richer output in OpenClaw |
| Model routing | Single model per session | Multi-model possible via providers | More flexible routing |

---

## Phase 1: Agent Persona → OpenClaw Skills

### 1.1 Directory Structure

OpenClaw loads skills from workspace/project/personal/managed paths. For vespyr, use the **project agent skills** path (works with `npx vespyr` scaffold):

```
<workspace>/.agents/skills/          # Already scaffolded by npx vespyr
├── agents/
│   ├── founder/
│   │   └── SKILL.md                  # @founder (Elena)
│   ├── product-manager/
│   │   └── SKILL.md                  # @product-manager (Sarah)
│   ├── product-designer/
│   │   └── SKILL.md                  # @product-designer (Ivy)
│   ├── architect/
│   │   └── SKILL.md                  # @architect (Vera)
│   ├── tech-lead/
│   │   └── SKILL.md                  # @tech-lead (Grant)
│   ├── developer/
│   │   └── SKILL.md                  # @developer (Rex)
│   ├── code-reviewer/
│   │   └── SKILL.md                  # @code-reviewer (Scout)
│   ├── qa-engineer/
│   │   └── SKILL.md                  # @qa-engineer (Nina)
│   ├── researcher/
│   │   └── SKILL.md                  # @researcher (Iris)
│   ├── user-researcher/
│   │   └── SKILL.md                  # @user-researcher (Paige)
│   ├── ux-researcher/
│   │   └── SKILL.md                  # @ux-researcher (Zara)
│   ├── data-analyst/
│   │   └── SKILL.md                  # @data-analyst (Nova)
│   ├── security-engineer/
│   │   └── SKILL.md                  # @security-engineer (Victor)
│   ├── performance-engineer/
│   │   └── SKILL.md                  # @performance-engineer (Felix)
│   ├── ml-engineer/
│   │   └── SKILL.md                  # @ml-engineer (Kai)
│   ├── devops-engineer/
│   │   └── SKILL.md                  # @devops-engineer (Axel)
│   ├── technical-writer/
│   │   └── SKILL.md                  # @technical-writer (Clara)
│   └── io-agents/
│       ├── reader/SKILL.md           # @reader (Page)
│       ├── writer/SKILL.md           # @writer (Quill)
│       ├── executor/SKILL.md         # @executor (Max)
│       └── memory-controller/SKILL.md # @memory-controller (Mnemos)
└── workflows/
    ├── validate-idea/SKILL.md
    ├── design/SKILL.md
    ├── develop/SKILL.md
    └── ... (remaining skills)
```

**Note:** OpenClaw already loads `.agents/skills/` at priority 2 (project agent skills). The `npx vespyr` installer creates this directory. The work is converting each agent .md file into a valid SKILL.md with OpenClaw-compatible YAML frontmatter.

### 1.2 Agent SKILL.md Template (OpenClaw)

```yaml
---
name: vespyr/agents/founder
description: "@founder (Elena) — Strategic concept stress-testing with GO/PIVOT/KILL verdict"
version: "1.0.0"
author: lalulali/vespyr → OpenClaw adaptation
openclaw:
  toolsets:
    - web       # web_search for market research
    - read      # read_file for existing context
    - write     # write_file for validation brief
  capabilities:
    - goal      # can spawn goal-driven sub-agents
  sandbox:
    mode: main  # needs full access for research
---

# @founder (Elena)

> **Role:** Strategic concept stress-testing. Challenges assumptions, evaluates market viability,
> and delivers a GO/PIVOT/KILL verdict before any resources are committed.

## Persona

- Blunt, Socratic, evidence-driven
- Asks "why" 5 times before accepting any premise
- Takes a position on every question
- Separates fixable problems from fatal ones

## Invocation

This skill is auto-loaded when the agent detects a new idea validation request.
Or invoke directly in chat: "Run @founder on this idea: [describe]"

## Workflow

1. Read the idea from user input
2. Research market and competitors via web_search
3. Apply Socratic diagnostic questions per validate-idea reference
4. Produce verdict: GO, PIVOT, or KILL
5. Write `validation-brief.md` to `artifacts/output/01-discovery/`
6. Update `artifacts/memory/active-decisions.md`

## OpenClaw Tool Mapping

| Vespyr action | OpenClaw tool |
|---------------|--------------|
| Market research | `web_search()` |
| Read context | `read_file()` |
| Write output | `write_file()` |
| Deep research | `goal()` spawns sub-agent |
| Schedule follow-up | `cron` |

## Constraints

When acting as @founder:
- DO NOT write code or implement solutions
- DO NOT run build commands
- DO NOT modify project source files
- Output is strategic documents only
```

### 1.3 Key Advantage: OpenClaw Sandboxing

Unlike Hermes, OpenClaw can **enforce** these constraints at the tool level via `sandbox.mode`:

| Sandbox mode | Behavior | Best for |
|-------------|----------|----------|
| `main` | Full access, all tools | @developer, @devops-engineer |
| `non-main` | Restricted toolset per config | All other agents in production |
| Per-tool allow/deny | Fine-grained control | @code-reviewer (read-only), @writer (write-only) |

Example — @code-reviewer as read-only skill:

```yaml
openclaw:
  toolsets:
    - read      # can read files
    - apply_patch  # can suggest patches but not apply? configure below
  sandbox:
    deny: [exec, write, cron, browser, nodes]
    allow: [read, apply_patch, web_search]
```

This is a **major advantage** over Hermes where role constraints are purely advisory.

---

## Phase 2: Invocation Patterns

### 2.1 OpenClaw Skill Loading

OpenClaw auto-loads skills from priority-ordered directories. For vespyr:

```bash
# Skills are auto-discovered from:
~/.openclaw/skills/           # managed/local skills
<workspace>/.agents/skills/   # project agent skills (highest precedence)
```

No explicit skill_view() call needed — the agent discovers skills at load time. However,
to **activate** a specific persona mid-session, use OpenClaw's skill request pattern:

> "Load @architect persona and design the system architecture."

The agent reads the matching SKILL.md from the skills directory and adopts the persona.

### 2.2 Sub-Agent Delegation

OpenClaw supports sub-agents for parallel work:

```
@founder → goal("Research cloud cost comparison AWS vs GCP") spawns sub-agent
@architect → goal("Design database schema for auth service") spawns sub-agent
```

OpenClaw's `goal()` tool creates a goal-driven sub-agent that returns results asynchronously.
This maps well to vespyr's thinking/I/O separation:

| Vespyr Pattern | OpenClaw Implementation |
|---------------|------------------------|
| @founder delegates research to @researcher | `goal()` sub-agent with research context |
| @architect delegates implementation to @developer | `goal()` sub-agent with spec context |
| @developer delegates review to @code-reviewer | `goal()` sub-agent with code context |
| @reader, @writer, @executor I/O offload | Direct tool calls (no delegation needed) |

### 2.3 Squad Execution

Parallel squad mode using multi-agent routing:

```yaml
# openclaw config.yaml — route specific tasks to sub-agents
agents:
  defaults:
    sandbox:
      mode: non-main
      allow: [read, write, exec, web_search]
```

Orchestrate squads via sequential `goal()` calls:

```markdown
Phase 1: goal("Run @founder validation on this idea")
Phase 2: goal("Run @architect + @tech-lead to produce architecture spec")
Phase 3: goal("Run @developer to implement per spec")
Phase 4: goal("Run @qa-engineer to verify implementation")
```

---

## Phase 3: Memory Controller

### 3.1 OpenClaw Memory Options

OpenClaw has built-in memory via **Memory wiki plugin** and **LanceDB plugin**:

| Option | Persistence | Best for |
|--------|------------|----------|
| Memory wiki plugin | File-based markdown | Lightweight, human-readable |
| LanceDB plugin | Vector database | Semantic search across sessions |
| File I/O (direct) | `read_file`/`write_file` | Structured artifacts |

### 3.2 Recommended: File-Based Memory (Matches Vespyr)

Vespyr's memory protocol uses file-based `artifacts/memory/*.md`. This maps directly to OpenClaw's `read_file`/`write_file` tools:

```markdown
# Memory Loading Protocol (@memory-controller)

1. Read `artifacts/memory/project-context.md` → extract project name, stack, phase, user
2. Read `artifacts/memory/active-decisions.md` → extract last 5 decisions
3. Read `artifacts/memory/lessons-learned.md` → extract recent patterns
4. Compress to a lean session preamble

# Memory Writing Protocol

1. After any decision: append to `artifacts/memory/active-decisions.md`
2. After any discovery: append to `artifacts/memory/lessons-learned.md`
3. Phase end: compact archive to `artifacts/memory/archive/`
```

### 3.3 Optional: LanceDB for Semantic Search

For cross-session recall across large projects, enable the LanceDB plugin:

```yaml
# plugins.yaml
plugins:
  memory-lancedb:
    enabled: true
    path: artifacts/memory/lancedb
```

Then use `goal("Search memory for past auth service decisions")` to retrieve relevant context.

---

## Phase 4: Workflow Skills Porting Priority

| Priority | Skill | Why | Key OpenClaw Tools |
|----------|-------|-----|-------------------|
| P0 | `validate-idea` | Every project starts here | `web_search`, `read_file`, `write_file` |
| P0 | `develop` | Most-used workflow | `goal`, `exec`, `apply_patch`, `read_file` |
| P1 | `design` | PRD + spec creation | `read_file`, `write_file`, `canvas` (for visuals) |
| P1 | `review` | Code quality gate | `read_file`, `apply_patch`, `web_search` (for CVEs) |
| P1 | `test` | Test execution | `exec`, `read_file` |
| P1 | `help-me` | Project navigator | `read_file`, `exec` (check git status) |
| P1 | `phase` | Phase management | `read_file`, `write_file` |
| P2 | `explore-idea` | Market/competitor research | `web_search`, `write_file` |
| P2 | `launch` | Release readiness | `exec`, `cron`, `web_search` |
| P2 | `incident` | Incident response | `exec`, `read_file`, `goal` (parallel RCA) |
| P2 | `retro` | Retrospective | `read_file`, `sessions_history` |
| P3 | Remaining 13 skills | Niche workflows | Varies |

---

## Phase 5: Implementation Roadmap

### Phase 1 — Agent Persona Skills (2-3 hours)
- [ ] Convert @founder → `.agents/skills/agents/founder/SKILL.md`
- [ ] Convert @product-manager → `.agents/skills/agents/product-manager/SKILL.md`
- [ ] Convert @architect → `.agents/skills/agents/architect/SKILL.md`
- [ ] Convert @developer → `.agents/skills/agents/developer/SKILL.md`
- [ ] Convert all remaining 17 agents
- [ ] Add sandbox constraints per agent role

### Phase 2 — Workflow Skills (2-3 hours)
- [ ] Port `validate-idea` → `.agents/skills/workflows/validate-idea/SKILL.md`
- [ ] Port `develop` → `.agents/skills/workflows/develop/SKILL.md`
- [ ] Port `design` → `.agents/skills/workflows/design/SKILL.md`
- [ ] Port top 6 priority workflow skills

### Phase 3 — Memory & Integration (1 hour)
- [ ] Configure file-based memory protocol
- [ ] Test single-agent end-to-end flow
- [ ] Test multi-agent delegation via `goal()`

### Phase 4 — Polish (1-2 hours)
- [ ] Add Canvas/A2UI output for @product-designer specs
- [ ] Configure sandbox permissions for production use
- [ ] Add ClawHub publishing for community reuse

---

## Appendix: Conversion Pipeline

```bash
# 1. Fetch upstream agent file
curl -s https://raw.githubusercontent.com/lalulali/vespyr/main/.agents/agents/founder.md \
  > /tmp/vespyr-agent-founder.md

# 2. Parse persona body
# 3. Wrap in YAML frontmatter with openclaw metadata + sandbox config
# 4. Add OpenClaw tool mappings
# 5. Write to <workspace>/.agents/skills/agents/founder/SKILL.md

# Result: Auto-discovered by OpenClaw on next session
```

## Appendix: Quick Reference

| Action | Method |
|--------|--------|
| Agent auto-loads | Place SKILL.md in `.agents/skills/agents/<name>/` |
| Activate persona mid-session | "Load @architect persona" |
| Delegate work | `goal("Implement auth service per spec")` |
| Save memory | `write_file("artifacts/memory/active-decisions.md", "...")` |
| Load memory | `read_file("artifacts/memory/project-context.md")` |
| Enforce constraints | `sandbox.deny` / `sandbox.allow` in YAML frontmatter |
| Visual output | `canvas` tool for specs, diagrams, wireframes |
| Schedule phase gate | `cron` for recurring phase checks |
```

