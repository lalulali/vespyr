# Execution Plan — Agent Capability & Teamwork (Full Scope)

**Planned:** 2026-09-29
**Planner:** @code-reviewer (Scout) — owner directive: "let all agents improve themselves and each other until they are satisfied with their own capability and their teamwork; remove unrelated capabilities if needed; not formatting — true agent capabilities."
**Owner decision (2026-09-29):** Track C — capability audit + fixes + eval coverage + full round-table, with the F1–F6 review findings fixed first.
**Estimated total:** 14–18 h agent time, staged across 5 phases.
**Developers needed:** 1 sequential implementer + round-table subagents (Phase 4 groups).

---

## Why this plan exists

The 2026-09-29 review + Phase 1 audit (this plan, `artifacts/docs/review/10-agent-capability-audit.md`) found that agent capability claims are substantially unwired:

| Signal | Value |
|---|---|
| Declared capability labels | 110 across 20 agents |
| Labels referenced by a skill/script/reference/template/test (KEEP) | 28 |
| Labels referenced only by other agents (CROSS-AGENT) | 2 |
| Labels referenced only in plans/docs (DOC-ONLY) | 46 |
| Labels referenced only by the stale `migrate-frontmatter-v2.js` registry (LEGACY-ONLY) | 24 |
| Labels referenced nowhere outside the owner file (ORPHAN) | 10 |
| Capability labels absent from the owner's contract row | 39 |
| Duplicate labels | 1 (`motion-research` on `@researcher` + `@ux-researcher`) |
| Declared contract contradiction | `agent-contracts.md` says `@product-designer`/`@technical-writer` do not own copy, while `@product-designer` now owns in-product microcopy |

DOC-ONLY/LEGACY-ONLY does not mean the work is fake — the body sections exist (e.g. `@qa-engineer`'s AI gate). It means **the label has no wiring**: no contract row, no skill step, no gate, no eval. The fix is either to wire the label or drop it from the frontmatter claim set. ORPHAN labels have neither wiring nor work evidence.

## Ground rules (non-negotiable)

1. **A capability claim needs three things:** a contract row, a runnable/documented artifact (skill step, script, template, or gate), and a named consumer. Anything less is renamed, merged, or removed.
2. **No self-grading.** Verifiers are non-owners: `@code-reviewer` checks runnable paths, `@security-engineer` checks security claims, `@qa-engineer` checks eval/gate claims. Ownership conflicts go to `@founder` per `agent-contracts.md`.
3. **Two-round cap.** Round 1 review → fix → Round 2 review → stop. Unresolved items become `BLOCKED:` and go to the owner — never an infinite loop.
4. **No commits.** All work stays in the working tree for owner review (standing rule).
5. **No formatting-only edits.** Every change must alter a claim, a wiring point, or a verification gate.

## Phases

### Phase 0 — Fix-first (DONE 2026-09-29)
F1–F6 from the review: canonical template sync (+6 regression tests), research-plan path unification, incident-commander reword, security heading, exit-code and baseline correction, dead `body` variable reverted. Verified: `npm test` 695/695, `validate_frontmatter` 20/20 + 101 steps, `validate_matrix` pass, `spec_check` 40/40, manifest regenerated (347 files), all hashes current.

### Phase 1 — Ground-truth audit (DONE 2026-09-29)
Deliverable: `artifacts/docs/review/10-agent-capability-audit.md` (mechanical, read-only). Limitations recorded in the artifact: artifact-path checks flag template placeholders (`adr-NNN-*`) as zero-ref false positives; label-wiring is stricter than work existence by design.

### Phase 2 — Contract reconciliation + capability fixes
Deliverables: updated `agent-contracts.md` (capability-level dispositions), updated agent frontmatters/bodies, manifest regen.
- **Contradiction fixes:** designer/technical-writer copy ownership (split "in-product microcopy" vs "marketing/product copy"); devops FinOps; security AI-application + supply-chain; technical-writer Diátaxis; researcher pricing (van Westendorp) — each either added to the contract row or removed from the frontmatter.
- **Duplicate resolution:** `motion-research` → `motion-market-research` (`@researcher`) / `motion-usability-research` (`@ux-researcher`).
- **ORPHAN dispositions (10):** for each, either wire it (contract + body + consumer) or remove the label. Expected removals: stale `@data-analyst` trio if no work basis; keep the 7 recent ones only if wired.
- **LEGACY-ONLY (24):** replace the stale `migrate-frontmatter-v2.js` registry as the source of truth by wiring labels to real artifacts, or drop the labels from frontmatter. `migrate-frontmatter-v2.js` is tarball-excluded and stale — its capability lists are a regression hazard if ever re-run (flag for archive).
- **New consistency test:** `tests/agent-capability-contract.test.js` — every frontmatter capability appears in the owner's contract row (allowlist for grounded exceptions), no duplicate labels, every agent has ≥1 eval benchmark. This is mechanical and verifiable (not a prose gate), so it is allowed under the 02s DEC-3 fake-gate ban.

**Phase 2 execution record (2026-09-30):**
- Contract table reconciled: designer/technical-writer copy split made explicit (in-product microcopy vs marketing copy), AI-PM artifacts, AI application security + supply-chain audit, FinOps, QA AI gate, Diátaxis, motion track split — 20/20 rows updated.
- Capability Registry added to `agent-contracts.md` (20 rows, 110 capabilities, wiring path per agent) and enforced by the new test.
- Dispositions: **2 renamed** (`motion-research` → `motion-market-research` / `motion-usability-research`), **0 removed** — every orphan/legacy/doc-only label has real work behind it (body section, skill, or template); the defect was unwired labels, not unrelated capabilities, so they were wired instead of deleted. **1 broken doc link fixed** (`@product-manager` pointed at a nonexistent `02d-ai-product-manager.md`; repointed to the real `02d-phase-1-ai-ready-team.md`). **1 regression hazard neutralized** (`migrate-frontmatter-v2.js` marked OBSOLETE — its stale capability/mentor snapshot must never be re-run).
- Note for owner: `artifacts/docs/strategy/development-plan/02-phase-1-skills.md` (F1.33 rows) still names the old `02d-ai-product-manager.md` path — historical plan record, not edited here.

**Phase 3 execution record (2026-09-30):**
- Agent eval suites: **30 → 60 benchmarks** (+30, all load clean, no malformed suites). Coverage per agent: founder 3, PM 3, designer 3, architect 2, tech-lead 3, developer 10, code-reviewer 2, QA 2, researcher 3, user-researcher 2, ux-researcher 3, data-analyst 2, security 4, performance 2, ml-ai 3, ml-ai-ops 2, devops 3, tech-writer 2, shifu 2, memory 4.
- Mock before/after: agent benchmarks **14/30 (46.7%) → 15/60 (25.0%)**. The rate drop is entirely "unmeasured in mock" — 29 of the 30 new checks have no canned fixture (honest: mock is fixture-recall, not capability); **zero existing-benchmark regressions** (diff shows no `BENCHMARK_REGRESSION`).
- Mock baseline re-recorded (`artifacts/evals/mock-baseline.json`: 138 total / 39 passed; previous kept as `.prev.json`). Explicit-baseline diff surfaces only the **pre-existing mock SRSR artifact**: 16 trap breaches before and after (traps are red in mock by design — their fixtures deliberately carry no verdict); the rate moved 16/22 → 16/24 only because the two new non-trap SPC benchmarks dilute the denominator.
- Harness findings discovered (not fixed — round-table/fix-round candidates): **(a) vacuous default diff** — `vespyr-eval run` defaults `--baseline` to `artifacts/evals/baseline.json`; when that file is absent the default string suppresses the mock fallback, `loadBaseline` returns null, and the report prints `[OK] No regressions detected` without comparing anything (only an explicit `--baseline` performs a real diff); **(b) mock SRSR trip is inherent** — the absolute `SYCOPHANCY_LEAK` gate fires on every mock full run because trap fixtures intentionally have no verdict. Both need one-line guards or docs in the fix round.

**Phase 4 execution record (2026-09-30):** 19-seat native round-table in 4 groups (real context-isolated subagents), Round 1 positions + Round 2 defense/concession, all 19 challenged. Transcript `artifacts/docs/review/11-agent-roundtable.md` (+ scored copy in `artifacts/evals/roundtable/`): coverage 1.0, point coverage 1.0, 19 concessions, verdict stability RESHAPE. Findings: gate relevance loophole (13 agents), 4 confirmed capability overclaims + 5 more drop/rename candidates, 12 artifact/consumer edge conflicts, one fabrication-rewarding skill path (`/explore-idea` step-02c), harness defects. All 19 agents returned CHANGES REQUESTED.

**Phase 5 execution record (2026-09-30):** fix round + satisfaction gate.
- P0 gate: per-capability registry (101 rows) + 7-check gate; closed 5 falsification rounds (banned self-reference → attribution → non-persona evidence → per-capability suite matching → reuse caps → inode identity for aliases/case/symlinks).
- P1: 9 capability drops + 1 rename (perf ×2, ux ×2, user-researcher, code-reviewer ×2, researcher, designer, ml-ai-engineer; security-audit→security-triage).
- P2–P4: contract rows, artifact paths, AI-ADR/step-02c/Diátaxis/jtbd/kanban fixes, 5 new evidence artifacts (finops, ml-ops runbook, threat-model, api-reference, usability-test-kit), AC-AI block, PRD budgets, model-card rollback.
- P5: evals 60 → 65 agent benchmarks (DEV-11 executable test-writing, FOUNDER-04, DATAANALYST-03/04, USERRESEARCHER-03 + extensions); mock baseline re-recorded.
- P6: baseline fallback + honest report path + mock SRSR guard.
- Verification: 5 non-owner verifiers; all 20 agents SATISFIED (`artifacts/docs/review/14-satisfaction-record.md`); `npm test` 702/702; manifest 352; post-fix audit 101/101 wired; accepted residuals recorded (semantic evidence quality; mock numbers = fixture recall).

### Phase 3 — Eval coverage (owner chose Track B scope)
Deliverables: expanded `evals/suites/agents/*.json`; `npm run eval:agents --mock` load-clean; before/after results recorded.
- Target: every agent has ≥1 benchmark per owned capability cluster (13 agents currently have exactly 1 benchmark).
- Clusters: engineering (architect, tech-lead, developer, code-reviewer, qa, devops, security, performance), AI stack (ml-ai-engineer, ml-ai-ops, data-analyst), discovery/design (founder, PM, designer, user-researcher, ux-researcher, researcher), meta (memory-controller, technical-writer, shifu).
- Estimate: 30 → ~60 benchmarks. Subjective canvases are exempt (02s DEC-1 precedent).

### Phase 4 — Round-table cross-review (real subagents)
Deliverables: `artifacts/docs/review/11-agent-roundtable.md` transcript + per-agent verdicts.
- Groups: engineering / AI stack / discovery-design / meta. Each group reviews members' capability dispositions and teamwork edges (producer artifact → consumer → verification).
- Failure modes to probe: ownership overlaps, handoff paths with zero consumers (audit flagged architect ADR placeholders and others), self-assessed capability inflation.
- Verdicts: `SATISFIED` / `CHANGES REQUESTED` / `BLOCKED` per `utter-satisfaction.md` with evidence.

### Phase 5 — Fix round 2 + satisfaction gate
- Fix `CHANGES REQUESTED` items (round 2 max), re-run: `npm test`, `npm run eval:agents --mock`, `validate_frontmatter`, `validate_matrix`, `spec_check`, manifest verify.
- Owner report: capability delta table (before/after), removals, remaining `BLOCKED` items.

## Task list

| ID | Task | Phase | Est. (h) | Done |
|---|---|---|---|---|
| T001 | F1–F6 fixes + verification | 0 | 1.0 | [x] |
| T002 | Ground-truth capability audit artifact | 1 | 0.5 | [x] |
| T003 | Contract reconciliation (contradictions + capability rows) | 2 | 2.0 | [x] |
| T004 | Capability disposition edits (rename/merge/wire/remove; dupes + orphans + legacy) | 2 | 3.0 | [x] |
| T005 | `tests/agent-capability-contract.test.js` + suite green | 2 | 1.0 | [x] |
| T006 | Eval expansion to ~60 benchmarks; load + before/after run | 3 | 4.0 | [x] |
| T007 | Round-table groups (4) with real subagents; transcript + verdicts | 4 | 3.0 | [x] |
| T008 | Fix round 2 + full verification battery + manifest regen | 5 | 1.5 | [x] |
| T009 | Owner report (delta, removals, blockers) | 5 | 0.5 | [x] |

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Capability removal breaks a skill that assumes it | Low | High | Grep evidence per label before removal; T005 consistency test; skills unchanged in Phase 2 |
| Round-table self-grading inflates results | Med | High | Non-owner verifiers; verdicts require evidence rows; owner sees the transcript |
| Parallel session edits collide (a parallel CHANGELOG edit appeared mid-session 2026-09-29) | Med | Med | Serialize windows; check `git status` before each write batch; no commits until owner review |
| Eval expansion malforms suites (runner silently loads 0) | Med | High | `malformed suite` warnings treated as fail; T006 verifies benchmark count |
| Scope creep into persona prose polish | Med | Med | Ground rule 5; only claim/wiring/gate changes |

## Definition of Done

- [x] Audit artifact exists and is current. (`artifacts/docs/review/10-agent-capability-audit.md` + post-fix `12-agent-capability-audit-post-phase5.md`)
- [x] Zero capability contradictions between agent files and `agent-contracts.md`. (registry set equality machine-checked; verifier spot-checks)
- [x] Zero duplicate labels; every ORPHAN either wired or removed with a recorded disposition. (post audit: 0 dups, 0 orphans; dispositions in the Phase 5 record)
- [x] Consistency test green; full suite green; manifest current. (7/7, 702/702, manifest 352 verified by @tech-lead)
- [x] Every agent has ≥1 benchmark per owned capability cluster; before/after eval numbers recorded. (65 agent benchmarks; before/after in Phase 3 + Phase 5 records)
- [x] Round-table transcript filed; every participating agent `SATISFIED` or `BLOCKED` with reason. (`11-agent-roundtable.md` + `14-satisfaction-record.md` — 20/20 SATISFIED, 0 blocked)
- [x] Owner report delivered; nothing committed.

## Out of scope

- Persona tone/prose beautification with no claim change.
- New agents or skills.
- Hard gates on subjective judgment.
- Commits/publishing.
