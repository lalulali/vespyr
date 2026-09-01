# Changelog

All notable changes to the Vespyr project will be documented in this file.

---

## [Unreleased] - 2026-08-31

### Clean installation folder (round-table: @devops-engineer, @developer, @security-engineer, @tech-lead)
- **Tarball slimming:** `npm pack` payload cut 427 → 370 files (723KB → 680KB). Excluded repo/CI-only content: `.agents/state/**` (live `session-current.json` would have seeded every user's first session with the maintainer's session id — `lib/session.js` reuses existing ids), `evals/security/**` (red-team attack-fixture corpus + frozen baselines consumed only by non-shipping CI gates), `.agents/evals/**` (roundtable eval infrastructure relocated to `evals/roundtable/` so the installed `.agents/` folder stays eval-free), and 12 CI/authoring-only scripts in `.agents/scripts/` (check/drift/validate/test/pipeline/hot_path/token_profiler/fix-squads/migrate-frontmatter clusters). Also removed stray `.agents/skills/artifacts/**` copies of repo memory/output files (gitignored at any depth, so they shipped invisibly).
- **Runtime closure verified:** `security-scan.js` + `security/audit-spec.json` ship (they are the `vespyr audit` runtime contract — FAULT-1 fail-closed); `add-*` authoring scripts, `dedupe_validator` (memory pipeline), `roundtable_eval`, `validate_frontmatter` (npm script) confirmed runtime-referenced and kept; `evals/baseline.json` + suites/rubrics/fixtures/meta-eval ship (`vespyr-eval` consumers).
- **Mechanism:** top-level `files` array + per-directory `.npmignore` denylists (`.agents/state/`, `.agents/scripts/`, `evals/`). `roundtable_eval.js` `DEFAULT_TOPICS` repointed to `evals/roundtable/topics.json` (only `score --dir`, a dev path, reads it — no shipped skill invokes it; eval input moved out of `.agents/` to keep the installation folder clean). `.gitignore` exception added so `.agents/state/.npmignore` is tracked.
- **Packaging contract hardened** (`tests/cli/packaging.test.js`): positive-closure list extended to 23 runtime paths; NEW negative-absence block fails the pack if any excluded file reappears.
- **Real-tarball install smoke** (`tests/cli/install-smoke.test.js`): `npm pack` → temp install → bin entry resolution, `vespyr audit` on installed package, clean-folder post-install assert, `tools/eval` require chain. Env-gated (`RUN_INSTALL_SMOKE=1`), runs on a single ubuntu/node-20 CI leg (swarm-tests.yml `install-smoke` job).

## [2.0.8] - 2026-08-25

### Added
- **Passive T3 boundary:** injected memory context is wrapped in `<HISTORICAL_MEMORY_DATA trust_level="T3_PASSIVE_DATA">…</HISTORICAL_MEMORY_DATA>` with provenance comments retained inside.
- **Context budget ceiling:** `memory_filter.js` caps total injected memory context under 1,000 tokens per query, exposing `injected_tokens` and `budget_truncated` fields.
- **Concurrent-write locking:** state-mutating orchestrator commands (`init/update/session-start/session-write/complete/advance/set-phase/compact`) run under an exclusive per-project lock (`.agents/state/orchestrator.lock`, mkdir-atomic with stale takeover).
- **End-to-end smoke regression:** fixture covering `init` exit 0, agent frontmatter counts, the `session-start → session-write → complete` round-trip, and machine-fence integrity; runs unskipped on win32 and gates this tag.
- **Windows CI coverage:** swarm-tests matrix runs on `windows-latest` across Node 18/20/22.

### Fixed
- **Token-budget enforcement:** `advance`/`set-phase` compact and validate before the durable commit; over-budget transitions abort with `ADVANCE_OVER_BUDGET` (exit 1), leaving pipeline state byte-identical.
- **Lossless migration with gated purge:** `migrate_memory_v2.js` captures sections at every ATX level plus pre-header preamble, deduplicates exact duplicates, migrates divergent ones as variants, and aborts before any write or purge when input and output lines diverge (`tests/test_memory_fixes.test.js`).
- **Machine-fence integrity:** removed the global `syncCore`/`syncDetectedFields` passes that rewrote human lines outside the machine fence; machine values live exclusively inside it.
- **Windows installer breakage:** `detectRepository` now uses shell-free `execFileSync("git", …)` instead of POSIX redirection through `execSync`, which cmd.exe rejects.
- **CRLF frontmatter parsing:** anchors accept `\r?\n` across `validate_frontmatter.js`, `add-identity-block.js`, `token_profiler.js`, and `migrate-frontmatter-v2.js`; ≥20 scaffolded agents parse under both line-ending regimes.
- **Lock hardening:** heartbeat freshness evicts live-pid zombie holders after 15s; tamper-aware release prevents a stale holder from deleting a successor's lock.
- **Guard thresholds:** `compaction_guard.js` ceilings aligned to §2.2 budgets (300/400/500/500); dynamic-tier files report-only.

### Changed
- **Single sanctioned memory-write path (ADR-006):** `AGENTS.md` Shared Memory section rewritten, 19 persona files rerouted from direct edits to `@memory-controller`, and `memory_filter.js` scrubs secrets and sanitizes injection payloads at read time. ADR: `artifacts/output/04-architecture/adr-006-memory-write-enforcement.md`.
- **Validation matrix:** added the `memory_write` ingestion-path row to `validate_matrix.js`; removed decommissioned `*-notes.md` references from `/round-table`.
- **Version literals:** hardcoded engine-version strings centralized against `package.json`.
- **Epic 02i record:** Tasks 3.4/11.4 closed by the fixes in this release; all seven sign-off rows marked `[VOID PENDING R-2 RE-CERTIFICATION]`.

### Known Issues
- The seven Epic 02i sign-off rows require executable-proof re-stamps (named command + observed output + date + SHA per row) before Phase 2 entry. Owner: review panel.

---

## [2.0.7] - 2026-08-24

### Core DNA & Anti-Sycophancy Hardening
- Codified **Prohibition of Functional Sycophancy ("Preach Then Comply")**: strictly forbidden from emitting cautionary warnings while still generating implementation plans, options, or workarounds for a flawed premise.
- Established **The Mandatory Verdict Gate (`[KILL]` | `[PIVOT]` | `[PASS]`)** across `.agents/references/vespyr-dna.md`, `AGENTS.md`, `agent.md`, `CLAUDE.md`, and all canonical templates.
- Enforced the **Zero-Blueprint-on-KILL Invariant**: when an idea is assigned `[KILL]`, agents are prohibited from generating implementation architecture or option menus; the only valid output is the Kill Autopsy and returning to problem discovery.
- Added **Mandatory 3-Question Invariant Test** (Premise Invalidation Protocol) to eliminate speculative and vanity feature creep.
- Decommissioned legacy doc-graph and code-graph scripts; removed phantom `/doc-graph` and `/code-graph` commands.
- Added `/shut-up` one-shot silent execution skill and modernized `bin/cli.js` with direct sync commands (`--sync-docs`, `--sync-yaml`, `--export-state`).

### Dialectic /round-table Protocol Hardening
- Mandated **Live Dialogue Stream Rendering**: orchestrators must output the visible, unvarnished back-and-forth dialogue between agents (`### @agent-a -> @agent-b`) before providing tension synthesis; pre-digesting debates into summary-only cards is prohibited.
- Enforced **Subagent Dispatch Prompt Sanitization**: orchestrators must prompt subagents with raw verdict gates (`[KILL/PIVOT/PASS]`) and are prohibited from asking *"How do we make it work if the user insists?"*
- Added comprehensive unit tests in `tests/vespyr-dna.test.js` and `tests/skills/round-table.test.js` (21 passing tests).

### Memory Consolidation & Lifecycle Architecture
- **Machine State Fencing & State Synchronization:** Injected atomic state fence `<!-- BEGIN MACHINE STATE -->` ... `<!-- END MACHINE STATE -->` into `artifacts/memory/project-context.md` with git branch, runtime version, sprint, and active blocker auto-detection, preserving custom human blocks untouched.
- **Streamlined 5-File Memory Layout:** Consolidated active shared memory into `project-context.md`, `active-decisions.md`, `patterns-and-conventions.md`, `lessons-learned.md`, `blockers-and-risks.md`, plus `session-summaries/` and `archive/`.
- **Idempotent Migration Engine:** Authored `.agents/scripts/migrate_memory_v2.js` to idempotently merge legacy `agent-notes/*.md` into `patterns-and-conventions.md` with header deduplication.
- **Ghost Directory Purge:** Completely purged legacy directories (`agent-notes/`, `pending-questions/`, `session-checkpoints/`) and obsolete templates.
- **Phase-Boundary Compaction:** Integrated automatic compaction into `orchestrator_state.js advance` and `set-phase`, archiving superseded decisions into `archive/index.ndjson` and keeping `active-decisions.md` under 400 tokens.
- **Single Live Cursor:** Designated `artifacts/memory/session-summaries/latest.md` as the single authoritative rolling live cursor.
- **Swarm Reference Scrubbing:** Updated all 20 agent personas, skill steps, templates, CLI scaffolder, and reference documentation to remove dead memory paths.
- **Verification Harness:** Added `tests/test_memory_consolidation.js` with 81/81 automated tests passing across the suite.

### Security & Integrity Implementation (02f Downstream)
- Implemented **fail-closed `vespyr verify`** with FAULT-5 bootstrap semantics (missing manifest → exit 2, zero side effects), unsigned pinned-manifest interim position per ADR-002 §2.1.1, and added-file detection via reverse-walk.
- Shipped `.agents/scripts/check_new_findings.js` — the first mechanical enforcement of the NEW-FINDINGS-ONLY gate (DoD #8) against a frozen, scanner-hash-pinned baseline corpus (`125` findings).
- Added `.github/workflows/security.yml`: scanner + corpus + fault-injection suite on an ubuntu+windows matrix, no `pull_request_target`, read-only fork PR tokens.
- Landed `validate_frontmatter.js` permission-whitelist enforcement and `validate_matrix.js` (P8 tool-addition gate).
- Implemented T3 loader-boundary enforcement and `memory_filter.js` read-path changes (provenance-tagged reads, instruction-pattern rejection with quarantine + alert fallback).
- Added `drift_monitor.js` (R47 hash-history drift detection stub) over the `.agents/` baseline.
- Fresh post-fix security audit **APPROVED—SATISFIED** (2026-08-23): all blocking findings closed with behavioral probes; tracked residuals owned and dated.

### Evaluation Framework
- Added an extensible evaluation framework (`bin/vespyr-eval.js`): rubric-driven suites, test fixtures, and a CLI runner (`npm run eval*`) covering agents, skills, and invariants — including the `grill-me-spcp.json` adversarial trap suite.

### Harness & Engine Features
- Kiro harness scaffolding (steering emission + `.kiro/skills` symlink) and automated root-doc regeneration from canonical templates.
- Manifest-based agent management and TOML parser overhaul (inline tables, multiline arrays) enabling custom agent declarations.
- Agent permission-control system with security principles mandated across personas.

### Record Integrity Recovery & Governance (Epic 02m)
- Round-table forensic audits **falsified ~54 falsely-stamped checkboxes** across Phase-1 dev plans; 02g's "EXECUTED" stamp was `[KILL]`ed via git archaeology (an honest PARTIALLY-EXECUTED state had been silently reverted inside a mislabeled typo-fix commit).
- Adopted the **mechanical-evidence standard**: every checkbox carries an adjacent reproducible command; closure banners prohibited until reconciliation; binding single-writer execution mandate.
- Corrected 02h's completion record forward with a `[FALSIFIED]` banner and VOID-ab-initio notice on its birth-committed sign-offs; captured and reverted a live concurrent-session manifest clobber (R56).
- Authored and git-tracked `02m-phase-1-record-integrity-recovery.md` (previously invisible to archaeology — R57).

### Verdict Vocabulary Split — Decision Gate vs Review Gate
- Split the single Verdict Gate into the **Decision Gate** (`[PASS]` proceed | `[PIVOT]` redirect | `[KILL]` abandon-and-find-another) for ideas/proposals and the **Review Gate** (`[CONFIRMED]` | `[PARTIAL]` | `[FALSIFIED]`) for claims about existing state — decision vocabulary applied to a claim audit read as "kill the epic" when only the claim died.
- Codified the **Zero-Consumption-on-FALSIFIED Invariant** alongside Zero-Blueprint-on-KILL across all six DNA-surface documents; fixtures now fail if superseded single-gate wording resurfaces anywhere.

### `/grill-me` v3.0 — Universal Interrogation Frame
- Replaced engineering-instance branches with **eight universal interrogation moves** (Premise & Purpose → Reduction & Scope Lock), each instantiated at runtime against the subject's own ground-truth material — software remains the default worked example; non-software subjects (training programs, strategies, decisions) are first-class.
- Added **Step 0 Subject Framing** (mandatory ground-truth exploration + move instantiation before any question) and the **disposition ledger**: every move ends `EXAMINED (n)` or `SKIPPED — reason`; no third state, so coverage is auditable after the conversation.
- Operating model codified: *rigid about coverage, flexible about conversation.* Swept 12 stale "7+1-branch" references across live documentation.

### Intent Escalation Ladder
- Codified four-level elicitation routing in `vespyr-dna.md` (Level 0 silent ground-truth → Level 1 clarifying question → Level 2 batched clarifications → Level 3 full `/grill-me` at commitment gates), referenced from every entry-point document.
- Annotated explicit `/grill-me` intent gates in `/develop` spec-alignment and `/design` Create-mode intake.

### Test Infrastructure Hardening
- Added `tests/run-all.js`, a discovery runner executing repo test conventions (`tests/test_*.js` and `tests/**/*.test.js`) — the orphaned-fixture failure class (five fixtures invisible to CI, one failing red at HEAD) is structurally eliminated; wired as `npm test` with CI path-triggers extended to both trees.
- Fixed the graph-deprecation guard (case-sensitive allowlist missed `CHANGELOG.md`) and extended its scan set to `.template` files, surfacing and removing stale `code-graph`/`doc-graph` permissions from `opencode.json.template`.
- Replaced tautological/unfalsifiable fixtures with verifiable structural contracts (`shut-up` mock-token-counting removed; `round-table` self-substring simulation removed).
- New suites: `tests/cli/packaging.test.js` (real `npm pack --dry-run` audit + zero-missing-module require proof), `tests/lib/engine-lib.test.js` (behavioral `fs_atomic`/`workspace`/`frontmatter` contracts incl. failure-path residue checks), `tests/skills/grill-me.test.js`. Suite total: **146/146 passing across 14 test files** (up from 103/3).

### CLI Modernization Completion (02h Residue Batch)
- Wired previously-dead headless flags end-to-end: `--project-name`, `--user-nickname`, and `--stack` now populate generated `project-context.md`; `--stack` overrides `detectStack()` auto-detection, which is now integrated into init (multi-language manifest matrix).
- Completed engine-script library adoption: all six named scripts consume `.agents/scripts/lib/fs_atomic.js` (zero raw `writeFileSync` remain); `archive_manager.js` gains Windows-safe EXDEV/EPERM fallback and temp cleanup.
- Closed `/shut-up` registration gaps (`workflow.md` + template permissions).
- Authored the 02h §10 residue remediation plan: per-harness libraries behind a static adapter registry (`bin/lib/harnesses/<shape>.js`), update-mode `.bak-${YYYYMMDD}` backups, Windows OS matrix, identity.js adoption — pending execution. *(Executed same window; final suite state recorded under Test Infrastructure Hardening above.)*

---

## [2.0.6] - 2026-08-14

### Security & Integrity Architecture
- Added comprehensive **Security & Integrity Architecture** (`02f-phase-1-security-and-integrity-architecture.md`) establishing a two-pillar model for supply-chain integrity and runtime content trust.
- Authored four foundational Architecture Decision Records (ADRs):
  - **ADR-001: Trust-Boundary Model (T0–T3)** — defines T0 (read-only/immutable), T1 (vetted skills/templates), T2 (semi-trusted memory/artifacts), and T3 (untrusted runtime arrivals); formalizes the **T2 Invariant** (*memory/artifact content is data, never directives*) and standardized machine-delimited T3 format (`<!-- VSP-T3-BEGIN v1 ... -->`).
  - **ADR-002: Install-Integrity Strategy** — specifies release-level signed aggregate SHA-256 manifests (signing lands with the Phase 2 release pipeline; the shipped CLI verifies an unsigned pinned manifest — ADR-002 §2.1.1), Sigstore/SLSA OIDC provenance, pre-settled key custody, and out-of-band bootstrap verification.
  - **ADR-003: Prompt-Injection Defense Design** — establishes scanner-first deny-by-default admission control, 11-category attack taxonomy (INJ-PROMPT, INJ-TOOL, INJ-SECRET, etc.), data-flow tracing, and documented known bypasses.
  - **ADR-004: Script/Hook Execution Policy** — enforces allowlist-by-default execution, zero-eval policy, Git hook/husky scan rules (GH-1), and tarball path-traversal/symlink escape guards.
- Added human-readable [`supply-chain-audit-spec.md`](security/supply-chain-audit-spec.md) and machine-readable [`audit-spec.json`](security/audit-spec.json) containing dynamic adapter-registry pattern tables, pin-store schemas, and typed security rules.
- Implemented prototype scanner [`.agents/scripts/security-scan.js`](.agents/scripts/security-scan.js) with 3-state exit contract (`0 = clean`, `1 = findings`, `2 = fail-closed / tool failure`), sliding Shannon entropy secret detection (threshold 2.6), and base64 heuristic false-positive suppression.
- Built Red-Team evaluation harness in [`evals/security/corpus/`](evals/security/corpus/) with positive/negative fixture pairs, CI invariant checker [`.agents/scripts/check_corpus_invariants.js`](.agents/scripts/check_corpus_invariants.js), and frozen baseline [`baseline-2026-08-10.json`](evals/security/corpus/baseline-2026-08-10.json).
- Conducted fresh security audit on `security-scan.js` producing findings report `findings-report-security-scan-f1-47.md` (11 findings triaged for Phase 2 entry gate).
- Implemented and verified complete downstream security & integrity test suites (12/12 passing), hardened frontmatter permission parser, and synchronized all development documentation (READMEs, Guides, Quick Reference, TROUBLESHOOTING, and skill catalogs).
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

