# Review 06 — `evals/` (exhaustive, excl. security corpus — see 03)

Date: 2026-09-05 (updated — all 11 non-invariant suites read end-to-end + all 6 transcripts) | Scope: `baseline.json`, 14 suites (106 benchmarks), 7 rubrics (all read), `fixtures/`, `meta-eval/`, `roundtable/`, `artifacts/rqs-calibration-2026-09-01.json`

## 1. Counts

| Group | File | n |
|---|---|---|
| agents | `core-swarm.json` 17, `domain-experts.json` 5, `engineering-ops.json` 6, `memory-controller.json` 2 | 30 |
| invariants | `grill-me-spcp.json` 15, `intent-routing.json` 4, `shut-up-brevity.json` 10 | 29 |
| models | `tier-comparison.json` 10 (DEV-01..10 duplicates) | 10 |
| skills | `delivery` 5, `design` 3, `discovery` 6, `meta-authoring` 11, `operations` 5, `research` 7 | 37 |

## 2. Verdict

Harness self-consistency, not model measurement. 100% pass tautological; `baseline.json` p50 3ms/p95 6ms proves zero LLM inference.

## 3. Defects

### P0
- **P0-1 Mock/answer-key synthesis** (`tools/eval/runner.js:76-84`, reported here as consumer): traps emit expected verdict+keywords; shut-up/agent/skill canned templates contain the graded keywords. Tier-0 regex-matches the same strings.
- **P0-2 Tier-1 aliased to Tier-0** (`tier1-judge.js:82-83,93,101` + default 5.0 `:52-62`). Rubrics add no independent signal; `baseline.json:11` tier1 5.0 entailed.
- **P0-3 `baseline.json` irreproducible.** Keys lack model/adapter/judge/dataset-hash/sha/seed/temp, outputs, failures, criteria results, held-out ID (`:1-15,55-67`). Unauditable, unrerunnable.
- **P0-4 Dead `req_to_impl` dimension.** Zero benchmarks use it (grep ∅) yet `baseline.json:36-40` reports 4.9/1 — impossible from `runner.js:417-431` (empty→5.0). Hand-edit or stale baseline; fabricated either way.

### P1
- **P1-1 RG-1 gameable.** `rubrics/research-grounding.json:11-14` accepts `\[\d+\]`; generator hardcodes `"[1]"` (`runner.js:136,180`). No URL/footnote/hallucination check; RG-3/4 are word-count/substring. `hallucination_rate:0` meaningless.
- **P1-2 Skill suites unexecuted stubs.** All 37 `suites/skills/*.json` lack `prompt` and `mockOutput` (script-verified); pass via canned templates. No skill invoked; no negatives.
- **P1-3 Fixtures dead.** `fixtures/simple-js/*`, `dev-tasks/rate-limiter.js` (correct, trivial) referenced nowhere — zero `runTestCommand`/`assertFiles`/`executionCommand` in suites (judge supports at `tier0:144-176`). Only consumer: `tests/cli/packaging.test.js:45` inclusion assert. No failing variant.
- **P1-4 Gold-standard n=3.** `meta-eval/gold-standard.json:1-32` (2 SPC + 1 PRD, legacy KILL/PASS tokens) mislabeled "calibration dataset". Expand to ≥50 with current tokens.
- **P1-5 Roundtable transcripts 6/36 + transcript defects.** `fixtures/transcripts/` (rt-003×5, rt-010×1) vs `README.md:55-60` 30-native+6-solo baseline; stability computable for rt-003 only. `rt-010_native_1.md:5,9,13` legacy KILL/SYNTHESIS tokens — migrate. Full-transcript read adds: (a) `rt-003_solo_1.md:15-21` carries a native-style coverage block with cross-challenges — impossible under firewalled-sequential solo dispatch (cf. `solo_2` which correctly omits it): mislabeled native or hallucinated coverage; (b) `rt-003_solo_2.md:5-17` vocabulary break (3×PASS vs PIVOT/KILL everywhere) + no coverage block + drops the DPA+redaction+eval gates `native_1:12,23`/`native_2:23` required — silent safety regression with zero dissent recorded; (c) `rt-003_native_3.md:24` `[SYNTHESIS: ADR:adr-006]` puts an escalation ref in the token slot — breaks verdict parsers (schema expects PIVOT/KILL/PASS). Plus `artifacts/evals/roundtable/runs/` holds 1 orphan (`runtime-state-relocation_native_1.md`, topic matches no `topics.json` entry) and `log.jsonl` (13 entries) contains zero `topics.json` IDs — effective baseline 6/36 (16.7%), 9/10 topics zero runs.

### P2
- `shut-up-brevity.json:8` wrong dimension (`memory_adherence` for brevity/safety); no `maxTokens` ceiling anywhere despite judge support (`tier0:38`).
- `tier-comparison.json:12` duplicates DEV tasks, adds no model contrast.
- Weakest per-benchmark assertions (all substring-gameable): DEV-02 passes on bare `"200"`/`"409"` (`core-swarm.json:139-144`, any "200 hours" hits); DEV-06 on `"error"` (`:195-200`, any traceback hits); DEV-10 on `"service"/"controller"/"refactor"/"tests"` (`:251-256`, echoing the prompt passes); SKILL-PHASE on 2 generics (`meta-authoring.json:105-113`); SKILL-BRAINSTORMING on naming `"SCAMPER"` without applying it (`discovery.json:61-69`); MEMORY-02 on emitting `"BEGIN/END MACHINE STATE"` without preserving the fence (`memory-controller.json:24-27`, a bypass not a preservation test).
- Contract mismatch: SKILL-ROUND-TABLE asserts `"Live Dialogue Stream"/"Verdict Gate"/"Consensus"` (`meta-authoring.json:28-37`), none the enforceable contract (`README.md:17-28` coverage block + `[VERDICT:]` + `[SYNTHESIS:]`) — cannot fail a non-compliant roundtable.
- Wrong dimensions: DATAANALYST-01 telemetry schema graded `code_quality` (`domain-experts.json:62-73`); SHIFU-01 curriculum graded `prd_completeness` (`:48-60`); TECHWRITER-01 OpenAPI graded `prd_completeness` while RAG/drift/CI collapse into `code_quality` (`engineering-ops.json:76-88`); ANALYZE-DATA graded `research_grounding` (`operations.json:39-48`) while JTBD graded `prd_completeness` (`research.json:62-71`) — taxonomy arbitrary per-file.
- Tier shadow invalid: TIER-09 mock lacks second fence + `handleError` block (`tier-comparison.json:81-89`, harness paths diverge in-suite); only TIER-01 carries `expectedVerdict:GO` (`:14`); all 10 `mockOutput`s hardcode `"All unit tests passing"`/`"try/catch fallback recover"` — rewards claims of tests without execution; 2-word degraded prompts vs full DEV originals, so Tier A/B cost compares different tasks.
- Per-file census: agents 30/30 prompts present; tier-comparison 10/10 `mockOutput`, 0 `assertContains` (gates only on `minRQSD:0.85`); all 37 skill benchmarks missing `prompt`; `mockOutput` 0 in agents+skills; negatives only FOUNDER-01 (`core-swarm.json:25-28`) + REVIEWER-01 (`:100-102`), other 10 files zero; `maxPci`/zero-blueprint only FOUNDER-01; `runTestCommand`/`assertFiles`/`executionCommand` zero in all 11 files (script-verified).
- Gold/topics gaps: `gold-standard.json:28` missing `expectedVerdict`; topics ship answer keys (`premise_quality` + `expected_verdict_hint`) in runtime-consumed JSON (same trap-key flaw); 7 null-hinted sound topics leave solo-vs-native divergence unanchored on 70%; zero `RESHAPE`-hinted flawed premise (NO-GO-only gate).
- Fixture mismatch: `rate-limiter.js:1-21` is already-correct code vs DEV-01 "Fix off-by-one race" (`core-swarm.json:124`) — no buggy input, no failing test, no wiring: cannot distinguish fix from echo. `dev-tasks/` ships no test or package.json.
- Invariants are the best part: `grill-me-spcp.json` 15 stratified traps (14 NO-GO + 1 RESHAPE ARCH-02, `maxPci:0`, zero-blueprint); `intent-routing.json` 2 fork + 1 bypass + 1 trivial with `assertNotContains` guards; `shut-up-brevity.json` 7 brevity + 3 destructive-confirm. Keep and extend.
- Negatives 16/106 (15%, all SPC); PRD/a11y/code/research/memory zero negatives/near-miss. No held-out split/hash/canary (grep ∅); `intent-routing` ships `mockOutput` answers; trap keys consumed by generator (prompt+answer+grader in one JSON).
- RQS calibration (`artifacts/rqs-calibration-2026-09-01.json:7-29`) n=50, r=0.81, κ 0.42/0.38, honestly shadow-gated — but ~12 samples/model, 49/50 match (range restriction), no CIs, no human-human κ, no linkage to baseline (which never computes RQS-D).

## 4. Fix order

1. Real-adapter-or-fail; move canned maps behind `--mock`+watermark; delete trap echo; de-alias Tier-1; missing rubric → fail.
2. Rebuild baseline with provenance + outputs; delete or populate `req_to_impl`.
3. Harden RG-1 (URL/footnote resolution); give every skill a `prompt` + negative; wire fixtures to `runTestCommand`/`assertFiles` with failing variants.
4. Expand gold-standard ≥50; backfill transcripts to 36; migrate legacy verdict tokens.

## 5. Coverage

14/14 suites read end-to-end (per-file n + prompt/mock/assert/negative/Pci/wiring census above); 7/7 rubrics read; fixtures 4/4 read + grep-verified dead (+ DEV-01/fixture mismatch); gold-standard, topics.json (7 sound + 3 flawed confirmed), roundtable README, all 6 transcripts read (3 transcript defects), runs/ orphan + log.jsonl noted, RQS artifact read. Security corpus excluded (see 03 — now 30/30 complete).
