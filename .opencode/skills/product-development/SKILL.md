---
name: product-development
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

**Required inputs:**
- `artifacts/output/02-strategy/product-spec.md`
- `artifacts/output/02-strategy/requirements.md` (business context)
- `artifacts/output/02-strategy/user-stories.md` (acceptance criteria and technical requirements)

### Step 2: Architecture
Invoke `@architect` to:
- Design system architecture and component interactions
- Select tech stack with trade-off rationale
- Define data models, schemas, and API contracts
- Document ADRs in `artifacts/output/03-architecture/`
- Identify technical risks and mitigation strategies

**Output:** `artifacts/output/03-architecture/adr-NNN-*.md`

### Step 3: Architecture Review + Execution Planning (parallelizable)

Steps 3a and 3b can start together. The tech lead reviews architecture while also beginning to plan execution.

#### Step 3a: Architecture Review
Invoke `@tech-lead` to review the architecture:
- Does the architecture support all spec requirements?
- Are there missing components or interfaces?
- Are there simpler alternatives worth considering?
- Feed findings back to architect if gaps are found

**Loop limit:** If architect and tech-lead disagree, max 2 revision cycles, then escalate to @founder.

#### Step 3b: Execution Planning ⟨after 3a resolves⟩
Invoke `@tech-lead` to:
- Break work into small, independent tasks (1-4 hours each)
- Define task dependencies and parallelization opportunities
- Estimate effort for each task (small/medium/large)
- Identify risky areas that need investigation (spikes)
- **Mark which tasks can run in parallel** — this is critical for dev loop efficiency

**Output:** `artifacts/output/04-planning/execution-plan.md`

### Step 4: Plan Review + Project Setup (parallelizable)

#### Step 4a: Plan Review ⟨gate⟩
Invoke `@product-manager` to review and approve the execution plan:
- Does the plan deliver the highest priority items first?
- Are scope trade-offs aligned with business goals?
- Accept or adjust scope based on effort estimates

**Gate check:** PM must approve before dev starts.

#### Step 4b: Kanban Setup
Invoke `@project-manager` to:
- Create/update `artifacts/output/05-project-management/kanban.md`
- Add all tasks from execution plan
- Set WIP limits and priorities

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
- Write code + tests in assigned worktree
- Run lints and unit tests locally
- Commit to feature branch
- Signal completion in `artifacts/memory/agent-notes/developer-notes.md`

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

#### 6.7 Update kanban (`@project-manager`)
- Move completed tasks to "Done" in `artifacts/output/05-project-management/kanban.md`
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

**Output:** `artifacts/output/06-quality/findings-report.md`

#### Step 7c: Performance Review (if applicable) ⟨parallel⟩
Invoke `@performance-engineer` when the feature:
- Impacts core user paths (page load, key interactions)
- Handles large data sets or high traffic
- Has defined performance SLAs in the spec

**Output:** `artifacts/output/06-quality/report.md`

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
