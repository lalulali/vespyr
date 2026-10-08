---
feature: "{feature}"
date: "<YYYY-MM-DD>"
qa_engineer: "@qa-engineer"
verdict: "GO | CONDITIONAL | NO-GO"
---

# QA Sign-off — {feature}

**This file is the terminal gate of the pipeline.** `/develop` cannot complete without it, and
`/launch` halts if it is missing or its verdict is not `GO`/`CONDITIONAL`. Until this template
existed, no step, script, or template in the engine produced it — `/develop` would report
completion, then `/launch` would halt on a file nobody was ever asked to write.

**Verdict (bracketed, so `tools/eval/lib/ast.js` can read it):** `VERDICT: [GO]`

> Replace with exactly one of `[GO]`, `[CONDITIONAL]`, `[NO-GO]`. The bracketed form is the
> machine-readable one. `[CONDITIONAL]` is not a soft `[GO]` — every condition must be named
> with an owner and a date, and each is a blocking finding until it closes.

**One plain sentence a non-expert can act on:**
> {e.g. "The feature ships: every acceptance criterion is covered by a test, and the one open
> item is a PDF export that fails above 500 rows, owned by @developer, due before launch."}

## Evidence

Every row must cite a file that exists on disk. A citation to a file that is not present is a
fabrication (DNA 5), and the gate fails on it.

| Evidence | Path | Result |
|---|---|---|
| Orphan-AC sweep | `05-execution/quality/coverage-report.md` | orphan ACs: {0 \| N deferred} |
| 10-class fidelity review | `05-execution/quality/coverage-report.md` | `--fidelity`: {N}/10 |
| Test report | `05-execution/quality/test-report.md` | AC-H {pass/fail} · AC-U {pass/fail} · AC-E {pass/fail} |
| Security findings | `05-execution/quality/findings-report.md` | Critical {N} · High {N} |
| Performance | `05-execution/quality/performance-report.md` | {within SLA \| not applicable \| unmeasured} |

**Deferrals are capped here.** A deferral row in the coverage report carries an owner and a
date; at sign-off it either closes or becomes a named condition of a `[CONDITIONAL]` verdict.
It may not be renewed silently.

**Coverage is counted, not felt.** If no wired coverage tool produced a number, record
`coverage: unmeasured` as a spec gap. Never write a percentage you cannot reproduce.

## Conditions

Required when the verdict is `[CONDITIONAL]`. Each row is a blocking finding with an owner and
a date. `[GO]` with rows in this table is a contradiction and fails the gate.

| # | Condition | Owner | Due | Blocking? |
|---|---|---|---|---|
| C1 | {what must be true before launch} | @{owner} | YYYY-MM-DD | yes |

## Open findings carried forward

Anything unresolved that is **not** a launch blocker. Empty is the expected state for `[GO]`.

| Finding | Severity | Owner | Notes |
|---|---|---|---|
| — | — | — | — |

## Freshness

The coverage report must be newer than the newest source change. A stale report describes code
that no longer exists — `req_to_impl_check.js --freshness` detects it, and a stale report fails
this gate rather than being signed off.

- Coverage report generated: {YYYY-MM-DD}
- Newest source change: {YYYY-MM-DD}
- Verdict on staleness: {fresh \| stale — refreshed before sign-off}

## Sign-off

| Reviewer | Disposition | Date |
|---|---|---|
| @qa-engineer | `SATISFIED` | YYYY-MM-DD |
| @product-manager | `SATISFIED` | YYYY-MM-DD |
