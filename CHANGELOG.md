# Changelog

All notable changes to the Vespyr project will be documented in this file.

---

## [2.0.1] - 2026-08-03
### Added
- `/motion` skill — orchestrates motion research, motion specification, and an explicit implementation handoff for animation-significant products. Adds the `motion-design` capability to `@product-designer`, `motion-implementation` to `@developer`, and `motion-research` to `@researcher`/`@ux-researcher`. Domain knowledge lives on-demand in `.agents/references/motion/` (loaded only when motion is in scope, keeping agent initiation tokens low), with artifacts produced via `motion-spec.md` and `motion-handoff.md`. Includes a simulation harness (`test-motion.mjs`, 73 assertions) and evals.

### Changed
- Enforced detailed student textbook creation for `@shifu` during handbook generation (`handbook.md`), strictly preventing condensed cheatsheet-style summaries.
- Updated `@shifu` persona principles, standards, failure mode mitigations (`shifu.md`), `craft-lesson` step instructions (`step-handbook.md`, `SKILL.md`), and Phase 5 review quality checks (`step-review.md`).
- Bumped package version to 2.0.1.

---

## [2.0.0] - 2026-07-13
### Added
- Comprehensive Phase 0 foundation implementations and v2.0 upgrades.
- Phase 6 "Loop Engineering" including `/goal` primitives, automated heartbeats, and on-disk loop state.
- Documentation for quantitative success metrics and mandatory human-in-the-loop validation for the Phase 4 dogfood project.
- Phase 1 — Skill Restructure + Artifact Rigor:
  - Atomic skills: 5 skills (`develop`, `validate-idea`, `retro`, `design`, `launch`) restructured from monolithic files into folder + step files with router bootloaders (≤ 60 lines each).
  - Tri-modal subfolders for `validate-idea` and `design` (create/edit/validate modes with automatic mode detection from artifact existence).
  - Spec-kernel artifact pattern: 5-field SPEC.md kernel (Why / Capabilities / Constraints / Non-goals / Success signal) + content-typed companions (glossary, acceptance-criteria, user-journey, decision-log). Old 14KB `prd-template.md` removed.
  - `design.md` visual spec template (colors, typography, component states, micro-animations, breakpoints, spacing). Static `product-spec-template.md` deleted in favor of dynamic HTML generation with Tailwind CDN.
  - `sprint-status.yaml` as human-readable state source of truth with ASCII CLI dashboards (`printDashboard`, `printNextDashboard`).
  - Pipeline enforcement rules in AGENTS.md (Startup Phase Validation + Shutdown Completion Logging under "Goal-Driven Execution").
  - 15-item false-positive guard in `@code-reviewer` — names specific LLM code reviewer failure modes (magic numbers, null dereference false alarms, premature abstraction suggestions, etc.).
  - Decision trees (when to invoke/escalate), failure modes (5-7 domain-specific), and conflict resolution patterns added to all 9 domain expert agents.
  - Delegation contracts embedded in all 52 step files (frontmatter `delegation:` field + inline `## Delegation` section with `delegation-policy.md` threshold citations).
  - I/O sub-agent depth: output-quality rubrics, failure modes, and escalation-back-to-caller contracts for `@reader`, `@writer`, `@executor`.
  - CSV method libraries: 100 elicitation methods, 61 brainstorming methods, 31 validation patterns. `match_methods.js` extended with `--source` flag.

### Changed
- Refactored and consolidated strategy docs by migrating development process details into unified plan files and removing obsolete legacy docs.
- Restructured development strategy into a versioned, phase-based planning framework.
- Reorganized project documentation around the v2.0 master roadmap and refined the Deeper Bench enrichment plan.
- Replaced custom parser scripts with standard YAML and TOML libraries.
- Updated development plans with rollback procedures.
- Rewrote `develop/SKILL.md` (279 → 56 lines), `validate-idea/SKILL.md` (299 → 38 lines), `retro/SKILL.md` (302 → 45 lines) as router bootloaders with step loader, halt conditions, and state machine integration.
- `code-reviewer.md` expanded from 225 → 294 lines with 15-item false-positive guard, decision tree, and failure modes.
- All 9 domain expert agents expanded to ≥ 200 lines (range: 246-323) with decision trees and failure modes.
- `orchestrator_state.js` reads/writes YAML; `pipeline-state.json` becomes derived cache (YAML is source of truth).
- `AGENTS.md` updated with pipeline enforcement rules under "Goal-Driven Execution" (§4).
- I/O sub-agents deepened: `reader.md` (112 → 150), `writer.md` (136 → 175), `executor.md` (128 → 175) — all stay < 200 lines to preserve the I/O/reasoning split.

---

## [1.7.3] - 2026-06-29
### Added
- Integration plan for migrating Vespyr agent personas to OpenClaw skills.
- Orchestrator CLI enhancement documentation with ASCII dashboards, dynamic design spec generation, and an extended Definition of Done.

### Changed
- Updated adoption plan versions and effort estimates from v1.x to v2.x.
- Bumped package version to 1.7.3.

---

## [1.7.2] - 2026-06-25
### Changed
- General bugfixes and README documentation updates.
- Bumped package version to 1.7.2.

---

## [1.7.1] - 2026-06-23
### Added
- Support for Hermes and OpenClaw harnesses in the CLI installer.
- Custom installer refactoring to support copy-to-symlink migrations.

### Changed
- Standardized user-content-preserving installations across all 8 supported harnesses (opencode, claude, cursor, github, windsurf, kiro, hermes, openclaw).
- Updated repository and issue tracker URLs to `lalulali/vespyr`.
- Migrated system directory configurations to `.agents`, updated the setup wizard CLI, and configured workspace memory.

---

## [1.7.0] - 2026-06-12
### Added
- Stage-aware `round-table` discussion skill.
- Vespyr v1.7.0 NPX installer (`bin/cli.js`) to install `.agents/` and configure harness integrations via symlinks/transpilation.
- Surgical uninstallation, reconfigure nickname updates, and harness cleanup capabilities.
- Success metrics builder integration into the product-manager agent.
- Input document tracking inside `doc-graph`.

---

## [1.6.0] - 2026-05-25
### Added
- `grill-me` and `help-me` skills.
- Squad-based team presets (v1.1).
- Kanban update protocol for dev-phase agents.
- Hierarchical structure for user stories with epic & feature sections, tree summary, and indented Gherkin acceptance criteria.

### Changed
- Integrated `pipeline-state.json` with phase, status, and help-me skills.
- Synchronized `agent.md`, `AGENTS.md`, `CLAUDE.md`, and the `init` command.

---

## [1.5.0] - 2026-05-22
### Added
- `@founder` agent integration into `validate-idea` and `validate-game-idea` skills.
- Open question tracking, pending directory, and socratic rules for agents.
- Tone overrides for socratic agents and memory patterns.

---

## [1.4.0] - 2026-05-20
### Added
- Telemetry and input directories tracking to the `init` command.
- Socratic critical inquiry system, Hermes/OpenClaw porting docs, and README updates.

---

## [1.3.0] - 2026-05-20
### Added
- Refactored and renamed skills to short, memorable names.
- Utility skills and stripped agent configurations.

---

## [1.2.0] - 2026-05-20
### Added
- Expanded swarm capabilities and optimized memory management.
- Initial testing infrastructure.

---

## [1.1.0] - 2026-05-20
### Added
- Cleaned up agent instructions and extracted reference guidelines and templates.

---

## [1.0.0] - 2026-05-18
### Added
- Initial release of the Vespyr agent swarm framework (21 specialized agent personas).
- Initial product manager capabilities and agent template configurations.

