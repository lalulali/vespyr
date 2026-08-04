---
step: 6
name: Dev Loop
prerequisites:
  - step-04 completed
  - step-05 completed (or skipped)
delegation:
  reads: "@reader (specs + codebase; per delegation-policy.md multi-file + large files)"
  writes: "@writer (source code, test files; per delegation-policy.md multi-file output)"
  runs: "@executor (worktree validation, npm test, npm run lint, git merge; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 6 — Dev Loop

The core implementation step. Write code, run tests, get reviewed, merge.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 6`
## Mode selection

**Multi-developer mode** — if the execution plan has 2+ independent tasks:
1. `@tech-lead` verifies worktrees from step 3b (re-allocates if spike changed the plan), assigns tasks with non-overlapping files
2. `@developer-N` (each in own worktree, parallel): load specs → implement → test → commit
3. `@code-reviewer` (per branch): review for correctness, security, patterns
4. `@tech-lead` merges approved branches → integration test → cleanup

**Single-developer mode** — sequential or single-file projects:
1. `@developer` implements → `@code-reviewer` reviews → fix if needed → merge

## Role-based guardrails
- **FE:** Focus on **visual accuracy, UI polish, and premium user experience**. If any frontend spec is unclear, resolve internally first: consult `@product-designer` for design ambiguity, `@product-manager` for requirement ambiguity. Only escalate to the human user if the persona chain cannot resolve the ambiguity within the swarm.
- **BE:** Focus on clean API contracts, model safety, and robust error flows. If any backend spec is unclear, resolve internally first: consult `@product-manager` for requirement ambiguity, `@architect` for technical constraints. Only escalate to the human user if the persona chain cannot resolve the ambiguity within the swarm.
- **Full-Stack:** Both FE and BE communication channels are available. Apply both visual and backend quality standards.

## Multi-developer sub-steps

### 6.1 Setup (worktrees must already exist from step 3b)

**The harness MUST NOT proceed to 6.2 unless worktrees are confirmed to exist.**

Verify worktrees created in step 3b:
```bash
node .agents/scripts/worktree.js list
```

Gate logic:
- **If `worktree.js list` shows worktrees** → compare the worktree count to the number of parallel task slots in the execution plan. If they match → proceed. `@tech-lead` loads the Task Assignment table from `execution-plan.md` and assigns tasks via the Kanban board. If the counts differ → **HALT** (spike changed the plan after worktree creation). Escalate to `@tech-lead` for re-allocation.
- **If no worktrees exist AND the execution plan has 2+ independent tasks** → **HALT**. Escalate to `@tech-lead`. Either step 3b worktree creation failed, or spike findings (step 5) changed the plan and invalidated the worktree allocation. `@tech-lead` must re-create or re-allocate worktrees before continuing.
- **If no worktrees exist AND the execution plan is single-developer** → proceed in single-developer mode. No worktrees needed.

### 6.2 Implement (`@developer-N`, parallel)
- `@memory-controller load developer [implement {task name}]` — seed context before coding
- `@memory-controller preflight developer [implement {task name}]` — validate high-risk domains
- Move task from `### To Do` to `### In Progress` in `artifacts/output/05-planning/kanban.md` upon picking up work
- Load and digest `product-spec.md` and `user-stories.md` before coding
- Write code + tests conforming 100% to verified specs
- Run lints and unit tests locally
- Commit to feature branch
- Move task from `### In Progress` to `### Review` in `artifacts/output/05-planning/kanban.md` upon commit
- Signal completion via `@memory-controller`:
  ```
  @memory-controller write agent-notes/developer-notes.md
  ### [CODE] [dev-N] Task complete: {task name} [date: YYYY-MM-DD] [agent: @developer]
  {brief note on implementation, any patterns discovered, or pitfalls}
  **Status:** active
  ```

### 6.3 Review (`@code-reviewer`, per branch)
- Review each developer's branch independently
- Check correctness, patterns, security, test coverage
- If issues found → developer fixes in their worktree → re-review
- Max 2 review cycles per branch. After that, move task to `### Blocked` in `kanban.md` and escalate to `@tech-lead`
- Mark branch as **approved** when review passes

### 6.4 Integration merge (`@tech-lead`)
Only after all branches are approved by `@code-reviewer`:
```bash
# Switch to main working branch
BRANCH=$(git branch --show-current)

# Merge in dependency order (if any), otherwise any order
git merge feat/${BRANCH}/task-1 --no-ff -m "feat: [task-1 description]"
git merge feat/${BRANCH}/task-2 --no-ff -m "feat: [task-2 description]"
git merge feat/${BRANCH}/task-3 --no-ff -m "feat: [task-3 description]"
```

### 6.5 Integration test (`@tech-lead`)
```bash
# Run full test suite
npm test  # or equivalent for the project

# Run lints
npm run lint
```
- If tests pass → proceed to Cleanup
- If tests fail → identify which merge caused the failure:
  - `git bisect` or revert last merge and test again
  - Assign fix to the developer whose branch broke integration
  - Re-merge after fix

### 6.6 Cleanup (`@tech-lead`)

Delegate to `@executor`:
```bash
node .agents/scripts/worktree.js clean-all
```

This removes all worktrees and deletes their feature branches, with state tracked in `.agents/state/loop-state.json`. The `--force` flag handles uncommitted changes gracefully.

### 6.7 Update Kanban (`artifacts/output/05-planning/kanban.md`)

Follow these explicit step-by-step state transitions for every task during the dev loop:

1. **Task Intake (To Do → In Progress)**:
   - When `@developer-N` picks up a task, update `kanban.md` under `### In Progress`.
   - Format: `- [ ] [Task-ID] Task Name (assigned to @developer-N) [Started: YYYY-MM-DD HH:mm]`

2. **Submission for Review (In Progress → Review)**:
   - When implementation is complete and committed to feature branch, update `kanban.md` under `### Review`.
   - Format: `- [ ] [Task-ID] Task Name (awaiting @code-reviewer) [Submitted: YYYY-MM-DD HH:mm]`

3. **Blocker / Escalation (In Progress / Review → Blocked)**:
   - If a task is blocked by external dependencies or fails 2 review cycles, move entry under `### Blocked`.
   - Format: `- [ ] [Task-ID] Task Name — BLOCKED: {Reason / Escalated to @tech-lead}`

4. **Integration Complete (Review → Done)**:
   - When `@tech-lead` merges the approved branch and integration tests pass, move entry under `### Done`.
   - Change checkmark to completed (`- [x]`).
   - Record completion timestamp and calculate cycle time:
     `[Completed: YYYY-MM-DD HH:mm] [Cycle Time: X hours Y mins]` (where `Cycle Time = Completed Time - Started Time`).

## Loop limit
Max 2 review cycles per task. After 2 cycles of unresolved issues, escalate to `@tech-lead`.

## Output
Merged code on the working branch, updated kanban board.

## Delegation
- **Reads:** @reader for specs, user stories, and codebase files
- **Writes:** @writer for source code, test files, commit messages
- **Runs:** @executor for worktree validation, npm test, npm run lint, git merge
- **Memory:** @memory-controller for developer notes

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 6`
