# Changelog

All notable changes to the Vespyr project will be documented in this file.

---

## [2.0.11] - 2026-09-22

### Agent capability hardening & honesty fixes (2026-09-29)
- **Research agents tell the truth about what an AI can do.** `@user-researcher` and `@ux-researcher` no longer imply they run interviews or usability tests with real people. They now own two honest jobs: preparing the interview guides, screeners, and test kits for a human to run, and analyzing the notes/results the human brings back into personas and reports. Findings are tagged by source (expert review vs. real session), and inventing quotes or participant counts is banned.
- **Plain language is the default everywhere, including chat.** DNA 8 now explicitly governs every ordinary reply to the owner, not just formal reports — unavoidable technical terms are translated in-line the first time they appear, and if the owner has to ask for plain language the default has already failed. This ships in the rulebook every install generates.
- **New installs carry owner preferences from day one.** A fresh `project-context.md` now includes an `[OWNER PREFERENCES]` section (seeded with the plain-language default), and `@memory-controller` surfaces it at the start of every session so agents honor standing preferences without being reminded. A new `set-preference` command adds/updates/removes preferences safely instead of hand-editing.
- **Single owners for previously-orphaned capabilities.** Cloud-cost/FinOps now belongs to `@devops-engineer`; dependency/supply-chain review belongs to `@security-engineer`; in-product microcopy/UX writing belongs to `@product-designer`. Overlapping claims now cross-reference the one owner.
- **AI features get a real, blocking quality gate.** `@qa-engineer` now wires the existing `tools/eval/baseline.js` regression detector to a project's own AI feature as a blocking release gate (build golden set → pin baseline → block on quality drop/token inflation → prove the gate can fail), and `@ml-ai-ops` shares the same pinned baseline so pre-ship and deploy-time checks cannot disagree. Unwired semantic/shadow-judge checks are labeled honestly as review triggers, not enforced gates.
- **`@ml-ai-ops` brought up to standard.** Restored its full identity block and added the Decision Tree, Workflow Position, and Failure Modes sections its peers have.
- **Every reasoning agent activates its mentors by name.** Generic "what would my mentors challenge here?" lines were replaced with each declared mentor and the specific lens they bring; non-specific mentors (e.g. "OWASP contributors") were replaced with named practitioners.
- **`@memory-controller` recovers corrupted memory.** A corrupted or merge-conflicted memory file is now quarantined and rebuilt (keep-both-and-dedupe for merge conflicts, then backup, archive, or a fresh file with a logged data-loss note) instead of being silently overwritten.
- **`@security-engineer` hardened to principal level.** Added AI application-security auditing (prompt injection, jailbreak, tool-call exfiltration, RAG poisoning, agent-autonomy limits), deeper authn/authz (session fixation, JWT algorithm confusion, IDOR/BOLA), the full injection/SSRF/deserialization/XXE families, cryptography review, CVSS v3.1 scoring with remediation SLAs, secure-SDLC touchpoints, incident-response/disclosure handling, browser security headers + clickjacking, the scanner's fail-closed exit-code contract, and new-findings-only baseline-drift discipline — all grounded in the real `security-scan.js` and `evals/security/` corpus.
- **Security stays audit-only but fast.** `@security-engineer` keeps no write access (separation of duties preserved), but now hands `@developer` a ready-to-apply fix spec (exact location, precise change, required regression test, verification command) so fixes move immediately; the finding closes only on the auditor's re-audit, not the developer's assertion.


- Prototyping in `/design` now supports two dedicated tracks: **static HTML** (lightweight exploration with Tailwind CDN and design tokens, without needing React or linter setup) and **component code** (engineering-ready Next.js components with strict design-system lint enforcement).
- **Reverse-PRD from your own prototype (imported sub-track).** Reverse mode (`/design`, prototype-first) now has two sub-tracks. The existing **generated** track turns a Vespyr-built prototype into a PRD. The new **imported** track lets you bring a prototype you built elsewhere — Figma export, Google Stitch, or hand-coded HTML for pixel-perfect fidelity — by dropping it into `artifacts/input/prototype/` (the installer now scaffolds this folder). Because there is no upstream product-manager flow, the SPEC.md kernel is reverse-derived from the prototype instead of being required up front. Everything downstream is identical: the same Evidence Ledger, the same PRD synthesis loop, and the same parity gate — so an imported prototype is held to the same evidence-traceability bar as a generated one. The imported file is fingerprinted on arrival with an **import witness** (a hash tamper-check); note this proves the imported file is unchanged, not that it still matches the design tool it came from — keeping the imported copy in sync with Figma/Stitch is a human responsibility the engine cannot detect.
- Your explicit choice of prototype track is always respected; project detection never overrides what you ask for.
- Prototype review is now an explicit collaboration milestone: `@product-designer` and `@tech-lead` review visual fidelity, state coverage (empty, populated, error), design tokens, and technical feasibility before downstream synthesis or engineering handoff. Handing off an unreviewed prototype is blocked until both sign off.
- Requirements and user stories generated from prototypes or ideas now strictly preserve complete standard structures — partial summaries or flat story lists that omit acceptance criteria can no longer pass quality checks.
- New `npm run setup:hooks` command configures an automated pre-commit check to ensure code changes pass the full test suite before committing.

### Native language controls (2026-09-24)
- Chat always follows the language you use; only generated artifacts use a fixed, configurable language.
- `vespyr lang` shows or changes that language, accepts common aliases, and lists supported choices.
- Fresh installs and reconfiguration can select the artifact language interactively or with `--language-artifacts`; updates preserve the current choice.
- CLI subcommands now provide focused help, and the active artifact language stays synchronized with the project context.

### Rulings + gate boundary fixes (2026-09-23)
- Owner rulings executed: the "missing parity report = proceed" witness rule is ratified (report-deletion-after-freeze guard filed as open defect D3); the reverse-mode PRD scoring weights are ratified at their current values with the rationale on record, and re-checking them against real data is now a required step of the pending A8 comparison.
- Plain-language scope extended to every document the engine writes, in any language the owner chooses (DNA 7).
- Coverage-gate boundaries hardened after the roundtable probes: evidence references now share one grammar implementation with the parity checker (outside paths, parent-directory escapes, and empty identifiers all rejected), and the fidelity check resolves every evidence reference — dead paths and reference-less "implemented" rows now fail the gate.

### Owner-readable results (DNA 8, 2026-09-23)
- Roundtable verdicts, review summaries, and decision asks must now open with one plain sentence, state findings as consequences, and present decisions as linked briefs with options and a recommendation — machine gate markers always get a human translation, links replace bare citations, and anything that needs the repo open to decode gets rewritten.

### Design UI stack gate (2026-09-23)
- When no stack preference is recorded, `/design` now detects shadcn/Tailwind intent from project evidence first and asks only when it can't tell; a chosen shadcn stack offers to install the shadcn MCP server (opt-in) and enforces the design-system guideline with `@shadcn/lint` — zero `shadcn/*` violations before any design gate.

### Implementation Coverage Contract (2026-09-22)
- `/develop` gained a fidelity review before QA: an orphan-AC sweep fails the build on any acceptance criterion with no implementation reference, and a coverage report maps every AC to code/test evidence with owner-dated deferrals capped at qa-signoff.
- The 10 detail classes are audited as implemented or explicitly deferred before quality gates run; a missing class fails the gate.
- `/test` failure summaries list orphan ACs, and qa-signoff cites the sweep's output.
- The requirements-to-implementation rubric was hardened against pattern-stuffing and lorem outputs (RTI-4 + named anti-gaming tests).
- Full automated suite passing (547 tests).

### Prototype-First Reverse Mode (2026-09-22)
- `/design` now runs reverse (prototype-first): a frozen prototype becomes an evidence-anchored PRD through the same interactive loop as the traditional flow — never a one-shot generation.
- Every requirement statement carries a `path#id` evidence anchor; unsupported statements stay `[OPEN]` for the owner instead of being invented.
- A mechanical parity gate counts ghosts, orphans, grounding, and 10-class detail coverage, and stamps a freeze witness — if the prototype changes afterwards, the scope gate blocks until a formal Spike Rollback re-extracts and re-witnesses.
- Stale, broken, or partial freeze witnesses halt every design mode loudly; a deleted or stubbed checker cannot fail silently.
- Evidence-anchored PRD criteria (PRD-5/PRD-6) added to the PRD rubric, labeled fixture-tier.
- Governance: the Freeze Boundary and Rule of Any One are now swarm-wide guardrails; contract shifts without `[DELTA-NN]`/`AC-E*` entries and untokenized UI values are rejected in review; the 2-Tier Iteration Filter lives in the developer guidelines.
- Full automated suite passing (526 tests).

### Smarter Routing & Reliable Skill Gating (2026-09-21)
- Roundtable panels always seat at least two participants — a one-person debate, which can't be scored, can no longer be routed.
- Topic routing got sharper: everyday word forms now match (`deployed`, `shipped`, `launched`, `OAuth`), "review" topics reach the code reviewer, and phrases like "author" or "authority" no longer pull in a security agent by accident.
- Unattended topics fall back to a default two-person panel instead of routing empty.
- Skill scope gates are session-aware: a lock left behind by a previous session can no longer silently unlock a skill, cross-process locks expire after 15 minutes (re-lock to continue), and locks work immediately on a fresh install.
- A broken routing configuration fails fast with a clear error instead of producing nonsense panels.
- `npm run lint` now checks every entry point, not only the first file.
- Full automated suite passing (501 tests).

### Evolutionary Design & Dual Quality Architecture (2026-09-16)
- Engineering builds the simplest design that works: speculative frameworks and unused abstractions are rejected before they get written.
- Refactoring is continuous and only under green tests; deferred "cleanup" sprints are gone.
- Deterministic code and AI features get separate quality bars: AI features require an evaluation dataset and a baseline before model work starts, and prompt or model changes can't merge without benchmark numbers.
- Tests assert observable behavior instead of internal mocks; every external integration ships with automated failure tests (timeouts, rate limits, server errors).
- Model API calls time out automatically (30s), so a hung provider can't stall an evaluation.

---

## [2.0.10] - 2026-09-10

### Parallel sessions & worktrees
- Setting up a second working copy is now all-or-nothing — a failed setup rolls back completely instead of leaving a half-created worktree.
- The parallel-session offer no longer triggers on its own.
- New `worktree clean` command removes idle working copies.

### Session summaries & maintenance
- The rolling session summary no longer truncates: decisions, next step, and blockers always show the latest entry.
- Update backups live in one place, and deprecated files are pruned automatically on install and update with backups preserved.

### Better panels, auditable debates
- Panels automatically seat the right specialists for the topic — for example, the ML engineer joins eval/prompt/serving topics, where previously such a topic could run without one.
- Debates show the actual back-and-forth between agents; every position must be challenged, the debate is scored automatically, and panel state survives context compaction.
- One verdict vocabulary everywhere: GO / RESHAPE / NO-GO for proposals, CONFIRMED / PARTIAL / FALSIFIED for claims — older records still read correctly.
- Engine commands are stricter: invalid skill or step commands error instead of silently passing; memory writes scrub secrets and injection payloads; state updates are crash-safe.

### Design system
- Design requests start with a taste interview and a two-axis style decision (product context × craft style) before any output is produced.
- Generic AI-look output — navy darks, blue-violet gradients, cookie-cutter hero layouts — is rejected by default; every design must name its one differentiator.
- Agency mode unlocks launch-grade visuals (WebGL, scroll choreography) with performance budgets and reduced-motion fallbacks.
- Game-idea skills removed for now; they are planned to return as a dedicated track.

---

## [2.0.9] - 2026-09-04

### Concise specifications by default
- PRDs, epics, features, and user stories must be short and direct — filler and convoluted phrasing are prohibited.
- Jargon is explained in plain English inside the document.
- Templates updated to the concise contract: a 1–3 sentence business requirement, a compact technical contract, and terse Given/When/Then criteria covering happy, unhappy, and edge cases.

---

## [2.0.8] - 2026-09-03

### Readable documents
- Structured data renders as real Markdown tables; diagrams use Mermaid; ASCII is reserved for wireframes, charts, and terminal output.

### One decision vocabulary
- PASS / PIVOT / KILL collapsed into GO / RESHAPE / NO-GO with a required timing axis (NOW / GATED / NEXT-CYCLE / NEVER); old records remain readable.

### Smaller, cleaner install
- Package cut from 427 to 370 files (723KB → 680KB): development-only content, security-test fixtures, and live session state no longer ship to users.

### Reliability & safety
- Injected memory is labeled as passive data and capped under 1,000 tokens; memory writes are serialized with locking; failed pipeline transitions leave state untouched.
- Windows CI coverage across Node 18/20/22; fixes for the Windows installer, CRLF parsing, and stuck locks.

---

## [2.0.7] - 2026-08-24

### Honest agents
- Agents push back on flawed premises instead of agreeing, never produce plans for rejected ideas, and challenge vanity features with a mandatory three-question check.

### Two kinds of verdicts
- Proposals get an explicit proceed / redirect / abandon verdict; claims about existing state get CONFIRMED / PARTIAL / FALSIFIED — so rejecting a claim can't be misread as killing the idea.

### Auditable multi-agent debates
- Roundtables must render the visible dialogue between agents; panelists defend positions with evidence or concede explicitly.

### One memory system
- Memory consolidated into a handful of purpose-built files with an always-current rolling summary; legacy note directories and dead memory paths removed.

### Security built in
- `vespyr verify` checks install integrity fail-closed; `vespyr audit` scans for secrets and injection payloads, with red-team fixtures and security checks running in CI; unexpected changes to engine files are flagged.

### Evaluation harness
- `vespyr-eval` ships rubric-driven suites, test fixtures, and a CLI, including an adversarial trap suite.

### Stronger questioning, less assuming
- `/grill-me` runs eight universal interrogation moves against any subject; agents escalate from silent checks to clarifying questions, up to a full interrogation at commitment gates.

### Test & CLI hardening
- One runner covers every test suite (146 tests across 14 files, up from 103 across 3).
- `/shut-up` silent-execution skill; previously dead install flags (`--project-name`, `--user-nickname`, `--stack`) now work; custom agent declarations via manifest.

---

## [2.0.6] - 2026-08-14

### Security & integrity
- `vespyr audit` scanner with clear exit codes, entropy-based secret detection, and a red-team attack-fixture corpus checked in CI.
- Trust boundaries formalized: injected or external content is treated as data, never instructions.
- Script execution is allowlist-by-default, with tarball path-traversal and symlink-escape guards.

### Harness neutrality
- Skills no longer reference roles that don't exist; delegation is phrased by capability with explicit fallbacks when a harness has no subagents — identical behavior across all supported harnesses.

### Simplified roster
- Squad and `/delegate` features removed; the agent roster standardized at 20 personas; documentation regenerates from a single source; unverifiable cost claims removed.
- Kiro steering documents are generated automatically during install.

---

## [2.0.5] - 2026-08-07

### Added
- Kiro harness support — steering document and skills symlink configured by the installer.
- Root documentation (`AGENTS.md`, `CLAUDE.md`, `agent.md`) regenerated from a single canonical source.
- Stage-aware roles expanded for `/round-table`.
- CLI test coverage for the new install and scaffolding flows.

### Changed
- Install wizard reworked for harness selection, docs sync, and validation.

---

## [2.0.4] - 2026-08-05

### Added
- Automated skill-metadata validation against the agentskills.io spec, enforced in CI.

### Changed
- Skill metadata standardized repo-wide; package version bumped to 2.0.4.

---

## [2.0.3] - 2026-08-05

### Added
- Guards against premature conclusions and premature stage transitions: empirical verification required before advancing.

### Removed
- Legacy template command files.

---

## [2.0.2] - 2026-08-04

### Added
- New channeled mentors: Elon Musk and Steve Jobs for `@founder`; Frank Thomas, Ollie Johnston, and Jony Ive for `@product-designer`; a growth-marketing playbook enrichment for `@growth-marketer`.

### Changed
- Clarified product and marketing co-ownership between `@product-manager` and `@growth-marketer`.

---

## [2.0.1] - 2026-08-03

### Added
- `/motion` skill — motion research → motion specification → implementation handoff for animation-significant products, with a simulation harness and evals. Domain knowledge loads only when motion is in scope, keeping agent startup light.

### Changed
- `@shifu` handbooks must be full-length student textbooks, never condensed cheatsheets.

---

## [2.0.0] - 2026-07-13

### Added
- Phase 0 foundation and the v2.0 upgrade.
- Skills restructured into small step-based workflows with routers (`develop`, `validate-idea`, `retro`, `design`, `launch`), plus create/edit/validate modes for design and validation.
- Spec-kernel pattern: a compact five-field spec core (Why / Capabilities / Constraints / Non-goals / Success signal) with typed companion documents; visual design specs generated as HTML.
- Sprint dashboard with human-readable state and ASCII CLI views.
- Decision trees, failure modes, and escalation rules for domain agents; a 15-item false-positive guard in the code reviewer; method libraries (100 elicitation, 61 brainstorming, 31 validation patterns).

> **Correction (2026-09-24):** an earlier v2.0.0 entry listed "Loop engineering: `/goal` primitives, automated heartbeats, and persistent loop state" as shipped. That was inaccurate — loop engineering was never built (no `/goal` command, `@goal-verifier`, automation/heartbeat scripts, or `loop-state.json` exist on disk). It remains planned for a future release; see `artifacts/docs/strategy/development-plan/07-phase-6-loop-engineering.md`. The line has been removed from this entry.
- Pipeline enforcement: phase validation at start, completion logging at shutdown.

### Changed
- Development docs restructured into a versioned, phase-based planning framework.
- Skill files rewritten as compact routers (279 → 56, 299 → 38, 302 → 45 lines).
- Pipeline state moved to YAML as the source of truth.

---

## [1.7.3] - 2026-06-29

### Added
- Plan for migrating agent personas to OpenClaw skills.
- Orchestrator CLI documentation with dashboards and an extended Definition of Done.

### Changed
- Adoption plan versions and effort estimates updated to v2.x.

---

## [1.7.2] - 2026-06-25

### Changed
- General bugfixes and README updates.

---

## [1.7.1] - 2026-06-23

### Added
- Support for Hermes and OpenClaw harnesses in the installer.

### Changed
- Installations preserve user content across all 8 supported harnesses; copy-to-symlink migration support; repository URLs standardized.

---

## [1.7.0] - 2026-06-12

### Added
- Stage-aware `/round-table` skill.
- NPX installer with harness integration; surgical uninstall and reconfigure.
- Success-metrics builder for `@product-manager`.

---

## [1.6.0] - 2026-05-25

### Added
- `grill-me` and `help-me` skills; squad-based team presets; kanban protocol for development agents; hierarchical user stories with epic/feature sections and indented Gherkin criteria.

### Changed
- Pipeline state integrated into help-me flows; entry docs synchronized.

---

## [1.5.0] - 2026-05-22

### Added
- `@founder` integrated into the validation skills; open-question tracking; tone overrides for Socratic agents.

---

## [1.4.0] - 2026-05-20

### Added
- Telemetry and input-directory tracking in `init`; Socratic critical-inquiry system; README updates.

---

## [1.3.0] - 2026-05-20

### Added
- Skills renamed to short, memorable names; utility skills and streamlined agent configurations.

---

## [1.2.0] - 2026-05-20

### Added
- Expanded swarm capabilities and memory optimization; initial testing infrastructure.

---

## [1.1.0] - 2026-05-20

### Added
- Cleaned-up agent instructions with extracted reference guidelines and templates.

---

## [1.0.0] - 2026-05-18

### Added
- Initial release: 21 specialized agent personas, product-manager capabilities, and agent template configurations.
