---
name: retro
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
- Active blockers and resolution times:
  ```
  @memory-controller load blockers
  ```
- Code review metrics — number of review cycles, blocking issues found
- QA metrics — bugs found, test coverage, regression rate
- Launch metrics — deployment success rate, rollback frequency

#### Step 1b: Qualitative Data ⟨parallel⟩
Invoke `@project-manager` to collect:
- Lessons and agent notes from this cycle:
  ```
  @memory-controller load project-manager [retrospective data gathering]
  ```
  Then load full files for deep review:
  ```
  @memory-controller load-full lessons-learned.md
  @memory-controller load-full agent-notes/developer-notes.md
  @memory-controller load-full agent-notes/tech-lead-notes.md
  ```
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

Invoke `@project-manager` to update the team's collective knowledge via `@memory-controller`:

**Updates — use these exact commands:**

```
@memory-controller write patterns-and-conventions.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @project-manager]
{process improvement discovered this cycle}
**Status:** active

@memory-controller write agent-notes/tech-lead-notes.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @tech-lead]
{estimation benchmark — planned vs actual, variance reason}
**Status:** active

@memory-controller write project-context.md
### [ARCH] {title} [date: YYYY-MM-DD] [agent: @architect]
{new technical decision or constraint}
**Status:** active

@memory-controller write active-decisions.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @project-manager]
{new process decision}
**Status:** active

@memory-controller write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @project-manager]
{lesson learned this cycle}
**Status:** active
```

For each resolved blocker, mark it resolved:
```
@memory-controller write blockers-and-risks.md
### [RISK] {original title} [date: YYYY-MM-DD] [agent: @project-manager] [RESOLVED: YYYY-MM-DD]
{resolution summary}
**Status:** resolved
```

**Session summary (always last):**

After all memory updates are written, write the session summary:

```
@memory-controller session-write
Worked on: {what was done this retrospective cycle}
Decisions made:
- {key decision 1}
- {key decision 2}
- {key decision 3}
Next step: {first action item from action-items.md}
New blockers: {any new blockers, or "none"}
```

This compresses the entire retrospective into ~100 tokens for the next session's Tier 1 context.

**Memory compaction (automatic — triggered by @memory-controller):**

`@memory-controller` compacts files automatically when they exceed their word thresholds. During retrospective, explicitly trigger compaction on all files to ensure they are clean:

```
@memory-controller compact active-decisions.md
@memory-controller compact patterns-and-conventions.md
@memory-controller compact lessons-learned.md
@memory-controller compact blockers-and-risks.md
```

The controller will:
1. Move `resolved` and `stale` entries (> 90 days, no `[CRITICAL]` tag) to `artifacts/memory/archive/YYYY-QN/`
2. Update `artifacts/memory/archive/index.json` with searchable metadata for every archived entry
3. Rewrite each file with only active entries
4. Report: entries kept, entries archived, new file size

**Nothing is deleted.** All archived content remains searchable via `@memory-controller search [query]`.

**Run status check after compaction:**

```
@memory-controller status
```

Confirms all files are within thresholds and the archive index is up to date.

### Step 5b: Automated Archive Review (new)

After compaction, run an automated review of entries about to be archived:

1. **Generate archive digest** — query `artifacts/memory/archive/index.json` for entries archived in this session
2. **Auto-exclude protected entries:**
   - Entries with `[CRITICAL]` tag → NEVER archive (keep active)
   - Entries with `referenced_by.length > 3` → NEVER archive (highly connected)
   - Entries less than 7 days old → NEVER archive
3. **Write digest to:** `artifacts/output/09-retro/archive-review.md`

   ```markdown
   # Archive Review Digest
   *Generated: {YYYY-MM-DD}*

   ## Auto-Protected (stayed active)
   | Entry | Reason |
   |-------|--------|
   | [{domain}] {title} | [CRITICAL] tag |
   | [{domain}] {title} | 5 references |

   ## Auto-Archived
   | Entry | Age | Status | Summary |
   |-------|-----|--------|---------|
   | [{domain}] {title} | 95 days | stale | {summary} |

   ## Human Override Queue
   Review the auto-archived entries above. If any should remain active:
  1. Edit the source memory file and remove `[RESOLVED]` or `[ARCHIVED]` status
  2. Or add `[CRITICAL]` tag to permanently protect it
  ```

4. **The swarm does NOT block on human input.** Archive proceeds automatically. Humans review asynchronously.

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
5. After 5 iteration cycles (mandatory — see iterate §Step 6)
6. When the team feels "something isn't working" but can't articulate what

## Key principles
- **Blameless.** Focus on systems and processes, not individual failures. "What about the system allowed this to happen?"
- **Action-oriented.** Every observation must produce at least one concrete action item with an owner.
- **Honest.** Celebrate wins AND confront uncomfortable truths. Skimming over problems guarantees they recur.
- **Specific.** "Communication was bad" is not actionable. "The handoff between designer and architect didn't include error states" is actionable.
- **Follow-up.** Action items from retros must be tracked in the next cycle's planning. If they're not actionable in the next cycle, refine them until they are.

## Handoff
- After retro, load `iterate` to apply learnings to the next cycle
- After retro, load `develop` if new features emerged from the retrospective
- After retro, load `explore-idea` (or `explore-game-idea` for game projects) if strategic pivot is needed based on findings