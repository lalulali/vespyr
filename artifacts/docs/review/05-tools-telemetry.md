# Review 05 — `tools/telemetry/` (exhaustive)

Date: 2026-09-05 | Scope: `schema.json` (87) + `modelTierGuards.js` (49) + `telemetry_display.js` (89) + `swarm_telemetry.js` (606) + `artifacts/telemetry/` samples — all read end-to-end

Canonical source: `02l-phase-1-observability-…md:267-277` (INV-TEL-01..06); `schema.json:3-5` correctly claims single ownership; 04/04a import, not redefine.

## 1. Defects

### P0
- **P0-1 Schema loaded but never enforced.** `swarm_telemetry.js:59-65` `loadCanonicalSchema()` reads the canonical file; `validateSpan:67-83` is a hand-written subset that never calls it. Schema drift undetectable at runtime; `test_schema_single_owner.test.js:48-65` asserts happy-path overlap, not equivalence.
- **P0-2 Validator under-checks required fields.** Schema (`:7`) requires `tier0_evaluation`, `error` key, `model.temperature`, `usage.{prompt,completion,cost_usd}`, full scorecard/biomarkers. `validateSpan` skips them — spans without `tier0_evaluation`/nullable keys pass `valid:true`. INV-TEL-02 unenforceable here.
- **P0-3 `recordSpan` auto-defaults mask invalid input.** `:114-130` synthesizes missing fields (`workflow:'unknown'`, zero usage, `rqs_d_score:0/REJECTED`), persists invalid spans with `SPAN_VALIDATION` error yet counts them in summaries; `verifySpans:224` empty-window `hybrid_pass:true` → zero-signal window passes CI.

### P1
- **P1-1 Tier-guard substring matching.** `modelTierGuards.js:12-17` `includes('o1'/'o3')` promotes `neo1-board`, `photo1-model`, `o12`, `micro-o3x` to Tier B (executed repro); `claude-3-opus`/`qwen2-8b`/`mistral-pro` → unknown (`pro`/`8b` exact-only). Replace with anchored regex/allowlist.
- **P1-2 Exit-2 "blocks release" false.** `:44-45` exits 2 standalone, but the production hook (`orchestrator_state.js:456-461`) only sets `span.error={TIER_DEMOTION}` and continues; no caller propagates; `swarm-tests.yml:75-82` never runs guard tests or fails on demotion. Contradicts 02l `:275`.
- **P1-3 Three `len/4` estimators vs real tokenizer.** `swarm_telemetry.js:53-56`, `telemetry_display.js:55`, `orchestrator_state.js:425` use `len/4`; canonical `tools/eval/lib/tokenizer.js:8-13` splits `/\w+|[^\s\w]/`. INV-TEL-04 15% tripwire compares inconsistently-estimated sums — signal is estimator noise. Unify on `countTokens`.
- **P1-4 Simulator pollutes production sink.** `pipeline_simulator.js:106-111` appends fake events to `artifacts/telemetry/events-*.ndjson` with no provenance tag; `generateSummary:243` + `hot_path_analyzer` mix them into real reports. Live `events-2026-09-01.ndjson` shows legacy `tokens:0` rows that `generateReport:343-346` silently drops → `avg_tokens:null` while counting invocations.
- **P1-5 Dead coupling.** `telemetry_display.js:11` imports `estimateTokensFallback` but `:55` inlines `Math.ceil(len/4)`.

### P2
- `verifySpans:234-236` redundant `hybrid_pass`/`hybridStrict`; `captureUsage:153` emits valid zero-token spans; CLI `record-span` flag parser (`:517-533`) assumes valued flags; `--total 0` falsy inconsistency (`:549` vs `:126`).
- `spans-2026-09-01.ndjson:1-5` are 5 identical fixture clones (likely `test_span_hybrid` output committed as telemetry); 02l `:313` 100%-pass cites this.
- `drift-history.json` orphaned in telemetry path; `telemetry_display.js:5` defers to `04a telemetry_surface.js` which does not exist (spec-only `04a:93-94`); `retro/step-01-hot-paths.md:24` session/hot-paths/compare refs dangle.

## 2. Fix order

1. Wire `validateSpan` through canonical schema (ajv or full required-field check); empty-window must fail.
2. Provenance flag + filter for simulator; drop legacy zero-token rows or count honestly.
3. Anchored tier regex/allowlist; unify token counting on `countTokens`; make TEL-05 fail closed or downgrade doc claim.

## 3. Coverage

All 3 telemetry files + full `swarm_telemetry.js` + sample spans/events + drift history + cross-checks (`orchestrator_state:407-471`, `pipeline_simulator`, `swarm-tests.yml`, tokenizer). Prior `len/4`-vs-judge duality refined: three `len/4` sites vs one real tokenizer.
