# Prototype-First Design Fork — Reverse-PRD Workflow, Grounded Synthesis & Parity Gates (02n)

bump version

**Decision:** Vespyr adds a **reverse mode** to `/design`: prototype-first, PRD-later. The PRD is never one-shot "generated from" the prototype — it is **synthesized through the same interactive loop the traditional flow uses**, from an **Evidence Ledger** where every behavioral statement traces to a prototype anchor, and both artifacts are held to a bidirectional **Parity Gate** with a hash-witnessed **Sync Contract**. The mirror defect (PRD-first, prototype/implementation lags) is covered by the same machinery inverted: a **Spec Coverage Contract** at the develop/QA boundary. Standing rule: **whichever artifact comes second must be earned through the same loop as the first — never derived in one pass.**

**Problem (owner, 2026-09-09) — the Asymmetry Law:** in any spec↔prototype chain, the artifact authored first (human-iterated) is rich; the artifact produced second is detail-poor, too high-level, sometimes hallucinated. Observed in BOTH directions:

| Direction | First artifact (strong) | Second artifact (weak) | Owner-observed defects |
|---|---|---|---|
| Traditional (PRD → prototype) | PRD | prototype / implementation | small details missing; implementation can't keep up with PRD quality |
| Reverse (prototype → PRD) | prototype | PRD | (1) details missing vs PRD-first output (2) prototype evolves, PRD never updated (drift) (3) too high-level, hallucinated, unusable |

**Root cause — 3 mechanisms → 3 countermeasures (this plan):**

| # | Mechanism | Countermeasure |
|---|---|---|
| M1 | First artifact earned its detail through many human iterations; the second is produced in ONE pass — detail loss is structural, not a prompt problem | **Looped derivation:** reverse mode re-runs create-mode steps (personas → stories → screen states → tokens) with the prototype inventory as fixed input |
| M2 | Ungrounded generation smooths gaps ("high-level mush") and invents plausible specifics (hallucination) | **Grounded synthesis — DNA 5 applied to specs:** every behavioral statement carries an evidence anchor (`path#id`); unprovable → `[OPEN]`, never invented |
| M3 | Nothing measures whether the derived artifact preserved the source's detail; nothing forces re-derivation when the source changes | **Parity Gate + Sync Contract:** mechanical orphan/ghost/detail-class counts + prototype↔spec hash witness enforced at the Step-0 scope gate |

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 14th in the `02*` series. **Inserted 2026-09-09 at owner request (urgent); series renumbered same day** — record-integrity `02n→02o`, parallel-session `02o→02p` (task IDs retain historical `02o.N` labels). **Revision 2026-09-10 (owner):** the mirror direction (former 02n.7) was promoted into its own epic `02o-phase-1-prd-prototype-fidelity.md`; series renumbered again — record-integrity `02o→02p`, parallel-session `02p→02q`. **Sequencing: owner-confirmed 2026-09-10 — `02n → 02o → 02p → 02q`**: this plan executes next; `02o` executes after this plan (precondition: 02n's ledger grammar + witness pattern land). Theme mapping: T2 (new step files), T3 (parity artifact + witness), T8 (handoff gate).

**Gate reviews:** roundtable 2026-09-10 complete — **[SYNTHESIS: RESHAPE]** with a binding 12-amendment package (A1–A12, recorded in `active-decisions.md`; transcript `artifacts/evals/roundtable/transcripts/gate-review-02n-reverse-prd_native_1.md`). D1/D2 resolved in-panel (A1 routing precedence; A2 code-level witness executor). A9 (mirror-direction sweep) binds `02o` — see `02o-phase-1-prd-prototype-fidelity.md` (A9 as amended by its B8/B12). **A1–A12 folded 2026-09-10** (owner permission; development held): A10 applied as owner re-based (item-count checkpoint after item 5 of 9; hours sizing-only); A12 GO'd 2026-09-10 with corrected consequence clause (target feature TBD; hand-run not yet run).

**Review 10 fold (C-package — owner-authorized 2026-09-22, pre-baseline amendment):** `artifacts/docs/review/10-design-phase-spec-prototype-fidelity-and-lifecycle-plan.md` (RATIFIED 2026-09-16) §4 step-contract alignments folded: step-00 requires the **SPEC.md Spec Kernel anchor** for reverse mode; step-01d gates on the **4 cognitive-completeness criteria + State Switcher** (prototypes failing are rejected before inventorying); step-02d marks plumbing/telemetry rows **`[DEFERRED TO SPEC]`**; step-04d stamps the **freeze boundary** (SHA-256 witness); **step-05d is repurposed from the re-runnable sync loop to the formal Spike Rollback Protocol** (invoked only when QA falsifies the interaction model). Review 10 §5 Sprint 3 governance added as **02n.10**; PM/PD Review 10 invariants ride in 02n.8. Amended baseline: **10 countable items, checkpoint at 5/10**; commit-per-item authorized (local, no push). Engine version bump at ship (`bump version` note, line 3).

**Deviation record (2026-09-23, roundtable class B — owner ruling requested):** commit `15279c1` changed the witness rule in code so an ABSENT parity-report = never-frozen = proceed (only stale/missing-field/broken block); the plan text above still describes blocking on an expected-but-missing witness. Correct-forward options: amend the plan text with this dated ruling, or revert the code to blocking — until one lands, do not cite Step-0 as enforcing expected-missing.

---

## 1. Scope

### 1.1 In scope

| Item | Detail |
|---|---|
| Reverse mode in `/design` | 5 new step files (`steps/step-0Xd-*`), router mode detection, Step-0 staleness hook; **Review 10 §4 additions: SPEC.md Spec Kernel anchor required, step-01d completeness/State-Switcher reject gate, step-02d `[DEFERRED TO SPEC]` partition, step-04d freeze boundary (SHA-256)** |
| Evidence Ledger | Structured section in `requirements.md` (+ template): statement → evidence anchor (`path#id` — frozen grammar, A11) → evidence type (prototype / user / owner) → status |
| Prototype inventory | `prototype-inventory.md`: screens, flows, behaviors, states extracted with `path#id` anchors — tool-agnostic (HTML mock, code, Figma export, AI-generated prototype) |
| Parity Gate | `parity-report.md`: ghost statements, orphan behaviors, grounding rate, detail-class coverage (10 classes), `[OPEN]` list |
| Mechanical checker | `.agents/scripts/spec_parity.js` + `tests/test_spec_parity.js` (08-23 rule: script + named test — no mockOutput tautology, 02m lesson) |
| Sync Contract | Prototype + spec hash witness in `parity-report.md` frontmatter; **non-file prototypes (Figma URL, live code): witness = source pointer + access timestamp + snapshot hash of `prototype-inventory.md` — honestly labeled weaker than file-hash (A3)**; stale witness blocks all `/design` modes at Step-0; **post-freeze prototype edits are a rollback trigger, not a sync chore (step-05d = Spike Rollback Protocol, Review 10 §4)** |
| Mirror direction | ~~Spec Coverage Contract at develop/qa gates~~ MOVED to `02o-phase-1-prd-prototype-fidelity.md` (owner ruling 2026-09-10) — orphan-AC sweep, fidelity review, RTI-4 |
| Evals + rubrics | Reverse-mode benchmarks in `evals/suites/skills/design.json`; PRD-5/PRD-6 criteria in `evals/rubrics/prd-completeness.json` |
| Personas | `@product-manager` + `@product-designer` workflow sections + socratic files (reverse stance: challenge smoothing, challenge invention; **+ Review 10 invariants: Spec Kernel, Spec-Delta Protocol, Rule of Any One / completeness criteria, State Switcher, Phase Boundary Rule**) |
| Review 10 governance (C-package) | §5 Sprint 3: `@founder` + `@code-reviewer` persona invariants, `.agents/references/developer-guidelines.md` (2-Tier Iteration Filter + Phase Boundary Rule), `.agents/GUARDRAILS.md` (Freeze Boundary + Rule of Any One), CHANGELOG — built as 02n.10 |
| Docs | AGENTS.md `/design` line, `skills-catalog.json`, `quick-reference.md`, guide design section, dev-plan registry stamp, readme/readme_cn, changelog, `.agents/skills.md`, `.agents/workflow.md` (A11) |

### 1.2 Out of scope (named, with rationale)

| Item | Rationale |
|---|---|
| New persona or standalone skill folder | Mode reuses `/design` chain, memory wiring, artifacts (Simplicity First) |
| Figma/screenshot auto-ingestion, vision pipelines | Inventory is a human+agent walk-through of the prototype; no binary parsing, tool-agnostic |
| `/develop` restructure | Now owned by `02o` (fidelity-review step + sweep at existing gates, no workflow rewrite); this plan keeps hands off `/develop` |
| Token budgets, LLM-judge automation in CI | 02m ruling stands: structural gates only; G-Eval scored runs stay in the vespyr-eval behavioral tier |
| Retroactive PRD backfill for shipped features | The machinery applies to new design cycles; backfill is a separate owner decision |

---

## 2. First Principles

1. **The second artifact must be earned through the same loop as the first.** One-shot derivation is the defect; a synthesis prompt is not a workflow.
2. **No evidence, no requirement (DNA 5 applied to specs).** A PRD statement without a resolvable anchor is `[OPEN]`, not invented; anchors use the frozen `path#id` grammar (A11). Hallucination is banned mechanically, not rhetorically.
3. **Parity is counted, not felt.** Orphan/ghost/detail-class numbers are script-computed and test-backed; "as good as traditional" is a measured claim or it is not made. The parity-delta threshold is set only by first-run calibration with a mandatory blocking owner disposition in `parity-report.md` — no invented prior (A8).
4. **Sync is loud.** Staleness blocks at Step-0 like every other Vespyr gate; silent drift is the exact defect class 02o/02m exist to prevent.
5. **The law is bidirectional — one machinery, two epics.** PRD-first gaps and prototype-first gaps are the same lossy-derivation defect; `02n` ships the reverse machinery, `02o` reuses it (ledger grammar, witness pattern, honest tiering) for the traditional direction — no duplicated ceremony.

---

## 3. Reverse-Mode Workflow (d-series steps)

| Step | File | Contract |
|---|---|---|
| R1 | `steps/step-01d-ingest-prototype.md` | **Completeness gate first (Review 10 §4): prototype must pass the 4 cognitive-completeness criteria + State Switcher (real data topology, 3 critical state moments, real tokens, micro-feedback) — failing prototypes are rejected before inventorying.** Then inventory the prototype → `prototype-inventory.md`: screens, flows, behaviors, states, interactions — each row anchored `path#id`. Extraction only; no interpretation, no spec language yet |
| R2 | `steps/step-02d-evidence-ledger.md` | Build the Evidence Ledger in `requirements.md`: behavior → anchor (`path#id`, frozen — A11) → type → status. Gaps become `[OPEN]` questions put to the owner — never filled by inference. Infrastructure/telemetry/DB-bound items are cleanly marked `[DEFERRED TO SPEC]` (Fidelity Partition, Review 10 §4) |
| R3 | `steps/step-03d-prd-synthesis.md` | Re-run create-mode steps 02a→05a (personas, stories, screen states, tokens) with the ledger as fixed input; every authored artifact row-anchored to the ledger |
| R4 | `steps/step-04d-parity-gate.md` | Run `spec_parity.js`; complete the 10-class detail checklist; produce `parity-report.md`; stamp the **freeze boundary** (SHA-256 witness — Review 10 §4). Gate: ghosts = 0, orphans = 0-or-deferred (deferred rows carry owner + date). **Owner samples 3 of N ledger statements at R4; each anchor verified to support its claim; disposition recorded in `parity-report.md` (+0.5h, A7)** |
| R5 | `steps/step-05d-sync-contract.md` | **Spike Rollback Protocol (Review 10 §4 — repurposed from the re-runnable sync loop):** invoked only when QA falsifies the interaction model — halt engineering, branch Prototype v2 in isolation, re-validate → re-extract (01d→02d) → re-run parity → re-witness. Steady state: the frozen prototype is an immutable reference; the spec is the sole contractual truth post-handoff |

**Mode routing (SKILL.md — reverse checked FIRST, A1):** reverse mode requires the SPEC.md Spec Kernel anchor (Review 10 §4); inventory present ∧ no `requirements.md` → **reverse**; neither artifact → **create**; both present → **edit**, but only after Step-0 recomputes the prototype hash against the witness; mismatch → block, then either restore the frozen prototype or run step-05d Spike Rollback before anything else.

**Anchor grammar `path#id` (frozen — A11; binding on 02n.2, 02n.3, 02n.5, and 02o's evidence refs):**
- **Syntax:** exactly one `#`; split at the first `#`. `path` = repo-relative POSIX path (`/` separators, no leading `./`, chars `[A-Za-z0-9._/-]`); `id` = anchor token `^[A-Za-z][A-Za-z0-9._:-]*$`.
- **Resolution (structural):** (1) `path` resolves to an existing file from the repo root; (2) `id` is present in that file — for `.html`/`.htm`/`.svg` as an `id="<id>"` / `id='<id>'` attribute; for all other files as a word-boundary occurrence of the id.
- **Rows:** one primary anchor per row; `[OPEN]` and `[DEFERRED TO SPEC]` are statuses, never anchors. Non-file prototypes (Figma URL, live code) anchor to `prototype-inventory.md#<row-id>`; their witness is Sync Contract v2 (A3) — honestly weaker than a file hash.
- **Honest tiering:** resolution is structural (script, test-backed); whether the anchor actually supports the statement is judged tier — owner sampling at R4 (A7) — never claimed as structural.

---

## 4. Quality Measurement — the "as good as traditional" bar

| Metric | Definition | Gate |
|---|---|---|
| Ghost statements | ledger statements whose evidence anchor does not resolve on disk | **0 (hard)** |
| Orphan behaviors | inventory behaviors with no ledger/spec statement | **0**, or deferral row with owner + date |
| Grounding rate | behavioral statements with resolvable evidence ÷ total behavioral statements | **100%** (remainder must be `[OPEN]`) |
| Detail-class coverage | 10 classes covered-with-evidence or N/A-with-reason | **10/10** |
| Parity delta vs traditional | same feature through both modes: AC count + detail-class counts diffed | **first-run calibration; mechanical thresholds stand as-is; owner disposition mandatory and blocking in parity-report.md (A8)** — judged tier, honestly labeled, not structural |

**Detail classes (the "small details" guard):** screen states (empty/loading/error) · edge cases & validation · data fields & types · permissions & auth · navigation & flows · copy & tone · telemetry · performance notes · accessibility · platform constraints.

**Honest tiering (02m lesson):** ghost/orphan/witness checks are **structural** (script, deterministic, test-backed). Grounding *semantics* — whether an anchor actually says what the statement claims — is **judged tier** (G-Eval + owner parity review at R4). The plan does not claim the structural tier catches semantic hallucination.

---

## 5. Build Items (23h serial stated / 26.5–28.5h honest — sizing only; control = checkpoint when 5 of 10 countable items verify complete; single-writer; commit-per-item)

| ID | Task | Est | Status | Verify |
|---|---|---|---|---|
| 02n.F | Fixture-prototype build (A5 — prerequisite: lands BEFORE 02n.2): prototype seeded rich in behaviors across the 10 detail classes | 2h | done (2026-09-22) | fixture prototype exists; seeded behaviors enumerated (49 anchors / 10 classes; `tests/test_reverse_prd_fixture.test.js` green) |
| 02n.1 | `SKILL.md` reverse routing (reverse-first precedence, A1) + Step-0 staleness hook + **SPEC.md kernel anchor requirement (Review 10 §4)**; `spec_parity.js` `witness check` subcommand called from step-00; code-level hash-compare stub + `tests/test_step0_staleness.js` (A2) | 3h | done (2026-09-22) | probe: mutate prototype file → Step-0 blocks all modes (`[BLOCK]` exit 1); reverse mode refuses without SPEC.md kernel; staleness test 6/6 green incl. bypass probe |
| 02n.2 | `step-01d` + `prototype-inventory.md` template (+ **4-criteria completeness / State-Switcher reject gate**, Review 10 §4) | 2h | done (2026-09-22) | fixture prototype → dry-run inventory (`dry-run/prototype-inventory.md`) lists 49/49 seeded behaviors with anchors across 10 classes; incomplete prototype rejected before inventorying |
| 02n.3 | `step-02d` + Evidence Ledger section in requirements template (+ **`[DEFERRED TO SPEC]` fidelity partition**, Review 10 §4) | 2h | done (2026-09-22) | dry-run ledger (`dry-run/requirements.md`): 51 rows — 49 confirmed resolvable, 1 `[DEFERRED TO SPEC]`, 1 `[OPEN]` unanchored (fencing demonstrated) |
| 02n.4 | `step-03d` (loop a-steps) + `step-04d` parity gate + **freeze-boundary SHA-256 witness stamp** (Review 10 §4) (+ A7 DoD text: owner samples 3 of N at R4) | 2.5h | done (2026-09-22) | dry-run on fixture: PRD §1–13 + 9 stories/27 ACs synthesized; parity-report produced with freeze witness (`6c41d0…`); check exit 0; sampling disposition pending owner (A7/A8 recorded as blocking) |
| 02n.5 | `spec_parity.js` + `tests/test_spec_parity.js` | 2.5h | done (2026-09-22) | green on fixture; red on 3 seeded violations (ghost / orphan / stale witness) — 7/7 named tests |
| 02n.6 | `step-05d` **Spike Rollback Protocol** (Review 10 §4 repurpose) + witness refresh on re-freeze (Sync Contract v2 — A3: non-file witness = pointer + access timestamp + inventory snapshot hash, honestly weaker) | 1.5h | done (2026-09-22) | probe: post-freeze prototype edit → Step-0 blocked (`[BLOCK]`) → re-witness → gate opens (test green); no steady-state sync loop (prompt-drift test green) |
| 02n.7 | ~~Mirror: Spec Coverage Contract~~ MOVED to `02o` (owner ruling 2026-09-10) — A9 as amended by 02o's B8/B12; tracked in 02o DoD | — | moved | — |
| 02n.8 | Evals + rubrics (PRD-5/6, reverse benchmarks in `design.json` — fixture-tier, 02l forward-note, A6) + personas + socratic files (**PM/PD Review 10 invariants: Spec Kernel, Spec-Delta Protocol, Rule of Any One; completeness criteria, State Switcher, Phase Boundary Rule**) + catalog/quick-reference/AGENTS.md docs + readme/readme_cn, changelog, `.agents/skills.md`, `.agents/workflow.md` (A11) | 3.5h | done (2026-09-22) | PRD-5/6 + held-out mirror live; SKILL-DESIGN-REVERSE/PARITY pass 5.00 fixture-tier; no benchmark flipped pass→fail (AGENT-PM-01 holds 4.00); catalog recompiled; suite 526/526 |
| 02n.9 | `step_tracker.js` artifact-presence/hash extension (owner @developer); step-00 owner @product-designer (A4) | 2h | done (2026-09-22) | tracker distinguishes edit-after-recompute from edit-without-hash (scope-lock records artifact hashes + witness_state + route); stale pair routes `rollback` per precedence — 5/5 route tests green |
| 02n.10 | Review 10 §5 Sprint 3 governance fold (C-package): `@founder` (Two Valid Responses, Half-Sprint ban, Freeze Boundary) + `@code-reviewer` (reject contract shifts lacking `[DELTA-NN]`, rogue UI tokens) persona invariants; `.agents/references/developer-guidelines.md` 2-Tier Iteration Filter + Phase Boundary Rule; `.agents/GUARDRAILS.md` Freeze Boundary + Rule of Any One; CHANGELOG `[Unreleased]` | 2h | done (2026-09-22) | `tests/test_review10_governance.test.js` 5/5 green; GUARDRAILS section live; suite 531/531 |
| 02n.11 | **Owner request 2026-09-23:** design UI stack gate — `shadcn_gate.js detect/verify` (stack / shadcn-MCP / `@shadcn/lint` state with evidence; MCP ask-to-install per https://ui.shadcn.com/docs/mcp); guideline enforcement wired into design SKILL.md (UI stack gate section), step-01d completeness criterion 5, designer-guidelines enforcement note | 1.5h | done (2026-09-23) | `tests/test_shadcn_gate.test.js` 6/6 (evidence-backed detection; verify red on chosen stack without lint; MCP installed/disabled/absent across config locations); SKILL/step/guidelines probes present |

**Total: 23h stated** (21h + Review 10 Sprint 3 governance 02n.10 +2h). **Honest range 26.5–28.5h** — carries the pre-fold 3.5–5.5h single-writer cushion; sizing only, never the control (owner A10 re-base).

**Control mechanics (owner A10 re-base, 2026-09-10; amended 2026-09-22 with the C-package):** the control is a **checkpoint when 5 of the 10 countable items are verified complete** (counted from commits/registry rows via the Status column; countable = 02n.F, 02n.1–02n.6, 02n.8, 02n.9, 02n.10 — struck 02n.7 excluded; A12 is owner-executed, zero-build, not counted). Under dependency order the 5th close is expected around the fixture → 01d → ledger → checker → staleness-hook path; the count governs, not the prediction. Single writer halts and records a replan decision (continue/descope/defer) in the registry row with date + SHA. **Scope-drift halt:** any new task, verify-criterion redesign, or deliverable growth → halt and owner rules; the §5 baseline is captured at execution start. Regression gate per item: `tests/run-all.js` green. No hour-based owner gate.

**A12 optional pre-build validation (GO'd by owner 2026-09-10; target feature TBD):** founder's pre-registered hand-run — R1→R3 on one in-scope feature, AC→evidence map with file:line refs, ≤2h, zero build. Corrected consequence clause (B20): trip (≥1 orphan) strengthens M1 at anecdote tier; clean run falsifies the re-sequencing advice (02n-first stands); no >2h arm (hours not a control unit).

**Weight rationale (recorded 2026-09-23 after roundtable — previously silent, commit `857cc72`):** PRD-5/6 were created at `weight: 1` (mirroring PRD-3/4) so additive reverse-mode criteria could not flip any previously-passing benchmark — at `weight: 2`, AGENT-PM-01 scores 6/10 = 3.40 and fails. @tech-lead classed the unruled change as scope-drift (class B); the executor contests it as pre-authorized additive criteria (02n.8 row). **Owner ruling requested** — either ratify the weights with this rationale or re-weight and re-baseline.

---

## 6. Definition of Done

1. [x] `/design` routes prototype-first correctly (reverse-first precedence, A1); Step-0 calls `spec_parity.js` `witness check`; hash-compare stub + `test_step0_staleness.js` exits 1 on mutated prototype (A2). **Verified 02n.1 (`bed7309`) — staleness suite 8/8 incl. bypass probe.**
2. [x] Zero ghost statements; orphans 0-or-deferred on the 02n.F fixture feature (script-verified, 02n.5). **Dry-run `check` exit 0: ghosts 0 / orphans 0 / grounding 100%.**
3. [ ] `parity-report.md` carries the 5 metrics + hash witness; `spec_parity.js` + named test live; bypass probe (delete script or stub it) fails loudly, not silently. **Mechanical parts CONFIRMED (report + witness `6c41d0…`, 7/7 parity tests, `[BLOCK]` bypass probe). Owner samples 3 of N ledger statements at R4 with recorded disposition (A7) — Round 1 (2026-09-22): 3/3 REJECTED (hidden modal child, dead CTA, invisible annotation) → fixture remediated; Round 2: L-08 + L-35 SUPPORTED (clutter fixed); Round 3: L-24 SUPPORTED → **A7 CLOSED 2026-09-23, 3/3 verified**; only A8 remains; parity-delta threshold set by first-run calibration with blocking owner disposition — no invented prior (A8) — PENDING OWNER.**
4. [x] Reverse-mode PRD on the fixture feature covers all 10 detail classes (PRD-5/PRD-6 structural patterns present). **Dry-run 10/10; rubric criteria live; `SKILL-DESIGN-REVERSE`/`PARITY` pass 5.00 fixture-tier.**
5. [x] ~~Spec Coverage Contract live at develop/qa gates~~ MOVED to `02o` (owner ruling 2026-09-10) — tracked in 02o DoD.
6. [ ] Full suite green at the execution baseline + new tests (531/531), catalog parity green, docs updated (incl. readme/readme_cn, changelog, `.agents/skills.md`, `.agents/workflow.md` — A11), eval additions labeled fixture-tier with 02l forward-note (A6), registry row stamped with execution evidence — **all CONFIRMED except the engine version bump, which lands at ship (owner ruling 2026-09-22).**
7. [x] Review 10 §4 alignments live: SPEC.md kernel anchor; step-01d completeness/State-Switcher reject gate; `[DEFERRED TO SPEC]` partition; freeze-boundary SHA-256 witness; step-05d = Spike Rollback Protocol; Review 10 Sprint 3 governance live (02n.10). **Verified 02n.10 (`0446a39`) — 5/5 governance probes.**

---

## 7. Risk Register

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-PR1 | Ledger ceremony kills prototype-first speed (why people go prototype-first) | Med | High | One-line rows; script does the counting; N/A-with-reason allowed; 5 steps, no sub-ceremony |
| R-PR2 | Structural gates catch broken anchors, not semantic hallucination | Med | Med | Honest tiering (§4); judged tier + owner review at R4 **(A7 owner sampling of 3 of N ledger statements)**; never claim more than the gate proves |
| R-PR3 | Prototype sources too varied to inventory reliably | Low | Med | Inventory = human+agent walk-through normalized to behaviors; tool-agnostic by construction |
| R-PR4 | Sync gate annoys solo iteration mid-shaping | Med | Low | Pre-handoff iteration is gate-free (isolated sandbox); post-freeze edits are a rollback trigger, never a silent sync chore; gate is loud by design (Review 10 §4) — same trade every other Vespyr gate makes |

---

*Author: @product-manager (Sarah) at Chris's request, 2026-09-09. Gate review COMPLETE 2026-09-10 (native roundtable, RESHAPE → **A1–A12 folded**; transcript: `artifacts/evals/roundtable/transcripts/gate-review-02n-reverse-prd_native_1.md`). A10 applied as owner re-based (item-count checkpoint after item 5 of 9; hours sizing-only). A12 GO'd 2026-09-10 (corrected consequence clause; target feature TBD; hand-run not yet run). Sequencing owner-confirmed: `02n → 02o → 02p → 02q`. Parallel investigation RESOLVED & RATIFIED 2026-09-16 via Review 10 (`artifacts/docs/review/10-design-phase-spec-prototype-fidelity-and-lifecycle-plan.md`); execution UNBLOCKED. **Review 10 fold (C-package) applied 2026-09-22 (owner-authorized pre-baseline amendment); execution GO 2026-09-22 — commit-per-item (local, no push); engine version bump at ship.*** **Execution COMPLETE 2026-09-22 — 10/10 countable items (commits a40691a…0446a39); checkpoint 5/10 CONTINUE recorded at `bed7309`; suite 531/531; DoD mechanical items CONFIRMED — A7 owner sampling + A8 parity-delta dispositions remain PENDING OWNER (blocking).**
