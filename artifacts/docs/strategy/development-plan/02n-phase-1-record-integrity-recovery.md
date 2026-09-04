# Record Integrity Recovery — Dev-Plan Checkbox Reconciliation & Harness-Scope Alignment (02m)

**Decision:** Vespyr adopts a mechanical-evidence standard for every dev-plan checkbox: a box may be checked only when a reproducible command (grep/ls/git show/test run) proves its claim on disk at check time. This plan reconciles the ~54 falsely-stamped boxes found in the 2026-08-23 audit, rebuilds the two 02g tooling items that were never built, aligns the harness matrix to the owner's five-shape scope under the architect's emitter/symlink classification, and bootstraps the missing sign-off machinery. Single-author serial execution is a **binding constraint**, not a recommendation — the root cause of this recovery was concurrent sessions clobbering shared state.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 13th in the `02*` series, after `02l-phase-1-observability-biomarkers-and-small-model-harness.md` and before `03-phase-2-enablement.md`. It repairs the record layer beneath the entire `02*` series; it does not reopen feature work closed legitimately. **Sequencing (ruled 2026-08-23, owner-requested hybrid):** a ~3.5h prelude (R0.1–R0.2) runs first; then 02h→02i→02j→02k→02l proceed to completion under evidence-stamping rules with closure stamping PROHIBITED; full 02m reconciliation executes last, after hijkl facts settle.

**Gate reviews:** Roundtable 2026-08-23 (@architect, @tech-lead, @developer) — full forensics on disk: 02g KILL adjudicated over three rounds (git archaeology: `dcf028e` honest PARTIALLY EXECUTED state reverted to EXECUTED inside mislabeled typo-fix commit `43f8fa1`; H-CONC concurrency hypothesis owner-corroborated); mechanical checkbox sweep of 02-phase-1-skills (126 boxes), 06, 08 completed. Verdict and dispositions recorded in `artifacts/memory/active-decisions.md` (2026-08-23 entries).

**✅ RESOLVED (2026-08-24) — harness classification:** Owner refuted the architect's emitter/symlink classification with primary sources (cited in §10): GitHub Copilot and Google Antigravity **natively discover `.agents/skills/`** — canonical placement suffices, zero emission. Architect conceded formally, issued revised classification ([PIVOT]); concessions logged. Consequences binding on WS-D: (C1) zero skill emission for Copilot/Antigravity; (C7) `transpileCopilotYAML()` demoted — retained only if C2 resolves to persona-emission, else cut.

**✅ ALL OWNER DECISIONS RESOLVED (2026-08-24):**
- **C2 = B (adoption-ride):** Copilot personas surface via root `AGENTS.md`; **`transpileCopilotYAML()` CUT** during execution (dead code targeting stale YAML format, no remaining consumer). No `.agent.md` emission.
- **C4 = A (single canonical):** always install personal skills to `~/.agents/skills`; per-tool bridging notes for shapes that don't read it natively (e.g., Antigravity CLI needs `~/.gemini/antigravity-cli/skills/`; VS-code-era tools vary).
- **C3 = YES:** Codex verification-before-build gate stands — pre-authorized (internal to R1.15).

**Field evidence (owner manual test, 2026-08-24):** *"copilot… use .agents in global installation but did not read .agents for autocomplete. it can read .agents but did not show it in autocomplete"* → Copilot consumes `~/.agents/skills` functionally but does not list them in autocomplete/picker (**functional-but-invisible**). Consequences: matrix doc sets user expectations accordingly; DoD smoke criteria assert functional activation, not autocomplete visibility; no architecture impact.

**No open questions remain — plan is execution-ready.

**Budget:** 34.5h authoring serial (incl. 0.5h prelude discipline item; WS-D re-scoped 2026-08-24 per C1–C7 and owner decisions C2=B/C4=A/C3=YES — emitter work cut, native-read verification + compliance audit retained), single-writer, commit-after-every-build-item. No parallel lanes. No stretch estimate — if it exceeds 40h, stop and replan with Chris.

---

## 1. Mandate & Scope

**Mandate (from Chris):** Mechanical re-verification of every dev-plan checkbox after proven systemic record corruption; recovery, not blame. Concurrent 02f+02g sessions over one working tree produced clobbered records; the sweep confirmed ~54 false boxes across 8 documents and a repo-wide governance hole (`utter-satisfaction.md` holds **zero** per-epic sign-off records).

Update version to: 2.0.10

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
| Cursor/Windsurf transpiler work | Owner excluded; `transpileCursorMDC` stays dormant/commented as post-v2 option |
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
- **WS-C — Tooling rebuild decisions:** F1.69 delegation lint as additive `compile_skills.js` hook (trio-invocation ban, delegation-path requirement where applicable, persona-marking whitelist) — REBUILD recommended, fraud-prevention value proven this week; F1.70 measurement cycle baseline — REBUILD-lite; delegation-path line rollout costed against formal ADR-descope alternative — rollout only for skills retaining delegation semantics.
- **WS-D — Harness alignment:** five shapes only — OpenCode native-symlink (verify/regression-test), Claude Code CONFIG-FILE-ONLY, Kiro HYBRID (emit steering from `.agents/templates/system/vespyr-steering.md.canonical` + symlink `.kiro/skills`), GitHub Copilot GENERATE-TARGET (enable registry entry, smoke test), Antigravity ZERO-WORK (read-and-adopt verification), Codex NEW minimal emitter (AGENTS.md pointer + optional `.codex/config.toml` emission; speculative machinery excluded). Strike 02h residue.
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

### 7.1 Sequencing notes — SINGLE-WRITER MANDATE (BINDING)

- **RULED ORDER (2026-08-23, hybrid):** (1) prelude R0.1→R0.2 (~3.5h); (2) owner-preferred feature run: 02h→02i→02j→02k→02l executed to completion under R0.1 rules — 02k/02l apply their CHANGES REQUESTED spec fixes first/during execution; (3) full 02m reconciliation (R1.1–R1.16) last, reconciling each epic once against final on-disk facts.
- **"Finish" definition during the hijkl window:** all remaining build items executed and stamped only with adjacent command evidence. PROHIBITED until post-reconciliation: any plan-level status banner (`EXECUTED`/`COMPLETE`), phase-gate advancement claims, "closed" assertions in history.md, and dev-plan README status-table changes for h/i/j/k/l.
- Known-false boxes in h/i/j stay untouched for the 02m final pass unless that epic's own execution directly proves/disproves them — then correct forward with a dated banner, never silently.
- One epic per time-window. No second agent session touches any path overlapping the active build item. Violations halt the epic.
- Commit after every build item, message naming the item ID; append one attestation line per batch to `artifacts/memory/session-summaries/history.md`.
- WS-D gating (final 2026-08-24): all owner decisions resolved — no build item waits on Chris. R1.15 retains its internal C3 verification gate (pre-authorized); everything through R1.11 plus the C5 audit (R1.18) proceeds regardless.
- Future parallel lanes require git-worktree isolation per session, written as convention before first use.

### 7.2 Prerequisites (developer checklist)

- [ ] 02g KILL disposition confirmed present in `active-decisions.md` (2026-08-23 entries)
- [ ] **Owner decisions C2/C4/C3 recorded** (done 2026-08-24, see header) — re-verify header block before starting WS-D
- [ ] Sweep inventory (§3) re-verified — files move; recount before editing
- [ ] Git tree clean at start of each work session

## 8. Definition of Done (mechanically verifiable)

Done when **all** pass:

1. `grep -c "\[x\].*delegation" artifacts/docs/strategy/development-plan/02-phase-1-skills.md` returns only superseded-annotated lines; every corrected box carries a dated evidence-command comment
2. 02g §7.3 status line quotes `git show dcf028e` PARTIALLY EXECUTED accounting verbatim
3. `wc -l` outputs cited in 02c/02h match live files (shifu.md=393±edits, documented)
4. Lint: `node .agents/scripts/compile_skills.js --check` fails a planted trio-invocation fixture and passes persona-marking fixture (test committed)
5. `.agents/state/delegation-log.json` exists with baseline date + `reviewDate: 2026-09-30`
6. Delegation-path decision recorded as ADR or executed rollout; `grep -rl "^Delegation path:" .agents/skills/ | wc -l` equals the number stated in the decision
7. `cli.js --help` lists exactly the five owned shapes; Copilot + Antigravity resolve skills natively from `.agents/skills/` (zero skill emission present); **no `.github/agents/*.agent.md` emission present (C2=B) and `transpileCopilotYAML` absent from codebase**; Copilot smoke asserts functional skill activation — agent applies a skill from `.agents/skills/` — NOT autocomplete visibility (field evidence 2026-08-24); Cursor/Windsurf entries commented with post-v2 label; C6 non-conflict note present in matrix doc; C5 audit report covers 42/42 SKILL.md
8. `git ls-files artifacts/output/04-architecture/adr-005-harness-neutral-delegation-contract.md` non-empty
9. `utter-satisfaction.md` contains ≥1 structured per-epic sign-off record (this plan's gate)
10. **Process DoD:** zero boxes stamped in this plan without a command-output evidence line adjacent to the stamp

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

To be recorded — not claimed — in `.agents/references/utter-satisfaction.md` upon completion, per DoD #9:

- [ ] @tech-lead (Grant): plan authored with binding single-writer constraint; all estimates evidence-based
- [ ] @developer (Rex): sweep data reproduced; reconciliation classes executable as specified
- [ ] @architect (Vera): emitter classification coherent; canonical-store boundary preserved pending Chris
- [ ] Chris: emitter-reframe answered; recovery accepted at DoD verification

*Author: @tech-lead (Grant), from the 2026-08-23 roundtable forensics. Every checkbox above starts unchecked by design — this plan was born from checkbox fraud and will not reproduce it.*
