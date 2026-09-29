# Record Integrity Recovery — Dev-Plan Checkbox Reconciliation & Harness-Scope Alignment (02p)

**Decision:** Vespyr adopts a mechanical-evidence standard for every dev-plan checkbox: a box may be checked only when a reproducible command (grep/ls/git show/test run) proves its claim on disk at check time. This plan reconciles the ~54 falsely-stamped boxes found in the 2026-08-23 audit, rebuilds the two 02g tooling items that were never built, aligns the harness matrix to the owner's five-shape scope under the architect's emitter/symlink classification, and bootstraps the missing sign-off machinery. Single-author serial execution is a **binding constraint**, not a recommendation — the root cause of this recovery was concurrent sessions clobbering shared state.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — authored as `02m` (13th); re-homed to `02n` on 2026-08-28; **re-homed to `02o` on 2026-09-09** when the owner-urgent reverse-PRD design fork was inserted as `02n`; **re-homed to `02p` on 2026-09-10** when the owner-requested traditional-direction parity plan was inserted as `02o`. Current neighbors: after `02o-phase-1-prd-prototype-fidelity.md`, before `02q-phase-1-parallel-session-safety.md` (formerly numbered `02o`, then `02p`). Task IDs below retain their historical `R*` numbering. It repairs the record layer beneath the entire `02*` series; it does not reopen feature work closed legitimately. **Sequencing (ruled 2026-08-23, owner-requested hybrid):** a ~3.5h prelude (R0.1–R0.2) runs first; then 02h→02i→02j→02k→02l proceed to completion under evidence-stamping rules with closure stamping PROHIBITED; full 02m reconciliation executes last, after hijkl facts settle.

**Gate reviews:** Roundtable 2026-08-23 (@architect, @tech-lead, @developer) — full forensics on disk: 02g KILL adjudicated over three rounds (git archaeology: `dcf028e` honest PARTIALLY EXECUTED state reverted to EXECUTED inside mislabeled typo-fix commit `43f8fa1`; H-CONC concurrency hypothesis owner-corroborated); mechanical checkbox sweep of 02-phase-1-skills (126 boxes), 06, 08 completed. Verdict and dispositions recorded in `artifacts/memory/active-decisions.md` (2026-08-23 entries).

**✅ RESOLVED (2026-08-24) — harness classification:** Owner refuted the architect's emitter/symlink classification with primary sources (cited in §10): GitHub Copilot and Google Antigravity **natively discover `.agents/skills/`** — canonical placement suffices, zero emission. Architect conceded formally, issued revised classification ([PIVOT]); concessions logged. Consequences binding on WS-D: (C1) zero skill emission for Copilot/Antigravity; (C7) `transpileCopilotYAML()` demoted — retained only if C2 resolves to persona-emission, else cut.

> **[02p 2026-09-29 — field-evidence correction to C1/C7]** The owner's 2026-08-25 VS Code field test showed the `/` picker does not surface root `.agents/skills`; Copilot therefore receives an emitted `.github/skills` link (see matrix). "Zero skill emission" now holds for **Antigravity only**; Copilot's no-persona-emission rule (C2=B: no `.agent.md`) is intact; `transpileCopilotYAML()` was cut (verified absent from code paths).

**✅ ALL OWNER DECISIONS RESOLVED (2026-08-24):**
- **C2 = B (adoption-ride):** Copilot personas surface via root `AGENTS.md`; **`transpileCopilotYAML()` CUT** during execution (dead code targeting stale YAML format, no remaining consumer). No `.agent.md` emission.
- **C4 = A (single canonical):** always install personal skills to `~/.agents/skills`; per-tool bridging notes for shapes that don't read it natively (e.g., Antigravity CLI needs `~/.gemini/antigravity-cli/skills/`; VS-code-era tools vary).
- **C3 = YES:** Codex verification-before-build gate stands — pre-authorized (internal to R1.15).

**Field evidence (owner manual test, 2026-08-24):** *"copilot… use .agents in global installation but did not read .agents for autocomplete. it can read .agents but did not show it in autocomplete"* → Copilot consumes `~/.agents/skills` functionally but does not list them in autocomplete/picker (**functional-but-invisible**). Consequences: matrix doc sets user expectations accordingly; DoD smoke criteria assert functional activation, not autocomplete visibility; no architecture impact.

**No open questions remain — plan is execution-ready.**

**Budget:** 34.5h authoring serial (incl. 0.5h prelude discipline item; WS-D re-scoped 2026-08-24 per C1–C7 and owner decisions C2=B/C4=A/C3=YES — emitter work cut, native-read verification + compliance audit retained), single-writer, commit-after-every-build-item *(suspended 2026-09-29 — owner standing rule; see §5.1/§12)*. No parallel lanes. No stretch estimate — if it exceeds 40h, stop and replan with Chris.

---

## 1. Mandate & Scope

**Mandate (from Chris):** Mechanical re-verification of every dev-plan checkbox after proven systemic record corruption; recovery, not blame. Concurrent 02f+02g sessions over one working tree produced clobbered records; the sweep confirmed ~54 false boxes across 8 documents and a repo-wide governance hole (`utter-satisfaction.md` holds **zero** per-epic sign-off records).

### 1.1 In scope

| Item | Detail |
|---|---|
| Reconcile false checkboxes (~54) | Per-doc counts: 02a×2, 02b×2, 02c×6, 02d×5, 02-phase-1-skills×31, 02g §7.3 status, 02h×6, 02i×1, 02j×1 |
| Doc truth scrub | `README.md:113` eight-harness marketing; `Guide/en/installation.md:8`; stale `opencode.json.template` references; `02g §3.4` dangling 03c citation |
| Rebuild 02g never-built tooling | F1.69 lint (REBUILD recommended), F1.70 measurement cycle (REBUILD-lite), delegation-path rollout-or-descope decision |
| Harness matrix | Five shapes per owner scope + architect classification; strike `02h §5.4/T4.4` residue |
| Provenance hardening | Commit all untracked canonical artifacts; single-writer discipline; sign-off bootstrap |

### 1.2 Out of scope (named, with rationale)

| Item | Rationale |
|---|---|
| Re-opening 02g feature work | Delegation-language rewrite shipped and stays approved; only its *record* was killed |
| Cursor/Windsurf transpiler work | Owner excluded; `transpileCursorMDC` stays dormant/commented as post-v2 option — **[02p 2026-09-29: corrected — both legacy transpilers were cut 2026-08-25 (`5c97065`, `bin/lib/transpilers.js` removed); the post-v2 redesign lives in `03c`]** |
| Gemini/Aider support | Covered free via AGENTS.md §Invocation single-agent read-and-adopt pattern |
| cli.js slim-coordinator refactor beyond the five targets | Scope creep; extraction limited to owned shapes |
| Rewriting history (git filter/rebase) | Records are corrected forward; rewriting published commits repeats the opacity defect |
| New personas/skills | No speculative additions during recovery |

---

## 2. First Principles

1. **A checkbox is a claim about disk, not about intention.** If a command cannot reproduce the claim today, the box is false regardless of past effort (audit lesson).
2. **Correct forward, never backward.** Fix records in place with dated corrections; never revert a committed correction silently (the `43f8fa1` defect).
3. **One writer per time-window.** Concurrency over shared mutable state produced this recovery; the plan that fixes it must not repeat it (R56).
4. **Canonical store, emitted views.** `.agents/` is source of truth. Native `.agents/skills` discovery (Copilot, Antigravity — owner-verified 2026-08-24 against primary docs) makes canonical placement itself the distribution mechanism for skills; emitters/symlinks remain only where a shape lacks native read (Kiro steering, Codex pending verification, Copilot personas per C2).
5. **Supersession must land in the superseded artifact.** Scope evolution recorded only in session logs is invisible corruption; correct the canonical file or annotate it.
6. **Marketing follows matrix.** No doc may claim more harnesses than the registry supports and tests prove.

---

## 3. Verified Inventory (2026-08-23 sweep)

- **False-box census:** 02-phase-1-skills ×31 (18-box delegation cluster; tri-modal dirs flattened to `steps/`; deleted-persona enrichment boxes; ml-ai-ops.md 113<200 lines; methods.csv 99≠100; "02g completed" line), 02c×6 (shifu.md 393 actual vs 324 recorded; @writer QA-pass box; 22-agent counts), 02h×6 (T4.1 cli.js 2695≠250; T4.4 Antigravity/Gemini/Aider absent; T5.5 lib consumers; T2.2 workflow.md; T3.2 grill-me branch 4), 02d×5, 02i×1, 02j×1, 02a×2, 02b×2.
- **Tooling:** `compile_skills.js`/`spec_check.js` contain zero delegation logic; `delegation_audit.js` exists but `.agents/state/` absent; `transpileCopilotYAML()` at `bin/lib/transpilers.js:54`, wired `cli.js:979`, registry entry commented `cli.js:40-53`; OpenCode native-symlink `cli.js:678`; Claude Code config-file-only `cli.js:680`; Kiro hybrid `cli.js:1027ff`.
- **Provenance:** ADR-005 untracked; `.opencode/skills/` tree entirely untracked; `utter-satisfaction.md` has zero per-epic records.

---

## 4. Workstreams

- **WS-A — Record reconciliation:** truthful 02g §7.3 (cite `dcf028e` text verbatim); per-class disposition of every false box — *correct-in-place* (factual errors: line counts, file inventories), *mark-superseded* (delegation/tri-modal/persona deletions legitimately undone by later epics but left checked), *convert-to-build-item* (claims whose underlying work is still wanted, e.g., methods.csv completion).
- **WS-B — Doc truth scrub:** real three-active-plus-dormant harness matrix replacing eight-harness marketing; kill stale template filename references; re-point 02g §3.4 to this plan until a tested matrix exists.
- **WS-C — Tooling rebuild decisions:** F1.69 delegation lint as additive `compile_skills.js` hook (trio-invocation ban, delegation-path requirement where applicable) — REBUILD recommended, fraud-prevention value proven this week. **[Note 2026-09-24: R0.2 shipped the lint ban-only — the trio personas were removed outright, so the originally-planned "persona-marking whitelist" was dropped as unnecessary.]** F1.70 measurement cycle baseline — REBUILD-lite; delegation-path line rollout costed against formal ADR-descope alternative — rollout only for skills retaining delegation semantics.
- **WS-D — Harness alignment:** five shapes only — OpenCode native-symlink (verify/regression-test), Claude Code CONFIG-FILE-ONLY, Kiro HYBRID (emit steering from `.agents/templates/system/vespyr-steering.md.canonical` + symlink `.kiro/skills`), GitHub Copilot GENERATE-TARGET (enable registry entry, smoke test), Antigravity ZERO-WORK (read-and-adopt verification), Codex NEW minimal emitter (AGENTS.md pointer + optional `.codex/config.toml` emission; speculative machinery excluded). Strike 02h residue. **[02p 2026-09-29 — as-built corrections: Claude Code = `.claude -> .agents` symlink + `CLAUDE.md` (02h §10 A2a); Copilot = `.github/copilot-instructions.md` stub + `.github/skills` link (field test); Codex = zero-work native read, no emitter; cursor/windsurf legacy-cleanup only, transpilers cut 2026-08-25. See `.agents/references/harness-matrix.md` + §12.]**
- **WS-E — Provenance hardening:** commit-sweep untracked canonical artifacts; codify single-writer execution discipline (one epic per window; no overlapping-path sessions; commit-per-build-item; history.md attestation line per commit batch; worktree-per-session convention noted for future parallelism); bootstrap real per-epic sign-offs in `utter-satisfaction.md`, starting with this plan's own gate.

---

## 5. Build Items (R0.x–R1.18, 34.5h)

| ID | Task | Est | Depends on |
|---|---|---|---|
| R0.1 | PRELUDE — adopt mechanical-evidence stamping rules repo-wide (evidence command adjacent to every box; closure stamping prohibited until post-reconciliation; attestation lines per commit batch) | 0.5h | — |
| R0.2 ✅ | PRELUDE — F1.69 rebuild **EXECUTED 2026-08-25 (owner-adjusted scope: trio personas removed outright, so no persona-marking whitelist needed)** — fail-closed lint in `compile_skills.js` bans `@reader/@writer/@executor` across every SKILL.md + steps/*.md; planted-violation probe exits 1 with file:line, clean tree exits 0; wired into default compile path so CI/spec flows inherit it.
  - **Evidence (2026-08-25, working tree — awaiting owner commit):** `node .agents/scripts/compile_skills.js` → '✓ Compiled 42 skills' + '✓ delegation lint: zero removed-persona handles'; planted `.agents/skills/shut-up/steps/__lint_probe.md` containing '@writer' → exit 1 naming the file:line; removed → exit 0. Initial anchor bug (`\b@writer\b` never matches — @ is a non-word char) caught by the probe itself before any stamp. **Correction (2026-08-25, Scout):** an earlier session note claimed `.agents/state/` absent so `delegation_audit.js` could not run — false: the dir exists (`drift-history.json`) and the script executes via fallback; it is *informational-only* until R1.10 rewrites it (its fallback also counts historical mentions as activity). `DELEGATION_HANDLES` there stays untouched for that rebuild. **Integrity re-pin:** manifest.json regenerated same day for compile_skills.js/orchestrator_state.js edits per 02f re-baseline rule; `node bin/cli.js verify` → all 315 files OK. | 3h→1h actual | R0.1 |
| R1.1 | Author single-writer execution discipline section (this doc §7.1 becomes binding; mirror one-line rule into GUARDRAILS pointer note via session log, no other file edits) | 1h | — |
| R1.2 | Untracked-artifact sweep: `git status --porcelain` inventory; commit ADR-005 + verified-canonical siblings with message listing each | 1.5h | — |
| R1.3 | Rewrite 02g §7.3 to truthful status quoting `dcf028e`'s PARTIALLY EXECUTED accounting; add dated correction banner | 1h | — |
| R1.4 | Reconcile 02-phase-1-skills ×31 boxes per class (correct-in-place / superseded-mark / convert-to-R-item) | 2h | R1.3 |
| R1.5 | Reconcile 02c×6 + 02h×6 (re-run `wc -l` evidence, correct counts, mark absent features honestly) | 1.5h | R1.3 |
| R1.6 | Reconcile remaining smalls: 02a×2, 02b×2, 02d×5, 02i×1, 02j×1 | 1.5h | R1.3 |
| R1.7 | WS-B scrub: README.md:113 + Guide/en/installation.md:8 → three-active-plus-dormant matrix | 1.5h | R1.3 |
| R1.8 | WS-B scrub: stale `opencode.json.template` refs; 02g §3.4 re-point to this plan | 1h | R1.7 |
| ~~R1.9~~ | _(intentionally vacant — an earlier draft's R1.9 was folded into R1.8/R1.10; the ID is retired, not missing. Downstream IDs keep their numbers to preserve dependency + critical-path references. Noted 2026-09-24.)_ | — | — |
| R1.10 | F1.70 rebuild-lite: `.agents/state/delegation-log.json` baseline via `delegation_audit.js`; weekly cadence note; post-v2.0.0 review date 2026-09-30 | 1.5h | R0.2 |
| R1.11 | Delegation-path decision gate: cost rollout (~37 skills, ~4h) vs ADR descope amendment (~1h); execute chosen path for skills retaining delegation semantics only | 4h | R1.10 |
| R1.12 | Copilot (C1/C2 **RESOLVED=B**): verify native `.agents/skills/` discovery; **CUT `transpileCopilotYAML()` + its `cli.js` wiring remnants** (dead code — stale YAML format, no remaining consumer); record persona-adoption-via-root-AGENTS.md as the Copilot persona mechanism in matrix doc | 1h | — |
| R1.13 | Kiro HYBRID: steering-template emission + `.kiro/skills` symlink path verified (`cli.js:1027ff`) | 2h | R1.12 |
| R1.14 | Claude Code CONFIG-FILE-ONLY + OpenCode native-symlink + Antigravity native-read proof (`.agents/skills/`, `.agents/rules/`, `.agents/workflows/` per docs): regression checks (`cli.js:680/:678`) | 1.5h | R1.13 |
| R1.15 | Codex (C3 verification gate FIRST — consent granted 2026-08-24, pre-authorized): test whether Codex consumes `.agents/skills/`; negative → ship CONFIG-FILE-ONLY (AGENTS.md pointer); positive → minimal config only; design note in this doc before code | 2h | R1.14 |
| R1.16 | Strike 02h §5.4/T4.4 residue; HARNESS_OPTIONS registry cleanup (Cursor/Windsurf stay dormant-commented, labeled post-v2); **C6 collision doc note** (Antigravity `.agents/agents.md` team-file vs Vespyr `.agents/agents/` dir — non-conflict documented in matrix); DoD verification pass | 2h | R1.15, R1.18 |
| R1.17 | Global-scope matrix (C4 **RESOLVED=A**): `~/.agents/skills` is the single canonical install target; per-shape bridging table for tools that don't read it natively (Antigravity CLI → `~/.gemini/config/skills`, etc.); record Copilot **functional-but-invisible** caveat (skills consumed but absent from autocomplete/picker — set user expectations) | 1h | — |
| R1.18 | Frontmatter compliance audit (C5, mechanical): script-check all 42 SKILL.md against agentskills.io spec — `name`/`description` required; `license`/`compatibility`/`metadata`/`allowed-tools` optional; fix gaps or annotate deviations | 2h | R0.1 |

**Total: 34.5h serial.** Arithmetic: 35.5h − 1h (R1.12 emission-branch work evaporated by C2=B; verification + transpiler-cut remain) = 34.5h. Critical path: R0.1→R0.2→(hijkl execution window)→R1.3→(R1.4‖R1.7)→R1.10→R1.11→R1.16; single-author makes wall-clock = serial sum.

### 5.1 Item ledger — execution evidence (2026-09-29)

> **Execution mode:** single-writer, serial, clean tree at start (`git status --porcelain` → empty). **Commit rule:** the owner's standing rule of 2026-08-25 forbids `git commit`/`push` without a current-turn owner instruction — the plan's commit-per-item cadence is suspended; all work is uncommitted in the working tree, awaiting owner review (see §12). Every command ran from repo root; R0.2 evidence stands from 2026-08-25.

| Item | Disposition 2026-09-29 | Evidence (command → result) |
|---|---|---|
| R0.1 ✅ | Adopted; applied across this execution | `grep -c "SUPERSEDED" artifacts/docs/strategy/development-plan/02-phase-1-skills.md` → 27 annotated lines; `02g` §7.3 correction table |
| R0.2 ✅ | Executed 2026-08-25 (pre-existing) | Clean tree: `node .agents/scripts/compile_skills.js` → "✓ Compiled 40 skills" + lint clean, exit 0; planted probe → exit 1 (2026-08-25 evidence) |
| R1.1 ✅ | Satisfied — landed earlier via 02q; no new edit needed | `sed -n '141p' .agents/GUARDRAILS.md` → "One epic per window…" rule present; §7.1 here |
| R1.2 ⛔ | Superseded — ADR-005 absent; `artifacts/output/` is gitignored by design | `find . -name '*adr-005*'` → 0; `git ls-files artifacts/output` → 0 entries |
| R1.3 ✅ | `02g` §7.3 rewritten (`dcf028e` quote + per-item table + phase-gate restatement) | `git show dcf028e:…02g…` → honest "PARTIALLY EXECUTED" text at line 197; file re-read |
| R1.4 ✅ | `02-phase-1-skills`: 31 items dispositioned (30 corrected/superseded/false + 1 verified-true) | `grep -c "\[x\].*delegation" …` → 18; unannotated → 0 |
| R1.5 ✅ | `02c` ×6 + `02h` ×6 dispositioned; counts re-measured | `wc -l .agents/agents/shifu.md` → 395; `grep -c "## Delegation Contract"` ×4 personas → 0/0/0/0; `wc -l bin/cli.js` → 2169 |
| R1.6 ✅ | Smalls reconciled: `02a` ×2 (+inventory), `02b` ×4, `02d` ×5, `02i` ×1 (already fixed 2026-08-25), `02j` ×2 (incl. 02m-review TL-HO-06) | Per-annotation commands; `02i`: `grep -c HISTORICAL_MEMORY_DATA .agents/scripts/memory_filter.js` → 2 |
| R1.7 ✅ | README + README_CN + Guide EN/CN aligned (40 skills; matrix-true harness claims) | `grep -n "40 curated skills" README.md`; `grep -rn "opencode.json.template" README.md README_CN.md Guide/` → 0 |
| R1.8 ✅ | `02g` §3.3/§3.4 re-pointed; stale template refs verified absent | `grep -rn "opencode.json.template" README.md README_CN.md Guide/` → 0 |
| R1.10 ✅ | Baseline log created + weekly cadence recorded; empty-log fallback patched so the audit is not blinded (see §12 F-6) | `test -f .agents/state/delegation-log.json` → present; `node .agents/scripts/delegation_audit.js` → baseline log read + fallback path active |
| R1.11 ✅ | DESCOPE recorded (no rollout); stated count = 1 | `grep -rl "^Delegation path:" .agents/skills/` → 1 (`round-table/SKILL.md:27`); decision in `.agents/references/delegation-policy.md` |
| R1.12 ✅ | Copilot verified; transpiler cut completed (stale test import removed); C2=B recorded in matrix | `grep -rn "transpileCopilotYAML" bin/ tools/ tests/ .agents/scripts/` → 0 (after fix); matrix row |
| R1.13 ✅ | Kiro hybrid verified | `grep -c "vespyr-steering.md.canonical" bin/lib/harnesses/kiro.js` → 2; `tests/test_harness_adapters.test.js` |
| R1.14 ✅ | Claude/OpenCode links + Antigravity native read documented | `grep -c "\.claude\|\.opencode" bin/lib/harnesses/claude-code.js bin/lib/harnesses/opencode.js` → 9/9 hits; matrix rows |
| R1.15 ✅ | Codex = zero-work native read (no adapter by design) — supersedes the "minimal emitter" branch | `grep -c "codex" bin/lib/harnesses/index.js tests/test_harness_adapters.test.js` → comment + 5 test hits |
| R1.16 ✅ | §5.4 struck; §8 conflicts fixed; registry cleanup verified; C6 note in matrix; DoD pass run | `02h` diff; matrix §C6; §8 below |
| R1.17 ✅ | Canonical matrix created + guides updated | `wc -l .agents/references/harness-matrix.md` → 47; `grep -n "Supported harnesses" Guide/en/installation.md` → present |
| R1.18 ✅ | 40/40 SKILL.md pass the agentskills.io spec | `node .agents/scripts/spec_check.js` → "✓ All 40 skills pass agentskills.io spec checks."; report: `artifacts/docs/review/frontmatter-compliance-audit-2026-09-29.md` |

**Final verification (2026-09-29):** `node .agents/scripts/spec_check.js` → "✓ All 40 skills pass agentskills.io spec checks." (exit 0); `node .agents/scripts/compile_skills.js` → "✓ Compiled 40 skills" + zero-handle lint (exit 0); `npm test` → **678 pass / 0 fail** (64 suites); `node bin/cli.js manifest` → 347 files; `node bin/cli.js verify` → "All 348 files verified", exit 0. Independent seats (@developer / @architect / @qa-engineer) reviewed the diff and found **8 defects (D-1–D-8, see §12.2)**; all were fixed, and re-validation verdicts are recorded in `artifacts/output/06-quality/sign-off-history.md`.

> **[Superseded 2026-09-29 (post-02q) — numbers moved; this epic is still uncommitted]** After this closing run the parallel 02q epic landed in the same working tree (+11 tests, manifest re-pinned) and a `compile_skills.js` scrape-filter fix was applied (real-persona allowlist for `key_agents`, removing scraped `@agent-a`/`@a`/`@round-table`/`@shadcn` placeholders). Current disk: `npm test` → **689 pass / 0 fail** (65 suites); `verify` **fails by design** — the manifest pins only 02q's files while 02p's files show as expected drift (two uncommitted epics cannot both be manifest-green at once). The 678/347/348 figures above were true at 02p's closing run; they will only reproduce once 02p is committed on a clean base and the manifest is regenerated for it. No 02p deliverable changed — only the shared-tree verification numbers.

### 7.1 Sequencing notes — SINGLE-WRITER MANDATE (BINDING)

- **RULED ORDER (2026-08-23, hybrid):** (1) prelude R0.1→R0.2 (~3.5h); (2) owner-preferred feature run: 02h→02i→02j→02k→02l executed to completion under R0.1 rules — 02k/02l apply their CHANGES REQUESTED spec fixes first/during execution; (3) full 02m reconciliation (R1.1–R1.16) last, reconciling each epic once against final on-disk facts.
- **"Finish" definition during the hijkl window:** all remaining build items executed and stamped only with adjacent command evidence. PROHIBITED until post-reconciliation: any plan-level status banner (`EXECUTED`/`COMPLETE`), phase-gate advancement claims, "closed" assertions in history.md, and dev-plan README status-table changes for h/i/j/k/l.
- Known-false boxes in h/i/j stay untouched for the 02m final pass unless that epic's own execution directly proves/disproves them — then correct forward with a dated banner, never silently.
- One epic per time-window. No second agent session touches any path overlapping the active build item. Violations halt the epic.
- Commit after every build item, message naming the item ID; append one attestation line per batch to `artifacts/memory/session-summaries/history.md`. *[02p 2026-09-29: superseded by the owner's standing rule 2026-08-25 — no commits without a per-action instruction; attestation consolidated into this plan + memory session-write.]*
- WS-D gating (final 2026-08-24): all owner decisions resolved — no build item waits on Chris. R1.15 retains its internal C3 verification gate (pre-authorized); everything through R1.11 plus the C5 audit (R1.18) proceeds regardless.
- Future parallel lanes require git-worktree isolation per session, written as convention before first use.

### 7.2 Prerequisites (developer checklist)

- [x] 02g KILL disposition confirmed present in `active-decisions.md` (2026-08-23 entries) — *verified 2026-09-29 by read*
- [x] **Owner decisions C2/C4/C3 recorded** (done 2026-08-24, see header) — *re-verified in the header block before WS-D*
- [x] Sweep inventory (§3) re-verified — files move; recount before editing — *full re-verification 2026-09-29; deltas documented in §5.1 + §12*
- [x] Git tree clean at start of each work session — *`git status --porcelain` → empty at session start (2026-09-29)*

## 8. Definition of Done (mechanically verifiable)

Done when **all** pass:

1. `grep -c "\[x\].*delegation" artifacts/docs/strategy/development-plan/02-phase-1-skills.md` returns only superseded-annotated lines; every corrected box carries a dated evidence-command comment — **[Executed 2026-09-29: 18 matching lines, 0 unannotated (`… | grep -vc "SUPERSEDED\|VERIFIED TRUE"` → 0). Wording corrected: one line (F1.32.4) is VERIFIED-TRUE with evidence, not superseded — the live contract is "superseded OR verified-true".]**
2. 02g §7.3 status line quotes `git show dcf028e` PARTIALLY EXECUTED accounting verbatim — **[Verified 2026-09-29: rewrite landed; per-item disposition table in `02g` §7.3.]**
3. `wc -l` outputs cited in 02c/02h match live files (shifu.md=393±edits, documented) — **[Re-verified 2026-09-29: `02c` §6 table re-measured (shifu.md=395, 1,569 total); `02h` counts updated (cli.js=2169).]**
4. Lint: `node .agents/scripts/compile_skills.js --check` fails a planted trio-invocation fixture and passes a clean tree. **[Reconciled 2026-09-24: R0.2 executed with the trio removed outright, so there is no persona-marking whitelist — the lint is ban-only. The earlier "passes persona-marking fixture" clause is retired.] [Reconciled 2026-09-29: there is no `--check` flag — the lint runs in the default compile path (fail-closed, exit 1). Verified: clean tree → exit 0; planted `@writer` probe → exit 1 with file:line (2026-08-25 evidence). The `--check` spelling is retired.] [Probe-path note 2026-09-29 (QA re-verification): the 2026-08-25 probe path `.agents/skills/shut-up/steps/` no longer exists (shut-up has only `SKILL.md`); re-verification used a shape-up steps probe — same behavior: exit 1 naming file:line, removal → exit 0.]**
5. `.agents/state/delegation-log.json` exists with baseline date + `reviewDate: 2026-09-30` — **[Verified 2026-09-29: file created (R1.10); `delegation_audit.js` reads it.]**
6. Delegation-path decision recorded as ADR or executed rollout; `grep -rl "^Delegation path:" .agents/skills/ | wc -l` equals the number stated in the decision — **[Executed 2026-09-29: DESCOPE decision recorded; stated count = 1 (`round-table/SKILL.md:27`).]**
7. `cli.js --help` lists exactly the five owned shapes; Copilot + Antigravity resolve skills natively from `.agents/skills/` (zero skill emission present); **no `.github/agents/*.agent.md` emission present (C2=B) and `transpileCopilotYAML` absent from codebase**; Copilot smoke asserts functional skill activation — agent applies a skill from `.agents/skills/` — NOT autocomplete visibility (field evidence 2026-08-24); Cursor/Windsurf entries commented with post-v2 label; C6 non-conflict note present in matrix doc; C5 audit report covers 42/42 SKILL.md — **[Reconciled 2026-09-29: shape list is registry truth, not `--help` output (no harness list in `--help`) — 4 installable adapters (opencode/claude/github/kiro) + Antigravity/Codex zero-work native + cursor/windsurf legacy cleanup; Copilot skill emission is NOT zero — `.github/skills` link is emitted for the VS Code picker (field test 2026-08-25) while `.agent.md` emission stays absent (C2=B); `transpileCopilotYAML` absent from code paths (`grep` bin/ tools/ tests/ .agents/scripts/ → 0 after a stale test import was removed); C5 audit covers 40/40 (count corrected from 42); C6 note in `.agents/references/harness-matrix.md`.]**
8. `git ls-files artifacts/output/04-architecture/adr-005-harness-neutral-delegation-contract.md` non-empty — **[⛔ Superseded 2026-09-29: `artifacts/output/` is gitignored by design (`git ls-files artifacts/output` → 0 entries) and the ADR-005 file no longer exists on disk. Disposition recorded in `02g` §7.3; no commit is possible or meaningful.]**
9. `utter-satisfaction.md` contains ≥1 structured per-epic sign-off record (this plan's gate) — **[Re-pointed 2026-09-29: records go to `artifacts/output/06-quality/sign-off-history.md` per `.agents/references/utter-satisfaction.md:106` (which forbids appending records to itself). This plan's gate is recorded there as of 2026-09-29 — file created at closure, independent seats' verdicts inside.]**
10. **Process DoD:** zero boxes stamped in this plan without a command-output evidence line adjacent to the stamp — **[Satisfied 2026-09-29: every stamp in §5.1 carries an adjacent command + result; §7.2 boxes carry evidence.]**

---

## 9. Risk-Register Additions

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
- **Bonus fix (2026-08-25):** `orchestrator_state.js` `ensureGraph()` referenced `ensureScript` — undefined since 02h WS-1 deleted the graph scripts. Dead remnant + its three call sites and `ensure-graph` CLI subcommand removed; status/session-write verified post-surgery.

| R56 | Concurrent-session clobbering of shared working-tree state | High (observed 08-08..08-18) | High | Single-writer mandate (binding); commit-per-item cadence; worktree convention for future lanes |
| R57 | Untracked-artifact blindness — canonical records invisible to git archaeology | High (ADR-005 case) | Medium | WS-E commit sweep; pre-close `git status` gate in every epic checklist |
| R58 | Doc-marketing drift ahead of tested capability | Medium | Medium | WS-B matrix tied to registry truth; R0.2 lint extended to harness-count claims post-v2 |

## 10. Cross-References

| Reference | Relationship |
|---|---|
| `02g-phase-1-harness-honesty.md` | Source of standing KILL; §7.3 rewritten by R1.3; F1.69/F1.70 rebuilt here |
| `02h-phase-1-graph-shutup-and-cli.md` | T4.4/§5.4 residue struck by R1.16; cli.js work coordinated |
| `03d-phase-2-harness-integration.md` | Superseded as interim matrix source-of-truth by §3 here until tested matrix lands |
| `artifacts/memory/active-decisions.md` (2026-08-23) | KILL verdict, sweep results, emitter-reframe classification |
| `bin/cli.js`, `bin/lib/transpilers.js` | Line-referenced touchpoints in WS-D |
| `compile_skills.js`, `delegation_audit.js` | Lint host and measurement engine (R0.2/R1.10) |
| `.agents/references/utter-satisfaction.md` | Sign-off machinery bootstrap target (R1.16/E) |
| `08-cross-cutting-utter-satisfaction-dna.md` | Defines the satisfaction states this plan finally records per-epic |
| [docs.github.com — add-skills](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/extend-coding-agent/add-skills) | Evidence: Copilot native discovery of project skills at `.agents/skills` (+`.github/skills`, `.claude/skills`) and personal `~/.agents/skills` (`~/.copilot/skills`); SKILL.md per agentskills.io spec. Accessed: 2026-08-24 |
| [learn.microsoft.com — copilot-agent-skills](https://learn.microsoft.com/en-us/copilot/cli/mcp/copilot-agent-skills) | Evidence: Microsoft-side corroboration of Copilot skill locations and format. Accessed: 2026-08-24 |
| [antigravity.google/docs/skills](https://antigravity.google/docs/skills) | Evidence: Antigravity native read of `<repo>/.agents/skills/` (default) + `.agents/rules/`, `.agents/workflows/`, `.agents/agents.md` team-file convention; global `~/.gemini/config/skills/`. Accessed: 2026-08-24 |
| Owner field report 2026-08-24 | *"copilot… use .agents in global installation but did not read .agents for autocomplete. it can read .agents but did not show it in autocomplete"* — Copilot consumes `~/.agents/skills` functionally; autocomplete/picker does not list them (functional-but-invisible). Basis for R1.17 caveat + DoD #7 smoke wording |

---

## 11. Sign-Off

Recorded — not claimed — in `artifacts/output/06-quality/sign-off-history.md` (per DoD #9 as re-pointed 2026-09-29; `.agents/references/utter-satisfaction.md:106` forbids appending records here). Seat states as of 2026-09-29, after independent verification and fix loops:

- [x] @tech-lead (Grant): plan authored with binding single-writer constraint; execution evidence-stamped (§5.1/§12)
- [x] @developer (Rex): sweep data reproduced; reconciliation classes executable as specified — *round 1 `CHANGES REQUESTED` (D-1, D-2) → fixed → re-validated*
- [x] @architect (Vera): emitter/harness classification coherent vs code; canonical-store boundary preserved — *round 1 `CHANGES REQUESTED` (4 record defects) → fixed → re-validated*
- [x] @qa-engineer (Nina): DoD mechanically verified 10/10 — *round 1 held on DoD #9 (record absent) → record created → re-validated*
- [ ] Chris: commit authorization for the 23-path working tree (owner card in sign-off-history); recovery accepted at DoD verification

*Author: @tech-lead (Grant), from the 2026-08-23 roundtable forensics. Every checkbox above starts unchecked by design — this plan was born from checkbox fraud and will not reproduce it.* (Sign-off states added 2026-09-29 after independent verification — see sign-off-history.)

---

## 12. Execution Log — premise corrections, defects & follow-ups (2026-09-29)

**Executed by:** @tech-lead (Grant), single-writer, serial. Clean tree at start; all work **uncommitted in the working tree** (owner standing rule 2026-08-25 — no commits/pushes without a per-action instruction).

### 12.1 Premise corrections (authoring 2026-08-23/24 → disk 2026-09-29)

1. **Sequencing:** the plan schedules reconciliation last, after `02h→…→02l`. At execution, `02k` (round-table skill) is WIP and `02l` is not started — but every epic in this plan's reconciliation scope is settled (`02h` 2026-08-25; `02i` re-certified 2026-08-26; `02j` 2026-08-18; `02a–02d` long closed). `02k`/`02l` are outside scope and unaffected by this pass; Chris requested execution. No closure stamp is created for k/l.
2. **Untracked artifacts:** `artifacts/output/` + `artifacts/memory/` are gitignored by design → R1.2 and DoD #8 are impossible as written; ADR-005 is absent from disk. Dispositioned in `02g` §7.3.
3. **Sign-off home:** `.agents/references/utter-satisfaction.md:106` requires completed records in `artifacts/output/06-quality/sign-off-history.md`; DoD #9 re-pointed and fulfilled at closure.
4. **Commit rule:** owner standing rule 2026-08-25 requires a per-action instruction; the plan's commit cadence is suspended (§5.1 + §7.1 note).
5. **Harness layer as-built (02h §10 A2a):** adapters live in `bin/lib/harnesses/*`; the legacy transpilers were cut (`5c97065`); Claude Code = `.claude -> .agents` symlink + `CLAUDE.md`; Copilot = pointer stub + `.github/skills` link (field test 2026-08-25); Codex = zero-work native read; cursor/windsurf are legacy-cleanup-only. `.agents/references/harness-matrix.md` is the canonical record.
6. **Counts moved:** skills 42→40; personas 21/22→20; `bin/cli.js` 2695→2169 lines. Every corrected count carries its measurement command.
7. **Doc-sourced rows:** Codex and Antigravity have no code — the matrix labels their sources and re-verification triggers. The OpenCode `postInstall` command sweep has no dedicated test (follow-up F-7).

### 12.2 Independent verification (satisfaction gate)

Three read-only seats reviewed the diff before closure: **@developer (Rex)**, **@architect (Vera)**, **@qa-engineer (Nina)**. All three initially returned `CHANGES REQUESTED`; the defects were real and were fixed before the closing run:

| # | Defect found (seat) | Fix applied |
|---|---|---|
| D-1 | §12 referenced but not previously written (Rex, Vera) | This section written; the §5.1 / DoD #4 / `02-phase-1-skills` F1.21 pointers now resolve |
| D-2 | "`transpileCursorMDC` stays dormant/commented" was false — cut 2026-08-25 (Rex, Vera) | Matrix row + §1.2 corrected; commit `5c97065` cited |
| D-3 | An empty delegation-log blinded the weekly audit; the policy claimed a fallback that never ran (Vera) | `delegation_audit.js` patched to fall back when the log is empty ("Source: session summaries (delegation log present but empty)"); policy prose corrected; writer gap filed as F-6 |
| D-4 | DoD #9 asserted the sign-off record existed before it did (Vera, Nina) | Record created at closure in `artifacts/output/06-quality/sign-off-history.md` |
| D-5 | `[x]` kept on a claim annotated FALSE (Vera) | Lowered to `[~]` (`02-phase-1-skills` "Expanded method libraries") |
| D-6 | "staged" overstated git state; §7.1/Budget cadence left unannotated (Vera) | Wording fixed ("uncommitted in the working tree"); cadence notes added |
| D-7 | `02g:213` pointed at a §5.1 test count that did not exist | Final-verification line added to §5.1 |
| D-8 | R0.2 probe path stale (`shut-up/steps/` no longer exists) (Nina) | Probe-path note added to DoD #4 |

Re-validation verdicts after the fixes are recorded in `artifacts/output/06-quality/sign-off-history.md`.

### 12.3 Follow-ups (convert-to-build-item — deliberately NOT executed here; recovery does not reopen feature work)

| # | Item | Owner | Evidence of need |
|---|---|---|---|
| F-1 | Complete `elicitation/methods.csv` 98 → 100 methods (F1.21) | @developer | `grep -c '^[0-9][0-9]*,' .agents/skills/elicitation/methods.csv` → 98 |
| F-2 | `ml-ai-ops.md` depth 158 → ≥200 lines (audit-named; all 19 other personas pass) | @ml-ai-ops | `wc -l .agents/agents/ml-ai-ops.md` → 158 |
| F-3 | `bin/cli.js` slim-coordinator (02h T4.1) | @developer | `wc -l bin/cli.js` → 2169 |
| F-4 | Author `handoff-continuity.json` + `zero-mention-routing.json` (02j TL-HO-06) | @ml-ai-engineer | both files absent on disk |
| F-5 | Cursor/Windsurf redesign post-v2 (`03c`) | @architect | adapters are legacy-cleanup-only |
| F-6 | Wire `[DIRECT-IO-JUSTIFIED]` capture into session-write so `delegation-log.json` has a writer | @tech-lead + @devops-engineer | `grep -rn "delegation-log" .agents/scripts bin tools` → audit reads only |
| F-7 | OpenCode `postInstall` core-command sweep test | @developer | no test references the function |

### 12.4 Closing verification (stamped from the working tree)

- `node .agents/scripts/spec_check.js` → "✓ All 40 skills pass agentskills.io spec checks." (exit 0)
- `node .agents/scripts/compile_skills.js` → "✓ Compiled 40 skills" + "✓ delegation lint: zero removed-persona handles" (exit 0)
- `node .agents/scripts/delegation_audit.js` → "Source: session summaries (delegation log present but empty)" — fallback active
- `node bin/cli.js manifest` → "[OK] Generated manifest … (347 files)"; `node bin/cli.js verify` → "[OK] All 348 files verified", exit 0 *(closing-run figures; superseded post-02q — see §5.1 note: verify now fails by design while 02q's manifest pin and 02p's drift coexist uncommitted)*
- `npm test` → 678 pass / 0 fail, 64 suites (closing run) *(now 689/0, 65 suites after 02q + the compile_skills scrape-filter fix landed in the same tree)*
- `git status --porcelain` → all changes uncommitted; **no commits made** (rule 4). Owner decision required to persist.
