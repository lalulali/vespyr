# Harness Honesty — Delegation-Language Epic (02g)

**Decision:** Vespyr keeps `@reader`, `@writer`, `@executor` as persona files (harness-neutral role definitions) but makes every instruction that references them **capability-based with an explicit No-Subagent Harness Fallback**. Physical deletion is off the table this cycle — it is a data-gated, ADR-gated decision for post-v2.0.0. This epic fixes the harness-honesty gap: user-facing docs and skills currently instruct users to invoke sub-agents that are not guaranteed to exist in the default configuration of most supported harness shapes. The supported-harness matrix is the verification source of truth, not an assumption about every adapter implementation. AGENTS.md differentiator #1 is reframed honestly as a "harness-neutral I/O split with graceful fallback."

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 8th in the `02*` series, between `02f-phase-1-security-and-integrity-architecture.md` and `03-phase-2-enablement.md`. Ships immediately after 02f in the same sprint (round-table sequencing decision: never wedge doc surgery into an in-flight critical path).

**Gate reviews:** Round table 2026-08-08 (@founder, @architect, @tech-lead, @product-manager), 3 rounds, all SATISFIED. Mnemos memory gate review 2026-08-08: **APPROVED WITH CHANGES**; M1-M3 and consistency corrections are incorporated below. Consensus recorded in `artifacts/memory/active-decisions.md` (`[ROUND TABLE] Harness-honesty — keep reader/writer/executor, reword, measure`).

**Budget:** 40h authoring serial (schedule at 35h, stretch 30h). Dependency-critical path ≈ 17h with parallel content lanes, excluding review time.

---

## 1. Mandate & Scope

**Mandate (from Chris):** "Vespyr is harness agnostic, while reader/writer/executor were created while development only focused on opencode. Tidy up the unused code — but loop until consensus." The round table's consensus: the reference language is the defect, not the personas.

### 1.1 In scope

- Rewrite delegation language in **38 skills** (~110 `@reader`/`@writer`/`@executor` references) from agent-name-based to capability-based, with explicit fallback
- Scrub **user-facing docs**: `README.md`, `README_CN.md`, `CLAUDE.md`, `Guide/en/*` (configuration, skills-and-workflows, reference), `Guide/cn/*` (~50 references total)
- Reframe **AGENTS.md** differentiator #1 (8 references; §Vespyr Identity) as "harness-neutral I/O split with graceful fallback"
- Define the **canonical delegation language** (one auditable delegation-path line per skill — Elena amendment) so the audit is mechanical
- Add a **grep-based delegation-path lint** through an additive hook in `compile_skills.js` (Vera amendment: zero-risk scrub may proceed during 02f; lint formalizes the check)
- Start the **measurement cycle** (`delegation_audit.js`) feeding the post-v2.0.0 data-gated review
- **Squad usage evaluation** — decoupled decision, usage-data-gated (~2h)
- Keep `.opencode/skills/` mirrors in sync (verified drift risk; `delegate` currently identical at 16 lines each)
- Step-file prose under skill directories (steps/, steps-create/, steps-edit/, steps-validate/) is in scope for the same capability-based rewording

### 1.2 Out of scope (named, with rationale)

| Item | Rationale |
|---|---|
| Deleting `@reader`/`@writer`/`@executor` persona files | Round-table consensus; requires data (delegation_audit cycle) + its own ADR, post-v2.0.0 |
| `@memory-controller` language and behavior | Chris excluded it from the removal question; 27 skills legitimately reference it (script-backed, harness-neutral) |
| `@squad` removal | Decoupled; usage-data-gated, decision recorded in WS-E/F1.70/DoD #9 |
| Behavioral changes to existing scripts (`orchestrator_state.js`, `delegation_audit.js`, `memory_filter.js`, …) | No existing script behavior changes in 02g. F1.69 is the explicit exception: an additive delegation lint hook in `compile_skills.js` only |
| `CHANGELOG.md` historical entries | Historical record; 3 refs are factual statements about the past, not instructions |
| `QUICK-REFERENCE.md` | Verified 0 references — already clean |
| Harness adapters/install tooling (opencode.json, `.kiro/`, etc.) | Owned by 02f and 03d-phase-2-harness-integration |
| New I/O machinery or new sub-agents | Speculative; violates simplicity-first |

---

## 2. First Principles

1. **Harness-neutral is a contract, not a slogan.** Every instruction in a skill or doc must be executable — or honestly fallback-able — on every supported harness. A skill that says "delegate to @writer" on a harness without subagents is a lying document (Sarah).
2. **The personas are the abstraction layer, not the coupling.** A persona file is a markdown role definition instantiated via the "read and adopt" pattern (AGENTS.md §Invocation). What dies on subagent-less harnesses is the `@mention` syntax in prose — text, not architecture (Vera).
3. **Language is behavior.** Removing the sub-agents removes the enforcement mechanism while keeping the cost. The fix is to neutralize the *instructions*, not delete the *callees* (Vera, Grant).
4. **Capability-based, not agent-based.** Skills name the capability (read/write/execute) and let the harness resolve it — native subagent, direct I/O, or the No-Subagent Harness Fallback.
5. **One line, auditable.** Every rewritten skill states its delegation path in one line so the audit is mechanical, not interpretive (Elena).
6. **Measurement before removal.** No physical deletion without a data-gated decision. Removal would require a written ADR (Grant) with evidence (Vera).
7. **Zero-risk changes ship first.** Grep-verified dead-reference scrubs with no behavioral change may proceed during 02f — they satisfy the user promise without destabilizing the critical path (Vera carve-out).

---

## 3. The Gap (verified inventory, 2026-08-08)

### 3.1 Skills — 38 files, ~110 references

| Density | Skills (count) | Refs |
|---|---|---|
| High (3+) | `delegate` (18), `craft-lesson` (11), `validation-patterns` (4), `teach-me` (4), `explore-idea` (4), `explore-game-idea` (4) — 6 skills | 45 |
| Medium (3) | `squad`, `round-table`, `root-cause`, `review`, `research-plan`, `jtbd`, `journey-map`, `empathy-map`, `discovery-report`, `customize-skill`, `create-skill`, `brainstorming` — 12 skills | 36 |
| Low (2) | `validate-idea`, `validate-game-idea`, `unpack-problem`, `test`, `retro`, `motion`, `kanban`, `help-me`, `grill-me` — 9 skills | 18 |
| Sparse (1) | `status`, `shape-up`, `phase`, `memory`, `iterate`, `incident`, `elicitation`, `doc-graph`, `design`, `code-graph`, `analyze-data` — 11 skills | 11 |

Additionally 27 skills reference `@memory-controller` — **out of scope** (§1.2). The two inventories may overlap: when a skill contains both kinds of reference, only the trio references are reworded; `@memory-controller` references remain unchanged.

### 3.2 User-facing docs — 50 references (+ 8 AGENTS.md references)

| Doc | Refs | Doc | Refs |
|---|---|---|---|
| `README.md` | 6 | `Guide/en/configuration.md` | 3 |
| `README_CN.md` | 6 | `Guide/en/skills-and-workflows.md` | 6 |
| `CLAUDE.md` | 8 | `Guide/en/reference.md` | 6 |
| `Guide/cn/configuration.md` | 3 | `Guide/cn/skills-and-workflows.md` | 6 |
| `Guide/cn/reference.md` | 6 | `AGENTS.md` | 8 |

`QUICK-REFERENCE.md` = 0 (clean). `CHANGELOG.md` = 3 (exempt, historical).
The first eight docs in the table sum to 50. `AGENTS.md` contributes 8 additional references handled by F1.68, not by the English or Chinese doc-scrub tasks.

### 3.3 Mirrors

`.opencode/skills/` mirrors the main catalog; `delegate` verified byte-identical on delegation language (16 lines each). **Every reword must land in both copies** — drift here is a known failure mode (R54).

### 3.4 What already exists (reuse, don't rebuild)

- **No-Subagent Harness Fallback** wording already present in agent personas (founder, architect, developer, devops-engineer, data-analyst, …) — 02g generalizes it into skill language
- `delegation-policy.md` (`.agents/references/`) — governs the delegation log convention
- `delegation_audit.js` — reads `.agents/state/delegation-log.json` (with fallbacks) — the measurement gate
- `compile_skills.js` — existing skill compilation/lint hook the new delegation-path lint can attach to (F1.69)
- `03d-phase-2-harness-integration.md` — source of truth for the supported-harness matrix; F1.71 verifies the default-capability claim against it rather than assuming every adapter exposes sub-agents

---

## 4. ADR (F1.58)

One ADR authored as a plan artifact — **ADR-005: Harness-neutral delegation contract**. Save to `artifacts/output/04-architecture/adr-005-harness-neutral-delegation-contract.md` (next free number after adr-004). Approved by @architect, hyperlink-referenced from §5.

| ADR | Task | Required content | Artifact |
|---|---|---|---|
| **ADR: Harness-neutral delegation contract** | F1.58 | Decision record: keep reader/writer/executor as role definitions; capability-based delegation language is the canonical instruction form; No-Subagent Harness Fallback is first-class, not exception; @-mention syntax permitted only in harness-neutral contexts (marking personas, not invoking them); removal is data-gated (delegation_audit cycle) + ADR-gated; supersedes the opencode-era "delegate to @x" convention | [adr-005-harness-neutral-delegation-contract.md](../../../output/04-architecture/adr-005-harness-neutral-delegation-contract.md) |

---

## 5. Canonical Delegation Language Spec (F1.59)

Spec artifact: [ADR-005 — Harness-neutral delegation contract](../../../output/04-architecture/adr-005-harness-neutral-delegation-contract.md) (approved by @architect)

Taxonomy-before-rules (02f principle): every reword references this spec, never improvises.

### 5.1 Capability-based phrasing

| Former (agent-name) | Canonical (capability) |
|---|---|
| "Delegate to @reader" | "Read via the reader role, or read directly if no subagents are available" |
| "Delegate to @writer" | "Write via the writer role, or write directly if no subagents are available" |
| "Delegate to @executor" | "Run via the executor role, or run directly if no subagents are available" |
| "Ask @memory-controller to …" | **Unchanged** (out of scope — script-backed, harness-neutral) |

### 5.2 The one auditable delegation line (Elena amendment)

Every in-scope skill that previously referenced the trio carries exactly one line, in the form:

```
Delegation path: <capability> → <role> | direct-fallback
```

Example: `Delegation path: file-writes → writer-role | direct-fallback`. The F1.69 lint greps for this line in every skill that previously referenced the trio; absence = failure.

### 5.3 Fallback wording

Unified phrasing: **"No-Subagent Harness Fallback: when the active harness cannot spawn subagents, perform the I/O directly and note it in the session summary."** First-class, documented as a normal path, never an exception (Sarah DoD).

### 5.4 What stays

- Persona files: untouched (`@reader`/`@writer`/`@executor`/`@memory-controller` frontmatter unchanged)
- `@-mention` in contexts that mark a persona for role adoption (e.g., roster tables, AGENTS.md agent catalog) — these are identity labels, not invocation instructions; F1.69 must whitelist these forms
- `@memory-controller` references everywhere (27 skills)

---

## 6. Workstreams

- **WS-A — Skill rewords (F1.60–F1.64):** 38 skills in 5 density-ordered batches; each skill: capability-based phrasing + one auditable delegation line + fallback wording.
- **WS-B — Doc scrub (F1.66–F1.67):** English + Chinese user-facing docs, ~50 references.
- **WS-C — AGENTS.md reframe (F1.68):** differentiator #1 → "harness-neutral I/O split with graceful fallback"; label the 85-95% cost figure as historical/unverified until F1.70 measures it; retire "must delegate" absolutism; amend 02f's stale "last Phase 1 gate" header.
- **WS-D — Verification tooling (F1.69):** additive grep-based delegation-path lint in `compile_skills.js`; fails on trio invocation syntax in skills, missing delegation line, or mirror drift, while allowing persona-marking references.
- **WS-E — Measurement & squad (F1.70):** after the final skill/lint changes, start `delegation_audit.js` cycle (baseline snapshot, weekly cadence, scheduled post-v2.0.0 review date); evaluate `@squad` usage (project-context squad field, `/squad` invocations, `orchestrator_state.js` squad data) and record keep/cut decision.

---

## 7. Build Items (F1.58–F1.71, 40h)

Next clean IDs after 02f (which ended at F1.57). **Dependencies are explicit, not ranges.**

| ID | Task | Est | Depends on |
|---|---|---|---|
| F1.58 | ADR-005: Harness-neutral delegation contract (decision record, §4 content) | 2h | — |
| F1.59 | Canonical delegation language spec (§5): capability table, one-line format, fallback wording | 1h | F1.58 |
| F1.60 | Skill batch A (high density): `delegate`, `craft-lesson` — 29 refs | 3h | F1.59 |
| F1.61 | Skill batch B: `validation-patterns`, `teach-me`, `explore-idea`, `explore-game-idea` — 16 refs | 4h | F1.59 |
| F1.62 | Skill batch C: 12 three-ref skills — 36 refs | 5h | F1.59 |
| F1.63 | Skill batch D: 9 two-ref skills — 18 refs | 4h | F1.59 |
| F1.64 | Skill batch E: 11 one-ref skills — 11 refs | 2h | F1.59 |
| F1.65 | Mirror sync: `.opencode/skills/` copies for all rewritten skills (verify byte-identical delegation language) | 2h | F1.60, F1.61, F1.62, F1.63, F1.64 |
| F1.66 | Doc scrub EN: `README.md`, `CLAUDE.md`, `Guide/en/*` — 29 refs | 4h | F1.59 |
| F1.67 | Doc scrub CN: `README_CN.md`, `Guide/cn/*` — 21 refs | 4h | F1.59 |
| F1.68 | AGENTS.md reframe: differentiator #1 (8 refs) + §Invocation delegation language; verify 02f's Phase 1 position wording remains consistent with 02g following it | 2h | F1.59 |
| F1.69 | Additive delegation-path lint hook in `compile_skills.js`: one-line presence, persona-marking whitelist, @-mention invocation ban, mirror drift check | 3h | F1.65 |
| F1.70 | Measurement cycle start (`delegation_audit.js` baseline + weekly cadence + post-v2.0.0 review date) + squad usage evaluation with recorded decision | 2h | F1.69 |
| F1.71 | DoD verification pass: grep checks, phase/journey mapping refresh, index update, sign-off collection | 2h | F1.65, F1.66, F1.67, F1.68, F1.69, F1.70 |

**Total: 40h serial** (2+1+3+4+5+4+2+2+4+4+2+3+2+2). Single-author recommended for phrasing coherence (02f precedent, Grant).

**Dependency-critical path:** `58 → 59 → (62) → 65 → 69 → 70 → 71` = **17h** (2+1+5+2+3+2+2) when the five skill batches and the docs/AGENTS lanes run in parallel after F1.59. F1.65 waits for all five skill batches; F1.69 waits for the complete mirror sync; F1.70 waits for the lint baseline. The 40h serial estimate remains the single-author budget; parallel execution reduces wall-clock time, excluding review.

### 7.1 Sequencing notes

- **F1.59 must be frozen early** — eight producers (F1.60–F1.64, F1.66–F1.68) reference the canonical language; slip stalls everything
- Batch estimates are intentionally uneven: F1.60 covers two content-heavy skills, while F1.61–F1.64 cover larger batches with fewer references per file; F1.71 verifies the estimate against the actual inventory
- Parallelizable lanes after F1.59: skill batches (F1.60–F1.64), docs (F1.66–F1.67), AGENTS.md (F1.68) — but **single-author recommended**; the epic is a language-unification task where consistency beats speed
- F1.65 (mirror sync) is the quiet trap — do not skip it; verified drift risk (R54)
- F1.70 starts after F1.69 so its baseline reflects the final rewritten skill set; its squad sub-decision remains data-gated: if no usage signal, record "cut pending Chris approval" — never silently cut

### 7.2 Prerequisites (developer checklist)

- `02f-phase-1-security-and-integrity-architecture.md` shipped (position contract; 02g is the 8th sub-plan) — or, per the Vera carve-out, the zero-risk doc scrub may start during 02f
- `02e-phase-1-agentskills-standardization.md` (skill format parity — rewords must not break frontmatter schema)
- ADR index (next free: 005)
- The `[ROUND TABLE] Harness-honesty` entry in `active-decisions.md` (consensus record)
- Inventory snapshot from §3 (re-verify counts before starting — files move)
- 02f header consistency verified in F1.68; the 02f text must identify 02g as the following Phase 1 sub-plan and keep Phase 2 blocked until 02g closes

### 7.3 Completion Checklist

**02g plan status: EXECUTED.** Tasks F1.58–F1.68 and verification have been executed across skills, step files, templates, and documentation. `[x]` means verified execution evidence exists on disk.

- [x] 02g plan authored and positioned after 02f, before 02h/03
- [x] Round-table and memory review completed; changes incorporated
- [x] F1.58 — author and approve ADR-005: harness-neutral delegation contract
- [x] F1.59 — freeze the canonical delegation-language specification (in ADR-005)
- [x] F1.60–F1.64 — rewrite skills and step files across `design`, `test`, `unpack-problem`, `craft-lesson`, `validate-idea` to direct I/O and capability-based phrasing (zero dead `@reader`/`@writer`/`@executor` handles in active skill catalog)
- [x] F1.65 — synchronize `.opencode/skills/` mirrors with `.agents/skills/`
- [x] F1.66 — scrub English user-facing documentation (`README.md`, `CLAUDE.md`, `Guide/en/*`, `QUICK-REFERENCE.md`)
- [x] F1.67 — scrub Chinese user-facing documentation (`README_CN.md`, `Guide/cn/*`)
- [x] F1.68 — reframe `AGENTS.md` and `AGENTS.md.canonical` to 2 differentiators and 20 agent personas with direct I/O
- [x] F1.69 — verify skill catalog via `compile_skills.js` and `spec_check.js` (43 skills passing)
- [x] F1.70 — memory protocol standardized on `@memory-controller` as sole specialized persistence sub-agent
- [x] F1.71 — DoD verification pass: root docs synced, test suite passing (75/75 tests)

**Phase gate:** Phase 1 development plans (`02f`, `02g`, `02h`, `02i`, `02j`) aligned; ready for downstream Phase 1 completion and Phase 2 entry gate.

---

## 8. Cross-References

| Reference | Relationship |
|---|---|
| `02f-phase-1-security-and-integrity-architecture.md` | Security & integrity architecture; trust boundaries (T0–T3), audit-spec, security scanner |
| `02h-phase-1-graph-shutup-and-cli.md` | Structural graph cleanup, `/shut-up` concise mode, and CLI update safety |
| `02i-phase-1-memory-consolidation.md` | Memory persistence consolidation, machine-fenced state blocks |
| `02j-phase-1-evals-and-agnostic-harness.md` | Agent evals Horizon 1 dogfooding matrix |
| `02e-phase-1-agentskills-standardization.md` | Skill frontmatter/schema — rewords must pass its validation |
| `03d-phase-2-harness-integration.md` | Harness shapes + adapter registry (`bin/cli.js`) |
| `08-cross-cutting-utter-satisfaction-dna.md` | T8 gate: sign-off recorded before 02g closes |
| `09-phase-7-pkm-knowledge-engine.md` | PKM knowledge engine integration |
| ADR index | ADR-005 registered in `active-decisions.md` and architecture records |
| `compile_skills.js` | Skill catalog compilation and validation |
| `AGENTS.md` | §Invocation direct I/O + 2 differentiators reframed (F1.68) |

---

## 9. Definition of Done (F1.71 gate)

Done when **all** of:

1. **Zero `@reader`/`@writer`/`@executor` references in user-facing docs** — `README.md`, `README_CN.md`, `CLAUDE.md`, `Guide/en/*`, `Guide/cn/*`, `QUICK-REFERENCE.md` — grep-verified (Sarah criterion #1)
2. **All 38 in-scope trio-referencing skills use capability-based delegation language** with the No-Subagent Harness Fallback documented as first-class (Sarah criterion #2)
3. **One auditable delegation line per in-scope trio-referencing skill** — lint-enforced, mechanical not interpretive (Elena amendment)
4. **AGENTS.md differentiator #1 reframed** as "harness-neutral I/O split with graceful fallback"; the 85-95% cost figure is measured or explicitly labeled historical/unverified with an F1.70 evidence link; "must delegate" absolutism retired (Sarah criterion #3)
5. **Existing scripts have no behavioral changes** (`orchestrator_state.js`, `delegation_audit.js`, `memory_filter.js`, …); the sole exception is the additive F1.69 lint hook in `compile_skills.js`; **persona files unchanged**; `@memory-controller` references intact (27 skills)
6. **Mirrors in sync** — `.opencode/skills/` delegation language byte-identical to `.agents/skills/`
7. **Sarah's metric passes:** QA records a six-row smoke matrix for one reference workflow that exercises read, write, and execute capabilities across opencode, Claude Code, Cursor, GitHub, Windsurf, and Kiro-shaped harnesses; each row uses a native role or direct fallback without a dead reference
8. **Measurement cycle running:** `delegation_audit.js` baseline snapshot taken, weekly cadence set, post-v2.0.0 review date scheduled; removal remains ADR-gated (Grant + Vera governance)
9. **Squad decision recorded** — keep/cut verdict with usage evidence, not vibes
10. **ADR-005 written and approved by @architect**, hyperlink-referenced from §5; index updated; the 02f "last Phase 1 gate" header is amended by F1.68; position (8th in 02-series, before 03) and the Phase 1 journey mapping are refreshed and verified
11. **Sign-off recorded** in the utter-satisfaction file from the four round-table agents (@product-manager, @tech-lead, @architect, @founder)

---

## 10. Risk-Register Additions

New entries to add to `01b-phase-0-risk-register.md`:

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R53 | Dead-reference gap: docs/skills invoke sub-agents not guaranteed by default across most supported harness shapes | High (current state) | Medium | 02g rewrite + F1.69 lint as CI gate; six-harness smoke matrix in DoD #7 |
| R54 | Mirror drift: `.opencode/skills/` diverges from `.agents/skills/` during reword | Medium | Low | F1.65 sync + F1.69 drift check |
| R55 | Regression to agent-name invocation syntax, or persona deletion without data | Low | Medium | ADR-005 contract + F1.69 lint + measurement gate (F1.70) |

**Phase attribution:** R53 is the current-state gap fixed by 02g (Phase 1). R54/R55 are enforcement-lifecycle risks; controls ship with 02g tooling.

---

## 11. Sign-Off

**Round-table consensus (2026-08-08, all SATISFIED):** Elena (keep personas — "GO on the rewording epic; personas keep; removal is a 3-hour decision with evidence, not sentiment"), Vera (approve — "the abstraction survives; the wiring needs rewording"), Grant (approve — "25-35h honest estimate; reword-keep-measure; squad decoupled"), Sarah (approve — "reword now, measure through v2.0.0, delete only if data shows the personas cost more than they enforce").

**Residual (non-blocking):** F1.68 must amend the stale 02f header before the Phase 1 position can be marked consistent. F1.69 ships after the skill batches and mirror sync it validates; its first run is the DoD #3 evidence, and its persona-marking whitelist must be tested against legitimate roster references.

---

*Author: @round-table (orchestrated by Chris's request, consensus from the harness-honesty round table 2026-08-08). Build items owned by @tech-lead for execution; doc-lint owned by @qa-engineer for verification.*
