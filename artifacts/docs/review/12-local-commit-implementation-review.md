# Review 12 — Local-Commit Implementation Review: 02m FC-3 × Review 08 × Review 09

**Date:** 2026-09-21
**Reviewer:** @code-reviewer (Scout) — read-only verification; no source files were modified by this review
**Method:** git archaeology (local commits `5564d6c`, `8e0dc4b` + uncommitted working tree), live falsification probes, full-suite run
**Scope source documents:**
- `artifacts/docs/strategy/development-plan/02m-phase-1-intent-routing-and-anti-premature-execution.md` (§7.1 FC-3)
- `artifacts/docs/review/08-evolutionary-design-and-dual-quality-plan.md` (implementation commit)
- `artifacts/docs/review/09-roundtable-roster-integrity-plan.md` (implementation + record state)

**Review Gate verdicts (claims about existing state):**

| Plan | Code on disk | Record state | Verdict |
| :--- | :--- | :--- | :--- |
| 02m — FC-3 session-bound scope locks | Uncommitted, functional for old/foreign locks, bypassable in the default path | 02m doc unchanged (FC-3 still "unowned") | **[PARTIAL]** |
| Review 08 — Evolutionary Design & Dual Quality | Committed (`8e0dc4b`), all persona/guideline/guardrail claims verified | 2 doc defects (lint claim overstates; CHANGELOG pointer wrong) | **[CONFIRMED] with 2 defects** |
| Review 09 — Roundtable Roster Integrity | Complete in working tree; all behavioral probes pass | Plan still says "PROPOSED r2" with unchecked boxes; QA report claims ACs landed in a §7 that does not exist | **[CONFIRMED] code / [FALSIFIED] record claims** |

---

## 1. What "local commit" contains

| Ref | Commit | Contents relevant to this review |
| :--- | :--- | :--- |
| `5564d6c` (local, ahead of `origin/main`) | "feat: implement private workspace isolation and roundtable roster integrity verification" | Adds Review 08/09 plan docs; installer/CLI private-workspace work. **No roster-router code** (`grep -n "roster\|ROSTER\|seat" tests/test_cli.js` → 0 hits) — the commit message overstates the roster half. |
| `8e0dc4b` (local, ahead of `origin/main`) | "docs: add design phase lifecycle plan, update model production templates, and refine agent governance frameworks" | **Review 08 implementation**: 8 personas, `developer-guidelines.md`, `GUARDRAILS.md`, adapter timeouts, fault-injection tests, `package.json` scripts, CHANGELOG. |
| Working tree (uncommitted) | — | **Review 09 implementation** (router/validator/scorer/SKILL/tests/probes) + **02m FC-3 patch** (`step_tracker.js`, `lib/session.js`, `tests/test_step_tracker.test.js`). Also unrelated: `11-private-folder-...md` r3 rewrite, `03a-...md` notes. |

---

## 2. 02m — FC-3 Scope-Lock Session Binding — [PARTIAL]

### 2.1 What changed (uncommitted)

`step_tracker.js:179-214` adds `isLockActive(lock, skill, ctx)` with four matching rules; `cmdScopeLock` (`:252-277`) stamps `session_id` on the lock; `lib/session.js` now exports `windowSessionId` (`session.js:125`). `tests/test_step_tracker.test.js` (5 tests) passes; full suite `node tests/run-all.js` → **494/494 pass**.

### 2.2 Verified fixed

| Probe | Setup | Result |
| :--- | :--- | :--- |
| Old foreign UUID lock | lock ts = 10 days ago, `session_id` foreign | exit 1 — rejected ([CONFIRMED]) |
| Recent foreign lock + fresh `session-current.json` | lock 1 min old, session started now | exit 1 — rejected ([CONFIRMED]) |
| Same-window lock | lock via `w-<hash>` in-process | exit 0 — unlocked as intended ([CONFIRMED]) |

### 2.3 Findings

**FC3-F1 (HIGH) — the evergreen bypass survives in the default path.**
`cmdScopeLock` prefers `session-current.json` over the window hash (`step_tracker.js:255-262`), and `ensureSessionCurrent` is idempotent — it never rotates (`session.js:50-54`). The repo's own `session-current.json` is dated `2026-08-31`. Therefore locks normally carry a workspace-eternal UUID, and rule 3 (`step_tracker.js:194-197`) matches it forever with no time bound. Falsifier: a 10-day-old lock carrying the current `session-current` UUID unlocks `begin --step 1` → **exit 0** (probe E1). The execution plan's own acceptance line — "stale locks from prior dates do not unlock" (`artifacts/output/05-planning/execution-plan.md:225`) — is falsified on this path.

**FC3-F2 (MEDIUM) — the 15-minute fallback admits recent foreign locks.** `step_tracker.js:199-211`: a foreign lock created <15 min ago while `session-current.started` is stale unlocks a different window (probe A → exit 0). Intended for tool-invoked subshells, but it is exactly the parallel-window case ADR-006 exists for.

**FC3-F3 (LOW) — the foreign-session guard is production-dead.** `String(lock.session_id).startsWith('s-')` (`step_tracker.js:202`) never fires for real IDs: `ensureSessionCurrent` writes UUIDs (`session.js:55-57`) and window IDs are `w-`. Only the synthetic `s-` test IDs exercise it.

**FC3-F4 (MEDIUM) — tests assert a weaker shape than production.** The "stale historical lock" test (`tests/test_step_tracker.test.js:104-121`) uses `s-foreign-session-12345` + an old timestamp, so it passes via a branch that real IDs never take. No test covers a recent foreign UUID lock or an old lock carrying the eternal UUID — both of which unlock (2.3 F1/F2). Green suite, unmet acceptance criterion.

**FC3-F5 (LOW) — residue lock remains.** `artifacts/output/step-audit.json` still holds the `develop` / `review-09-roster-integrity-and-fc3-repair` lock (ts `2026-09-17T10:13:50Z`). Inert under the new rules (different window, >15 min), but 02m D2 set the purge precedent.

**Root cause note:** the engine has two competing identities — per-window (`w-`) and workspace-global (`session-current` UUID) — and the patch binds to the weaker one. Fix direction: bind locks to the window hash when no explicit `VESPYR_SESSION_ID`, and constrain rule 3 with the same freshness check as rule 4 (or rotate `session-current` at session start).

---

## 3. Review 08 — Evolutionary Design & Dual Quality — [CONFIRMED] with 2 defects

### 3.1 Verified on disk (commit `8e0dc4b`)

| Claim (review 08 §4–§6) | Evidence | Status |
| :--- | :--- | :--- |
| 8 personas hardened | Diffs present in `developer.md`, `ml-ai-engineer.md`, `qa-engineer.md`, `architect.md`, `tech-lead.md`, `product-manager.md`, `code-reviewer.md`, `ml-ai-ops.md` (Beck 4 Rules, YAGNI 2-callsite, Anti-Mock, Demonstrated Red, disposable code/permanent evals, vertical slices, AC-ML*/AC-U*/AC-E*, blocking review gates, eval CI gate) | [CONFIRMED] |
| `developer-guidelines.md` aligned | Steps 3/6 + DoD + Coding Standards updated | [CONFIRMED] |
| Adapter timeouts | `AbortSignal.timeout(options.timeout || 30000)` × 4 (`tools/eval/adapters/index.js`) | [CONFIRMED] |
| Demonstrated Red tests | `node --test tests/test_model_adapters.test.js` → 7/7 pass (429/500/timeout/503) | [CONFIRMED] |
| Guardrails + template + CHANGELOG | `GUARDRAILS.md` "Core Engineering Invariants" section; production template drift/shadow/eval fields; CHANGELOG entry | [CONFIRMED] |
| Suite green | `node tests/run-all.js` → 494/494, 0 fail (claim said 479/479; count grew, still green) | [CONFIRMED] |

### 3.2 Findings

**R08-F1 (MEDIUM) — `npm run lint` is a phantom check.** `package.json:25` runs `node --check bin/cli.js bin/vespyr-eval.js tools/eval/runner.js`, but `node --check` consumes only the **first** argument; the rest are ignored. Falsifier: `node --check bin/cli.js /tmp/broken-syntax.js` → exit 0; `node --check /tmp/broken-syntax.js` → exit 1. `typecheck` (`package.json:26`) checks only `bin/cli.js` again. This is the exact defect class §6 #1 claims to eliminate ("eliminating phantom DoD checks") — [PARTIAL] on that item. Fix: loop over files or use a glob-based runner.

**R08-F2 (LOW) — record pointers.** CHANGELOG:21 points at `artifacts/docs/review/10-evolutionary-design-and-dual-quality-plan.md`, which does not exist — the file is `08-evolutionary-design-and-dual-quality-plan.md` (`ls artifacts/docs/review/`). The doc also self-titles "Review 10", carries two sections numbered `## 7`, and states the doc path in `§6 #1` context consistent with the rename churn. Plan-vs-file numbering has been unstable across commits; the CHANGELOG pointer is objectively wrong.

---

## 4. Review 09 — Roundtable Roster Integrity — [CONFIRMED] code / record [FALSIFIED]

### 4.1 What changed (uncommitted)

`roster-router.json` (v1.1.0: `rules` vs `policy` split, `untagged_fallback`, security/performance/architecture/planning/tooling/launch/data/serving/docs keyword expansions, `security.excludes`), `resolve_agents.js` (whole-word matching ≤6 chars, auto-seating cascade + `autoSeated`, untagged fallback, floor in `validateRoster`), `roundtable_eval.js` (floor read from router with warn-fallback; `policy.revisit_sla`; autoseat telemetry partition), `round-table/SKILL.md` (autoseat marker + positional seat-2 dialectic mandate), `evals/roundtable/tag-probes.json` (new), `tests/test_router.test.js` (+ behavioral + QA-ENRICH tests), `tests/fixtures/tag-probes.json` (new).

### 4.2 Phase 4 probes — all pass

| Probe | Expected | Observed |
| :--- | :--- | :--- |
| 15 tag probes ≥2 seats | 15/15 OK | 15/15 OK |
| Untagged topic | `ROSTER: @tech-lead,@architect`, `untaggedFallback: true` | exact match |
| D2 leak/purge topic | seats `@security-engineer` | `ROSTER: @security-engineer,@developer` |
| memory-leak (pure) | performance, no security | performance + `@performance-engineer,@architect` |
| memory-leak (compound) | no security tag | performance only |
| `author` / `authority` | no `@security-engineer` | no security tag |
| `authentication flow review` | `@security-engineer` seated | security + auto-seat `@architect` |
| `purge the cache after deploy` | no security | launch only |
| `roster check --seats "@developer"` | exit 2, floor message | exit 2 + "roster below default_seats (2)" |
| scorer `coverage` 1-panel input | exit 2 | exit 2 |
| 13 `topics.json` topics ≥2 seats | all ≥2 | 13/13 OK |
| Suites | green | `test_router` 34/34; full suite 494/494 |

### 4.3 Deviations from the plan's own checklist

| # | Plan requirement | Disk reality | Impact |
| :--- | :--- | :--- | :--- |
| R09-D1 | "pair appears nowhere as a literal in `resolve_agents.js`" (`09-...:226`); "no literal seat-floor 2 remains in either script" (`:229`) | `resolve_agents.js:104` hardcodes `['tech-lead','architect']`; `|| 2` fallbacks at `:102,:204`; `roundtable_eval.js:90,125,309` keep `2` defaults | Checklist item unmet; fallbacks are defensive, but they re-create the shadow constants the plan set out to delete |
| R09-D2 | One probe artifact at `evals/roundtable/tag-probes.json` (`:170-179`) | Two identical copies; tests read `tests/fixtures/tag-probes.json` and only `existsSync` the `evals/` one | Drift risk; editing one copy silently uncovers the guard |
| R09-D3 | "Replace `test_router.test.js:33` (constant echo) with behavioral assertions" (`:171`) | Constant assertion retained at `:32` alongside new behavior | Minor; behavior now covered |
| R09-D4 | Structural guard "with an explicit reader map in the test as the only escape hatch" (`:166`) | Guard greps source text for `rules\.<key>` (`test_router.test.js:238-249`) | Weaker than specified; comments could satisfy it |
| R09-D5 | `revisit_threshold`: read as numbers (stays in `rules`) or delete (`:169`) | Moved to `policy.revisit_sla` and read as numbers with clamps | Functional; namespace differs from plan text |
| R09-D6 | — | Extra clamps `max_override_rate <= 0.50`, `min_sessions >= 5` (`roundtable_eval.js:744-756`) | Undocumented extra logic; harmless |

### 4.4 Record-integrity drift (the reason the record verdict is [FALSIFIED])

1. **The plan doc was never updated.** Disk still reads "PROPOSED r2 … no code changed by this document" with all §5 boxes unchecked (`09-...:3-4`, `:225-242`), yet history records r3 ratification and implementation: `history.md:1938-1946` (round table 4/4 GO, 6 amendments; @developer implementation) and `history.md:1952` (@qa-engineer 33/33 + 5/5, GO).
2. **The QA report cites a plan section that does not exist.** `artifacts/output/05-execution/quality/test-report.md` claims 5 scenarios were "backported to AC … in `09-roundtable-roster-integrity-plan.md` (§7)" — the plan has no §7 (ends at §6) and no AC backport.
3. **The QA report contradicts the implementation.** It states `"memory leak"` was *removed* from `security.excludes`; the implementation *includes* it (`roster-router.json`, excludes block), and the compound probe passes **because** of that exclusion. One of the two is wrong; the code is right.
4. **The 02m doc still carries FC-3 as unowned/open** (§7.1 FC table) although the patch is on disk (uncommitted). No status stamp anywhere links the patch to the FC.

---

## 5. Cross-cutting notes

- **Uncommitted state is the dominant risk.** All of Review 09's implementation and the FC-3 patch live only in the working tree (`git status`: 9 modified, 3 untracked). A `git clean`/reset loses the r3 implementation with no commit to recover it.
- **Out of scope (touched but not reviewed here):** `11-private-folder-...md` r3 rewrite, `03a-...md` notes, and the installer/private-workspace changes in `5564d6c` — not covered by the three attached plans.
- **02m core remains intact:** DNA 4 present in `AGENTS.md`, `CLAUDE.md`, `.agents/references/vespyr-dna.md` (1 each); 6 `step-00` gates present; not re-audited in depth here.

## 6. Open actions

| # | Action | Owner (suggested) | Severity |
| :--- | :--- | :--- | :--- |
| A1 | FC3-F1/F2: bind scope locks to window identity (or rotate `session-current` at session start); add falsifiers for recent foreign UUID + old same-UUID locks | @developer | HIGH |
| A2 | Commit Review 09 implementation + FC-3 patch (or explicitly reject) | @tech-lead / @developer | HIGH |
| A3 | R08-F1: fix `npm run lint` to check all three files | @devops-engineer / @developer | MEDIUM |
| A4 | R09-D1/D2: remove fallback literals or record them as accepted; collapse the duplicate probe artifact to one path | @developer | MEDIUM |
| A5 | Record pass: update Review 09 to r3/implemented, correct QA report §7 + excludes claim, stamp 02m FC-3 with the patch status + this review's falsifiers | @tech-lead (with 02p reconciliation) | MEDIUM |
| A6 | R08-F2: fix CHANGELOG pointer / doc numbering | @technical-writer | LOW |
| A7 | Purge residue lock; re-run 02m D2 acceptance probes | @qa-engineer | LOW |

**What would change my verdicts:** A1 lands with the two missing falsifiers → 02m FC-3 becomes [CONFIRMED]; A2 + A5 land → Review 09 record becomes [CONFIRMED]; A3 lands → Review 08 defects closed.

---

*Probes executed 2026-09-21 against working tree at `8e0dc4b` + uncommitted changes. Read-only: no file in the repository was modified by the verification itself; probe workspaces were created under the OS temp directory and deleted. Internal evidence is cited by `file:line`; command outputs are reproducible as listed in §4.2 and §2.2.*

---

## Post-Fix Verification (2026-09-21, same session — fixes applied after the snapshot above)

The verdicts and findings above remain the dated review snapshot. All seven open actions were executed; the evidence below supersedes them.

| # | Action | Status | Evidence |
| :--- | :--- | :--- | :--- |
| A1 | FC-3 window binding + missing falsifiers | **DONE** | `step_tracker.js`: `cmdScopeLock` records `resolveSessionId()` (window hash in interactive runs); `isLockActive` rule 3 is recency+epoch-bounded; rule 4 excludes session-UUID locks. `tests/test_step_tracker.test.js` 7/7, incl. new falsifiers: recent foreign UUID → exit 1; 10-day session-UUID lock → exit 1; same-epoch subshell → exit 0. External probes E1 and A now exit 1 (both were exit 0). **[SUPERSEDED 2026-09-22 — roundtable R2:** rule 3 was deleted after this snapshot; current rules are env → window hash → any-window ≤15-min recency, and this file's suite is now 10 tests. See the Roundtable section below.]** |
| A2 | Commit Review 09 + FC-3 | **PENDING OWNER** | Nothing committed — harness commit policy requires an explicit instruction. |
| A3 | `npm run lint` phantom check | **DONE** | `package.json:25` chains `node --check` per file; `lint`/`typecheck` exit 0. Multi-arg falsifier (exit 0 with broken 2nd file) now structurally impossible. |
| A4 | Literal fallbacks + duplicate probe artifact | **DONE** | `resolve_agents.js` gains `rulesOf()` (throws on a missing `rules.*` key) — no `\|\| 2`, no inline `['tech-lead','architect']`; `tests/fixtures/tag-probes.json` deleted and tests read `evals/roundtable/tag-probes.json`; constant echo → floor invariant; explicit reader map; probe-map ↔ tag-set equality guard; `revisit_sla` moved `policy` → `rules`. |
| A5 | Record pass | **DONE** | Review 09 → status IMPLEMENTED r3, checklist annotated (one `[~]`), §7 implementation record added; QA report dated corrections appended; 02m DoD + FC-3 row stamped with the patch status. |
| A6 | CHANGELOG pointer / numbering | **DONE** | CHANGELOG now points at `08-evolutionary-...` and titles 08/10/11 match their filenames; `02n`/`02o` "Review 11" pointers corrected to the Review 10 file. |
| A7 | Purge residue + D2 probes | **DONE** | Residue lock purged (backup: `artifacts/output/backups/step-audit-2026-09-21.json`). Probes: develop exit 1 → `scope-lock` exit 0 (`w-89f8d3694f76`) → begin exit 0 → purge → exit 1; design exit 1; shape-up exit 0; audit left `[]`. |

### Post-fix battery

- `node tests/run-all.js` → **496/496 pass, 0 fail** (was 494/494 at review time).
- `node bin/cli.js verify` → 322 files verified after regenerating `.agents/manifest.json` for the edited `.agents/` files.
- Review 09 Phase-4 probes re-run: 15/15 tag probes, untagged fallback `@tech-lead,@architect`, D2 leak/purge seats `@security-engineer`, memory/compound/author/authority/purge-cache negatives hold, `roster check` floor exit 2, scorer `coverage` exit 2, 13/13 topics, `rules.revisit_sla` read (policy copy gone).

### Revised verdicts

| Plan | Verdict | Delta |
| :--- | :--- | :--- |
| 02m — FC-3 | **[CONFIRMED]** (working tree) | was [PARTIAL]; evergreen bypass and recent-foreign-UUID bypass now reject. Residual: window-bound locks keep the ≤15-min recency fallback (design accommodation; corrected label per the 2026-09-21 roundtable — see below). |
| Review 08 | **[CONFIRMED]** | R08-F1 (`lint`) and R08-F2 (pointers/titles) closed. |
| Review 09 | **code [CONFIRMED] / record [CONFIRMED]** | R09-D1..D5 closed; record drift corrected in-place with dated attribution (09 §7, QA report correction block, 02m stamps). |

---

## Roundtable Review & RESHAPE Corrections (2026-09-21)

A native roundtable (4 seats: @developer, @architect, @code-reviewer + @qa-engineer; transcript `artifacts/evals/roundtable/transcripts/review-implementation-12_native_1.md`) reviewed the post-fix implementation. All four seats returned `[VERDICT: PARTIAL]`; synthesis `[SYNTHESIS: RESHAPE]`. Verdicts above are superseded as follows:

| Claim | Roundtable verdict | Correction applied |
| :--- | :--- | :--- |
| FC-3 closure | **[PARTIAL]** — closure wording overbroad: same-window locks never expire (rule 2, by design = session identity); the ≤15-min fallback admits any window, mislabeled "subshell" | Rescoped in `02m` DoD/§7.1 + `CHANGELOG`; code comments corrected; same-window lifetime pinned by test |
| Rule 3 + UUID fallback | Dead producer — delete | Rule 3 and the `resolveSessionId` session-current fallback removed; UUID-shaped locks are fail-closed; falsifier names updated |
| Forked-ppid fail-closed | Fresh checkouts had no anchor; `/bin/sh` test passed through the wrong branch and was Windows-fragile | `scope-lock` now creates `session-current.json` when missing; test replaced with a cross-platform forked-process wrapper; expiry/same-window tests added |
| Inflections | Whole-word matching regressed `deploys/launched/ships/OAuth`; probe map blind to the class | Surface forms completed + new inflected-phrase regression corpus test |
| `rulesOf()` | Presence-only; "malformed table" record wording falsified | Type/range validation + throw tests; 09 §7.2/CHANGELOG wording now accurate |
| Records | `02q:26` boot-time contradiction, `reserved_seat_2` relocation unrecorded, residual ownerless, Review 12's F6 pointer unsupported | All corrected forward: `02q` annotations, 09 §7.2 RT-04, residual owner @developer in `02m`, F6 residual pointer corrected from `02m §7.1` to `CHANGELOG:11` (revised-verdicts table above) |
| Router recall | Literal topic "review the implementation" missed every tag | `review` keyword added (live evidence); positive probe verified |

**Remaining accepted residuals:** same-window lock lifetime ≈ window lifetime; any-window ≤15-min admission; forked-ppid sessions expire at 15 min and must re-lock; `VESPYR_SESSION_ID` lifetime remains an unwritten harness contract; plan-vs-shipped binding gap (the `session-start timestamp` leg shipped as an install-generation floor — annotated at `execution-plan.md` Task 0.2 + risk row); `policy.reserved_seat_2` prose↔behavior traceability. **Owners:** @developer (gate residuals, roundtable assignment); @tech-lead (traceability). Full suite after corrections: **501/501 green**, `bin/cli.js verify` 322 files clean.

---

## Rounds 2–3 & CR Fixes (2026-09-22)

**Round 2 (satisfaction check):** @qa-engineer and @developer `SATISFIED [CONFIRMED]` after independent falsification (8 attacks all held; F1–F6 discharged). @architect `CHANGES REQUESTED [PARTIAL]` — three record items, all applied the same day:
1. `[SHIPPED DIVERGENCE — 2026-09-22]` stamps on `execution-plan.md` Task 0.2 + Subshell risk row (session-start leg = install-generation floor, owner @developer) + DoD#2 path correction; governing stamp in `02m` §7.1.
2. `**Owner: @tech-lead**` on `09` §7.3 traceability bullet; Review 12 residual list extended with split owners.
3. `12` A1 row marked `[SUPERSEDED]` (pre-delete rule numbering); Records-row pointer named (`02m §7.1` → `CHANGELOG:11`).

**Round 3 (final poll):** all 4 seats re-verified the delta against disk (file:line + mtime audit proving code unchanged since the 501/501 run) and answered **`SATISFIED` `[VERDICT: CONFIRMED]`** — unanimous. **`[SYNTHESIS: GO]`** recorded in the transcript; scorer exit 0; dispatch ledger verified (the interrupted Round-2 @code-reviewer check logged as `timeout`, completed in Round 3); outcomes persisted to `active-decisions.md` (2026-09-22 entry) + session summary.

**Net state:** implementation review CLOSED-GO. Only open item outside the panel: **A2 — the commit** (pending explicit owner approval).
