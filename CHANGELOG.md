# Changelog

All notable changes to the Vespyr project will be documented in this file.

---

## [2.0.6] - 2026-08-14

### Security & Integrity Architecture (Epic 02f)
- Added comprehensive **Security & Integrity Architecture** (`02f-phase-1-security-and-integrity-architecture.md`) establishing a two-pillar model for supply-chain integrity and runtime content trust.
- Authored four foundational Architecture Decision Records (ADRs):
  - **ADR-001: Trust-Boundary Model (T0–T3)** — defines T0 (read-only/immutable), T1 (vetted skills/templates), T2 (semi-trusted memory/artifacts), and T3 (untrusted runtime arrivals); formalizes the **T2 Invariant** (*memory/artifact content is data, never directives*) and standardized machine-delimited T3 format (`<!-- VSP-T3-BEGIN v1 ... -->`).
  - **ADR-002: Install-Integrity Strategy** — specifies release-level signed aggregate SHA-256 manifests, Sigstore/SLSA OIDC provenance, pre-settled key custody, and out-of-band bootstrap verification.
  - **ADR-003: Prompt-Injection Defense Design** — establishes scanner-first deny-by-default admission control, 11-category attack taxonomy (INJ-PROMPT, INJ-TOOL, INJ-SECRET, etc.), data-flow tracing, and documented known bypasses.
  - **ADR-004: Script/Hook Execution Policy** — enforces allowlist-by-default execution, zero-eval policy, Git hook/husky scan rules (GH-1), and tarball path-traversal/symlink escape guards.
- Added human-readable [`supply-chain-audit-spec.md`](artifacts/docs/strategy/development-plan/security/supply-chain-audit-spec.md) and machine-readable [`audit-spec.json`](artifacts/docs/strategy/development-plan/security/audit-spec.json) containing dynamic adapter-registry pattern tables, pin-store schemas, and typed security rules.
- Implemented prototype scanner [`.agents/scripts/security-scan.js`](.agents/scripts/security-scan.js) with 3-state exit contract (`0 = clean`, `1 = findings`, `2 = fail-closed / tool failure`), sliding Shannon entropy secret detection (threshold 2.6), and base64 heuristic false-positive suppression.
- Built Red-Team evaluation harness in [`eval/security/corpus/`](eval/security/corpus/) with positive/negative fixture pairs, CI invariant checker [`.agents/scripts/check_corpus_invariants.js`](.agents/scripts/check_corpus_invariants.js), and frozen baseline [`baseline-2026-08-10.json`](eval/security/corpus/baseline-2026-08-10.json).
- Conducted fresh security audit on `security-scan.js` producing findings report `findings-report-security-scan-f1-47.md` (11 findings triaged for Phase 2 entry gate).
### Harness Honesty & Direct-I/O Execution (Epic 02g)
- Fully executed the repository-wide **Harness Honesty** scrub (Epic 02g) across all 43 active skills and 89 step files:
  - Cleaned all legacy `delegation:` frontmatter blocks and dead `@reader`, `@writer`, and `@executor` subagent handles from `design`, `test`, `unpack-problem`, `craft-lesson`, and `validate-idea` step files.
  - Standardized on the Direct-I/O execution model with `@memory-controller` as the sole specialized sub-agent for 3-tier memory loading and session closeout.
  - Implemented **ADR-005: Harness-Neutral Delegation Contract**, establishing capability-based phrasing and explicit No-Subagent Fallbacks across single-agent and multi-agent harnesses.
  - Updated skill verification test suites ([`test-qa-enrichment.mjs`](.agents/skills/test/test-qa-enrichment.mjs), [`test-unpack-problem.mjs`](.agents/skills/unpack-problem/test-unpack-problem.mjs)) to assert `output_contract.citations`.
  - Harmonized development plan naming conventions across all sub-plans (`02a`–`02j`, `09-phase-7-pkm-knowledge-engine.md`) and eliminated duplicate `02c-teaching-partner.md`.

### Added
- `02g-phase-1-harness-honesty.md` development plan and **ADR-005: Harness-Neutral Delegation Contract**, defining capability-based delegation phrasing (`"Write via the writer role, or write directly if no subagents are available"`) and the canonical `Delegation path: <capability> → <role> | direct-fallback` line.
- Kiro steering template (`vespyr-steering.md.canonical`) with generated `.kiro/steering/vespyr-steering.md`.
- Phase 7 PKM knowledge-engine development plan (`07-phase-7-pkm-knowledge-engine.md`).
- Standardized `## Completion Checklist` and `## Sign-Off` sections across all development plan sub-plans (`01`, `02`, `02a`–`02j`, `03`, `04`, `05`, `06`, `07`, `09`).
- Round Table review and scope locking for Phase 1 sub-plans (`02f`, `02g`, `02h`, `02i`, `02j`).

### Removed
- Removed the squad feature: `/squad` skill, `.agents/squads/` presets, `squads.js`, `fix-squads.js`, orchestrator squad wiring, and the `Squad:` field from project-context and pipeline state files.
- Removed the `/delegate` skill.
- Removed the unverified "85-95% cost-savings" claim and all unverified `~1,000 tokens` context claims from docs, skills, and personas.
- Removed `default_squad` frontmatter field across personas.

### Changed
- Agent roster standardized to 20 personas; entry-point docs (`AGENTS.md`, `agent.md`, `CLAUDE.md`, `.agents/templates/system/AGENTS.md.canonical`) regenerated from a single canonical source.
- Vespyr Identity focused on two core differentiators: Socratic methodology depth and 3-tier progressive memory.
- Reference guides (EN/CN) now document the **Memory Protocol** (`@memory-controller` load/write/session/fallback) as the primary specialized state service.
- `GUARDRAILS.md`, developer guidelines, motion references, PM workflows, glossary, and step-file templates updated.
- Step files renumbered to the numbered-step convention across `craft-lesson`, `design`, and `validate-idea` (e.g., `step-04a-syllabus.md`).
- `opencode.json` and the `bin/cli.js` install wizard cleaned of squad references.
- Synchronized documentation badges, agent counts (20), and skill counts (43) across `README.md`, `README_CN.md`, `Guide/en/installation.md`, and `Guide/cn/installation.md`.
- Package version maintained at 2.0.6.

---

## [2.0.5] - 2026-08-07
### Added
- Added Kiro harness scaffolding — `.kiro/steering/AGENTS.md` + `.kiro/skills/` symlink support in the install wizard, with the Kiro steering document generated from a canonical template.
- Automated root documentation regeneration — `AGENTS.md`, `agent.md`, and `CLAUDE.md` are now generated from a single canonical source (`.agents/agent.md.canonical`) via `bin/cli.js --sync-docs` / `sync-entry-points.js`, with canonical-section validation.
- Expanded round-table skill: additional agent perspectives and roles for stage-based roundtable discussions (documentation and workflow updates).
- Added CLI test coverage (`tests/test_cli.js`) for the new sync and scaffolding flows.

### Changed
- `bin/cli.js` install wizard reworked (153-line delta): harness scaffolding, sync-docs flow, and validation integration.
- Bumped package version to 2.0.5.

---

## [2.0.4] - 2026-08-05
### Added
- Added `spec_check.js` automated validator (332 lines) enforcing the agentskills.io frontmatter spec across all skills, wired into `compile_skills.js` and CI.

### Changed
- Standardized skill frontmatter definitions repo-wide to match the agentskills.io spec (name, description, metadata schema) across all skill SKILL.md files and the skill template.
- Bumped package version to 2.0.4.

---

## [2.0.3] - 2026-08-05
### Added
- Added `No Jumping to Conclusions` and `Never Advance Prematurely & Never Assume Discussion is Complete` rules under `Think Before Acting` across all core system directives (`AGENTS.md`, `CLAUDE.md`, `agent.md`, `.agents/agent.md.canonical`, and `.agents/templates/system/AGENTS.md.canonical`).
- Added `## Anti-Premature Conclusion & Stage Transition Safeguard` section to `.agents/GUARDRAILS.md`, enforcing empirical fact verification, active discussion completion, and strict stage transition gates before phase advancement.

### Removed
- Removed legacy template command files (`scaffold-agents.md`, `scaffold-agent.md`, `scaffold-claude.md`). `bin/cli.js` and test suites now generate root entry-point files directly from `.agents/agent.md.canonical`.

### Changed
- Bumped package version to 2.0.3.

---

## [2.0.2] - 2026-08-04
### Added
- Added Elon Musk (first-principles, rapid iteration, radical simplification) and Steve Jobs (uncompromising perfectionism, visionary category creation) as channeled mentors to `@founder` (Elena).
- Added Frank Thomas & Ollie Johnston (Disney's 12 principles of animation) and Jony Ive (tactile fluid interaction, visual elegance) as channeled mentors to `@product-designer` (Ivy).
- Enriched `@growth-marketer` (Funé) persona definition in Phase 5 plan with traditional marketing skills (brand storytelling, positioning, PR/communications, messaging matrix) channeled from Seth Godin and Al Ries & Jack Trout alongside product growth loops.

### Changed
- Clarified GTM co-ownership between `@product-manager` (Sarah) and `@growth-marketer` (Funé).
- Bumped package version to 2.0.2.

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

