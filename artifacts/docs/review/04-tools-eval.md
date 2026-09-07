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
