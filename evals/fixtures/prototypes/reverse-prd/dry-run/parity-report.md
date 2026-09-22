---
report: parity
feature: Workspace Member Management (Orbit)
prototype: evals/fixtures/prototypes/reverse-prd/workspace-members.html
prototype_type: file
inventory: evals/fixtures/prototypes/reverse-prd/dry-run/prototype-inventory.md
requirements: evals/fixtures/prototypes/reverse-prd/dry-run/requirements.md
dry_run: 02n.4/02n.5 fixture — witness stamped by spec_parity.js at freeze
frozen: 2026-09-22T00:00:00.000Z
prototype_sha256: 6c41d0489279fd10689bdad8eb1311dad73cf87106209ec190622e0aa03732bb
---
# Parity Report — Workspace Member Management (Orbit)

Reverse-mode dry-run (02n). Structural tier: ghosts / orphans / grounding / 10-class coverage / witness — script-computed, test-backed. Judged tier: anchor semantics (owner sampling, A7) and parity delta vs traditional (A8) — honestly labeled, never claimed structural.

## Metrics

| Metric | Value | Gate | Result |
|---|---|---|---|
| Ghost statements | 0 | 0 (hard) | PASS |
| Orphan behaviors | 0 | 0 or owner+date deferral | PASS |
| Grounding rate | 100% of non-`[OPEN]` | 100% | PASS |
| Detail-class coverage | 10/10 | 10/10 | PASS |
| Witness | frozen (stamped) | blocks stale at Step-0 | PASS |

**Synthesis scope (step-3d dry-run):** requirements §1–13 + `user-stories.md` (9 stories / 27 ACs, every AC row-anchored). `product-spec.md` and `design.md` follow the same looped procedure and are not materialized in this fixture.

## Detail-class coverage

| Detail class | Evidence | Status |
|---|---|---|
| Screen states | L-01, L-02, L-03, L-04, L-05 | covered |
| Edge cases & validation | L-06, L-07, L-08, L-09, L-10, L-11, L-12 | covered |
| Data fields & types | L-13, L-14, L-15, L-16, L-17 | covered |
| Permissions & auth | L-18, L-19, L-20, L-21, L-22 | covered |
| Navigation & flows | L-23, L-24, L-25, L-26, L-27, L-28 | covered |
| Copy & tone | L-29, L-30, L-31, L-32, L-33, L-34 | covered |
| Telemetry | L-35, L-36, L-37 | covered |
| Performance notes | L-38, L-39, L-40 | covered |
| Accessibility | L-41, L-42, L-43, L-44, L-45 | covered |
| Platform constraints | L-46, L-47, L-48, L-49 | covered |

## Orphan deferrals

| Anchor | Owner | Date | Reason |
|---|---|---|---|
| — | — | — | — |

## Open questions ([OPEN])

- L-51 — bulk member import: no prototype behavior observed; owner to confirm in/out of scope (mirrored to §12). Not blocking synthesis; listed here per step-02d.

## Owner sampling (A7)

Owner samples 3 of N ledger statements at R4; each anchor verified to support its claim. Proposed sample (owner disposes):

| Ledger row | Anchor | Does the anchor support the statement? | Disposition |
|---|---|---|---|
| L-08 | `workspace-members.html#validation-max-members` | {owner check} | pending owner |
| L-24 | `workspace-members.html#nav-invite-modal` | {owner check} | pending owner |
| L-35 | `workspace-members.html#telemetry-events` | {owner check} | pending owner |

## Parity delta vs traditional (A8)

First-run calibration: no prior threshold exists and none is invented. Mechanical gates stand as-is; owner disposition on this delta is mandatory and blocking before the gate is considered closed.

| Dimension | Reverse-mode dry-run | Traditional-mode baseline | Delta |
|---|---|---|---|
| AC count | 27 (US-01..US-09 × AC-H/U/E) | not built for this fixture | first-run calibration — owner disposition pending (A8) |
| Detail-class counts | 10/10 | not built for this fixture | first-run calibration — owner disposition pending (A8) |
