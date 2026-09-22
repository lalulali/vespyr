---
report: parity
feature: "{feature}"
prototype: "{repo-relative path or source pointer}"
prototype_type: file
inventory: "{inventory path}"
requirements: "{requirements path}"
---

# Parity Report — {feature}

Reverse-mode gate (02n step-04d). **Structural tier** (script-computed, test-backed): ghosts / orphans / grounding / 10-class coverage / witness. **Judged tier** (honestly labeled, never claimed structural): anchor semantics (owner sampling, A7) and parity delta vs traditional (A8).

## Metrics

| Metric | Value | Gate | Result |
|---|---|---|---|
| Ghost statements | {n} | 0 (hard) | {PASS/FAIL} |
| Orphan behaviors | {n} | 0 or owner+date deferral | {PASS/FAIL} |
| Grounding rate | {%} of non-`[OPEN]` | 100% | {PASS/FAIL} |
| Detail-class coverage | {n}/10 | 10/10 | {PASS/FAIL} |
| Witness | {SHA-256 / pointer+timestamp+snapshot hash} | blocks stale at Step-0 | {PASS/FAIL} |

## Detail-class coverage

| Detail class | Evidence | Status |
|---|---|---|
| Screen states | {L-NN, ... or anchor} | {covered / N/A: reason} |
| Edge cases & validation | {…} | {…} |
| Data fields & types | {…} | {…} |
| Permissions & auth | {…} | {…} |
| Navigation & flows | {…} | {…} |
| Copy & tone | {…} | {…} |
| Telemetry | {…} | {…} |
| Performance notes | {…} | {…} |
| Accessibility | {…} | {…} |
| Platform constraints | {…} | {…} |

## Orphan deferrals

| Anchor | Owner | Date | Reason |
|---|---|---|---|
| — | — | — | — |

## Open questions ([OPEN])

- {L-NN — question, mirrored to requirements §12}

## Owner sampling (A7)

Owner samples 3 of N ledger statements; each anchor verified to support its claim. Blocking until disposition is recorded.

| Ledger row | Anchor | Does the anchor support the statement? | Disposition |
|---|---|---|---|
| {L-NN} | {anchor} | {owner check} | {pending / confirmed / rejected} |

## Parity delta vs traditional (A8)

First-run calibration: no threshold is invented; owner disposition is mandatory and blocking.

| Dimension | Reverse-mode run | Traditional-mode baseline | Delta |
|---|---|---|---|
| AC count | {n} | {n / not built} | {first-run} |
| Detail-class counts | {n}/10 | {n/10} | {first-run} |
