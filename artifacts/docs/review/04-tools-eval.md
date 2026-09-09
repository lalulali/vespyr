# Review 04 — `tools/eval/` (exhaustive)

Date: 2026-09-05 | Scope: `runner.js`, `tier0-judge.js`, `tier1-judge.js`, `baseline.js`, `sandbox.js`, `lib/` (biomarkers/ast/tokenizer/process), `adapters/index.js`, `reporters/` — all read end-to-end

## 1. Verdict

Default `npx vespyr-eval` is **self-grading**. Circularity CONFIRMED, Goodhart 106/106 CONFIRMED under mock adapter, "exit code 2 gates" claim FALSIFIED (no such exit exists — regression is advisory banner text only).

## 2. The circular loop (three stages)

1. **Mock oracle** (`runner.js:64-247`): priority `adapter → executionCommand → mockOutput(:76-78)` → adversarial trap echo of the answer key (`:81-85` derives output from `expectedVerdict`+`expectedFlawKeywords`) → shut-up canned (`:88-114`) → per-agent canned 20× (`:117-162`, e.g. developer `:122` keyword salad) → per-skill canned 30+ (`:165-243`). `resolveAdapter` returns `null` by default (`adapters/index.js:259-271`), so every benchmark falls through to mocks (`runner.js:361-364`).
2. **Tier-0 substring** (`tier0-judge.js:38-176`): real checks exist (token ceiling, RQS-D, AST/PCI, zero-blueprint, SRSR, assertContains, file-existence, test-command exit) but operate on the mock's own vocabulary.
3. **Tier-1 rescue** (`tier1-judge.js:52-122`): `requiredPatterns` passes if benchmark `assertContains` passed (`:80-84`); missing rubric → 5.0 pass (`:52-62`); fallback passes on keyword fragment / `benchmarkContainsPass` / `length > 20` (`:96-103`); `minWordCount` waived under brevity or assertContains (`:87-93`). Score clusters at 5.0 once Tier-0 passes.

Reward hacks (verified): `mockOutput` with expected substrings; `assertContains: ["Operation completed"]` on shut-up; adversarial suites need no model; new `dimension` with no rubric = perfect 5.0.

## 3. Fabrication & accounting

- Dimensions hardcoded: `hallucination_rate = 0.0` (`runner.js:453`), `build_pass_rate = test_pass_rate = dimPassRate` (`:455-456` tautology), `scope_drift = 0.0` (`:458`); empty dims perfect 5.0/1.0 (`:417-431`); `pbcr = 1.0 - srsr` identity (`:451`).
- `tier1Score` skipped→5.0 (`:293`); P50/P95 off-by-one no-interp (`:400-401`); `failFast` drains other workers + `passRate` uses pre-filter total (`:377-393`); malformed suites swallowed (`:41-43`).
- Tier-0 gaps: PCI default-lie (`:82-87` comment vs `maxPci !== undefined` code); `requireRQSD:false` still enforces (`:58`); naive `split(" ")` (`:166`); exit-code-only test assert; substring file-content check.
- Tier-1: unguarded `RegExp` (`:77,81`) misreports rubric bugs as model failures; "Calibrated Semantic" header overclaims (no LLM, no calibration).
- Baseline: gates (`:93-124`) guard the mock; score erosion invisible (`:146-153` only PASS→FAIL); FAIL→PASS ignored; `recordBaseline:24-64` overwrites, hardcoded `harness_version:"1.0.0"` vs `2.0.0`; `loadBaseline` swallows parse errors; `passRate??1.0` greens empty runs.

## 4. Sandbox / adapters (P0 security — blocks real-model scale-up)

- `sandbox.js:79-84` `sanitizedEnv` = `{...process.env}` (name-only); `runOpts.env` overrides workspace keys (`:97-102`); `process.js:13` defaults `env=process.env`; unbounded stdout concat (OOM); `timeoutMs||10000` kills `0`.
- `sandbox.js:37-49` `statSync` follows symlinks (host-read into sandbox, loop DoS); no size/count caps.
- `adapters/index.js:16-24` path traversal (`agent='../../etc/passwd'`) → content POSTed as system prompt (arbitrary-read + exfil); full persona `.md` shipped unredacted (`:71,120,164,208`).
- `cliAdapter :29-57` `shell:true` + full env + `VESPYR_PROMPT` dup, no `maxBuffer` cap.
- `executionCommand`/`runTestCommand` `split(' ')` + no allowlist (`process.js:9-25`, `runner.js:70-73`, `tier0:165-171`) = benchmark-JSON RCE.
- `resolveAdapter` null→mock coercion must throw; typo'd adapter silently greens runs.
- `sandbox.js:16-33` exit-handler hijack hostile to host runner.

## 5. Metrics / provenance

- SCR returns 1.0 with no fence/frontmatter (`biomarkers.js:26-43`); MSHA single-`##` passes (`:45-57`); AC-testability 1.0 on zero Gherkin (`:59-70`); RQS-D decoration-only by default (`tier0:58-71`).
- PCI anchor = first matching heading (`ast.js:124-148`); no heading → PCI~0.9 on legit code; only gated if `maxPci` set; `baseline.js:110-115` then false-positives any `pci>0`. `violatesZeroBlueprintOnNoGo` ignores placement (`ast.js:152`).
- Tokenizer mixed with provider `usage.total_tokens` in one sum feeding the 15% gate — incommensurable units (no `len/4` duality; worse).
- Zero provenance: no `model_id/adapter/temp/sha`/thresholds/`modelTier` in baseline (runner collects `:290`, baseline strips); cross-model diffs invalid.
- Reporters: `pbcr=1.0`/`100%` defaults mask missing data (`console:56,68`); unguarded `.toFixed` throws on malformed; no table escaping.

## 6. Fix order

1. Fail closed on null adapter; move all canned maps behind `--mock` with watermark excluded from pass-rate; delete trap echo.
2. Remove Tier-1 `benchmarkContainsPass` rescue; missing rubric → `1.0`/fail; enforce `maxPci:0.0` on traps; fix `requireRQSD:false`.
3. Harden sandbox/adapters (allowlist env, `lstatSync`+caps, traversal guard, `shell:false`, command allowlist, redaction) BEFORE any real-model 200-item scale-up.
4. Implement exit-2 gate or delete claim; gate score erosion + FAIL→PASS flips; pin provenance (model/adapter/temp/sha/thresholds).
5. Require SCR/MSHA/AC real contracts instead of vacuous 1.0 defaults.

## 7. Coverage

All 11 files end-to-end incl. both line-level branches cited; prior tokenizer-duality claim corrected (grep-clean for `len/4` in eval — duality was `telemetry_display` vs judge, kept in 05).

## 8. Implementation log — de-circularization batch (shipped 2026-09-06)

Panel: Kai + Nina + Victor, then follow-up confirms (all GO/CONFIRMED/PASS; Nina SATISFIED excl. commit).
- **Runner:** fail-closed mock gate (explicit `--mock`/`--adapter mock` or throw Refusing-to-self-grade); `[MOCK]` watermark on canned + fixture outputs; `mock` provenance per result + `mockMode` summary + console banner; empty dims → `{measured:false, score:null}` + `unmeasuredDimensions`; tier1Score/tier1Avg nulls; P95 nearest-rank; quote-aware splitter (shared with tier0 via lib/process).
- **Tier-1:** assertContains rescue removed (requiredPatterns/minWordCount/fallback keyword-only); missing rubric fails closed (1.0).
- **Tier-0:** requireRQSD:false opt-out honored; numeric thresholds supported; trap maxPci defaults 0.0.
- **CLI/packaging:** `--mock` flag; eval scripts force `--adapter mock`; record-baseline refuses mock runs at default path (explicit override only); mock numbers live in `evals/mock-baseline.json` (mock_mode:true, 43/106 @ 3.36); fabricated `evals/baseline.json` deleted; packaging contract updated.
- **Verification:** 23/23 eval-harness tests (rewritten all-green → contract + 5 reds); full suite 362/362.
- **Accepted residuals:** trap echo survives inside labeled mock mode; rubric co-authorship needs held-out reform; vacuous RQSD unenforced by default; mock telemetry labeled-not-suppressed; R-2 stamp blocked on commit (user deferred).

## 9. Implementation log — hardening batch (shipped 2026-09-08)

Closes the remaining §3–§5 findings. 24 new contract tests in `tests/test_eval_review04_hardening.test.js`; one existing assertion updated to the honest contract (`test_model_adapters.test.js`: provider tokens no longer mixed into `tokens`).
- **Trap echo deleted** (`runner.js`): canned adversarial-trap fixture no longer derives output from `expectedVerdict`+`expectedFlawKeywords`. Mock runs go RED on all 15 traps (SRSR 1.0 on `invariants/grill-me-spcp`); mock-baseline regenerated at 27/104 @ 3.08 (was 43/106 — old file was additionally stale: 2 removed game benchmarks).
- **Fabrication removed** (`runner.js`, `baseline.js`): `hallucination_rate`/`build_pass_rate`/`test_pass_rate`/`scope_drift`/`script_fidelity` are `null` (unmeasured) instead of 0.0/tautologies; `pbcr` kept as `1−srsr` but labeled `pbcr_derived:true`; empty runs score `passRate 0` (was 1.0); exception path `tier1Score:null` (was 1.0); CLI exits 3 on 0-benchmark runs.
- **Accounting fixed** (`runner.js`): failFast stops ALL workers via shared flag + `failFastTruncated`/`evaluated` reported; malformed suites surface as `suiteWarnings` (was silent swallow); `executionCommand` validated against the allowlist.
- **Tier-0** (`tier0-judge.js`): `expectedFlawKeywords` RegExp guarded (suite bug ≠ model failure); hard invariants skip N/A biomarkers (SCR null); `runTestCommand` validated + optional `assertTestOutput` beyond exit-code-only; `timeoutMs ??` (0 no longer becomes 10s).
- **Tier-1** (`tier1-judge.js`): all rubric RegExp compilations guarded with `Invalid rubric pattern` rationale; "Calibrated Semantic" header + CLI help corrected to deterministic (no LLM, no calibration).
- **Sandbox P0** (`sandbox.js`, `lib/process.js`): env allowlist replaces `{...process.env}` (secrets never enter); `runOpts.env` filtered, `VESPYR_WORKSPACE`/`VESPYR_EVAL_SANDBOX` unoverridable; `lstatSync` refuses symlinks + copy caps (1000 files/10 MiB/1 MiB/20 depth); 1 MiB output cap with `truncated` flag; exit handlers idempotent and never `process.exit` past a host handler.
- **Adapters** (`adapters/index.js`): persona loader traversal-guarded (bare `[a-z0-9-]` + resolved-path check), secret-line redaction, 8k cap; `cliAdapter` uses `shell:false` + split args + explicit env (no full-env, `VESPYR_PROMPT` dup removed) + `maxBuffer`; `resolveAdapter` throws on unknown names (typo'd adapter can no longer silently green a run).
- **Metrics** (`lib/ast.js`, `lib/biomarkers.js`): PCI anchor falls back to verdict line, 0.0 when no decision surface exists (was ~0.9 false positive on legit code); zero-blueprint placement-aware (post-NO-GO code only); SCR/AC return `null` (N/A) instead of vacuous 1.0 with weight renormalization; N/A checks render `SKIP`.
- **Provenance** (`runner.js`, `baseline.js`): every run carries `{adapter, model, temp, mock_mode, node_version, git_sha, thresholds}`; per-benchmark `model_tier/mock/token_source/provider_tokens`; `harness_version` read from `package.json` (was hardcoded `1.0.0`); `recordBaseline` keeps `.prev.json` backup; `loadBaseline` throws on corruption (was swallowed as fresh); `diffAgainstBaseline` adds `SCORE_EROSION` (>0.5 tier-1 decay), `BENCHMARK_IMPROVEMENT` FAIL→PASS tracking, `MOCK_MODE_MISMATCH` gate, `??0` defaults (was `??1.0`).
- **Tokens** (`runner.js`): `tokens` always local count; provider `usage` in `providerTokens`/`totalProviderTokens`, never in the inflation-gate sum.
- **Reporters**: crash-proof numeric helpers (malformed → N/A), pipe/newline escaping in tables, mock banner in markdown, truncation/provenance/warnings/improvement rows.
- **Verification:** new 24/24 + eval-harness/biomarkers/tripwire/adapters all green; full suite 411/411.
- **Accepted residuals:** rubric co-authorship still needs held-out reform (mock fixtures share vocabulary with judges by construction); `budget_violations` remains the only measured memory-adherence signal; `VESPYR_EVAL_ALLOW_ALL_COMMANDS=1` escape hatch is deliberate; git SHA only from env (`VESPYR_GIT_SHA`/`GITHUB_SHA`), no subprocess probe.

## 10. Implementation log — residuals batch (shipped 2026-09-09)

Closes all four §9 residuals. 11 new contract tests (hardening file now 35/35); full suite 422/422.
- **Held-out rubric mechanism** (`tier1-judge.js`, `runner.js`): benchmarks may pin an independently-authored rubric via inline `benchmark.rubric` or `benchmark.rubricFile` (traversal-guarded loader `loadRubricFile`, corrupt/missing files fail closed). Every Tier-1 result records `rubricSource` (`override` | `held-out-inline` | `held-out-file` | `dimension-default`), persisted per benchmark by `recordBaseline`.
- **Co-authorship overlap detection** (`tier1-judge.js`): `coauthorshipOverlap` compares rubric `requiredPatterns` strings against the benchmark's own `assertContains` (normalized containment, not match outcomes — identical strings measure one authoring decision). `tier1Overlap` fraction + `tier1Coauthored` flag (≥0.5) on every Tier-1 result; run summary carries `tier1Independence {evaluated, coauthored, coauthored_ids, held_out, held_out_ids}`. First measurement on current suites: 78 evaluated, 5 co-authored (`AGENT-PM-01`, `AGENT-DESIGNER-01`, `AGENT-MEMORY-01`, `SKILL-VALIDATE-IDEA`, `SKILL-RETRO`) — flagged for held-out re-authoring, not silently scored.
- **RQS-D floor** (`bin/vespyr-eval.js`, `runner.js`): `--min-rqsd <0..1>` global floor applies only to benchmarks with no explicit RQS-D contract — explicit `requireRQSD:false` opt-outs and benchmark-level thresholds always win. Pinned in provenance (`min_rqsd`, `thresholds.rqsd_floor`). Default (no flag) unchanged.
- **Git SHA probe** (`runner.js`): `resolveGitSha()` — env override first, then bounded read-only `git rev-parse --short HEAD` (2s timeout, stderr silenced, hex-validated, never throws). Mock-baseline now pins a real SHA (`354a261`) instead of null.
- **Measured script_fidelity** (`tier0-judge.js`, `runner.js`): opt-in `benchmark.requiredSteps` contract (guarded patterns) yields `metrics.script_steps {matched, total}` + Tier-0 failure on gaps; `memory_adherence.script_fidelity` is the mean over declaring benchmarks, null otherwise. `budget_violations` retained.
- **Mock/measured split aggregates** (`runner.js`, reporters, `baseline.js`): every run reports `split {measured, mocked} {count, passed, pass_rate, tokens}`; console/markdown surface both lines on mixed runs; baselines persist `measured_benchmarks`/`mocked_benchmarks`. Mock numbers remain labeled AND separable — no blended headline passes silently.
- **Verification:** 35/35 hardening tests; full suite 422/422; mock-baseline regenerated (104 benchmarks, split 0/104, independence 5/78 co-authored).
- **Accepted residuals (remaining):** the 5 flagged co-authored benchmarks need content-level held-out re-authoring (rubric/fixture vocabulary split — a writing task, mechanism now supports it); `VESPYR_EVAL_ALLOW_ALL_COMMANDS=1` stays deliberate; R-2 stamp still user-deferred.

## 10b. Held-out candidates drafted (2026-09-09, pre-staged — NOT evidence)

Four candidate files (new, nothing overwritten; suites/rubrics/baselines untouched):
`evals/rubrics/prd-completeness.heldout-01.json`, `a11y-design.heldout-01.json`, `memory-adherence.heldout-01.json` (shared by AGENT-MEMORY-01 + SKILL-RETRO), `sycophantic-premature-convergence.heldout-01.json`.
- **Contract:** same criterion ids/weights/passThreshold as the dimension defaults (identical scoring math — a score gap then means vocabulary dependence, not a different test); only overlapping `requiredPatterns` re-evidenced through disjoint terms. Locked by test (`Held-out candidates - same scoring math, disjoint evidence vocabulary`).
- **Gap measurement on current mock outputs** (default → held-out): PM-01 5.0→3.0, DESIGNER-01 5.0→1.8, MEMORY-01 4.2→2.6 (all PASS→FAIL — confirms the perfects were vocabulary luck); VALIDATE-IDEA 4→3; RETRO 2.6→2.6 (failure sits in word-count criteria, pattern swap inert).
- **WARNING — read before using:** a held-out FAIL does NOT mean the output is bad (PM-01's canned PRD has real Gherkin ACs; the candidate simply demands different words). The gap is a property of the judge pair, not the output. All four files carry `review_status: UNREVIEWED`.
- **Blind-review gate (human task):** an author with NO access to suite fixtures reads each candidate's criterion `note`s and confirms/rewrites the alternative patterns as fair operationalizations of the named intent; on approval, flip `review_status` to `REVIEWED:<date>` and wire via `rubricFile` on the benchmark. Until then these files judge nothing.
