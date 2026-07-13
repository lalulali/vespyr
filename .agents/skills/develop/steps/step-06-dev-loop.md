---
step: 6
name: Dev Loop
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-04 completed
  - step-05 completed (or skipped)
---

# Step 6 — Dev Loop

The core implementation step. Write code, run tests, get reviewed, merge.

## Mode selection

**Multi-developer mode** — if the execution plan has 2+ independent tasks:
1. `@tech-lead` creates worktrees, assigns tasks with non-overlapping files
2. `@developer-N` (each in own worktree, parallel): load specs → implement → test → commit
3. `@code-reviewer` (per branch): review for correctness, security, patterns
4. `@tech-lead` merges approved branches → integration test → cleanup

**Single-developer mode** — sequential or single-file projects:
1. `@developer` implements → `@code-reviewer` reviews → fix if needed → merge

## Role-based guardrails
- **FE:** Focus strongly on **visual accuracy, UI polish, and premium user experience**. If any frontend spec is unclear, pause and initiate a conversation with the **human user, `@product-designer`, or `@product-manager`** to clarify.
- **BE:** Focus on clean API contracts, model safety, and robust error flows. If any backend spec is unclear, pause and initiate a conversation with the **human user or `@product-manager`** to clarify.
- **Full-Stack:** Both FE and BE communication channels are available. Apply both visual and backend quality standards.

## Multi-developer sub-steps

### 6.1 Setup (`@tech-lead`)
- Create worktrees: `git worktree add ~/.local/share/agents/worktree/worktree-dev-N -b feat/{branch}/task-N`
- Assign tasks via the Task Assignment table (non-overlapping files)

### 6.2 Implement (`@developer-N`, parallel)
- `@memory-controller load developer [implement {task name}]` — seed context before coding
- `@memory-controller preflight developer [implement {task name}]` — validate high-risk domains
- Load and digest `product-spec.md` and `user-stories.md` before coding
- Write code + tests conforming 100% to verified specs
- Run lints and unit tests locally
- Commit to feature branch
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
- Max 2 review cycles per branch. After that, escalate to `@tech-lead`
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
```bash
# Remove worktrees
git worktree remove ~/.local/share/agents/worktree/worktree-dev-1
git worktree remove ~/.local/share/agents/worktree/worktree-dev-2
git worktree remove ~/.local/share/agents/worktree/worktree-dev-3

# Delete feature branches
git branch -d feat/${BRANCH}/task-1 feat/${BRANCH}/task-2 feat/${BRANCH}/task-3
```

### 6.7 Update Kanban
- Move completed tasks to "Done" in `artifacts/output/04-planning/kanban.md`
- Log cycle time per task

## Loop limit
Max 2 review cycles per task. After 2 cycles of unresolved issues, escalate to `@tech-lead`.

## Output
Merged code on the working branch, updated kanban board.

## Delegation
- Reads: @reader (specs, user stories, codebase)
- Writes: @writer (source code, test files, commit messages)
- Runs: @executor (worktree setup, npm test, npm run lint, git merge)
- Memory: @memory-controller (developer notes write)
