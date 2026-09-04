# Risk Register — Consolidated (Phase 0 Foundation)

> **Source:** Consolidated from master roadmap Part 5 (13 rows), enrichment plan §8 (15 rows), each phase file's baseline risks, and round-table review additions.
> **Total:** 45 risks (R1–R44 + R20a). Phase 0 scope is COMPLETE and FROZEN. Phase 1+ sub-plans manage their own dedicated risk registers.

---

## Cross-cutting risks (apply to all phases)

| # | Risk | Likelihood | Impact | Mitigation | Phase |
|---|---|---|---|---|---|
| R1 | Phase files silently rewrite the master plan (budget overruns, scope creep not reflected in master) | High | High | This `development-plan/` folder is the fix — single source of truth. No more phase files with different budgets than the master. | All |
| R2 | Superseded docs still cited as source for implementation details | High | Medium | Code specs moved to `03e-phase-2-implementation-specs.md`. Superseded docs (`2.` and `3.`) should be moved to `_archive/`. | All |
| R3 | Total time overruns the estimate | Medium | Medium | Each phase is independently shippable. If Phase 3 slips, ship Phases 0-2 as v2.0-rc2 and defer. | All |
| R4 | Frontmatter v2 migration breaks external parsers | Low | Low | v1 fields still allowed (deprecated). v2 enforced at v2.0 release; v1 removed at v3.0. | 0 |
| R5 | Hermes integration ships without disclosing degraded mode | Medium | High | `03d-phase-2-harness-integration.md` states the limitation in the header, not buried in a table. Hermes is deferred to v2.3+ and framed as a documented degraded mode under 03c's M3/M4. | v2.3+ |

---

## Phase 0 risks (Foundation + Identity)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R6 | Frontmatter migration is repetitive (21 files) | High | Low | Use a script, not 21 hand-edits. |
| R7 | IDENTITY block boundaries drift if not enforced | Medium | Medium | Validator must reject agents without the IDENTITY block. |
| R8 | Channeled mentor overload (3+ references) | Medium | Low | Hard rule: 1-5 per agent (matches `validate_frontmatter.js`, which allows 1-5; prefer 2). Reject 6+. |
| R9 | Glossary becomes a bikeshed magnet | Medium | Low | Lock at end of phase; future changes require explicit review. |
| R10 | T7.1 delegation contract blocks add boilerplate to 13 agents | Medium | Low | Keep each block ≤ 8 lines. Policy lives in `delegation-pattern.md`, not in each agent. |

---

## Phase 1 risks (Skill Restructure + Artifact Rigor)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R11 | Step-file split loses content from monolithic SKILL.md | Medium | High | Content-audit script before/after the split: assert every section has a home. |
| R12 | Tri-modal mode detection misfires (user says "validate" but LLM runs "create") | Medium | Medium | First read of SKILL.md is a literal mode selector; LLM cannot skip it. Test with adversarial prompts. |
| R13 | Spec-kernel too thin for some artifacts | Medium | Low | Kernel is the minimum; additional content lives in companion files. `spec-law` self-validate sweep catches violations. |
| R14 | CSV method libraries drift | Low | Low | Pin a version comment at top of each CSV. |
| R15 | Ivy's dynamic HTML generation produces inconsistent structure | Medium | Medium | Enforce standard spec sections in the generation template. |

---

## Phase 2 risks (Enablement)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R16 | Hooks break in Claude Code / OpenCode / Cursor | Medium | High | Per-harness adapter in `bin/cli.js` (canonical — `bin/install.js` doesn't exist); OpenCode adapter is a generated plugin (no `hooks` config key exists); verification tasks V1-V4 before implementation; CI runs against all 3. Safety hooks `exit 0` by default, `exit 2` only for explicit safety events; hook crashes fail closed. |
| R17 | MCP tools become a second source of truth | Low | High | MCP tools are wrappers around existing scripts. The script is the truth. MCP never owns state. |
| R18 | `witness.js` false positives (legitimate edits trigger INTEGRITY-WARNING) | Medium | Medium | Re-sign on every `@memory-controller write`. Witness is a history, not a lock. First warning is informational. |
| R19 | Self-learning promotes false patterns too aggressively | Medium | High | 3+ occurrences, 2+ agents, 7+ day span — all required. Every promotion is human-in-the-loop; instinct promotion is interactive. `instincts.md` auto-loads at session start (F2.14) — the promotion PIPELINE is opt-in, the load is not (corrected wording; earlier draft said "instincts.md is opt-in"). |
| R20 | Delegation audit reveals low delegation rate | High | Low | This is the audit's job; don't game the metric. Use the data to improve agent prompts. |
| R20a | Delegation hooks block legitimate direct I/O | Medium | Medium | `[DIRECT-IO-JUSTIFIED: ...]` protocol is the escape hatch. Hook checks for the justification string — if present, it passes. Users can disable via `VESPYR_DISABLED_HOOKS=pre:bash:delegation,pre:edit:delegation` if too aggressive. **All blocked/justified events are logged** (F2.22) and the audit flags implausible justification rates — the string check is a convenience, not a security boundary. |

---

## Phase 3 risks (Quality + Observability)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R21 | Graph auto-build adds 2-5s latency to every skill | Low | Medium | `check` is mtime-only (no parsing), < 500ms. `build` only runs when `[STALE]`. |
| R22 | Catalog parity test fails on first run (counts already off) | High | Low | Expected. Test derives counts from disk and outputs the diff; the fix is the **v2.1 Phase 4 documentation rewrite (F4.11-F4.14) + 06 T5.61-T5.64** — not "the v2.0 release". The test must pass at Phase 4 done-when. |
| R23 | Graph query API returns too much data | Low | Low | Each query sized for LLM consumption; `summary` returns top 5, `blast-radius` returns just names. |
| R24 | Telemetry surface overwhelms context | Low | Medium | Cap at 20 lines for `session`, 15 for `hot-paths`. Never raw event data. |

---

## Phase 4 risks (Modularity)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R25 | Module split breaks existing installs | Low | High | `install-modules` is opt-in. Default matches current behavior. `core` always required. |
| R26 | Rules merge order is non-obvious | Medium | Low | Document specificity rule in `rules/README.md`; add `validate_rules.js` test. |
| R27 | Example project becomes maintenance burden | Low | Low | It's an example, not a real product. Update only when schema changes. |
| R28 | Builders produce inconsistent output | Low | Medium | Each builder uses `@writer` with a hardcoded template; output is byte-identical to hand-written. |

---

## Phase 5 risks (Deeper Bench)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R29 | Persona overlap discovered post-release | High | Medium | Pre-release `@architect` review against existing 21. "No overlap" rule is a hard gate. |
| R30 | Game-studio squad can't find a real project to validate against | High | Medium | T2 ship-block: a working game project exercises every game persona. If none found, defer to separate minor release. |
| R31 | New personas all want `read + bash`, breaking the reasoning/I/O split | Medium | High | Hard rule: any persona with `bash` is "thinking + execution" (developer-tier). Every bash command goes through `@executor`. The split is preserved. |

---

## Phase 0 risk — worktree tooling (T7.1b)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R32 | Orphaned worktrees accumulate (agent crashes mid-task, worktree never cleaned) | Medium | Medium | `worktree.js clean-all` for bulk cleanup. `stop:session-end` hook (Phase 2) can auto-clean stale worktrees. `loop-state.json` tracks active worktrees for manual audit. |

---

## Phase 6 risks (Loop Engineering)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R33 | Token cost runaway — `/goal` with 10 iterations × full context is expensive | High | High | Hard iteration limit (10, configurable via `VESPYR_GOAL_MAX_ITERATIONS`) + cumulative token budget `VESPYR_GOAL_MAX_TOKENS` (~100k, enforced in `goal_check.js` — iteration count alone is a weak guard). `goal_check.js` runs only the verification command (not full agent context), one iteration per invocation with a working pause/resume state machine. @goal-verifier is a narrow read-only sub-agent (~80 lines, minimal context). Automations start with ONE task; each new automation must clear persona gating (Gate A or B). |
| R34 | @goal-verifier rubber-stamps (returns DONE when it shouldn't) | Medium | High | @goal-verifier reads ONLY the verification command output, not the maker's code or reasoning. If the command exits non-zero, verifier MUST return `NOT-DONE`. The verifier cannot be talked into "done" by the maker — it has no access to the maker's context. |
| R35 | Comprehension debt accelerates — loop ships code the user didn't write or review | High | High | `/goal` writes a report at the end (what changed, what passed, what to review). Automations write to a triage inbox for human review — they do not auto-merge. The loop surfaces work; the human reviews it. No auto-merge, no auto-advance past the QA hard gate (Phase 2 F2.23). |
| R36 | Cognitive surrender — user stops having opinions and just takes what the loop produces | Medium | High | `/goal` requires a verifiable condition (forces the user to define "done" upfront). Automations require a human review gate before any code modification. The loop is a tool, not an autopilot. This is the article's own warning, not a new one — and it maps to Vespyr's existing "Think Before Acting" guardrail. |

---

## Cross-cutting risks (added during review)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R37 | v1.7.x → v2.0 upgrade destroys user customizations | High | High | Migration script (Phase 0 F0.23) backs up all agent files before changes, extracts hand-edits into `.agents/custom/*.toml` overrides. `npx vespyr migrate` is the safe upgrade path. |
| R38 | Session-start latency exceeds 1 second | Medium | Medium | Latency budget owned by @tech-lead with the canonical step table (03 F2.14: steps 0.0-0.5, total ≤ 860ms + margin < 1000ms; steps 0.3-0.5 from ONE `session_bootstrap.js` spawn). CI test (`test_session_latency.js`, F3.21 — now has an owner) enforces the budget; non-blocking ops emit `[SKIPPED]` on timeout. |
| R39 | Self-learning accumulates noise without measuring value | Medium | Medium | 3 outcome metrics (Phase 2 F2.15.a-c): instinct hit rate (>50% target), pattern freshness (flag >90 days stale), token cost tracking (cap at 200 tokens). |
| R40 | No validation that the full pipeline works end-to-end | High | High | Dogfood project (Phase 4 F4.16) exercises `/validate-idea` → `/iterate` on a real project before shipping. Integration bugs filed as GitHub issues. |
| R41 | UTTERLY SATISFIED becomes performative sign-off theater | High | High | Require evidence, explicit state vocabulary, revalidation fingerprints, and a machine-readable launch gate. Do not optimize for zero blocks or fastest approval. |
| R42 | Feedback loops run forever or agents stop without resolving the issue | Medium | High | Keep the two-cycle limit, then escalate to the binding authority. Record the decision and residual risk; never fabricate `SATISFIED`. |
| R43 | Harness, module, MCP, or token-effective mode drifts from the DNA contract | Medium | High | Treat `.agents/references/utter-satisfaction.md` as the canonical source; add adapter parity tests and a failing test for attempted gate bypass. |
| R44 | Satisfaction telemetry incentivizes rubber-stamping or agent popularity | Medium | Medium | Measure evidence completeness, blockers, revalidation, resolution time, and escalations. Never rank agents by approval count or satisfaction speed. |

