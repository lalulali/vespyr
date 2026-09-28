# Execution Plan — Anti-Tunnel Point Coverage (A+)
**Planned:** 2026-09-28
**Planner:** @default (owner GO 2026-09-28 — "A+ full scope")
**Estimated total:** 6–9 h
**Developers needed:** 1 (sequential — shared files)
**Precedent:** 02k (surgical skill edit for meta-work; `/design` skipped as overhead)

## Scope

**In scope** (locked: `surgical-skill-edit` + `scaffold-script`):
1. Shared point-coverage contract — `.agents/references/point-coverage.md`: enumerated point set, closed dispositions, per-surface closure semantics.
2. `/round-table`: intake `POINTS:` ledger, `[FOCUS:]` / `[BREADTH:]` tunnel-breaker markers, Phase-4 blocking closure gate (````roundtable-points```` block), invariant rule 7, session `--points` cursor.
3. `.agents/scripts/roundtable_eval.js`: `points` validator (exit 0/1/2), score integration (block-carrying transcripts only — legacy no-block transcripts are unscored, never failed), tunnel advisory.
4. `/elicitation`: Step-0 critique-point enumeration + five-line Sharpening Ledger with point-coverage disclosure (non-blocking by design).
5. `/grill-me`: Step-0 subject-point enumeration + lock-time point closure (non-blocking mid-interview by design).
6. Read-only audit of `/brainstorming` + `/unpack-problem` against the contract (findings only).

**Out of scope:** machine gates for elicitation/grill-me (prose artifacts; no parseable ledger shape yet — no fake gates), frontmatter/description changes, catalog rewrites, eval baseline thresholds (baseline-first applies).

## Decisions carried in (owner GO 2026-09-28)

| # | Decision | Rationale |
|---|---|---|
| D1 | Coverage = zero silent drops against a user-confirmed enumeration — not omniscience | "100% covered" is unfalsifiable without an enumerated set + closed states |
| D2 | Two axes: agenda points + topic facets | Tunneling has two shapes: multi-ask collapse and single-angle drill |
| D3 | Closure semantics per surface: blocking gate (round-table) / disclosure (elicitation) / lock-time closure (grill-me) | Uniform gating would make refinement and interview surfaces worse |
| D4 | Facets are topic-proposed at intake, user-confirmed — not a fixed universal taxonomy | Fixed checklists invite performative coverage (thinChallenges defect) |
| D5 | Machine gate only where the artifact is parseable (round-table transcripts); legacy no-block transcripts unscored | No fake gates; dated transcripts are never rewritten |
| D6 | Tunnel detection advisory, uncalibrated | Baseline-first; focus depth is legitimate — only silent abandonment is not |

## Task list

| ID | Task | Est. (h) | Depends On | Assignee | Done |
|---|---|---|---|---|---|
| T001 | `.agents/references/point-coverage.md` — shared contract | 0.5 | — | @default | [x] |
| T002 | `/round-table` SKILL.md — intake ledger, tunnel-breaker, Phase-4 closure gate, rule 7, multi-turn + session `--points` | 1.5 | T001 | @default | [x] |
| T003 | `roundtable_eval.js` — `parsePoints` + `points` cmd + score integration + session `--points` + header/usage | 1.5 | T002 | @default | [x] |
| T004 | Fixtures (`points-pass.md`, `points-fail.md`) + tests (eval, skills, contracts) | 1.5 | T003 | @default | [x] |
| T005 | `/elicitation` SKILL.md — Step-0 enumeration + five-line ledger + indirect-mode note | 0.5 | T001 | @default | [x] |
| T006 | `/grill-me` SKILL.md — Step-0 enumeration + Step-4 note + Step-5 closure + anti-pattern | 0.5 | T001 | @default | [x] |
| T007 | `evals/roundtable/README.md` — transcript contract, commands, metrics | 0.5 | T003 | @default | [x] |
| T008 | Registry row + audit findings (brainstorming/unpack-problem, read-only) | 0.5 | T001–T007 | @default | [x] |
| T009 | Verify — `node --check`, targeted tests, `npm test`, plan reservation, frontmatter, manifest regen + verify | 1.0 | T004–T008 | @default | [x] |

## Dependency graph

```
T001 → T002 → T003 → T004 ─┐
T001 → T005 ───────────────┼→ T009
T001 → T006 ───────────────┤
T003 → T007 ───────────────┘
T008 after T007
```

Single-file/script edits — sequential in one session; no worktrees.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Score gate breaks legacy transcripts (no points block) | High if careless | High | Presence-gated scoring: no block → unscored, surfaced, never failed; tests pin it |
| Points ledger degenerates into performative dispositions ("covered — discussed") | Med | Med | Advisory thinness floor (`MIN_POINT_FINDING_CHARS`); deferred requires owner+reason; out-of-scope requires quoted boundary; reviewer-tier stays with eval scoring |
| Tunnel advisory false positives on legitimate single-point sessions | Med | Low | Advisory only; suppressed when <2 points declared; global `[BREADTH:]` suppression documented as uncalibrated |
| Elicitation/grill-me additions bloat humane/short surfaces | Med | Med | Bounded lists (≤7), closure-only (no mid-interview enforcement), no machine gates |
| Concurrent session touches the same skills | Low | Med | Session-start parallel check clean 2026-09-28; single-session execution |

## State machine integration

`node .agents/scripts/orchestrator_state.js complete --agent default --artifact 02r-phase-1-anti-tunnel-point-coverage.md`

## Execution log — 2026-09-28

**[CONFIRMED] — implementation complete, all gates green.**

**Shipped (11 files):**
- `.agents/references/point-coverage.md` (new canon: enumerate → confirm → bounded focus → closed dispositions; closure semantics per surface).
- `.agents/skills/round-table/SKILL.md` — Activation step 7 (`POINTS:` intake + confirmation + session `--points`), Phase-2 tunnel-breaker (`[FOCUS: Pn]`, `[BREADTH:]` after 2 consecutive rounds), Phase-4 blocking closure gate (````roundtable-points````, validate via `roundtable_eval.js points`), invariant rule 7, multi-turn ledger maintenance.
- `.agents/scripts/roundtable_eval.js` — `parsePoints` / `extractFocus` / `tunnelCheck` / `cmdPoints` (exit 0/1/2); score integration (presence-gated: no-block transcripts unscored + listed, block-carrying gap fails the gate); `session --points` cursor; header/usage/export updates.
- `.agents/skills/elicitation/SKILL.md` — Step-0 critique-point enumeration; Sharpening Ledger four → five lines with a `Critique coverage` disclosure line; indirect-mode coverage line.
- `.agents/skills/grill-me/SKILL.md` — Step-0 subject-point enumeration (3–7, logged in decision-log header); Step-4 unexamined-point check; Step-5 `Point closure:` line; anti-silent-drop anti-pattern.
- `evals/roundtable/README.md` — transcript contract item 4, `points` command, point-coverage metric row, tunnel-advisory note.
- `evals/roundtable/fixtures/points-pass.md` + `points-fail.md` (new).
- Tests: `tests/test_roundtable_eval.test.js` (+6), `tests/skills/round-table.test.js` (+1), `tests/skills/grill-me.test.js` (+1), `tests/test_skill_contracts.test.js` (+2).
- `artifacts/docs/strategy/development-plan/README.md` registry row + this plan.

**Verification evidence:**
- CLI smoke: pass exit 0 (`3 point(s), all dispositioned`), gap exit 1 (names `P2`), missing block exit 2, deferred-without-owner exit 2, out-of-scope-without-quoted-boundary exit 2, duplicate disposition exit 2.
- Targeted: 91/91 (eval + 3 contract files). Full suite: **678/678 pass, 0 fail** (`npm test`, 69.3s).
- `validate:frontmatter`: 20 agents + 101 step files valid. `check_plan_reservation`: 41 plan files registered.
- `bin/cli.js manifest` → 346 files; `bin/cli.js verify` → **All 347 files verified**.

**Audit findings (read-only — brainstorming / unpack-problem):**
- `/brainstorming`: frame-covered (method selection + SPC + per-idea gate); point layer absent — the sharpened topic's facets are not enumerated, so one method's output can dominate without sweeping risk/constraint angles. Severity: low-medium. Mitigation already live: its Step 4b routes into the new round-table `POINTS:` intake. **Deferred** (no evidence of real drops; adopting would mean a facet list at Step 1 + closure line in the session artifact — evidence-first).
- `/unpack-problem`: step-gated and zero-solution-enforced; pain-point intake is singular and untracked — multiple user pain points can collapse into one journey/root-cause thread with no disposition ledger; the brief gate gates the solution concept, not pain-point coverage. Severity: medium-low. **Deferred** (if adopted: enumerate intake pain points at step-01, dispose each in step-04 brief).

**Scope note (transparency):** manifest regen updated both `.agents/manifest.json` and `.agents/.vespyr-manifest.json`; the latter's file list also absorbed pre-existing sibling-session files (`anti_generic_check.js`, `motion_*`, `prototype_collab_gate.js`, `setup_git_hooks.js`, `template_conformance.js`, `lib/language_resolver.js`, product templates). Reverting is impossible without breaking `verify` — carried forward as-is, by design.

**Residuals (owned, not dropped):**
- Machine gate exists only for round-table transcripts; elicitation/grill-me are prose contracts by design (no fake gates).
- Tunnel advisory is uncalibrated (baseline-first); single live dogfood run of the new `POINTS` intake is recommended before treating the advisory as signal.
- `evals/roundtable/README.md` "Deferred" section unchanged: orchestrator-invoked validation remains the convention until baseline evidence justifies a write-time hard gate.
