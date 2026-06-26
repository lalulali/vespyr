# Phase 1 — Skill Restructure + Artifact Rigor

> **Weeks 2–3, ~36 hours**
> **Themes:** T2 (Skill atomicity), T3 (Artifact rigor)
> **Goal:** Skills become atomic + tri-modal. Artifacts become kernel + companions. State is dual-format (JSON + YAML). After this phase, vespyr is "atomic" — skills resume, skills have phases, skills are first-class tools; artifacts are rigorous.

## Source mapping

| F-item | Master ref | Source file/section |
|---|---|---|
| F1.1–F1.2 | Phase 1 / T2 | Evolution 2.1, Adoption 3.1 (develop) |
| F1.3–F1.6 | Phase 1 / T2 | Evolution 2.1+2.3, Adoption 3.1 (validate-idea, tri-modal) |
| F1.7–F1.8 | Phase 1 / T2 | Evolution 2.1, Adoption 3.1 (retro) |
| F1.9–F1.12 | Phase 1 / T2 | Evolution 2.3, Adoption 3.1 (design, tri-modal) |
| F1.13–F1.14 | Phase 1 / T2 | Adoption 3.1 (launch) |
| F1.15–F1.17 | Phase 1 / T3 | Adoption 3.2 (spec kernel) |
| F1.17.a | Phase 1 / T1, T3 | Adoption 3.2.1 (Ivy enrichment & `design.md`) |
| F1.18–F1.20 | Phase 1 / T3 | Adoption 3.7 (sprint-status.yaml) |
| F1.19.a | Phase 1 / T3, T4 | Adoption 3.7.1 (Orchestrator ASCII CLI Dashboard) |
| F1.21–F1.24 | Phase 1 / T2 | Evolution 2.4 (CSV method libraries) |
| F1.25–F1.26 | Phase 1 / T1 | Evolution 1.2 (domain expert depth + false-positive guard) |

---

## F1.1–F1.2 — Restructure `develop` skill (278 lines → folder + 9 step files)

**Source:** Evolution §2.1, Adoption §3.1

- [ ] F1.1 — Rewrite `.agents/skills/develop/SKILL.md` as a ~50-line router:
  - [ ] Header with name/description (v2 frontmatter)
  - [ ] `## When to invoke`
  - [ ] `## Prerequisites` (link to spec-kernel)
  - [ ] `## Mode detection` (always "create"; resume is automatic from `stepsCompleted`)
  - [ ] `## Step loader` (reads `steps/step-01-*.md` or jumps to first uncompleted step)
  - [ ] `## State machine integration`
  - [ ] `## Done when` (link to completion criteria)
- [ ] F1.2 — Create `.agents/skills/develop/steps/` with 9 step files:
  - [ ] `step-01-spec-alignment.md` — read spec-kernel + user stories; align before coding
  - [ ] `step-02-architecture.md` — conditional (if ArchitectPhase: true); produces ADRs
  - [ ] `step-03a-arch-review.md` — tech-lead reviews architecture
  - [ ] `step-03b-backlog-prep.md` — tech-lead reviews stories; evaluates parallelism
  - [ ] `step-04-kanban-activation.md` — PM confirms backlog; tech-lead activates
  - [ ] `step-05-spike.md` — optional; investigate unknowns
  - [ ] `step-06-dev-loop.md` — multi-worktree OR single-developer loop with code-reviewer
  - [ ] `step-07-quality-gates.md` — QA (hard gate) → security (conditional) → performance (conditional)
  - [ ] `step-08-pm-verification.md` — PM signs off
  - [ ] `step-09-documentation.md` — `@technical-writer` updates docs
  - [ ] `step-10-completion.md` — record completion; advance phase
- [ ] Verify each step file is 30–80 lines
- [ ] Add `data/role-tags.json` (FE / BE / Full-Stack definitions)
- [ ] Add `templates/develop-state.md` (YAML state template for `stepsCompleted`)
- [ ] Run a content-audit script to verify no content was lost from the old monolithic SKILL.md
- [ ] Test resume: activate with `stepsCompleted: [1,2,3,4,5]` and confirm it jumps to step 6

## F1.3–F1.6 — Restructure `validate-idea` skill with tri-modal subfolders

**Source:** Evolution §2.1+2.3, Adoption §3.1

- [ ] F1.3 — Rewrite `.agents/skills/validate-idea/SKILL.md` as ~50-line router with tri-modal selector:
  - [ ] Frontmatter v2
  - [ ] `## When to invoke`
  - [ ] `## Mode detection` (read user input; route to `steps-c/`, `steps-e/`, or `steps-v/`)
  - [ ] `## Step loader` (mode-aware)
  - [ ] `## State machine integration`
  - [ ] `## Done when`
- [ ] F1.4 — Create `.agents/skills/validate-idea/steps-c/` (create mode, 7 step files):
  - [ ] `step-01-session-setup.md`
  - [ ] `step-02-input-analysis.md`
  - [ ] `step-03-idea-framing.md`
  - [ ] `step-04-stress-test-r1.md`
  - [ ] `step-05-stress-test-r2.md`
  - [ ] `step-06-go-pivot-kill.md`
  - [ ] `step-07-handoff.md`
- [ ] F1.5 — Create `.agents/skills/validate-idea/steps-e/` (edit mode, 5 step files):
  - [ ] `step-01-load-existing.md`
  - [ ] `step-02-identify-gaps.md`
  - [ ] `step-03-revise.md`
  - [ ] `step-04-stress-test.md`
  - [ ] `step-05-finalize.md`
- [ ] F1.6 — Create `.agents/skills/validate-idea/steps-v/` (validate/Socratic mode, 5 step files):
  - [ ] `step-01-open-questions.md`
  - [ ] `step-02-7-branches.md`
  - [ ] `step-03-cross-branch-check.md`
  - [ ] `step-04-decision-log.md`
  - [ ] `step-05-lock-handoff.md`
- [ ] Test mode detection with adversarial prompts:
  - [ ] "validate my new idea" → routes to `steps-c/`
  - [ ] "edit the existing brief" → routes to `steps-e/`
  - [ ] "stress-test the spec" → routes to `steps-v/`

## F1.7–F1.8 — Restructure `retro` skill (253 lines → folder + 5 step files)

**Source:** Evolution §2.1, Adoption §3.1

- [ ] F1.7 — Rewrite `.agents/skills/retro/SKILL.md` as ~50-line router
- [ ] F1.8 — Create `.agents/skills/retro/steps/` with 5 step files:
  - [ ] `step-01-hot-paths.md` — invoke `telemetry_surface.js hot-paths` (Phase 3 wiring)
  - [ ] `step-02-pattern-scan.md` — scan `artifacts/memory/` for recurring patterns
  - [ ] `step-03-instinct-scan.md` — surface instinct candidates
  - [ ] `step-04-write-digest.md` — write the retro digest
  - [ ] `step-05-compact.md` — invoke `witness.js check` then compact/archive
- [ ] Run content-audit script

## F1.9–F1.12 — Restructure `design` skill with tri-modal subfolders

**Source:** Evolution §2.3, Adoption §3.1

- [ ] F1.9 — Rewrite `.agents/skills/design/SKILL.md` as ~50-line router with tri-modal selector
- [ ] F1.10 — Create `.agents/skills/design/steps-c/` (create mode, 6 step files):
  - [ ] `step-01-load-prd-brief.md`
  - [ ] `step-02-define-personas.md`
  - [ ] `step-03-user-stories.md`
  - [ ] `step-04-screen-states.md`
  - [ ] `step-05-design-tokens.md`
  - [ ] `step-06-handoff.md`
- [ ] F1.11 — Create `.agents/skills/design/steps-e/` (edit mode, 4 step files)
- [ ] F1.12 — Create `.agents/skills/design/steps-v/` (validate mode, 4 step files)
- [ ] Test mode detection

## F1.13–F1.14 — Restructure `launch` skill

**Source:** Adoption §3.1

- [ ] F1.13 — Rewrite `.agents/skills/launch/SKILL.md` as ~50-line router
- [ ] F1.14 — Create `.agents/skills/launch/steps/` with 5 step files:
  - [ ] `step-01-readiness-check.md` — verify all gates (qa-signoff, security, performance, docs)
  - [ ] `step-02-deploy.md` — `@devops-engineer` deploys
  - [ ] `step-03-smoke-test.md` — run post-deploy smoke tests
  - [ ] `step-04-monitor.md` — `@data-analyst` watches first 24h metrics
  - [ ] `step-05-launch-log.md` — write the launch log
- [ ] Run content-audit script

## F1.15–F1.17 — Spec-kernel + companions

**Source:** Adoption §3.2

- [ ] F1.15 — Create `.agents/templates/spec-kernel-template.md` (~60 lines):
  - [ ] Section 1: Why (1 paragraph)
  - [ ] Section 2: Capabilities (numbered CAP-N list, each with `intent` and `success`)
  - [ ] Section 3: Constraints (numbered, each with `why`)
  - [ ] Section 4: Non-goals (explicit "we are NOT doing this")
  - [ ] Section 5: Success signal (measurable criterion + by-when)
- [ ] F1.16 — Create `.agents/templates/spec-law.md` (~30 lines):
  - [ ] 8 rules (mirror BMAD's Spec Law, looser):
    - [ ] Each capability has both `intent` and `success`
    - [ ] At least one explicit non-goal
    - [ ] Constraints explain *why*, not just *what*
    - [ ] Success signal is measurable
    - [ ] Capability IDs are stable (`CAP-1`, `CAP-2`, …)
    - [ ] No "TODO" sections in committed kernel
    - [ ] Companion files have content-typed names (glossary, journey, ac, decision-log)
    - [ ] Self-validate sweep runs before handoff
- [ ] F1.17 — Refactor `prd-template.md`:
  - [ ] Create `.agents/templates/prd/SPEC.md` (kernel, ~30 lines, references the template)
  - [ ] Create `.agents/templates/prd/companions/glossary.md` (template, ~20 lines)
  - [ ] Create `.agents/templates/prd/companions/acceptance-criteria.md` (Given/When/Then template)
  - [ ] Create `.agents/templates/prd/companions/user-journey.md` (template, ~20 lines)
  - [ ] Create `.agents/templates/prd/companions/decision-log.md` (template, ~20 lines)
  - [ ] Update `develop/SKILL.md` step-01 to require the spec-kernel form
  - [ ] Remove the old monolithic `prd-template.md`
- [ ] F1.17.a — `@product-designer` (Ivy) Enrichment & Visual spec handoff (`design.md`):
  - [ ] Enrich `@product-designer` (Ivy) persona to analyze UX grids, layout hierarchy, and user psychology.
  - [ ] Implement adaptive styling rubric: Rigid/Structured (for dashboards/utility software) vs. Out-of-the-Box/Creative (for consumer apps/promotional sites), supporting theme combinations (e.g. *Sleek Utility*, *Modern Glassmorphism*, *Minimalist Tech*, *Vibrant Brand-First*).
  - [ ] Create `artifacts/output/02-strategy/design.md` template mapping custom variables, colors, typography, component states, micro-animations, and responsive breakpoints. Core engineering agents (`@developer`, `@architect`, `@qa-engineer`, `@tech-lead`) and future marketing/growth agents are instructed to read this visual source of truth.
  - [ ] Transition `product-spec.html` output to be dynamically generated on the fly (Tailwind CSS CDN + custom styled variables), deleting the 56KB static HTML template. Ensure generated HTML matches standard spec section structure.


## F1.18–F1.20 — Status YAML state machine

**Source:** Adoption §3.7

- [ ] F1.18 — Create `artifacts/output/sprint-status.yaml` template (with 7 phase keys + story map section)
- [ ] F1.19 — Update `orchestrator_state.js`:
  - [ ] Add YAML read helpers (`readYaml()`, `writeYaml()`)
  - [ ] `status` command reads from YAML
  - [ ] `next` command reads from YAML
  - [ ] `complete` command writes to YAML
  - [ ] `pipeline-state.json` becomes a derived cache (still written, but YAML is the source of truth)
- [ ] F1.19.a — Human-Readable ASCII CLI Dashboard & Swarm State Enforcement:
  - [ ] Upgrade `status` and `next` commands to print structured terminal ASCII boards (with phase status, artifact completeness checklist, blockers, and next action recommendations) unless `--json` is passed.
  - [ ] Add agent-level enforcement: core personas query phase status at startup (verifying `pipeline-state.json`/`sprint-status.yaml`) to prevent running out-of-order, and execute (or request `@executor`/the user to execute) `complete` command at shutdown.

- [ ] F1.20 — Create `.agents/skills/sprint-status/SKILL.md`:
  - [ ] Renders the YAML as a Kanban table
  - [ ] `## When to invoke`
  - [ ] `## Output format`

## F1.21–F1.24 — CSV method libraries

**Source:** Evolution §2.4

- [ ] F1.21 — Extend `.agents/skills/elicitation/methods.csv` from 70 → 100+ methods
- [ ] F1.22 — Create `.agents/skills/brainstorming/methods.csv` (60+ methods; SCAMPER, Reverse, Starbursting, etc.)
- [ ] F1.23 — Create `.agents/skills/validation-patterns.csv` (30+ methods; first-principles, pre-mortem, red-team, etc.)
- [ ] F1.24 — Update `.agents/scripts/match_methods.js`:
  - [ ] Accept `--source elicitation|brainstorming|validation` flag
  - [ ] Default: search all 3
  - [ ] Return top N methods with relevance score

## F1.25–F1.26 — Domain expert agent depth

**Source:** Evolution §1.2

- [ ] F1.25 — Expand each of the 9 domain experts to ≥ 200 lines:
  - [ ] F1.25.a — `.agents/agents/code-reviewer.md` (139 → 280+ lines, see F1.26)
  - [ ] F1.25.b — `.agents/agents/ml-engineer.md` (139 → 200+ lines)
  - [ ] F1.25.c — `.agents/agents/devops-engineer.md` (132 → 200+ lines)
  - [ ] F1.25.d — `.agents/agents/data-analyst.md` (134 → 200+ lines)
  - [ ] F1.25.e — `.agents/agents/researcher.md` (→ 200+ lines)
  - [ ] F1.25.f — `.agents/agents/user-researcher.md` (→ 200+ lines)
  - [ ] F1.25.g — `.agents/agents/ux-researcher.md` (→ 200+ lines)
  - [ ] F1.25.h — `.agents/agents/security-engineer.md` (→ 200+ lines)
  - [ ] F1.25.i — `.agents/agents/performance-engineer.md` (→ 200+ lines)

For each, the structure should be:
- [ ] Persona depth (who they are, who they channel)
- [ ] Decision tree (when to invoke, when to escalate)
- [ ] 5–7 specific failure modes to watch for
- [ ] Memory write-back contract
- [ ] Conflict resolution patterns

- [ ] F1.26 — `.agents/agents/code-reviewer.md` — add the 15-item false-positive guard section (between Tests and Documentation):
  - [ ] "Consider adding error handling" on propagation paths
  - [ ] "Magic number" for HTTP codes (200/404/500/1024/4096/60_000/86400)
  - [ ] "Possible null dereference" when line above narrowed the type
  - [ ] "Use const instead of let" when reassigned later
  - [ ] "Add return type annotation" in TS with unambiguous inference
  - [ ] "Consider extracting this into a helper" for single-use code
  - [ ] "This function is too long" without specifying what
  - [ ] "Missing input validation" when validation happens upstream
  - [ ] "Use Map instead of Object" with known keys
  - [ ] "Inconsistent naming" without codebase confirmation
  - [ ] "Add JSDoc comment" on private helpers
  - [ ] "Use async/await instead of .then()" for stable old code
  - [ ] "This could be a one-liner" at readability cost
  - [ ] "Use lodash/ramda" for 1-2 line vanilla JS
  - [ ] "Add unit tests" for integration-covered code

---

## Done when

- [ ] `develop`, `validate-idea`, `retro`, `design`, `launch` are all folders with `SKILL.md` (≤ 60 lines) + `steps/` (or `steps-c/-e/-v/`) directories
- [ ] `validate-idea`, `design` have tri-modal subfolders; mode detection works on adversarial prompts
- [ ] Resume works: re-activate `develop` with `stepsCompleted: [1,2,3,4,5]` jumps to step 6 (verified by a test against a fixture)
- [ ] `prd-template.md` is replaced with `templates/prd/SPEC.md` (kernel) + companions
- [ ] `artifacts/output/sprint-status.yaml` is the human-readable source of truth
- [ ] `orchestrator_state.js next` reads from the YAML
- [ ] `match_methods.js --context "PRD section" --source elicitation` returns 5 methods
- [ ] The 9 domain-expert agents are all ≥ 200 lines
- [ ] `code-reviewer.md` has the 15-item false-positive guard
- [ ] `@product-designer` (Ivy) generates `design.md` visual spec companion and dynamic `product-spec.html` presentation on the fly (deleting the 56KB static template) adaptively based on Rigid vs. Creative style combinations
- [ ] `orchestrator_state.js status` and `next` commands print human-readable ASCII dashboards by default when run in terminal, and agents enforce pipeline state checks at startup and shutdown

## Risks specific to this phase

- **Step-file split loses content.** Run a content-audit script before/after.
- **Tri-modal mode detection misfires.** Test with adversarial prompts; the first read of the SKILL.md is a literal mode selector, the LLM cannot skip it.
- **Spec-kernel is too thin for some artifacts.** Kernel is the *minimum*; additional content lives in companion files.
- **CSV method libraries drift.** Pin a version comment at top of each CSV; update with a `methods.csv` skill (Phase 4 builders).

## Handoff to Phase 2

Once Phase 1 is done, every new file in Phase 2+ can assume:
- Skills are folder + step files with tri-modal subfolders where needed.
- Artifacts are kernel + companions.
- State is dual-format (YAML for humans, JSON for cache).
- Domain experts have ≥ 200 lines of depth.
- 100+ elicitation methods, 60+ brainstorming methods, 30+ validation patterns.
