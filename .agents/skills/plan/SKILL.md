---
name: plan
description: Create an execution plan from existing specs — standalone, outside the full develop cycle. Use when the user says "plan out how we build this", "break this spec into tasks", "how long will this take", or invokes /plan.
metadata:
  version: "2.0"
  last_updated: "2026-10-07"
---
# Plan — Execution Planning

<!-- router-skill -->

## Persona delegation
This skill delegates to `@tech-lead`, which produces the execution plan (task breakdown, estimates, dependency analysis, parallelism assessment).

**What each side actually provides.** An audit checked this claim against the delegate and found it overstated: `tech-lead.md` carried persona stance and a memory contract but **no decomposition decision tree and no estimation method** — the two things credited to it here. Both are now real:

| This skill file | `@tech-lead` |
|---|---|
| Structure, template, the gate, the halt conditions | Persona stance, challenge rules, memory contract |
| **Decomposition method** (Step 4) | **Estimation method** (`.agents/agents/tech-lead.md`) |
| Two-surfaces contract, tracker wiring | Elicitation hand-off after a draft |

Do not assume the delegate supplies something this file does not name. If a method is needed and
neither side has it, that is a gap to report — not one to improvise silently.

## Two surfaces — every step

`/plan` ends by telling the owner two different things, and they must not be confused:

- **Document surface** — `execution-plan.md` carries the machine record: task IDs, estimates,
  dependencies, risks. Plain sentence first, then the table an implementer needs.
- **Chat surface** — the reply carries the plain sentence, the consequence, and the next action.
  No template field names (`Est. (h)`, `Depends On`), no table row IDs as the answer, no internal
  labels. A reader who has never seen this engine must be able to act on the sentence alone
  (`.agents/references/vespyr-dna.md` §Two surfaces).

State the consequence, not the label. "18 tasks" is not an answer — "18 tasks, 31 hours, and the
two you cannot parallelise are T007 and T011 because both write the same migration file" is.

## What this skill does

Takes existing product specs and produces a task breakdown with effort estimates, dependencies, and parallelization opportunities.

## When to use

- "Plan out how we'll build this feature"
- "Break this spec into tasks"
- "How long will this take?"
- Standalone planning outside the full development cycle

## When NOT to use

- When no spec exists (run `/design` first)
- When you need architecture decisions (run the full `/develop` for ADRs)

## Halt conditions
Any one halts planning and escalates to `@tech-lead`:
- No `product-spec.md` exists — planning without a spec produces tasks nobody can verify
- The spec and the existing ADRs contradict each other — resolve the conflict before decomposing; a plan built on an unresolved contradiction schedules the contradiction
- A single task cannot be estimated between 1 and 4 hours — decompose further, or escalate the uncertainty explicitly rather than inflating the estimate
- **The spec and `user-stories.md` contradict each other** — a plan traced to stories that
  contradict the spec schedules the contradiction into the build
- **Two acceptance criteria cannot both hold** — a blind run found AC-02 (status within 5s
  without refresh) in direct tension with AC-06 (500 concurrent users without degrading the
  write path), because the only way to hit AC-02 without a broker is to poll the same store
  AC-06 protects. Halt conditions covered spec-vs-stories and spec-vs-ADRs and never
  criteria-vs-criteria, which is where the expensive conflicts live. **The gate cannot catch
  this** — it checks the shape of a plan, not whether its requirements are satisfiable
  together. Record the conflict, name the decision, and take it to the owner.
- **The spec contains an acceptance criterion no user story covers** — see *planning-time
  stories* below. A criterion with no story cannot be traced to a task, so it silently ships
  unbuilt. This is the same class of defect the `/motion` spec gate was found to tolerate, and
  the Phase 5 gate now enforces it: the gate reads `AC-##` and fails on an unclaimed one.

### Planning-time stories — the sanctioned way to fix an orphan criterion

`/design` owns `user-stories.md`. `/plan` is downstream of it. But an orphan criterion blocks
planning, and the fix is a story.

**Do not silently edit the upstream file.** Write the story, then record that you did:

```markdown
<!-- Added by @tech-lead during /plan Step 4, decomposing AC-05.
     The /plan halt condition "an acceptance criterion no user story covers" fired.
     AC-05 copied verbatim from product-spec.md. Confirm or reassign at review. -->
```

Then, in the plan's own Scope note and Handoff: **"US-007 and US-008 were added during
planning. Confirm or reassign."** A reader must be able to tell which stories came from
requirements work and which from planning work. A story that appears with no provenance is
indistinguishable from one the PM wrote, and nobody can review what they cannot distinguish.

A **non-functional** criterion (accessibility, load, compliance) gets a **constraint story**
with a real user — *"as a keyboard-only user I can act on an exception"* — not a task labelled
"fix accessibility". A criterion with no user has no story, because there is nobody to write
it for.

## Done when
- `artifacts/output/05-planning/execution-plan.md` exists with a numbered task list, per-task estimates, a dependency graph, and a risk register
- Every task is sized 1–4h (spikes capped at 2h) and carries **no dependency you have not
  written down** — see the reconciliation below
- Every dependency is stated in **both** the table's `Depends On` cell and the graph, and the
  two agree
- Parallelizable tasks are explicitly marked and their worktrees allocated
- `execution_plan_check.js check --require-plan` exits 0
- Every `US-###` in `user-stories.md` is served by at least one task, and every task cites a
  `US-###` that exists
- `@tech-lead` has reviewed and approved the plan

## Prerequisites

- `artifacts/output/03-strategy/product-spec.md` exists
- `artifacts/output/03-strategy/user-stories.md` exists — **required, not optional.** Step 2 reads
  it, and the plan's coverage gate traces tasks to `US-###`. A spec with no user stories has no
  verifiable unit of work, which is the halt condition at the top of this file.
- Architecture decisions (ADRs) in `04-architecture/` (recommended)

## Execution plan template

**This template passes its own gate.** A blind run copied it verbatim and got five failures:
no story column at all (so no task could trace to anything), and a dependency graph naming
`T003`, a task the task list did not contain. Copy the shape, not the numbers.

```markdown
# Execution Plan — {feature name}
**Planned:** YYYY-MM-DD
**Greenfield or brownfield:** {brownfield — and the repo it plans against}
**Estimated total:** {N} hours
**Developers needed:** {N}
**Parallelizable tasks:** {N} of {total}
**Planning-time stories:** {none | US-00N added during planning, confirm or reassign}

## Task list

| ID | Task | Est. (h) | Depends On | Parallel With | Story | Assignee | Done |
|---|---|---|---|---|---|---|---|
| T001 | ... | 2 | — | T003 | US-001 | — | [ ] |
| T002 | ... | 3 | T001 | — | US-001 | — | [ ] |
| T003 | ... | 2 | T001 | — | US-002 | — | [ ] |

## Dependency graph

T001 → T002
T001 → T003

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ... | Low/Med/High | Low/Med/High | ... |
```

**`Story` is a column, not a convention.** Every task cites the `US-###` it serves, and the
gate requires the column — traceability buried in a task description is traceability nobody
checks. Every `Depends On` cell above must also appear as an edge in the graph, and every graph
edge must point at a task that exists.

## Task granularity rules

- 1-4 hours per task — per @tech-lead charter. Tasks smaller than 1h are over-specified. Tasks larger than 4h need decomposition.
- Each task can be run from scratch without side effects.
- Mark parallelizable tasks explicitly.
- Spike tasks: mark as spike with a timebox (max 2h).

## Dependency syntax

**Canonical form — one edge per line, prerequisite first.** Write it exactly like this:

```
T001 → T003
T003 → T004
```

Meaning: **left must finish first; right depends on it.** Put `—` in a task row's `Depends On`
cell when it has no prerequisites.

**Multi-value cells are comma-separated**: `Depends On` = `T001, T003`. The examples below show
a single ID because most tasks have one prerequisite, not because the cell holds one. Every ID
in the cell must exist, and every one of them must also appear as an edge in the graph. **Write `→` and nothing else.** The gate also *accepts* `←`, `->`,
`-->`, `<-`, `<--` and `depends on`, but do not use them. A blind run read the acceptance list
as an offer and picked from it; on a plan where a reversed edge silently builds the wrong
thing, five tolerated alternatives next to one safe one is a trap dressed as flexibility. If
you find yourself writing `<-` because it "reads better", that is the failure this rule exists
to prevent.

**The edge list is the machine-readable part.** A boxed ASCII diagram is decoration and is
*not* parsed. If you draw a diagram, keep the edge list under it. A graph section containing
only a diagram is read as an empty graph, and the gate will then tell you the table and the
graph disagree — which is correct, and confusing if you did not know the diagram was ignored.

## Worktree allocation

For parallel development, each developer gets its own git worktree:

```
node .agents/scripts/worktree.js create feature/T003
```

Track worktrees with `node .agents/scripts/worktree.js list` (no `loop-state.json` exists on disk).

## Workflow

**Step 0 — Scope Gate (non-skippable):** anchor scope first via `steps/step-00-scope-and-decision-anchoring.md`; `step_tracker.js` exits 1 if Step 1 begins without a locked track.
Intent triage at gate: Clear (C ≥ 0.85) runs the locked track; Ambiguous (0.50–0.85) halts to a 2–3 Track Fork; Trivial (C < 0.50) executes directly. Gate enforced in all `step_tracking` modes including `off` (DNA 4).

### Step 1: Load context

```
@memory-controller load tech-lead [execution planning from specs]
```

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill plan --step 1` at step start; `complete --skill plan --step 1` at step close (scope-gate skill — tracker not optional here).

> **If `@memory-controller` is unavailable, say so and continue.** Do not stall, and do not
> report the step as passed when it did nothing. Record `Memory: not loaded (<reason>)` in the
> plan's Scope note. A step that no-ops silently and still exits 0 is worse than no step.

### Step 2: Review specs

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill plan --step 2` at step start;
> `complete --skill plan --step 2` at step close.

Read the product spec and user stories. Identify all features, ACs, edge cases, and constraints.

### Step 3: Architecture check

**First, state greenfield or brownfield. This is not optional bookkeeping.** Every task below
either touches real files or creates new ones, and the difference decides whether your plan is
work or fiction.

| | Brownfield — plan against what exists | Greenfield — plan against what will exist |
|---|---|---|
| Task text | Names **real paths** (`src/shipments/list.tsx`) | Names artefacts to create, not paths |
| Risk register | Risks are about *this* codebase | Risks are about decisions nobody has made |
| Estimates | Anchored to code you have read | Anchored to the acceptance criterion |
| Required first | **Read the target code before estimating** | Nothing to read — say so plainly |

A blind run planned 25 tasks of migrations, middleware, a status-write path and a push
transport against a repository that did not exist, and identified one task as depending on a
system it had merely *assumed* was owned and modifiable — 13 hours invalidated by a fact
nobody checked. If you cannot tell whether the code is yours, that is a blocker, not a
detail: list it under open decisions and state what you assumed.

**Estimate only from code you have read.** An estimate for a file you have not opened is a
guess wearing a number.

#### The estate the brief assumes — a separate question from greenfield

"Your product is greenfield" and "every system your plan depends on is yours to change" are
**different claims**, and the second is the one that breaks plans. A brief that says "ops
updates status from a terminal" silently asserts four systems exist: the terminal, the
datastore, the document store, the account system — none of them mentioned as deliverables.

Stating greenfield does not settle it. Answer this separately, before estimating:

| The estate is… | Then |
|---|---|
| **Yours, and you have read it** | Estimate from the code. Name the paths. |
| **Yours, unreadable or unlocated** | **Blocker.** Discovery tasks first, capped at ≤2h each. |
| **Someone else's** | Plan the integration, not a modification. Add the interface task. |
| **Presumed, unconfirmed** | **The most dangerous state.** Open decision, blocker 1, plus a discovery task. |

Do not spend 69 hours on a plan whose first 10 hours are finding out whether its subject
exists. **Discovery first, then plan** — and say which tasks are discovery, because a plan
that mixes discovery with delivery hides the fact that half of it is unvalidated.

Never write a task that depends on a system you merely assumed was modifiable. A blind run
did exactly that: 13 hours across four tasks rested on an ops terminal that nobody had
confirmed was owned or changeable.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill plan --step 3` at step start;
> `complete --skill plan --step 3` at step close.

If no architecture artifacts exist, flag that ADRs are needed. If ADRs exist, verify they support the spec.

### Step 4: Break down tasks

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill plan --step 4` at step start;
> `complete --skill plan --step 4` at step close.

For each feature: break into 1-4h tasks, define dependencies, estimate effort (estimation is the tech-lead deliverable), identify risks, mark parallelizable tasks.

#### How to decompose — the method this step was missing

This step was one sentence. A blind run hit it and had to invent its own approach, then
reported that the hardest step in the skill was the only one with no supporting material.

**Decompose by acceptance criterion, not by feature.** A feature is not a task; a criterion is
a finish line you can verify. For each `US-###` / `AC-##`, ask what must be *observably true*
when it is done, and cut tasks at those seams.

| Cut along | Use when | Produces |
|---|---|---|
| **Vertical slice** (default) | The feature can work end-to-end | Tasks each ship something usable; dependencies are few |
| **Layer** (model → API → UI) | The stack is unknown or shared | Tasks each small and independent, but nothing works until the last |
| **By criterion** | Criteria are independent | One task per criterion; easiest to verify, may under-cut shared setup |
| **By risk** | Something is genuinely unknown | A ≤2h spike, first, whose output changes later tasks |

**Shared setup is a task.** Migrations, tenancy, auth scaffolding and CI are real work with real
estimates. If they appear only as assumptions inside other tasks, they are unbudgeted.

**Cut until it fits, then cut once more.** A task that resists 1–4h is usually two tasks with
an unstated seam. Find the seam. If it genuinely cannot be cut, that is the halt condition at
the top of this file — escalate the uncertainty, do not round the number up to 5 and move on.

**A task you cannot start is not a task.** Before writing it, name the first command or file
edit that begins it. If you cannot, you have a dependency you have not written down.

### Step 5: Write execution plan

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill plan --step 5` at step start;
> `complete --skill plan --step 5` at step close.

Output to `artifacts/output/05-planning/execution-plan.md` using the template above.

### Phase 5 gate — `execution_plan_check.js` (mandatory)

```bash
node .agents/scripts/execution_plan_check.js check --require-plan --json
```

**`--require-plan` is mandatory.** Without it an absent plan is a *skip* and the gate reports
`ok: true` with nothing on disk — correct for callers where planning is optional (`/develop`
mid-cycle), useless here. Reaching Step 5 means a plan is in scope, so an absent file is a
missing deliverable.

What it enforces, all of which was **prose until this gate existed**:

| Rule | Fails on |
|---|---|
| Sections | missing Task list, Dependency graph, or Risk register |
| Estimates | non-numeric, `{placeholder}`, under 1h, over 4h — over 2h for a spike |
| Identity | duplicate `T###`, or an ID that is not `T###`-shaped |
| Cross-refs | `Depends On` / `Parallel With` naming a task that does not exist |
| Graph↔table | the table declares a dependency the graph omits, or an edge to a missing task |
| Executability | a dependency **cycle** — a plan that looks complete and can be run in no order |
| **Coverage** | a `US-###` in `user-stories.md` that **no task serves** — work designed and never built |
| **Reverse** | a task that **traces to no `US-###`** — speculative scope nobody asked for |
| **Dangling** | a task citing `US-777` that `user-stories.md` never defines |

Coverage is checked in both directions on purpose. A forward-only check catches the missing
task and misses the invented one, and the invented one is the more expensive mistake: it is
real work somebody will do, for nothing.

**Never weaken the gate to pass it.** Fix the plan. If a rule is genuinely wrong for this
project, say so in the handoff rather than editing the rule.

## Output artifacts

- `artifacts/output/05-planning/execution-plan.md`

## State machine integration

At end: `node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact 05-planning/execution-plan.md`

**The `05-planning/` prefix is load-bearing.** `complete` resolves the argument against
`artifacts/output/` and records a version and hash only if the file is found there. With the
bare filename it resolved to `artifacts/output/execution-plan.md` — which never exists, so
the completion record silently captured no artifact. Sibling skills prefix their paths; so
must this one.
