# Round-Table Eval Harness

Measures whether the `/round-table` protocol produces what it claims: independent positions, real friction, enforced coverage, stable verdicts. Built by @ml-ai-engineer (2026-08-28) after review finding the protocol shipped with zero measurement.

## Components

| Piece | Path | Role |
|---|---|---|
| Validator/scorer/logger | `.agents/scripts/roundtable_eval.js` | live coverage gate + offline metrics + mode telemetry |
| Gold topic set | `.agents/evals/roundtable/topics.json` | 10 stress-test topics, 3 with flawed premises |
| This protocol | `.agents/evals/roundtable/README.md` | run procedure + metric definitions |

## Transcript contract

Every recorded roundtable is a `.md` file named `<topic>_<mode>_<run>.md` (mode: `native` | `solo`) containing:

1. **Coverage block** (mandated by SKILL.md Phase 2):
   ````
   ```roundtable-coverage
   panel: @product-manager, @ml-ai-engineer, @security-engineer
   challenges:
   - @ml-ai-engineer -> @product-manager: <unstated assumption targeted>
   - @product-manager -> @security-engineer: <boundary blindspot targeted>
   - @security-engineer -> @ml-ai-engineer: <invalid invariant targeted>
   ```
   ````
2. **Per-panelist verdict lines**: `[VERDICT: PASS|PIVOT|KILL]` (Decision Gate) or `[VERDICT: CONFIRMED|PARTIAL|FALSIFIED]` (Review Gate), as the final line of each position.
3. **Outcome line** in Phase 4: `[SYNTHESIS: PASS|PIVOT|KILL]` or `[SYNTHESIS: ADR:<adr-id>]`.

## Commands

```bash
node .agents/scripts/roundtable_eval.js coverage --file <transcript.md>   # exit 0/1/2 — live Phase-3 gate
cat <<'EOF' | node .agents/scripts/roundtable_eval.js coverage            # stdin variant
node .agents/scripts/roundtable_eval.js score --dir <dir> [--json]        # offline metrics
node .agents/scripts/roundtable_eval.js log --mode <native|solo|refused> --topic "..." --agents "@a,@b"
```

## Metrics

| Metric | Definition | Healthy signal |
|---|---|---|
| Coverage compliance | share of transcripts whose `roundtable-coverage` block parses with zero unchallenged panelists | 1.0 — this one is a hard gate, not a trend |
| Round-1 disagreement | per transcript: `1 − (modal verdict share)` over Decision-Gate verdicts | > 0 on sound premises; zero is an SPC advisory |
| SPC flag | round-1 unanimity (disagreement = 0) | advisory only — **unanimous `[KILL]` on flawed-premise topics is correct behavior**, not sycophancy; read jointly with premise table |
| Verdict stability | across ≥3 native runs of one topic: share of runs matching the modal `[SYNTHESIS]` | establish baseline first; no gate until then |
| Solo-vs-native divergence | share of solo runs whose `[SYNTHESIS]` differs from the topic's native modal synthesis | tracked, not gated — quantifies D3's "degraded" claim |

**No thresholds are enforced yet.** Baseline-first applies to the harness itself: record 3 native runs per topic, then set gates from observed distributions. Premature thresholds would be cargo cult.

## Run procedure (baseline pass)

1. For each of the 10 topics: run one native roundtable, save transcript to `runs/<topic>_native_<n>.md`, run `coverage` (must exit 0).
2. Repeat to 3 native runs per topic — verdict stability needs ≥3 samples.
3. Solo comparison on a 3-topic subset (cost control): 2 solo runs each, saved as `<topic>_solo_<n>.md`.
4. `score --dir runs/` — record the report. Gates are proposed only after this baseline exists.

## Deferred (gated, do not pull forward)

- **Self-consistency verdict sampling** (2–3 independent verdict samples per panelist, modal-clustered): implement only after the baseline pass produces stability numbers; otherwise its cost/benefit is unquantifiable — the exact inversion this harness exists to fix.
- Coverage-block validation is orchestrator-invoked, not harness-enforced at write time; if compliance drifts below 1.0 across a baseline pass, promote to a `step_tracker`-style hard gate.
