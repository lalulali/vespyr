# Review 01 — `.agents/` (exhaustive)

Date: 2026-09-05 | Mode: native subagents ×4 (scripts / skills / personas+references / root+templates) | Scope: 330 files excl. `node_modules`

## 1. Inventory (what lives here)

| Sub-area | Count | Notes |
|---|---|---|
| `scripts/` | 42 `.js` + `lib/` 6 | 10,934 lines + 564 lib; runtime, CI-only, and spent one-shot codemods mixed |
| `skills/` | 42 `SKILL.md` | full census (not sample); catalog compiles 42 |
| `agents/` | 20 personas | temps coherent (0.1 eng / 0.2 research / 0.3 divergent); frontmatter 20/20 pass |
| `references/` | `socratic/` 18, `motion/` 3, guidelines, DNA, contracts, glossary | |
| `templates/` | 10 dirs + 3 root files | architecture 2, discovery 8, incident 3, launch 5, memory 8, planning 5, product 10, quality 2, research 7, system 4 |
| root | `config.yaml`, `manifest.json` (324 entries), `workflow.md`, `skills.md`, `GUARDRAILS.md`, `TROUBLESHOOTING.md`, `package.json` stub | |
| `custom/` / `state/` | `custom/README.md` only; `state/` ledger + session-current | |

## 2. What holds

- Fail-closed contracts real: scanner exit 2 (`scripts/security-scan.js:33-42`), memory lock TOCTOU closure (`scripts/memory_write.js:226-262`), migration zero-loss abort (`scripts/migrate_memory_v2.js:171`).
- Secret scrub + injection sanitize live on write path (`memory_write.js:78-111`); `memory_filter.js:19` reuses it.
- Symlink worktree sharing, `roundtable_eval` coverage gate, 1306-line `orchestrator_state` god-object, dual-writer `sync-entry-points.js` vs `bin/cli.js:810` — all prior claims CONFIRMED on disk.
- "0 delegation logic" claim FALSIFIED: `compile_skills.js:108-179` has a real dead-handle lint (different lint than 02g's presence-lint, but logic exists).
- Drift dead-signal CONFIRMED (`drift_monitor.js`, history gitignored, zero callers).

## 3. Defects

### P0
- **P0-1 Manifest gate unfalsifiable as shipped.** `manifest.json:4` claims 324 but disk has 328 (4 untracked: `manifest.json` itself, `state/.npmignore`, `state/memory-write-ledger.jsonl`, `state/session-current.json`) + 1 phantom (`files_root: {bin/cli.js}` at `manifest.json:331-333` resolves to nothing under `.agents/`; real CLI is repo-root `bin/cli.js`). No `signature` key. Verify drifts on clean checkout. (root track)

### P1
- **P1-15 Kai starvation (owner-reported 2026-09-05, reproduced).** Prompt-engineering work on vespyr almost never summons Kai. Root causes, all verified: (a) `optional:true` + brief-anchored `summon_when` (`ml-ai-engineer.md:32-33`) — framework self-work has no validation/idea brief, so the condition is never true; (b) round-table phase rosters contain Kai in 0/10 phases (`round-table/SKILL.md` rosters: Validation/Discovery/Research/Strategy/Architecture/Planning/Execution/Launch/Iteration/Documentation/Retro — Kai absent from all; reachable only via the custom domain bullet `AI/ML Logic, RAG & Prompts` at `:80`, which requires the host to classify framework plumbing as AI/ML instead of execution); (c) skill wiring: 1/42 skills mention `@ml-ai-engineer` (only round-table `:80`) vs 8/42 for `@developer` (grep-verified) — no prompt/eval skill routes to Kai via `key_agents` or body; (d) precedent loop: every recorded pre-2026-09-05 roundtable (02f/02g/02h per `active-decisions.md`) seated builders only, so hosts repeat the pattern; (e) no starvation signal: nothing counts summons per agent, so the absence is invisible. Net: the only path to Kai is host discretion, and the defaults all point at Rex.
- **P1-1 Skills registry overcount.** `skills.md:3,74` claims 43; disk + catalog + bullets = 42 (`skills/SKILL.md` census, `compile_skills.js` "Compiled 42 skills"). Fix 43→42. (skills track)
- **P1-2 Delegation presence-lint never built; dead-handle residue outside scan scope.** Strict `Delegation path:` = 1/42 (`round-table/SKILL.md:27`); 02g EXECUTED claim stays FALSIFIED (`active-decisions.md:319-324`). Dead-handle lint passes only because it scans `skills/*` (`compile_skills.js:115-142`) while `references/delegation-policy.md:12-17,41-43` + `scripts/delegation_audit.js:35` still emit the banned `@reader/@writer/@executor` handles. (skills+scripts tracks)
- **P1-3 Intent scoring location (corrected by Appendix D1).** Original "0/42 DNA4" verdict was wrong — full step-00 reads show DNA4 C≥0.85 / fork / <0.50 present in 6/6 gated skills. Residual defect: C-numbers live only in step files, never SKILL.md bodies; `step_tracking: off` (`config.yaml:10`) vs "tracker exits 1" still confuses operators; 36 non-gated skills have no triage by design. (skills track)
- **P1-4 Game-track gap.** `explore-game-idea` / `validate-game-idea` lack the Step-0 + delegation + Path C/D their base tracks have (`explore-idea:41` vs game fork none; `validate-idea:24` 73 lines vs game 287 lines no gate). (skills track)
- **P1-5 `delegation_audit.js:35` vs `compile_skills.js:113`.** Audit counts banned handles as targets; compiler fail-closes on them. Audit signal permanently empty; fallback regex (`:135`) matches a format nothing writes. (scripts track)
- **P1-6 `add-delegation-contract.js:21-25` residue.** Spent codemod injected the now-banned mapping — source of current violations. Quarantine spent codemods out of ship set. (scripts track)
- **P1-7 `session_checkpoint.js:86-97` dead stub.** Returns `{deprecated:true}`, writes nothing; header still advertises auto-emit. Delete or fix docblock. (scripts track)
- **P1-8 `merge_customization.js:217` defaults dead.** `defaultsPath` points at `.agents/agents/<name>/customize.toml` (dirs never exist; agents are flat `.md`) → merge degenerates to override-only. (scripts track)
- **P1-9 Synthetic/real telemetry mixing.** `pipeline_simulator.js:106-111` writes fake `agent_invoke` events into the same `artifacts/telemetry/events-*.ndjson` sink as production with no provenance tag; `hot_path_analyzer.js:21` + `swarm_telemetry.js:243` summaries mix both. (scripts track)
- **P1-10 Worktree doc/impl divergence.** `workflow.md:210-211` (`.agents/worktrees/…`, `loop-state.json`) vs `worktree.js:62,101-113` (sibling `-wt-` + symlinks); `loop-state.json` absent. Parallel-session setup will mislead. (root track)
- **P1-11 Dead `graph.code.src: src/`.** `config.yaml:14-16`; `ls src` absent; `orchestrator_state.js:542` admits code lives elsewhere. Default graph scans nothing. (root track)
- **P1-12 Escalation ladder fork.** `TROUBLESHOOTING.md:94-98` 4 rungs vs `workflow.md:451-454` 3 levels. Ambiguous in real conflict. (root track)
- **P1-13 Atlas gaps.** `ml-ai-ops.md` missing `## Citation Protocol` (only reasoning agent without one; validator `CITATION_AGENTS` at `validate_frontmatter.js:164-170` masks it) + no `socratic/ml-ai-ops.md` + no footer. `REASONING_AGENTS` (`:153-158`) also omits founder/technical-writer/user/ux-researcher. (personas track)
- **P1-14 Contract table gaps.** `agent-contracts.md:6-24` missing @shifu + @memory-controller rows; `glossary.md:12` "denied bash/edit" false for bash (all allow); `delegation-policy.md:5` default-delegate vs Rex/Grant/Nina/Axel direct-I/O unresolved; `phase-table.md:5` lacks `When:` pointer. (personas track)

### P2
- `collision_detector.js:113` `--strict` both branches exit 0 (no-op flag).
- `dedupe_validator.js:14` docs `--threshold 0.85` vs code `0.70/0.50` (`:260-261`); `memory_write.js:233` checks `duplicate === true`, a key never returned.
- `session_bootstrap.js:5` `const path = require('fs')` shadow (works by accident).
- `token_profiler.js:78` dead ternary (always Premium).
- `worktree.js:225` `remove` passes `path: undefined` (custom-path worktrees unremovable via CLI).
- `validate_frontmatter.js:91` `icon.length > 4` misjudges ZWJ emoji (cosmetic).
- Doc nits: `shifu.md` prefix vs human_name; `user-researcher.md` section order; Zara binding-veto needs summon-time banner; `ux-researcher.md:320`.
- `custom/*.toml` documented but inert (`custom/README.md:40-41`); `TROUBLESHOOTING.md:233` still prescribes it.
- Skill sprawl: explore/validate game forks, 4 authoring skills, 4 state viewers (status/sprint-status/kanban/phase), 5 thin research canvases, `humanize` 571 lines (vendored MIT) vs `shut-up` 34 lines with no shared contract.

## 4. Rex/Kai routing (from personas track)

Keep Kai `optional:true` + brief-triggered summon; keep Rex core. Three existing splits: charter (Kai prediction/prompts/RAG/evals `ml-ai-engineer.md:107-120` + NOT-invoke `:136-139` vs Rex deterministic impl), architecture (Vera decides topology/boundaries `architect.md:241-276`, Kai fills model internals, Atlas operates from model-card contract), review (Scout defers accuracy to Kai/Nova `code-reviewer.md:282-287`). Residual: Vera `ai-architecture-design` vs Kai `AI architecture` row (resolve: Vera topology, Kai internals); Kai→Atlas artifact-only back-lane slow by design; founder +2–4wk Kai line must fire with PM AI-mode evals or estimates undercount harness work.

## 5. Fix order (for implementation wave)

1. P0-1 manifest: drop phantom `files_root.bin/cli.js`, track or exclude 4 state files explicitly, add `signature` or document TOFU scope.
2. P1-15 Kai starvation: (a) widen `summon_when` — add "vespyr self-work touching prompts/judges/evals/rubrics/benchmarks/telemetry-biomarkers/roundtable" + keyword triggers (prompt, judge, eval, rubric, benchmark, biomarker, RQS, tier, hallucination, SPC); (b) write the Rex/Kai mandatory-vs-conditional router INTO `round-table/SKILL.md` stage selection (Kai auto-seated on matching tags, not host discretion); (c) add `@ml-ai-engineer` to `key_agents`/bodies of prompt-touching skills (currently 1/42 vs 8/42); (d) count summons per agent in telemetry so starvation is visible; (e) re-run the eval-harness/judge decisions with a Kai seat (this session's roundtable already did — record it as the baseline, not a re-do).
2. P1-2/P1-5/P1-6 delegation: single banned-handle source of truth; extend lint beyond `skills/*` or scrub references/scripts; quarantine 6 spent `add-*` codemods + `migrate_memory_v2` out of ship set.
3. P1-3 intent: surface C-numbers in the 6 gated SKILL.md bodies (they live only in step-00 files); clarify `step_tracking: off` ≠ gates off.
4. P1-4 game forks: backfill Step-0 + delegation or record intentional divergence.
5. P1-13 validator: add Atlas (+ founder/writer/researchers) to citation/socratic gates; write `socratic/ml-ai-ops.md`.
6. P1-10/P1-11/P1-12 docs: fix worktree path, `src/` default, ladder rungs.
7. P1-14 contracts: add @shifu + @memory-controller rows; fix glossary bash claim; resolve default-delegate vs direct-I/O; add `When:` pointer to phase-table.
8. P2 batch: strict flag, dedupe keys, bootstrap shadow, tokenizer ternary, worktree remove, icon check.

## 6. Coverage statement (updated — inside-.agents walk 7/7 COMPLETE)

- `agents/` 20/20 FULL read (Appendix A). `custom/` 1/1. `references/` 38/38 FULL (Appendix B). `scripts/` 49/49 FULL (Appendix C + 4 corrections). `skills/` 152/152 FULL (Appendix D + D4 reversal). `state/` 3/3. `templates/` 57/57 FULL (Appendix E). Root files 8/8. Total: every non-`node_modules` file under `.agents/` read end-to-end.
- Outside `.agents` (scope folders): `bin/` all JS end-to-end (no docs); `security/` 2/2 + gates + corpus 30/30 + held-out 8/8; `tools/eval/` 11/11; `tools/telemetry/` 3/3 + swarm + samples; `evals/` suites 14/14 + rubrics 7/7 + fixtures 4/4 + gold + topics + README + transcripts 6/6 + RQS artifact. 33/33 markdown files in scope read.
- Deliberately excluded: `.agents/node_modules/`, `.DS_Store` files. Not executed: live install/update/verify runs, `packaging.test.js`, full 324-hash manifest recheck.

## Appendix A — `agents/` full-read detail (20/20)

Line counts: architect 318, code-reviewer 313, data-analyst 336, developer 264, devops 267, founder 361, memory-controller 432, ml-ai-engineer 302, ml-ai-ops 123, performance 274, product-designer 358, product-manager 401, qa 335, researcher 303, security 328, shifu 395, tech-lead 346, technical-writer 257, user-researcher 285, ux-researcher 365.

### Systemic defect (all personas) — direct-read contradiction
15+ files state `read … directly` then `Do NOT read directly — load via @memory-controller` (e.g. `architect.md:132` vs `:145`; `code-reviewer.md:140` vs `:153`; `data-analyst.md:206` vs `:219`). Only Kai (`ml-ai-engineer.md:170`, cites AGENTS.md) and Nina (`qa-engineer.md:153-154`, cites AGENTS+GUARDRAILS) resolve it. **Fix: propagate Kai/Nina wording everywhere.** (P1, new)

### Per-agent notes (deltas beyond §3)
- **Vera** (`architect.md:1-318`): 8 AI caps (`:4-12`); fields named `upstream_dependencies/downstream_consumers` (`:32-42`) — naming drift vs other agents' `upstream/downstream`. No Decision Tree; missing-file guardrail duplicates tech-lead (`:197-203`).
- **Scout** (`code-reviewer.md:1-313`): `edit:deny/write:false` read-only (`:17-31`) coherent; 15-item false-positive list strongest anti-noise guard; Kanban direct-edit (`:289-300`) overlaps PM-seed/TL-own; write-restriction "only systemic pattern" (`:169`) tensions REQUIRED enforcement (`:173`).
- **Nova** (`data-analyst.md:1-336`): `synthetic-data` cap (`:4-13`); boundary table duplicated verbatim in Felix (`:310-313` vs `performance-engineer.md:208-214`); ML-logging escalate ⇄ Kai A/B-escalate (`:123` vs `ml-ai-engineer.md:134`) needs handshake.
- **Rex** (`developer.md:1-264`): `v3.0`; no Decision Tree; spec-read mandate omits `requirements.md/SPEC.md` (`:187`); A11Y URL unpinned (`:209-213`); Kanban `In Review` on code-done (`:201`) vs Scout on review-start (`code-reviewer.md:295`).
- **Axel** (`devops-engineer.md:1-267`): runbook `07-infrastructure/deployment-runbook.md` (`:257`) vs Clara `07-infrastructure/runbook.md` (`technical-writer.md:245`) — duplicate path (P1, new).
- **Elena** (`founder.md:1-361`): temp 0.3; no workflow table / Decision Tree; conditional-summon table (`:293-299`) overlaps `optional/summon_when` owners; research tools cite `websearch_cited/playwright_*` (`:106-112`) without availability guard.
- **Mnemos** (`memory-controller.md:1-432`): `bash/question/webfetch:deny` correct; 14 downstream; no citation/workflow block by design (I/O role); `latest.md` never-write (`:331,418`) — constraint other agents' generic blocks obscure; 17-tag list (`:243`) missing Shifu `[TEACHING]` (`shifu.md:331`) — tag mismatch (P1, new).
- **Kai** (`ml-ai-engineer.md:1-302`): field-order drift (`:15-17`); model-card triple root — `:256` vs ops `artifacts/output/architecture/…` (`ml-ai-ops.md:70`) vs `05-execution/` docs (`:282`) (P1, new); artifact-only handoff to Atlas (`:259`) correct but slow on malformed cards.
- **Atlas** (`ml-ai-ops.md:1-123`): most divergent — no citation/Decision-Tree/workflow-table/standards/failure/conflict; See-the-Unseen truncated (`:60-63`); condensed memory block missing templates/enforcement/step-tracker (`:80-104`); `edit:deny` vs "owns deployment pipeline" (`:66`) tension; artifact root `ml-ai-ops/` (`:73`) vs architect `04-architecture/` ADRs.
- **Felix** (`performance-engineer.md:1-274`): audit-only flags correct; quality-root split `05-execution/quality/` vs QA `06-quality/` (`:263` vs `qa-engineer.md:259,303`) (P1, new).
- **Ivy** (`product-designer.md:1-358`): no Decision Tree; taste-interview `design.md` ref without path (`:108`); HTML 300-line cap + Agency exception (`:301`) confusable with Shifu handbook bar; zero-orphans rule (`:282`) pairs with PM story→spec (`product-manager.md:257`).
- **Sarah** (`product-manager.md:1-401`): 4-question determinism gate (`:67-72`) vs Kai heuristic-first (`ml-ai-engineer.md:137`) — no precedence (P1, new); AI-PM companion outside `artifacts/output/` (`:356`); Kanban "solely seeding" (`:271`) vs TL structural (`tech-lead.md:271`) vs QA missing-board guard (`qa-engineer.md:284`).
- **Nina** (`qa-engineer.md:1-335`): no-green-without-red + R-2 stamp (`:63-64`) exceeds DNA minimum — keep; eval paths cite code without existence guard (`:117-119`); release gates overlap Victor's with no tiebreak.
- **Iris** (`researcher.md:1-303`): single upstream `@founder` (`:28-29`) but wider escalation (`:106-110`); motion outputs vs Zara's lack merge owner except Ivy (`:251` vs `ux-researcher.md:318` vs `product-designer.md:116`).
- **Victor** (`security-engineer.md:1-328`): reviewer first-pass vs deep-audit boundary clean (`:214-224`); dual blocking gates (Victor `:311-316` + Nina `:305-314`) — tiebreak only founder risk-acceptance (`:110,327`) (P1, new); ML attack-surface vs Kai privacy consistent.
- **Shifu** (`shifu.md:1-395`): quoted date (`:14`) unique; per-deliverable `complete` + Quick citation exemption (`:52,90`); `[TEACHING]` tag missing from controller list; handbook bar duplicated (`:54` vs `:378`); prefix consistent (`:66,285`).
- **Grant** (`tech-lead.md:1-346`): no Decision Tree despite arbitration role; delegation 3-tier (`:234-237`) coherent with audit-only roles; FE/BE tags bind Rex comms (`:228-231` vs `developer.md:248-251`).
- **Clara** (`technical-writer.md:1-257`): downstream `end users/operators` non-agent string (`:31-35`) — validator passes, contract table omits; "code is truth" (`:193`) + "never document fiction" (`:97`) correct pair.
- **Paige** (`user-researcher.md:1-285`): Stance-before-See-Unseen order deviation (`:54-68`); WHEN-NOT/pre-post split vs Zara clean (`:116` vs `ux-researcher.md:141-149`); writes `project-context.md` (`:168-172`) — multi-writer risk with founder/PM.
- **Zara** (`ux-researcher.md:1-365`): same order deviation (`:59-73`); binding veto + motion sign-off (`:320,365`) strongest gate in swarm — needs summon-time banner; Differ-table outputs duplicate researcher/Paige by design, needs triage.

### Cross-agent state after full read
Overlaps match contracts (Nova⇄Felix, Scout⇄Victor, Paige⇄Zara, motion 5-way) — all correctly mirrored in-file. Residual: dual release vetoes (Victor+Nina, no joint procedure); Kanban triple-claim (workable, only Nina guards missing board); quality-root + model-card + runbook path splits listed above. Validator gaps from §3 stand and widen: `REASONING_AGENTS` omits 5 agents; Atlas + Mnemos socratic files absent (Mnemos acceptable, Atlas not).

## Appendix B — `references/` full-read detail (38/38)

### B1. Socratic stances (18/18 + 2 confirmed absent)
All 18 `socratic/*.md` read end-to-end. Shared boilerplate: never ask known-answer questions; max 2 questions without a position; follow the deeper thread. **Zero material contradictions** — every file MATCHes its persona stance, several EXTEND (architect one-way/two-way doors; founder steelman-before-kill; Victor tone calibration founder/PM vs architect/TL; Ivy longest file 53 lines brave-version + costed fallback; Nova 6 probing principles incl. Goodhart/data-ink; Shifu richest change-mind; Paige/Zara tone overrides).
- Rex/Kai interplay: both preach simplicity, gate differently — Rex simplest-impl + blast radius (`socratic/developer.md:22,24,38`), yields to architecture beyond scope (`developer.md:99`); Kai heuristic-first 80% rule (`socratic/ml-ai-engineer.md:34`), yields to research on capability gaps (`ml-ai-engineer.md:104`). Overlap zone is eval proof: Rex demands test coverage of failure modes (`socratic/developer.md:18,36`); Kai demands production-distribution eval + p99 + drift (`socratic/ml-ai-engineer.md:22-25,36-38`). Complementary, no jurisdictional clash.
- Confirmed absent: `socratic/ml-ai-ops.md`, `socratic/memory-controller.md` (glob-verified). Atlas gap = P1 (§3); Mnemos acceptable (I/O role).
- Structural variance preserved: most personas generic "accept when counter-evidence stronger" (architect `:103`, developer `:99`, QA `:106`); founder/user/ux/shifu/writer/ml-ai-ops specify concrete bars.

### B2. Governance (8/8)
- `delegation-policy.md`: default-delegate + `[DIRECT-IO-JUSTIFIED]` (`:5,31-35`), task table 1–3 small files direct / 4+ files→`@reader` / >50 lines→`@writer` / any bash→`@executor` (`:10-19`), `state/delegation-log.json` (`:37`), worktree via `worktree.js` + `loop-state.json` (`:24-27`).
- `glossary.md`: locked terms; reasoning-agent split — denied-permission agents must delegate, dev/TL/QA keep full I/O as recommended pattern (`:12`); Decision 2-axis + Review gates + Verdict Card + legacy mapping (`:26-34`); citation `[^N]:` only format (`:42-45`).
- `phase-table.md`: -1..9 canonical rows (`:5-15`); conventions 2-digit folders, 0-indexed, Validation seeds `01-discovery/idea-brief.md` (`:18-21`).
- `spec-law.md`: 8 kernel rules (intent+success, non-goal, why-constraints, measurable success, stable CAP-IDs, no TODO, typed companions, self-sweep) (`:5-19`); CAP-IDs exempt from footnotes per DNA 5.
- `utter-satisfaction.md` (103 lines): SATISFIED/CHANGES/BLOCKED/NOT-ACTIVATED (`:46-49`); author loop + 2-cycle limit (`:61-72`); release gate in `release-readiness.md` + `go-nogo-decision.md` (`:76-83`); handoff 6 fields → `06-quality/sign-off-history.md` (`:93-103`). **02g/02h sign-offs ABSENT** (no strings in file) — corroborates falsification records.
- `citation-format.md`: 7 source types + worked examples (web/book/paper/code/interview/data/benchmark) (`:17-60`); secondary/multi/conflicting/unverified rules (`:64-82`).
- `developer-guidelines.md`: multi-dev worktree isolation + verify commands (`:11-23`); missing-file guardrail, no hallucination (`:31-34`); Steps 1–9 (spec digest, SRP+ADR refs, Happy/Unhappy/Edge, correlation-ID logs, TDD, lint+typecheck) (`:36-85`); conflicts → CR, never silent workaround (`:100-105`).
- `designer-guidelines.md`: 14-entry motion table, DaisyUI/Shadcn/Radix/Lucide, fluid `clamp()` type, 4.5:1/3:1 contrast, Haikei/mesh/glass, 5 a11y must-rules (`:13-92`).
- New contradictions (beyond §3 P1-14): (a) Known-1/2/3 VERIFIED with fresh lines — delegation default (`delegation-policy.md:5`) vs glossary recommended-pattern (`glossary.md:12`); any-bash→executor (`:17`) vs guidelines run-lint-directly (`developer-guidelines.md:66-68`) with neither citing `[DIRECT-IO-JUSTIFIED]`; phase-table bare GO (`phase-table.md:5`) vs illegal-bare-GO (`glossary.md:28,31`, `vespyr-dna.md:52-54`). (b) New-A: phase-table claims 03-strategy holds Phase 2+3 (`:20`) but splits them 03 vs 04 (`:8-9`); 05-planning/05-execution collide (`:10-11`) breaking unique folders (`:18`). (c) New-B: designer loaded "Phase 3 Strategy & Design" (`designer-guidelines.md:5`) but Phase 3 = Architecture (`phase-table.md:8-9`). (d) New-C: sign-offs → `06-quality/` (`utter-satisfaction.md:103`) which doesn't exist (Phase 6 = `06-launch`). (e) New-D: citation-format no-exemption (`:5`) vs DNA internal-artifact/CAP-ID exemption. (f) New-E: utter-satisfaction includes @shifu (`:20`) but contracts table omits it. (g) New-F: contracts give Zara binding a11y veto (`agent-contracts.md:9,17,34-35`) but designer-guidelines frames 5 must-rules as Ivy's (`:79,88-92`).

### B3. Motion + PM/founder + spec templates (10/10)
- Motion trio on-demand claim HOLDS: all declare lean-base loading (`motion-design-guidelines.md:3`, `motion-implementation-guidelines.md:3`, `motion-research-guide.md:3`); personas carry one-line loaders only — no token bloat. Content: 12 Disney→UI principles, transform/opacity-only, one-curve-per-zone, spring defaults, duration tokens ≤350ms repeatable, choreography, brand strategy, a11y gate (2.3.1/2.3.3), 15-field `MO-###` recipe → `03-strategy/motion-spec.md` (`motion-design-guidelines.md:11-195`); Rex decision tree, CSS-default, 40–60ms/60fps budgets, `src/motion/` arch, ≤200ms cross-fade, 15-item DoD (`motion-implementation-guidelines.md:15-135`); Iris market/tech vs Zara perception/cognition split, merged `02-research/motion-research.md` gate (`motion-research-guide.md:11-86`). Owner alignment holds (Ivy spec / Rex verbatim+flag-back / Iris tracks / Zara veto / Sarah chain); gap: Grant has no MO-### handoff rule (only generic gate `tech-lead.md:53`).
- Founder/PM: Golden Circle + Pre-mortem defaults (`founder-frameworks.md:3`); MoSCoW/RICE/Kano/Value-Effort + foundation-one-sprint-ahead (`pm-frameworks.md:13-125`); NSM one-per-area, 5 tests, 4 traps, GSM, Drivers Tree, vanity audit, Steps 0–3 → PRD §6 + Nova (`pm-metrics.md:9-431`); creation vs iteration B1–B7, FR tables, 10-box cross-validate, kanban seeding (`pm-workflows.md:7-152`); release chooser adds WSJF + Now/Next/Later absent from pm-frameworks (consistent RICE scales) (`release-planning-frameworks.md:10-166`).
- Spec templates: dual Markdown+HTML must match (`product-spec-instructions.md:9-11`) — BROKEN, no `.html` under `templates/product` (P2, new); WCAG 2.1 AA (`:61`) vs motion 2.2 SCs (drift, P2); story verbose block (`user-story-instructions.md:157-162`) vs DNA-7 1–3-sentence rule (`:115-119`) (P2).

## Appendix C — `scripts/` full-read detail (49/49)

Three end-to-end passes: orchestrator+tracker+session_start; memory core (filter/write/archive/dedupe/guard/session/lock/fs_atomic); all 31 remaining files verified + new defects.

### C1. Corrections to first pass
- Commands 11→12: `orchestrator_state.js` dispatches `init:766`, `status:793`, `next:807`, `complete:825`, `session-start:928`, `sync-context:976`, `session-write:988`, `file-cr:1062`, `advance:1100`, `compact:1179`, `set-phase:1184`, `validate:1261`; USAGE (`:748`) omits three.
- `resetRuntimeState`: no such symbol in scripts scope (bin `lib/state.js` claim unaffected — different file).
- Drift: live signal exists (`drift_monitor.js:120-127` exit 1 + aggregates); defect narrowed to excluded anchor + no telemetry emit.
- Dual-writer torn-write: FIXED — both writers atomic now; cross-process check-then-write race remains.

### C2. New P0s
- **P0-1 Checkpoint never persists.** `orchestrator_state.js:899` calls undefined `writeCheckpoint()`; surrounding try swallows `ReferenceError` — rolling cursor silently lost.
- **P0-2 `file-cr` unlocked + predictable IDs.** `file-cr:1093` mutates state outside `MUTATING_COMMANDS:1287` (`CR-003` from `length+1:1083`) — concurrent-open race on the highest-contention command.
- **P0-3 Dual session-start paths, neither satisfies `--check-memory`.** Orchestrator `session-start:928-974` (writes `last_session_start`, no `ensureSessionCurrent`/`autoOffer`) vs CLI `session_start.js:351-376` (autoOffer/sync/ensureSessionCurrent/regenerateLatest, no `last_session_start`); `--check-memory:906-913` checks `last_session_write`, which neither path writes. Plus `canonicalPhase:40-49` bypasses `resolveCurrentPhase:646`/YAML fallback — same concept, two baselines.
- **P0-4 Memory scrub holes.** Patterns narrow (no `sk-`/`sk-ant-`/`xox`/Stripe/unquoted `.env`/generic high-entropy; quoted-assignment only) (`memory_write.js:78-84`); `INJ-*` single-replace (no `/g`, first match only) (`:94-109`); `refs` interpolated raw (`:121`); archive write/search paths never scrub (`archive_manager.js:176-354`); `searchArchive` returns raw summaries (`memory_filter.js:548-557`); header-carried injections bypass admission (body-only scan `:401`); filter/writer sanitize order flipped (`:437-439` vs `:114-115`); quarantine log unlocked (`:334-339`); dedupe fail-open on crash (`memory_write.js:137-140`).
- **P0-5 Lock + fsync.** Steal TOCTOU (two waiters both observe stale, both proceed) (`lib/lock.js:96-122`); 60s max-hold can kill legitimate long compactions (`:31` vs `memory_write.js:259-260`); release mtime gate leaks on mtime-bumping filesystems (`:138`); no `fsync` file or dir — "crash-safe" loses acknowledged writes on power loss (`lib/fs_atomic.js:27-29`); fallback copy non-atomic (`:32-34`).
- **P0-6 Step-gate bypasses.** `--step abc` (`NaN>=1` false → early return, gate skipped) (`step_tracker.js:163-164`); `off`-mode `complete` dropped silently (`:386-387`, audit hole) + unknown commands exit 0 (`:386-387` before `:396-399`); cross-skill misattribution when `--skill` omitted (`cmdComplete:256-258`); compound-label mismatch (`2b` vs `2`) phantom drift (`readStepSequence:124` vs `cmdBegin:226-229`); `scope_lock`/`drift_warning` rows pollute audit as `"undefined"` (`cmdAudit:316`); arg parser consumes next flag as value (`parseArgs:203-212`).
- **P0-7 Telemetry shell injection.** `recordTelemetry:391-396` interpolates agent/phase/data into `execSync` string with single-quote wrap only — `'` breaks out; never-throws design (`:399-401`) makes it silent.
- **P0-8 Token triple divergence.** `countTokens:42-44` + `estimateTokensFromFile:378` (`words/0.75` ≈1.33/word) vs `recordSpanForAgent:425` (`len/4`); `durationMs=null` default (`complete:829`) forces `estimated:true` even with exact tokens (`:412,428`); floor-8 floor (`:426`).

### C3. New P1s (selection; full list in §C5 trace)
- Orchestrator: `update` in lock set, no handler (silent exit 0); dispatch `if`-chain no `else`/unknown-command error (typos look like success); `i+=2` flag parsing everywhere (`--flag` consumes next flag; `parseInt||null` kills legit `0`); `readState` side-effect creates files inside read (`:247-261`); `use-before-declare` YAML_STATE (`:177` vs `:280`); lossy `project_key` round-trip (`:290` vs `:176-228`); unguarded `change_requests`/`blockers` deref (`:676,686`); `advance:1100` skips artifact validation that `determineNextAction:698` enforces; `set-phase` arbitrary jumps; `createInitialState:488-494` dead loop; "transactional" half-true (archive append + md rewrite precede JSON commit `:103-148` vs claim `:1138-1140`); archive retry duplicates (no id check `:114,126`); `**status:** complete` prose conflation (`:84`); budget 400 triple-hardcoded (`:159,1153,1240`).
- Session_start: ~50 lines dead (`syncDetectedFields:180`, `insertCoreField:202`, `syncCore:222` disabled at `:305-309`); machine-state splice regexes truncate early (`:163,170,243,249`, 5-marker history loss, footer replaces quoted lines); stale engine default `2.0.10` (`:96,151`); `detectStack:107-108` script-name Next.js check; missing-file throw vs orchestrator auto-create (`:287` vs `:257,779`); CLI loop never advances `i` (`:354-358`); RMW unlocked for direct CLI (most common entry).
- Memory: effective dedupe threshold 0.70 CLI not 0.85 fn (writer passes none; `possible_duplicate` silently admitted); `expandSynonyms` dead (`dedupe_validator.js:88-99` never called); header regex needs trailing `[` (deviant entries invisible); synonym/stopword tables diverge filter↔dedupe; guard token column never compared (`compaction_guard.js:60-64`), `--file` defaults 1000/1500 contradict table (`:107-108` vs `:18-26`), writer uses loose ones; session-id reuse merges windows (`lib/session.js:52-53`); concurrent `ensureSessionCurrent` stale-id race; `latest.md` drops provenance; history regex exact-shape or silent no-op.
- Remaining files: spec_check blank-line evasion (`:60` vs `:243`), dead `allowed-tools` exemption (`:181-185`), weak self-test (`:318-320`), array-name miss (`:204-209`); profiler `--phase execution` never filters (`:278-279` vs `:11`), 10× doc/code mismatch (`:264,269`), `:`-split corrupts values (`:41-42`); worktree stale-link accept (`:70`), file-not-dir throw (`:91`), epoch `NaN` (`:152-154`), minute-collision names (`:189-196`); TOML `,`-split + quote/array bugs (`merge_customization.js:96,29-32,162-168,200`); migration drops first content line for `(preamble)` sections (`migrate_memory_v2.js:93`) despite zero-loss header, dry-run stale tokens (`:223-225`); frontmatter substring matching (`myicon:`→`icon:`) (`:42`), hyphen-key miss (`:114`), step gate masked on unhealthy repos (`:238-242`); suite double-count Windows skip (`:111-113` + `:29-32`), fault-flag asserts without stderr contract, no timeout; roundtable_eval unchecked `--file`, indented-fence miss (`:53`), first-synthesis-only (`:107`), insertion-order ties (`:122-124`), `_native` topic misparse (`:132`), unvalidated synthesis values; witness `####` level bug (`:52,63`), schemaless archive pass (`:142-143`); delegation fallback half-dead by witness's own `latest.md` rule (`delegation_audit.js:135` vs `witness.js:100-103`), corrupt-log exit 0 (`:207-209`); match_methods flag ingestion (`:135`), short-row drop (`:36`), `--top 0`→5 (`:147`); corpus mapping hardcoded (`check_corpus_invariants.js:58-65`), clean-file inflation (`:64`); findings hash whitespace-fragile + same-path change invisible (`check_new_findings.js:52-54,86-87`); reservation substring false-pass + unchecked reverse (`check_plan_reservation.js:33`); ledger-missing fail-open (`collision_detector.js:37-39`); local-vs-UTC midnight split-brain (`:76` vs `hot_path_analyzer.js:27`); unseeded simulator + mid-run abort half-writes (`pipeline_simulator.js:89-91,18`); analyzer unchecked deref + silent skips (`hot_path_analyzer.js:60-64,34`); compiler quote-strip mismatch (`:29,57`), fenced-output strip (`:73`), `@memory-controller` ignored (`:82`) while audit rewards it; matrix regex over/under-capture (`validate_matrix.js:84,49`); sync-entrypoints sample rewrite + `.kiro/scripts/` phantom + symlink destroy (`:44,17,64-66`); resolver dup dir + `temperature: 0` clobber (`resolve_agents.js:36-37,69`); add-* `OK` on anchor no-op + socratic order dependence + Elena/Rex-only mentors + `## Process`-in-fence replace.

### C4. Prior defects re-verified
Delegation contradiction, checkpoint stub, merge-defaults dead, sink mixing (+collision `memory_collision` same sink), strict no-op, bootstrap shadow, profiler ternary, worktree remove (+`branch -D` after failed remove), icon grapheme, compiler lint — all CONFIRMED. Drift narrowed, dual-writer torn-write fixed (see C1).

## Appendix D — `skills/` full-read detail (152/152)

13,051 lines across 152 files. Three passes: gated six + bodies/steps; execution/QA/ops/meta 13; research/authoring/modifier 23 + catalog + CSVs.

### D1. CORRECTION — D4 reversed
First pass read SKILL.md first-60-lines only and reported DNA4 "0/42". Full step-00 reads reverse it: all six step-00 files carry the identical non-skippable gate + three-field inspection + Decision Fork + lock sequence (`scope-lock --skill <name> --track` → `begin/complete --step 0` → `[SCOPE_LOCKED:]`) + byte-identical enforcement sentence (`step_tracker.js exits 1 … [ERROR] Step 0 Scope Gate bypassed`) at `design:8-33`, `develop:8-33`, `plan:8-33`, `validate-idea:8-33` (track enum `<create|edit|validate>`), `explore-idea:8-33`, `unpack-problem:8-33`, with skill-specific fork examples (create/edit/validate; MVP/epic/spike; build-plan/slice/spike; 7-branch/edit/validate; market/competitive/user-depth; guided/automated/combination) at each `:19-21`. SKILL.md mirrors (`design:40`, `develop:40`, `plan:89`, `validate-idea:24`, `explore-idea:41`, `unpack-problem:44`); only two intent-gate outliers repeat Level-3 `/grill-me` escalation (`design:32`, `develop/step-01:3`). Amended verdict: DNA4 triage PRESENT in 6/6 gated skills via step-00; absent from SKILL.md bodies and from all 36 other skills by design. D7 (`step_tracking: off` vs exits-1) stands — no skill states off-mode still enforces.
- New P1: tracker namespace split — scope-lock uses bare `--skill design` / `validate-idea` (step-00 `:27`) but steps report suffixed `--skill design-create/edit/validate` (`step-01a:27`, `:18`, `:15`) — enforcement keyed on bare name never sees suffixed begins.

### D2. Delegation/DoD/cross-refs (gated six)
Explore-idea owns the tiered-dispatch contract (2a+2b parallel, 2c after 2b, firewalled fallback + degraded label `explore-idea/SKILL.md:43-49`, per-step scoping `step-02a:15`, `:02b:15`, `:02c:15` must-not-see-2a). Unpack delegates via sub-skill table + dispatch ladder + `roundtable_eval.js log` (`step-02:20-25,45-50`). Develop carries memory-only `## Delegation` in all 11 steps 01–10 + reasoning delegation in body text (architect/tech-lead/dev-loop/QA-sec-perf). DoDs: design PRD/story/edit-cap-3/validate-2-cycles/handoff gates; develop global+step halts (2 CR, unreproducible test, Crit/High, 2 review loops), QA auto-run, PM 2-rejection routing, 10-completion all-green; explore MARKET-VERDICT + `[GO|RESHAPE|NO-GO]` refine≠verdict + 1 pivot; unpack per-concept verdicts → brief `[GATE:]`, gateless brief "a document, not a decision", `[HANDOFF:]` marker. Cross-refs: design 15/15, develop 12/12, unpack 5/5 exact; validate ranges resolve to 18 files, no phantoms; plan asymmetric by design (single step-00 file, Steps 1–5 inline `:91-113`). `role-tags.json` exactly FE/BE/Full-Stack with `clarify_with`+`guardrails`; `develop-state.md` 18-line scaffold (Format A vs B). `test-unpack-problem.mjs` 241-line router/content/template/wiring harness, exits 0/1.
- New P2s: quality-gates numbering dup + out-of-order (`7a`×2, `7c` before `7b`, second `7c` at `step-07:15,35,54,63,88`); A11y writes `06-quality/` vs QA/sec/perf `05-execution/quality/` (`:59` vs `:27,72,97` — extends quality-root split); unpack header "4 step files"/"6 sub-skills" vs 5 steps on disk + 5-row table (doc drift); BE clarify adds `@architect` in dev-loop vs json human+PM only (`step-06:29` vs `role-tags.json:16`).

### D3. Execution/QA/ops/meta (13 skills)
test 5/5 steps MATCH (+ orphan `test-qa-enrichment.mjs` unreferenced, P2); review file-less by design (4 inline steps, 15-item guard); launch phantom `step-06-launch-log.md` link vs disk `step-05` + self-contradiction `:49` (P1 — fix `:39`→step-05); incident 6 inline steps, SEV1–4 + SLA table (`:19-23,152-159`), per-type delegation matrix; iterate 7 step files shadow/orphan (SKILL `:24-128` never links `steps/*.md`, P1 — link or delete); retro 5/5 MATCH (S1 hot-paths → S5 compact, witness gate, <7d protect, >90d archive, never deletes); status-plane overlap documented (status ⊃ sprint-status render; kanban vs sprint-status unsynced sources; phase vs status same store) — keep status default, others scoped aliases (triage note missing in all four); grill-me 8 moves + disposition ledger (`EXAMINED (n)`/`SKIPPED — reason`, no third state) + cross-move consistency + lock/handoff, strongest anti-convergence after round-table; elicitation 98-method claim FALSIFIED as stated (no "98" string; CSV 99 data rows, 17 categories; 4 triggers exist) — catalog asymmetry invites future drift; root-cause complete, no steps.
- New P1: `status:51` 4-phase enum vs `phase:59-60` 12-phase vocabulary (+ narrow artifact registry); `phase:42-52` `05-planning/`+`05-execution/` inference paths collide (extends New-A).

### D4. Game forks / counts / wiring (23 skills + catalog)
D5 CONFIRMED + widened: game fork drops Paths C/D (base `:27-37` vs fork A/B only `:15-25`), Step-0, delegation tiers ("can run in parallel" `:61` vs base `:43-49`), SPC gate (`:149`), parseable verdicts (prose pivot/refine/proceed `:142-144` vs `VERDICT: [GO|RESHAPE|NO-GO]` `:151`), context update + shape-up handoff (`:169-185` vs `:159-170` straight-to-design); validate-game-idea 287-line monolith (Q1–Q7 `:86-152`) vs 73-line router + steps + SPC (`:41-42`) + memory (`:48-68`). Three dangling refs (P1): `product-exploration` (`validate-game-idea:12,221`), `game-idea-validation` (`:241`); unverified template refs both forks.
- Counts (executed): brainstorming 60/60 PASS, validation-patterns 30/30 PASS, elicitation silent-99 (no defect, drift risk); help-me catalog 42/42 PASS, schema uniform, content noisy (game prereqs markdown fragments `:180-186`, design outputs stale `:115-120` — recompile needed).
- Elicitation orphan: zero inbound invocations across 23 skills; brainstorming `:28-35` clones elicitation `:52-59` Step-0 by copy (drift risk — extract or accept).
- create-agent wiring PASS (3 scripts + 3 scoped out `:147-152`, frontmatter enforced `:90-131`) except omission: `add-step-tracker-calls.js` on disk, mentioned nowhere (P2).
- humanize: MIT attribution exemplary (`:4,8,11-13`); `allowed-tools` drops Bash (`:5`) — zero state-machine/memory integration, rewrites untracked (stateless-intentional or oversight — undocumented).
- shut-up 34 lines VERIFIED minimal; catalog prereqs empty (acceptable for modifier).
- round-table reference implementation, NO defect (4-phase + coverage block + solo disclosure + multi-turn continuity).
- memory thresholds byte-match controller; read-rule CONFLICT: `memory:24` "never read directly" vs `help-me:63,69-72` direct-read instructions (P1 — scope-qualify).
- craft-lesson Phase 4 strongest gate (GENERATE→PRESENT→PAUSE→VERIFY, one-format-at-a-time, fixed order, canned approval, per-approval `complete`) with one self-contradiction `:265` ("Do NOT perform direct file writes… Always write files directly" — P1, second sentence operative per matrix `:247-256`).

## Appendix E — `templates/` full-read detail (57/57)

6,787 lines. Per-dir contracts (Save-to paths, IDs, handoffs verified):

| Dir | Key contract |
|---|---|
| architecture/2 | ADR §§1-7 + forces/decision/consequences/validation/amendment → `04-architecture/adr-NNN-*`, IDs `ADR-NNN/US-XXX/PRD §X.Y`; model card 5 sections but NO `Save to`, owner, or IDs |
| discovery/8 | Founder memo (pitch/Golden Circle/min-3 tools + NO-GO/RESHAPE flags/NOT-for/≥2 alternatives/A1..An) → `01-discovery/idea-brief.md`; validation brief (quote-block/demand/wedge/premises/alternatives/verdict+next+open→researcher); problem-brief `[GATE: GO\|RESHAPE\|NO-GO]`; research-plan/jtbd/discovery-report light canvases |
| incident/3 | Triage (SEV1-4 + SLA/cadence/team/timeline/comms) → `08-incidents/INC-NNN/triage.md`; RCA (5-Whys/factors/gaps/prevention+owner); post-review (blameless/7-questions/AI-NN actions) |
| launch/5 | Readiness §§1-8 + §6.1 19-agent SATISFIED matrix + §8 GO/NO-GO/CONDITIONAL; go-nogo 7-gate + §1.2 gate + risks/rollback/rollout; launch-log/release-notes (US-XXX, breaking rule)/post-launch (PRD §3.3 + INC-NNN) → `06-launch/` |
| memory/8 | Entry `### [DOMAIN]` + 17 tags byte-identical to controller (`AUTH/API/DATA/ARCH/INFRA/SECURITY/PERF/PRODUCT/PROCESS/CODE/TEST/ML/UX/MARKET/RISK/LESSON/DECISION`) + specials; project-context `[CORE]` machine header + `[SESSION ACTIVITY]` + §§1-8; session-summary `latest.md` overwrite (<600w, `## Last Session`) vs `history.md` append |
| planning/5 | Execution plan §1 scope/timeline/parallel/agents + §2 `T-001` blocks (US-XXX, S/M/L, Delegation, DoD, NEW/MODIFY, AC-U*/AC-E*/M-XX); kanban 6 columns + metrics + protocol; iteration RICE/IB-001/A-B; motion-handoff MO-###→US→task ±16ms + WCAG 2.3.3 |
| product/10 | PRD v4 DNA-7 §§1-13 (§2 sign-off, §4 falsifiable hypotheses, §7.3 FR-XXX, §11 L×I risks + pre-mortem, §13 ML/a11y); SPEC 5-field kernel (Why/CAP intent+success/Constraints `0.`/Non-goals/Success); story v3 Epic→Feature→Story + `US-XXX` + dual traces + AC-H/U/E/ML + Mermaid; product-spec flows + States + Motion col + edge col; design.md v3 taste/rubric/anti-generic/tokens; motion-spec MO-### + reduced-motion; 4 companions |
| quality/2 | Measurement plan (NSM/guardrail/ML, event taxonomy, experiments, dictionary, GDPR, monitoring) → `03-strategy/measurement-plan.md`; analytics-insights (targets vs actual, funnel, segments, errors) → `07-iteration/` |
| research/7 | Summary + sourced TAM/SAM/SOM + trends + assumption table vs idea-brief + GO/NO-GO or READY; UX adds C/S/M/m + ≥80% task benchmark + WCAG matrix + state checklist → `02-research/` |
| system/4 | `AGENTS.md.canonical` + `agent.md.canonical` entry sources; steering 53L Kiro boot; `opencode.json.template` skill allowlist + controller subagent, deny bash/edit |
| root/3 | spec-kernel pointer + inline copy; spec-law pointer (no drift, 8 rules canonical); step-file-template (flat `output_contract.citations`, `step: N`, `1a/1b/1c` suffix prose) |

Defects:
- **P0-equivalent [NO-GO] product-spec template vs instructions.** Instructions mandate dual output incl. `product-spec-template.html` with exact match — file absent (only 6 `.md` + companions). Instructions §4.2 (7 states + wireframe + inventory + token scales + §1.5 traceability) vs template 5-row States table + none of the machinery. Template-only `Motion` col + `CAP-{N}` refs unmentioned by instructions. Largest template drift in repo.
- **P1**: memory five templates mandate `DECISION-NNN/BLOCKER-NNN/…` formats irreconcilable with enforced `### [DOMAIN]` contract (no mapping); `project-context-template.md` has NO `## [IDENTITY]`/Nickname section while `AGENTS.md.canonical:187` + steering mandate reading it every boot — identity load fails by construction; incident SKILL Step 2 outputs `mitigation.md` (`:46`) but NO mitigation template exists; model-card paths diverge three ways (Kai `artifacts/output/architecture/…` missing `04-` prefix `:256`, Atlas contract+`ml-ai-ops/` deploy `:70`, template no `Save to`); `go-nogo-decision-template.md:10` duplicated PM participant; step-file-template STALE — all 95 real steps use nested `output_contract:` + `step: 1a` + `mode:`, template shows flat form without `mode:` (fix template to fleet, not vice versa).
- **P2**: kanban checkbox semantics mix (`[ ]` vs `[-]/[x]`); `user-story-template.md:8` wrong relative link (`../references/…` → `templates/references/…`, real is `../../references/…`); Feature example drops `FR-XXX` zero-pad (`FR2, FR50, FR51`); `spec-kernel-template.md` numbers `Constraints 1.` vs `SPEC.md` `Constraints 0.`; path mismatches (UX report `02-research/` root vs PRD §2 `02-research/ux/`; bare `requirements.md/user-stories.md/design.md` refs vs `artifacts/output/03-strategy/…`; personas template `02-research/user-personas.md` vs Paige `02-research/user-research/`). Traceability IDs themselves (FR-XXX/US-XXX/CAP-N/T-001/IB-001/ADR-NNN/INC-NNN/MO-###) consistent end-to-end. Launch/kanban/plan/system/spec-law cross-checks CONFIRMED.

## Wave 1 — Proposal-gated staging (2026-09-07, @developer)

Track: proposal-gated per owner selection (AD-2026-08-19 W⊕X KILL: no direct edits to `agents/*.md`, `skills/*/SKILL.md`, `GUARDRAILS.md`). Bundle: `artifacts/output/proposals/01-agents-wave1/` (README + P0-scripts.patch.md + P0-manifest-root.patch.md + KILL-scoped-proposals.md + verification-log.md). Zero `.agents/` files modified.

Re-verification (4 parallel subagents + live commands): ~90% CONFIRMED with corrections — disk 328→331 (drift +3); `@ml-ai-engineer` SKILL.md-only 1→2 (body-inclusive higher); P0-4 header-bypass FALSIFIED; P1-13b Atlas footer FALSIFIED (present `:121-123`); P1-15b Kai 0/10→~3/10; game-verdict absence FALSIFIED (`validate-game-idea:220-226` present). Live evidence: `file_count 324` vs disk 331, `has_signature False`, `phantom_bin True`; `writeCheckpoint:899` sole call site, no definition; `MUTATING_COMMANDS` omits `file-cr`; `node --check` OK ×3.

SATISFIED status: @developer SATISFIED on staging + evidence only. All other agents NOT-ACTIVATED (require round-table re-run after human promotion). Release gate NOT green — promotion + `test_security_suite` + `bin/cli.js verify` + manifest regen required before Phase 2 entry.

## Wave 2 — Verdict-terminology sweep + review maintenance (2026-09-07, @developer)

Owner-authorized direct edits (human-gated): 5 files, git-verified (`GUARDRAILS.md`, `references/glossary.md`, `references/utter-satisfaction.md`, `references/vespyr-dna.md`, `workflow.md`). Disk still 331 files — modifications only, no adds/deletes.

New defect class found during Wave 1 (outside original scope) — verdict-application defects, all FIXED on disk:
- **V-1 Forced verdicts.** Questions/status forced into GO/RESHAPE/NO-GO → glossary "When NOT to emit a verdict" + "One object, one verdict" (`glossary.md:34,41`).
- **V-2 Autopsy exclusivity deleted surviving work.** Old rule: autopsy "only permitted output" → amended glossary (`:33`) + DNA 1:70: kill the proposal, keep owned follow-ups (no tokens) in `Open before SATISFIED`.
- **V-3 `CONDITIONAL GO` undefined** → glossary (`:36`): not a gate token, = `[GO] When:GATED`, never shippable as written.
- **V-4 Bare-GO vs illegal-bare-GO** (extends Appendix B Known-1/2/3) → shorthand rule (`:37`): bare forms in prose/tables; brackets in Cards; `When:` on `[GO]` only (`[RESHAPE]`→`NOW`, `[NO-GO]`→`NEVER` implied, never restated).
- **V-5 Blocking adjective vs `BLOCKED`** → locked across all 4 files + utter-satisfaction behaviors 5-6 uppercased.
- **V-6 Satisfaction states missing from glossary** → added with plain meanings, owner `utter-satisfaction.md`.
- **V-7 Voice** → DNA 7 §5 plain human words (DNA 8 created then folded back per owner; DNA count stays 7; blunt spine unchanged, warmth explicitly rejected).
- Self-found, self-struck: duplicate "One object" bullet removed; own `[NO-GO] When:NEVER` demo struck per DNA 1:56.

Manifest impact: 5 tracked files modified post-`generated_at 2026-09-05` — hashes stale on top of Wave 1 drift (`file_count` 324 vs disk 331). Regen with Wave 1 promotion; never hand-edit.

Line-shift note: §3/Appendix refs for glossary (`:12`, `:26-34`), utter-satisfaction (`:46-49`, `:103`), vespyr-dna (`:52-54`) predate this sweep — resolve via anchors `glossary.md:33-41`, DNA 7 §5.

Status delta vs §5 fix order: STAGED (awaiting promotion) — P0-1 manifest, P0 scripts P0-1..P0-8, P1-1, P1-10/11/12. FIXED — V-1..V-7. OPEN — P1-15 (K-1), P1-2/5/6 (K-2), P1-3 (K-3), P1-4 (K-4), P1-13 (K-5), Appendix A per-agent + systemic direct-read, P1-14, Appendix B New-A..F, Appendix D/E templates, P2 batch. Release gate NOT green.

## Wave 3 — K-1/K-2 concretized (2026-09-07, @developer)

Re-verification shrank the work — two review claims are already dead on disk:
- **K-1(a) DONE:** `summon_when` self-work clause committed in `9f6f0e0`, in HEAD (`ml-ai-engineer.md:33`).
- **K-1(b) DONE, stronger than asked:** executable router replaces the requested SKILL prose — `references/roster-router.json` (2026-09-07) seats Kai mandatory on `eval`/`prompt`/`serving` tags; `resolve_agents.js:43-151` enforces with `ROSTER:` audit line, no host discretion.
- **K-1(e) DONE:** 2026-09-05 Kai seat recorded.
- Staged in `K-1-kai.patch.md`: (c) `test/SKILL.md` consult line (anchor-verified) + trigger enrichment for `grill-me`/`elicitation`/`retro` (no delegation sections exist — Layer-1 frontmatter routing instead); (d) append-only summon ledger in `recordEvent` (no RMW race; `generateSummary` section flagged).
- Staged in `K-2-delegation.patch.md`: keep-fail-close decision (fork recorded, re-legalize rejected with rationale); policy table scrub (anchors `:5`,`:12-19`); audit handle list → `['@memory-controller']` (fallback-regex rewrite flagged); 7-file quarantine list (6 `add-*` + `migrate_memory_v2`).
- Still OPEN: K-3 (intent surface), K-4 (game forks), K-5 (validator + `socratic/ml-ai-ops.md`), Appendix A/B/D/E residuals, P2 batch. Release gate NOT green.

## Wave 5 — K-5 validator + Atlas socratic + TOML caveat (2026-09-07, @developer)

Applied: `validate_frontmatter.js` REASONING_AGENTS 14→19, CITATION_AGENTS 18→19 (both +`ml-ai-ops` plus the 4 omitted others in reasoning); new `references/socratic/ml-ai-ops.md` (Atlas voice: shadow-mode, card-as-contract, drift/rollback probes); TROUBLESHOOTING prevention caveat (TOML overrides inert per `custom/README.md` known gap).
Correction: review claimed Atlas lacks `## Socratic Stance` — inline stance exists (`ml-ai-ops.md:106-114`); the gap was only the standalone file. Live validator output: socratic warn gone, citation warn correctly firing (persona section held, KILL scope), exit 0.
Still OPEN: K-3, K-4, Atlas persona citation section, Appendix A/B/D/E residuals. Release gate NOT green.

## Wave 4 — Promotion: 20 files applied + verified (2026-09-07, @developer)

Owner complaint ("nothing applied, only staged") taken as promotion authorization for all non-forked items. Applied to disk: `orchestrator_state.js` (file-cr lock, checkpoint removal, execFile telemetry, finite token parse, countTokens unification), `step_tracker.js` (invalid-step exit 1, flag-eats-flag parser, --skill required, unknown-cmd exit 1 in all modes, audit label filter), `memory_write.js` (7 new secret patterns, global INJ replace, refs scrub, possible_duplicate warning), `session_checkpoint.js` (retired header), `lib/lock.js` (atomic rename steal), `lib/fs_atomic.js` (fsync file+dir), `swarm_telemetry.js` (append-only summon ledger), P2 batch (collision strict→exit 2, bootstrap import, profiler model mapping, worktree --path, Segmenter icon), docs (`config.yaml` src roots, TROUBLESHOOTING 3-rung ladder, `skills.md` 42, workflow worktree paths).

HELD (need Chris): K-1(c) SKILL.md edits (KILL scope), all of K-2 (keep-vs-relegalize fork), P0-3 dual session-start (needs design — import cycle risk), quarantine moves (destructive), NEW-FINDINGS baseline extension (human-gated by design).

Deviations from staged patches (judgment, recorded): fsync fallback kept operational with loud warning instead of hard refuse (refuse would break Windows EPERM flows); dedupe docstring example left (0.85 is valid flag input).

Review corrections found while applying (claims now FALSIFIED or narrowed): **P0-1 entirely stale** — `state/` excluded by generator design (ADR-006), manifest self-excluded, `files_root.bin/cli.js` hash matches repo-root CLI live (`1ff8f0f7…`, N-14 design — not a phantom), only no-signature leg stands (deferred to 03h). Collision exits were 1-always (not 0-always). `memory_write` already handled `status:'duplicate'` — remaining gap was only silent `possible_duplicate`. Worktree `remove()` already had custom-path fallback — CLI just never passed `--path`. Profiler doc-line refs stale.

Self-struck error: I emptied the valid `files_root` anchor on the review's phantom claim without hashing first — caught by my own verify step, reverted (`git checkout`), then regenerated properly.

Verification: `node --check` 12/12 OK; step-gate invalid/unknown both exit 1 live; summon ledger probe wrote + cleaned in sandbox; security suite 13/14 (1 failure = pre-existing docs-vs-frozen-baseline NEW-FINDINGS, human-gated, untouched files); `bin/cli.js manifest` regen → 327 files; `bin/cli.js verify` → 328/328 green.

## Wave 6 — Autonomous close-out: P0-3/P1-14/B-residuals applied, panel unanimous (2026-09-07, @developer)

Applied: orchestrator `session-start` rebuilds latest cursor (P0-3 code leg; `--check-memory` leg ruled BY-DESIGN enforcement, canonicalPhase dead-path noted); `agent-contracts.md` +`@shifu`/`@memory-controller` rows; glossary permission claim corrected (frontmatter is authority); phase-table gate convention; designer Phase number; citation-format exemption; K-3/K-4/Atlas-citation exact staged patches (KILL scope untouched); Victor R1/R2 (agent/status allowlist fail-closed + locked quarantine RMW with non-breaking fallback, live exit-1 probes).
Panel (positions independently verified): Vera SATISFIED, Grant SATISFIED, Nina SATISFIED (missing negative control supplied — legal begin exits 0, legit write succeeds, sandboxed), Victor SATISFIED on re-review.
Manifest regen 328 files, verify 329/329 green. Suite 13/14 (pre-existing baseline failure only).
Honest gate: panel SATISFIED on applied scope. Full UTTERLY SATISFIED still BLOCKED — owner Chris: K-1(c) skill edits, K-2 fork, K-3/K-4 promotion, quarantine, baseline extension. No other blockers.

## Wave 7 — Owner decisions applied 1-6 (2026-09-07, @developer)

1. APPROVED K-1(c): `test` consult line + trigger phrases in `grill-me`/`elicitation`/`retro` descriptions. Applied.
2. K-2 keep-ban: policy table scrubbed to harness-native/direct language, audit list → `['@memory-controller']`. Applied. (Fallback-regex rewrite still flagged.)
3. APPROVED K-3: triage sentence in all 6 gated SKILL.md bodies. Applied.
4. REJECTED backfill: deleted `explore-game-idea/`, `validate-game-idea/`, 5 game templates (`git rm`, history kept); refs scrubbed in workflow/skills.md/phase-SKILL/catalog (42→40, formatting preserved); Phase 8 research plan created at `artifacts/docs/strategy/development-plan/10-phase-8-game-development-track.md` (entry gate: Phase 7 PKM). Residual generic words (player/genre/Game Studio context) are prose, not skill refs — left.
5. APPROVED Atlas citation: block inserted in `ml-ai-ops.md`; citation warn clear.
6. APPROVED ops trio: 7 spent codemods `git mv` to `artifacts/archive/spent-codemods/` (history kept; only known ref is a descriptive line at `create-agent/SKILL.md:152` — flagged follow-up); baseline v4 (133 findings, 7 doc-prose FPs triaged benign line-by-line, gate PASS); P0-3 remainder closed as document-and-leave (CLI/orchestrator split accepted, dead canonicalPhase untouched — unification risks an import cycle for zero live benefit).

Verification: frontmatter 20/20 + 95/95 steps; manifest regen 314 files, verify 315/315; suite 14/14 (baseline v4 closed the gap). Open before SATISFIED: round-table re-review of Waves 4-7 promotion.

## Wave 8 — Round-table re-review + Phase 2 demands applied (2026-09-07, @round-table + @developer)

ROSTER (router-validated, native, logged): @architect, @security-engineer, @code-reviewer, @data-analyst. Coverage 4/4 validated pre-Phase-3.
Phase 1: Vera PARTIAL / Victor CONFIRMED / Scout CONFIRMED / Nova PARTIAL — every claim re-verified on disk by host before debate.
Phase 2 narrowed scope (rejected overclaim): fix 7 invocation/eval files (ui.js, agent/AGENTS/CLAUDE, QUICK-REF, opencode.json, 2 fixtures, runner arms) — leave history, generated baselines, verb-matches; probe rows stay (append-only) with exclusion built into readers instead; baseline triage conceded sound (directed-actionability test); catalog recompiled via compiler (40 skills, delegation lint clean, agent arrays derived).
Applied + sandbox-proven: isSynthetic filter in hot_path_analyzer + swarm report, simulator synthetic:true tagging (report shows real agents only), workflow worktree protocol fully corrected (incl. nonexistent clean-all), stale token comment fixed.
Verification: manifest regen, verify green; suite 14/14; frontmatter 20/20 + 95/95.
[SYNTHESIS: GO] — Waves 4-8 promotion accepted. Remaining owner-gated: K-1(c)/K-3/Atlas citation promotion review (applied under approval, panel-narrowed items closed), K-2 fork (decided keep-ban, applied), plan:85 + create-agent:152 one-liners (KILL follow-ups), swarm estimator unification (recorded, out of review scope).

## Wave 9 — Canonical + scaffold sources scrubbed (2026-09-07, @developer)

Owner: update agent canonical + related docs for game deletion. Applied: `agent.md.canonical` + `AGENTS.md.canonical` (2 bullets each — these feed sync-entry-points, so future syncs cannot reintroduce refs), `opencode.json.template` allowlist (2 lines — next `init` stays clean). Verified consistent with already-fixed root files. Manifest regen, verify green.
Left deliberately: strategy/dev-plan docs (dated history — never rewritten), `mock-baseline.json` (generated — regen policy), workflow removal note (intentional), Phase 8 game plan (the replacement home).

## Wave 10 — Domain-owner panel + 19-agent improvements (2026-09-07, @round-table + @developer)

Panel 2 ROSTER (owner override — router has no verdict-governance tags): Kai, Grant, Elena. All three returned PARTIAL with actionable findings; all answered: summons counts in summary (live-proven), 80% misattribution corrected, policy anti-patterns scrubbed, owner-card timebox added. Autopsy + tiebreak judged sound (Elena, steelmanned).
19-agent improvements applied: direct-read contradiction resolved in 16/16 personas (Kai/Nina wording); dual veto tiebreak (founder sole override, both files); model-card single path; Sarah/Kai lane precedence; Zara summon banner; plan + create-agent one-liners.
Verification: manifest regen, verify green; suite 14/14; frontmatter valid.
[SYNTHESIS: GO] — Review 01 fully closed to two panels (7/7 seats SATISFIED across both). Residual file: swarm estimator unification (out of scope), mock-baseline regen (generated).

## Wave 11 — Quarantine reversed: guards instead of archive (2026-09-07, @developer)

Owner catch: `artifacts/` ships outside npx, so the archive broke create-agent's live dependency on 5 codemods (verified references, not assumed). All 7 moved back via `git mv` (history intact either way); archive dir removed.
Hazard now neutralized in place: `add-delegation-contract.js` + `migrate_memory_v2.js` refuse with exit 2 and reason (live-proven, zero agent files touched). create-agent doc restored + refusal noted. Lesson: quarantine location must respect the distribution boundary — npx payload vs repo-only.

## Wave 12 — Harmful codemods deleted, verdicts recorded (2026-09-09, @developer)

Owner decisions: `add-delegation-contract.js` deleted (banned-mapping source, only referrer was a doc line — updated); `migrate_memory_v2.js` deleted (zero callers, legacy dirs gone, lossy + ungated purge). Both recoverable via git history. Remaining 5 injectors verified harmless (read-only missing-section writes, skip-if-present, no deletes): identity, citation, pipeline, socratic (create-agent live deps), step-tracker-calls (unreferenced, inert). create-agent doc now names only live scripts.
