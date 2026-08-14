# Phase 1 — Skill Restructure + Artifact Rigor

> **Release:** v2.0
> **Calendar:** Weeks 3-4
> **Themes:** T2 (Skill atomicity), T3 (Artifact rigor), T8 (UTTERLY SATISFIED culture)
> **Goal:** Skills become atomic + tri-modal. Artifacts become kernel + companions. State is dual-format (JSON + YAML). After this phase, Vespyr is "atomic" — skills resume, skills have phases, skills are first-class tools; artifacts are rigorous; and every handoff carries an explicit satisfaction state.

## What changed from the original plan

| Item | Original | This file | Why |
|---|---|---|---|
| F1.27-F1.28 (build-wiki skill + script) | Phase 1 (v2.0) | **Removed — moved to Phase 7** | Consolidated into dedicated Phase 7 (`09-phase-7-pkm-knowledge-engine.md`). |
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
| F1.27-F1.28 | **Removed** | Moved to Phase 7 (`09-phase-7-pkm-knowledge-engine.md`) |
| F1.29 | Phase 1 / T1, T2 | User requirement (QA enrichment + multi-scenario testing) |
| F1.30 | Phase 1 / T2 | User requirement (problem-first pipeline gap) |
| F1.31 | Phase 1 / T2 | User requirement (modular design thinking toolkit) |
| F1.32 | Phase 1 / T1, T2 | User requirement (delegation gaps + auto-gates + harness adherence) |
| F1.33 | Phase 1 / T1, T3 | User requirement (Sarah AI-PM upgrade: see 02d-ai-product-manager.md) |

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
- `@tech-lead` has approved `artifacts/output/05-planning/execution-plan.md`
- Worktree allocated (multi-developer mode) OR on `main` (single-developer mode)

## Prerequisites
- Spec-kernel exists at `artifacts/output/03-strategy/` (see spec-kernel-template.md)
- User stories in `artifacts/output/03-strategy/user-stories.md`

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
- Active agent is `CHANGES REQUESTED` or `BLOCKED` at a required handoff

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
  - PR exists or design docs are in `artifacts/output/03-strategy/`
  - User story is in `artifacts/output/03-strategy/user-stories.md`
---
```

- `step-01-spec-alignment.md` — read spec-kernel + user stories; align before coding. Lists every file in `artifacts/output/03-strategy/` and `artifacts/output/04-architecture/`, confirms read (or invokes `@reader` to summarize if > 1000 words), cross-checks ACs are achievable, files CRs for spec gaps. Output: `spec-alignment-check.md`. HALT if any spec gap is unfilled.
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

- [x] F1.1 — Rewrite `.agents/skills/develop/SKILL.md` as a ~50-line router:
  - Header with name/description (v2 frontmatter)
  - `## When to invoke`, `## Prerequisites` (link to spec-kernel)
  - `## Mode detection` (always "create"; resume is automatic from `stepsCompleted`)
  - `## Step loader` (reads `steps/step-01-*.md` or jumps to first uncompleted step)
  - `## State machine integration`, `## Done when`
- [x] F1.2 — Create `.agents/skills/develop/steps/` with 10 step files:
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
- [x] Verify each step file is 30-80 lines
- [x] Add `data/role-tags.json` (FE / BE / Full-Stack definitions)
- [x] Add `templates/develop-state.md` (YAML state template for `stepsCompleted`)
- [x] Run a content-audit script to verify no content was lost from the old monolithic SKILL.md
- [x] Test resume: activate with `stepsCompleted: [1,2,3,4,5]` and confirm it jumps to step 6

## F1.3-F1.6 — Restructure `validate-idea` skill with tri-modal subfolders

**Source:** Evolution §2.1+2.3, Adoption §3.1 | **Theme:** T2

### Problem

`validate-idea/SKILL.md` is ~410 lines and currently only supports "create" mode. A user who already has a brief cannot edit it through the skill — they have to manually revise. A user who wants to stress-test an existing spec (Socratic mode) has no dedicated flow. The skill tries to be everything in one file.

### Target

Adopt BMAD's tri-modal workflow pattern: every workflow has `steps-create/` (create), `steps-edit/` (edit), `steps-validate/` (validate). The SKILL.md becomes a mode selector that routes to the right subfolder.

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
- **Create mode** → no `artifacts/output/01-discovery/idea-brief.md` exists
- **Edit mode** → brief exists, user wants to refine it
- **Validate mode** → brief exists, user wants to stress-test it (this is the Socratic mode)

If unclear, ask: "Are you starting a new idea, refining an existing brief, or stress-testing it?"

## Mode routing
- **Create** → load `steps-create/01-session-setup.md` ... `steps-create/07-handoff.md`
- **Edit** → load `steps-edit/01-load-existing.md` ... `steps-edit/05-finalize.md`
- **Validate** → load `steps-validate/01-open-questions.md` ... `steps-validate/05-lock-handoff.md`

## Prerequisites
- Create mode: none (this is the entry point)
- Edit mode: `artifacts/output/01-discovery/idea-brief.md` exists
- Validate mode: `artifacts/output/01-discovery/idea-brief.md` exists

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At end: `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/idea-brief.md`
```

#### steps-create/ (create mode, 7 step files)

- `01-session-setup.md` — initialize session, set context, load memory
- `02-input-analysis.md` — parse the user's raw idea input
- `03-idea-framing.md` — frame the idea in structured terms (problem, user, value)
- `04-stress-test-r1.md` — first round of Socratic stress-test
- `05-stress-test-r2.md` — second round, deeper
- `06-go-pivot-kill.md` — produce the GO/PIVOT/KILL verdict
- `07-handoff.md` — write `idea-brief.md`, handoff to next phase

#### steps-edit/ (edit mode, 5 step files)

- `01-load-existing.md` — load the existing brief
- `02-identify-gaps.md` — identify what's missing or weak
- `03-revise.md` — revise the brief
- `04-stress-test.md` — re-stress-test the revised sections
- `05-finalize.md` — finalize and write back

#### steps-validate/ (validate/Socratic mode, 5 step files)

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

- [x] F1.3 — Rewrite `.agents/skills/validate-idea/SKILL.md` as ~50-line router with tri-modal selector
- [x] F1.4 — Create `steps-create/` (create mode, 7 step files): session-setup, input-analysis, idea-framing, stress-test-r1, stress-test-r2, go-pivot-kill, handoff
- [x] F1.5 — Create `steps-edit/` (edit mode, 5 step files): load-existing, identify-gaps, revise, stress-test, finalize
- [x] F1.6 — Create `steps-validate/` (validate/Socratic mode, 5 step files): open-questions, 7-branches, cross-branch-check, decision-log, lock-handoff
- [x] Test mode detection with adversarial prompts: "validate my new idea" → steps-create/; "edit the existing brief" → steps-edit/; "stress-test the spec" → steps-validate/

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

- [x] F1.7 — Rewrite `.agents/skills/retro/SKILL.md` as ~50-line router
- [x] F1.8 — Create `steps/` with 5 step files:
  - `step-01-hot-paths.md` — invoke `telemetry_surface.js hot-paths` (Phase 3 wiring)
  - `step-02-pattern-scan.md` — scan `artifacts/memory/` for recurring patterns
  - `step-03-instinct-scan.md` — surface instinct candidates
  - `step-04-write-digest.md` — write the retro digest
  - `step-05-compact.md` — invoke `witness.js check` then compact/archive
- [x] Run content-audit script

## F1.9-F1.12 — Restructure `design` skill with tri-modal subfolders

**Source:** Evolution §2.3, Adoption §3.1 | **Theme:** T2

### Problem

`design/SKILL.md` currently only supports "create" mode. A user who already has a PRD cannot edit it through the skill. A user who wants to validate a design spec has no dedicated flow.

### Target

Same tri-modal pattern as `validate-idea`: `steps-create/` (create), `steps-edit/` (edit), `steps-validate/` (validate).

### Proposed content

#### steps-create/ (create mode, 6 step files)

- `01-load-prd-brief.md` — load the PRD brief / spec-kernel
- `02-define-personas.md` — define user personas
- `03-user-stories.md` — write user stories with ACs
- `04-screen-states.md` — define screen states and transitions
- `05-design-tokens.md` — define design tokens (colors, typography, spacing)
- `06-handoff.md` — write `product-spec.md` + `design.md`, handoff

#### steps-edit/ (edit mode, 4 step files)

- `01-load-existing.md` — load existing spec
- `02-identify-gaps.md` — identify design gaps
- `03-revise.md` — revise the spec
- `04-finalize.md` — finalize and write back

#### steps-validate/ (validate mode, 4 step files)

- `01-heuristic-eval.md` — Nielsen heuristic evaluation
- `02-consistency-check.md` — cross-screen consistency check
- `03-a11y-check.md` — accessibility check (WCAG 2.2 AA)
- `04-lock-handoff.md` — lock and handoff

### Why this matters

Same as F1.3-F1.6: mode detection is automatic, each mode has its own flow, user can override.

### Checklist

- [x] F1.9 — Rewrite `.agents/skills/design/SKILL.md` as ~50-line router with tri-modal selector
- [x] F1.10 — Create `steps-create/` (create mode, 6 step files): load-prd-brief, define-personas, user-stories, screen-states, design-tokens, handoff
- [x] F1.11 — Create `steps-edit/` (edit mode, 4 step files)
- [x] F1.12 — Create `steps-validate/` (validate mode, 4 step files)
- [x] Test mode detection

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
- `step-06-launch-log.md` — write `launch-log.md`, record completion

The readiness step must also load the T8 team matrix. Deployment is blocked
until every active, relevant agent is `SATISFIED` with evidence and every
`NOT ACTIVATED` row has a specific reason.

### Checklist

- [x] F1.13 — Rewrite `.agents/skills/launch/SKILL.md` as ~50-line router
- [x] F1.14 — Create `steps/` with 5 step files: readiness-check, deploy, smoke-test, monitor, launch-log
- [x] Run content-audit script

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
templates/product/
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

- [x] F1.15 — Create `.agents/templates/spec-kernel-template.md` (~60 lines):
  - Section 1: Why (1 paragraph)
  - Section 2: Capabilities (numbered CAP-N list, each with `intent` and `success`)
  - Section 3: Constraints (numbered, each with `why`)
  - Section 4: Non-goals (explicit "we are NOT doing this")
  - Section 5: Success signal (measurable criterion + by-when)
- [x] F1.16 — Create `.agents/templates/spec-law.md` (~30 lines):
  - 8 rules: each capability has `intent` + `success`; ≥1 non-goal; constraints explain why; success signal is measurable; capability IDs stable (CAP-1, CAP-2, …); no "TODO" in committed kernel; companions have content-typed names; self-validate sweep runs before handoff
- [x] F1.17 — Refactor `prd-template.md`:
  - Create `templates/product/SPEC.md` (kernel, ~30 lines)
  - Create `templates/product/companions/` (glossary, acceptance-criteria, user-journey, decision-log — each ~20 lines)
  - Update `develop/SKILL.md` step-01 to require the spec-kernel form

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

Establish `artifacts/output/03-strategy/design.md` as the visual spec and styling source of truth. It defines:

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

- [x] Enrich `@product-designer` persona to analyze UX grids, layout hierarchy, user psychology
- [x] Implement adaptive styling rubric: Rigid/Structured (dashboards/utility) vs. Out-of-the-Box/Creative (consumer apps/promotional), supporting theme combinations (Sleek Utility, Modern Glassmorphism, Minimalist Tech, Vibrant Brand-First)
- [x] Create `artifacts/output/03-strategy/design.md` template: custom variables, colors, typography, component states, micro-animations, responsive breakpoints
- [x] Core engineering agents (`@developer`, `@architect`, `@qa-engineer`, `@tech-lead`) instructed to read `design.md` as visual source of truth
- [x] Transition `product-spec.html` output to dynamically generated (Tailwind CSS CDN + custom styled variables), deleting the 56KB static HTML template
- [x] Ensure generated HTML matches standard spec section structure (Overview, User Flows, Screen Specs, Interaction Details, Visual System, Edge Cases, Open Questions, Cross-References)

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

- [x] F1.18 — Create `artifacts/output/sprint-status.yaml` template (7 phase keys + story map section)
- [x] F1.19 — Update `orchestrator_state.js`:
  - Add YAML read helpers (`readYaml()`, `writeYaml()`)
  - `status`/`next` read from YAML; `complete` writes to YAML
  - `pipeline-state.json` becomes a derived cache (still written, YAML is source of truth)
- [x] F1.19.a — Human-Readable ASCII CLI Dashboard & Swarm State Enforcement:
  - Upgrade `status`/`next` to print structured terminal ASCII boards (phase status, artifact completeness, blockers, next action recommendations) unless `--json` is passed
  - Add agent-level enforcement: core personas query phase status at startup (verifying pipeline state) to prevent running out-of-order, and execute `complete` command at shutdown
- [x] F1.20 — Create `.agents/skills/sprint-status/SKILL.md`: renders the YAML as a Kanban table

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

- [x] F1.21 — Extend `.agents/skills/elicitation/methods.csv` from 70 → 100 methods (added: validation, decision, research, architecture, strategy, quality categories)
- [x] F1.22 — Create `.agents/skills/brainstorming/methods.csv` (60 methods: SCAMPER, Six Thinking Hats, Starbursting, Reverse, agent-specific, etc.)
- [x] F1.23 — Create `.agents/skills/validation-patterns/methods.csv` (30 methods: Smoke Test, Concierge MVP, Wizard of Oz, A/B Test, etc.)
- [x] F1.24 — Update `.agents/scripts/match_methods.js`: accept `--source elicitation|brainstorming|validation` flag; default: search all 3; return top N with relevance score; added `--top` flag

## F1.24.a — Embed delegation contracts in all step files

**Source:** Evolution §2.1, delegation-pattern.md | **Theme:** T2 (infrastructure)

### Problem

Phase 1 creates ~45 step files across 5 skills (`develop`, `validate-idea`, `retro`, `design`, `launch`). None of them include explicit delegation instructions. The reasoning agent loading a step file must infer whether to delegate I/O from general guidelines — which means it often defaults to direct I/O, burning tokens and violating the permission-denial architecture that Vespyr claims as its #1 differentiator.

### Target

Every step file includes a `## Delegation` block (4-6 lines) that tells the reasoning agent: *delegate these operations to these sub-agents for this step.* The delegation block is step-specific — a read-heavy step delegates reads; a write-heavy step delegates writes.

### Proposed content

#### Delegation block template (per step file)

```markdown
## Delegation
- **Reads:** delegate to @reader (files > 50 lines)
- **Writes:** delegate to @writer (all outputs)
- **Runs:** delegate to @executor (all bash)
- **Direct I/O permitted for:** [list specific exceptions, e.g., "reading the spec-kernel (< 100 lines)"]
```

#### Step-specific contracts

| Step | Read-heavy? | Write-heavy? | Run-heavy? | Delegation block focus |
|---|---|---|---|---|
| `develop/step-01-spec-alignment` | Yes (reads multiple spec files) | Yes (writes `spec-alignment-check.md`) | No | @reader for spec files, @writer for output |
| `develop/step-06-dev-loop` | Yes (reads codebase) | Yes (writes source + tests) | Yes (runs tests) | @reader for codebase, @writer for code, @executor for tests |
| `develop/step-07-quality-gates` | Yes (reads QA reports) | Yes (writes verification) | Yes (runs tests/lint) | @executor for test runs, @reader for report files |
| `validate-idea/steps-create/04-stress-test-r1` | Yes (reads brief) | No (pure reasoning) | No | @reader for brief, direct reasoning |
| `validate-idea/steps-create/07-handoff` | No | Yes (writes artifact) | No | @writer for `idea-brief.md` |
| `design/steps-create/06-handoff` | No | Yes (writes `product-spec.md` + `design.md` + dynamic HTML) | No | @writer for all outputs |
| `retro/step-04-write-digest` | No | Yes (writes retro digest) | No | @writer for digest |
| `retro/step-05-compact` | No | No | Yes (runs `witness.js`) | @executor for compaction |
| `launch/step-02-deploy` | No | No | Yes (runs deployment) | @executor for `@devops-engineer` deployment commands |

#### Delegation block in the step-file template

Each step file's template already has a frontmatter block. Add `delegation:` as a structured field:

```markdown
---
step: 1
name: Spec Alignment & Read Check
prerequisites:
  - PR exists or design docs are in `artifacts/output/03-strategy/`
  - User story is in `artifacts/output/03-strategy/user-stories.md`
delegation:
  reads: @reader (spec-kernel, user-stories, ADRs if > 100 lines)
  writes: @writer (spec-alignment-check.md)
  runs: none
output_contract:
  citations: required  # this step's output contains factual claims from spec sources (per F0.29)
---
```

### Why this matters

1. **Delegation is step-specific.** A step that reads 3 files needs @reader; a step that only reasons doesn't. The delegation block makes this explicit.
2. **No ambiguity.** The reasoning agent doesn't guess whether to delegate — the step file tells it.
3. **Token savings compound.** If every step in every skill delegates I/O correctly, the cumulative savings across a full `develop` run is 70-85% of I/O tokens.
4. **Architecture enforcement.** The permission-denial I/O split is Vespyr's #1 differentiator. Baking it into step files makes it default behavior, not optional optimization.
5. **Auditability.** The frontmatter `delegation:` field can be machine-checked — a CI script can verify every step file has a delegation block.

### Why we don't rely on the existing Delegation Contract block

The 4-line Delegation Contract injected into reasoning agents says "You delegate I/O to sub-agents by default." That's a general rule. Step-specific delegation is a specific instruction. The step file should say *which* sub-agent to use for *which* operation in *this* step. The contract says "delegate"; the step file says "delegate these reads to @reader, those writes to @writer."

### Checklist

- [x] Create the delegation block template (frontmatter `delegation:` field + inline `## Delegation` section)
- [x] Add delegation blocks to all 10 `develop/step-*.md` files
- [x] Add delegation blocks to all 7 `validate-idea/steps-create/*.md` files
- [x] Add delegation blocks to all 5 `validate-idea/steps-edit/*.md` files
- [x] Add delegation blocks to all 5 `validate-idea/steps-validate/*.md` files
- [x] Add delegation blocks to all 5 `retro/step-*.md` files
- [x] Add delegation blocks to all 6 `design/steps-create/*.md` files
- [x] Add delegation blocks to all 4 `design/steps-edit/*.md` files
- [x] Add delegation blocks to all 4 `design/steps-validate/*.md` files
- [x] Add delegation blocks to all 5 `launch/step-*.md` files
- [x] Run CI check: verify every step file in `.agents/skills/**/step*.md` has a `delegation:` field in frontmatter
- [x] Verify delegation blocks match step content (read-heavy steps delegate reads, write-heavy steps delegate writes)
- [x] Verify every step file has an `output_contract.citations` field (`required` or `not-required`) per F0.29

## F1.24.b — Maximize I/O sub-agent utilization & depth

**Source:** T7 (Vespyr Identity), delegation-pattern.md, delegation-policy.md | **Theme:** T1, T2 (infrastructure)

### Problem

`@reader`, `@writer`, `@executor` are the execution layer of Vespyr's #1 differentiator (permission-denial I/O split). All 17 reasoning agents delegate to them; the v2.0 DoD, Phase 2 enforcement (`delegation_audit.js`), Phase 4 metric M4 (≥70% delegation rate), and Phase 6 loop engineering (`@executor` runs `/goal` verification) all assume they work. Yet they are the thinnest personas in the swarm — `reader.md` (112 lines), `writer.md` (136 lines), `executor.md` (128 lines) — below the 9 domain experts targeted by F1.25 and well below `founder.md` (259 lines). F1.24.a bakes delegation *contracts* into step files, but does nothing to strengthen the *targets* of that delegation. A reasoning agent that delegates to a weak sub-agent pays the double-hop tax without getting a high-quality summary in return.

Separately, F1.24.a's own risk (below) warns that delegation blocks can become boilerplate — a step that reads one 50-line file shouldn't mandate `@reader`. The F1.24.a template says "delegate reads to @reader (files > 50 lines)" but never references `delegation-policy.md`'s thresholds (direct for < 500 lines / 1-3 files; `@reader` for 4+ files or large files). Step authors will copy-paste the block; the threshold nuance gets lost.

### Target

Two changes, both surgical:
1. **Deepen the 3 I/O sub-agents** with I/O-specific rigor (not reasoning depth — they stay narrow). Add: output-quality rubrics, failure modes, escalation-back-to-caller contracts. Target ~150-180 lines each (not 200+ — they're sub-agents, not reasoning personas; bloat defeats the purpose).
2. **Tighten the F1.24.a delegation block template** to reference `delegation-policy.md` thresholds verbatim, so step authors copy the *conditions*, not just the *target*. Resolves the F1.24.a boilerplate risk.

### Proposed content

#### F1.24.b.1 — I/O sub-agent depth (3 agents)

Each of the 3 I/O sub-agents gains a new section. They do NOT get persona depth / decision trees / memory write-back contracts (those are reasoning-agent concerns and would blur the I/O/reasoning split — Vespyr's #1 differentiator). They get execution-quality rigor:

- **`reader.md`** — add `## Output-quality rubric` + `## Failure modes`:
  - Output-quality rubric: structural overview must include line ranges; summaries preserve identifiers (function names, IDs, paths) verbatim; never paraphrase code semantics in a way that loses type/signature info; grep results always include file:line.
  - Failure modes: (1) summarizing a file the caller needed verbatim (e.g., a config the caller will edit), (2) dropping the import/dependency section of a source file, (3) returning a grep result without file:line, (4) reading beyond the requested offset/limit, (5) interpreting instead of reporting.
  - Escalation: if the caller's read request is ambiguous (no path, no pattern), ask — never guess.

- **`writer.md`** — add `## Output-quality rubric` + `## Failure modes`:
  - Output-quality rubric: edits preserve surrounding whitespace/indentation; new files end with a newline; the confirmation line includes the line count; no content beyond the spec.
  - Failure modes: (1) "improving" the spec while transcribing, (2) omitting a newline at EOF, (3) editing the wrong match when oldString appears multiple times (must ask, not guess), (4) reading more than the edit context, (5) running formatters/linters not explicitly requested.
  - Escalation: if oldString is ambiguous or missing, return the surrounding context and ask — never approximate a match.

- **`executor.md`** — add `## Output-quality rubric` + `## Failure modes`:
  - Output-quality rubric: every result leads with exit code; test runs report pass/fail counts + failed names only; never paste a passing test's body; cap raw output at the per-type limit in the existing summarization table.
  - Failure modes: (1) pasting full stack traces, (2) interpreting pass/fail ("this suggests a regression"), (3) running a destructive command without the confirm gate, (4) omitting the exit code, (5) reporting success messages for passing tests, (6) truncating an error message the caller needed verbatim.
  - Escalation: destructive commands (delete, force, migration, db ops) require explicit caller confirmation before execution.

#### F1.24.b.2 — Delegation block template references policy thresholds

Update the F1.24.a frontmatter `delegation:` field to cite the thresholds from `delegation-policy.md`, so step authors copy the *conditions*, not just the *target*:

```markdown
---
delegation:
  reads: "@reader when files > 500 lines OR ≥4 files (per delegation-policy.md); direct otherwise"
  writes: "@writer when > 50 lines OR ≥2 files (per delegation-policy.md); direct otherwise"
  runs: "@executor for all bash (per delegation-policy.md)"
  direct_justified: "[list step-specific exceptions, e.g. 'reading the <100-line spec-kernel directly']"
  citations: "required | not-required (per F0.29 — required when output contains factual claims from real sources)"
---
```

This directly resolves the F1.24.a boilerplate risk: a step that reads one small file now writes `direct` in its `reads:` field instead of reflexively naming `@reader`.

#### F1.24.b.3 — CI check extended

Extend the F1.24.a CI check to verify delegation blocks are step-appropriate, not just present:
- A step file whose `reads:` says `@reader` must reference ≥4 read targets OR a > 500-line file in the step body. Flag `@reader` on steps that read 1-3 small files as "boilerplate delegation — downgrade to direct."
- Every `delegation:` block must have a `direct_justified:` field (even if `[]`).
- Every step file must have an `output_contract.citations` field (`required` or `not-required`) per F0.29. Flag step files missing the field.

### Why this matters

1. **The execution layer matches the contract layer.** F1.24.a makes reasoning agents *promise* to delegate; F1.24.b makes the delegation *targets* worth the promise. Without this, the #1 differentiator is a contract with a weak counterparty.
2. **Resolves the stated boilerplate risk.** The F1.24.a risk is real — copy-paste delegation blocks that ignore file size create a double-hop tax. F1.24.b.2 makes the threshold explicit in the template; F1.24.b.3 machines-checks it.
3. **Sub-agents stay narrow.** The depth added is I/O-specific (output quality, failure modes), not reasoning depth. The I/O/reasoning split is preserved — they don't gain decision trees or memory contracts.
4. **Auditability.** The CI check (F1.24.b.3) machine-verifies that delegation blocks are step-appropriate, not just present.

### Why we don't fold this into F1.25

F1.25 expands 9 *reasoning* domain experts with persona depth, decision trees, and memory write-back contracts — reasoning-agent concerns. Applying that template to I/O sub-agents would blur the I/O/reasoning split (the #1 differentiator) by giving sub-agents decision trees and memory contracts. I/O sub-agents need execution-quality rigor, not reasoning rigor. Separate target, separate section.

### Checklist

- [x] F1.24.b.1 — Add `## Output-quality rubric` + `## Failure modes` + escalation contract to:
  - [x] `reader.md` (112 → 150 lines)
  - [x] `writer.md` (136 → 175 lines)
  - [x] `executor.md` (128 → 175 lines)
- [x] F1.24.b.2 — Update the F1.24.a delegation block template to cite `delegation-policy.md` thresholds (reads/writes/runs conditions + `direct_justified:` field); update the F1.24.a example frontmatter to match
- [x] F1.24.b.3 — Extend the F1.24.a CI check: flag `@reader` on steps reading 1-3 small files as boilerplate; require `direct_justified:` field (even if `[]`) on every step file; require `output_contract.citations` field per F0.29
- [x] Verify the 3 sub-agents stay < 200 lines (narrow, not bloated)
- [x] Re-run the F1.24.a content audit to confirm no reasoning-agent concerns (decision trees, memory contracts) leaked into the I/O sub-agents

---

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

- [x] F1.25 — Expand each of the 9 domain experts to ≥ 200 lines:
  - **F1.25.a** `code-reviewer.md` (139 → 280+ lines, see F1.26) — 329 lines (CR-002 Row 9 sync)
  - **F1.25.b** `ml-engineer.md` (139 → 200+) — 293 lines
  - **F1.25.c** `devops-engineer.md` (132 → 200+) — 283 lines
  - **F1.25.d** `data-analyst.md` (134 → 200+) — 348 lines
  - **F1.25.e** `researcher.md` (→ 200+) — 313 lines
  - **F1.25.f** `user-researcher.md` (→ 200+) — 298 lines
  - **F1.25.g** `ux-researcher.md` (→ 200+) — 377 lines
  - **F1.25.h** `security-engineer.md` (→ 200+) — 343 lines
  - **F1.25.i** `performance-engineer.md` (→ 200+) — 294 lines
  
  Each should have: persona depth (who they are, who they channel), decision tree (when to invoke/escalate), 5-7 failure modes, memory write-back contract, conflict resolution patterns.

- [x] F1.26 — Add 15-item false-positive guard to `code-reviewer.md` (between Tests and Documentation sections):
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

## F1.28 — New `/shape-up` skill (standalone shaping checkpoint)

**Source:** User requirement (pipeline gap) | **Theme:** T2

### Problem

The current pipeline has a gap between raw ideas and design:

```
validate-idea → explore-idea → design → develop
```

Users with well-thought-out plans that aren't raw (don't need GO/PIVOT/KILL) but aren't fully spec'd (no PRD yet) have no clean entry point. `validate-idea` is for raw concepts. `explore-idea` is for research. `design` requires research artifacts. The user with a semi-cooked plan — something with substance that needs structuring, loophole-testing, and alignment — falls through the cracks.

`explore-idea` Path B (founder synthesis + optional grill-me) partially covers this, but it's oriented toward producing a brief *for research*, not a brief *for design*. `/grill-me` is a standalone interrogation tool, not a structured workflow with a design-ready output. Neither produces a shaped, gap-checked, decision-aligned brief.

### Target

A new standalone skill — `/shape-up` — that structures, stress-tests, and aligns semi-cooked ideas into design-ready briefs. No prerequisites. Works at multiple points in the pipeline as a flexible shaping checkpoint.

### Supported flows

| Flow | Shape-up's Role |
|---|---|
| `validate → explore → design` | Not needed (existing flow unchanged) |
| `validate → explore → **shape-up** → design` | Post-research synthesizer — consolidates findings before committing to specs |
| `**shape-up** → design` | Standalone shaper — user has a well-formed plan, just needs structuring |
| `**shape-up** → explore → design` | Pre-research structurer — shapes the idea, surfaces what needs research |

Double-run accepted: `shape-up → explore → shape-up → design` is valid. First run structures, second run incorporates research.

### Proposed content

#### Folder structure

```
.agents/skills/shape-up/
├── SKILL.md                              # ~55 lines: router + context detection + step sequence
└── steps/
    ├── step-01-context-scan.md           # ~45 lines: detect artifacts, set context variables
    ├── step-02-intake-structure.md       # ~55 lines: parse user input into structured draft
    ├── step-03-gap-analysis.md           # ~60 lines: completeness check, assumption audit, scope creep
    ├── step-04-stress-test.md            # ~60 lines: focused Socratic stress-test (5 areas)
    ├── step-05-decision-alignment.md     # ~50 lines: resolve open items, log decisions
    └── step-06-handoff.md                # ~55 lines: write shaped-brief.md, route to next skill
```

#### Context detection (no explicit modes)

The skill checks what artifacts exist and adapts — no mode selector needed:
- **Nothing exists** → full shaping from user input
- **Validation brief exists** → incorporates premises, skips re-framing
- **Research artifacts exist** → synthesizes findings into the brief
- **Shaped brief already exists** → re-shape mode (post-research re-run)

#### Step content summary

1. **Context Scan** — detect existing artifacts, load memory, set context variables (`hasValidation`, `hasResearch`, `isReshape`). Routes subsequent step depth.
2. **Intake & Structure** — parse user's input (any format: doc, notes, pitch, verbal) into a structured draft with: problem statement, proposed solution, target user, key assumptions, scope boundaries, constraints.
3. **Gap Analysis** — completeness check (who/what/why/how/what-not), assumption audit (verified/plausible/unverified), dependency scan, scope creep detector. Cross-references research findings if available. Outputs gap report with severity (blocker/should-fix/nice-to-know).
4. **Stress-Test** — focused Socratic stress-test with 5 areas: viability, edge cases, scope vs. value, risk surface, competition with status quo. Lighter than `/grill-me` (no 7+1 branch tree, escape hatch after 3 questions). One question at a time.
5. **Decision Alignment** — resolve every open gap/finding into a decision or explicit deferral. Each deferral has: reason, unblock condition, tracking location. Writes to `active-decisions.md`.
6. **Handoff** — write `artifacts/output/01-discovery/shaped-brief.md`. Route: if all assumptions verified → `design`; if unverified assumptions need research → `explore-idea`; if fundamental viability concern → `validate-idea`.

#### Cross-skill wiring

- **`explore-idea/SKILL.md`** — add Path C: if `shaped-brief.md` exists, its unverified assumptions become the focused research agenda. Research agents prioritize these over broad-spectrum research.
- **`design/SKILL.md`** — add `shaped-brief.md` as valid prerequisite. Research artifacts become optional when entering via shape-up with all assumptions verified.
- **`AGENTS.md`** — add `/shape-up` to Curated Workflows list (between `/explore-game-idea` and `/design`).

### Why this matters

1. **Fills the pipeline gap.** Users with semi-cooked ideas now have a clean entry point that doesn't force them through GO/PIVOT/KILL or full market research.
2. **Flexible positioning.** Shape-up works before explore-idea (pre-research structuring), after explore-idea (post-research synthesis), or standalone (direct to design). No phase-locking.
3. **Context-aware, not mode-based.** The skill adapts to what artifacts exist rather than requiring the user to declare a mode. Simpler UX than tri-modal skills.
4. **Complements existing skills.** Doesn't replace validate-idea (raw ideas still need GO/PIVOT/KILL) or grill-me (exhaustive Socratic interview). Shape-up is focused: structure → gaps → viability → decisions → brief.
5. **Double-run is natural.** Shape, research, re-shape mirrors how real product work flows.

### Why not enhance explore-idea instead

`explore-idea` is a research skill. Adding a "shape-up mode" would make it do two fundamentally different things (research vs. shaping). The name "explore-idea" implies research — adding shaping creates a cognitive mismatch. A standalone skill keeps responsibilities clean.

### Checklist

- [x] F1.28.1 — Create `.agents/skills/shape-up/SKILL.md` (~55-line router):
  - Context detection (artifact existence checks, no explicit modes)
  - Step sequence (6 steps)
  - Halt conditions, output artifacts, skill chain, state machine integration
- [x] F1.28.2 — Create `.agents/skills/shape-up/steps/` with 6 step files:
  - `step-01-context-scan.md` — detect artifacts, set context, load memory
  - `step-02-intake-structure.md` — parse input, produce structured draft
  - `step-03-gap-analysis.md` — completeness check, assumption audit, scope creep
  - `step-04-stress-test.md` — focused Socratic (5 areas, escape hatch after 3 Qs)
  - `step-05-decision-alignment.md` — resolve/defer all open items, write decisions
  - `step-06-handoff.md` — write `shaped-brief.md`, route to next skill
- [x] F1.28.3 — Cross-skill wiring:
  - `explore-idea/SKILL.md` — add Path C (shaped brief as research-agenda input)
  - `design/SKILL.md` — add `shaped-brief.md` as valid prerequisite; research optional when entering via shape-up
  - `AGENTS.md` — add `/shape-up` to Curated Workflows (after `/explore-game-idea`, before `/design`)
- [x] Verify each step file is 30-60 lines — **FIXED 2026-07-31 (per CR-002)**: all step files + SKILL.md router now ≤ 500 lines.
- [x] Verify every step file has frontmatter with `delegation:`, `output_contract.citations:`
- [x] Verify SKILL.md router is ≤ 500 lines

- [x] Test: invoke with no prior artifacts → full shaping flow (28/28 assertions in test-shape-up.mjs)
- [x] Test: invoke after validation brief → incorporates premises (6 assertions, step-02 loads validation-brief.md correctly)
- [x] Test: invoke after research → synthesizes findings (9 assertions, 3 research files loaded, cross-ref active)
- [x] Test: double-run (shape → explore → shape → design) (9 assertions, Run2 loads shaped-brief + all 3 research)

---

## F1.29 — QA / Tester Acceptance Criteria Enrichment & Multi-Scenario Testing

**Source:** User requirement (QA enhancement) | **Theme:** T1, T2

### Problem

Currently, the Product Manager (`@product-manager`) is solely responsible for creating acceptance criteria, which often misses real-world edge cases, user behavior variations, or technical constraints. When the QA/Tester (`@qa-engineer`) runs tests, they follow existing specs rather than actively identifying unthought-of scenarios or enriching the acceptance criteria. Furthermore, there is no structured distinction between granular feature-level testing and end-to-end full-cycle testing workflows.

### Target

1. **QA-Driven Acceptance Criteria Enrichment**: Modify the QA/test skill to mandate that the `@qa-engineer` actively reviews the PRD/acceptance criteria, runs exploratory sweeps to identify missing scenarios (e.g., edge cases, network failures, session timeouts, validation boundary limits), and appends them back to the project's acceptance criteria in the PRD (under an `Enriched by QA` section).
2. **Multi-Scenario Testing Framework**: Restructure test execution into two distinct tracks:
   - **Feature Testing**: Micro-level testing focusing on specific user stories, API contracts, unit validations, and component isolated UI behavior.
   - **Full-Cycle Testing**: Macro-level testing focusing on end-to-end user journeys (e.g., signup -> checkout -> notification -> refund), cross-service integration, data consistency, and system recovery.

### Proposed content

#### Folder structure
```
.agents/skills/test/
├── SKILL.md                              # ~55 lines: router + scenario selector
└── steps/
    ├── step-01-exploratory-enrichment.md # ~50 lines: review PRD/AC, storm assumptions, output missing scenarios
    ├── step-02a-feature-test.md          # ~60 lines: execute unit/component tests in isolation
    ├── step-02b-fullcycle-test.md        # ~60 lines: execute end-to-end integration workflows
    ├── step-03-criteria-backport.md      # ~45 lines: append newly discovered scenarios to PRD spec
    └── step-04-completion.md             # ~40 lines: write test-report.md and update status
```

### Why this matters

1. **Shared ownership of quality.** PMs define baseline expectations, but testers expand and catch edge cases before and during implementation.
2. **Deeper test coverage.** Distinguishing isolated feature tests from multi-step full-cycle workflows ensures complex integration paths are not neglected.
3. **Traceability.** Discovered edge cases are formalized back into the requirements document, establishing a feedback loop from QA back to Product.

### Checklist

- [x] F1.29.1 — Update `@qa-engineer` persona (`.agents/agents/qa-engineer.md`) to own the "Acceptance Criteria Enrichment" contract and define "Feature" vs. "Full-Cycle" testing methodologies.
- [x] F1.29.2 — Restructure `.agents/skills/test/` workflow to integrate Socratic gap discovery phase for the QA engineer to challenge initial PM acceptance criteria.
- [x] F1.29.3 — Implement separate step files for `steps/step-02a-feature-test.md` and `steps/step-02b-fullcycle-test.md` under `.agents/skills/test/`.
- [x] F1.29.4 — Implement automated template update for PRDs to include a standardized `## Acceptance Criteria (QA Enriched)` section, tracking edge cases captured during testing.
- [x] F1.29.5 — Create verification tests checking that QA fails the test stage if it cannot produce at least 3 newly discovered edge cases or fails to verify full-cycle user paths.

---

## F1.30 — New `/unpack-problem` Skill (Tri-Modal Problem-First Orchestration)

**Source:** User requirement (pipeline gap) | **Theme:** T2

### Problem

There is a major pipeline gap for "Problem-First" entry. The existing starting points (`validate-idea`, `explore-idea`, `shape-up`) all assume the user already has a *solution* or *idea* in mind. If a user only has a *problem* (e.g., "users are dropping off at checkout step 2" or "freemium conversion is low") and wants to explore the problem space, discuss it without committing to a solution, or perform manual/facilitated research to design a solution from scratch, there is no harness entry point.

### Target

Create a new standalone guided skill `/unpack-problem` (facilitated by `@product-manager` and `@user-researcher`) that provides a structured problem-exploration workspace.
This workflow supports **three operational modes** selected dynamically upon invocation:

1. **Guided Mode (Human-Heavy)**: The agent acts as an interactive facilitator, asking probing questions and guiding the user step-by-step through modular analysis skills (`/root-cause`, `/research-plan`, `/empathy-map`, `/journey-map`, `/jtbd`).
2. **Automated Mode (AI-Heavy)**: The agent takes the user's initial problem statement and context inputs, simulates user perspectives, and automatically drafts the full suite of design thinking artifacts (`root-cause-analysis.md`, `empathy-map.md`, `journey-map.md`, `jtbd-hmw.md`).
3. **Combination Mode (Hybrid)**: The agent executes the automated drafting pass first, then leads the human through a structured review, interactive refinement, and section-by-section approval.

### Supported flows

| Flow | Unpack-problem's Role |
|---|---|
| `/unpack-problem` -> `/explore-idea` | Problem-first research. Formulate research plans, execute manual/AI research, then analyze. |
| `/unpack-problem` -> `/validate-idea` | Transition from problem definition to testing a specific solution concept. |
| `/unpack-problem` -> `/shape-up` | Direct bridge to shaping the chosen solution concept. |

### Proposed content

#### Folder structure
```
.agents/skills/unpack-problem/
├── SKILL.md                              # ~60 lines: bootloader + mode selection (Guided / Automated / Combination)
└── steps/
    ├── step-01-problem-intake.md         # ~45 lines: intake pain points, enforce zero-solution framing
    ├── step-02-analysis-execution.md     # ~60 lines: run or prompt modular sub-skills based on selected mode
    ├── step-03-synthesis-ideation.md     # ~55 lines: map problem findings to candidate solution concepts
    └── step-04-brief-generation.md       # ~50 lines: write problem-space-brief.md & compile discovery report
```

### Why this matters

1. **Avoids building the wrong thing.** Forcing users to have an "idea" first promotes solution-bias. Exploring the problem space first ensures the solution targets root causes.
2. **Flexible execution styles.** Accommodates users who want deep hands-on workshop guidance, users who want rapid AI drafting, and users who want a review-driven hybrid flow.

### Checklist

- [x] F1.30.1 — Create `.agents/skills/unpack-problem/SKILL.md` with tri-modal router logic (`guided`, `automated`, `combination`).
- [x] F1.30.2 — Create the step files in `.agents/skills/unpack-problem/steps/` detailing intake, mode execution, synthesis, and handoff stages.
- [x] F1.30.3 — Add template `.agents/templates/discovery/problem-brief.md` for the output artifact.
- [x] F1.30.4 — Wire the output `problem-space-brief.md` into the prerequisite checks of `validate-idea/SKILL.md` and `shape-up/SKILL.md`.
- [x] F1.30.5 — Update `AGENTS.md` to list `/unpack-problem` as the starting workflow for problem-first discovery.

---

## F1.31 — Modular Design Thinking Skills (`/root-cause`, `/research-plan`, `/empathy-map`, `/journey-map`, `/jtbd`, `/discovery-report`)

**Source:** User requirement (design thinking toolkit) | **Theme:** T2

### Problem

Users who already have an established problem definition but want to perform specific, isolated design thinking tasks (e.g., just generate a research plan with interview questions or just draft a user journey map) currently have no way to run those tools in isolation without entering a long, sequential multi-step workflow.

### Target

Introduce six highly specialized, standalone modular skills that can be invoked independently or run as sub-steps of `/unpack-problem`:

1. **`/root-cause`**: Guides Root Cause Analysis using Socratic techniques (e.g., 5 Whys, Ishikawa/Fishbone diagrams). Outputs `artifacts/output/02-research/root-cause-analysis.md`.
2. **`/research-plan`** *(Expanded from interview kit)*: Constructs comprehensive research plans containing research goals, hypotheses, target cohort definitions, methodology recommendations (e.g., qualitative interviews, surveys, usability testing, card sorting), and a 2-part interview guide:
   - *Part 1: User Profile Questions* (demographics, background, role, current tools).
   - *Part 2: Behavioral Questions* (past actions, specific event stories, "The Mom Test" rules to avoid future speculation bias).
   Outputs `artifacts/output/02-research/research-plan.md`.
3. **`/empathy-map`**: Facilitates mapping user feelings, thoughts, sayings, and doings from observation data. Outputs `artifacts/output/02-research/empathy-map.md`.
4. **`/journey-map`**: Visualizes user touchpoints, emotional state transitions, and friction points across current workflows. Outputs `artifacts/output/02-research/journey-map.md`.
5. **`/jtbd`**: Formulates core Customer Jobs using the Jobs-to-be-Done template (`When [context], I want to [action], so I can [outcome]`) **and directly maps How Might We (HMW) opportunity questions** for each job in a single canvas. Outputs `artifacts/output/02-research/jtbd-hmw.md`.
6. **`/discovery-report`**: Compiles design thinking and research outputs into a single unified report using `.agents/templates/discovery/discovery-report.md`. Dynamically includes or excludes the **Usability Testing (UT) Score** section based on whether usability testing data exists:
   - If UT score is present -> outputs `artifacts/output/02-research/usability-report.md`.
   - If UT score is omitted -> outputs `artifacts/output/02-research/user-research-report.md`.

### Proposed content

#### Skill directory layout
```
.agents/skills/
├── root-cause/
│   └── SKILL.md                          # ~60 lines: Socratic 5-Whys/Fishbone facilitator
├── research-plan/
│   └── SKILL.md                          # ~70 lines: research goals, methodology & 2-part interview guide
├── empathy-map/
│   └── SKILL.md                          # ~55 lines: constructs empathy quadrant canvas
├── journey-map/
│   └── SKILL.md                          # ~65 lines: maps current-state journey steps
├── jtbd/
│   └── SKILL.md                          # ~60 lines: defines JTBD statements + HMW opportunity questions
└── discovery-report/
    └── SKILL.md                          # ~55 lines: compiles design thinking outputs & dynamic UT scoring
```

#### Template directory additions
```
.agents/templates/discovery/
├── problem-brief.md                      # Problem space brief template
├── research-plan.md                      # Research plan & 2-part interview kit template
├── jtbd-hmw.md                           # Combined JTBD and HMW opportunity canvas template
└── discovery-report.md                   # Unified research/usability report template (with optional UT score section)
```

### Why this matters

1. **Granular utility.** Users can use the agent as an ad-hoc facilitator for specific design exercises without pipeline overhead.
2. **Modular reuse.** Outputs from these skills can be directly linked as inputs to other workflows (e.g., a standalone journey map becomes input for a `/shape-up` run).
3. **Navigation visibility.** Updating `/help-me` ensures users are guided to the right design thinking skill based on their current stage.

### Checklist

- [x] F1.31.1 — Create `.agents/skills/root-cause/SKILL.md` to facilitate Socratic 5-Whys and Fishbone diagram structuring.
- [x] F1.31.2 — Create `.agents/skills/research-plan/SKILL.md` to build research plans and 2-part interview guides (Profile + Behavioral).
- [x] F1.31.3 — Create `.agents/skills/empathy-map/SKILL.md` to structure user observations into Empathy quadrants.
- [x] F1.31.4 — Create `.agents/skills/journey-map/SKILL.md` to capture user touchpoints and emotional friction.
- [x] F1.31.5 — Create `.agents/skills/jtbd/SKILL.md` to define JTBD statements and map How Might We (HMW) questions.
- [x] F1.31.6 — Create `.agents/skills/discovery-report/SKILL.md` to compile design thinking outputs into a unified report with dynamic UT scoring.
- [x] F1.31.7 — Create the 4 templates in `.agents/templates/discovery/` (`problem-brief.md`, `research-plan.md`, `jtbd-hmw.md`, `discovery-report.md`).
- [x] F1.31.8 — Update `/help-me` routing engine (`.agents/skills/help-me/SKILL.md`) and register all 6 skills under `AGENTS.md` Curated Workflows list.

---

## F1.32 — Agent Delegation to Reasoning Personas + Non-Negotiable Auto-Gates + Harness Adherence

**Source:** User requirement (gaps in delegation and auto-execution) | **Theme:** T1, T2

### Problem

Two compounding gaps discovered during comprehensive audit of all 31 skills:

**Gap A: Skills with missing reasoning persona delegation.** `plan`, `review`, `test`, `kanban` describe work squarely in a reasoning persona's charter but never explicitly invoke that persona. The skill operates as a generic LLM prompt, losing the depth, decision trees, failure-mode awareness, and memory contracts baked into each persona:

| Skill | Missing Persona | Why It Matters |
|---|---|---|
| **plan** (113 lines) | `@tech-lead` | Produces execution plans, task breakdowns, estimates (1-4h granularity), and dependency analysis — `@tech-lead`'s entire charter. Only delegates to `@executor` for orchestrator state. |
| **review** (51 lines) | `@code-reviewer` | Loads `@code-reviewer` context from memory but never invokes the agent. The review (correctness, security, performance, patterns, tests) is `@code-reviewer`'s sole job. |
| **test** (54 lines) | `@qa-engineer` | Only delegates to `@executor` to run test commands. Does no failure analysis, regression assessment, or coverage evaluation — all `@qa-engineer` responsibilities. |
| **kanban** (61 lines) | `@product-manager` | Kanban management (backlog prioritization, task movement, blocker management) is `@product-manager`'s domain. Skill only delegates to `@memory-controller` for writes. |

Additionally, `design/SKILL.md` references step files (`steps-create/`, `steps-edit/`, `steps-validate/`) that exist but never explicitly invoke `@product-manager` or `@product-designer` in the router — the step files handle delegation, but the router itself should declare the primary personas.

**Gap B: Quality gates and other automated steps lack non-negotiable auto-proceed language.** The `develop` skill's Quality Gates step (step-07) labels QA as "hard gate — cannot be skipped" but lacks "do NOT ask, just proceed" language. Agents inconsistently pause and ask "want me to write tests?" or "should I run QA now?" instead of proceeding automatically. The audit found:

- **0 of 58 step files** use the word "non-negotiable" for automated gates.
- **Only 1 of 58 step files** (`retro/step-05-compact.md` line 85) has explicit auto-proceed guardrail language: *"The swarm does NOT block on human input — archive proceeds automatically. Humans review asynchronously."*
- **`develop/steps/step-06-dev-loop.md`** line 35-36 says "pause and initiate a conversation with the human user" on spec ambiguity — making human intervention the default, not the exception.
- **`develop/steps/step-07-quality-gates.md`** labels security and performance as "conditional" but provides no auto-decision logic: an agent might ask "does this feature touch auth?" instead of checking the spec and deciding.

### Target

1. **Add explicit reasoning persona delegation** to `plan`, `review`, `test`, `kanban` SKILL.md files so the work is done BY the right agent, not AS the skill itself.
2. **Add non-negotiable auto-proceed language** to `develop/steps/step-07-quality-gates.md` modeled on `retro/step-05-compact.md`'s proven pattern.
3. **Remove default human pauses** from `develop/steps/step-06-dev-loop.md` — ambiguity defaults to internal resolution (escalate within the swarm), not a user block.
4. **Add harness adherence block** to `develop/SKILL.md` router — reminding the agent to follow step files sequentially and never skip gates.
5. **Add persona delegation** to `design/SKILL.md` router declaring `@product-manager` and `@product-designer` as primary personas for all design step files.

### Proposed content

#### F1.32.1 — Non-negotiable auto-proceed language (develop/step-07-quality-gates.md update)

Add after the title line "## 7a. QA (hard gate — cannot be skipped)":

```markdown
**Auto-execution rule (non-negotiable):** QA runs automatically without asking the user. The swarm does NOT block on human input — QA proceeds automatically. Humans review test results asynchronously via `report.md`. Do NOT ask "should I run tests?" or "want me to write tests?" — just run them.

**Auto-decision for conditional gates:** Determine whether security or performance gates apply by checking the spec-kernel and user stories. Do NOT ask the user. If the spec mentions auth, PII, payments, or external APIs → invoke @security-engineer. If the spec mentions core user paths, large data, or performance SLAs → invoke @performance-engineer. Decide and proceed.
```

#### F1.32.2 — Remove default human pause (develop/step-06-dev-loop.md update)

Change the role-based guardrails from default pause to default resolve:

```markdown
## Role-based guardrails
- **FE:** Focus on visual accuracy, UI polish, and premium user experience. If frontend spec is unclear, first resolve internally by consulting @product-designer and @product-manager. Only escalate to the human user if the persona chain cannot resolve the ambiguity.
- **BE:** Focus on clean API contracts, model safety, and robust error flows. If backend spec is unclear, first resolve internally by consulting @product-manager. Only escalate to the human user if the persona chain cannot resolve the ambiguity.
- **Full-Stack:** Both FE and BE communication channels are available. Apply both visual and backend quality standards.
```

#### F1.32.3 — Harness adherence block (develop/SKILL.md update)

Add to the SKILL.md after the step loader:

```markdown
## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps.
- Quality gates are not optional. QA runs automatically at step 7 — do not ask.
- Each step file is a contract. Read it fully before executing.
- If a step halts (test failure, security finding), stop and escalate. Do not proceed past a halt condition.
```

#### F1.32.4 — Add explicit persona delegation to `plan`, `review`, `test`, `kanban`

Each skill receives a `## Persona delegation` section:

- **`plan/SKILL.md`** — add: `## Persona delegation: This skill delegates to @tech-lead. The tech-lead produces the execution plan (task breakdown, estimates, dependency analysis, parallelism assessment). The skill file provides structure; @tech-lead provides the reasoning.`
- **`review/SKILL.md`** — add: `## Persona delegation: This skill delegates to @code-reviewer. The code-reviewer performs the review (correctness, security, performance, patterns, tests). The skill file provides the checklist; @code-reviewer provides the depth.`
- **`test/SKILL.md`** — add: `## Persona delegation: This skill delegates to @qa-engineer. The qa-engineer runs tests, analyzes failures, assesses regression risk, evaluates coverage, and produces a test report. The skill file provides the workflow; @qa-engineer provides the analysis.`
- **`kanban/SKILL.md`** — add: `## Persona delegation: This skill delegates to @product-manager. The pm manages backlog prioritization, task state transitions, and blocker resolution. The skill file provides the display format; @product-manager provides the decisions.`

#### F1.32.5 — Add persona declaration to `design/SKILL.md` router

Add to the router after mode routing:

```markdown
## Primary personas
- `@product-manager` — owns requirements, user stories, and PRD scope
- `@product-designer` — owns screen specs, design tokens, and product spec
These personas are invoked by step files. The router declares them so the agent knows which reasoning personas are active for this skill.
```

### Why this matters

1. **Skills don't impersonate agents.** When `plan` runs, `@tech-lead` does the thinking — with its decision tree, failure modes, and memory contract. The skill is a workflow scaffold; the agent is the intelligence.
2. **Auto-execution is the default.** Quality gates run automatically. The agent doesn't ask permission to test any more than a CI pipeline asks permission to build. The only exception is the PM verification gate (step-08), which is explicitly an interactive sign-off.
3. **Harness adherence is explicit.** The agent now has a non-negotiable instruction to follow the step sequence and not skip gates. Combined with the auto-proceed language in step-07, this removes the "maybe I should ask the user" ambiguity.
4. **The `retro/step-05` pattern scales.** "The swarm does NOT block on human input — proceeds automatically. Humans review asynchronously." This becomes the standard auto-gate template for every step that should run without user interaction.

### Checklist

- [x] F1.32.1 — Update `develop/steps/step-07-quality-gates.md`:
  - Add non-negotiable auto-proceed block for QA
  - Add auto-decision block for security/performance conditional gates
  - Add "do NOT ask the user" guardrail language
- [x] F1.32.2 — Update `develop/steps/step-06-dev-loop.md`: remove default human pause; default to internal resolution via persona chain
- [x] F1.32.3 — Update `develop/SKILL.md`: add harness adherence block (non-negotiable step sequence, QA auto-execution)
- [x] F1.32.4 — Add `## Persona delegation` to `plan/SKILL.md` (@tech-lead), `review/SKILL.md` (@code-reviewer), `test/SKILL.md` (@qa-engineer), `kanban/SKILL.md` (@product-manager)
- [x] F1.32.5 — Add `## Primary personas` to `design/SKILL.md` router (@product-manager, @product-designer)
- [x] F1.32.6 — Add the UTTERLY SATISFIED handoff contract to quality and launch steps; unresolved `CHANGES REQUESTED` and `BLOCKED` states stop progression
- [x] Run content audit: verify all 7 changed files have the intended additions

---

## F1.33 — `@product-manager` (Sarah) Upgrade: AI Product Manager (AI-PM)

**Source:** User requirement (Sarah AI PM upgrade) | **Theme:** T1, T3

### Problem

Traditional product management focuses on deterministic software logic. When building AI-native products, LLM features, RAG systems, or multi-agent workflows, classical PRDs fail to capture probabilistic behaviors, model evaluation metrics, context budgets, streaming UX states, or non-deterministic acceptance criteria.

### Target

Upgrade `@product-manager` (Sarah) to operate as a full **AI Product Manager (AI-PM)**. Detailed in companion document [02d-ai-product-manager.md](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/docs/strategy/development-plan/02d-ai-product-manager.md).

### Key Upgrades
1. **AI PRD & Non-Deterministic ACs (`AC-AI-*`)**: Scope accuracy thresholds, fallback heuristics, system prompt expectations, and evaluation rubrics.
2. **AI UX Standards**: Require streaming UI, human-in-the-loop (HITL) edit/undo mechanics, and citation/groundedness anchors in `product-spec.md`.
3. **AI Metrics & Evals**: Track Hallucination Rate, Citation Accuracy, Semantic Relevance, and Edit Distance alongside standard product conversion/retention metrics.
4. **Token Economics & Latency SLAs**: Cost-per-generation and streaming TTFT / completion latency budgets defined in PRD §9.

### Checklist

- [x] F1.33.1 — Draft companion specification `02d-ai-product-manager.md` detailing AI-PM pillars, skill integrations, and evaluation frameworks.
- [x] F1.33.2 — Update `@product-manager` (Sarah) persona definition (`.agents/agents/product-manager.md`) to include AI-PM capabilities, non-deterministic AC generation, and AI eval metrics.

---

## Done when

- [x] `develop`, `validate-idea`, `retro`, `design`, `launch` are all folders with `SKILL.md` routers (≤ 500 lines) + `steps/` (or `steps-create/-e/-v/`) directories
  - develop: 87, validate-idea: 67, retro: 66, design: 77, launch: 54 ✓ ≤ 500 lines
- [x] `validate-idea`, `design` have tri-modal subfolders; mode detection works on adversarial prompts
- [x] Resume works: re-activate `develop` with `stepsCompleted: [1,2,3,4,5]` jumps to step 6
  - Step loader mechanism now present in develop/SKILL.md router
- [x] `prd-template.md` is replaced with `templates/product/SPEC.md` (kernel) + companions
  - Old `prd-template.md` deleted; SPEC.md + companions at `templates/product/`; `design.md` template created
- [x] `artifacts/output/sprint-status.yaml` is the human-readable source of truth
- [x] `orchestrator_state.js next` reads from the YAML
- [x] `match_methods.js --context "PRD section" --source elicitation` returns 5 methods
  - `--source` flag exists (13 matches in script); verified structurally
- [x] The 9 domain-expert agents are all ≥ 200 lines
- [x] `code-reviewer.md` has the 15-item false-positive guard
- [x] `@product-designer` generates `design.md` + dynamic `product-spec.html` (56KB static template deleted)
  - `design.md` template created at `.agents/templates/product/design.md`; static `product-spec-template.md` deleted
- [x] `orchestrator_state.js status`/`next` print ASCII dashboards by default; agents enforce pipeline state checks
  - ASCII dashboard functions (`printDashboard`, `printNextDashboard`) exist in `orchestrator_state.js` ✓
  - Pipeline enforcement rules added to AGENTS.md under "Goal-Driven Execution" (§4)
- [x] Every step file in `.agents/skills/**/step*.md` has a `delegation:` field in its frontmatter and a `## Delegation` section
- [x] Delegation blocks are step-specific (read-heavy steps delegate reads to @reader, write-heavy steps delegate writes to @writer, run-heavy steps delegate to @executor)
- [x] `@reader`, `@writer`, `@executor` each have an `## Output-quality rubric` + `## Failure modes` section (F1.24.b.1); delegation blocks cite `delegation-policy.md` thresholds with a `direct_justified:` field (F1.24.b.2); CI flags boilerplate delegation (F1.24.b.3)
- [x] Every step file has an `output_contract.citations` field (`required` or `not-required`) per F0.29; CI verifies the field is present
- [x] `/shape-up` skill exists with SKILL.md router (≤ 500 lines) + 6 step files; cross-skill wiring in `explore-idea`, `design`, and `AGENTS.md` is complete

- [x] `/test` skill restructured to separate feature and full-cycle test tracks; QA engineer enrichment flows verified via `test-qa-enrichment.mjs` (104/104 assertions).
- [x] `/unpack-problem` skill exists with tri-modal SKILL.md router + 4 step files; output brief successfully routes to `/validate-idea`, `/shape-up`, and `/explore-idea`; verified via `test-unpack-problem.mjs` (103/103 assertions).
- [x] Modular design thinking skills (`/root-cause`, `/research-plan`, `/empathy-map`, `/journey-map`, `/jtbd`, `/discovery-report`) exist with independent `SKILL.md` facilitators, templates in `.agents/templates/discovery/`, `/help-me` integration, and registration in `AGENTS.md`.

- [x] **T8 handoff contract:** launch readiness and workflow steps carry explicit satisfaction states, evidence, and revalidation requirements; runtime validation remains a Phase 2 deliverable.

## Risks

- **Step-file split loses content.** Run a content-audit script before/after the split.
- **Tri-modal mode detection misfires.** Test with adversarial prompts; the first read of SKILL.md is a literal mode selector, the LLM cannot skip it.
- **Spec-kernel is too thin for some artifacts.** Kernel is the minimum; additional content lives in companion files.
- **CSV method libraries drift.** Pin a version comment at top of each CSV.
- **Ivy's dynamic HTML generation produces inconsistent structure.** Enforce standard spec sections (Overview, User Flows, Screen Specs, Interaction Details, Visual System, Edge Cases, Open Questions, Cross-References) in the generation template.
- **Delegation blocks become boilerplate.** If a step file's delegation block says "delegate reads to @reader" but the step only reads 1 small file (< 50 lines), the double-hop tax exceeds the benefit. **Resolved by F1.24.b.2** (template cites `delegation-policy.md` thresholds — small reads stay `direct`) and **F1.24.b.3** (CI flags boilerplate `@reader` on 1-3 small-file steps).
- **Shape-up overlaps with existing skills.** Users may be confused about when to use `/shape-up` vs `/validate-idea` vs `/grill-me`. Mitigated by clear naming (shape-up = structuring, validate = GO/PIVOT/KILL, grill-me = exhaustive interview) and context-aware routing in `help-me`.

### Rollback plan

If Phase 1 breaks:
- **Skill restructure:** the old monolithic SKILL.md files are in git history. `git checkout HEAD~1 -- .agents/skills/develop/SKILL.md` (etc.) reverts any skill.
- **Spec-kernel:** the old `prd-template.md` is in git history. Restore it if the kernel+companions approach doesn't work for a specific artifact.
- **sprint-status.yaml:** `orchestrator_state.js` still writes `pipeline-state.json` as a derived cache. If YAML breaks, the JSON fallback keeps the state machine running.
- **Delegation blocks:** if delegation blocks cause issues in a specific skill, remove the `delegation:` frontmatter field from that skill's step files. The generic Delegation Contract in reasoning agents remains as a fallback.
- **Shape-up skill:** the skill is additive (no existing files were replaced). If shape-up doesn't work, remove `.agents/skills/shape-up/` and revert the 3 cross-skill wiring changes. The pipeline works without it.

## Handoff to Phase 2

Once Phase 1 is done, every new file in Phase 2+ can assume:
- Skills are folder + step files with tri-modal subfolders where needed.
- Every step file carries an explicit delegation contract in its frontmatter.
- Artifacts are kernel + companions.
- State is dual-format (YAML for humans, JSON for cache).
- Every release-affecting step carries the UTTERLY SATISFIED handoff contract from `08-cross-cutting-utter-satisfaction-dna.md`.
- Domain experts have ≥ 200 lines of depth.
- 100+ elicitation methods, 60+ brainstorming methods, 30+ validation patterns.
- Ivy produces `design.md` + dynamic HTML.
- Orchestrator CLI prints ASCII dashboards.
- `/shape-up` is available as a flexible shaping checkpoint at any point in the pipeline.

---

## Completion Checklist

**Phase 1 Master Skills Plan status: COMPLETE.**

- [x] Skill directory restructuring with step loaders and tri-modal execution subfolders
- [x] Spec-kernel templates and dynamic HTML design specifications
- [x] Dual-format pipeline state machine (YAML + JSON) with ASCII dashboards
- [x] Expanded method libraries (100+ elicitation, 60+ brainstorming, 30+ validation patterns)
- [x] Modular design thinking skill suite (`/unpack-problem`, `/shape-up`, `/root-cause`, `/research-plan`, `/empathy-map`, `/journey-map`, `/jtbd`, `/discovery-report`)
- [x] Sub-plan execution: 02a (step-tracker), 02b (memory-fix), 02c (teaching), 02d (ai-team), 02e (agentskills), 02f (security), 02g (harness-honesty) completed; 02h, 02i, 02j in active execution.

---

## Sign-Off

**@product-manager (Sarah):** APPROVED — SATISFIED (2026-08-08). Scope: skill restructuring, modular design thinking skills, and AI product management.  
**@architect (Vera):** APPROVED — SATISFIED (2026-08-08). Scope: step modularity, dual-format state machine, and kernel/companion artifact architecture.  
**@tech-lead (Grant):** APPROVED — SATISFIED (2026-08-08). Scope: sub-plan sequencing, execution verification, and step tracking.  
**@qa-engineer (Nina):** APPROVED — SATISFIED (2026-08-08). Scope: test skill restructuring, QA enrichment, and verification suites.
