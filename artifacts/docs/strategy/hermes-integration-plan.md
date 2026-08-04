# Vespyr → Hermes Integration: Improvement Plan

> **Goal:** Make all 21 vespyr agent personas and their workflows function as first-class Hermes Agent skills, with minimal friction and maximum role fidelity.
>
> **Status:** Draft — Phase 0 completed (agent count corrected, skill frontmatter updated)
> **Author:** Hermes Agent (on behalf of user)
> **Date:** 2026-06-26

---

## Current State Assessment

### What works today
- The **Hermes adaptation skill** (`~/.hermes/skills/software-development/vespyr/SKILL.md`) provides a high-level mapping of vespyr concepts to Hermes tools
- **Phase pipeline** (Validation → Exploration → Design → Development → Launch) is documented
- **Squad system** (7 curated team presets) is documented
- **Shared memory patterns** map to Hermes equivalents
- **Basic agent definitions** referenced in the skill

### Gaps to close

| Gap | Impact | Priority |
|-----|--------|----------|
| **No Hermes skill per agent** — 21 agent personas defined in AGENTS.md but none loadable via `skill_view()` | Each session must re-describe the agent role from scratch | P0 |
| **No invocation pattern** — Hermes lacks `@mention` for agents | Ambiguous how to call @founder vs @architect within Hermes | P0 |
| **@developer disabled** — Currently noted as "handled by Hermes agent directly" | No way to delegate coding to a constrained persona | P0 |
| **Memory controller not adapted** — Progressive loading tiers exist but no Hermes-side implementation | Memory drift between phases, no automatic compaction | P1 |
| **No permission enforcement** — Hermes tools have no role-based restrictions | Any agent can run any command, defeating role separation | P1 |
| **Single-model cost limit** — All tool calls use the same model | Can't route cheap I/O to cheap models | P2 |
| **Skills not ported** — 24 upstream skills exist but many lack Hermes implementations | Can't run `/validate-idea`, `/design`, etc. in Hermes | P1 |

---

## Phase 0: Foundation (DONE)

- [x] Correct agent count: 22+ → 21 specialized agents
- [x] Bump skill version: 1.3.0 → 1.4.0
- [x] Update stale roadmap references → npm v1.7.2
- [x] Expand skills list to match upstream catalog (added 6 new skills)
- [x] Fix agent references: SOUL personas, squad table, definitions

---

## Phase 1: Agent Persona → Hermes Skill Conversion

### 1.1 Directory Structure

```
~/.hermes/skills/vespyr/
├── SKILL.md                          # Master orchestrator skill (exists)
├── agents/
│   ├── founder/
│   │   └── SKILL.md                  # @founder (Elena) persona
│   ├── product-manager/
│   │   └── SKILL.md                  # @product-manager (Sarah) persona
│   ├── product-designer/
│   │   └── SKILL.md                  # @product-designer (Ivy) persona
│   ├── architect/
│   │   └── SKILL.md                  # @architect (Vera) persona
│   ├── tech-lead/
│   │   └── SKILL.md                  # @tech-lead (Grant) persona
│   ├── developer/
│   │   └── SKILL.md                  # @developer (Rex) persona
│   ├── code-reviewer/
│   │   └── SKILL.md                  # @code-reviewer (Scout) persona
│   ├── qa-engineer/
│   │   └── SKILL.md                  # @qa-engineer (Nina) persona
│   ├── researcher/
│   │   └── SKILL.md                  # @researcher (Iris) persona
│   ├── user-researcher/
│   │   └── SKILL.md                  # @user-researcher (Paige) persona
│   ├── ux-researcher/
│   │   └── SKILL.md                  # @ux-researcher (Zara) persona
│   ├── data-analyst/
│   │   └── SKILL.md                  # @data-analyst (Nova) persona
│   ├── security-engineer/
│   │   └── SKILL.md                  # @security-engineer (Victor) persona
│   ├── performance-engineer/
│   │   └── SKILL.md                  # @performance-engineer (Felix) persona
│   ├── ml-engineer/
│   │   └── SKILL.md                  # @ml-engineer (Kai) persona
│   ├── devops-engineer/
│   │   └── SKILL.md                  # @devops-engineer (Axel) persona
│   ├── technical-writer/
│   │   └── SKILL.md                  # @technical-writer (Clara) persona
│   └── io-agents/
│       ├── reader/
│       │   └── SKILL.md              # @reader (Page) — file queries
│       ├── writer/
│       │   └── SKILL.md              # @writer (Quill) — precise edits
│       ├── executor/
│       │   └── SKILL.md              # @executor (Max) — shell commands
│       └── memory-controller/
│           └── SKILL.md              # @memory-controller (Mnemos) — memory
└── skills/
    ├── validate-idea/
    │   └── SKILL.md                  # Workflow: validate idea
    ├── design/
    │   └── SKILL.md                  # Workflow: PRD + UI spec
    ├── develop/
    │   └── SKILL.md                  # Workflow: MVP development
    ├── launch/
    │   └── SKILL.md                  # Workflow: release readiness
    └── ... (remaining 20 skills)
```

### 1.2 Agent SKILL.md Template

Each agent persona becomes a Hermes skill with YAML frontmatter:

```yaml
---
name: vespyr/agents/founder
version: 1.0.0
description: "@founder (Elena) — Strategic concept stress-testing with GO/PIVOT/KILL verdict"
author: lalulali/vespyr → Hermes Agent adaptation
metadata:
  vespyr:
    category: core-swarm
    toolsets: [terminal, file, web]
    delegation_allowed: true
    max_delegate_depth: 2
---

# @founder (Elena)

> **Role:** Strategic concept stress-testing. Challenges assumptions, evaluates market viability, and delivers a GO/PIVOT/KILL verdict before any resources are committed.

## Persona

- Blunt, Socratic, evidence-driven
- Asks "why" 5 times before accepting any premise
- Takes a position on every question
- Separates fixable problems from fatal ones

## When to load

Load this agent when starting a new project, evaluating a pivot, or stress-testing an existing plan. Trigger: `skill_view(name='vespyr/agents/founder')`.

## Invocation in Hermes

```markdown
You are @founder (Elena). Follow the Vespyr Socratic rules, behavioral guidelines,
and your persona definition above. Your task: [describe the idea to validate]
```

## Workflow

1. Read the idea/concept from the user
2. Research market and competitors (tools: web_search)
3. Apply Socratic diagnostic questions
4. Produce verdict: GO, PIVOT, or KILL
5. Output `validation-brief.md` to `artifacts/output/01-discovery/`

## Outputs

- `artifacts/output/01-discovery/validation-brief.md`
- `artifacts/memory/active-decisions.md` (verdict entry)

## Tools this agent uses

| Tool | Purpose |
|------|---------|
| `web_search` | Market/competitor research |
| `read_file` | Read existing context |
| `write_file` | Write validation brief |
| `delegate_task` | Offload research to @researcher |

## Related agents

- `product-manager` — receives GO verdict for next phase
- `researcher` — delegated deep-dive research
```

### 1.3 Persona Content Source

Each agent's SKILL.md should be derived from the upstream `.agents/agents/<name>.md` file, preserving:
- The persona's **voice and tone** (Elena is blunt, Sarah is methodical, etc.)
- **Core responsibilities**
- **Tools and permissions** (mapped to Hermes tool equivalents)
- **Trigger conditions** (when to load this agent)
- **Output artifacts** (where results go)

The upstream `.agents/agents/` files live at the GitHub repo. For Hermes, they need to be:
1. Rendered as YAML-frontmatter SKILL.md files
2. Registered in the `vespyr` master skill's reference list
3. Loadable individually via `skill_view(name='vespyr/agents/founder')`

---

## Phase 2: Agent Invocation Patterns

### 2.1 Pattern A — Single Agent (direct)

When you know which agent you need:

```markdown
# Load the persona
skill_view(name='vespyr/agents/architect')

# Then execute with the persona active
"Design the system architecture for [project]. Follow @architect (Vera)'s persona."
```

### 2.2 Pattern B — Agent Delegation (subagent)

When a thinking agent needs to offload work:

```markdown
# Inside @architect's session:
delegate_task(
    goal="Research cloud cost options for AWS vs GCP",
    context="We need a cost comparison for a real-time data pipeline handling 10K events/sec",
    toolsets=["web", "terminal"],
    # The subagent implicitly inherits the persona context
)
```

### 2.3 Pattern C — Squad (parallel team)

For multi-agent workflows like `/develop`:

```bash
# The orchestrator spawns parallel agents via delegate_task:
delegate_task(tasks=[
    {"goal": "Implement auth service (Rex/@developer)", "toolsets": ["terminal", "file"]},
    {"goal": "Review auth service PR (Scout/@code-reviewer)", "toolsets": ["file"]},
    {"goal": "Test auth service (Nina/@qa-engineer)", "toolsets": ["terminal"]},
])
```

### 2.4 Pattern D — Phase Gate (sequential)

```markdown
# Semi-autonomous mode
Phase 1: skill_view(name='vespyr/agents/founder') → founder validates idea → user approves
Phase 2: skill_view(name='vespyr/skills/design') → PM + designer produce spec → user approves
Phase 3: delegate_task(build squad) → development + review + QA → user approves
```

### 2.5 Full Agent List Index

For the master SKILL.md, add an invocation reference table:

| Agent | `skill_view` name | When to load |
|-------|-------------------|-------------|
| @founder (Elena) | `vespyr/agents/founder` | Validating a new idea |
| @product-manager (Sarah) | `vespyr/agents/product-manager` | Writing PRDs and stories |
| @product-designer (Ivy) | `vespyr/agents/product-designer` | UI/UX specs |
| @architect (Vera) | `vespyr/agents/architect` | Architecture decisions |
| @tech-lead (Grant) | `vespyr/agents/tech-lead` | Execution planning |
| @developer (Rex) | `vespyr/agents/developer` | Implementation |
| @code-reviewer (Scout) | `vespyr/agents/code-reviewer` | Code review |
| @qa-engineer (Nina) | `vespyr/agents/qa-engineer` | Testing and validation |
| @researcher (Iris) | `vespyr/agents/researcher` | Market/competitor research |
| @user-researcher (Paige) | `vespyr/agents/user-researcher` | User research |
| @ux-researcher (Zara) | `vespyr/agents/ux-researcher` | Usability evaluation |
| @data-analyst (Nova) | `vespyr/agents/data-analyst` | Analytics and metrics |
| @security-engineer (Victor) | `vespyr/agents/security-engineer` | Security audit |
| @performance-engineer (Felix) | `vespyr/agents/performance-engineer` | Performance optimization |
| @ml-engineer (Kai) | `vespyr/agents/ml-engineer` | ML pipeline design |
| @devops-engineer (Axel) | `vespyr/agents/devops-engineer` | CI/CD and infrastructure |
| @technical-writer (Clara) | `vespyr/agents/technical-writer` | Documentation |
| @reader (Page) | `vespyr/agents/io-agents/reader` | File queries |
| @writer (Quill) | `vespyr/agents/io-agents/writer` | File edits |
| @executor (Max) | `vespyr/agents/io-agents/executor` | Shell commands |
| @memory-controller (Mnemos) | `vespyr/agents/io-agents/memory-controller` | Memory management |

---

## Phase 3: @developer Role Enablement

### 3.1 Problem

The @developer (Rex) is currently disabled in Hermes because:
- Vespyr expects the developer to have **constrained context** (no architecture decisions, no market research — just code)
- In Hermes, every tool call runs in the same session with full context
- There's no way to enforce "Rex can only write code and run tests"

### 3.2 Solution: Subagent Isolation

Use `delegate_task()` with restricted toolsets to create a constrained developer sandbox:

**Architect → Developer hand-off pattern:**

```markdown
# Architect produces a spec
write_file("artifacts/output/04-architecture/spec-auth.md", "## Auth Service Spec\n...")

# Architect delegates to @developer with ONLY the spec as context
delegate_task(
    goal="Implement the auth service per spec in artifacts/output/04-architecture/spec-auth.md",
    context="You are @developer (Rex). Implement ONLY what's in the spec. Do not add features, do not refactor adjacent code, do not change architecture decisions. Write tests first.",
    toolsets=["terminal", "file"]  # No web, no browser — pure code
)
```

### 3.3 Guard: Verification Layer

After the subagent completes, always verify before marking done:

```markdown
1. @developer completes → returns summary
2. Read the files to verify they exist and match spec
3. Run the tests to verify they pass
4. Only then report "development complete"
```

### 3.4 Why Not Inline Development?

In Hermes, the natural pattern is to just write code directly (you, the Hermes agent, are the developer). The @developer persona adds value when:
- The project is large enough that separating architecture from implementation reduces context
- You want **review gates** (developer → code-reviewer → QA)
- The persona constraints prevent over-engineering

---

## Phase 4: Memory Controller Adaptation

### 4.1 Current State

Vespyr's `@memory-controller` uses `memory_filter.js` to compress context from ~15K → ~1K tokens. Hermes has `memory()` for durable facts and `session_search()` for historical context, but no automatic filter/compression layer.

### 4.2 Proposed Architecture

```
┌──────────────────────────────────────────┐
│              Hermes Agent                │
│  (the current session context)           │
└──────────┬───────────────────────────────┘
           │ reads/writes
           ▼
┌──────────────────────────────────────────┐
│         Project Memory Layer             │
│  (artifacts/memory/*.md)                 │
│                                          │
│  • project-context.md  → Tier 1 (~200t) │
│  • active-decisions.md → Tier 2 (~300t)  │
│  • patterns-and-conventions.md → Tier 2  │
│  • lessons-learned.md  → Tier 3 (~500t)  │
│  • blockers-and-risks.md → Tier 3        │
└──────────┬───────────────────────────────┘
           │ provides context
           ▼
┌──────────────────────────────────────────┐
│     Hermes session_search + memory()     │
│  (durable cross-session persistence)     │
└──────────────────────────────────────────┘
```

### 4.3 Memory Loading Protocol

Implement as a skill (`vespyr/agents/io-agents/memory-controller`):

```markdown
When loaded, @memory-controller must:

1. Read artifacts/memory/project-context.md → extract:
   - Project name, stack, phase, sprint
   - User nickname
   - Current milestone

2. Read artifacts/memory/active-decisions.md → extract:
   - Last 5 decisions
   - Any unresolved decisions

3. Read artifacts/memory/lessons-learned.md → extract:
   - Last 3 lessons learned
   - Relevant patterns for current phase

4. Use memory() to load any Hermes-side durable facts

5. Compress to ~1,000 tokens for session context

Output format:
[VESPYR MEMORY — ~1,000 tokens]
Project: [name] | Phase: [phase] | Stack: [stack]
User: [nickname]

Active Decisions:
- [decision 1]
- [decision 2]

Lessons:
- [lesson 1]

Session Context (from memory()):
- [durable fact 1]
```

### 4.4 Session Hand-off Protocol

When transitioning between agents within the same phase:

```markdown
1. @memory-controller dumps current state to artifacts/memory/session-summaries/<phase>-<agent>.md
2. Next agent loads @memory-controller on entry
3. Controller returns compressed context plus the previous agent's summary
4. Cross-session: use session_search() to find relevant past sessions
```

---

## Phase 5: Permission & Role Separation (Hermes Constraints)

### 5.1 Honest Assessment

Hermes has no permission system. Unlike vespyr's upstream (which enforces `bash/deny`, `edit/deny` per agent role), in Hermes every agent has access to ALL tools. This cannot be changed at the skill level.

### 5.2 Mitigation Strategies

| Upstream Constraint | Hermes Mitigation |
|--------------------|-------------------|
| @reader: read-only | Self-discipline — document that @reader must NOT edit files. Use todo() checklist. |
| @writer: write-only | Self-discipline — document that @writer must NOT run commands or read outside scope. |
| @executor: bash only | Self-discipline — document that @executor must NOT edit files. |
| @founder: no code | Self-discipline — document that @founder must NOT implement. |
| @security-engineer: read-only audit | Self-discipline — no auto-fixing of vulnerabilities found. |

**Key rule for the Hermes adaptation:** Role constraints are **advisory with todo() enforcement**. Each agent's SKILL.md must include:

```yaml
metadata:
  vespyr:
    constraints:
      - "DO_NOT_EDIT_FILES"
      - "DO_NOT_RUN_COMMANDS"
      - "READ_ONLY"
```

And the agent workflow must start with:

```markdown
## Constraints

When acting as this agent:
- [ ] I will NOT modify any files (read-only)
- [ ] I will NOT run any shell commands
- [ ] I will document findings only
```

### 5.3 The @developer Exception

@developer (Rex) is the ONLY agent that should write code AND run commands. All other agents should use `delegate_task()` for any execution needs. This is enforced by convention, not by tool restrictions.

---

## Phase 6: Hermes Skill Porting for Workflows

### 6.1 Skill → Hermes Mapping

Each upstream skill needs a Hermes-side implementation. Framework:

```yaml
---
name: vespyr/skills/validate-idea
version: 1.0.0
description: "Stress-test a product idea before investing cycles — Socratic diagnostic"
---

# /validate-idea

## Prerequisites
1. Load @founder persona: `skill_view(name='vespyr/agents/founder')`
2. Load @researcher (optional): `skill_view(name='vespyr/agents/researcher')`

## Steps in Hermes

1. `skill_view(name='vespyr/agents/founder')` → adopt founder persona
2. Read the idea from user input
3. `web_search()` → market sizing, competitor landscape
4. Apply Socratic questions (from `references/validate-idea.md`)
5. Produce verdict document → `write_file(artifacts/output/01-discovery/validation-brief.md)`
6. Update memory → `artifacts/memory/active-decisions.md`

## Output
- `artifacts/output/01-discovery/validation-brief.md`
- Decision: GO (proceed to /explore-idea), PIVOT (revise and re-run), KILL (stop)
```

### 6.2 Skills Priority for Porting

| Priority | Skill | Effort | Reason |
|----------|-------|--------|--------|
| P0 | `validate-idea` | Low | Core gate — every project starts here |
| P0 | `develop` | Medium | Most-used workflow |
| P1 | `design` | Medium | PRD + spec creation |
| P1 | `review` | Low | Code review gate |
| P1 | `test` | Low | Test execution |
| P1 | `help-me` | Medium | Project navigator |
| P1 | `phase` | Low | Phase management |
| P2 | `explore-idea` | Low | Research workflow |
| P2 | `launch` | Medium | Release orchestration |
| P2 | `incident` | Medium | Incident response |
| P2 | `retro` | Low | Retrospective |
| P3 | Remaining 13 skills | Varies | Niche workflows |

---

## Phase 7: Cost Optimization

### 7.1 The Single-Model Problem

Hermes runs every tool call on the same model. Vespyr's key cost-saving architecture (routing @reader/@writer/@executor to cheap models) doesn't directly translate.

### 7.2 Strategy: Profile Switching

One practical approach: **separate config profiles for thinking vs doing**.

```yaml
# ~/.hermes/profiles/vespyr-thinking/config.yaml
provider: openrouter
model: claude-sonnet-4  # Expensive, good for reasoning

# ~/.hermes/profiles/vespyr-io/config.yaml  
provider: openrouter
model: deepseek-v4-flash  # Cheap, good for I/O tasks
```

Workflow: Thinking phase → load `vespyr-thinking` profile → produce spec → close session → IO phase → load `vespyr-io` profile → execute commands from spec.

However, this is clunky because profile switching is not seamless. A better medium-term solution:

### 7.3 Alternative: Delegation as Cost Lever

- Use `delegate_task()` for I/O-heavy tasks (runs in a subagent session)
- The subagent inherits the parent model, but the context is scoped to just the I/O task
- Result: fewer tokens per task even at the same model cost

### 7.4 Long-term: Multi-Model Delegation

If Hermes adds per-tool or per-delegation model selection in the future, map:

| Agent | Model Tier | Rationale |
|-------|------------|-----------|
| @founder | Best (Claude/GPT flagship) | Strategic reasoning |
| @architect | Best | Complex trade-offs |
| @developer | Mid-range | Code generation |
| @reader | Cheapest | Simple reads |
| @writer | Cheapest | Simple writes |
| @executor | Cheapest | Command output parsing |

---

## Phase 8: Implementation Roadmap

### Phase 1 — Agent Personas (estimated: 3-4 hours)
- [ ] Convert @founder → Hermes skill
- [ ] Convert @product-manager → Hermes skill
- [ ] Convert @architect → Hermes skill
- [ ] Convert @developer → Hermes skill
- [ ] Convert @code-reviewer → Hermes skill
- [ ] Convert @qa-engineer → Hermes skill
- [ ] Convert @technical-writer → Hermes skill
- [ ] Convert @memory-controller → Hermes skill
- [ ] Create io-agents batch (@reader, @writer, @executor)
- [ ] Update master SKILL.md with full invocation table

### Phase 2 — Workflow Skills (estimated: 2-3 hours)
- [ ] Port `validate-idea` → Hermes skill
- [ ] Port `develop` → Hermes skill
- [ ] Port `design` → Hermes skill
- [ ] Port `review` → Hermes skill
- [ ] Port `test` → Hermes skill
- [ ] Port `help-me` → Hermes skill

### Phase 3 — Memory & Integration (estimated: 1-2 hours)
- [ ] Implement memory loading protocol as a Hermes workflow
- [ ] Create session hand-off templates
- [ ] Add todo() enforcement constraints to each agent skill
- [ ] Test end-to-end: validate-idea → design → develop → review

### Phase 4 — Remaining Skills (estimated: 2-3 hours)
- [ ] Port explore-idea, launch, incident, retro
- [ ] Port humanize, status, phase, squad, memory
- [ ] Port code-graph, doc-graph, elicitation, kanban, round-table
- [ ] Port delegate, plan

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hermes context compaction breaks multi-phase workflows | Medium | High | Use `delegate_task()` per phase — subagents don't trigger compaction |
| Permission drift — agent acts outside role | High | Medium | todo() checklist + manual verification of subagent outputs |
| Skill count overloads skill_view query time | Low | Low | Agents load on-demand, not all at once |
| Upstream vespyr changes outpace Hermes skill updates | Medium | Medium | Add sync check to cron jobs; flag when upstream agent files change |
| `delegate_task()` subagent doesn't respect persona prompt | Medium | High | Pass full persona prompt in `context` parameter — subagents have no prior context |

---

## Appendix: Conversion Pipeline

To convert an upstream agent file to Hermes skill:

```bash
# 1. Fetch upstream agent file
curl -s https://raw.githubusercontent.com/lalulali/vespyr/main/.agents/agents/founder.md \
  > /tmp/vespyr-agent-founder.md

# 2. Parse frontmatter + persona body
# 3. Wrap in YAML frontmatter with hermes metadata
# 4. Add Hermes tool mappings
# 5. Add invocation patterns
# 6. Write to ~/.hermes/skills/vespyr/agents/founder/SKILL.md

# Result: skill_view(name='vespyr/agents/founder') loads the full persona
```

---

## Appendix: Quick Reference Card (Hermes)

| Action | Command |
|--------|---------|
| Load an agent | `skill_view(name='vespyr/agents/founder')` |
| Start a workflow | `skill_view(name='vespyr/skills/validate-idea')` |
| Delegate to subagent | `delegate_task(goal=..., context=..., toolsets=[...])` |
| Save memory | `memory(action='add', target='memory', content='...')` |
| Load memory | `session_search(query='relevant keywords')` |
| Switch phase | Load next phase's skill |
| Show status | Check `artifacts/output/` and `artifacts/memory/` |
