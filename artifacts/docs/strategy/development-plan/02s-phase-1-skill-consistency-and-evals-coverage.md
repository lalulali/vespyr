# Execution Plan — Skill Consistency, Evals Coverage & Defect Fixes (Full Scope)

**Planned:** 2026-09-29
**Revised:** 2026-09-30 — after a full 41-skill read, every claim re-verified against disk
**Planner:** @default
**Estimated total:** 11–15 h
**Developers needed:** 1 (sequential — shared skill files, one script, one linter, eval suites, tests)
**Precedent:** 02e (frontmatter standardization — done), 02j (agent/skill evals + `vespyr-eval` runner — done), 02o (orphan-AC sweep), 02t (legal-safety-audit — **in flight, uncommitted**).

## Correction log (v2 — every original claim re-checked, not assumed)

The v1 plan was written from a folder-level review. Reading all 41 `SKILL.md` files end to end and re-running every assertion against disk produced **7 factual errors and 10 missed defects** in v1. All are corrected below. Nothing in v1 is carried on trust.

| # | v1 claim | Verified reality | Source |
|---|---|---|---|
| C1 | "40 skills" (throughout) | **41 skills.** `spec_check.js` prints `All 41 skills pass`. The 41st is `legal-safety-audit` (added by 02t after v1 was drafted). | `node .agents/scripts/spec_check.js` |
| C2 | "35 of 40 skills have benchmarks" | **36 of 41.** 5 uncovered: `elicitation`, `grill-me`, `help-me`, `humanize`, `shut-up`. | `evals/suites/*/*.json` benchmark `skill`/`agent` fields |
| C3 | "`grill-me`/`elicitation`/`shut-up` already have *invariant* suites" | **Two of three.** `grill-me` → `invariants/grill-me-spcp.json` (15 traps). `shut-up` → `invariants/shut-up-brevity.json` (10). **`elicitation` has zero coverage in any suite** — its only hits repo-wide are two security-corpus baselines. | `grep -rln elicitation evals/` |
| C4 | T001 flags ASCII box glyphs *outside* fences | The only real DNA 6 violation in a SKILL.md — `sprint-status` — sits **inside** a fence, because the fence *is* its output contract. The rule as written cannot catch it. | `sprint-status/SKILL.md:20-50` |
| C5 | T001 puts all four checks in the **warnings** channel | Link integrity is *mechanically verifiable fact*, not prose. A phantom `steps/*.md` link, an orphan step file, a missing H1, a stale mirror path — all are decidable by a script. DEC-3 bans gating **prose**; it does not license ignoring broken links. | see "Gate taxonomy" below |
| C6 | "Run `npm run eval:skills` to confirm suites still load" | `eval:skills` = `--suite skills/delivery` — **1 of 6** skill suites. It cannot detect a malformed suite anywhere else. The correct check is `npm run eval` (all 13 suites) plus a `malformed suite` grep. | `package.json:22`, `bin/vespyr-eval.js:237` |
| C7 | T009 greps `package.json`, `tests/`, CI for the 4 `.mjs` files | Grep scope too narrow. `.agents/manifest.json` holds SHA-256 entries for all 4; `.agents/.vespyr-manifest.json` lists all 4 by path; `motion_spec_check.js:6,41` names `test-motion.mjs` in live comments. | `grep -rn test-motion` |
| C8 | T008 drops the per-skill `evals/evals.json` assumption | The doc assumption goes, but **`.agents/skills/motion/evals/evals.json` still exists on disk and in the manifest, read by nothing.** Dropping only the doc leaves the ambiguity v1 claims to close. | `grep -rn "motion/evals"` → 0 readers |
| C9 | T010 keeps `humanize`'s body "a router" | `humanize` is a **content** skill, not an orchestrator. A router body would destroy it. Also its header carries an upstream-sync instruction ("pull the latest and replace this file") that a split invalidates. | `humanize/SKILL.md:11-13` |
| C10 | T011 "`plan-reservation` registers 02s" | **Already registered.** `check_plan_reservation.js` → `44 plan files, all registered`. Not a task. | `node .agents/scripts/check_plan_reservation.js` |
| C11 | T004 metadata normalization | **v1 is correct.** Exactly 18 skills lack `last_updated`; `round-table` lacks the whole `metadata` block. Carried unchanged. | frontmatter scan, 41/41 |

### Pre-existing conditions (not caused by 02s — do not attribute to it, do not silently absorb)

- `node .agents/scripts/check_corpus_invariants.js` **fails**: `scanner sha 71a2f88f… != pinned e2d0c28d…`. Scanner drift, unrelated to skills. Not in `npm test`'s 716 assertions. Owner ruling needed to re-pin; **out of scope here**.
- `npm run eval` (mock) reports 26.9% pass against a 27.3% baseline — a **pre-existing** `PASS_RATE_DROP` regression tripwire, present before any 02s edit. `npm test` is 716/716 green. 02s must not make either worse.
- `skills-catalog.json` was **stale on arrival** — `legal-safety-audit` was missing entirely. That is exactly the "02e live-bug class" v1's own risk register names. Already regenerated during verification; carried as T-C2.
- The working tree holds **uncommitted 02t work** (untracked `.agents/skills/legal-safety-audit/`, modified `operations.json` +2 benchmarks, `AGENTS.md`, plan `README.md`). v1 rates this risk "Low". It is already in flight. Every edit below is additive or surgical; no 02t file is rewritten wholesale.

## The three technical decisions (revised)

| # | Decision | Ruling | Plain-language reason |
|---|---|---|---|
| DEC-1 | Evals breadth | **Cover all 5 uncovered skills — including `elicitation`, which has zero coverage, not just `help-me`/`humanize`.** Do not force scored evals onto the remaining subjective canvas skills. | v1 undercounted by one skill and mis-assumed `elicitation` was already covered (C3). `help-me` (navigation report), `humanize` (pattern stripping), `elicitation` (critique method application) all have mechanically checkable output contracts. 36/41 already covered. |
| DEC-2 | Dead test/eval files | **Delete 5 orphans — the 4 `.mjs` files *and* `motion/evals/evals.json` — and repair every reference, including the two manifests and the two live comments in `motion_spec_check.js`.** **[AMENDED 2026-09-30 — see "Correction to DEC-2" below: 2 of the 4 were green and load-bearing, and are now ported into `tests/`. `test-motion.mjs` and `test-shape-up.mjs` stand as deleted.]** | v1's grep scope was too narrow (C7) and v1 left the dead eval file in place (C8). A delete that leaves dangling manifest hashes and a script comment pointing at a removed file is not a delete. |
| DEC-3 | Structural-drift enforcement | **Split the linter by decidability, not by convenience.** Mechanically decidable facts → **violations, exit 1**. Prose shape → **warnings, exit 0**. | v1 put everything in warnings "to be safe", which buys nothing: a broken link is a fact and should fail CI the way a malformed frontmatter key does. The safety DEC-3 actually argues for — never block on a phrasing a human chose — is preserved, because every *prose* rule stays a warning. |
| DEC-4 *(new)* | Router classification | **A skill is a router iff it owns a `steps/` directory.** Marker is written mechanically, not by hand-picking. | v1 named 8 orchestrators from a reading. The mechanical criterion finds **12**, and it is the same 12 that carry the unreachable-step-file defects — so the marker and the fix land together. No judgment call, no drift. |
| DEC-5 *(new)* | DNA 6 scope | **Fix the executed violation too, not just the documented one.** | `orchestrator_state.js status` — the command 30+ skills run at start — emits a `╔══╗` box dashboard. `sprint-status`'s static sample is the visible symptom; the script is the live one. Fixing only the doc would leave the hot path violating DNA 6. |

## Gate taxonomy (the core of the revision)

`spec_check.js` today emits one channel. v2 emits two, split by a single question: *can a script decide this without reading meaning?*

**Violations — exit 1. Machine-decidable facts. Zero tolerance for drift.**

| Check | Why it is decidable |
|---|---|
| `missing H1 title` | Body must open with `# `. A regex. |
| `phantom step link` | `steps/<x>.md` cited in `SKILL.md` must exist on disk. `fs.existsSync`. |
| `unreachable step file` | Every file in `steps/` must be cited by `SKILL.md` or transitively by a cited step file. Graph reachability. |
| `stale harness-mirror reference` | `.opencode/skills/` must not appear — that tree was deleted in 02e. Literal string. |
| `phantom skill reference` | Backticked names on a `Prev:`/`Next:`/`Previous skill:`/`Next skill:` line must resolve to a real skill or agent. Set membership. |
| `unbalanced code fence` | Fence parity. |
| `box-drawing glyph outside a fence` | Unicode class scan with fence tracking. Catches the `journey-map` sprite leak. |
| `metadata.last_updated` missing | Key presence. |

**Warnings — exit 0. Prose shape. A human chose the wording; a script must not overrule it.**

| Check | Why it stays a warning |
|---|---|
| missing `## What this skill does` | Exempt when the skill carries `<!-- router-skill -->`. A well-written one-paragraph opener under a different heading is legitimate. |
| missing `When to use` / `When to invoke` / `How to invoke` | Same. |
| router missing `Halt conditions` or `Done when` | Only fires on router-marked skills, where it is part of the declared contract. |
| body > 500 lines | Existing. |
| `description` < 40 chars | Existing. |
| `description` carries no explicit trigger cue | A judgement about *phrasing strength* (`/` command, "use when", "trigger", "whenever"). The 02s rewrite drives this to zero; the check stops it regressing. |

## Router-skill template

New `.agents/skills/create-skill/references/router-skill-template.md`, referenced from `create-skill/SKILL.md` Step 3, defining: `<!-- router-skill -->` marker → `When to invoke` → `Prerequisites` → `Step sequence` (every step citing its file) → `Halt conditions` → `Done when` → `State machine integration`. The 12 skills owning a `steps/` directory carry the marker (DEC-4).

## Scope

**In scope:**

1. **Linter split** — `spec_check.js` gains the 8 violations and 6 warnings above; header rewritten; self-test extended to cover every new rule; `node --check` clean.
2. **Router template + markers** — new `router-skill-template.md`; `<!-- router-skill -->` on all 12 `steps/`-owning skills; referenced from `create-skill`.
3. **Link integrity fixes** — `launch` phantom `step-06`→`step-05`; the 20 unreachable step files resolved (link, or delete where the body already inlines the step); 8 missing H1s added; `design` phantom `game-explore-idea` removed.
4. **Stale-mirror fixes** — `customize-skill` (4 `.opencode` refs) and `create-skill` (2 `evals/evals.json` refs) rewritten to the single-tree, centralized-suite reality.
5. **Description triggering pass** — all 27 descriptions lacking a trigger cue rewritten: what-it-does clause first, then explicit trigger phrases. Single-line, ≤1024 chars, no unquoted `: `. Catalog regenerated, `git diff --exit-code` clean.
6. **Metadata normalization** — `last_updated` on the 18; full `metadata` block on `round-table`.
7. **Structural sections** — `## What this skill does` added to every non-router skill that lacks one (9 remain after the router exemption), so the new warning channel reaches zero.
8. **DNA 6** — `sprint-status` box tables → Markdown; `analyze-data` driver tree → Mermaid; `craft-lesson` 5-phase flow → Mermaid; `orchestrator_state.js status` dashboard → Markdown.
9. **`journey-map` fence repair** — the split template fence so the emotional-arc diagram renders inside its block.
10. **`review` alignment** — reference the `req_to_impl_check.js` orphan-AC sweep (02o) that `test/SKILL.md:22` already carries. Reference only, no gate.
11. **Evals — close all 5** (DEC-1) — new benchmarks for `help-me`, `humanize`, `elicitation`; cross-reference the two existing invariant suites for `grill-me` and `shut-up`; no duplicates. `npm run eval` loads all 13 suites with zero `malformed suite` lines.
12. **Eval doc rewrite** — `evals-schema.md` documents the real `vespyr-eval` suite format; `create-skill` Step 5 and the anatomy diagram point at suites.
13. **Dead-file removal** (DEC-2) — 4 `.mjs` + `motion/evals/evals.json`; manifest regenerated; `motion_spec_check.js` comments repaired.
14. **`humanize` split** (corrected C9) — catalog + worked example move verbatim to `references/patterns.md`; SKILL.md keeps tone/voice/process inline as a **content** skill, not a router; upstream-sync header rewritten to describe the two-file layout; 29 patterns counted in and out.
15. **Full verification** — `node --check` on every touched script; `spec_check.js` 0 violations and 0 warnings; `compile_skills.js` catalog diff clean; `npm test` 716/716 (or better); `npm run eval` loads all suites, no regression vs. the 26.9% starting point; manifest regen + verify.

**Out of scope (with reasons):**

- Frontmatter key migration — 02e, done.
- New skills, personas, or machinery — coverage is sufficient; the README's "adopt the idea, not the inventory" rule.
- Hard gates on prose — DEC-3.
- Re-pinning the security corpus scanner hash — pre-existing failure, unrelated owner ruling (see pre-existing conditions).
- Fixing the pre-existing `npm run eval` mock pass-rate regression — 02j's baseline owns it; 02s must only avoid worsening it.
- Rebuilding the canvas discovery skills into a shared ledger — audit-only, deferred with findings recorded.

## Task list

| ID | Task | Est. (h) | Depends On | Done |
|---|---|---|---|---|
| T001 | `spec_check.js` — 8 violations + 6 warnings per the gate taxonomy; header rewrite; self-test extended per rule; `node --check` | 2.0 | — | [ ] |
| T002 | `router-skill-template.md` (new) + `<!-- router-skill -->` on the 12 `steps/` owners + reference from `create-skill` | 1.0 | — | [ ] |
| T003 | Link integrity: `launch` phantom link; 20 unreachable step files resolved; 8 H1s added; `design` phantom skill removed; `journey-map` fence repaired | 2.0 | T001 | [ ] |
| T004 | Stale mirrors: `customize-skill` 4 `.opencode` refs + 3 `evals/evals.json` refs; `create-skill` 2 `evals/evals.json` refs | 1.0 | T001 | [ ] |
| T005 | Description triggering rewrite — 27 skills; catalog regen + `git diff --exit-code` | 2.0 | T001 | [ ] |
| T006 | Metadata: `last_updated` ×18; full `metadata` block on `round-table` | 0.75 | — | [ ] |
| T007 | `## What this skill does` on the 9 remaining non-router skills, so the new warning channel reaches zero | 0.75 | T002 | [ ] |
| T008 | DNA 6: `sprint-status` → Markdown tables; `analyze-data` + `craft-lesson` → Mermaid; `orchestrator_state.js status` → Markdown dashboard | 1.5 | — | [ ] |
| T009 | `review` — reference the `req_to_impl_check.js` orphan-AC sweep | 0.25 | — | [ ] |
| T010 | Evals: `help-me` + `humanize` + `elicitation` benchmarks; cross-ref `grill-me`/`shut-up` invariants; `npm run eval` loads all 13 suites clean | 1.5 | — | [ ] |
| T011 | `evals-schema.md` rewrite to the real format; `create-skill` Step 5 + anatomy repointed | 1.0 | T010 | [ ] |
| T012 | Delete 4 `.mjs` + `motion/evals/evals.json`; manifest regen; `motion_spec_check.js` comment repair | 0.75 | — | [ ] |
| T013 | `humanize` split → `references/patterns.md`; content-skill body (not router); upstream-sync header rewritten; 29 patterns verified in/out | 1.25 | T005 | [ ] |
| T014 | Full verification gate (see below) | 1.25 | T001–T013 | [ ] |

## Dependency graph

```
T001 ─┬─→ T003 ─┐
      ├─→ T004 ─┤
      └─→ T005 ─┼─→ T013 ─┐
T002 ─────→ T007 ─┤        │
T006 ─────────────┤        │
T008 ─────────────┼────────┼─→ T014
T009 ─────────────┤        │
T010 ──→ T011 ────┤        │
T012 ─────────────┘        │
                           ┘
```

Single-repo skill/script/suite/test edits — sequential in one session; no worktree. Uncommitted 02t work is preserved: additive suite appends only, no wholesale rewrite of `operations.json`.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A new **violation** fires on a legitimate construct and blocks the build | Med | High | Each of the 8 rules is a decidable fact, and each is run against all 41 skills in T014 before the plan closes. `journey-map`'s fence repair and `sprint-status`'s glyph cleanup are in scope for exactly this reason. T014 requires **0 violations and 0 warnings** across all 41 — a linter that cannot be driven to zero is a broken linter. |
| Description rewrite breaks YAML (`: `, `>`, 1024 chars) or changes routing behavior | Med | High | `spec_check.js` after every batch; single-line; quote any `: `; the "what it does" clause is preserved verbatim as sentence 1 so only the trigger tail is new. |
| `orchestrator_state.js status` output is parsed by a test or script | Med | High | 716-assertion suite gates the change. Grep for consumers before editing. |
| Deleting the 4 `.mjs` files breaks a reference v1 never found | Low | High | Grep `package.json`, `tests/`, `.github/`, `.husky/`, `.agents/manifest.json`, `.agents/.vespyr-manifest.json`, and `*.js` comments. `motion_spec_check.js` already names `test-motion.mjs` in two comments — repaired in the same task. |
| `humanize` split loses a pattern or breaks the worked example | Med | Med | Move verbatim; count 29 headings in and out; keep the example intact; rewrite the upstream-sync header so a future pull does not silently clobber the split. |
| `evals/suites/skills/operations.json` edit collides with uncommitted 02t benchmarks | Med | Med | Append to the `benchmarks` array; re-read the file immediately before writing; `git diff` reviewed for the 02t entries still being present. |
| Deleting `motion/evals/evals.json` loses content | Low | Med | Confirmed zero readers. Preserve the 2 case definitions' intent inside the `SKILL-MOTION` benchmark's assertions rather than dropping them. |
| Working tree already carries uncommitted 02t changes, so "clean" is ambiguous | High | Med | Baseline `git status --porcelain` captured before T001 and re-checked at T014; 02s changes are identified by path, never by "the tree is clean". |

## State machine integration

`node .agents/scripts/orchestrator_state.js complete --agent default --artifact 02s-phase-1-skill-consistency-and-evals-coverage.md`

## Definition of Done — verified 2026-09-30

| # | Item | Result |
|---|---|---|
| 1 | `spec_check.js` emits 8 violations + 6 warnings per the taxonomy; `node --check` clean; self-test covers every new rule | **DONE** — 27 self-test cases (7 pre-existing + 20 new), all pass |
| 2 | `spec_check.js` reports **0 violations and 0 warnings across all 41 skills** | **DONE** — from 62 violations / 54 warnings at the start |
| 3 | `router-skill-template.md` exists, is referenced from `create-skill`, and all 12 `steps/`-owning skills carry `<!-- router-skill -->` | **DONE** |
| 4 | 0 phantom step links, 0 unreachable step files, 0 missing H1s, 0 stale `.opencode` refs, 0 phantom skill refs, 0 unbalanced fences, 0 out-of-fence glyphs | **DONE** — 20 unreachable step files linked, 2 phantom links fixed, 8 H1s added, 1 phantom skill removed, 1 split fence repaired, 4 `.opencode` refs + 3 dead-format refs removed |
| 5 | All 41 descriptions carry an explicit trigger cue; catalog regenerated | **DONE** — 27 rewritten; catalog byte-identical on re-run (deterministic) |
| 6 | `last_updated` on all 41; `round-table` has a full `metadata` block | **DONE** — 18 touched, exactly matching the verified gap list |
| 7 | `## What this skill does` on every non-router skill | **DONE** — 9 added; router-marked skills exempt |
| 8 | `sprint-status`, `analyze-data`, `craft-lesson`, and the `orchestrator_state.js status` dashboard are DNA 6 clean | **DONE** — 2 box tables, 1 driver tree, 1 phase flow, 1 script dashboard |
| 9 | `journey-map` template fence renders as one block; emotional arc is now a table | **DONE** |
| 10 | `review` references the orphan-AC sweep | **DONE** — Step 3, matching `test/SKILL.md:22` |
| 11 | All 41 skills have benchmark coverage; `npm run eval` loads all 13 suites with 0 `malformed suite` lines | **DONE** — `help-me`, `humanize`, `elicitation` added; `grill-me`/`shut-up` cross-referenced in their invariant suites' `note` fields |
| 12 | `evals-schema.md` documents the real `vespyr-eval` format; `create-skill` Step 5 + anatomy repointed | **DONE** |
| 13 | 5 dead files deleted; both manifests regenerated; `motion_spec_check.js` comments repaired | **DONE** — 356 files, `verify` clean |
| 14 | `humanize` under 500 lines as a content skill; 29 patterns preserved; upstream-sync header corrected | **DONE** — 571 → 202 lines; 29 in, 29 out |
| 15 | `npm test` green; manifest regen + verify clean | **DONE** — 716/716 at execution. **Post-execution correction 2026-09-30:** 731 → 746 after porting 2 deleted harnesses into `tests/skills/` (DEC-2 amendment above) |
| 16 | Uncommitted 02t work intact | **DONE** — `operations.json` still carries both `legal-safety-audit` benchmarks; `.agents/skills/legal-safety-audit/` untouched |

### Two honest deviations from this plan

**1. `npm run eval` mock pass rate moved 26.9% → 26.4%, not "no worse".** This is arithmetic, not regression. The 3 new benchmarks pass tier-0 (deterministic `assertContains` against a real fixture) but fail tier-1, whose semantic judge is a stub in mock mode — exactly like every other skill benchmark (`SKILL-TEACH-ME` is T0 PASS / T1 2.00 / FAIL). The passed count is unchanged at 39; the denominator grew 145 → 148, so the rate fell. Leaving 3 of 41 skills with zero verification to protect a stub's percentage is the wrong trade, and the baseline belongs to 02j. **Not a regression — recorded rather than hidden.**

**2. One benchmark per skill, not two.** The first pass added 7. The mock adapter keys its canned fixture by *skill*, not by benchmark, so a second benchmark on the same skill can never go green in mock mode — and the only escape hatch, a per-benchmark `mockOutput`, is substituted whenever a real adapter returns `null`, which would quietly self-grade a real run. Rejected on that risk. The extra coverage was folded into the surviving benchmarks' assertions: the deleted `motion/evals/evals.json` lightweight-routing intent now lives inside `SKILL-MOTION`, and the anti-sycophancy intent inside `SKILL-ELICITATION-LEDGER`. This also matches the house pattern — 1 benchmark per covered skill, with the 15 `grill-me` traps in `invariants/` as the deliberate exception.

### Defect introduced and repaired during execution (recorded, not hidden)

The bulk metadata script used `Array.splice` with an off-by-one delete count and removed the closing `---` frontmatter delimiter from 18 skills, making them unloadable. Caught immediately by the skill loader, repaired, and `fmcheck.js` was written to assert the invariant across all 41: opening `---`, a closing `---` before the H1, and no body content inside the frontmatter. All 41 pass. **Lesson: no bulk `splice` on frontmatter — the delimiter is the load-bearing token and a count error is silently fatal.** A second self-inflicted defect (the router-marker detector matching skills that *document* the marker) was fixed the same way: the regex now requires a standalone comment line, with a regression case in the self-test.

### Correction to DEC-2 — found on owner challenge, 2026-09-30

**DEC-2's premise was half wrong, and the plan shipped the error.** "Unreferenced" was verified correctly — the 4 `.mjs` files really had no reader in `package.json`, `tests/run-all.js`, CI, or the pre-commit hook. What was never checked is whether they were *load-bearing*, and 2 of the 4 were:

| Deleted file | Assertions at deletion | What it actually enforced | Disposition |
|---|---|---|---|
| `test-qa-enrichment.mjs` | 100/100 green | The `@qa-engineer` enrichment contract and the `at least 3 newly discovered scenarios` gate | **Ported** → `tests/skills/test-qa-enrichment.test.js` |
| `test-unpack-problem.mjs` | 103/103 green | `problem-space-brief.md` cross-skill wiring into validate-idea / shape-up / explore-idea | **Ported** → `tests/skills/unpack-problem.test.js` |
| `test-motion.mjs` | 73 checks, simulates | Its only unique logic (`validateMotionPrompt` + traceability) was already ported onto the *real* artifact by `motion_spec_check.js`, which has its own 9/9 suite | Stands deleted — correct |
| `test-shape-up.mjs` | 82/82 green | **Nothing.** 81 of 82 assertions ran against logic it reimplemented inside its own file, on fixtures it wrote itself | Stands deleted — correct, it was a fake gate |

Evidence that the loss was real, not theoretical: after the delete, `grep -rn "3 newly discovered" tests/ .agents/scripts/` returned **zero hits**. Nothing enforced that gate. The eval benchmarks cited as the substitute (`SKILL-TEST`, `SKILL-UNPACK-PROBLEM`, `SKILL-SHAPE-UP`, `SKILL-MOTION`) are 3–6 `assertContains` string checks each — not equivalent to 100+ structural assertions against real files.

**The root cause is a category error in the delete criterion, and it generalizes:** "no reader" was treated as "no value". For a test file those are unrelated properties. A passing test nothing runs is *wiring debt*, and the fix is to wire it, not to delete it. The correct criterion is **"does this assert something nothing else asserts, and is it currently green?"** — both ported files passed *and* held unique coverage. `test-shape-up.mjs` failed that second test and is the only one whose deletion is unambiguously clean.

Ports are CommonJS `describe`/`it` under `tests/skills/`, so `tests/run-all.js` discovers them and `npm test`, CI, and the pre-commit hook all execute them. RED capability proven by fault injection: mutating `at least 3 newly discovered scenarios` and `explore-idea`'s `Path D` failed exactly the 2 matching tests and left the other 13 green, then restored clean (`bin/cli.js verify` → 357 files OK). Suite went 731 → 746. One deliberate deviation: the original asserted `exploreIdea.includes('problem-space-brief.md')` twice, so the port carries 102 assertions, not 103 — the duplicate predicate carried no signal.

Five plan citations that named the deleted harnesses as proof (`02-phase-1-skills.md:1153,1491,1492`, `02k:207,250`) were corrected forward in place with dated supersession notes rather than silently rewritten. Note that `02-phase-1-skills.md:1153` also carried a pre-existing count error (claimed 28/28, harness reported 82) and `:1491` claimed 104 where the harness reported 100 — three of the five citations overstated their own evidence before this correction.

## What this plan deliberately does NOT do

- **No new skills or personas.** Coverage is sufficient; adding surface is the failure mode the README warns against.
- **No hard gates on prose.** A gate that passes an empty-but-present section and blocks a well-written differently-phrased one is a fake gate. Every prose rule stays a warning.
- **No scored evals forced onto subjective canvas output.** 36 of 41 are covered; the remaining canvas work stays an audit, not a fabricated score.
- **No re-pin of the security corpus scanner hash.** Pre-existing, unrelated, owner ruling required.
- **No rewrite of the canvas discovery skills into a shared ledger.** Audit findings recorded; adopt/defer is the owner's call.
