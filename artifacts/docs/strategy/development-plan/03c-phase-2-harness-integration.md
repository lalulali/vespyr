# Harness Integration — Hermes + OpenClaw

> **Status:** Both deferred to v2.1+ (was Pre-Phase 0 in v2.0 — scope creep)
> **Priority:** OpenClaw FIRST (can enforce permissions), Hermes SECOND (degraded mode)
> **T8 requirement:** Both adapters must preserve the UTTERLY SATISFIED state contract and release gate; degraded mode is never implicit approval.

---

## OpenClaw — Better Fit (can enforce Vespyr's #1 differentiator)

**Honest assessment:** OpenClaw is the BETTER integration target because it can enforce the reasoning/I/O split via `sandbox.mode`. This preserves Vespyr's #1 moat (permission-denial). OpenClaw should be prioritized above Hermes.

### What works

- `sandbox.mode: main` — full access (for @developer, @devops-engineer)
- `sandbox.mode: non-main` — restricted toolset per config (all other agents)
- Per-tool `allow`/`deny` — fine-grained control (@code-reviewer read-only, @writer write-only)
- Auto-discovery from `<workspace>/.agents/skills/` (npx vespyr already scaffolds this)
- `goal()` sub-agent spawning maps to Vespyr's delegation pattern
- File-based memory (`read_file`/`write_file`) maps directly to `artifacts/memory/*.md`
- Optional LanceDB plugin for semantic search across sessions

### Directory structure

```
<workspace>/.agents/skills/
├── agents/
│   ├── founder/
│   │   └── SKILL.md
│   ├── product-manager/
│   │   └── SKILL.md
│   ├── ... (all 21 agents)
│   └── io-agents/
│       ├── reader/SKILL.md
│       ├── writer/SKILL.md
│       ├── executor/SKILL.md
│       └── memory-controller/SKILL.md
└── workflows/
    ├── validate-idea/SKILL.md
    ├── design/SKILL.md
    ├── develop/SKILL.md
    └── ... (remaining skills)
```

### Agent SKILL.md template (OpenClaw)

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
7. Return the T8 satisfaction state, evidence, unresolved blockers, and
   revalidation trigger before handing off to the next agent

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

### Sandbox mapping table

| Agent | sandbox.mode | deny | allow |
|---|---|---|---|
| @developer, @devops-engineer | main | (none) | (all) |
| @code-reviewer | non-main | exec, write, cron, browser | read, apply_patch, web_search |
| @reader | non-main | exec, write, cron | read |
| @writer | non-main | exec, cron, browser | read, write |
| @founder, @product-manager, etc. | non-main | exec, write | read, web_search |

Example — @code-reviewer as read-only skill:
```yaml
openclaw:
  toolsets:
    - read
    - apply_patch
  sandbox:
    deny: [exec, write, cron, browser, nodes]
    allow: [read, apply_patch, web_search]
```

### The no-dotfolder contradiction (MUST RESOLVE)

The master roadmap says OpenClaw has "no dotfolder prefix, root-level deployment." The OpenClaw integration plan says the installer scaffolds `.openclaw/workspace/`. **These contradict.** Resolution requires reading actual OpenClaw docs — the P0.2 deliverable that hasn't been done yet.

### Security review (MANDATORY before shipping)

The Hunt.io finding (17,470 publicly-exposed OpenClaw instances, 2024-era snapshot) must be verified as patched before integration ships.

- [ ] Verify Hunt.io finding is patched upstream (check OpenClaw changelog/security advisories)
- [ ] If unresolved: ship behind feature flag `VESPYR_OPENCLAW=off` by default
- [ ] Update `GUARDRAILS.md` upstream-artifact read policy to flag OpenClaw-sourced content
- [ ] Threat-model review: sandbox escape surface, root-level deployment risk

### Memory loading protocol

```markdown
# Memory Loading Protocol (@memory-controller)

1. Read artifacts/memory/project-context.md → extract project name, stack, phase, user
2. Read artifacts/memory/active-decisions.md → extract last 5 decisions
3. Read artifacts/memory/lessons-learned.md → extract recent patterns
4. Compress to ~1,000 tokens as session preamble

# Memory Writing Protocol

1. After any decision: append to artifacts/memory/active-decisions.md
2. After any discovery: append to artifacts/memory/lessons-learned.md
3. Phase end: compact archive to artifacts/memory/archive/
```

### Skill porting priority

| Priority | Skill | Why | Key OpenClaw Tools |
|---|---|---|---|
| P0 | `validate-idea` | Every project starts here | `web_search`, `read_file`, `write_file` |
| P0 | `develop` | Most-used workflow | `goal`, `exec`, `apply_patch`, `read_file` |
| P1 | `design` | PRD + spec creation | `read_file`, `write_file`, `canvas` |
| P1 | `review` | Code quality gate | `read_file`, `apply_patch`, `web_search` |
| P1 | `test` | Test execution | `exec`, `read_file` |
| P1 | `help-me` | Project navigator | `read_file`, `exec` |
| P1 | `phase` | Phase management | `read_file`, `write_file` |
| P2 | `explore-idea` | Market/competitor research | `web_search`, `write_file` |
| P2 | `launch` | Release readiness | `exec`, `cron`, `web_search` |
| P2 | `incident` | Incident response | `exec`, `read_file`, `goal` |
| P2 | `retro` | Retrospective | `read_file`, `sessions_history` |
| P3 | Remaining 13 skills | Niche workflows | Varies |

### Implementation roadmap

- [ ] Phase 1 — Agent Persona Skills (2-3h): Convert all 21 agents → `.agents/skills/agents/<name>/SKILL.md`, add sandbox constraints per role
- [ ] Phase 2 — Workflow Skills (2-3h): Port top 6 priority workflow skills
- [ ] Phase 3 — Memory & Integration (1h): Configure file-based memory protocol, test single-agent end-to-end, test multi-agent delegation via `goal()`
- [ ] Phase 4 — Polish (1-2h): Add Canvas/A2UI output for @product-designer specs, configure sandbox permissions for production use

### Conversion pipeline (supply chain fix)

The original plan used `curl` from GitHub `main` branch with no version pinning. This is a supply chain risk.

- [ ] Pin to tagged release: `curl https://raw.githubusercontent.com/lalulali/vespyr/v2.1.0/.agents/agents/founder.md`
- [ ] SHA-256 verification of downloaded files
- [ ] Or: ship agent files inside the OpenClaw skill package (no download needed)

---

## Hermes — Degraded Mode (cannot enforce permissions)

**Honest assessment (stated upfront, not buried):** Hermes has no permission system. The reasoning/I/O split — Vespyr's #1 differentiator — CANNOT be enforced. The cost-saving architecture (routing @reader/@writer/@executor to cheap models) also doesn't work (single-model per session, "profile switching" is clunky). Hermes users get personas + Socratic methodology + file-based memory only. **This is a degraded-mode integration.**

### What works

- Persona loading via `skill_view(name='vespyr/agents/founder')`
- Delegation via `delegate_task(goal=..., context=..., toolsets=[...])`
- File-based memory via `read_file`/`write_file` (maps to `artifacts/memory/*.md`)
- Squad system (documented, not enforced)
- Phase pipeline (documented in master SKILL.md)

### What does NOT work

| Vespyr feature | Hermes limitation | Impact |
|---|---|---|
| Permission-denial (reasoning/I/O split) | No permission system; all agents have all tools | #1 differentiator lost. "Mitigation" is self-discipline + todo() checklist — NOT enforcement. |
| Cost routing (@reader/@writer to cheap models) | Single model per session; profile switching is clunky | #2 cost-saving architecture lost. `delegate_task()` scopes context but doesn't change model. |
| @developer constrained context | No subagent isolation; every tool call runs in same session with full context | @developer persona adds value only when review gates are needed; otherwise inline is better. |

### Directory structure

```
~/.hermes/skills/vespyr/
├── SKILL.md                          # Master orchestrator skill
├── agents/
│   ├── founder/
│   │   └── SKILL.md
│   ├── ... (all 21 agents)
│   └── io-agents/
│       ├── reader/SKILL.md
│       ├── writer/SKILL.md
│       ├── executor/SKILL.md
│       └── memory-controller/SKILL.md
└── skills/
    ├── validate-idea/SKILL.md
    ├── design/SKILL.md
    ├── develop/SKILL.md
    └── ... (remaining skills)
```

### Agent SKILL.md template (Hermes)

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
    constraints:
      - "DO_NOT_EDIT_FILES"
      - "DO_NOT_RUN_COMMANDS"
      - "READ_ONLY"
---

# @founder (Elena)

## Persona
- Blunt, Socratic, evidence-driven
- Asks "why" 5 times before accepting any premise

## When to load
Trigger: skill_view(name='vespyr/agents/founder')

## Invocation in Hermes
You are @founder (Elena). Follow the Vespyr Socratic rules, behavioral guidelines,
and your persona definition above. Your task: [describe the idea to validate]

## Constraints
When acting as this agent:
- [ ] I will NOT modify any files (read-only)
- [ ] I will NOT run any shell commands
- [ ] I will document findings only
```

### Invocation patterns

**Pattern A — Single Agent (direct):**
```markdown
skill_view(name='vespyr/agents/architect')
"Design the system architecture for [project]. Follow @architect (Vera)'s persona."
```

**Pattern B — Agent Delegation (subagent):**
```markdown
delegate_task(
    goal="Research cloud cost options for AWS vs GCP",
    context="We need a cost comparison for a real-time data pipeline",
    toolsets=["web", "terminal"],
)
```

**Pattern C — Squad (parallel team):**
```markdown
delegate_task(tasks=[
    {"goal": "Implement auth service (Rex/@developer)", "toolsets": ["terminal", "file"]},
    {"goal": "Review auth service PR (Scout/@code-reviewer)", "toolsets": ["file"]},
    {"goal": "Test auth service (Nina/@qa-engineer)", "toolsets": ["terminal"]},
])
```

**Pattern D — Phase Gate (sequential):**
```markdown
Phase 1: skill_view(name='vespyr/agents/founder') → founder validates idea → user approves
Phase 2: skill_view(name='vespyr/skills/design') → PM + designer produce spec → user approves
Phase 3: delegate_task(build squad) → development + review + QA → user approves
```

### @developer subagent isolation

The @developer is the ONLY agent that should write code AND run commands. Use `delegate_task()` with restricted toolsets:

```markdown
# Architect delegates to @developer with ONLY the spec as context
delegate_task(
    goal="Implement the auth service per spec in artifacts/output/04-architecture/spec-auth.md",
    context="You are @developer (Rex). Implement ONLY what's in the spec. Do not add features.",
    toolsets=["terminal", "file"]  # No web, no browser — pure code
)
```

### Permission mitigation table (degraded mode — these are NOT solutions)

| Upstream Constraint | Hermes "Mitigation" |
|---|---|
| @reader: read-only | Self-discipline — document that @reader must NOT edit files. Use todo() checklist. |
| @writer: write-only | Self-discipline — document that @writer must NOT run commands or read outside scope. |
| @executor: bash only | Self-discipline — document that @executor must NOT edit files. |
| @founder: no code | Self-discipline — document that @founder must NOT implement. |
| @security-engineer: read-only audit | Self-discipline — no auto-fixing of vulnerabilities found. |

**These are advisory with todo() enforcement, NOT real enforcement.** Each agent's SKILL.md includes constraint declarations in frontmatter, but the harness cannot enforce them.

### Memory loading protocol

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

When loaded, @memory-controller must:
1. Read `artifacts/memory/project-context.md` → extract project name, stack, phase, user
2. Read `artifacts/memory/active-decisions.md` → extract last 5 decisions
3. Read `artifacts/memory/lessons-learned.md` → extract last 3 lessons
4. Use `memory()` for Hermes-side durable facts
5. Compress to ~1,000 tokens

### Skill porting priority

| Priority | Skill | Effort | Reason |
|---|---|---|---|
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

### Cost optimization

**The single-model problem:** Hermes runs every tool call on the same model. Vespyr's cost-saving architecture (routing @reader/@writer/@executor to cheap models) doesn't directly translate.

**Strategy 1 — Profile switching (clunky):**
```yaml
# ~/.hermes/profiles/vespyr-thinking/config.yaml
provider: openrouter
model: claude-sonnet-4  # Expensive, good for reasoning

# ~/.hermes/profiles/vespyr-io/config.yaml
provider: openrouter
model: deepseek-v4-flash  # Cheap, good for I/O tasks
```
Workflow: Thinking phase → load `vespyr-thinking` profile → produce spec → close session → IO phase → load `vespyr-io` profile. Clunky because profile switching is not seamless.

**Strategy 2 — Delegation as cost lever:**
Use `delegate_task()` for I/O-heavy tasks. The subagent inherits the parent model, but context is scoped to just the I/O task. Result: fewer tokens per task even at the same model cost.

**Long-term — Multi-model delegation:**
If Hermes adds per-tool model selection, map:
| Agent | Model Tier | Rationale |
|---|---|---|
| @founder | Best (Claude/GPT flagship) | Strategic reasoning |
| @architect | Best | Complex trade-offs |
| @developer | Mid-range | Code generation |
| @reader | Cheapest | Simple reads |
| @writer | Cheapest | Simple writes |
| @executor | Cheapest | Command output parsing |

### Implementation roadmap

- [ ] Phase 1 — Agent Personas (3-4h): Convert all 21 agents → Hermes skills, update master SKILL.md
- [ ] Phase 2 — Workflow Skills (2-3h): Port top 6 priority skills
- [ ] Phase 3 — Memory & Integration (1-2h): Implement memory loading protocol, session hand-off templates, todo() enforcement constraints
- [ ] Phase 4 — Remaining Skills (2-3h): Port explore-idea, launch, incident, retro, humanize, status, phase, squad, memory, code-graph, doc-graph, elicitation, kanban, round-table, delegate, plan

### Conversion pipeline (same supply chain fix as OpenClaw)

- [ ] Pin to tagged release, not `main` branch
- [ ] SHA-256 verification

---

## Both harnesses: shared deliverables

- [ ] Per-harness adapter in `bin/install.js` (writes correct hook config per harness) — v2.1 Phase 2 F2.3
- [ ] Smoke-test plan: "does this install work?" check for each harness
- [ ] Document harness-specific limitations in `QUICK-REFERENCE.md` (a "Known Limitations" section per harness)
- [ ] Port `.agents/references/utter-satisfaction.md` and its state vocabulary
  unchanged; harness-specific prompts may compress wording but may not weaken
  the collaboration loop or release gate
- [ ] Verify M1/M2/M3/M4 behavior: a missing, blocked, stale, or evidence-free
  satisfaction record is never treated as approval
- [ ] Add launch smoke test: all active roles satisfied -> GO; one active role
  blocked -> NO-GO; inactive role without a reason -> NO-GO

---

## Why OpenClaw is prioritized above Hermes

| Criterion | OpenClaw | Hermes |
|---|---|---|
| Can enforce permission-denial (the #1 moat) | **Yes** (sandbox.mode) | No |
| Can route I/O to cheap models | **Yes** (per-delegation model selection) | No (single model) |
| Can constrain @developer context | **Yes** (sub-agent isolation) | Partial (delegate_task scopes context) |
| Security posture | Needs review (Hunt.io finding) | No known issues |
| Deployment model | No-dotfolder (needs design work) | Standard dotfolder |
| Community size | Unknown | Loyal niche |

**Decision:** OpenClaw investigation first (v2.1 Phase 2). Hermes investigation second (v2.1+ if time permits). If only one ships in v2.1, it's OpenClaw.

---

## Completion Checklist

**03c status: PLANNED (v2.1 Scope — Not Started).**

- [ ] OpenClaw integration and sandbox permission isolation
- [ ] Hermes Agent port (SKILL.md format and delegation adapters)
- [ ] Multi-harness installer integration (`bin/install.js`)
- [ ] Cross-harness UTTERLY SATISFIED state preservation

---

## Sign-Off

**@architect (Vera):** PENDING — External harness integration architecture review.  
**@tech-lead (Grant):** PENDING — Execution scheduled for v2.1.  
**@qa-engineer (Nina):** PENDING — Cross-harness smoke testing suite.


---

## Deferred Shape Research Intake (2026-08-24)

Owner scoping decision: **Cursor and Windsurf move into this plan** for proper per-harness research before any reimplementation. Effective immediately in the v2.0.7 CLI:

- Both shapes are **no longer installable** — adapters stripped to `legacyCleanupOnly` (detect + surgical uninstall only), so pre-existing installs remain cleanable.
- Their previous emitters (`transpileCursorMDC`, `transpileCopilotYAML`) were **cut** per 02m C2=B (stale formats; no remaining consumers).
- Recoverable reference implementations: git history, commit prior to this change (bin/lib/harnesses/cursor.js, windsurf.js install methods).

**Intake checklist for each shape before it may re-enter the installer:** mechanism research against current vendor docs (emitter vs native-read vs config-file), functional smoke matrix, autocomplete/picker visibility caveat check (cf. Copilot field evidence 2026-08-24), uninstall semantics.
