# Roundtable Transcript — Implementation Review: 02n, 02o & DNA 9 Language (native)

- **Topic:** implementation of 02n (reverse-PRD fork), 02o (PRD→prototype coverage gates), and the uncommitted DNA 9 language/localization feature (Review Gate — claims about existing state)
- **Date:** 2026-09-23
- **Mode:** native (subagents, context-firewalled)
- **Phase:** validation (pipeline meta-engineering)
- **ROSTER:** @code-reviewer,@qa-engineer[+@tech-lead: planning][+@architect: architecture]
- **Router:** tag `review` (mandatory @code-reviewer; reserved seat 2 @qa-engineer per `policy.reserved_seat_2`). `resolve_agents.js roster check` → pass. Challengers pre-summoned Phase 2.
- **[RED-TEAM: @tech-lead,@architect]** — pre-summoned adversarial challengers injected against the unanimous Round-1 PARTIAL verdicts (SPC gate: frictionless convergence).
- **Suite state at review:** `node tests/run-all.js` → 604/604 pass (was 553 at the prior 02n/02o review).

```roundtable-coverage
panel: @code-reviewer,@qa-engineer
challenges:
- @tech-lead -> @code-reviewer: PARTIAL is the wrong instrument for uncommitted work (no record to review); language feature has zero plan-registry row; DNA 7/8/9 bundled into one unreviewable blob; classify config.yaml changes as scope-drift A/B
- @architect -> @qa-engineer: DNA 9 Rule 4 "resolve through language_resolver.js" is DECLARED-ONLY (resolver exposes no read fn; 5 forked regex readers = DRIFT); artifacts-layer silent fallback to en is a DNA 4 loud-failure violation; graph: deletion breaks Guide doc-parity
```

## Phase 1 — Position Stating

### @code-reviewer (Scout)
- 02n/02o **[CONFIRMED]** — D1/D2 recorded FIXED with named seeded-red tests (`ref-grammar-fidelity-boundary-2026-09-23.md`) matching commit `ba37341`; D3 + DoD#11 documented OPEN (honest disposition, not falsified).
- Language **[PARTIAL]**, 4 defects verified against files:
  1. BLOCKING — `config_language_cmd.js` single-arg `set` forces `chat:auto → chat:id`; the documented primary example breaks DNA 9 Rule 1; no test guards it.
  2. BLOCKING (record) — `vespyr-dna.md:247` stale "(...next is DNA 9)" placeholder sits above the written DNA 8 + DNA 9 sections.
  3. MAJOR — out-of-scope bundling in the "language" `config.yaml` diff: `graph:` block deleted + `step_tracking off→silent`; Guide/en+cn still document the removed block.
  4. MINOR — 4 hand-regex read sites; DNA 9 Rule 4 wants resolution through `language_resolver.js`.
- [VERDICT: PARTIAL]

### @qa-engineer (Nina)
- 11 live probes. Suite 604/604 real but covers config plumbing only.
- 02n/02o: D1/D2 FIXED (verified `resolveRef` delegates to `spec_parity.resolveAnchor`; named regression tests on disk). D3 OPEN reconfirmed (`witness check` after report delete → `ok:true` exit 0). DoD#11 OPEN reconfirmed (`orchestrator_state.js next` exit 0, no qa-signoff gate).
- Language, new falsifications:
  1. `vespyr lang set id` clobbers `chat:auto` (test line 57 codifies it as *intended* → design defect).
  2. Reader bug: `chat: "zh-Hans"` parses literally with quotes → `isValidLanguage=false` → silent fallback; `performUpdate` carries quotes forward (sticky).
  3. "Corrupted config" catch only fires on read failure, not malformed YAML → garbage preserved, `.bak` path never hit.
  4. DNA 9 is unenforced plumbing: ZERO tests assert an agent writes an artifact in `language.artifacts`; the "MUST adhere" claim has no wired enforcement — same unenforced-gate pattern 02p prosecutes on DoD#11.
- [VERDICT: PARTIAL]

## Phase 2 — Cross-Examination · [ROUND: 1]

### @tech-lead -> @code-reviewer (summoned red-team)
- **Gate instrument is wrong.** The language work is committed nowhere (`git log --all` empty). Review Gate adjudicates records; there is no record. Correct instrument = Decision Gate on a PROPOSAL → **[RESHAPE]**.
- **No plan authority.** Grepped `development-plan/` — zero rows own language/DNA 9. The registry rule ("every file MUST have a row; numbers claimed by committing first; `check_plan_reservation.js` enforces") is bypassed. An unregistered feature landing is a class-A/B process defect independent of code quality.
- **Bundling.** DNA 7 + 8 + 9 + a config subsystem in one working-tree blob is unreviewable; must split into ≥3 commits behind ≥1 plan row.
- **Steelman + ruling.** `set id → chat:id` could be intended ("Indonesian everywhere"), but `auto` already answers Indonesian users in Indonesian and is strictly more expressive. The **code is the primary defect** (bare `set` must not clobber `chat:auto`); the **docs are secondarily incomplete** (no ruled "set-all" mode). Independently reproduced: `chat: "auto"` → forced English (silent data loss).
- Config tags: `graph:` deletion → **[a] record-contradiction** (erases a live dated 03h decision in the comment); `step_tracking off→silent` → **[b] unruled runtime-default flip**.
- [VERDICT: FALSIFIED] (language work as a Review-Gate candidate) · 02n/02o [CONFIRMED] stands.

### @architect -> @qa-engineer (summoned red-team)
- **Config-reader consistency = [DRIFT].** DNA 9 Rule 4 declares "must resolve through `language_resolver.js`," but the resolver exposes **no read function** — canonicalization is architecturally impossible on the read path. Five forked regex grammars (`config_language_cmd.js:35`, `session_start.js:104`, `installer.js:765`, `step_tracker.js` "lightweight YAML scalar parser," + the write path). Same DECLARED-vs-ENFORCED class as 02o's B1.
- **Zero-dep defense is fair** (no YAML parser in `package.json`; one internal reader would be defensible) — but it demolishes the *duplication*, not endorses it. Correct fix: one `readConfig`/`writeConfig` in `language_resolver.js`, imported by all five sites. Current design took the brittleness cost without the single-grammar payoff.
- **Silent `en` fallback on the ARTIFACTS layer = DNA 4 loud-failure violation.** `detectLanguage` reads raw and never normalizes; an unrecognized/quoted token silently ships English PRDs/ADRs/commits — a committed one-way door. Acceptable for chat (best-effort, self-correcting); NOT for artifacts.
- **`graph:` deletion — verified safe (updated post-session).** The block was documented in `Guide/{en,cn}/configuration.md:15,50`, but the underlying structural-graph feature is already fully deprecated in code (`bin/cli.js` DEPRECATED_CORE_FILES + `tests/graph-deprecation.test.js`). So the config deletion was correct; the real gap was stale guide docs, now removed. Reclassified from class-A to a doc-parity cleanup (done).
- [VERDICT: PARTIAL] · config-reader claim: **[DECLARED-ONLY] / [DRIFT]**

## Phase 3 — Defense & Justified Concession · [ROUND: 2]

Host verification of the red-team's higher-stakes claims (banked before synthesis):
- `graph:` documented in guides — **CONFIRMED** (`Guide/en`, `Guide/cn`, `guide/en`, `guide/cn` `configuration.md:15,50`).
- Plan registry has no language/DNA 9 row — **CONFIRMED** (only unrelated "programming-language"/"auto-proceed-language"/ECC-reviewer hits).
- `language_resolver.js` has no read function — **CONFIRMED** (exports: `normalizeLanguage`, `getSupportedLanguages`, `isValidLanguage`, `getLanguageDisplay`, formatters, `findSuggestion`).
- Language work committed nowhere — **CONFIRMED** (`git log --all` empty for the new files).

Concessions:
- **[CONCESSION: @code-reviewer / @qa-engineer — gate instrument]** Both core seats applied the Review Gate to uncommitted work. @tech-lead's reframing holds: the language feature is a PROPOSAL. The PARTIAL findings survive as the RESHAPE punch-list; the *instrument* is corrected to the Decision Gate.
- **No concession on 02n/02o** — CONFIRMED across all four voices; D3 + DoD#11 legitimately tracked OPEN.
- **Change-my-mind (recorded):** language work moves toward GO when — (a) bare `set` preserves `chat:auto`; (b) reader strips/normalizes YAML quotes through the resolver; (c) artifacts-layer fails loudly on unrecognized values; (d) `graph:` deletion reverted or guides updated in-commit; (e) stale `vespyr-dna.md:247` line removed; (f) a plan-registry row exists; (g) commits split; (h) owner dispositions the enforcement gap (artifact-language has zero demonstrated-red tests).

## Phase 4 — Synthesis

### Owner brief (plain language first)

Two separate things were on the table, and they land very differently.

The **02n and 02o work is solid and stays shipped.** Four reviewers checked it; the two code bugs an earlier review caught have real fixes with tests that genuinely fail when the bug is reintroduced. Two known gaps remain openly logged (deleting a freeze report reopens a gate silently; a "you must sign off" check that doesn't actually block) — they're honestly tracked as open defects, not hidden.

The **language feature is not ready and should not be committed as-is.** It works in the happy path and its 30 tests pass, but the panel found it has no plan behind it (it was never entered into the project's own tracking system), it bundles three unrelated changes into one messy pile, and — most important — its front-door command breaks its own headline rule. Running the documented example `vespyr lang set id` silently switches off the "reply in the user's language" behaviour the feature exists to protect. Worse, if anyone ever writes a language in quotes in the config file, the engine silently falls back to English and writes your documents in the wrong language with no warning. That last one is the kind of quiet failure this engine is specifically built to prevent.

Recommendation: keep 02n/02o. Send the language work back for a reshape before it's committed.

### Findings (what's wrong → why it matters → consequence)

1. **`vespyr lang set id` kills auto-mirroring.** The bare `set` verb writes `chat: <lang>`, overwriting `auto`. → It's the documented primary example and directly negates DNA 9 Rule 1. → A user following the docs silently loses the feature's core behaviour; no test catches it because the test codifies the bug as intended (`config_language_cmd.js:230`; `test_cli_language_config.test.js:57`).
2. **Quoted/unrecognized values fall back to English silently on the artifacts layer.** `detectLanguage` reads raw YAML and never normalizes; `chat: "auto"` → `en`. → Owner sets a language, believes it's set, and every PRD/ADR/commit ships in English. → Silent one-way data loss; a DNA 4 loud-failure violation (`session_start.js:99`; `language_resolver.js:156`).
3. **DNA 9 Rule 4 is declared but unenforceable.** "Resolve through `language_resolver.js`" — but the resolver has no read function; five forked regex readers exist instead. → Same DECLARED-vs-ENFORCED gap as 02o's B1. → The grammars will drift; the consistency invariant is decorative.
4. **Out-of-scope config bundling.** The "language" `config.yaml` diff also deletes the `graph:` block (class A — erases a dated 03h decision, and Guide/en+cn still document it → DNA 6 doc-parity break) and flips `step_tracking off→silent` (class B — unruled runtime-default change).
5. **No governance.** Zero plan-registry row; committed nowhere; DNA 7/8/9 bundled into one unreviewable blob. → Bypasses `check_plan_reservation.js` and the roundtable-gate discipline 02n/02o both went through.
6. **Enforcement gap.** No test asserts an agent actually writes an artifact in `language.artifacts` — the "MUST adhere" claim is unwired plumbing (the exact record-only pattern 02p prosecutes on DoD#11).

### Decisions on the owner's desk

**Decision 1 — Language feature disposition.**
- Question: commit the language work now, or reshape first?
- Context: uncommitted; 30 tests green but happy-path only; front-door command violates DNA 9 Rule 1.
- File: `bin/lib/config_language_cmd.js`, `.agents/scripts/lib/language_resolver.js`, `.agents/references/vespyr-dna.md` (DNA 9).
- Options: (a) **Reshape then commit** — fix the 6 items, add a plan row, split commits. Consequence: slower, but the feature keeps its own promise. (b) Commit as-is. Consequence: ships a documented command that silently breaks auto-mirror + silent English fallback on artifacts.
- Recommendation: **(a) Reshape.**

**Decision 2 — `set <lang>` semantics (owner ruling needed).**
- Question: should bare `vespyr lang set <lang>` set both layers, or only `artifacts` (leaving `chat:auto`)?
- Options: (a) bare `set` → artifacts only, add explicit `set all` for full pin; (b) bare `set` → both, but amend DNA 9 to permit it. Consequence: (a) preserves Rule 1 by default; (b) requires a ruled doc change or Rule 1 is a lie.
- Recommendation: **(a).**

**Decision 3 — config.yaml scope.**
- Question: keep the `graph:` deletion + `step_tracking` flip, or revert them out of the language change?
- Recommendation: revert both from this change; if `graph:` removal is genuinely wanted, do it in its own commit with the guides updated.

### Machine markers

- 02n: [VERDICT: CONFIRMED] (D3 + DoD#11 tracked OPEN)
- 02o: [VERDICT: CONFIRMED] (D1/D2 FIXED `ba37341`; D3 + DoD#11 OPEN)
- Language (DNA 9): Review Gate mis-applied → routed to Decision Gate as a proposal; punch-list of 6 blocking items above.
- Config-reader consistency claim: [DECLARED-ONLY] / [DRIFT]
- config.yaml `graph:` deletion → class [a]; `step_tracking off→silent` → class [b]

Plain translation of the markers: 02n and 02o pass and stay. The language feature is sent back to be reshaped before it's committed.

[SYNTHESIS: RESHAPE]
