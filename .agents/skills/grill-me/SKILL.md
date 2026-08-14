---
name: grill-me
description: Runs a 7+1-branch Socratic decision tree that stress-tests requirements, specs, and architecture choices one assumption at a time — until you can articulate the decision tree in writing. Output is a decision log that survives the conversation. Use when you want to be grilled on a plan, design, or idea before committing.
metadata:
  version: "2.0"
  last_updated: "2026-07-10"
---

# Grill-Me — Socratic Stress-Test Loop

## What this skill does

Runs a relentless Socratic interview, branch by branch, until the user can articulate the decision tree in writing. Every assumption gets challenged. Every trade-off gets documented. The output is a decision log that survives the conversation.

## When to use

- User says "grill me on this plan/architecture/spec/idea"
- Before /validate-idea exits the loop phase
- Before any ADR is written (forces decisions to be explicit)
- After /design produces a PRD (sanity check before /develop)

## When NOT to use

- For open-ended brainstorming (use /validate-idea first)
- For technical debugging (use /incident instead)
- For retrospective analysis (use /retro instead)

## Prerequisites

- A concrete artifact to interrogate (plan, spec, architecture, hypothesis, design)
- If no artifact exists, run /validate-idea first to produce a brief

## The 7+1 decision tree

1. **Product requirements** — who is the user, what job are they hiring this for, how will we know it worked?
   - *"If the user couldn't use this feature at all, what would they do instead?"*
   - *"Is this solving a real pain point or a hypothetical one?"*
   - *"What behavior change are we trying to drive — and is this the simplest way to drive it?"*

2. **Architecture trade-offs** — what did we choose, what did we reject, why is the chosen option reversible (or not)?
   - *"If we had to rip this out in 6 months, how painful would that be?"*
   - *"What's the one alternative you considered and rejected — and why specifically?"*
   - *"Does this decision lock us into any vendor, pattern, or constraint we can't escape?"*

3. **Edge cases** — what happens at N=0, N=∞, at the failure mode of every external dependency?
   - *"What happens when the external API is down for 30 minutes? An hour? A day?"*
   - *"What does the empty state look like — and is it intentional or an oversight?"*
   - *"What's the maximum input size this needs to handle — and what breaks first when we exceed it?"*

4. **Codebase logic** — where does this touch existing code, what does it assume, what assumptions are still unverified?
   - *"Which 3 files have the highest blast radius from this change — have you checked their dependents?"*
   - *"What existing behavior does this change — intentionally or accidentally?"*
   - *"Is there an assumption about data shape, timing, or ordering that hasn't been verified in the actual code?"*

5. **Cost & timeline** — what does this cost, what's the rollback plan, what's the off-ramp if it's wrong?
   - *"If this takes 3x longer than estimated, what's the first thing we cut?"*
   - *"What's the smallest increment we can ship that still delivers value — and how long does that take?"*
   - *"What ongoing maintenance cost does this introduce?"*

6. **Risks** — what's the worst plausible outcome, what's the second-worst, how do we detect each?
   - *"If this goes badly, how will we know before users tell us?"*
   - *"What's the blast radius if this fails — does it take down other systems or is it contained?"*
   - *"Is there a compliance, legal, or regulatory angle we haven't considered?"*

7. **Success criteria** — what does done look like, measured how, by when, for whom?
   - *"What metric moves when this ships — and by how much is considered success vs. failure?"*
   - *"Who declares this 'done' — and do they agree on what 'done' means?"*
   - *"What's the counter-metric — the thing we're willing to sacrifice for this improvement?"*

8. **Open floor** — what haven't we covered? Any concern, observation, or request that doesn't fit branches 1-7. The user sets the topic; you drill into it with the same Socratic rigor as a formal branch.
   - *"What's the one thing you're still worried about that we haven't discussed?"*
   - *"If you were the person inheriting this 6 months from now, what would you wish we'd documented?"*
   - *"Is there a stakeholder or team we haven't consulted whose input would change this?"*

## Workflow

### Step 1: Scope lock

Ask the user which branch to start at. Default: 1 (Product requirements). Recommend starting at 1 unless the user has already articulated the user/job-to-be-done clearly.

After branches 1-7 are exhausted, always offer branch 8 (Open floor) before moving to the consistency check.

### Step 2: Question loop

For each open question in the active branch:
1. Ask the question, ONE at a time
2. Provide your recommended answer with reasoning
3. Wait for the user's response (recommend / counter / refine)
4. Update the running decision log

**Stop asking questions in a branch when:**
- All open questions are resolved, OR
- The user explicitly says "skip the rest of this branch"

**Move to the next branch when:**
- The current branch is exhausted, OR
- The user says "next branch"

### Step 3: Decision log

After each resolved question, write to artifacts/memory/active-decisions.md:

```
## AD-YYYY-MM-DD — <branch> — <decision title>

**Decision:** <the resolved choice, one line>

**Rationale:**
- <key trade-off that was weighed>
- <what was rejected and why>

**Status:** <Open | Complete>
```

One entry per resolved question. Keep entries terse — the log is read back in Step 4.

### Step 4: Cross-branch consistency check

After all 7+1 branches are exhausted, scan the decision log for contradictions:
- Does branch 3 (edge cases) contradict branch 1 (product requirements)?
- Does branch 6 (risks) invalidate branch 2 (architecture trade-offs)?
- Does branch 7 (success criteria) require something branch 5 (cost) didn't budget for?
- Does branch 8 (open floor) surface anything that invalidates decisions from branches 1-7?

If contradictions found, present them to the user and ask which branch to revisit.

### Step 5: Lock + handoff

Append a summary block to `artifacts/output/{current-phase}/grill-me-decisions.md` with:
- Date
- Branches covered
- Number of decisions resolved
- Cross-branch contradictions found
- Handoff recommendation (e.g., "ready for /design" or "needs /validate-idea first")

> **Path note:** `{current-phase}` maps to the active phase directory under `artifacts/output/` (e.g., `03-strategy`, `04-architecture`, `05-planning`). If the active phase is unknown, use `artifacts/memory/grill-me-decisions.md` as fallback.

## Output artifacts

- artifacts/memory/active-decisions.md (running decision log)
- artifacts/output/{current-phase}/grill-me-decisions.md (final summary)

## State machine integration

At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact grill-me-decisions.md`

## Anti-patterns to avoid

- **Do not ask multiple questions at once.** The interview loses its depth if you bundle.
- **Do not recommend the user's first answer uncritically.** "That's interesting — what if the opposite is true?" is more useful than "yes, that works."
- **Do not skip branches because they feel settled.** The user often hasn't articulated the obvious-to-them decision; making it explicit catches conflicts later.
- **Do not let the user ramble into a different branch mid-question.** Gently redirect: "Good point — let's park that and circle back when we hit branch 5."
