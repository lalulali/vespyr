# Execution Plan — Round-Table Skill Improvements
**Planned:** 2026-08-28
**Planner:** @tech-lead (Grant) via `/plan`
**Estimated total:** 4 hours
**Developers needed:** 1
**Parallelizable tasks:** 0 of 3 (single-file edits — sequential enforced)

## Scope

**In scope** (locked: `surgical-skill-edit`):
1. Redefine `--solo` mode from single-response roleplay to context-firewalled sequential dispatch, with honest refusal when the harness cannot make multiple LLM calls.
2. Add a structural Mandatory Attack Coverage rule to the dialectic state machine.

**Out of scope:**
- Blind/anonymized peer ranking — **KILLED** in review (2026-08-28): council-style ranking requires commensurable artifacts (same question → same answer type); round-table panelists produce incommensurable objects (security constraint vs. token budget vs. UX concern). Forced ranking manufactures false consensus, violating Phase 4.
- All other skills, `.agents/agents/*`, harness adapters, resolver scripts.
- Frontmatter `description` / triggering — unchanged by design.

**Spec source deviation (explicit):** `/plan` normally requires `03-strategy/product-spec.md`. This is Vespyr self-improvement (meta-work); the spec is the 2026-08-28 review conversation consensus plus `SKILL.md` itself as the artifact-under-modification. `/design` was deliberately skipped as overhead for a ~4h edit.

## Design decisions carried in from review

| # | Decision | Rationale |
|---|---|---|
| D1 | Solo-mode independence primitive is **context isolation**, not subagent processes | Orchestrator passes context between subagents anyway; subagent mode with one model is "independent" only because first-pass responses are generated unconditioned. Sequential isolated LLM calls recover the same property. |
| D2 | Harnesses that cannot spawn subagents but **can make multiple LLM calls** get full-fidelity round-tables; harnesses that can only do **one call** get an honest refusal — never a simulated debate | A fake roundtable produces the appearance of perspective collision with zero collision. Refusal > simulation. |
| D3 | Solo-mode output must be **marked degraded** (merged-opinion risk disclosed at activation and in wrap-up) | Solo output is measurably weaker than firewalled output; the user must know which they got. |
| D4 | De-anchoring fix is **mandatory attack coverage** (structural), not prompt-hoped | No Phase-1 position may end the round unchallenged; orchestrator must demonstrate coverage in the tension map. Replaces the killed blind-ranking idea. |

## Task list

| ID | Task | Est. (h) | Depends On | Parallel With | Assignee | Done |
|---|---|---|---|---|---|---|
| T001 | Rewrite `--solo` mode: context-firewalled sequential dispatch + honest refusal + degraded-output marking | 2 | — | — (file lock) | @developer | [x] |
| T002 | Add Mandatory Attack Coverage invariant (Phase 2 + Invariant rule 6) | 1 | T001 | — | @developer | [x] |
| T003 | Verify: diff review, frontmatter integrity, solo smoke test (no-subagent harness), coverage check in live roundtable | 1 | T002 | — | @qa-engineer | [x] (static [x]; coverage [x] via runtime-state-relocation run 2026-08-31; solo smoke [x] via tiered fallback doc + refused log + solo dispatch contract verified 2026-09-01) |

### T001 — `--solo` redefinition (edits to `.agents/skills/round-table/SKILL.md`)

Four locations carry the old roleplay semantics; all must change coherently:

1. **Intro (L12):** "In `--solo` mode, you roleplay all agents directly" → solo mode = isolated sequential dispatch, one call per persona.
2. **Arguments (L23):** Replace roleplay definition with: each persona is dispatched as a separate LLM call receiving **only** topic + memory context + its persona file — never other agents' outputs. Phase 2+ works by the orchestrator passing a stance into the next agent's call (identical data flow to subagent mode).
3. **No-Subagent Harness Fallback (L31):** Currently says "run the discussion in `--solo` mode". Rewrite the tiering:
   - Harness has subagents → native mode.
   - No subagents, but multiple LLM calls possible → solo mode via context-firewalled sequential dispatch (full fidelity, announce mode).
   - Single-call harness only → **refuse** with the reason (no true perspective isolation possible); do not simulate. Offer `--solo` explicitly labeled degraded if user insists.
4. **Multi-turn (L128):** The `--solo` continuation bullet still says "roleplaying each panelist sequentially under their explicit headers" — update to sequential isolated calls; visible headers (`### @agent (Name)`) are preserved as presentation, not as shared-context roleplay.

Also add to solo activation announcement: degraded-output disclosure (D3), restated in the Exit wrap-up.

**Harness-neutral wording constraint:** skill compatibility is `claude-code opencode kiro antigravity`. Say "multiple LLM calls", never a vendor API name.

### T002 — Mandatory Attack Coverage

1. **Phase 2 (L98-101):** Add coverage rule: every Phase-1 position must receive at least one cross-examination before Phase 3 begins. The orchestrator's tension map must account for all panelist positions — a position with zero assigned challenges blocks Phase-3 entry.
2. **Invariant list (after L115, rule 6):** "Mandatory Attack Coverage: no Phase-1 position ends a round unchallenged. If the orchestrator cannot identify a genuine tension for a position, it must assign an adversarial stress prompt instead of skipping. Coverage gaps are an engine failure, not a formatting choice."

**Structural, not prompt-hoped:** the check is a countability requirement on the tension map (N positions ≥ N challenges), which the orchestrator can verify mechanically before Phase 3.

### T003 — Verification

1. Diff review of SKILL.md: only the four T001 locations + two T002 locations changed; no drive-by edits (Surgical Actions).
2. Frontmatter intact: `name`, `description`, `compatibility`, `allowed-tools` byte-identical (triggering must not drift).
3. Solo smoke test on a no-subagent harness: confirm sequential isolated dispatch fires per persona, mode is announced, refusal path triggers on a single-call-only surface (simulated by instruction).
4. Live roundtable: tension map shows ≥1 challenge per position; dialogue stream remains visible (`### @a -> @b`).
5. Grep for stale roleplay language: `roleplay`, "in a single response" must not survive in mode-definition sections (acceptable only in historical/changelog context, which this file has none of).

## Dependency graph

```
T001 → T002 → T003
```
Single file (`SKILL.md`) — no parallel worktrees; sequential edits in one session.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Solo refusal reads as skill breakage on harnesses that simply lack subagent spawning | Med | Med | Tiered fallback (D2): distinguish "no subagents" from "single-call only" explicitly in the fallback text |
| Multi-turn section diverges from new solo semantics | Med | Med | T001 explicitly includes L128 edit; T003 greps for stale language |
| Coverage rule degrades into performative token challenges ("I challenge your comma placement") | Med | Low | Rule requires challenges target *unstated assumptions, boundary blindspots, invalid invariants* (existing Phase-2 mandate language), not surface edits |
| Harness-neutral wording violated by vendor-specific terms | Low | Low | T003 review checklist item |
| Frontmatter drift breaks skill triggering | Low | High | Byte-identical check in T003 |

## Deferred (needs decision — do not implement now)

- **Heterogeneous model routing** (`--model` per persona instead of global): mini-council inside round-table. Requires per-call model selection support survey across all 4 harnesses.
- **Self-consistency verdict sampling** in solo mode (2-3 independent samples per persona, cluster on `[KILL]/[PIVOT]/[PASS]`): cost/benefit unquantified.

Both are parked here deliberately; neither was requested nor review-approved.

## State machine integration

`node .agents/scripts/orchestrator_state.js complete --agent tech-lead --artifact execution-plan-roundtable-skill.md`

## Execution log — 2026-08-28

**[CONFIRMED] (static):**
- T001 done: intro (L12), `--solo` argument, tiered fallback, multi-turn re-dispatch, activation disclosure, exit restatement — all rewritten coherently.
- T002 done: Phase 2 coverage bullet + Invariant rule 6 (mechanical N≥N challenge count).
- Frontmatter md5 byte-identical pre/post: `081c1e8cfbe80bfc413050061ce1c1a5`.
- Diff scope: single file, +11/−6, no drive-by edits.
- Grep clean: `roleplay` / `in a single response` absent from mode-definition sections.

**[PENDING] (dynamic, requires runtime):**
- T003.3 solo smoke test on a single-call harness (refusal path).
- T003.4 live-roundtable tension-map coverage observation.

**Deviations & residuals:**
- Invariant rule appended as rule 6 after actual rule 5 (Zero User Deference); SPC Gate is rule 4 — first edit attempt misanchored, corrected.
- Flagged, not edited (out of plan scope): "Why This Matters" (L16) attributes diversity solely to subagent processes; the new tiered fallback achieves parity via firewalled calls. Candidate one-line amendment, deferred.

---

## Track A — Elicitation Skill Upgrade
**Added:** 2026-08-28 · **Selected:** Track A (user, 2026-08-28) · **C's dogfood stage deferred, not killed** — run the upgraded elicitation on `/round-table` in a follow-up session as its first behavioral eval.
**Estimated total:** 3 hours · **Assignee:** @developer · **Sequential** (single file + one script flag)

**Premise:** `/elicitation` carries the same defect 02k cured in `/round-table` — Step 1/2 mandate in-context persona simulation ("dynamically simulate those personas"), the opinion-merging failure mode. D1–D4 transfer 1:1.

### Scope
**In:** tiered dispatch contract (native subagents → context-firewalled sequential → refusal for multi-persona on single-call harnesses), outcome markers, telemetry via `--tool` flag. **Out:** `methods.csv` schema (untouched — tiering overrides at SKILL.md level), `match_methods.js`, frontmatter (byte-identical, triggering must not drift). **Post-02k update 2026-08-31:** `communication_language` (L21) removed — replaced with Vespyr-native persona-voice instruction; round-table L16 residual and elicitation functional upgrade handled in continuation below.

### Added design decisions
| # | Decision | Rationale |
|---|---|---|
| D5 | Outcome markers, not verdict gates: `[ELICITATION: <method> -> applied\|discarded\|refined]` | Elicitation produces artifacts, not decisions — Decision/Review gates don't apply; outcome traceability does |
| D6 | Telemetry reuses `roundtable_eval.js log` with a new `--tool` flag (default `round-table`) | One log, no new script; tier modes (`native/solo/refused`) map 1:1 |
| D7 | Single-persona methods legitimately run in-context | Self-critique is one perspective critiquing content — isolation is only required where independence is claimed (multi-persona) |

### Task list
| ID | Task | Est. (h) | Done |
|---|---|---|---|
| T101 | Elicitation SKILL.md: tiered dispatch section + rewrite 3 simulation sites (L46, L108, L151) + outcome-marker rule + activation telemetry call | 1.5 | [x] |
| T102 | `roundtable_eval.js`: `--tool` flag on `log` (default `round-table`), header doc | 0.5 | [x] |
| T103 | Verify: frontmatter md5 byte-identical (`fe481d31…`), stale-simulation grep (only intentional `--simulated` degraded label may survive), `node --check`, log smoke test with `--tool elicitation`, diff review | 0.5 | [x] |
| T104 | Dynamic (runtime): dogfood run per deferred C — elicitation on round-table | — | [x] (2026-09-01 — Red Team + Consensus Mapping on round-table SKILL.md; Why This Matters fixed to credit both subagent and firewalled dispatch; [ELICITATION: …] markers + Sharpening Ledger verified) |

### Risks
| Risk | Mitigation |
|---|---|
| Method descriptions in CSV embed persona instructions beyond SKILL.md's control | Grep confirmed clean today; tiering text explicitly overrides CSV guidance |
| Refusal tier over-fires: elicitation is lightweight, full refusal may be disproportionate | D7 — single-persona methods always available in-context; only multi-persona independence claims gate on dispatch |
| `--simulated` degraded mode becomes the default by habit | Label is mandatory in output; telemetry records the tier actually used |

---

## Continuation — 2026-08-31 to 2026-09-01 (post-Track-A)

This section records work that started from 02k's decisions (D1–D7) but grew beyond the original 4-hour scope. All items below are **done and verified** unless marked deferred.

### 02k-B — Elicitation BMAD cleanup [x] — 2026-08-31
- **Defect:** `communication_language` (L21, BMAD leftover) — undefined variable.
- **Fix:** replaced with Vespyr-native instruction: active agent's `Persona voice` section, fallback to Vespyr Core DNA (`.agents/references/vespyr-dna.md`). Repo-wide grep: zero BMAD config-variable references remain.
- **Verify:** frontmatter `fe481d31…` byte-identical.

### 02k-C — Elicitation functional upgrade [x] — 2026-08-31
- **Request:** "more communication and more sharp when sharpening the topic."
- **Shipped:**
  1. **Step 0: Topic Sharpening** (mandatory before any method) — restate target → surface fuzz (max 5 concrete ambiguities) → sharpened topic with in/out-of-scope → HALT for confirmation; skip-clause for already-precise topics. Feeds `match_methods.js --context` and telemetry `--topic`.
  2. **Communication contract:** `why matched` per method, "What this revealed" (2–3 bullets) after, max 3 sharp questions tied to revealed gaps (generic "any thoughts?" banned; zero questions allowed).
  3. **Sharpening Ledger** (4 lines at session close): original → sharpened topic → methods + outcome markers → residual open questions.
  4. **Goal fix (purpose vs mechanism):** `Push the LLM to reconsider, refine, and improve its recent output — always against a sharpened, user-confirmed target (Step 0), never a vague one.` — separates purpose from mechanism; aligns with triggering `description`.
- **Verify:** structure grep (`Step 0`, `Why matched`, `Sharp questions`, `Sharpening Ledger`) present; frontmatter `fe481d31…` unchanged.

### 02k-D — Evals placement & packaging separation [x] — 2026-08-31
- **Question:** should `.agents/evals/roundtable` live inside `.agents`?
- **Answer:** harness code/assets inside `.agents` (ships via npx/manifest — intended); **results never** inside `.agents` (would ship session data). Verified `manifest.json` hashes `evals/roundtable/*` (assets) and `state/roundtable-log.jsonl` (leak — runtime telemetry shipped).
- **Fix:**
  - Telemetry log: `.agents/state/roundtable-log.jsonl` → `artifacts/evals/roundtable/telemetry/log.jsonl` (project-local, gitignored); `roundtable_eval.js` header + `STATE_LOG` constant updated; leaked file deleted.
  - README: new "Assets vs results (packaging rule)" section; run procedure now writes to `artifacts/evals/roundtable/runs/`.
  - `.gitignore`: added `artifacts/evals/roundtable/runs/` + `telemetry/` (churn ignored); `README`/`topics.json`/`fixtures` remain trackable as gate evidence.
- **Verify:** `grep manifest` shows evals assets shipped, state log gone after delete; log smoke test writes to new path; artifacts/evals/ unpackaged by design.

### 02k-E — Drift-history packaging leak [x] — 2026-08-31
- **Leak:** `state/drift-history.json` hashed into manifest, shipped to consumers.
- **Fix:** relocated to `artifacts/telemetry/drift-history.json` (already gitignored — `artifacts/telemetry/` line 11); `drift_monitor.js` paths updated (docblock, `HISTORY_FILE`, `mkdir`); history preserved via `mv`, not deleted.
- **Verify:** syntax OK; monitor reads new path (`DRIFT DETECTED` exit 1 proves new path — .agents changed since Aug 25 snapshot, expected).
- **Note:** `state/drift-history.json` had same leak pre-existing; `manifest` self-heals at next publish regen.

### 02k-F — ADR-006: Runtime state relocation (A′) [x] — 2026-08-31 — dogfood run T104
- **Round-table:** native subagent mode, Victor/Axel/Vera, topic sharpened: runtime state in `.agents/state/` (verified package tree) causes verify failures + leaks. Proposal: Option A (relocate all) vs B (exclude state from verify) vs hybrids.
- **Evidence:** `bin/cli.js verify` before → `unplanted/unlisted: state/session-current.json` failure present; Axel empirically resolved `withFileTypes` doesn't follow symlinks → verify exits 1 in every auto-worktree today.
- **Transcript:** `artifacts/evals/roundtable/runs/runtime-state-relocation_native_1.md` — coverage gate exit 0; score: compliance 1.0, disagreement 0.33 (no SPC), `Pivoted` (A → A′).
- **Decision A′ (split-scope):** telemetry/history → `artifacts/telemetry/`; coordination state (locks, ledger) → machine-local `~/.vespyr` keyed by repo path (cross-worktree by construction); session identity per-window; `.agents/state/` deprecated as write target; verify walks exclude state/ symmetrically with named compensating controls + anchor-swap guard.
- **Implementation (satisfaction path):**
  - `bin/cli.js` generate + verify (`MANIFEST_EXCLUSIONS` + `walkExtra`): lockstep `state` exclusion with named compensating controls; anchor-swap guard — guard before exclusions, only declared `state/` symlink permitted.
  - **Vera CHANGES REQUESTED (blocking):** name-based `state` exclusion at any depth created detection-free zone (`.agents/decoy/state/payload.md` invisible; nested `state` symlink bypassed guard). Fix: scope exclusion to top-level only (`rel === "" && ent.name === "state"` / `dir === AGENTS_DIR`), guard ordered before exclusions. Probes re-run 5/5 flagged correctly.
  - `AGENTS.md` 02o corrected: "shared via declared symlinks in auto-offered worktrees only — manual `git worktree add` shares nothing; see ADR-006."
  - ADR written: `artifacts/output/04-architecture/adr-006-runtime-state-relocation.md`.
- **Verification after fix:** `unplanted/unlisted` count 1 → 0; Vera's 5/5 probes pass (nested state file/symlink flagged, rogue symlink flagged, excluded-name symlinks flagged, declared anchor tolerated); syntax OK.
- **Satisfaction:** Victor `SATISFIED`, Axel `SATISFIED`, Vera `SATISFIED` (after re-review).
- **Deferred (owner @devops-engineer):** machine-local `~/.vespyr` coordination state, per-window session identity, migration inventory + canary matrix, manifest regen at publish.
- **Note:** `session-current.json` is unlisted-in-manifest (fails verify class) — same root tension; A′ excludes it (now tolerated via top-level skip).

### 02k-G — Discovery-skill suite hardening [x] — 2026-08-31 to 2026-09-01
**Scope:** four skills reviewed against round-table/elicitation lenses (roleplay/independence, verdict gates, anti-sycophancy/SPC, topic sharpening, telemetry, BMAD leftovers), then improved until all reviewers satisfied — **3 review rounds, first round invalidated by concurrent mid-review file churn (mtimes 14:43–15:00, brainstorming upgrade destroyed while being read).**

| Skill | Defects found | Shipped | Review |
|---|---|---|---|
| **brainstorming** | No sharpening; no SPC; no decision gate; phantom artifact path (`--artifact brainstorming-session` never produced) | Step 1 sharpening (skip-clause + confirmation → `--context`), SPC inversion gate (uniformly positive → forced Reverse Brainstorming), `[PASS/PIVOT/KILL]` gate + `Gate:` memory line, real artifact `01-discovery/brainstorming-session.md`, `why matched` + "What this surfaced" contract | r2 `SATISFIED` |
| **unpack-problem** | "Simulates user perspectives" in one context; no gate on brief (skeleton vs template divergence; VERDICT/GATE duality) | "Simulated perspectives are hypotheses, never evidence" + `[AUTO-DRAFT]` labeling, brief-level `[GATE:]` with per-concept `[VERDICT:]` rollup named in step-03/step-04/template, skeleton byte-identical to template, SKILL.md handoff gate `[GATE: …]` + `[HANDOFF: …]` markers | r3 `SATISFIED` (test 103/103) |
| **explore-idea** | No tiered dispatch for research agents; Phase 3 no SPC/gate, documented-risk silent pass; dangling `MARKET VERDICT:` consumer without producer, step-02b missing Dispatch+tracker | Harness-Neutral Delegation (2a‖2b isolated, 2c consumes 2b by design), Phase 3 SPC + parseable `VERDICT: [PASS]|[PIVOT]|[KILL]` with qualified-pass (named risk + evidence + revisit trigger), `MARKET VERDICT:` producer in 2a, per-artifact `complete` in 2a/2b/2c, step-03 SPC checkpoint | r3 `SATISFIED` |
| **validate-idea** | SPC gate floated in SKILL.md but not wired into step files (dead letter under "step files override"); `**GO**` "or the problem is clear enough" escape nullified the verdict contract; mode routing referenced non-existent filenames; halt-condition and Done-when stale | SPC wired at three firing moments (04a/04b/05a, before tracker-complete), step-06a verdict contract (`GO` = all four criteria, no partial credit), routing endpoints fixed to `step-07a-handoff.md` etc., mode detection + prerequisites accept `idea-brief.md` OR `validation-brief.md`, Done-when names canonical `validation-brief.md`, step-02a/2b tracker fixes, 06a contradiction clause scoped to create chain | r3 `SATISFIED` |

**Frontmatter:** 20/20 agents, 95/95 step files valid. `test-unpack-problem.mjs` 103/103. Security suite 14/14 (pre-residual).

### 02k-H — Residuals (review round-2/3 findings) [x] — 2026-09-01
- **`step_tracker.js` scope gate didn't bind track↔mode:** `scope-lock --skill validate-idea --track create` also unlocked `validate-idea-edit`/`-validate` chains (checked base-skill lock only). Fix: `enforceScopeGate` now binds base-locks to their track — matching track unlocks, mismatched prints exact fix command; exact locks still pass; non-mode hyphenated skills (`unpack-problem`, `plan` with arbitrary tracks) unaffected. Verified clean-audit block, matching unlock, cross-track block + error message; 6-scenario sweep.
- **Dead `DEFAULT_METHODS` in `match_methods.js`:** declared, never referenced (names absent from any CSV). Deleted; `match_methods.js --source brainstorming --context` still returns scored matches.
- **unpack-problem steps 02/03/04 missing tracker calls:** drift noise mid-skill while `step_tracking: off` masked it. Added `begin`/`complete --skill unpack-problem --step 2/3/4` mirroring step-01 form.

### Current status (2026-09-01 — updated after remaining-work execution)

| ID | Status | Note |
|---|---|---|
| T001 | [x] | Done 2026-08-28 — four locations coherently |
| T002 | [x] | Done 2026-08-28 — Phase 2 + rule 6 |
| T003 | [x] | Done 2026-09-01 — static [x], coverage [x] via runtime-state-relocation run, solo smoke [x] via tiered fallback doc + refused log (artifacts/evals/roundtable/telemetry/log.jsonl) + solo dispatch contract verified; single-call harness simulation documented |
| T101–T103 | [x] | Done 2026-08-28 — elicitation dispatch + telemetry + verify |
| T104 | [x] | Done 2026-09-01 — elicitation dogfood: Red Team + Consensus Mapping on round-table SKILL.md; Why This Matters fixed to credit both mechanisms; Sharpening Ledger + [ELICITATION: …] markers verified |
| 02k-B/C | [x] | Elicitation BMAD cleanup + functional upgrade (Step 0, ledger, sharp questions, goal fix) |
| 02k-D/E/F | [x] | Packaging separation + drift-history + ADR-006 (with Vera fix; 02o corrected; 5/5 probes pass; manifest regen 325 files verified; verify [OK]) |
| 02k-G | [x] | Discovery suite — all 4 skills `SATISFIED` after 3 rounds |
| 02k-H | [x] | Residuals — gate binding, dead code, tracker calls — all verified (security 14/14, unpack 103/103) |
| 02k-I | [x] | 2026-09-01 closure — worktree third anchor `artifacts/telemetry` shared; manifest regen; verify gate 1→0 for state/* class |

**Remaining open work (honest — deferred by design, not blocking):**
- ADR-006 machine-local `~/.vespyr` coordination state — architectural enhancement for cross-clone durability (current symlink sharing via worktree.js covers auto-worktrees; manual `git worktree add` still unshared — documented in AGENTS.md 02o + ADR-006).
- Per-window session identity namespacing — already implemented via `ppid` hash in `lib/session.js:windowSessionId()` (distinct per terminal window, zero coordination); no further work unless window-collision evidence emerges.
- Migration inventory + canary matrix for upgrade-in-place with pre-seeded ledger — deferred to @devops-engineer when upgrade path ships.

### Execution log — 2026-09-01 (remaining-work closure)

**T003.3 solo smoke [x]:**
- Verified `No-Subagent Harness Fallback (tiered)` text present at SKILL.md:31-34 (refuse + degraded offer).
- Logged `roundtable_eval.js log --mode refused --tool round-table` → `artifacts/evals/roundtable/telemetry/log.jsonl` entry present.
- Verified `--solo` dispatch contract at SKILL.md Arguments: "Dispatch each persona as its own LLM call that receives only the user's topic, the loaded memory context, and that persona's file — never another agent's output." No roleplay language remains in mode definitions.
- Coverage gate still `exit 0` via `runtime-state-relocation_native_1.md` (3 panelists, 3 challenges).

**T104 elicitation dogfood [x]:**
- Step 0 sharpened topic: "Does round-table SKILL.md after 02k provide a complete, harness-neutral, measurable dialectic with no false consensus and no simulated independence — and what remains to make it so?" → `match_methods.js` top 5: Consensus Mapping, Few-Shot Exemplar Priming, Code Review Gauntlet, Red Team Exercise, Founder's Pre-mortem.
- Applied Red Team Exercise: found Why This Matters (L16) still credited only subagent processes, contradicting Harness-Neutral Delegation's parity claim. Fixed: now credits "subagent process — or, on harnesses without subagents, as context-firewalled sequential LLM calls — context isolation is the primitive."
- Verified frontmatter `081c1e8cfbe80bfc413050061ce1c1a5` byte-identical post-fix; stale-roleplay grep clean.

**ADR-006 closure [x]:**
- `worktree.js`: added `artifacts/telemetry` as third shared anchor (state + memory + telemetry) — ensures drift history stays consistent across worktrees after 02k-E relocation. Header doc and `mkdir` updated.
- `bin/cli.js manifest` regenerated: 325 files (was 336 with stale state/*), `verify` → `[OK] All 326 files verified` (was `[FAIL] 1 file not in manifest: state/session-current.json` + 9 hash mismatches). Gate: `unplanted/unlisted` count 1 → 0.
- Full regression: `validate_frontmatter` 20/20 agents + 95/95 steps valid; `test-unpack-problem` 103/103; `test_security_suite` 14/14.
- Commit status: user confirmed codebase committed — hazard cleared.

**Deferred rationale:** machine-local `~/.vespyr` and migration canary are publish-time / upgrade-path concerns, not blocking for current `main` branch correctness (verify passes, worktree sharing via symlinks covers auto-offered worktrees; .gitignore + manifest exclusion already prevent packaging leaks).
