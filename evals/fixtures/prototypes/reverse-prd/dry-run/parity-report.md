---
report: parity
feature: Workspace Member Management (Orbit)
prototype: evals/fixtures/prototypes/reverse-prd/workspace-members.html
prototype_type: file
inventory: evals/fixtures/prototypes/reverse-prd/dry-run/prototype-inventory.md
requirements: evals/fixtures/prototypes/reverse-prd/dry-run/requirements.md
dry_run: 02n.4/02n.5 fixture — witness stamped by spec_parity.js at freeze
frozen: 2026-09-22T19:00:00.000Z
prototype_sha256: 73787b0111086a682f0d83ce4ee656f8fb4e6689a1bcfeffa514357f2e6a7c20
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

Owner samples 3 of N ledger statements at R4; each anchor verified to support its claim.

**Round 1 — 2026-09-22: 3 of 51 sampled, ALL REJECTED (owner).**

| Ledger row | Anchor | Does the anchor support the statement? | Disposition |
|---|---|---|---|
| L-08 | `workspace-members.html#validation-max-members` | No — element sits behind the invite modal; opening the anchor showed nothing ("cannot open the page") | rejected 2026-09-22 (owner) |
| L-24 | `workspace-members.html#nav-invite-modal` | No — only the members page opens; the modal did not open from the anchor or the visible CTA | rejected 2026-09-22 (owner) |
| L-35 | `workspace-members.html#telemetry-events` | No — annotation block invisible in the rendered page | rejected 2026-09-22 (owner) |

**Remediation — 2026-09-22 (fixture defects found by round 1):** deep-link reveal added (`file.html#anchor` now opens the dialog, switches state, unhides the target, and opens its annotation); every "Invite teammate" CTA wired (the empty-state button was dead); all 22 annotation blocks converted to openable `<details>`; witness re-stamped.

**Round 2 — 2026-09-22 (same three rows): 2 SUPPORTED, 1 not yet.**

| Ledger row | Disposition round 2 |
|---|---|
| L-08 `#validation-max-members` | **supported** — owner: "is correct" (2026-09-22) |
| L-35 `#telemetry-events` | **supported** — owner: "open correctly" (2026-09-22); owner finding: annotation clutter on the members page → fixed (all 22 blocks wrapped in one collapsed group) |
| L-24 `#nav-invite-modal` | **not yet** — owner observed both anchors landing in the same dialog with L-08's error state carrying over, so the two rows looked identical. Cause: reveal state leaked across navigations → fixed (each navigation resets the previous unhide; dialogs close when you leave them). Round 3: open `#nav-invite-modal` fresh → expect a clean invite modal (email/role/message, no leftover error). |

**Round 3 — 2026-09-23: L-24 SUPPORTED (owner: "all good now"). A7 CLOSED — 3/3 sampled rows verified.**

Witness re-stamped after each remediation (prototype changed → old hash correctly went stale every time).

## Parity delta vs traditional (A8)

First-run calibration: no prior threshold exists and none is invented. Mechanical gates stand as-is; owner disposition on this delta is mandatory and blocking before the gate is considered closed.

| Dimension | Reverse-mode dry-run | Traditional-mode baseline | Delta |
|---|---|---|---|
| AC count | 27 (US-01..US-09 × AC-H/U/E) | not built for this fixture | first-run calibration — owner disposition pending (A8) |
| Detail-class counts | 10/10 | not built for this fixture | first-run calibration — owner disposition pending (A8) |
