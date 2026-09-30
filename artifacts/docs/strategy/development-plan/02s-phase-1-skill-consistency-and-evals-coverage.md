# Execution Plan — Skill Consistency, Evals Reconciliation & Defect Fixes (Full Scope)

**Planned:** 2026-09-29
**Planner:** @default (skills folder review 2026-09-29 — owner requested full-scope plan + owner delegated the 3 technical decisions to planner)
**Estimated total:** 9–13 h
**Developers needed:** 1 (sequential — shared skill files + one script + eval suites + tests)
**Precedent:** 02e (frontmatter standardization — done), 02j (agent/skill evals + `vespyr-eval` runner — done). This plan continues both: 02e fixed frontmatter, 02j built the eval runner and suites; 02s fixes *body-structure consistency, description triggering, the 5 uncovered eval skills, the stale eval doc, dead test files, and 3 concrete defects*.

## Correction folded in (planner honesty — DNA 5)

The 2026-09-29 review's first pass reported "only 1 of 40 skills has evals." **That was wrong** — it checked per-skill `evals/` folders, but Vespyr centralizes skill evals in `evals/suites/` consumed by the wired `vespyr-eval` runner (`npm run eval:skills`). **Verified reality: 35 of 40 skills have benchmarks** across `delivery`, `design`, `discovery`, `research`, `operations`, `meta-authoring` suites. So evals are *not* the systemic gap first claimed. The real, verified gaps are narrower and are what this plan fixes.

## Why this plan exists

All 40 skills pass `spec_check.js` (frontmatter clean — 02e holds). But the project's own body-structure and description standards drift, one skill violates the presentation DNA, one standalone skill is weaker than its in-loop twin, the eval-authoring doc misdocuments the real format, 5 skills lack any benchmark, and 4 orphan test files are dead. "Vespyr works as expected" = these are all closed.

**Capability verdict (evidence-backed):** the core pipeline (`develop`, `design`, `test`, `validate-idea`, `round-table`) is deep and sufficient — step-file contracts, halt conditions, coverage/parity/point-coverage machinery, and (verified) eval benchmarks. **No new skills. No new machinery.** The README's "adopt the idea, not the inventory" and 02e's "compliance-only" discipline apply. The gaps are consistency + a few verification holes, not coverage.

## The three technical decisions (owner-delegated to planner)

| # | Decision | Ruling | Plain-language reason |
|---|---|---|---|
| DEC-1 | Evals breadth | **Cover the 5 uncovered skills where output is checkable; do NOT force evals onto subjective surfaces** | 35/40 already covered. Of the 5 gaps, `grill-me`/`elicitation`/`shut-up` already have *invariant* suites; `help-me`/`humanize` get benchmarks. Writing a scored eval for a subjective canvas is a test that's either always-green (useless) or arbitrary — that's not "fixing," it's noise. |
| DEC-2 | Dead `.mjs` test files | **Delete the 4 orphans after confirming they're unreferenced; the wired `vespyr-eval` suites + `tests/run-all.js` are the real convention** | Verified: `package.json`/`tests/run-all.js` do NOT reference `test-motion.mjs`, `test-unpack-problem.mjs`, `test-shape-up.mjs`, `test-qa-enrichment.mjs`. They are stale duplicates of behavior now in `evals/suites/`. Two conventions confuse; one convention is "works as expected." |
| DEC-3 | Structural-drift enforcement | **Warnings in `spec_check.js`, never a hard gate** | A hard gate blocks the build on a rule. Prose sections ("When to use") can't be verified mechanically — a gate would pass an empty-but-present section and block a well-written differently-phrased one. Vespyr's DNA bans exactly this "fake gate." A warning surfaces drift for a human; the router template makes the right shape obvious. More rigorous, not less. |

## Scope

**In scope** (locked: `surgical-skill-edit` + `scaffold-script`):

1. **Structural linter extension** — extend `spec_check.js` warnings channel (exit stays 0): flag missing `When to use`/`When to invoke`/`How to invoke`; missing `What this skill does` (router-exempt via a `<!-- router-skill -->` marker); missing `last_updated` in metadata; ASCII box-table glyphs (`┌├└┼`, `+---+`) *outside* fenced code blocks (so tree/wireframe fences are exempt).
2. **Router-skill template** — new `create-skill/references/router-skill-template.md` (When to invoke / Step sequence / Halt conditions / State machine / Done when); add the `<!-- router-skill -->` marker to the 8 orchestrators (`develop`, `design`, `test`, `validate-idea`, `launch`, `retro`, `shape-up`, `unpack-problem`); reference the template from `create-skill/SKILL.md`.
3. **Description triggering pass (all under-triggering skills)** — rewrite descriptions to include explicit trigger phrases per the create-skill spec: `phase`, `review`, `kanban`, `sprint-status`, `plan`, `develop`, `launch`, `iterate`, `explore-idea`, `validate-idea`, `status`, `empathy-map`, `journey-map`, `jtbd` (and any others `spec_check` warns as `<40 chars` or lacking triggers). Single-line, ≤1024 chars, spec-clean. Regenerate `skills-catalog.json`.
4. **Metadata normalization (all 18 missing)** — add `last_updated` to: `design`, `develop`, `elicitation`, `explore-idea`, `help-me`, `humanize`, `incident`, `iterate`, `kanban`, `launch`, `phase`, `retro`, `review`, `round-table`, `shape-up`, `sprint-status`, `status`, `validate-idea`. Add a full `metadata` block (`version` + `last_updated`) to `round-table` (currently none). No key renames.
5. **`sprint-status` DNA 6 fix** — replace both ASCII box tables (Phase|Status, Story|Status) with Markdown tables. (`analyze-data` and `craft-lesson` ASCII *flow diagrams* → convert to Mermaid where clean; leave if Mermaid can't express them — DNA 6 permits unrenderable graphs.)
6. **`review` alignment** — add the orphan-AC sweep reference (`req_to_impl_check.js`, 02o) to standalone `review` so it isn't weaker than the in-loop step-07 reviewer. Reference only; no gate.
7. **Evals — close the 5 gaps (DEC-1).** Add `help-me` and `humanize` benchmarks to the appropriate `evals/suites/skills/*.json` (likely `operations`). Confirm `grill-me`, `elicitation`, `shut-up` invariant coverage in `evals/suites/invariants/` is sufficient and cross-reference it (no duplicate scored benchmark). Run `npm run eval:skills --mock` to confirm suites still load.
8. **Fix the stale eval doc (root cause of the original mis-read).** Rewrite `create-skill/references/evals-schema.md` to document the **real** `vespyr-eval` suite format (`evals/suites/<group>/<name>.json`, `benchmarks[]` with `id`/`skill`/`name`/`dimension`/`assertContains`/`assertNotContains`/`prompt`) and remove the unused per-skill `evals/evals.json` + `.opencode` mirror assumption. Update `create-skill/SKILL.md` Step 5 to point at suites.
9. **Delete 4 dead `.mjs` files (DEC-2)** — `.agents/skills/motion/test-motion.mjs`, `unpack-problem/test-unpack-problem.mjs`, `shape-up/test-shape-up.mjs`, `test/test-qa-enrichment.mjs`, after grep-confirming zero references from `package.json`, `tests/`, and CI.
10. **`humanize` body split (fold in — "fix all")** — move the 29-pattern catalog to `humanize/references/patterns.md`; keep the SKILL.md body a router under the <500-line ideal. Preserves behavior; matches how `motion`/`brainstorming` externalize knowledge.

**Out of scope:**
- Frontmatter key migration (02e — done).
- New skills / personas / heavy machinery (speculative-engineering ban).
- Hard gates on prose (DEC-3 — fake-gate ban).
- Wiring a new CI eval threshold (baseline-first; 02j's `--mock` runner + existing baseline stay authoritative).
- Rebuilding the canvas discovery skills into a shared ledger (audit-only, T012 — evidence-first).

## Task list

| ID | Task | Est. (h) | Depends On | Assignee | Done |
|---|---|---|---|---|---|
| T001 | `spec_check.js` — add warnings (when-to-use / what-this-does with router marker / missing last_updated / ASCII box-table outside fences); update header; keep exit 0 for warnings; extend self-test | 1.5 | — | @default | [ ] |
| T002 | `router-skill-template.md` (new) + `<!-- router-skill -->` marker on 8 orchestrators + reference from `create-skill/SKILL.md` | 1.0 | — | @default | [ ] |
| T003 | Description triggering rewrite (~14+ skills) → regenerate `skills-catalog.json`; `git diff --exit-code` on catalog | 1.5 | T001 | @default | [ ] |
| T004 | Metadata `last_updated` on 18 skills + full metadata block on `round-table` | 0.75 | — | @default | [ ] |
| T005 | `sprint-status` ASCII → Markdown tables; `analyze-data`/`craft-lesson` flow diagrams → Mermaid where clean | 0.75 | — | @default | [ ] |
| T006 | `review` — add `req_to_impl_check.js` orphan-AC sweep reference (no gate) | 0.25 | — | @default | [ ] |
| T007 | Add `help-me` + `humanize` benchmarks to `evals/suites/skills/*.json`; cross-ref grill-me/elicitation/shut-up invariant suites; `npm run eval:skills` loads clean | 1.5 | — | @default | [ ] |
| T008 | Rewrite `evals-schema.md` to the real `vespyr-eval` suite format; update `create-skill` Step 5; drop `.opencode` mirror + per-skill `evals/evals.json` assumptions | 1.0 | T007 | @default | [ ] |
| T009 | Delete 4 dead `.mjs` files after grep-confirming zero references | 0.5 | — | @default | [ ] |
| T010 | `humanize` — move pattern catalog to `references/patterns.md`; body → router under 500 lines; verify catalog regen unaffected | 1.0 | T003 | @default | [ ] |
| T011 | Verify — `node --check`; `spec_check.js` (0 violations, warnings listed); `compile_skills.js` + catalog diff clean; `npm test`; `npm run eval:skills`/`eval:invariants` `--mock` load; plan-reservation; manifest regen + verify | 1.25 | T001–T010 | @default | [ ] |
| T012 | Read-only audit — canvas discovery skills vs shared-discovery-ledger idea (findings only; defer/adopt = owner ruling) | 0.5 | — | @default | [ ] |

## Dependency graph

```
T001 → T003 → T010 ─┐
T002 ───────────────┤
T004 ───────────────┤
T005 ───────────────┼→ T011
T006 ───────────────┤
T007 → T008 ────────┤
T009 ───────────────┤
T012 ───────────────┘
```

Single-repo skill/script/suite/test edits — sequential in one session; no worktrees.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Description rewrite exceeds 1024 chars or adds unquoted `: ` (YAML bomb) | Med | High | `spec_check.js` after every batch; T011 gates on 0 violations; single-line + quote any `: ` |
| New warnings false-positive on legit tree/wireframe ASCII | Med | Med | Only flag box-table glyphs OUTSIDE fenced blocks; router marker exempts orchestrators; warnings never fail CI |
| `skills-catalog.json` regen desyncs `help-me` (02e's live-bug class) | Low | High | T003/T010/T011 run `compile_skills.js` + `git diff --exit-code` on the catalog |
| Editing `evals/suites/*.json` malforms a suite → `vespyr-eval` "0 benchmarks matched" | Med | High | T007/T011 run `npm run eval:skills --mock`; runner already prints `malformed suite` warnings — treat any as a fail |
| Deleting a `.mjs` that IS referenced somewhere subtle (husky hook, CI yaml) | Low | High | T009 greps `package.json`, `tests/`, `.github/`, `.husky/` before deletion; if any ref exists, keep + document instead |
| `humanize` catalog move loses a pattern or breaks the worked example | Med | Med | Move verbatim to `references/patterns.md`; keep the SKILL.md example intact; diff pattern count before/after (29 in, 29 out) |
| Concurrent session touches the same skills | Low | Med | session-start parallel check before executing; single-session execution |

## State machine integration

`node .agents/scripts/orchestrator_state.js complete --agent default --artifact 02s-phase-1-skill-consistency-and-evals-coverage.md`

## Definition of Done

- [ ] `spec_check.js` extended (warnings only, exit 0); `node --check` clean; self-test passes.
- [ ] `router-skill-template.md` exists, referenced, and the 8 orchestrators carry the router marker.
- [ ] All under-triggering descriptions rewritten with trigger phrases; all 40 still pass `spec_check` (0 violations); `skills-catalog.json` regenerated clean.
- [ ] `last_updated` present on all 40 skills; `round-table` has a metadata block.
- [ ] `sprint-status` uses Markdown tables; flow diagrams converted where Mermaid-expressible.
- [ ] `review` references the orphan-AC sweep.
- [ ] `help-me` + `humanize` have benchmarks; invariant coverage for grill-me/elicitation/shut-up cross-referenced; `npm run eval:skills --mock` loads all suites.
- [ ] `evals-schema.md` documents the real `vespyr-eval` format; `create-skill` Step 5 updated.
- [ ] 4 dead `.mjs` files deleted (or documented if a hidden ref found).
- [ ] `humanize` body under 500 lines; catalog in `references/patterns.md`; 29 patterns preserved.
- [ ] `npm test` green; `plan-reservation` registers 02s; manifest regen + `verify` clean.
- [ ] Canvas-skill audit findings recorded.

## What this plan deliberately does NOT do (so "fix all" stays honest)

- It does not add skills or personas — coverage is sufficient; adding surface is the failure mode the README warns against.
- It does not convert prose-section checks into hard gates — that would be a fake gate (DEC-3).
- It does not force scored evals onto subjective canvas skills — that manufactures noise, not verification (DEC-1).
- It does not rebuild the canvas skills into a shared ledger yet — no evidence of real drops; audit-first (T012).
