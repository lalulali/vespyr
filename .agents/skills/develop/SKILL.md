---
name: develop
description: Core MVP workflow — spec review, architecture, planning, implementation, QA, verification, and documentation
---

## What this skill does

Guides you through building a feature from spec to shipped code. Invoke subagents in sequence using `@mentions` or let the primary agent orchestrate via the Task tool.

**Previous skill:** `product-design` (produces the detailed spec)
**Next skill:** After development is complete, load `product-launch` to ship.

## Prerequisites

Before starting, verify these artifacts exist:
- [ ] `artifacts/output/02-strategy/product-spec.md`
- [ ] `artifacts/output/02-strategy/requirements.md`
- [ ] `artifacts/output/02-strategy/user-stories.md`

If any are missing, load `product-design` first.

## Core workflow steps

### Step 1: Spec Review
Review specs with `@product-manager` and `@product-designer`:
- PM confirms specs match the PRD requirements and priorities
- Designer reviews user flows, interaction specs, and visual direction
- Clarify open questions, edge cases, and scope boundaries
- Ensure specs are detailed enough for development
- **Developer Mandate:** `@developer` MUST explicitly load, read, and fully digest the verified Product Spec (`artifacts/output/02-strategy/product-spec.md`) and companion User Stories (`artifacts/output/02-strategy/user-stories.md`) in full. The developer cannot start writing code until they have read and aligned their implementation plan with these strategy documents.

**Required inputs:**
- `artifacts/output/02-strategy/product-spec.md`
- `artifacts/output/02-strategy/requirements.md` (business context)
- `artifacts/output/02-strategy/user-stories.md` (acceptance criteria and technical requirements)

### Step 2: Architecture (Optional Phase)

**Check Configuration:** Check `project-context.md` for the `ArchitectPhase` configuration.
- **If `ArchitectPhase: false` (Bypassed):** **SKIP this step completely** and proceed directly to Step 3b (Execution Planning). Under Step 3a (Architecture/Spec Review), the `@tech-lead` will review strategy specifications directly instead of ADRs.
- **If `ArchitectPhase: true` (Enabled) or unset (default):** Invoke `@architect` to:
  - Design system architecture and component interactions
  - Select tech stack with trade-off rationale
  - Define data models, schemas, and API contracts
  - Document ADRs in `artifacts/output/03-architecture/`
  - Identify technical risks and mitigation strategies

**Output:** `artifacts/output/03-architecture/adr-NNN-*.md` (Only generated and required if this phase was executed. Use template: `.agents/templates/adr-template.md`).


### Step 3: Architecture & Backlog Review

The `@tech-lead` reviews the architectural decisions (if Phase 3 was executed) and the finalized user stories/Kanban backlog directly to prepare for development. Use template: `.agents/templates/execution-plan-template.md` to produce the execution plan. Save to `artifacts/output/04-planning/execution-plan.md`. This document gates development — it lists tasks, estimates, dependencies, and the build order.

#### Step 3a: Architecture & Spec Review
Invoke `@tech-lead` to review the architecture (or strategy specs if Phase 3 was bypassed):
- Does the architecture/spec support all user stories and requirements?
- Are there missing interfaces or structural risks?
- Feed findings back to `@architect` or `@product-manager` if critical gaps are found.

**Loop limit:** Max 2 revision cycles, then escalate to `@founder`.

#### Step 3b: Backlog Preparation
Invoke `@tech-lead` to:
- Review the User Stories and the Kanban board (`artifacts/output/04-planning/kanban.md`) seeded by the `@product-manager`.
- **Leadership Parallelism Evaluation:** `@tech-lead` takes direct leadership of the sprint setup and explicitly evaluates the task dependencies and file isolation in the backlog to determine the exact number of parallel developers to run (1 to N).
- Plan implementation sequence, task dependencies, and parallel developer work assignments based on this evaluation.
- Identify any technical unknowns or risky zones that require spikes.

### Step 4: Kanban Backlog Activation (Gate)

Activate the Kanban board for the project. Use template: `.agents/templates/kanban-template.md`. Save to `artifacts/output/04-planning/kanban.md`.

Before development starts, `@product-manager` reviews the prioritized backlog:
- **Gate Check:** `@product-manager` confirms the prioritized backlog on the Kanban board is correct and aligned with sprint deadlines. Once confirmed, the `@tech-lead` activates the tasks by moving them to the **To Do** column on the Kanban board.

### Step 5: Spike (if needed)
If the tech lead identified unknowns or risks, investigate before committing:
- Explore the risky area — prototype, benchmark, research
- Report findings and update the execution plan accordingly
- If no risks identified, skip this step

### Step 6: Dev Loop (the core build cycle)

**Multi-developer mode:** If the execution plan has 2+ independent tasks (see workflow.md §1.6):

```
@tech-lead: setup worktrees + assign tasks
     ↓
@developer-1 ──→ @code-reviewer ──→ approved? ──→ ready to merge
@developer-2 ──→ @code-reviewer ──→ approved? ──→ ready to merge   (parallel)
@developer-N ──→ @code-reviewer ──→ approved? ──→ ready to merge
     ↓
@tech-lead: merge all approved branches → integration test → cleanup
```

#### 6.1 Setup (`@tech-lead`)
- Create worktrees: `git worktree add ~/.local/share/opencode/worktree/worktree-dev-N -b feat/{branch}/task-N`
- Assign tasks with non-overlapping files (see §1.6 Task Assignment table)

#### 6.2 Implement (`@developer-N` — each in own worktree, parallel)
- **Spec Alignment & Read Check:** Ensure `@developer-N` has explicitly loaded and read `product-spec.md` and `user-stories.md` before coding.
- **Role-Based Guardrails:** Follow the **Role tag** (`FE`/`BE`/`Full-Stack`) assigned by `@tech-lead` in the Task Assignment table:
  - **FE:** Focus strongly on **visual accuracy, UI polish, and premium user experience**. If any frontend spec is unclear, pause and initiate a conversation with the **human user, `@product-designer`, or `@product-manager`** to clarify.
  - **BE:** Focus on clean API contracts, model safety, and robust error flows. If any backend spec is unclear, pause and initiate a conversation with the **human user or `@product-manager`** to clarify.
  - **Full-Stack:** Both FE and BE communication channels are available. Apply both visual and backend quality standards.
- Write code + tests in assigned worktree conforming 100% to verified specs.
- Run lints and unit tests locally
- Commit to feature branch
- Signal completion via memory:
  ```
  @memory-controller write agent-notes/developer-notes.md
  ### [CODE] [dev-N] Task complete: {task name} [date: YYYY-MM-DD] [agent: @developer]
  {brief note on implementation, any patterns discovered, or pitfalls}
  **Status:** active
  ```

#### 6.3 Review (`@code-reviewer` — per developer branch)
- Review each developer's branch independently
- Check correctness, patterns, security, test coverage
- If issues found → developer fixes in their worktree → re-review
- **Loop limit:** Max 2 review cycles per branch. After that, escalate to `@tech-lead`.
- Mark branch as **approved** when review passes

#### 6.4 Integration merge (`@tech-lead`)
Only after all branches are approved by `@code-reviewer`:

```bash
# Switch to main working branch
BRANCH=$(git branch --show-current)

# Merge in dependency order (if any), otherwise any order
git merge feat/${BRANCH}/task-1 --no-ff -m "feat: [task-1 description]"
git merge feat/${BRANCH}/task-2 --no-ff -m "feat: [task-2 description]"
git merge feat/${BRANCH}/task-3 --no-ff -m "feat: [task-3 description]"
```

#### 6.5 Integration test (`@tech-lead`)
After all merges:

```bash
# Run full test suite
npm test  # or equivalent for the project

# Run lints
npm run lint
```

- If tests pass → proceed to Step 6.6
- If tests fail → identify which merge caused the failure:
  - `git bisect` or revert last merge and test again
  - Assign fix to the developer whose branch broke integration
  - Re-merge after fix

#### 6.6 Cleanup (`@tech-lead`)
```bash
# Remove worktrees
git worktree remove ~/.local/share/opencode/worktree/worktree-dev-1
git worktree remove ~/.local/share/opencode/worktree/worktree-dev-2
git worktree remove ~/.local/share/opencode/worktree/worktree-dev-3

# Delete feature branches
git branch -d feat/${BRANCH}/task-1 feat/${BRANCH}/task-2 feat/${BRANCH}/task-3
```

#### 6.7 Update kanban (`@product-manager` / `@tech-lead`)
- Move completed tasks to "Done" in `artifacts/output/04-planning/kanban.md`
- Log cycle time per task

---

**Single-developer mode:** If tasks are sequential or the project doesn't support worktrees:

```
@developer implements → @code-reviewer reviews → fix if needed → merge
```

1. **Implement** — developer writes code + tests, runs linters
2. **Review** — code-reviewer checks correctness, security, patterns
3. **Fix** — if reviewer found issues, developer addresses them
4. **Re-review** — only if significant changes were made

**Loop limit:** Max 2 review cycles per task. After 2 cycles of the same issue, escalate to @tech-lead.

### Step 7: Quality Gates (parallelizable)

Steps 7a-7c can run **in parallel** once dev loop completes.

#### Step 7a: QA ⟨parallel⟩
Invoke `@qa-engineer` to:
1. Write and run comprehensive tests against acceptance criteria (AC-H, AC-U, AC-E)
2. If bugs are found, feed back to developer for fixes
3. Re-test after fixes until all criteria pass
4. Report final coverage and any remaining known issues

**Loop limit:** Max 2 QA-dev cycles per bug. If the same bug resurfaces after 2 fix attempts, escalate to @tech-lead.

#### Step 7b: Security Audit (if applicable) ⟨parallel⟩
Invoke `@security-engineer` when the feature touches:
- Authentication, authorization, or session management
- Sensitive data (PII, payments, health records)
- External APIs or third-party integrations

**Output:** `artifacts/output/06-quality/findings-report.md` (code review — use structure: `Severity, File:Line, Issue, Suggested Fix, Blocker?`)

#### Step 7c: Performance Review (if applicable) ⟨parallel⟩
Invoke `@performance-engineer` when the feature:
- Impacts core user paths (page load, key interactions)
- Handles large data sets or high traffic
- Has defined performance SLAs in the spec

**Output:** `artifacts/output/06-quality/report.md` (QA report — use structure: `Test Run Summary, Pass/Fail by Suite, Open Defects, Release Recommendation`)

### Step 8: PM Verification (gate)
Invoke `@product-manager` to verify the shipped feature:
- Review against the original acceptance criteria
- Check edge cases and error states match the spec
- Accept or reject — if rejected, log gaps and loop back to Step 6

**Loop limit:** Max 2 rejection cycles. If PM rejects a third time:
- If it's a spec problem → go back to `product-design` skill
- If it's a build problem → escalate to @tech-lead for root cause

### Step 9: Documentation
Invoke `@technical-writer` to:
- Document APIs, configs, and interfaces
- Update README and usage examples
- Write migration guides if needed

## Completion criteria

A feature is done when:
- [ ] All tasks in execution plan are complete
- [ ] Code review passes with no blocking issues
- [ ] QA validates all acceptance criteria pass (AC-H, AC-U, AC-E)
- [ ] PM signs off on the feature
- [ ] Documentation is updated
- [ ] Security audit passes (if applicable — zero Critical/High)
- [ ] Performance benchmarks within SLAs (if applicable)

## Handoff
- Feature ready to ship → load `product-launch`
- Need to build another feature → restart this skill
- Production incident → load `incident-response`

---

## State Machine Integration

The pipeline state machine (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run via `@executor`:
```bash
node .agents/scripts/orchestrator_state.js status
```

If pipeline is uninitialized, run `squad` first (or `init` directly). Then run `next` to confirm the project is in the development phase and identify which artifacts are missing.

### At End — Record Completion

Record the execution plan first (it gates development):

```bash
node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact 04-planning/execution-plan.md
```

Then record each significant code change. For every module, feature, or test file produced, call `complete` with the producing agent (`developer`, `code-reviewer`, `qa-engineer`, etc.) and the relative artifact path. Example:

```bash
node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 04-planning/kanban.md
node .agents/scripts/orchestrator_state.js complete --agent qa-engineer --artifact 06-quality/report.md
```

**Important:** every `complete --agent developer|architect|tech-lead` call automatically refreshes the code-graph via `ensure_graph.js code`. This means the next agent that reads the code-graph (e.g., a follow-up `tech-lead` planning the next iteration) gets a current view without having to manually trigger a scan.

If `next` returns `advance-phase` after your work, the pipeline is ready for `launch`. If it returns `generate-artifacts`, the response lists which required artifacts are still missing.
