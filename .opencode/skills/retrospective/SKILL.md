---
name: retrospective
description: Post-cycle review — extract lessons, calibrate estimates, improve processes, compact memory, and update team knowledge
---

## What this skill does

After any major phase, iteration cycle, or incident, this skill helps the team reflect on what happened, learn from it, and improve for next time. It is the improvement engine that makes every subsequent cycle better than the last.

**Use after:** completing a development cycle, shipping a launch, resolving an incident, at regular intervals (every 2-4 weeks), or after 5 iteration cycles (mandatory trigger).

## Workflow steps

### Step 1: Gather Data (parallelizable)

Steps 1a and 1b can run **in parallel** to save time.

#### Step 1a: Quantitative Data ⟨parallel⟩
Invoke `@project-manager` to collect:
- `artifacts/output/04-planning/execution-plan.md` — planned vs. actual effort
- `artifacts/output/05-project-management/project-plan.md` — timeline adherence
- `artifacts/memory/blockers-and-risks.md` — blockers encountered and resolution times
- Code review metrics — number of review cycles, blocking issues found
- QA metrics — bugs found, test coverage, regression rate
- Launch metrics — deployment success rate, rollback frequency

#### Step 1b: Qualitative Data ⟨parallel⟩
Invoke `@project-manager` to collect:
- `artifacts/memory/lessons-learned.md` — accumulated insights from all agents
- `artifacts/memory/agent-notes/` — per-agent observations and frustrations
- Any incident post-mortems from `artifacts/output/08-incidents/`
- User feedback and support tickets (if applicable)

**Output:** `artifacts/output/09-retro/data-collection.md`

### Step 2: Review Cycle (parallelizable)

Steps 2a-2c can run **in parallel** since they examine different dimensions.

#### Step 2a: Execution Review ⟨parallel⟩
Invoke `@tech-lead` to review execution quality:
- Were estimates accurate? Compare planned vs. actual for each task
- Were dependencies correctly identified and managed?
- Were spikes effective at reducing unknowns?
- Was the critical path accurate? Where did the plan diverge?
- What patterns caused rework (spec gaps, architecture unknowns, scope creep)?

**Output:** `artifacts/output/09-retro/execution-review.md`

#### Step 2b: Process Review ⟨parallel⟩
Invoke `@project-manager` to review team process:
- Were handoffs smooth? Where did information get lost between agents?
- Were blockers resolved quickly enough? Which ones caused delays?
- Did any feedback loops hit the 2-cycle limit? What caused the impasse?
- Were the right agents involved at the right times?
- Were any agents idle when they could have been productive?

**Output:** `artifacts/output/09-retro/process-review.md`

#### Step 2c: Product Review ⟨parallel⟩
Invoke `@product-manager` and `@product-designer` to review:
- Did the shipped feature match the PRD requirements?
- Were acceptance criteria complete enough, or did gaps emerge during QA?
- Did the product spec accurately represent what users needed?
- Were there design-spec mismatches that caused rework?
- What user feedback has come in since launch?

**Output:** `artifacts/output/09-retro/product-review.md`

### Step 3: Architecture Review

Invoke `@architect` to review:
- Did the architecture hold up under implementation?
- Were ADRs accurate, or did reality diverge from the plan?
- What technical debt was incurred, and is it acceptable?
- Are there architectural changes needed before the next cycle?

**Output:** `artifacts/output/09-retro/architecture-review.md`

### Step 4: Synthesize Action Items

Invoke `@project-manager` to synthesize all reviews into actionable improvements:

For each action item, specify:
- **What** needs to change
- **Why** (linked to a specific observation from the reviews)
- **Who** owns the action item
- **When** it should be completed by
- **How** to verify it was done

Categorize action items:
- **Process improvements** — changes to workflow, handoffs, templates
- **Estimation calibration** — updated velocity and complexity benchmarks
- **Knowledge updates** — new patterns, conventions, or guardrails to document
- **Tooling improvements** — automation, CI/CD, monitoring gaps
- **Architecture decisions** — debt to pay down, refactoring priorities

**Output:** `artifacts/output/09-retro/action-items.md`

### Step 5: Update Shared Memory + Compaction

Invoke `@project-manager` to update the team's collective knowledge:

**Updates:**
- Append process improvements to `artifacts/memory/patterns-and-conventions.md`
- Append estimation benchmarks to `artifacts/memory/agent-notes/tech-lead-notes.md`
- Update `artifacts/memory/project-context.md` with new technical decisions
- Clear resolved blockers in `artifacts/memory/blockers-and-risks.md`
- Update `artifacts/memory/active-decisions.md` with new process decisions
- Append lessons to `artifacts/memory/lessons-learned.md`
- Write session summary to `artifacts/memory/session-summaries/latest.md`

**Memory compaction (every 3 retros or monthly):**
Following the compaction protocol in workflow.md §12:
1. Archive resolved decisions → `artifacts/memory/archive/decisions-YYYY-MM.md`
2. Archive resolved blockers → `artifacts/memory/archive/blockers-YYYY-MM.md`
3. Summarize old lessons (keep only last 3 months active)
4. Compact agent notes (keep only 10 most recent entries per agent)
5. Remove superseded patterns from `patterns-and-conventions.md`

**Target:** Each active memory file stays under ~2,000 words.

## Output artifacts
- `artifacts/output/09-retro/data-collection.md`
- `artifacts/output/09-retro/execution-review.md`
- `artifacts/output/09-retro/process-review.md`
- `artifacts/output/09-retro/product-review.md`
- `artifacts/output/09-retro/architecture-review.md`
- `artifacts/output/09-retro/action-items.md`

## When to use
Use this when:
1. A development cycle is complete (after shipping to production)
2. After a product launch (after the initial monitoring period)
3. After resolving a production incident (blameless review)
4. At regular intervals (every 2-4 weeks during ongoing iteration)
5. After 5 iteration cycles (mandatory — see product-iteration §Step 6)
6. When the team feels "something isn't working" but can't articulate what

## Key principles
- **Blameless.** Focus on systems and processes, not individual failures. "What about the system allowed this to happen?"
- **Action-oriented.** Every observation must produce at least one concrete action item with an owner.
- **Honest.** Celebrate wins AND confront uncomfortable truths. Skimming over problems guarantees they recur.
- **Specific.** "Communication was bad" is not actionable. "The handoff between designer and architect didn't include error states" is actionable.
- **Follow-up.** Action items from retros must be tracked in the next cycle's planning. If they're not actionable in the next cycle, refine them until they are.

## Handoff
- After retro, load `product-iteration` to apply learnings to the next cycle
- After retro, load `product-development` if new features emerged from the retrospective
- After retro, load `product-exploration` (or `game-product-exploration` for game projects) if strategic pivot is needed based on findings