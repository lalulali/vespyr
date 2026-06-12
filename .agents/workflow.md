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
  ├── Product track (validate-idea skill)
  │     └── @founder — Socratic diagnostic: stress-test the idea before investing research cycles
  │           │         Adapts by context: startup | company | personal
  │           │         Adapts by maturity: greenfield | brownfield
  │           │         Produces: artifacts/output/00-discovery/validation-brief.md
  │           │
  │           ├── GO ──────────▼
  │           │          PHASE 0: DISCOVERY (explore-idea skill)
  │           │            └── @founder — synthesizes validated concept (or uses validation brief directly)
  │           │                  │         produces: artifacts/output/00-discovery/idea-brief.md (only if no validation brief)
  │           │                  ▼
  │           ├── PIVOT ──▶ Re-run Phase -1 with revised framing
  │           │
  │           └── KILL ──▶ Stop. Brief documents why. Save research cycles.
  │
  └── Game track (validate-game-idea skill)
        └── @founder — Socratic diagnostic: stress-test the game concept before investing production cycles
              │         Adapts by context: startup | company | personal
              │         Adapts by maturity: greenfield | brownfield
              │         Produces: artifacts/output/00-discovery/validation-brief.md
              │
              ├── GO ──────────▼
              │          PHASE 0: DISCOVERY (explore-game-idea skill)
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

| Phase | Primary Skill | Autonomous | Semi-autonomous | Manual |
|-------|---------------|------------|----------------|--------|
| **-1: Validation** | `validate-idea` / `validate-game-idea` | Auto-generate validation brief from context. Auto-decide GO/PIVOT/KILL based on available evidence. | Run diagnostic questions interactively. **Pause for GO/PIVOT/KILL verdict.** | Full Socratic session. Every question interactive. Human confirms each answer before next. |
| **0: Discovery** | `validate-idea` / `validate-game-idea` | @founder auto-synthesizes, no review. | @founder synthesizes. **Pause for human review of idea brief before research.** | @founder drafts, human refines iteratively. |
| **1: Research** | `explore-idea` / `explore-game-idea` | All research agents run in parallel, auto-complete. | Research runs autonomously. Human reviews at Phase 1→2 gate. | Human reviews each research output before the next agent starts. |
| **2: Strategy** | `design` | Auto-generate PRD, specs, user stories. | Draft features. **Pause for human selection & feedback.** Finalize PRD/user stories. **Pause for human spec approval.** | Human co-writes requirements and specs with agents. |
| **3: Architecture (Optional)** | `develop` / `design` | Auto-generate ADRs if enabled. | **Optional Phase.** Pause to ask user: run `@architect` first or bypass directly to `@tech-lead`/`@developer`? | Human collaborates on ADRs if executed. |
| **4: Planning & Kanban** | `plan` / `kanban` | `@product-manager` auto-seeds Kanban board. `@tech-lead` auto-generates `execution-plan.md` task breakdown and estimates. | **Kanban & Planning.** `@product-manager` seeds the Kanban board. `@tech-lead` breaks down user stories into developer-centric tasks (1-4h, dependencies). **Pause for human approval of the execution plan.** | Human collaborates on task slicing, estimates, and reviews the Kanban board. |
| **5: Execution** | `develop` | Write code, auto-commit per task. | Write code autonomously. **Pause before destructive operations** (delete, migrate, refactor >100 lines). | Human reviews each task output before next task. |
| **5.5: Design Validation** | `design` | Auto-run usability review. | Auto-run. **Pause if critical usability issues found.** | Human participates in usability review. |
| **6: Quality Gates** | `review` / `test` | Auto-run all checks. Auto-fix low/medium issues. | Auto-run checks. **Pause on critical/high severity findings.** | Human reviews each quality report. |
| **7: Launch** | `launch` | **NEVER auto-deploy.** Always pauses for GO/NO-GO. | **Pause for human GO/NO-GO on deployment.** | Human drives launch sequence. |
| **8: Iteration** | `iterate` | Auto-prioritize and implement improvements. | Auto-implement. **Pause for prioritization review.** | Human reviews each iteration proposal. |
| **9: Retrospective** | `retro` | Auto-generate retrospective report. | Auto-generate. **Pause for human review of action items.** | Human leads retrospective with agent support. |
| **Incident Response** | `incident` | Auto-mitigate (rollback, scale). **Pause before data-affecting fixes.** | **Pause for human triage decision.** Auto-mitigate after approval. | Human directs every remediation step. |

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

### Strategy Feature Design Selection Bypass

To allow full automation of feature design and bypass the interactive selection pause during `semi-autonomous` mode in Phase 2, users can configure a dedicated bypass switch in `artifacts/memory/project-context.md`:

```markdown
## Operation Mode
Default: semi-autonomous
FeatureDesignInteraction: false
```

- **`FeatureDesignInteraction: true` (default in semi-autonomous):** Pause during feature selection to get user feedback.
- **`FeatureDesignInteraction: false`:** Bypasses the feature selection pause entirely. `@product-manager` will auto-generate the complete PRD and user stories without stopping.
- **Natural language support:** If a user says `"bypass feature review"`, `"automate feature design selection"`, or `"skip interactive feature design"`, the agent will set `FeatureDesignInteraction: false` in `artifacts/memory/project-context.md` and log the override.


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
| "bypass feature review" / "automate feature design" | Sets `FeatureDesignInteraction` override to `false` |
| "enable interactive feature design" / "review features" | Resets `FeatureDesignInteraction` to `true` |

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

The `@tech-lead` assumes direct leadership during Phase 4 sprint setup and planning (Step 3b) to explicitly check and evaluate the task dependencies and file isolation in the backlog, deciding exactly how many parallel developers to run (1 to N) based on:
- How many tasks are truly independent (no shared file edits)
- Project complexity — more developers = more merge work
- Recommended: **2-3 developers** max for most projects to keep coordination overhead low. Tech Lead can adjust this number up or down to optimize sprint delivery.

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

| Developer | Worktree | Branch | Role | Tasks | Files touched |
|---|---|---|---|---|---|
| @developer-1 | ~/.local/share/opencode/worktree/worktree-dev-1 | feat/main/task-1 | FE | Auth flow, login page | src/auth/*, src/pages/login.* |
| @developer-2 | ~/.local/share/opencode/worktree/worktree-dev-2 | feat/main/task-2 | BE | Dashboard API, charts | src/api/dashboard.*, src/components/chart.* |
| @developer-3 | ~/.local/share/opencode/worktree/worktree-dev-3 | feat/main/task-3 | Full-Stack | Notification system | src/notifications/*, src/services/notify.* |
```

**Role tags** determine the developer's communication permissions:
- `FE` → Focus on visual accuracy and UX; may converse with human, `@product-designer`, or `@product-manager`
- `BE` → Focus on API contracts, schemas, and robustness; may converse with human or `@product-manager`
- `Full-Stack` → Both FE and BE communication channels are available

**Critical rule:** Tasks assigned to different developers must NOT touch the same files. If two tasks need to edit the same file, they must be sequential (same developer) or the shared file must be edited by one developer first, then merged before the other starts.

### Developer workflow (per developer)

Each developer agent operates in its assigned worktree:

1. **Navigate to worktree** — all file operations happen in the worktree directory
2. **Read shared artifacts (NON-NEGOTIABLE Spec & Story Reading Mandate):** `@developer` MUST read and fully understand the validated Product Spec (`artifacts/output/02-strategy/product-spec.md` or `product-spec.html`) and companion User Stories (`artifacts/output/02-strategy/user-stories.md`) in full prior to writing any code, ensuring 100% implementation alignment.
3. **Clarify specifications (Ambiguities Guardrail):** If specifications or design layouts are unclear, follow the communication permissions defined by your assigned **Role tag** (FE/BE/Full-Stack) from the Task Assignment table:
   - **FE:** Focus strongly on visual excellence and accuracy. Explicitly permitted to converse with the **human user, `@product-designer`, or `@product-manager`** to clarify.
   - **BE:** Focus on robust logic and schema safety. Explicitly permitted to converse with the **human user or `@product-manager`** to clarify.
   - **Full-Stack:** Both FE and BE communication channels are available.
4. **Implement task** — write code satisfying happy/unhappy/edge acceptance criteria, write unit/integration tests, and run lints inside the worktree.
5. **Commit to feature branch** — commit code to the worktree's designated branch.
6. **Signal completion** — update `artifacts/memory/agent-notes/developer-notes.md` in the main repo with status.

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
| @founder (validate-idea) | @founder (explore-idea) | `artifacts/output/00-discovery/validation-brief.md` | Must contain GO verdict, value proposition, target user, narrowest wedge, agreed premises, and open questions for exploration |
| @founder (validate-game-idea) | @founder (explore-game-idea) | `artifacts/output/00-discovery/validation-brief.md` | Must contain GO verdict, value proposition, target player, core fun loop, agreed premises, and open questions for exploration |

**Note:** If the validation brief exists with a GO verdict, Phase 0 (Discovery) can be skipped — the validation brief directly feeds into Phase 1 (Research). Research agents focus on the "Open questions for exploration" section.

### Discovery → Research

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @founder | @researcher | `validation-brief.md` OR `idea-brief.md` | Must contain target user, value proposition, key assumptions, and recommended next step |
| @founder | @user-researcher | `validation-brief.md` OR `idea-brief.md` | Must contain primary user definition and assumptions to validate |
| @founder | @ux-researcher | `validation-brief.md` OR `idea-brief.md` | Must contain target user profile and key user-facing features |

### Research → Strategy

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @researcher | @product-manager | `artifacts/output/01-research/market-analysis.md`, `competitive-analysis.md` | Must contain market sizing, competitive matrix, and GO/NO-GO verdict |
| @user-researcher | @product-manager | `artifacts/output/01-research/user-personas.md` | Must contain primary persona and prioritized needs |
| @user-researcher | @ux-researcher | `artifacts/output/01-research/user-personas.md` | Must contain persona details for usability test participant selection |

### Strategy → Architecture

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @product-manager | @product-designer | `artifacts/output/02-strategy/requirements.md`, `artifacts/output/02-strategy/user-stories.md` | Must pass cross-validation checklist (every feature has ≥1 story, every story traces to a feature, and all stories are prepared for bi-directional spec tracing and strictly follow requirements and product spec visual designs with zero divergences) |
| @product-manager | @architect | `artifacts/output/02-strategy/requirements.md`, `artifacts/output/02-strategy/user-stories.md` | Must contain business goals with measurable targets |
| @product-designer | @architect | `artifacts/output/02-strategy/product-spec.md` | Must contain defined flows, screens, and technical constraints |
| @product-designer | @ux-researcher | `artifacts/output/02-strategy/product-spec.md` | Must contain complete flows with all states defined; ready for usability validation |
| @product-designer | @developer | `artifacts/output/02-strategy/product-spec.md` (validated by @ux-researcher if applicable) | UI is usability-tested or @product-designer has documented rationale for skipping |
| @ux-researcher | @product-designer | `artifacts/output/01-research/ux-research-report.md` | Must contain severity-rated findings; critical issues resolved before dev handoff |


### Architecture → Planning (Only if Phase 3 is executed)

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @architect | @tech-lead | `artifacts/output/03-architecture/` (ADRs) | Must contain data model, API contracts, and tech stack decision |
| @product-manager | @tech-lead | `artifacts/output/02-strategy/requirements.md` | Must contain priorities and business deadlines |


### Strategy → Planning (Direct Handoff - Bypassing Optional Phase 3)

If the user opts to bypass Phase 3 (Architecture), the Strategy artifacts feed directly into the Tech Lead and Developer for planning and implementation.

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @product-manager | @tech-lead | `artifacts/output/02-strategy/requirements.md`, `user-stories.md` | Tech Lead consumes strategic requirements directly for task breakdown |
| @product-designer | @tech-lead | `artifacts/output/02-strategy/product-spec.md` | Tech Lead maps tasks directly to visual/interaction specifications |
| @product-designer | @developer | `artifacts/output/02-strategy/product-spec.md` | Developer implements visual layouts and interaction specs directly |


### Planning → Execution

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @tech-lead | @developer | `artifacts/output/02-strategy/product-spec.md`, `artifacts/output/02-strategy/user-stories.md` | Must contain task breakdown with DoD, dependencies, and acceptance criteria mapping from Kanban; developer MUST explicitly load and read both strategy documents prior to starting coding |
| @tech-lead | @developer | `artifacts/output/01-research/ux-research-report.md` (if available) | @developer must be aware of validated interaction patterns |
| @tech-lead | @data-analyst | `artifacts/output/02-strategy/requirements.md` | Must contain success metrics from business goals |
| @tech-lead | @ml-engineer | `artifacts/output/03-architecture/` | Must contain ML-specific tasks and data requirements |

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
| @qa-engineer | @product-manager | QA sign-off report | All acceptance criteria met; known issues documented |
| @code-reviewer | @product-manager | Code review summary | No blocking issues; non-blocking issues documented |
| @security-engineer | @product-manager | Security audit report | No critical/high findings; medium/low findings documented |
| @performance-engineer | @product-manager | Performance report | All SLAs met or exceptions documented |
| @product-manager | @devops-engineer | `artifacts/output/06-launch/go-nogo-decision.md` | All release readiness criteria met; go/no-go decided |

### Launch → Iteration

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @devops-engineer | @data-analyst | Deployment confirmation + monitoring URLs | Production is live and healthy |
| @devops-engineer | @product-manager | `artifacts/output/06-launch/post-launch-report.md` | Launch completed; initial metrics collected |

### Iteration → Retrospective

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| @data-analyst | @product-manager | `artifacts/output/07-iteration/iteration-results.md` | Measured impact of iteration changes |
| @tech-lead | @product-manager | Execution metrics (estimate vs actual) | Velocity and estimation data per task |
| @product-manager | All | `artifacts/output/09-retro/action-items.md` | Actionable improvements with owners and deadlines |

### Incident → Remediation

| From | To | Required Artifacts | Contract |
|------|-----|-------------------|----------|
| incident | @devops-engineer | `artifacts/output/08-incidents/INC-NNN/triage.md` | Severity, timeline, assigned responders |
| @devops-engineer | incident | `artifacts/output/08-incidents/INC-NNN/mitigation.md` | Mitigation applied, current status |
| @architect | @developer | `artifacts/output/08-incidents/INC-NNN/rca.md` | Root cause identified, fix direction clear |
| @developer | incident | `artifacts/output/08-incidents/INC-NNN/remediation.md` | Fix implemented, tests added |

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
| **Research contradicts Founder** (market/user/player research invalidates assumptions) | @researcher or @user-researcher presents evidence. @founder decides: pivot, refine, or proceed with documented risk acceptance. |
| **Product Manager vs. Tech Lead** (scope vs. engineering feasibility conflict) | @product-manager owns WHAT (scope and priority). @tech-lead owns HOW (technical quality and engineering coordination). If scope cannot fit engineering constraints, @tech-lead presents options with trade-offs; @product-manager decides which scope to adjust or cut. Escalate to @founder if unresolved. |

### 3.2 Escalation Ladder

```
Level 1: Direct resolution between two agents (24h)
Level 2: Tech Lead / Product Manager arbitration (48h)
Level 3: Founder decision (final)
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
| @product-manager → @all | Kanban board updated | Item moved, blocked, or milestone changed | `artifacts/output/04-planning/kanban.md` |
| @founder → @all | Strategic pivot decision | All downstream artifacts must be re-validated against new direction |
| incident skill → @tech-lead | Tasks blocked or timeline at risk | Escalate blocker to owner with 24h deadline; adjust plan based on resolution |
| @data-analyst → @product-manager | Post-launch metrics differ from hypothesis | Flag for iteration backlog; adjust success criteria if needed |
| incident skill → @product-manager | Scope creep detected | Formal change request with timeline impact; @product-manager prioritizes |

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

## 8. Workflows & Skills

| Skill | Phase | Primary Agents | Key Output |
|-------|-------|----------------|------------|
| `validate-idea` | -1 | @founder | Validation brief with GO/PIVOT/KILL verdict |
| `validate-game-idea` | -1 | @founder | Game validation brief with GO/PIVOT/KILL verdict |
| `explore-idea` | 0-1 | @founder, @researcher, @user-researcher | Validated idea brief, market analysis, personas |
| `explore-game-idea` | 0-1 | @founder, @researcher, @user-researcher | Validated game brief, genre analysis, player personas |
| `design` | 2 | @product-manager, @product-designer | PRD, user stories, product spec |
| `develop` | 3-5 | @architect, @tech-lead, @developer, @qa-engineer | Working, tested feature |
| `launch` | 7 | @product-manager, @devops-engineer | Shipped feature in production |
| `iterate` | 8 | @data-analyst, @product-manager, @developer | Measured improvement |
| `incident` | Any | @devops-engineer, @developer | Mitigated incident, RCA, prevention |
| `retro` | 9 | @product-manager, @tech-lead, @architect | Action items for improvement |


---

## 9. Shared Memory & Context

All agents share a persistent memory layer in `artifacts/memory/`. Access is always through `@memory-controller` — never by reading files directly. This keeps token consumption at ~1,000 tokens per agent invocation instead of ~15,000.

### Memory Architecture

```
artifacts/memory/
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
│   └── qa-notes.md
├── session-summaries/           # Cross-session continuity
│   ├── latest.md                # Most recent session (~100 tokens, Tier 1)
│   └── history.md               # Full session log (append-only, never loaded directly)
└── archive/                     # Compacted historical entries
    ├── index.json               # Searchable index (auto-created on first compaction)
    └── YYYY-QN/                 # Quarterly archive folders
```

**The Kanban board (`artifacts/output/04-planning/kanban.md`) is a persistent project artifact, not just a template.** It is initialized and seeded directly by `@product-manager` once Strategy requirements, product specs, and user stories are approved (in semi-autonomous/manual mode) or immediately (skipping all approval pauses in autonomous mode). It is updated continuously throughout the project lifecycle. Every cross-agent handoff, blocker resolution, and scope change must be reflected in the Kanban.


### Memory Protocol

**Before starting work, every agent MUST:**
```
@memory-controller load [agent-type] [brief task description]
```
The controller returns ~1,000 tokens of filtered context across three tiers:
- **Tier 1** (~200 tokens): project name, stack, phase, sprint, blocker count, last session summary
- **Tier 2** (~300 tokens): files specific to the agent's role
- **Tier 3** (~500 tokens): chunks from any file scoring ≥ 4 against the task keywords

**After completing work, every agent MUST:**
```
@memory-controller write [file] [entry]
```
Use the format in `.agents/templates/memory-entry-template.md`. The controller validates the entry, checks for duplicates, persists it, and triggers compaction if the file exceeds its threshold.

**At the end of a significant session, every agent MUST:**
```
@memory-controller session-write [content]
```
Use the format in `.agents/templates/session-summary-template.md`. This writes to `session-summaries/latest.md` (overwrite) and appends to `session-summaries/history.md`. The next session loads this as part of Tier 1 — ~100 tokens of recent context.

**Memory Rules:**
- **Never read memory files directly.** Always use `@memory-controller load`.
- **Never write memory files directly.** Always use `@memory-controller write`.
- **Be specific.** Include domain tags, file paths, decision IDs, and rationale.
- **Link, don't duplicate.** Reference full artifacts in `artifacts/output/` rather than copying content.
- **Mark resolved items.** Set `**Status:** resolved` on blockers and deprecated decisions.
- **Nothing is deleted.** Compaction moves resolved/stale entries to `archive/` — always retrievable via `@memory-controller search [query]`.

### Memory Operations Reference

| Command | What it does |
|---------|-------------|
| `@memory-controller load [agent] [task]` | Progressive 3-tier context load |
| `@memory-controller load blockers` | Load only active blockers in full |
| `@memory-controller load-full [file]` | Load a complete file without filtering |
| `@memory-controller load-archive [id]` | Load a specific archived entry by ID |
| `@memory-controller write [file] [content]` | Validate and persist a memory entry |
| `@memory-controller search [query]` | Search the archive index by keywords |
| `@memory-controller compact [file]` | Compact a file and archive resolved entries |
| `@memory-controller session-write [content]` | Write session summary for continuity |
| `@memory-controller status` | Health snapshot of all memory files |

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
| @product-manager updates Kanban | Item column, status, activity log | `artifacts/output/04-planning/kanban.md` |
| @product-manager re-prioritizes | Priority changes, scope additions/removals | `artifacts/output/04-planning/kanban.md` + `active-decisions.md` |
| @data-analyst observes metric shift | Metric, threshold, context | `active-decisions.md` |
| Any agent hits blocker | Blocker description, owner, ETA | `blockers-and-risks.md` |
| Any agent learns lesson | Phase, context, lesson, action item | `lessons-learned.md` |
| Any agent ends a session | What was done, decisions, next step, blockers | `session-summaries/latest.md` (via session-write) |

---

## 9b. Pipeline State Machine — the Source of Truth

The **pipeline state machine** (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. Every workflow skill and every code-modifying agent must wire its work into it. Without this integration, the dashboard has no data, the code-graph never refreshes, and `next` has no signal to recommend actions.

### What the state machine tracks

- **Current phase** (validation → exploration → design → development)
- **Artifact versions** (which deliverables exist, who produced them, what version)
- **Change requests** (open CRs that block phase advancement)
- **Blockers** (active blockers with owners and ETAs)
- **History** (every `init`, `set-phase`, `complete`, `file-cr` event)
- **Squad** (which agent preset is active)

### When to call the state machine

| Trigger | Command | Why |
|---|---|---|
| Skill starts (any phase) | `orchestrator_state.js status` | Know current phase before doing work |
| Skill needs next action | `orchestrator_state.js next` | Get the system's recommendation |
| Skill produces an artifact | `orchestrator_state.js complete --agent X --artifact Y` | Record work, fire telemetry, refresh code-graph |
| User wants to switch phases | `orchestrator_state.js set-phase --phase X` | Advance with proper logging |
| Cross-team change needed | `orchestrator_state.js file-cr --from X --to Y --target Z --issue "..."` | Block advancement until resolved |
| Project initialization | `orchestrator_state.js init --name "X" --type Y` | First-run setup (also via `/squad`) |
| Graph refresh (code) | `orchestrator_state.js ensure-graph code` | Force refresh code-graph |
| Graph refresh (doc) | `orchestrator_state.js ensure-graph doc` | Force refresh doc-graph |

### Auto-firing side effects

The state machine is not just a state recorder. It auto-fires side effects that you would otherwise have to remember:

- **`init`** → seeds `artifacts/memory/project-context.md` AND triggers `ensure_graph.js doc` so the doc-graph exists from the first call
- **`set-phase`** → records `phase_transition` telemetry and syncs `Phase:` field in `project-context.md`
- **`complete --agent developer|architect|tech-lead`** → records `agent_invoke` telemetry AND triggers `ensure_graph.js code` so the code-graph is current
- **All `complete` calls** → record `agent_invoke` telemetry, even when no `--tokens` is supplied (token count is auto-estimated from artifact size)
- **`file-cr`** → records the open CR in `pipeline-state.json`, which causes `next` to return `resolve-cr` until resolved

### Why every skill must integrate

If a skill produces an artifact without calling `complete`:
- The artifact exists on disk but the state machine has no record
- `next` cannot tell the user "validation is complete, move to exploration"
- Telemetry stays empty
- The code-graph is never refreshed after code-modifying work
- Subsequent skills have no way to know what was already done

Every workflow skill (`validate-idea`, `explore-idea`, `design`, `develop`, `launch`, `iterate`, `retro`, `incident`, and the `-game-idea` variants) has a "State Machine Integration" section that specifies exactly which `complete` calls to make. Follow it.

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
- All artifacts must be saved within the project's `artifacts/` directory or `.agents/` subdirectory.
