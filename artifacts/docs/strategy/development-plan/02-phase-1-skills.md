# Phase 1 — Skill Restructure + Artifact Rigor

> **Release:** v2.0
> **Effort:** ~54h
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

## F1.1-F1.2 — Restructure `develop` skill (278 lines → folder + 9 step files)

**Source:** Evolution §2.1, Adoption §3.1 | **Theme:** T2

- [ ] F1.1 — Rewrite `.agents/skills/develop/SKILL.md` as a ~50-line router:
  - Header with name/description (v2 frontmatter)
  - `## When to invoke`, `## Prerequisites` (link to spec-kernel)
  - `## Mode detection` (always "create"; resume is automatic from `stepsCompleted`)
  - `## Step loader` (reads `steps/step-01-*.md` or jumps to first uncompleted step)
  - `## State machine integration`, `## Done when`
- [ ] F1.2 — Create `.agents/skills/develop/steps/` with 9 step files:
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

- [ ] F1.3 — Rewrite `.agents/skills/validate-idea/SKILL.md` as ~50-line router with tri-modal selector
- [ ] F1.4 — Create `steps-c/` (create mode, 7 step files): session-setup, input-analysis, idea-framing, stress-test-r1, stress-test-r2, go-pivot-kill, handoff
- [ ] F1.5 — Create `steps-e/` (edit mode, 5 step files): load-existing, identify-gaps, revise, stress-test, finalize
- [ ] F1.6 — Create `steps-v/` (validate/Socratic mode, 5 step files): open-questions, 7-branches, cross-branch-check, decision-log, lock-handoff
- [ ] Test mode detection with adversarial prompts: "validate my new idea" → steps-c/; "edit the existing brief" → steps-e/; "stress-test the spec" → steps-v/

## F1.7-F1.8 — Restructure `retro` skill (253 lines → folder + 5 step files)

**Source:** Evolution §2.1, Adoption §3.1 | **Theme:** T2

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

- [ ] F1.9 — Rewrite `.agents/skills/design/SKILL.md` as ~50-line router with tri-modal selector
- [ ] F1.10 — Create `steps-c/` (create mode, 6 step files): load-prd-brief, define-personas, user-stories, screen-states, design-tokens, handoff
- [ ] F1.11 — Create `steps-e/` (edit mode, 4 step files)
- [ ] F1.12 — Create `steps-v/` (validate mode, 4 step files)
- [ ] Test mode detection

## F1.13-F1.14 — Restructure `launch` skill

**Source:** Adoption §3.1 | **Theme:** T2

- [ ] F1.13 — Rewrite `.agents/skills/launch/SKILL.md` as ~50-line router
- [ ] F1.14 — Create `steps/` with 5 step files: readiness-check, deploy, smoke-test, monitor, launch-log
- [ ] Run content-audit script

## F1.15-F1.17 — Spec-kernel + companions

**Source:** Adoption §3.2 | **Theme:** T3

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

- [ ] Enrich `@product-designer` persona to analyze UX grids, layout hierarchy, user psychology
- [ ] Implement adaptive styling rubric: Rigid/Structured (dashboards/utility) vs. Out-of-the-Box/Creative (consumer apps/promotional), supporting theme combinations (Sleek Utility, Modern Glassmorphism, Minimalist Tech, Vibrant Brand-First)
- [ ] Create `artifacts/output/02-strategy/design.md` template: custom variables, colors, typography, component states, micro-animations, responsive breakpoints
- [ ] Core engineering agents (`@developer`, `@architect`, `@qa-engineer`, `@tech-lead`) instructed to read `design.md` as visual source of truth
- [ ] Transition `product-spec.html` output to dynamically generated (Tailwind CSS CDN + custom styled variables), deleting the 56KB static HTML template
- [ ] Ensure generated HTML matches standard spec section structure

## F1.18-F1.20 — Status YAML state machine

**Source:** Adoption §3.7 | **Theme:** T3

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

- [ ] F1.21 — Extend `.agents/skills/elicitation/methods.csv` from 70 → 100+ methods (add: validation, decision, research, architecture categories)
- [ ] F1.22 — Create `.agents/skills/brainstorming/methods.csv` (60+ methods: SCAMPER, Six Thinking Hats, Starbursting, Reverse, etc.)
- [ ] F1.23 — Create `.agents/skills/validation-patterns.csv` (30+ methods: Smoke Test, Concierge MVP, Wizard of Oz, A/B Test, etc.)
- [ ] F1.24 — Update `.agents/scripts/match_methods.js`: accept `--source elicitation|brainstorming|validation` flag; default: search all 3; return top N with relevance score

## F1.25-F1.26 — Domain expert agent depth + false-positive guard

**Source:** Evolution §1.2 | **Theme:** T1

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

## Handoff to Phase 2

Once Phase 1 is done, every new file in Phase 2+ can assume:
- Skills are folder + step files with tri-modal subfolders where needed.
- Artifacts are kernel + companions.
- State is dual-format (YAML for humans, JSON for cache).
- Domain experts have ≥ 200 lines of depth.
- 100+ elicitation methods, 60+ brainstorming methods, 30+ validation patterns.
- Ivy produces `design.md` + dynamic HTML.
- Orchestrator CLI prints ASCII dashboards.
