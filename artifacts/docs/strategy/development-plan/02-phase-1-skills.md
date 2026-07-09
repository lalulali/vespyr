# Phase 1 — Skill Restructure + Artifact Rigor

> **Release:** v2.0
> **Calendar:** Weeks 3-4
> **Themes:** T2 (Skill atomicity), T3 (Artifact rigor)
> **Goal:** Skills become atomic + tri-modal. Artifacts become kernel + companions. State is dual-format (JSON + YAML). After this phase, Vespyr is "atomic" — skills resume, skills have phases, skills are first-class tools; artifacts are rigorous.

## What changed from the original plan

| Item | Original | This file | Why |
|---|---|---|---|
| F1.27-F1.28 (build-wiki skill + script) | Phase 1 (v2.0) | **Removed — moved to Phase 3** | Depends on doc-graph (Phase 3 work). Forward dependency. |
| Budget | 36h (phase file) / 54h (master) | **54h** | The phase file under-estimated by 33%. Master is correct. |

## Source mapping

| F-item | Master ref | Source |
|---|---|---|
| F1.1-F1.2 | Phase 1 / T2 | Evolution §2.1, Adoption §3.1 (develop) |
| F1.3-F1.6 | Phase 1 / T2 | Evolution §2.1+2.3, Adoption §3.1 (validate-idea, tri-modal) |
| F1.7-F1.8 | Phase 1 / T2 | Evolution §2.1, Adoption §3.1 (retro) |
| F1.9-F1.12 | Phase 1 / T2 | Evolution §2.3, Adoption §3.1 (design, tri-modal) |
| F1.13-F1.14 | Phase 1 / T2 | Adoption §3.1 (launch) |
| F1.15-F1.17 | Phase 1 / T3 | Adoption §3.2 (spec kernel) |
| F1.17.a | Phase 1 / T1, T3 | Adoption §3.2.1 (Ivy enrichment & design.md) |
| F1.18-F1.20 | Phase 1 / T3 | Adoption §3.7 (sprint-status.yaml) |
| F1.19.a | Phase 1 / T3, T4 | Adoption §3.7.1 (Orchestrator ASCII CLI Dashboard) |
| F1.21-F1.24 | Phase 1 / T2 | Evolution §2.4 (CSV method libraries) |
| F1.25-F1.26 | Phase 1 / T1 | Evolution §1.2 (domain expert depth + false-positive guard) |
| F1.27-F1.28 | **Removed** | Moved to Phase 3 (build-wiki depends on doc-graph) |

---

## F1.1-F1.2 — Restructure `develop` skill (278 lines → folder + 10 step files)

**Source:** Evolution §2.1, Adoption §3.1 | **Theme:** T2

### Problem

Today, every skill in `.agents/skills/<name>/SKILL.md` is a single file. `develop/SKILL.md` is 278 lines. The whole workflow — 9 numbered steps, prereqs, completion criteria, state machine integration — lives inline. The LLM reads the whole file on activation, even when the user only wants to resume at step 6. Tokens are spent re-reading completed sections. The file becomes a wall of text that drifts over time.

### Target

Skills become a **folder with a `SKILL.md` (the bootloader) + a `steps/` directory**. The bootloader tells the LLM to load `steps/step-01-*.md` on first activation, then jump to the step indicated by `stepsCompleted` in the output document's YAML frontmatter on re-activation.

### Proposed content

#### Folder structure (from Adoption §3.1)

```
.agents/skills/develop/
├── SKILL.md                       # 50–80 lines: bootloader + menu + state schema
├── customize.toml                 # 3-file customization (see 3.3)
├── steps/
│   ├── step-01-spec-review.md     # ~40 lines
│   ├── step-02-architecture.md
│   ├── step-03a-arch-spec-review.md
│   ├── step-03b-backlog-prep.md
│   ├── step-04-kanban-activation.md
│   ├── step-05-spike.md
│   ├── step-06-dev-loop.md
│   ├── step-07-quality-gates.md
│   ├── step-08-pm-verification.md
│   ├── step-09-documentation.md
│   └── step-10-completion.md
├── data/
│   └── role-tags.json             # { "FE": [...], "BE": [...], "Full-Stack": [...] }
└── templates/
    └── develop-state.md           # YAML state template for stepsCompleted
```

#### SKILL.md router template (bootloader, ~50 lines)

```markdown
---
name: develop
description: MVP development cycle — from PR to shipped feature
---

# Develop — Multi-Step Workflow

This skill runs in sequential steps. Each step is a self-contained file with its own halt conditions. Load one at a time.

## When to invoke
- Phase ≥ 4 (planning complete)
- `@tech-lead` has approved `artifacts/output/04-planning/execution-plan.md`
- Worktree allocated (multi-developer mode) OR on `main` (single-developer mode)

## Prerequisites
- Spec-kernel exists at `artifacts/output/02-strategy/` (see spec-kernel-template.md)
- User stories in `artifacts/output/02-strategy/user-stories.md`

## Mode detection
- Always "create" on first activation.
- Resume is automatic: read `stepsCompleted` from the output document's YAML frontmatter and jump to the first uncompleted step.

## Step loader
1. Read `stepsCompleted` array from `artifacts/output/05-execution/develop-state.md` (or start at []).
2. Compute next step = first step NOT in `stepsCompleted`.
3. Load `steps/step-{NN}-*.md`.
4. Execute. On completion, append NN to `stepsCompleted` and re-invoke loader.

## Step sequence
1. **Spec Alignment & Read Check** → `steps/step-01-spec-alignment.md`
2. **Architecture** (conditional: if ArchitectPhase: true) → `steps/step-02-architecture.md`
3a. **Arch Review** → `steps/step-03a-arch-review.md`
3b. **Backlog Prep** → `steps/step-03b-backlog-prep.md`
4. **Kanban Activation** → `steps/step-04-kanban-activation.md`
5. **Spike** (optional) → `steps/step-05-spike.md`
6. **Dev Loop** (multi-worktree OR single-developer) → `steps/step-06-dev-loop.md`
7. **Quality Gates** (QA hard gate → security conditional → performance conditional) → `steps/step-07-quality-gates.md`
8. **PM Verification** → `steps/step-08-pm-verification.md`
9. **Documentation** → `steps/step-09-documentation.md`
10. **Completion** → `steps/step-10-completion.md`

## Halt conditions (any one halts the entire flow)
- Spec gap unfilled after 2 CR cycles
- Test failure that doesn't reproduce locally
- Security finding rated Critical or High
- 2 review loops exceeded (escalate to `@tech-lead`)

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At each step end: `node .agents/scripts/orchestrator_state.js step --name {step-name} --status {done/blocked}`
At end: `node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 05-execution/{feature}.md`

## Done when
- All steps in `stepsCompleted`
- `qa-signoff.md` exists with GO/CONDITIONAL
- Phase advanced to quality
```

#### Step-file content (what each step contains)

Each step file is 30-80 lines, self-contained, with explicit halt conditions. The step-file frontmatter declares prerequisites:

```markdown
---
step: 1
name: Spec Alignment & Read Check
prerequisites:
  - PR exists or design docs are in `artifacts/output/02-strategy/`
  - User story is in `artifacts/output/02-strategy/user-stories.md`
---
```

- `step-01-spec-alignment.md` — read spec-kernel + user stories; align before coding. Lists every file in `artifacts/output/02-strategy/` and `artifacts/output/03-architecture/`, confirms read (or invokes `@reader` to summarize if > 1000 words), cross-checks ACs are achievable, files CRs for spec gaps. Output: `spec-alignment-check.md`. HALT if any spec gap is unfilled.
- `step-02-architecture.md` — conditional (if `ArchitectPhase: true`); `@architect` produces ADRs. Skipped if architecture already exists.
- `step-03a-arch-review.md` — `@tech-lead` reviews architecture for completeness and feasibility.
- `step-03b-backlog-prep.md` — `@tech-lead` reviews stories; evaluates parallelism (which stories can run in separate worktrees).
- `step-04-kanban-activation.md` — `@product-manager` confirms backlog; `@tech-lead` activates tasks (moves to In Progress).
- `step-05-spike.md` — optional; investigate unknowns (spike produces a short findings doc, not production code).
- `step-06-dev-loop.md` — multi-worktree OR single-developer loop with `@code-reviewer`. The core implementation step.
- `step-07-quality-gates.md` — QA (hard gate) → security (conditional) → performance (conditional). Sequential, blocking. QA cannot be skipped.
- `step-08-pm-verification.md` — `@product-manager` signs off against acceptance criteria.
- `step-09-documentation.md` — `@technical-writer` updates docs.
- `step-10-completion.md` — record completion; advance phase via orchestrator.

### Why this matters

1. **Token efficiency.** On re-activation, only the unfinished step loads. For a 9-step workflow that resumes at step 7, we save ~70% of the prompt.
2. **Maintainability.** Each step is a 30–80 line Markdown file. Reviewing, editing, or splitting a step is a tiny diff. We can ship step improvements without touching the rest.
3. **Resume semantics.** The `stepsCompleted` array in the output document's frontmatter makes resumption a deterministic operation. The LLM looks at the array, jumps to the right file, and continues.
4. **Phase gates are first-class.** Each step file declares its prerequisites as a `## Prerequisites` block. The `validate-idea` step can hard-gate on the existence of the founder brief; the `develop` step can hard-gate on the existence of `product-spec.md`.

### Why we don't adopt the `<workflow>` XML DSL

BMAD uses `<step n="1" goal="...">`, `<action>`, `<check if="...">`, `<goto>`, `<ask>`, `<output>`, `<critical>`. It's powerful but adds a parsing layer the LLM must internalize. Plain Markdown is just as expressive when the step file is short, and humans can read it without a parser.

### Checklist

- [ ] F1.1 — Rewrite `.agents/skills/develop/SKILL.md` as a ~50-line router:
  - Header with name/description (v2 frontmatter)
  - `## When to invoke`, `## Prerequisites` (link to spec-kernel)
  - `## Mode detection` (always "create"; resume is automatic from `stepsCompleted`)
  - `## Step loader` (reads `steps/step-01-*.md` or jumps to first uncompleted step)
  - `## State machine integration`, `## Done when`
- [ ] F1.2 — Create `.agents/skills/develop/steps/` with 10 step files:
  - `step-01-spec-alignment.md` — read spec-kernel + user stories; align before coding
  - `step-02-architecture.md` — conditional (if ArchitectPhase: true); produces ADRs
  - `step-03a-arch-review.md` — tech-lead reviews architecture
  - `step-03b-backlog-prep.md` — tech-lead reviews stories; evaluates parallelism
  - `step-04-kanban-activation.md` — PM confirms backlog; tech-lead activates
  - `step-05-spike.md` — optional; investigate unknowns
  - `step-06-dev-loop.md` — multi-worktree OR single-developer loop with code-reviewer
  - `step-07-quality-gates.md` — QA (hard gate) → security (conditional) → performance (conditional)
  - `step-08-pm-verification.md` — PM signs off
  - `step-09-documentation.md` — `@technical-writer` updates docs
  - `step-10-completion.md` — record completion; advance phase
- [ ] Verify each step file is 30-80 lines
- [ ] Add `data/role-tags.json` (FE / BE / Full-Stack definitions)
- [ ] Add `templates/develop-state.md` (YAML state template for `stepsCompleted`)
- [ ] Run a content-audit script to verify no content was lost from the old monolithic SKILL.md
- [ ] Test resume: activate with `stepsCompleted: [1,2,3,4,5]` and confirm it jumps to step 6

## F1.3-F1.6 — Restructure `validate-idea` skill with tri-modal subfolders

**Source:** Evolution §2.1+2.3, Adoption §3.1 | **Theme:** T2

### Problem

`validate-idea/SKILL.md` is ~410 lines and currently only supports "create" mode. A user who already has a brief cannot edit it through the skill — they have to manually revise. A user who wants to stress-test an existing spec (Socratic mode) has no dedicated flow. The skill tries to be everything in one file.

### Target

Adopt BMAD's tri-modal workflow pattern: every workflow has `steps-c/` (create), `steps-e/` (edit), `steps-v/` (validate). The SKILL.md becomes a mode selector that routes to the right subfolder.

### Proposed content

#### SKILL.md router with tri-modal mode selector (from Evolution §2.3 + Adoption §3.1)

```markdown
---
name: validate-idea
description: Stress-test product concepts before research. Supports create/edit/validate modes.
---

# Validate Idea

## Mode selection
First, detect the user's intent:
- **Create mode** → no `artifacts/output/00-discovery/idea-brief.md` exists
- **Edit mode** → brief exists, user wants to refine it
- **Validate mode** → brief exists, user wants to stress-test it (this is the Socratic mode)

If unclear, ask: "Are you starting a new idea, refining an existing brief, or stress-testing it?"

## Mode routing
- **Create** → load `steps-c/01-session-setup.md` ... `steps-c/07-handoff.md`
- **Edit** → load `steps-e/01-load-existing.md` ... `steps-e/05-finalize.md`
- **Validate** → load `steps-v/01-open-questions.md` ... `steps-v/05-lock-handoff.md`

## Prerequisites
- Create mode: none (this is the entry point)
- Edit mode: `artifacts/output/00-discovery/idea-brief.md` exists
- Validate mode: `artifacts/output/00-discovery/idea-brief.md` exists

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At end: `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/idea-brief.md`
```

#### steps-c/ (create mode, 7 step files)

- `01-session-setup.md` — initialize session, set context, load memory
- `02-input-analysis.md` — parse the user's raw idea input
- `03-idea-framing.md` — frame the idea in structured terms (problem, user, value)
- `04-stress-test-r1.md` — first round of Socratic stress-test
- `05-stress-test-r2.md` — second round, deeper
- `06-go-pivot-kill.md` — produce the GO/PIVOT/KILL verdict
- `07-handoff.md` — write `idea-brief.md`, handoff to next phase

#### steps-e/ (edit mode, 5 step files)

- `01-load-existing.md` — load the existing brief
- `02-identify-gaps.md` — identify what's missing or weak
- `03-revise.md` — revise the brief
- `04-stress-test.md` — re-stress-test the revised sections
- `05-finalize.md` — finalize and write back

#### steps-v/ (validate/Socratic mode, 5 step files)

- `01-open-questions.md` — surface open questions
- `02-7-branches.md` — walk the 7-branch decision tree (product requirements, architecture trade-offs, edge cases, codebase logic, cost & timeline, risks, success criteria)
- `03-cross-branch-check.md` — scan for cross-branch contradictions
- `04-decision-log.md` — write resolved decisions to `active-decisions.md`
- `05-lock-handoff.md` — lock the brief and handoff

### Why this matters

1. **Mode detection is automatic.** The skill checks for the existence of the artifact and routes accordingly. The user doesn't have to specify the mode.
2. **Each mode has its own step sequence.** Create, edit, and validate are genuinely different workflows — they shouldn't share steps.
3. **The user can override the detected mode.** If the skill detects "edit" but the user wants "validate," they say so.

### Why we don't adopt a single-mode skill with conditional branches

A single file with `if mode == create ... else if mode == edit ...` is what we have today. It's a wall of text. The tri-modal split makes each mode's flow legible and independently maintainable.

### Checklist

- [ ] F1.3 — Rewrite `.agents/skills/validate-idea/SKILL.md` as ~50-line router with tri-modal selector
- [ ] F1.4 — Create `steps-c/` (create mode, 7 step files): session-setup, input-analysis, idea-framing, stress-test-r1, stress-test-r2, go-pivot-kill, handoff
- [ ] F1.5 — Create `steps-e/` (edit mode, 5 step files): load-existing, identify-gaps, revise, stress-test, finalize
- [ ] F1.6 — Create `steps-v/` (validate/Socratic mode, 5 step files): open-questions, 7-branches, cross-branch-check, decision-log, lock-handoff
- [ ] Test mode detection with adversarial prompts: "validate my new idea" → steps-c/; "edit the existing brief" → steps-e/; "stress-test the spec" → steps-v/

## F1.7-F1.8 — Restructure `retro` skill (253 lines → folder + 5 step files)

**Source:** Evolution §2.1, Adoption §3.1 | **Theme:** T2

### Problem

`retro/SKILL.md` is 253 lines inline. The whole retrospective workflow — hot-path analysis, pattern scan, instinct scan, digest writing, compaction — lives in one file. The LLM re-reads the entire workflow even when resuming at the compaction step.

### Target

Same folder + step-file architecture as `develop`. The SKILL.md becomes a ~50-line router; the 5 steps live in `steps/`.

### Proposed content

#### Step files

- `step-01-hot-paths.md` — invoke `telemetry_surface.js hot-paths` (Phase 3 wiring). Surfaces the top 3 hot paths from the last 30 days of telemetry.
- `step-02-pattern-scan.md` — scan `artifacts/memory/` for recurring patterns (episodes that appear 3+ times across 2+ agents).
- `step-03-instinct-scan.md` — surface instinct candidates (patterns stable 30+ days with 2+ ADR refs).
- `step-04-write-digest.md` — write the retro digest to `artifacts/output/09-retro/retro-digest.md`.
- `step-05-compact.md` — invoke `witness.js check` (verify memory integrity) then compact/archive old episodes.

### Why this matters

Same as F1.1-F1.2: token efficiency on resume, maintainability, explicit halt conditions.

### Checklist

- [ ] F1.7 — Rewrite `.agents/skills/retro/SKILL.md` as ~50-line router
- [ ] F1.8 — Create `steps/` with 5 step files:
  - `step-01-hot-paths.md` — invoke `telemetry_surface.js hot-paths` (Phase 3 wiring)
  - `step-02-pattern-scan.md` — scan `artifacts/memory/` for recurring patterns
  - `step-03-instinct-scan.md` — surface instinct candidates
  - `step-04-write-digest.md` — write the retro digest
  - `step-05-compact.md` — invoke `witness.js check` then compact/archive
- [ ] Run content-audit script

## F1.9-F1.12 — Restructure `design` skill with tri-modal subfolders

**Source:** Evolution §2.3, Adoption §3.1 | **Theme:** T2

### Problem

`design/SKILL.md` currently only supports "create" mode. A user who already has a PRD cannot edit it through the skill. A user who wants to validate a design spec has no dedicated flow.

### Target

Same tri-modal pattern as `validate-idea`: `steps-c/` (create), `steps-e/` (edit), `steps-v/` (validate).

### Proposed content

#### steps-c/ (create mode, 6 step files)

- `01-load-prd-brief.md` — load the PRD brief / spec-kernel
- `02-define-personas.md` — define user personas
- `03-user-stories.md` — write user stories with ACs
- `04-screen-states.md` — define screen states and transitions
- `05-design-tokens.md` — define design tokens (colors, typography, spacing)
- `06-handoff.md` — write `product-spec.md` + `design.md`, handoff

#### steps-e/ (edit mode, 4 step files)

- `01-load-existing.md` — load existing spec
- `02-identify-gaps.md` — identify design gaps
- `03-revise.md` — revise the spec
- `04-finalize.md` — finalize and write back

#### steps-v/ (validate mode, 4 step files)

- `01-heuristic-eval.md` — Nielsen heuristic evaluation
- `02-consistency-check.md` — cross-screen consistency check
- `03-a11y-check.md` — accessibility check (WCAG 2.2 AA)
- `04-lock-handoff.md` — lock and handoff

### Why this matters

Same as F1.3-F1.6: mode detection is automatic, each mode has its own flow, user can override.

### Checklist

- [ ] F1.9 — Rewrite `.agents/skills/design/SKILL.md` as ~50-line router with tri-modal selector
- [ ] F1.10 — Create `steps-c/` (create mode, 6 step files): load-prd-brief, define-personas, user-stories, screen-states, design-tokens, handoff
- [ ] F1.11 — Create `steps-e/` (edit mode, 4 step files)
- [ ] F1.12 — Create `steps-v/` (validate mode, 4 step files)
- [ ] Test mode detection

## F1.13-F1.14 — Restructure `launch` skill

**Source:** Adoption §3.1 | **Theme:** T2

### Problem

`launch/SKILL.md` is a single file. The launch workflow (readiness check → deploy → smoke test → monitor → launch log) lives inline.

### Target

Same folder + step-file architecture. SKILL.md becomes a ~50-line router; 5 steps live in `steps/`.

### Proposed content

#### Step files

- `step-01-readiness-check.md` — verify all pre-launch gates passed (QA signoff, security audit, performance review)
- `step-02-deploy.md` — `@devops-engineer` deploys to production
- `step-03-smoke-test.md` — run smoke tests against production
- `step-04-monitor.md` — monitor for errors, latency, traffic anomalies
- `step-05-launch-log.md` — write `launch-log.md`, record completion

### Checklist

- [ ] F1.13 — Rewrite `.agents/skills/launch/SKILL.md` as ~50-line router
- [ ] F1.14 — Create `steps/` with 5 step files: readiness-check, deploy, smoke-test, monitor, launch-log
- [ ] Run content-audit script

## F1.15-F1.17 — Spec-kernel + companions

**Source:** Adoption §3.2 | **Theme:** T3

### Problem

Vespyr's artifact templates (e.g. `prd-template.md`, 14KB) are long, prescriptive, and have stable section headers. Outputs follow the template; that is good, but they are also monolithic — the PRD is *the* PRD, no way to link out to a glossary, an architecture diagram, or a research artifact. Long monolithic templates force the LLM to write 14KB of content even when 2KB is enough. A small feature's PRD looks identical to a platform's PRD.

### Target

Adopt BMAD's **5-field spec kernel + content-typed companions** as the canonical artifact shape.

### Proposed content

#### F1.15 — Spec-kernel template (FULL 5-field template from Adoption §3.2)

```
<artifact-folder>/
  SPEC.md                  # 5 fields: Why / Capabilities / Constraints / Non-goals / Success signal
  glossary.md              # content-typed companion
  user-journey.md          # content-typed companion
  acceptance-criteria.md   # content-typed companion
  .decision-log.md         # canonical memory for this spec
```

The 5-field kernel template (`.agents/templates/spec-kernel-template.md`, ~60 lines):

```markdown
# {Artifact Name} — Spec Kernel

## 1. Why
{1 paragraph: why are we building this? What problem does it solve? Who is the user?}

## 2. Capabilities
1. **CAP-1: {capability name}**
   - intent: {what this capability must do}
   - success: {how we know it works}
2. **CAP-2: {capability name}**
   - intent: {what this capability must do}
   - success: {how we know it works}
3. **CAP-N: ...**

## 3. Constraints
1. {constraint} — why: {why this constraint exists}
2. {constraint} — why: {why this constraint exists}
3. {constraint} — why: {why this constraint exists}

## 4. Non-goals
- We are NOT doing {X}.
- We are NOT doing {Y}.
- We are NOT doing {Z}.

## 5. Success signal
{measurable criterion} by {by-when date}.
```

#### F1.16 — Spec-law (FULL 8 rules from Adoption §3.2)

`.agents/templates/spec-law.md` (~30 lines):

```markdown
# Spec Law — 8 Rules

1. **Every capability has `intent` + `success`.** A capability without a success criterion is a wish, not a spec.
2. **≥1 non-goal.** If you can't articulate what you're NOT doing, you haven't scoped the work.
3. **Constraints explain why.** A constraint without a rationale is an arbitrary rule. "Why" makes it negotiable.
4. **Success signal is measurable.** "Users are happy" is not measurable. "NPS ≥ 40 by Q3" is.
5. **Capability IDs are stable.** CAP-1, CAP-2, … Once assigned, IDs never change. Subsequent artifacts reference these IDs.
6. **No "TODO" in committed kernel.** The kernel is the contract. TODOs belong in companion files, not the kernel.
7. **Companions have content-typed names.** `glossary.md`, `user-journey.md`, `acceptance-criteria.md` — not `misc.md` or `notes.md`.
8. **Self-validate sweep runs before handoff.** After writing the kernel, run the 8-rule check. Violations are fixed before handoff.
```

#### F1.17 — PRD template refactor (full companion file list from Adoption §3.2)

Refactor `prd-template.md` into kernel + companions:

```
templates/prd/
├── SPEC.md                          # kernel (~30 lines) — the 5 fields
└── companions/
    ├── glossary.md                  # ~20 lines — term definitions
    ├── acceptance-criteria.md       # ~20 lines — Given/When/Then per AC
    ├── user-journey.md              # ~20 lines — journey map
    └── decision-log.md              # ~20 lines — canonical memory for this spec
```

- Update `develop/SKILL.md` step-01 to require the spec-kernel form
- Remove the old monolithic `prd-template.md`
- Provide a `spec --distill` command on `@founder` and `@product-manager` agents: takes an existing long-form PRD and reduces it to the kernel

### Why this matters

1. **The 5-field kernel stays lean.** Every PRD is reduced to: *Why are we building this? What capabilities must it have? What constraints bind us? What are we explicitly NOT doing? How do we know we succeeded?* — and nothing else.
2. **Capability IDs are stable.** Each capability gets a `CAP-N` ID. Subsequent artifacts (architecture, user stories, tests) reference these IDs. The traceability is explicit.
3. **Companions are typed, not generic.** A `glossary.md` is different from a `user-journey.md`. The kernel doesn't try to be everything.
4. **The Spec Law (8 rules) becomes a self-validate sweep.** After writing the kernel, the skill runs an 8-rule check. Violations are fixed before handoff.

### Why we don't adopt BMAD's full Spec Law verbatim

BMAD's rules are tight; ours can be lighter for the discovery / exploration phases where looseness helps.

### Checklist

- [ ] F1.15 — Create `.agents/templates/spec-kernel-template.md` (~60 lines):
  - Section 1: Why (1 paragraph)
  - Section 2: Capabilities (numbered CAP-N list, each with `intent` and `success`)
  - Section 3: Constraints (numbered, each with `why`)
  - Section 4: Non-goals (explicit "we are NOT doing this")
  - Section 5: Success signal (measurable criterion + by-when)
- [ ] F1.16 — Create `.agents/templates/spec-law.md` (~30 lines):
  - 8 rules: each capability has `intent` + `success`; ≥1 non-goal; constraints explain why; success signal is measurable; capability IDs stable (CAP-1, CAP-2, …); no "TODO" in committed kernel; companions have content-typed names; self-validate sweep runs before handoff
- [ ] F1.17 — Refactor `prd-template.md`:
  - Create `templates/prd/SPEC.md` (kernel, ~30 lines)
  - Create `templates/prd/companions/` (glossary, acceptance-criteria, user-journey, decision-log — each ~20 lines)
  - Update `develop/SKILL.md` step-01 to require the spec-kernel form
  - Remove the old monolithic `prd-template.md`

## F1.17.a — Ivy (@product-designer) Enrichment & Visual spec handoff

**Source:** Adoption §3.2.1 | **Theme:** T1, T3

### Problem

When designing user interfaces, `@product-designer` (Ivy)'s thought process is often too shallow—jumping straight to standard inputs without considering layout hierarchy, spacing grids, typography, or visual theme alignment. Furthermore, outputting a separate `product-spec.html` using a 56KB static template (`product-spec-template.html`) is a massive token consumer.

### Target

Upgrade the design phase deliverables and Ivy's behavioral charter with an adaptive visual theme rubric, a visual specification companion (`design.md`), and dynamic HTML generation.

### Proposed content

#### 1. Adaptive Visual Theme Rubric (FULL from Adoption §3.2.1)

Ivy will evaluate the project context at startup and select a styling approach:

- **Rigid / Structured approach:** For utility dashboards, data tables, and enterprise systems, focusing on grid rigidity, usability, density, and ease of use.
- **Out-of-the-Box / Creative approach:** For creative sites, mobile consumer apps, and brand landing pages, utilizing visual impact, gradients, card glows, modern shadows, and animations.

She must support and select styling options from these theme combinations:
- *Sleek Utility*
- *Modern Glassmorphism*
- *Minimalist Tech*
- *Vibrant Brand-First*

#### 2. Visual Specification Companion (`design.md`) — template structure

Establish `artifacts/output/02-strategy/design.md` as the visual spec and styling source of truth. It defines:

- **Custom variables** (CSS custom properties / design tokens)
- **Colors** (primary, secondary, accent, semantic — with hex values)
- **Typography** (font families, sizes, weights, line heights)
- **Component states** (default, hover, focus, active, disabled — with transform/transition specs)
- **Micro-animations** (durations, easings, triggers)
- **Responsive breakpoints** (mobile, tablet, desktop, wide — with layout rules per breakpoint)
- **Layout spacing** (grid gaps, padding scales, margin scales)

Core engineering agents (`@developer`, `@architect`, `@qa-engineer`, `@tech-lead`) and future marketing/growth agents (`@growth-marketer`, `@content-engineer`) will consume `design.md` as their visual and styling guide.

#### 3. Dynamic Presentation Generation (On-the-Fly HTML) — requirements

Remove the 56KB static template. Ivy will dynamically generate `product-spec.html` on the fly using:

- **Tailwind CSS CDN** + custom styled variables
- Keeping the generated code token-efficient while producing a premium, responsive presentation board
- The generated page must **strictly maintain the standard structural spec sections** for consistency:
  - Overview
  - User Flows
  - Screen Specs
  - Interaction Details
  - Visual System
  - Edge Cases
  - Open Questions
  - Cross-References

### Why this matters

1. **Deeper design thinking.** Ivy doesn't jump to standard inputs — she evaluates the project type and selects the right visual approach first.
2. **`design.md` is the visual source of truth.** Engineering agents read it at startup and implement to spec, not to guess.
3. **Token efficiency.** Dynamic HTML generation with Tailwind CDN replaces a 56KB static template. The generated code is lean and premium.
4. **Consistent structure.** The standard spec sections are enforced in the generation template, so every `product-spec.html` has the same navigable structure.

### Why we don't keep the static HTML template

The 56KB template is a massive token consumer. Every time Ivy outputs a spec, she re-reads and re-writes the template. Dynamic generation with Tailwind CDN produces the same visual quality at a fraction of the token cost.

### Checklist

- [ ] Enrich `@product-designer` persona to analyze UX grids, layout hierarchy, user psychology
- [ ] Implement adaptive styling rubric: Rigid/Structured (dashboards/utility) vs. Out-of-the-Box/Creative (consumer apps/promotional), supporting theme combinations (Sleek Utility, Modern Glassmorphism, Minimalist Tech, Vibrant Brand-First)
- [ ] Create `artifacts/output/02-strategy/design.md` template: custom variables, colors, typography, component states, micro-animations, responsive breakpoints
- [ ] Core engineering agents (`@developer`, `@architect`, `@qa-engineer`, `@tech-lead`) instructed to read `design.md` as visual source of truth
- [ ] Transition `product-spec.html` output to dynamically generated (Tailwind CSS CDN + custom styled variables), deleting the 56KB static HTML template
- [ ] Ensure generated HTML matches standard spec section structure (Overview, User Flows, Screen Specs, Interaction Details, Visual System, Edge Cases, Open Questions, Cross-References)

## F1.18-F1.20 — Status YAML state machine

**Source:** Adoption §3.7 | **Theme:** T3

### Problem

`orchestrator_state.js` reads and writes `artifacts/output/pipeline-state.json`. The schema is implicit; the script owns it. The state machine is *in the script*. Other tools (e.g., a dashboard, a CI check, a custom agent) cannot read or write state without calling the script. There is no explicit, human-readable state schema.

### Target

Add a **`artifacts/output/sprint-status.yaml`** as a parallel, human-readable state artifact (BMAD's pattern). The state machine script reads from it on `status` and `next`, and writes to it on `complete`.

### Proposed content

#### F1.18 — sprint-status.yaml (FULL YAML template from Adoption §3.7)

```yaml
# artifacts/output/sprint-status.yaml
generated: 2026-06-24
last_updated: 2026-06-24
project: vespyr
project_key: vespyr
tracking_system: file-system
squad: build
phase: development

# Phase-level status
phases:
  discovery: done
  exploration: done
  strategy: in-progress
  architecture: backlog
  development: backlog
  quality: backlog
  launch: backlog

# Story-level status (when in development)
stories:
  US-001-user-auth: done
  US-002-account-management: in-progress
  US-003-plant-data-model: backlog
```

#### F1.19 — orchestrator_state.js updates

- Add YAML read helpers (`readYaml()`, `writeYaml()`)
- `status`/`next` read from YAML; `complete` writes to YAML
- `pipeline-state.json` becomes a derived cache (still written, YAML is source of truth)

#### F1.19.a — Human-Readable ASCII CLI Dashboard & Swarm State Enforcement (FULL from Adoption §3.7.1)

**Problem.** Although `orchestrator_state.js` manages project state, the CLI output (status, next) is raw JSON, which is difficult for humans to quickly digest. Furthermore, the orchestrator is rarely run during active swarm execution because agents do not verify phase state before starting or log work completion when finishing their tasks.

**Adoption.** Upgrade the state CLI and Swarm execution rules:

1. **Interactive ASCII CLI Dashboards:** Upgrading the CLI output for `status` and `next` commands. When run in terminal (or when a `--human` flag is used/no `--json` is specified), they will display a beautiful ASCII board detailing:
   - Project phase pipeline status (e.g. green checkmarks for completed, arrow indicators for in-progress).
   - Current phase artifact completeness checks.
   - Summaries of open blockers and change requests (CRs) with owners.
   - Specific actionable agent and skill command recommendations.
2. **First-Class Swarm State Enforcement (Startup & Shutdown Rules):** Add standard pipeline integration rules under the "Goal-Driven Execution" core guidelines:
   - *Startup phase validation:* Before executing any task, the agent must check `pipeline-state.json` (or `sprint-status.yaml`) to verify phase pre-requisites are met, halting if the project is out-of-phase.
   - *Shutdown completion logging:* After saving deliverables, agents must execute (or request `@executor`/the user to execute) `orchestrator_state.js complete --agent <name> --artifact <relative-path>` to update the state file.

#### F1.20 — sprint-status skill

Create `.agents/skills/sprint-status/SKILL.md`: renders the YAML as a Kanban table.

### Why this matters

1. **Human-readable state.** A PM can read `sprint-status.yaml` in any text editor and see the project at a glance. JSON state is opaque.
2. **CI integration.** A CI job can grep for `phases.development: in-progress` and gate releases. With JSON, you have to parse.
3. **Cross-tool portability.** The YAML is a stable contract. The script's internal state can change; the YAML schema is frozen.
4. **Story-level status mirrors BMAD.** When we're in development, every user story has a status. `sprint-status.yaml` becomes the source of truth for "what's ready for dev" → "what's in progress" → "what's done".
5. **ASCII dashboards make state visible.** Humans can digest the project state at a glance without parsing JSON.
6. **Swarm enforcement prevents out-of-order execution.** Agents verify phase state before starting and log completion at shutdown.

### Why we don't adopt BMAD's full status lifecycle verbatim

We add a phase-level layer that BMAD doesn't have (it assumes you're past the strategy phase). Vespyr's lifecycle is longer.

### Checklist

- [ ] F1.18 — Create `artifacts/output/sprint-status.yaml` template (7 phase keys + story map section)
- [ ] F1.19 — Update `orchestrator_state.js`:
  - Add YAML read helpers (`readYaml()`, `writeYaml()`)
  - `status`/`next` read from YAML; `complete` writes to YAML
  - `pipeline-state.json` becomes a derived cache (still written, YAML is source of truth)
- [ ] F1.19.a — Human-Readable ASCII CLI Dashboard & Swarm State Enforcement:
  - Upgrade `status`/`next` to print structured terminal ASCII boards (phase status, artifact completeness, blockers, next action recommendations) unless `--json` is passed
  - Add agent-level enforcement: core personas query phase status at startup (verifying pipeline state) to prevent running out-of-order, and execute `complete` command at shutdown
- [ ] F1.20 — Create `.agents/skills/sprint-status/SKILL.md`: renders the YAML as a Kanban table

## F1.21-F1.24 — CSV method libraries

**Source:** Evolution §2.4 | **Theme:** T2

### Problem

Vespyr has `elicitation/methods.csv` (70 rows, 14 KB) but no brainstorming or validation-pattern libraries. The `match_methods.js` script only searches the elicitation CSV. BMAD ships 61 brainstorming techniques + 70 elicitation methods in separate CSVs.

### Target

Extend the elicitation CSV + add two new CSVs + update the matcher to search across all three.

### Proposed content

#### F1.21 — Extend `elicitation/methods.csv` (70 → 100+ methods)

Add categories that Vespyr has under-served:
- `validation` — Risk Storming, FMEA, Assumption Surfacing, Confidence Calibration
- `decision` — RAPID Framework, DACI, Eisenhower Matrix, Pre-mortem
- `research` — User Interview Mining, Diary Studies, Conjoint Analysis
- `architecture` — C4 Model, Trade-off Quadrant, ADRs as Storytelling

#### F1.22 — Create `brainstorming/methods.csv` (60+ methods)

Adapt BMAD's `brain-methods.csv` for Vespyr's squad/multi-agent context:
- SCAMPER, Six Thinking Hats, Starbursting, Reverse Brainstorming
- Round Robin, Brain-writing, Nominal Group Technique
- Plus agent-specific methods: "Founder's Pre-mortem," "Architect's Trade-off Storm"

#### F1.23 — Create `validation-patterns.csv` (30+ methods)

Validation-specific methods:
- Smoke Test Design, Concierge MVP, Wizard of Oz, Fake Door Test
- A/B Test Design, Cohort Analysis Setup, North Star Metric Definition

#### F1.24 — Update `match_methods.js`

Currently matches 5 elicitation methods. Extend to match across all 3 CSVs based on artifact type. Accept `--source elicitation|brainstorming|validation` flag; default: search all 3; return top N with relevance score.

### Why this matters

1. **Method coverage.** Vespyr's elicitation library is strong but narrow. Adding brainstorming and validation patterns covers the full ideation-to-validation spectrum.
2. **Agent-specific methods.** "Founder's Pre-mortem" and "Architect's Trade-off Storm" tie methods to personas, making the CSV a routing surface.
3. **Single matcher.** `match_methods.js` becomes the one entry point for "which method should I use?"

### Checklist

- [ ] F1.21 — Extend `.agents/skills/elicitation/methods.csv` from 70 → 100+ methods (add: validation, decision, research, architecture categories)
- [ ] F1.22 — Create `.agents/skills/brainstorming/methods.csv` (60+ methods: SCAMPER, Six Thinking Hats, Starbursting, Reverse, etc.)
- [ ] F1.23 — Create `.agents/skills/validation-patterns.csv` (30+ methods: Smoke Test, Concierge MVP, Wizard of Oz, A/B Test, etc.)
- [ ] F1.24 — Update `.agents/scripts/match_methods.js`: accept `--source elicitation|brainstorming|validation` flag; default: search all 3; return top N with relevance score

## F1.25-F1.26 — Domain expert agent depth + false-positive guard

**Source:** Evolution §1.2 | **Theme:** T1

### Problem

`code-reviewer.md` (139 lines), `ml-engineer.md` (139 lines), `devops-engineer.md` (132 lines), `data-analyst.md` (134 lines) — all noticeably shallower than `founder.md` (259 lines) or `product-manager.md` (249 lines). The 9 "Domain Experts" feel like an org-chart inventory. `code-reviewer.md` has the 9-category review checklist but **no false-positive guard list**, which is what makes ECC's `code-reviewer.md` excellent.

### Target

Bring each technical agent to ≥ 200 lines with: persona depth, decision tree, failure modes, escalation patterns, memory write-back contracts. Add a 15-item false-positive guard to `code-reviewer.md`.

### Proposed content

#### F1.25 — Domain expert depth (9 agents)

Each of the 9 domain experts expanded to ≥ 200 lines. Structure for each:

- **Persona depth** (who they are, who they channel)
- **Decision tree** (when to invoke, when to escalate)
- **5-7 specific failure modes** to watch for
- **Memory write-back contract**
- **Conflict resolution patterns**

- **F1.25.a** `code-reviewer.md` (139 → 280+ lines, see F1.26)
- **F1.25.b** `ml-engineer.md` (139 → 200+)
- **F1.25.c** `devops-engineer.md` (132 → 200+)
- **F1.25.d** `data-analyst.md` (134 → 200+)
- **F1.25.e** `researcher.md` (→ 200+)
- **F1.25.f** `user-researcher.md` (→ 200+)
- **F1.25.g** `ux-researcher.md` (→ 200+)
- **F1.25.h** `security-engineer.md` (→ 200+)
- **F1.25.i** `performance-engineer.md` (→ 200+)

#### F1.26 — False-positive guard (FULL 15-item list with explanations from Evolution §1.2, lines 221-257)

Add a new section "## Common False Positives — Skip These" to `code-reviewer.md` (between the Tests and Documentation sections):

```markdown
## Common False Positives — Skip These

LLM code reviewers have known failure modes. These are the manufactured findings that waste developer time and erode trust in the review process. Do NOT raise them.

1. **"Consider adding error handling"** on paths that already propagate or log errors. Check the call chain before suggesting a try/catch. The codebase has chosen a propagation style — respect it.

2. **"Magic number"** for `200`, `404`, `500`, `1024`, `4096`, `60_000`, `86400` (HTTP codes, time conversions). These are universal constants, not magic numbers.

3. **"Possible null dereference"** when the line above already narrowed the type (e.g., `if (x !== null) { x.foo() }` is fine). Re-read the surrounding code.

4. **"Use const instead of let"** when the variable is reassigned later. JavaScript's `let` exists for a reason.

5. **"Add a return type annotation"** in TypeScript when inference is unambiguous and the function is private to the module.

6. **"Consider extracting this into a helper"** for code that is used exactly once. Premature abstraction is worse than duplication.

7. **"This function is too long"** without specifying what should be extracted and why. "Too long" is a smell, not a finding. Propose the extraction.

8. **"Missing input validation"** when validation happens one layer up (controller middleware, request schema). Trace the data flow before complaining.

9. **"Consider using a Map instead of an Object"** when the keys are known at compile time and the Object is fine.

10. **"Inconsistent naming"** when the codebase's actual convention differs from the reviewer's training data. Read 3 nearby files to confirm.

11. **"Add a JSDoc comment"** on a private function with a self-evident name. Public APIs deserve docs; helpers don't.

12. **"Use async/await instead of .then()"** for code that's been in the codebase for 6+ months and works fine. Refactor pressure belongs in tech debt, not a PR review.

13. **"This could be a one-liner"** at the cost of readability. Cleverness is not a virtue.

14. **"Consider using lodash/ramda"** for operations that are 1-2 lines of vanilla JS. Library dependency is not free.

15. **"Add unit tests"** for code that's covered by integration tests at the layer above. Test the right layer.

**When in doubt, ask yourself: "Is this a real bug, or am I pattern-matching against my training corpus?"** The latter is a false positive. The former is a review.
```

**Preamble:** "LLM code reviewers have known failure modes. Do NOT raise these."
**Closer:** "When in doubt, ask yourself: 'Is this a real bug, or am I pattern-matching against my training corpus?'"

### Why this matters

1. **Domain experts stop being org-chart filler.** Each agent has depth: a decision tree, failure modes, a memory contract. They become useful, not just present.
2. **The false-positive guard is the single highest-impact addition to `code-reviewer.md`.** LLM reviewers pattern-match against their training corpus and produce manufactured findings. The 15-item guard names the specific failure modes and tells the reviewer not to raise them. This is what makes ECC's reviewer excellent.
3. **Each false-positive item has a specific explanation of what NOT to flag and why.** The guard isn't a list of words — it's a list of reasoning. "Check the call chain before suggesting a try/catch" teaches the reviewer *how* to avoid the false positive, not just *that* it's a false positive.

### Why we don't adopt ECC's 20+ language-specific reviewer agents

We adopt the *idea* (one reviewer per language family) as v2.1 work, not the 20-file inventory. The principle: **adopt the *idea*, not the inventory.**

### Checklist

- [ ] F1.25 — Expand each of the 9 domain experts to ≥ 200 lines:
  - **F1.25.a** `code-reviewer.md` (139 → 280+ lines, see F1.26)
  - **F1.25.b** `ml-engineer.md` (139 → 200+)
  - **F1.25.c** `devops-engineer.md` (132 → 200+)
  - **F1.25.d** `data-analyst.md` (134 → 200+)
  - **F1.25.e** `researcher.md` (→ 200+)
  - **F1.25.f** `user-researcher.md` (→ 200+)
  - **F1.25.g** `ux-researcher.md` (→ 200+)
  - **F1.25.h** `security-engineer.md` (→ 200+)
  - **F1.25.i** `performance-engineer.md` (→ 200+)
  
  Each should have: persona depth (who they are, who they channel), decision tree (when to invoke/escalate), 5-7 failure modes, memory write-back contract, conflict resolution patterns.

- [ ] F1.26 — Add 15-item false-positive guard to `code-reviewer.md` (between Tests and Documentation sections):
  1. "Consider adding error handling" on propagation paths
  2. "Magic number" for HTTP codes (200/404/500/1024/4096/60_000/86400)
  3. "Possible null dereference" when line above narrowed the type
  4. "Use const instead of let" when reassigned later
  5. "Add return type annotation" in TS with unambiguous inference
  6. "Consider extracting this into a helper" for single-use code
  7. "This function is too long" without specifying what
  8. "Missing input validation" when validation happens upstream
  9. "Use Map instead of Object" with known keys
  10. "Inconsistent naming" without codebase confirmation
  11. "Add JSDoc comment" on private helpers
  12. "Use async/await instead of .then()" for stable old code
  13. "This could be a one-liner" at readability cost
  14. "Use lodash/ramda" for 1-2 line vanilla JS
  15. "Add unit tests" for integration-covered code
  
  Preamble: "LLM code reviewers have known failure modes. Do NOT raise these." Closer: "When in doubt, ask yourself: 'Is this a real bug, or am I pattern-matching against my training corpus?'"

---

## Done when

- [ ] `develop`, `validate-idea`, `retro`, `design`, `launch` are all folders with `SKILL.md` (≤ 60 lines) + `steps/` (or `steps-c/-e/-v/`) directories
- [ ] `validate-idea`, `design` have tri-modal subfolders; mode detection works on adversarial prompts
- [ ] Resume works: re-activate `develop` with `stepsCompleted: [1,2,3,4,5]` jumps to step 6
- [ ] `prd-template.md` is replaced with `templates/prd/SPEC.md` (kernel) + companions
- [ ] `artifacts/output/sprint-status.yaml` is the human-readable source of truth
- [ ] `orchestrator_state.js next` reads from the YAML
- [ ] `match_methods.js --context "PRD section" --source elicitation` returns 5 methods
- [ ] The 9 domain-expert agents are all ≥ 200 lines
- [ ] `code-reviewer.md` has the 15-item false-positive guard
- [ ] `@product-designer` generates `design.md` + dynamic `product-spec.html` (56KB static template deleted)
- [ ] `orchestrator_state.js status`/`next` print ASCII dashboards by default; agents enforce pipeline state checks

## Risks

- **Step-file split loses content.** Run a content-audit script before/after the split.
- **Tri-modal mode detection misfires.** Test with adversarial prompts; the first read of SKILL.md is a literal mode selector, the LLM cannot skip it.
- **Spec-kernel is too thin for some artifacts.** Kernel is the minimum; additional content lives in companion files.
- **CSV method libraries drift.** Pin a version comment at top of each CSV.
- **Ivy's dynamic HTML generation produces inconsistent structure.** Enforce standard spec sections (Overview, User Flows, Screen Specs, Interaction Details, Visual System, Edge Cases, Open Questions, Cross-References) in the generation template.

### Rollback plan

If Phase 1 breaks:
- **Skill restructure:** the old monolithic SKILL.md files are in git history. `git checkout HEAD~1 -- .agents/skills/develop/SKILL.md` (etc.) reverts any skill.
- **Spec-kernel:** the old `prd-template.md` is in git history. Restore it if the kernel+companions approach doesn't work for a specific artifact.
- **sprint-status.yaml:** `orchestrator_state.js` still writes `pipeline-state.json` as a derived cache. If YAML breaks, the JSON fallback keeps the state machine running.

## Handoff to Phase 2

Once Phase 1 is done, every new file in Phase 2+ can assume:
- Skills are folder + step files with tri-modal subfolders where needed.
- Artifacts are kernel + companions.
- State is dual-format (YAML for humans, JSON for cache).
- Domain experts have ≥ 200 lines of depth.
- 100+ elicitation methods, 60+ brainstorming methods, 30+ validation patterns.
- Ivy produces `design.md` + dynamic HTML.
- Orchestrator CLI prints ASCII dashboards.
