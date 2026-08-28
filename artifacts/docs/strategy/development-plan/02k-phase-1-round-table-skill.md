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
| T003 | Verify: diff review, frontmatter integrity, solo smoke test (no-subagent harness), coverage check in live roundtable | 1 | T002 | — | @qa-engineer | [ ] (static done; dynamic pending — see log) |

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
