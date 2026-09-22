# Traditional-Direction Parity — PRD-to-Prototype Fidelity & Implementation Coverage (02o)

**Decision:** The mirror half of the Asymmetry Law — traditional PRD-first flows produce excellent specs whose prototypes and implementations lag in detail — gets its own epic. A **Spec Coverage Contract** at the develop/QA boundary: every acceptance criterion maps to implementation evidence, a **runner-enforced orphan-AC sweep** fails the build on any AC with zero references (not a checklist — a checklist with no possible red is theater), and a **fidelity-review step** gates /develop handoff on the 10 detail classes. Coupling is explicit (B1): this plan's row vocabulary `{ac_id, evidence_ref[], mechanism, check}` is **new** — documented as an isomorphism of 02n's row shape (`behavior → anchor → type → status`); evidence refs reuse A11's frozen `path#id` anchor syntax; reuse is pinned at 02n's amended-file SHA. Two epics, one machinery, no duplicated ceremony.

**Problem (owner, 2026-09-09, re-confirmed 2026-09-10):** in the traditional direction, "the PRD quality is so good, but the prototype quality cannot keep up with the quality of the PRD — still a lot of gap in the implementation (missing small detail too)." This is the same Asymmetry Law as 02n, in the other direction: whichever artifact comes first is rich; the second is derived in one pass and loses detail.

**Root cause — the same 3 mechanisms, inverted (02n §M1–M3):**

| # | Mechanism (traditional direction) | Countermeasure (this plan) |
|---|---|---|
| M1 | Implementation is derived from the PRD in one pass — no loop equivalent to the PRD's own refinement | Fidelity-review step in `/develop`: handoff re-runs the PRD's detail classes against the implementation; missing classes block advance |
| M2 | ACs are "reasoned about", not traced — gaps get smoothed, details dropped silently | Spec Coverage Contract: AC → implementation-evidence map; every AC referenced or explicitly deferred (deferral rows carry owner + date) |
| M3 | Nothing counts coverage — green builds ship missing small details | `req_to_impl_check.js`: mechanical orphan-AC sweep, exit 1 on first AC with zero references; wired into the `/test` failure summary + qa-signoff citation (honestly labeled; DoD #11 enforcement — dev-plan `README.md:154`, v2.1 planned — is a separately filed defect, B8) |

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 15th in the `02*` series. **Inserted 2026-09-10 at owner request** (the mirror direction promoted out of 02n.7 into its own epic); **series renumbered same day** — record-integrity `02o→02p`, parallel-session `02p→02q` (task IDs retain historical `02o.N` labels). **Sequencing: owner-confirmed 2026-09-10 — `02n → 02o → 02p → 02q`** (execution precondition, B14: 02n lands its grammar + witness pattern). Theme mapping: T2 (new step), T3 (coverage artifact + sweep), T8 (qa-signoff gate).

**Carried-over rulings (02n gate roundtable, 2026-09-10 — binding on this plan):**
- **A9** — runner-enforced orphan-AC sweep, not checklist-tier (Nina over Grant; a green with no possible red is not a gate). DoD #11 (dev-plan `README.md:154`, v2.1 **planned**) is the intended home, but its enforcement is a separately filed defect (B8).
- **RTI hardening** — RTI-1/2/3 in `req-to-impl.json` are substring-gameable (`requiredPatterns`, `minWordCount:40`) — P2 rubric weakness flagged by Elena; hardened alongside RTI-4.
- **Fixture-tier precedent (02m:352)** — any eval-suite additions ship labeled fixture-tier with an 02l forward-note; no behavioral-gating claims until the prompt-execution adapter lands (Kai).
- **Coupling (B1 — rewrites the original bullet)** — the coverage contract documents `{ac_id, evidence_ref[], mechanism, check}` as an isomorphism of 02n's row shape (`behavior → anchor → type → status`); evidence refs reuse A11's frozen `path#id` anchors; reuse pinned at 02n's amended-file SHA. No parallel vocabulary is claimed.
- **Budget control (owner A10 re-base, 2026-09-10)** — item-count checkpoint + scope-drift halt are the control units (B17–B18); hour estimates are sizing only, never the control.
- **A12 (open)** — consequence clause corrected in review (B20): a trip (≥1 orphan) strengthens M1 at anecdote tier; a **clean run** falsifies the re-sequencing advice; the >2h arm is deleted. Owner GO/stamp pending.

**Gate reviews:** COMPLETE 2026-09-10 — native roundtable (RESHAPE → B1–B20 folded). Transcript: `artifacts/evals/roundtable/transcripts/gate-review-02o-prd-prototype-fidelity_native_1.md`. A12 GO'd 2026-09-10 (corrected consequence clause stands); sequencing confirmed 2026-09-10 (`02n → 02o → 02p → 02q`); **execution HELD pending a parallel investigation (owner, 2026-09-10)**.

**Review 10 fold (C-package — owner-authorized 2026-09-22, pre-baseline amendment):** the coverage contract operates under the **Phase Boundary Rule** — post-handoff contract shifts append as `[DELTA-NN]`/`AC-E*` and must be referenced in code/tests; in-place spec edits are banned during engineering. The orphan-AC sweep verifies in-flight deltas map to localized implementation refs (Rule of Any One); step-06a audits that classes deferred from the prototype (`[DEFERRED TO SPEC]`) are implemented-or-deferred-with-reason in production. Execution GO 2026-09-22 — commit-per-item (local, no push); engine version bump at ship; sequencing precondition B14 unchanged (02n executes first).

---

## 1. Scope

### 1.1 In scope

| Item | Detail |
|---|---|
| Spec Coverage Contract | Section in the develop handoff template (`.agents/skills/develop/templates/coverage-report.md`): AC → implementation-evidence map, grammar `{ac_id, evidence_ref[], mechanism, check}` (new vocabulary — documented isomorphism of 02n's row shape; evidence refs use A11's `path#id` anchors); deferral rows carry owner + date, capped with blocking disposition at qa-signoff (value owner-decided, B10); post-handoff changes arrive as `[DELTA-NN]`/`AC-E*` under the Phase Boundary Rule (Review 10 §4) and are swept like any AC row |
| Orphan-AC sweep | `.agents/scripts/req_to_impl_check.js` + `tests/test_req_to_impl_check.js`: grep each AC id, exit 1 on first AC with zero references (08-23 rule: script + named test; reuses 02n.5 witness pattern). Grammar frozen before build (B9): file-set declaration, exclusion set (coverage report + requirements never targets), row-key vs ref-target resolution, anchored/id-unique matching (`AC-1` ≠ `AC-10`) |
| Fidelity-review step | `/develop` step 06a (`.agents/skills/develop/steps/step-06a-fidelity-review.md`): 10-class implementation coverage vs `product-spec.md` (implemented / deferred-with-reason per class); classes deferred from the prototype (`[DEFERRED TO SPEC]`) are audited as implemented-or-deferred-with-reason in production (Review 10 §4); missing class exits 1 via `req_to_impl_check.js --fidelity`; report → `artifacts/output/05-execution/quality/coverage-report.md` |
| QA integration | `/test` consumes `req_to_impl_check.js` output in its failure summary (B8 — folded into 02o.2); qa-signoff coverage precondition = honestly labeled sweep citation, no enforcement stub claimed; DoD #11 refusal mechanism (dev-plan `README.md:154`, v2.1 planned) filed as a separate defect; enforcement coupling registered as forward-condition on 03-series F2.23–F2.27 |
| Rubric work | RTI-4 in `evals/rubrics/req-to-impl.json` (AC coverage, runner-loaded; fixture-tier label + 02l forward-note) + harden RTI-1/2/3 substring-gameability with named anti-gaming tests (B12) |
| Evals | Fixture + fixture-tier benchmarks in `evals/suites/skills/delivery.json` (labeled fixture-tier; 02l forward-note) |
| Personas | `@developer` + `@qa-engineer` workflow sections + socratic files (challenge: coverage theater, unchecked deferrals) |
| Docs | AGENTS.md `/develop` + `/test` lines, `skills-catalog.json`, `quick-reference.md`, guide, `changelog.md`, `readme.md`/`readme_cn.md`, `.agents/skills.md`, `.agents/workflow.md` |

### 1.2 Out of scope (named, with rationale)

| Item | Rationale |
|---|---|
| `/develop` workflow restructure | Capped at one new step + script; restructure is a separate owner decision |
| New personas / skills | Reuses develop/QA chain and 02n machinery (Simplicity First) |
| Visual/screenshot diffing of prototypes | Fidelity review is evidence-based (AC → code/test refs), not pixel comparison; no vision pipelines |
| Token budgets, LLM-judge automation in CI | 02m ruling stands: structural gates only |
| Retroactive coverage backfill for shipped features | Applies to new design cycles; backfill is a separate owner decision |

---

## 2. First Principles

1. **The second artifact must be earned through the same loop as the first** — the implementation gets a fidelity pass equivalent to the PRD's own refinement, not a one-shot derivation.
2. **No evidence, no coverage claim (DNA 5 applied to implementations).** An AC without a code/test reference is an orphan, not "done"; a deferral without owner + date is a lie.
3. **Coverage is counted, not felt.** Orphan-AC and detail-class numbers are script-computed; "implementation keeps up with the PRD" is a measured claim or it is not made.
4. **Green must have a possible red.** Any gate that cannot fail (checklist-tier) is theater — the 02n roundtable ruling, binding here.
5. **One machinery, two directions, two epics.** This plan owns the traditional direction; its row vocabulary `{ac_id, evidence_ref[], mechanism, check}` is new and documented as an isomorphism of 02n's row shape (`behavior → anchor → type → status`); evidence refs reuse A11's frozen `path#id` anchors and the sweep reuses 02n.5's script + named-test witness pattern — pinned at 02n's amended-file SHA (B1).

---

## 3. Workflow Integration Points

| Point | File | Contract |
|---|---|---|
| P1 | `.agents/skills/develop/steps/step-06a-fidelity-review.md` (6a suffix; new) | Fidelity review: run `req_to_impl_check.js --fidelity`; complete the 10-class coverage table (implemented / deferred-with-reason); audit `[DEFERRED TO SPEC]` classes from the prototype as implemented-or-deferred-with-reason (Review 10 §4); report → `artifacts/output/05-execution/quality/coverage-report.md` (template: `.agents/skills/develop/templates/coverage-report.md`) |
| P2 | `/test` failure summary + qa-signoff path | `/test` surfaces the orphan-AC list; qa-signoff cites the sweep's output (honestly labeled prose — no enforcement stub claimed; DoD #11 refusal mechanism is a separate defect, forward-condition on 03-series F2.23–F2.27); the sweep also verifies in-flight `[DELTA-NN]`/`AC-E*` rows map to localized implementation refs (Rule of Any One — no un-specced structural mutations) |
| P3 | Step-0 of any edit/develop cycle (owned by 02o.3) | Coverage report older than the last code change → re-run sweep before proceeding (same loud-staleness discipline as 02n's witness) |

**Detail classes (inherited from 02n §4):** screen states (empty/loading/error) · edge cases & validation · data fields & types · permissions & auth · navigation & flows · copy & tone · telemetry · performance notes · accessibility · platform constraints.

---

## 4. Quality Measurement

| Metric | Definition | Gate |
|---|---|---|
| Orphan ACs | AC ids with zero implementation evidence refs | **0** (exit 1 on first; hard) |
| Deferral rate | ACs deferred-with-reason ÷ total ACs | reported + **cap + blocking disposition at qa-signoff** (cap value owner-decided, B10); deferral rows must carry owner + date |
| Coverage rate | ACs with ≥1 resolvable ref ÷ total ACs | **100%** minus deferred |
| Detail-class coverage | 10 classes implemented or deferred-with-reason | **10/10** |
| Evidence resolution | every ref resolves on disk (file:line or test id exists) | **100%** (structural) |

**Honest tiering (02m lesson):** the sweep is structural — it catches missing refs, not wrong refs (a ref can point at code that doesn't implement the AC). Semantic fidelity is the existing review-seat check (`.agents/agents/code-reviewer.md:204` — "does it match the user story acceptance criteria?") with a named wrong-ref disposition; no new sampling procedure is created (B11). This plan never claims the sweep catches wrong refs.

---

## 5. Build Items (15.25–15.75h stated / 17.5–19.5h honest — sizing only; control = item-count checkpoint; single-writer; commit-per-item)

| ID | Task | Est | Status | Verify |
|---|---|---|---|---|
| 02o.1 | Develop handoff: Spec Coverage Contract template (`.agents/skills/develop/templates/coverage-report.md`) + AC-id convention incl. `[DELTA-NN]`/`AC-E*` post-handoff delta rows under the Phase Boundary Rule (targets the existing `product-spec-template.md` — the `requirements.md` template does not exist on disk, B16) + **fixture PRD sub-deliverable** (reuses `evals/fixtures/dev-tasks/rate-limiter.{js,test.js}` corpus + US-114 3-AC draft) | 2.5–3h | done (2026-09-22) | fixture PRD: AC-H1/AC-U1/AC-E1 mapped (annotated corpus refs, test green); seeded orphan AC-E2 isolated in `orphan-user-stories.md` handed to 02o.2's red probe |
| 02o.2 | `req_to_impl_check.js` + `tests/test_req_to_impl_check.js` (orphan-AC sweep, exit 1 on first orphan; refs resolve on disk; **sweep grammar frozen first** — file-set declaration, exclusion set, row-key vs ref-target resolution, anchored/id-unique matching; `/test` failure-summary consumption folded in — B8) | 3.5h | done (2026-09-22) | 8/8 tests: fixture green; seeded orphan AC-E2 red; `AC-10` ≠ `AC-1`; self-match impossible; dated deferral exempts; broken ref red; `--fidelity` 10/10, red on a missing class; `/test` step-02a/02b + SKILL wired (B8) |
| 02o.3 | `/develop` step 06a fidelity review (`steps/step-06a-fidelity-review.md`; 10-class coverage vs `product-spec.md`; `[DEFERRED TO SPEC]` classes audited as implemented-or-deferred-with-reason; missing class → `req_to_impl_check.js --fidelity` exits 1) + insertion mechanics (SKILL.md sequence list, step-08 cross-refs, `step_tracker.js --step` calls, develop-state letter-suffix semantics, manifest re-pin) + P3 staleness owner | 2.75h | done (2026-09-22) | step-06a live in the develop sequence; probe: missing class exits 1 (`--fidelity`, code-level) + deferred-without-disposition exits 1; P3 freshness gate (`--freshness`) wired into develop step-00; manifest re-pinned (337 entries, verify OK) |
| 02o.5 | RTI-4 in `req-to-impl.json` + RTI-1/2/3 hardening with named anti-gaming tests; fixture + fixture-tier benchmarks in `delivery.json` (02l forward-note); relabel the pre-existing uncommitted `SKILL-DEVELOP-TRACE` fixture-tier (`delivery.json:87–103`; attribution of the out-of-scope 02n-window touch routed to 02p — B15) | 2.5h | done (2026-09-22) | RTI-4 runner-loaded (AC coverage map); RTI-1/2/3 hardened (6/6 anti-gaming tests: stuffed + lorem red, genuine 5.00); SKILL-DEVELOP-TRACE relabeled fixture-tier (B15) and still 5.00; new SKILL-DEVELOP-COVERAGE 5.00; no baseline regressions |
| 02o.6 | Personas (@developer, @qa-engineer) + docs (AGENTS.md, catalog, quick-reference, guide, changelog, readme/readme_cn, .agents/skills.md, .agents/workflow.md) | 3.5h | pending | catalog parity green; suite green |

**02o.4 deleted (B8):** `/test` consumption folded into 02o.2; qa-signoff coverage precondition = honestly labeled sweep citation; sign-off coupling registered as forward-condition on 03-series F2.23–F2.27; **DoD #11 falsification filed as a separate defect** (dev-plan `README.md:154` claims `orchestrator_state.js next` refuses without `qa-signoff.md` — zero enforcement code in `.agents/scripts/`).

**Control mechanics (owner A10 re-base, 2026-09-10):** hour estimates are sizing only. The control is a **checkpoint after item 3 of 5** (the owner's "item 4 of 6" counted the pre-B8 six-item table), counted from commits/registry rows — the single writer halts and records a replan decision (continue/descope/defer) in the registry row with date + SHA. **Scope-drift halt (B18):** any new task, verify-criterion redesign, or deliverable growth → halt and owner rules; the §5 baseline is captured at execution start so "growth" has a comparator. No hour-based owner gate (B13 → B17).

---

## 6. Definition of Done

1. [ ] Orphan-AC sweep: fixture green, seeded orphan red; anchored/id-unique matching proven (`AC-10` ≠ `AC-1`); self-match excluded (02o.2).
2. [ ] Every AC in the fixture PRD has ≥1 resolvable implementation ref or a dated deferral row (script-verified).
3. [ ] Fidelity-review step 06a live in `/develop`; 10-class coverage recorded at handoff; `[DEFERRED TO SPEC]` classes audited (implemented-or-deferred-with-reason); missing class exits 1 via `req_to_impl_check.js --fidelity` (02o.3).
4. [ ] `/test` failure summary lists orphans; qa-signoff path cites the sweep (honestly labeled prose — no enforcement stub claimed); DoD #11 refusal mechanism defect filed separately with named test, forward-condition on 03-series F2.23–F2.27 (B8).
5. [ ] RTI-4 present + runner-loaded; RTI-1/2/3 hardened with anti-gaming tests red on stuffed outputs; delivery.json additions labeled fixture-tier with 02l forward-note; SKILL-DEVELOP-TRACE relabeled (B12, B15).
6. [ ] Full suite green at the execution baseline + new tests, catalog parity green, docs updated, registry row stamped with execution evidence (date + SHA) + sequencing precondition recorded (B14: 02n executes and its grammar/witness land); engine version bump (package.json + changelog) at ship (owner ruling 2026-09-22).

---

## 7. Risk Register

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-PF1 | Coverage ceremony slows the dev loop (mirror of 02n R-PR1) | Med | High | One-line refs; script does the counting; deferral rows are the escape valve — capped with blocking disposition at qa-signoff (B10) — ceremony is proportional to AC count, not code volume |
| R-PF2 | Sweep catches zero refs, not wrong refs — semantic fidelity still human | Med | Med | Honest tiering (§4); the review seat's AC check (`.agents/agents/code-reviewer.md:204`) is the semantic tier (B11); never claim more than the gate proves |
| R-PF3 | `/develop` scope creep into a workflow rewrite | Med | Med | Capped at one step + script (§1.2); restructure explicitly out of scope |
| R-PF4 | Hard dependency on 02n (execution + grammar/witness landing — B14) | Low | High | Sequencing owner-confirmed 2026-09-10: `02n → 02o → 02p → 02q`; if 02n slips, 02o stalls — stated openly. Post-amendment grammar-change clause (B1): if 02n's A1–A12 fold alters the row grammar after 02o rows ship, 02o re-pins at the amended SHA and re-validates rows — a stall, never silent invalidation |

---

*Author: @product-manager (Sarah) at Chris's request, 2026-09-10, promoting the traditional-direction mirror out of 02n.7 with the roundtable's binding rulings carried over. Gate review COMPLETE 2026-09-10 (native roundtable, RESHAPE → **B1–B20 folded**; transcript: `artifacts/evals/roundtable/transcripts/gate-review-02o-prd-prototype-fidelity_native_1.md`). A12 GO'd and sequencing confirmed 2026-09-10; parallel investigation RESOLVED & RATIFIED 2026-09-16 via Review 10 (`artifacts/docs/review/10-design-phase-spec-prototype-fidelity-and-lifecycle-plan.md`); execution UNBLOCKED (executes after 02n per sequencing). **Review 10 fold (C-package) applied 2026-09-22 (owner-authorized pre-baseline amendment); execution GO 2026-09-22 — commit-per-item (local, no push).***
