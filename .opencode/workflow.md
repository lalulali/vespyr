---
description: Defines agent execution order, handoff contracts, and conflict resolution
version: "3.0"
last_updated: 2026-05-16
---

# Workflow Orchestration

This document defines the **agent execution graph**, handoff contracts between agents, and escalation paths for conflicts. It is the single source of truth for how agents collaborate.

---

## 1. Execution Graph

Agents execute in dependency order. An agent cannot start until its upstream agents have completed and produced the expected artifacts.

```
PHASE -1: VALIDATION
  ├── Product track (idea-validation skill)
  │     └── @founder — Socratic diagnostic: stress-test the idea before investing research cycles
  │           │         Adapts by context: startup | company | personal
  │           │         Adapts by maturity: greenfield | brownfield
  │           │         Produces: artifacts/output/00-discovery/validation-brief.md
  │           │
  │           ├── GO ──────────▼
  │           │          PHASE 0: DISCOVERY (product-exploration skill)
  │           │            └── @founder — synthesizes validated concept (or uses validation brief directly)
  │           │                  │         produces: artifacts/output/00-discovery/idea-brief.md (only if no validation brief)
  │           │                  ▼
  │           ├── PIVOT ──▶ Re-run Phase -1 with revised framing
  │           │
  │           └── KILL ──▶ Stop. Brief documents why. Save research cycles.
  │
  └── Game track (game-idea-validation skill)
        └── @founder — Socratic diagnostic: stress-test the game concept before investing production cycles
              │         Adapts by context: startup | company | personal
              │         Adapts by maturity: greenfield | brownfield
              │         Produces: artifacts/output/00-discovery/validation-brief.md
              │
              ├── GO ──────────▼
              │          PHASE 0: DISCOVERY (game-product-exploration skill)
              │            └── @founder — synthesizes validated concept (or uses validation brief directly)
              │                  │         produces: artifacts/output/00-discovery/idea-brief.md (only if no validation brief)
              │                  ▼
              ├── PIVOT ──▶ Re-run Phase -1 with revised framing
              │
              └── KILL ──▶ Stop. Brief documents why. Save production cycles.
```

---

## 1.5. Agent Operation Modes

Set the operation mode in `artifacts/memory/project-context.md`. Default is **semi-autonomous**.

| Mode | Human involvement | Best for |
|------|------------------|----------|
| **Autonomous** | None — agents run end-to-end without pausing | Low-risk tasks, well-understood patterns, iteration cycles, CI/CD pipelines |
| **Semi-autonomous** | Pauses at critical decision points only | Most work — balances speed with safety |
| **Manual** | Human collaborates at every step | High-risk decisions, unfamiliar domains, learning how agents work |

### Per-phase behavior

| Phase | Autonomous | Semi-autonomous | Manual |
|-------|-----------|----------------|--------|
| **-1: Validation** | Auto-generate validation brief from context. Auto-decide GO/PIVOT/KILL based on available evidence. | Run diagnostic questions interactively. **Pause for GO/PIVOT/KILL verdict.** | Full Socratic session. Every question interactive. Human confirms each answer before next. |
| **0: Discovery** | @founder auto-synthesizes, no review. | @founder synthesizes. **Pause for human review of idea brief before research.** | @founder drafts, human refines iteratively. |
| **1: Research** | All research agents run in parallel, auto-complete. | Research runs autonomously. Human reviews at Phase 1→2 gate. | Human reviews each research output before the next agent starts. |
| **2: Strategy** | Auto-generate PRD, specs, user stories. | Auto-generate. **Pause for human approval of PRD and product spec.** | Human co-writes requirements and specs with agents. |
| **3: Architecture** | Auto-generate ADRs. | **Pause for human approval of architecture decisions.** | Human collaborates on every ADR. |
| **4: Planning** | Auto-generate execution plan and project plan. | Auto-generate. Human reviews before execution. | Human co-writes plans with agents. |
| **5: Execution** | Write code, auto-commit per task. | Write code autonomously. **Pause before destructive operations** (delete, migrate, refactor >100 lines). | Human reviews each task output before next task. |
| **5.5: Design Validation** | Auto-run usability review. | Auto-run. **Pause if critical usability issues found.** | Human participates in usability review. |
| **6: Quality Gates** | Auto-run all checks. Auto-fix low/medium issues. | Auto-run checks. **Pause on critical/high severity findings.** | Human reviews each quality report. |
| **7: Launch** | **NEVER auto-deploy.** Always pauses for GO/NO-GO. | **Pause for human GO/NO-GO on deployment.** | Human drives launch sequence. |
| **8: Iteration** | Auto-prioritize and implement improvements. | Auto-implement. **Pause for prioritization review.** | Human reviews each iteration proposal. |
| **9: Retrospective** | Auto-generate retrospective report. | Auto-generate. **Pause for human review of action items.** | Human leads retrospective with agent support. |
| **Incident Response** | Auto-mitigate (rollback, scale). **Pause before data-affecting fixes.** | **Pause for human triage decision.** Auto-mitigate after approval. | Human directs every remediation step. |

### Safety overrides (apply regardless of mode)

These actions **always require human approval**, even in autonomous mode:

1. **Deployment to production** — Phase 7 GO/NO-GO is never autonomous
2. **Data deletion or migration** — any operation that destroys or moves user data
3. **Security-critical changes** — auth flows, encryption, API key handling
4. **External API integrations** — connecting to third-party services
5. **Cost-incurring operations** — cloud resource provisioning, paid API calls
6. **Irreversible architectural decisions** — database schema changes, breaking API changes

### How agents read the mode

Agents check the mode from `artifacts/memory/project-context.md`. The mode supports **per-phase overrides** — you can set a default and override specific phases.

```markdown
## Operation Mode
Default: semi-autonomous

### Phase Overrides
- Validation: manual
- Exploration: semi-autonomous
- Design: semi-autonomous
- Development: autonomous
- Quality: semi-autonomous
- Launch: manual
```

**Resolution order:** Phase override → Default. If no override is set for a phase, the default applies.

### Changing mode

Two ways to change the mode. Both work at any time, including mid-workflow.

**Method 1: Chat (primary)** — Just say it in natural language. No exact syntax required. Agents must recognize the intent from any of these patterns:

| What you say | What happens |
|---|---|
| "switch to manual" / "go manual" / "I want to drive" | Current phase → manual |
| "let the agents handle it" / "go autonomous" / "run it yourself" | Current phase → autonomous |
| "make development autonomous" / "dev phase should be autonomous" | Development override → autonomous |
| "I want manual validation but autonomous development" | Sets both overrides |
| "back to semi-auto" / "default mode" | Resets current phase to semi-autonomous |

**Method 2: Edit file directly** — Edit `artifacts/memory/project-context.md` and change the mode/overrides. Agents read this file at the start of each phase.

When the mode changes:
1. Agent updates `artifacts/memory/project-context.md` (if changed via chat)
2. Apply immediately — the current step uses the new mode
3. Log the change to `artifacts/memory/decisions.md`: `"[timestamp] Mode changed: [phase] [old] → [new] (user request)"`

### Decision point behavior

When an agent hits a decision point:
- **Autonomous:** Log the decision to `artifacts/memory/decisions.md` and proceed.
- **Semi-autonomous:** Check if this decision point is marked **bold** in the per-phase table above. If yes, pause and present the decision with options. If no, log and proceed.
- **Manual:** Always pause, present current state, and wait for human direction.

---

## 1.6. Multi-Developer Execution

When the execution plan has **2+ independent tasks**, multiple developer agents can work in parallel. Each developer gets its own git worktree to avoid file conflicts.

### When to use multiple developers

| Condition | Mode |
|---|---|
| 1 task, or all tasks have dependencies | **Single developer** — standard sequential execution |
| 2+ independent tasks, project uses git | **Multi-developer with worktrees** — parallel execution |
| 2+ independent tasks, no git | **Multi-developer without worktrees** — parallel on separate files only, coordinate via shared memory |

The `@tech-lead` decides the number of parallel developers during execution planning (Step 3b) based on:
- How many tasks are truly independent (no shared file edits)
- Project complexity — more developers = more merge work
- Recommended: **2-3 developers** max for most projects. More adds coordination overhead.

### Worktree setup protocol

Before developers start, `@tech-lead` sets up the worktrees:

```bash
# 1. Check if git worktrees are supported
git worktree list 2>/dev/null && echo "WORKTREE_SUPPORTED" || echo "WORKTREE_NOT_SUPPORTED"

# 2. Create worktrees for each developer (from the main working branch)
BRANCH=$(git branch --show-current)
git worktree add ~/.local/share/opencode/worktree/worktree-dev-1 -b feat/${BRANCH}/task-1
git worktree add ~/.local/share/opencode/worktree/worktree-dev-2 -b feat/${BRANCH}/task-2
# ... one per developer

# 3. List active worktrees
git worktree list
```

**Worktree location:** `~/.local/share/opencode/worktree/worktree-dev-N` — isolates worktrees within the allowed sandboxed path.
**Branch naming:** `feat/{base-branch}/task-{N}` — tracks which base branch and task.

### Task assignment

`@tech-lead` assigns tasks to developers via the execution plan:

```markdown
## Task Assignment

| Developer | Worktree | Branch | Tasks | Files touched |
|---|---|---|---|---|
| @developer-1 | ~/.local/share/opencode/worktree/worktree-dev-1 | feat/main/task-1 | Auth flow, login page | src/auth/*, src/pages/login.* |
| @developer-2 | ~/.local/share/opencode/worktree/worktree-dev-2 | feat/main/task-2 | Dashboard API, charts | src/api/dashboard.*, src/components/chart.* |
| @developer-3 | ~/.local/share/opencode/worktree/worktree-dev-3 | feat/main/task-3 | Notification system | src/notifications/*, src/services/notify.* |
```

**Critical rule:** Tasks assigned to different developers must NOT touch the same files. If two tasks need to edit the same file, they must be sequential (same developer) or the shared file must be edited by one developer first, then merged before the other starts.

### Developer workflow (per developer)

Each developer agent operates in its assigned worktree:

1. **Navigate to worktree** — all file operations happen in the worktree directory
2. **Read shared artifacts** — execution plan, ADRs, specs are in the main repo (read-only from worktree)
3. **Implement task** — write code, tests, run lints in the worktree
4. **Commit to feature branch** — commit to the worktree's branch
5. **Signal completion** — update `artifacts/memory/agent-notes/developer-notes.md` in the main repo with status

### Merge protocol

After all developers complete their tasks, `@tech-lead` merges:

```bash
# 1. Switch to main working branch
git checkout $BRANCH

# 2. Merge each developer's work (in dependency order if applicable)
git merge feat/${BRANCH}/task-1 --no-ff -m "feat: auth flow and login page"
git merge feat/${BRANCH}/task-2 --no-ff -m "feat: dashboard API and charts"
git merge feat/${BRANCH}/task-3 --no-ff -m "feat: notification system"

# 3. Run full test suite after all merges
npm test  # or equivalent

# 4. Clean up worktrees
git worktree remove ~/.local/share/opencode/worktree/worktree-dev-1
git worktree remove ~/.local/share/opencode/worktree/worktree-dev-2
git worktree remove ~/.local/share/opencode/worktree/worktree-dev-3

# 5. Clean up branches
git branch -d feat/${BRANCH}/task-1 feat/${BRANCH}/task-2 feat/${BRANCH}/task-3
```

### Conflict resolution

| Scenario | Action |
|---|---|
| **Merge conflict on test/config files** | `@tech-lead` resolves manually — these are usually additive |
| **Merge conflict on source files** | Indicates task assignment overlap — `@tech-lead` resolves and logs to `developer-notes.md` for future planning |
| **Test failures after merge** | `@tech-lead` identifies which developer's changes caused the failure, assigns fix to that developer |
| **Architectural conflict** | Escalate to `@architect` — the ADRs may need updating |

### Fallback: no worktree support

If the project doesn't use git or worktrees aren't supported:
- Developers work in the **same directory** but on **non-overlapping files**
- `@tech-lead` must ensure strict file-level separation in task assignment
- Each developer creates a conventional branch (`git checkout -b feat/task-N`) and switches between them
- Higher risk of conflicts — prefer 2 developers max in this mode

### Shared memory for multi-developer

All developers read/write to the same shared memory files in the main repo:
- `artifacts/memory/agent-notes/developer-notes.md` — shared log of progress, blockers, and discoveries
- `artifacts/memory/blockers-and-risks.md` — if one developer discovers a blocker that affects another's task

When writing to shared memory, prefix entries with the developer ID:
```markdown
### [dev-1] 2026-05-18
- Completed auth flow. Note: the session store uses Redis, not the in-memory default.
- Blocker: API rate limit on external auth provider needs config.

### [dev-2] 2026-05-18  
- Dashboard API done. Used the same Redis connection pool from dev-1's auth work.
```

---

## 2. Handoff Contracts

Each handoff specifies what the upstream agent MUST produce before the downstream agent can begin.

### Validation → Discovery

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @founder (idea-validation) | @founder (product-exploration) | `artifacts/output/00-discovery/validation-brief.md` | Must contain GO verdict, value proposition, target user, narrowest wedge, agreed premises, and open questions for exploration |
| @founder (game-idea-validation) | @founder (game-product-exploration) | `artifacts/output/00-discovery/validation-brief.md` | Must contain GO verdict, value proposition, target player, core fun loop, agreed premises, and open questions for exploration |

**Note:** If the validation brief exists with a GO verdict, Phase 0 (Discovery) can be skipped — the validation brief directly feeds into Phase 1 (Research). Research agents focus on the "Open questions for exploration" section.

### Discovery → Research

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @founder | @market-researcher | `validation-brief.md` OR `idea-brief.md` | Must contain target user, value proposition, key assumptions, and recommended next step |
| @founder | @user-researcher | `validation-brief.md` OR `idea-brief.md` | Must contain primary user definition and assumptions to validate |
| @founder | @competitor-analyzer | `validation-brief.md` OR `idea-brief.md`, `artifacts/output/01-research/market-analysis.md` | Must contain concept and market context |
| @founder | @ux-researcher | `validation-brief.md` OR `idea-brief.md` | Must contain target user profile and key user-facing features |

### Research → Strategy

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @market-researcher | @product-manager | `artifacts/output/01-research/market-analysis.md` | Must contain GO/NO-GO verdict |
| @competitor-analyzer | @product-manager | `artifacts/output/01-research/competitive-analysis.md` | Must contain feature matrix and strategic recommendations |
| @user-researcher | @product-manager | `artifacts/output/01-research/user-personas.md` | Must contain primary persona and prioritized needs |
| @user-researcher | @ux-researcher | `artifacts/output/01-research/user-personas.md` | Must contain persona details for usability test participant selection |

### Strategy → Architecture

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @product-manager | @product-designer | `artifacts/output/02-strategy/requirements.md`, `artifacts/output/02-strategy/user-stories.md` | Must pass cross-validation checklist (every feature has ≥1 story, every story traces to a feature) |
| @product-manager | @architect | `artifacts/output/02-strategy/requirements.md`, `artifacts/output/02-strategy/user-stories.md` | Must contain business goals with measurable targets |
| @product-designer | @architect | `artifacts/output/02-strategy/product-spec.md` | Must contain defined flows, screens, and technical constraints |
| @product-designer | @ux-researcher | `artifacts/output/02-strategy/product-spec.md` | Must contain complete flows with all states defined; ready for usability validation |
| @product-designer | @developer | `artifacts/output/02-strategy/product-spec.md` (validated by @ux-researcher if applicable) | UI is usability-tested or @product-designer has documented rationale for skipping |
| @ux-researcher | @product-designer | `artifacts/output/01-research/ux-research-report.md` | Must contain severity-rated findings; critical issues resolved before dev handoff |

### Architecture → Planning

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @architect | @tech-lead | `artifacts/output/03-architecture/` (ADRs) | Must contain data model, API contracts, and tech stack decision |
| @architect | @project-manager | `artifacts/output/03-architecture/` (ADRs) | Must contain risk register and architectural complexity assessment |
| @tech-lead | @project-manager | `artifacts/output/04-planning/execution-plan.md` | Must contain task breakdown, effort estimates, and dependency map |
| @project-manager | @project-manager | `artifacts/output/05-project-management/kanban.md` | Must be initialized with all user stories placed in correct columns |
| @product-manager | @project-manager | `artifacts/output/02-strategy/requirements.md` | Must contain priorities and business deadlines |

### Planning → Execution

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @tech-lead | @developer | `artifacts/output/04-planning/execution-plan.md`, `artifacts/output/03-architecture/`, `artifacts/output/02-strategy/product-spec.md`, `artifacts/output/02-strategy/user-stories.md` | Must contain task breakdown with DoD, dependencies, and acceptance criteria mapping |
| @tech-lead | @developer | `artifacts/output/01-research/ux-research-report.md` (if available) | @developer must be aware of validated interaction patterns |
| @tech-lead | @data-analyst | `artifacts/output/04-planning/execution-plan.md`, `artifacts/output/02-strategy/requirements.md` | Must contain success metrics from business goals |
| @tech-lead | @ml-engineer | `artifacts/output/04-planning/execution-plan.md`, `artifacts/output/03-architecture/` | Must contain ML-specific tasks and data requirements |
| @project-manager | @devops-engineer | `artifacts/output/05-project-management/project-plan.md` | Must contain release milestones and deployment windows |

### Execution → Quality Gates

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @developer | @code-reviewer | Implemented code + PR | Must pass linting and type-checking |
| @code-reviewer | @qa-engineer | Approved PR (zero blocking issues) | Code is stable enough for QA validation |
| @architect | @security-engineer | `artifacts/output/03-architecture/` | Must define security boundaries and trust zones |
| @developer | @security-engineer | Feature implementation | Must be feature-complete for meaningful audit |

### Quality Gates → Launch

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @qa-engineer | @project-manager | QA sign-off report | All acceptance criteria met; known issues documented |
| @code-reviewer | @project-manager | Code review summary | No blocking issues; non-blocking issues documented |
| @security-engineer | @project-manager | Security audit report | No critical/high findings; medium/low findings documented |
| @performance-engineer | @project-manager | Performance report | All SLAs met or exceptions documented |
| @project-manager | @devops-engineer | `artifacts/output/06-launch/go-nogo-decision.md` | All release readiness criteria met; go/no-go decided |

### Launch → Iteration

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @devops-engineer | @data-analyst | Deployment confirmation + monitoring URLs | Production is live and healthy |
| @project-manager | @product-manager | `artifacts/output/06-launch/post-launch-report.md` | Launch completed; initial metrics collected |

### Iteration → Retrospective

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @data-analyst | @project-manager | `artifacts/output/07-iteration/iteration-results.md` | Measured impact of iteration changes |
| @tech-lead | @project-manager | Execution metrics (estimate vs actual) | Velocity and estimation data per task |
| @project-manager | All | `artifacts/output/09-retro/action-items.md` | Actionable improvements with owners and deadlines |

### Incident → Remediation

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @project-manager | @devops-engineer | `artifacts/output/08-incidents/INC-NNN/triage.md` | Severity, timeline, assigned responders |
| @devops-engineer | @project-manager | `artifacts/output/08-incidents/INC-NNN/mitigation.md` | Mitigation applied, current status |
| @architect | @developer | `artifacts/output/08-incidents/INC-NNN/rca.md` | Root cause identified, fix direction clear |
| @developer | @project-manager | `artifacts/output/08-incidents/INC-NNN/remediation.md` | Fix implemented, tests added |

---

## 3. Conflict Resolution

When agents produce contradictory outputs, the following escalation path applies:

### 3.1 Conflict Types

| Conflict | Resolution |
|----------|------------|
| **Designer vs. Architect** (spec violates design constraints) | @architect has final say on technical feasibility; @product-designer may propose alternatives. Escalate to @tech-lead if unresolved in 24h. |
| **Developer vs. Architect** (implementation reveals design flaw) | Developer files a "design concern" against the ADR. @architect must respond within 48h with amendment or rationale. |
| **UX Researcher vs. Product Designer** (usability findings challenge design) | @ux-researcher's critical/serious findings are binding — @product-designer must address them before dev handoff. Disputes escalate to @product-manager. |
| **Security vs. Developer** (security blocks shipping feature) | @security-engineer's Critical/High findings are **blocking**. Medium/Low can be deferred with documented risk acceptance. |
| **QA vs. Developer** (test failure disputes) | QA's test results against documented acceptance criteria are authoritative. Developer may challenge if acceptance criteria are ambiguous — resolved by @product-manager. |
| **Performance vs. Developer** (performance requires redesign) | @performance-engineer documents finding with impact metrics. If fix requires >4h redesign, escalate to @tech-lead for scope/schedule trade-off decision. |
| **Research contradicts Founder** (market/user/player research invalidates assumptions) | @market-researcher or @user-researcher presents evidence. @founder decides: pivot, refine, or proceed with documented risk acceptance. |
| **Product Manager vs. Project Manager** (scope vs. timeline conflict) | @product-manager owns WHAT (scope and priority). @project-manager owns WHEN (timeline and coordination). If scope cannot fit timeline, @project-manager presents options with trade-offs; @product-manager decides which scope to cut. Escalate to @founder if unresolved. |
| **Project Manager vs. Tech Lead** (delivery pressure vs. technical quality) | @project-manager raises timeline concern; @tech-lead provides rebuild/refactor trade-off. Escalate to @product-manager for business impact assessment if unresolved in 24h. |

### 3.2 Escalation Ladder

```
Level 1: Direct resolution between two agents (24h)
Level 2: Project Manager mediation (48h)
Level 3: Product Manager arbitration (72h)
Level 4: Founder decision (final)
```

---

## 4. Feedback Loops

Agents are not siloed. Downstream findings MUST flow upstream.

| Feedback Channel | Trigger | Action |
|-----------------|---------|--------|
| @developer → @architect | "Design is not implementable as specified" | File ADR amendment request; @architect revises within 48h |
| @qa-engineer → @developer | Test failure against acceptance criteria | Fix and re-review; if systemic, notify @tech-lead |
| @qa-engineer → @product-manager | Acceptance criteria are ambiguous or impossible to test | Flag spec gap; @product-manager must clarify within 24h |
| @security-engineer → @architect | Architecture creates unaddressed attack surface | Propose new ADR or amendment |
| @performance-engineer → @architect | Architecture violates performance SLAs | Document with metrics; trigger architecture review |
| @code-reviewer → @developer | Blocking issues found | Fix required before merge; if pattern repeats, notify @tech-lead |
| @technical-writer → @developer | Docs discover undocumented behavior | Developer documents; if systemic, add to Definition of Done |
| @ux-researcher → @product-designer | Users struggle with designed interaction | Redesign before dev handoff; critical findings are blocking |
| @ux-researcher → @product-manager | Core tasks fail usability testing | Re-scope or re-design feature; escalate to @founder if concept-level issue |
| @project-manager → @all | Kanban board updated | Item moved, blocked, or milestone changed | `artifacts/output/05-project-management/kanban.md` |
| @founder → @all | Strategic pivot decision | All downstream artifacts must be re-validated against new direction |
| @project-manager → @tech-lead | Tasks blocked or timeline at risk | Escalate blocker to owner with 24h deadline; adjust plan based on resolution |
| @data-analyst → @product-manager | Post-launch metrics differ from hypothesis | Flag for iteration backlog; adjust success criteria if needed |
| @project-manager → @product-manager | Scope creep detected | Formal change request with timeline impact; @product-manager prioritizes |

---

## 5. Optional Agents

Some agents are not required for every project. They are **summoned on demand**.

| Agent | When to Summon | Summoned By |
|-------|---------------|-------------|
| @ml-engineer | When `idea-brief.md` identifies ML/AI as a core capability (model training, inference pipelines, data drift, feature engineering) | @founder (in idea brief) |
| @ux-researcher | When complex multi-step workflows, novel interaction patterns, accessibility-critical features, or @product-designer requests validation | @founder (in idea brief) or @product-designer |
| @data-analyst | When the feature set requires measurement instrumentation or A/B testing | @founder (in idea brief) or @product-manager |
| @performance-engineer | Before major releases or when performance SLAs exist (e.g., <200ms p95) | @founder (in idea brief) or @tech-lead |
| @technical-writer | For any release that introduces public-facing API changes or user-facing features | @founder (in idea brief) or @tech-lead |

When an optional agent is summoned, its template artifacts are created as usual. When not summoned, downstream agents simply skip its outputs.

**Key difference:** @ux-researcher is summoned by the **founder** (strategic decision) OR by @product-designer (tactical decision when design complexity warrants it). This dual-trigger ensures UX research happens when needed without bottlenecking on the founder.

---

## 6. Version Tracking

Every artifact produced by an agent must include:

```
**Document info:**
- Version: X.Y
- Author: @agent-name
- Date: YYYY-MM-DD
- Last updated: YYYY-MM-DD
- Depends on: [list of upstream artifacts]
- Supersedes: [previous version if applicable]
```

When an upstream artifact changes, all downstream artifacts that depend on it must be **re-validated** and have their version bumped.

---

## 7. Timeline Impact of Optional Agents

Optional agents add time to the schedule. Planning guidance:

| Agent | Additional Time | Recommendation |
|-------|----------------|----------------|
| @ux-researcher | +1-2 weeks (before dev handoff) | Parallel with late architecture / early planning phase |
| @ml-engineer | +2-4 weeks (data + training + validation) | Start data collection in Phase 1; training in Phase 5 |
| @performance-engineer | +1 week (pre-release audit) | Runs in parallel with QA phase |
| @data-analyst | +1 week (instrumentation + dashboard) | Runs in parallel with development |
| @technical-writer | +1 week (documentation) | Runs in parallel with QA |

---

## 8. Skills (Phase Tabs)

| Skill | Phase | Primary Agents | Key Output |
|-------|-------|----------------|------------|
| `idea-validation` | -1 | @founder | Validation brief with GO/PIVOT/KILL verdict |
| `game-idea-validation` | -1 | @founder | Game validation brief with GO/PIVOT/KILL verdict |
| `product-exploration` | 0-1 | @founder, @market-researcher, @user-researcher, @competitor-analyzer | Validated idea brief, market analysis, personas |
| `game-product-exploration` | 0-1 | @founder, @market-researcher, @user-researcher, @competitor-analyzer | Validated game brief, genre analysis, player personas |
| `product-design` | 2 | @product-manager, @product-designer | PRD, user stories, product spec |
| `product-development` | 3-5 | @architect, @tech-lead, @developer, @qa-engineer | Working, tested feature |
| `product-launch` | 7 | @project-manager, @devops-engineer | Shipped feature in production |
| `product-iteration` | 8 | @data-analyst, @product-manager, @developer | Measured improvement |
| `incident-response` | Any | @project-manager, @devops-engineer, @developer | Mitigated incident, RCA, prevention |
| `retrospective` | 9 | @project-manager, @tech-lead, @architect | Action items for improvement |

---

## 9. Shared Memory & Context

All agents share a persistent memory layer in `artifacts/memory/`. This enables cross-session continuity, accumulated knowledge, and context passing between agents.

### Memory Architecture

```
artifacts/memory/
├── memory-index.md              # Directory of all memory files
├── project-context.md           # Static: project basics, tech stack, conventions
├── active-decisions.md          # Dynamic: current decisions and rationale
├── patterns-and-conventions.md  # Dynamic: discovered patterns and anti-patterns
├── lessons-learned.md           # Dynamic: insights from each phase
├── blockers-and-risks.md        # Dynamic: active blockers and their owners
├── agent-notes/                 # Per-agent accumulated knowledge
│   ├── architect-notes.md
│   ├── developer-notes.md
│   ├── designer-notes.md
│   ├── tech-lead-notes.md
│   └── project-manager-notes.md
└── session-summaries/           # Per-session continuity
    └── latest.md

artifacts/output/05-project-management/
└── kanban.md                    # LIVE: single source of truth for project progress
```

**The Kanban board (`artifacts/output/05-project-management/kanban.md`) is a persistent project artifact, not just a template.** It is initialized during Phase 4 (Planning) by @project-manager and updated continuously throughout the project lifecycle. Every cross-agent handoff, blocker resolution, and scope change must be reflected in the Kanban.

### Memory Protocol

**Before starting work, every agent MUST:**
1. Read `artifacts/memory/project-context.md` for project basics
2. Read `artifacts/memory/active-decisions.md` for current constraints
3. Read `artifacts/memory/patterns-and-conventions.md` for established patterns
4. Read their own agent notes in `artifacts/memory/agent-notes/`

**After completing work, every agent MUST:**
1. Append new decisions to `artifacts/memory/active-decisions.md`
2. Append new patterns to `artifacts/memory/patterns-and-conventions.md`
3. Append lessons to `artifacts/memory/lessons-learned.md`
4. Update their agent notes in `artifacts/memory/agent-notes/`
5. If ending a session, write a summary to `artifacts/memory/session-summaries/latest.md`

**Memory Rules:**
- **Append, don't overwrite.** Memory files grow over time. Use dated headings.
- **Be specific.** Include file paths, decision IDs, and rationale.
- **Link, don't duplicate.** Reference full artifacts in `artifacts/output/` rather than copying content.
- **Mark resolved items.** Use strikethrough or "RESOLVED" tags for blockers and deprecated decisions.
- **Initialize on first use.** If a memory file doesn't exist yet, create it using the template in `artifacts/memory/`.

### Cross-Agent Memory Handoffs

| When | What to Write | Where |
|------|--------------|-------|
| @founder decides direction | Key assumptions, optional agents requested | `active-decisions.md` |
| @architect makes tech decision | ADR reference, rationale, constraints | `active-decisions.md` + `architect-notes.md` |
| @developer discovers pattern | Code pattern, file location, why it works | `patterns-and-conventions.md` + `developer-notes.md` |
| @developer finds workaround | Issue description, workaround, file | `developer-notes.md` |
| @qa-engineer finds flaky test | Test name, failure pattern, frequency | `qa-notes.md` |
| @product-designer evolves design system | Component change, version, reason | `designer-notes.md` |
| @tech-lead estimates task | Estimated vs actual, variance reason | `tech-lead-notes.md` |
| @project-manager tracks delivery | Milestone status, blocker resolution, velocity | `project-manager-notes.md` |
| @project-manager updates Kanban | Item column, status, activity log | `artifacts/output/05-project-management/kanban.md` |
| @product-manager re-prioritizes | Priority changes, scope additions/removals | `artifacts/output/05-project-management/kanban.md` + `active-decisions.md` |
| @data-analyst observes metric shift | Metric, threshold, context | `active-decisions.md` |
| Any agent hits blocker | Blocker description, owner, ETA | `blockers-and-risks.md` |
| Any agent learns lesson | Phase, context, lesson, action item | `lessons-learned.md` |

---

## 10. Global Guardrails

These guardrails apply to **all agents** regardless of role or phase.

### Bash Safety
- **Never** run drive-level destructive commands: `format`, `diskpart`, `diskutil eraseDisk`, `mkfs.*`, `fdisk`, `parted`, `dd if=/dev/zero of=/dev/disk*`, `newfs_*`, or any equivalent across macOS, Windows, and Linux.
- If storage formatting is genuinely required, ask the user explicitly and describe exactly what will be formatted.

### Deletion Approval
- **By default, ask for explicit user approval before deleting** files, directories, repositories, or data.
- **Exception:** In `mode: autonomous`, you may delete without asking but must log exactly what was deleted and why.
- **Never** delete without confirmation in `mode: subagent`.

### User Questioning
- **By default, ask the user before making significant changes** that could affect the project state, user data, or external systems.
- **Exception:** In `mode: autonomous`, you may proceed but must notify the user of what was changed after the fact.
- When in doubt, always ask — never assume.

### Scope Restriction
- All agents may only access files within the project directory: `/Users/christianhadianto/Documents/TechSmith/nephila/` and its subdirectories.
- **Never** access, read, or modify files outside the project folder (system directories, user home outside project, external drives, `~/.bashrc`, `/etc`, `/usr`, `C:\`, etc.).
- All artifacts must be saved within the project's `artifacts/` directory or `.opencode/` subdirectory.