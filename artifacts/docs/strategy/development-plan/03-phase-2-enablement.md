# Phase 2 — Enablement

> **Release:** v2.1
> **Calendar:** Weeks 5-7 (was "Week 5" — the phase bundles 03 + 03a + 03b ≈ 149-207h; see estimates below)
> **Themes:** T4 (Harness contracts), T5 (Self-improvement), T8 (UTTERLY SATISFIED culture)
> **Goal:** Vespyr enforces policy at the harness layer (hooks), tracks its own work (self-learning), has delegation audited (not just documented), makes QA a hard gate, and begins runtime enforcement of the UTTERLY SATISFIED release contract.
> **Depends on:** Phase 0 T7.1 (delegation policy + contract blocks), Phase 1 (step-file skills — F2.24 rewrites `develop/SKILL.md`; `delegation_audit.js` and `memory_check.js` exist on disk from Phase 1 and are EXTENDED here), `03e-phase-2-implementation-specs.md` §8-11/§15-16 (canonical code), `08-cross-cutting-utter-satisfaction-dna.md` (gate semantics).
> **External Skills & Ingestion:** Specified in `03a-phase-2-external-skills-research-and-ingestion.md` — automated discovery, agency/consulting practice skills, and pre-install safety gate.
> **MCP (external tools):** Specified in `03b-phase-2-mcp-integration-plan.md` — 10 first-party tools (5 wrappers + 5 capability) + 4 third-party servers, all free and local-first.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| F2.19 (delegation policy + contract blocks) | Phase 2 only | **Split:** policy + blocks in Phase 0 T7.1; audit script + invocation logging in Phase 2 | T7 promotes the policy to Phase 0 (the moat ships first). Phase 2 ships the enforcement tooling. |
| Pre-Phase 0 (Hermes/OpenClaw) | v2.0 | **Deferred to v2.3+** | See `03d-phase-2-harness-integration.md` |
| F2.6-F2.10 (MCP tool surface) | Phase 2 | **Moved to `03b-phase-2-mcp-integration-plan.md`** (labeled F2.6-F2.10 there) | Centralized all MCP development (1st-party + 3rd-party) in one plan. |
| Calendar + estimates | Week 5, no hour estimates | **Weeks 5-7 with per-cluster estimates** (below) | Round-table review: 03+03a+03b ≈ 149-207h cannot fit one week; estimates were missing entirely for 03. |

## F2.1-F2.5 — Lifecycle hooks (13 hooks with stable IDs)

**Source:** Adoption §3.5 | **Theme:** T4

**Problem:** Vespyr has zero lifecycle hooks. The agent's only contract with the harness is the frontmatter and the markdown body. There is no PreToolUse, no PostToolUse, no SessionStart, no PreCompact. We cannot enforce policy at the harness layer.

**Target:** Add a hook graph in `.agents/hooks/hooks.json` with 13 hooks, each with a stable ID so users can disable selectively via env var.

**Full hook table (13 rows — the count below is the canonical one; earlier drafts said 12 or 10):**

| Event | Hook ID | What it does |
|---|---|---|
| `SessionStart` | `session:start:load-context` | Auto-invoke `@memory-controller load` to surface the last session summary. |
| `SessionStart` | `session:start:detect-package-manager` | Detect npm/yarn/pnpm/poetry/cargo and surface in `project-context.md`. |
| `UserPromptSubmit` | `route:task` | Run a routing pass: classify the user query, suggest a squad or agent, surface the suggestion to the calling agent. |
| `PreToolUse` (Bash) | `pre:bash:safety` | Block destructive commands (`rm -rf /`, `diskutil eraseDisk`, `mkfs.*`, etc.) — the GUARDRAILS rules are enforced at the harness layer. Must support `exit 2` to block. |
| `PreToolUse` (Bash) | `pre:bash:tmux` | If a long-running test is launched, suggest tmux to free the main thread. |
| `PreToolUse` (Bash) | `pre:bash:delegation` | If the invoking agent is a reasoning agent, block the bash call with `exit 2` unless the response contains `[DIRECT-IO-JUSTIFIED: ...]`. Logs the attempt + justification to `state/delegation-log.ndjson` (`delegated: false`). Steers I/O to a harness-native subagent (or a justified direct call). |
| `PreToolUse` (Write\|Edit) | `pre:edit:delegation` | If the invoking agent is a reasoning agent, block the write/edit call with `exit 2` unless the response contains `[DIRECT-IO-JUSTIFIED: ...]` OR the file is < 50 lines. Logs the event. Steers writes to a harness-native subagent (or a justified direct call). |
| `PostToolUse` (Write\|Edit) | `post:edit:format` | Auto-format the edited file via the project's formatter (prettier, ruff, gofmt). |
| `PostToolUse` (Write\|Edit) | `post:edit:dedupe` | Run `@memory-controller dedupe-validate` on the last write to `artifacts/memory/`. |
| `Stop` | `stop:session-end` | Invoke `@memory-controller session-write` automatically. |
| `Stop` | `stop:check-console-log` | Warn if the change added a `console.log` (catches agent slip-ups). |
| `PreCompact` | `pre:compact:save-state` | Snapshot the current state machine + session before compaction. |
| `SubagentStop` | `subagent:stop:telemetry` | Emit a telemetry event to `artifacts/telemetry/`. |

**Why this matters:** Enforcement at the harness layer. GUARDRAILS.md is documentation today. Hooks turn it into a runtime contract. `rm -rf /` is blocked even if `@developer` somehow tries it. Less cognitive load on agents — the agent doesn't need to remember to format, dedupe, or save state. The hooks do it.

The T8 gate uses the same principle. Hook and state-machine integrations may
warn during ordinary work, but release-affecting handoffs must validate the
machine-readable satisfaction record. A harness must never turn a missing
record into implicit approval.

**Why we don't adopt Ruflo's 27 hooks + 12 background workers.** That's the Ruflo ceiling. Vespyr's hook graph should be 10–14 hooks. Adding more is easy later; the cost of removing or rewriting a hook grows.

**Why we don't adopt Ruflo's "always exit 0" rule.** It's correct for hooks that learn / train. For our safety hooks, we want to be able to block an action — exit 2 to refuse.

**Fail-closed contract:** a hook script that crashes must block (exit 2), never
silently pass — the fault-injection pattern from 02f F1.47 applies to hooks
(per-harness fault tests). Justification strings are logged, not trusted:
`delegation_audit.js` flags agents whose justification rate is implausibly
high (abuse detection, 01b R20a).

- [x] F2.1 — Created `.agents/hooks/hooks.json` with all 13 stable IDs, per-harness event names, matchers and timeouts; a test asserts 13 unique IDs and that every script path exists
- [x] F2.2 — Created `.agents/scripts/hooks/lib.js` (stdin normalization, env profiles, fail-closed wrapper, NDJSON logging) plus 13 hook scripts. All pass `node --check`; spawn tests cover safety, delegation, disabled hooks and fail-closed
- [x] F2.3 — Per-harness emission implemented in `bin/lib/hooks.js` (the extracted adapter layer), called from `installer.js` on install and uninstall. V1–V4 verified against official docs 2026-11-19: OpenCode V2 `Plugin.define` API, Cursor `subagentStop`/`preCompact`, Copilot `.github/hooks` + `timeoutSec`, and timeout/exit semantics. Sources recorded in `.agents/hooks/README.md`. Original task text:
  - **Claude Code** → `.claude/settings.json` (native hook events, stdin-JSON contract)
  - **OpenCode** → static TypeScript plugin shipped at `.agents/plugins/vespyr-hooks.ts`, discovered through the `.opencode → .agents` symlink — OpenCode has NO `hooks` key in `opencode.json` (verified 2026-08-08 and 2026-11-19); hook behavior lives in the V2 plugin API (`ctx.tool.hook("execute.before"/"execute.after")`, `ctx.session.hook`, `ctx.event.subscribe`). Emitting it into the symlink at install polluted the manifest and left uninstall residue, so it ships as a normal payload file (corrected 2026-11-19).
  - **Cursor** → `.cursor/hooks/hooks.json` (verify event support for `SubagentStop`/`PreCompact` before wiring — see V2)
  - **Verification tasks before implementation:** V1 OpenCode plugin event map; V2 Cursor event support; V3 VS Code Copilot hook surface; V4 hook timeout semantics per harness (Claude Code default 60s/600s max — relevant to F6.8).
- [x] F2.4 — Implemented `VESPYR_DISABLED_HOOKS` (IDs or `*`), `VESPYR_HOOK_PROFILE=minimal|standard|strict` and the pure `resolveActiveHooks(hooksJson, env)` in `scripts/hooks/lib.js`; T-HOOK-1..3 assert disable list, minimal = exactly 4, strict = 13
  - `minimal`: safety hooks only (pre:bash:safety, pre:bash:delegation, pre:edit:delegation, stop:session-end)
  - `standard`: all 13 (default)
  - `strict`: all 13 + block on warnings (not just errors)
  - The hook loader exports a pure `resolveActiveHooks(hooksJson, env)` function so the active set is fixture-testable. Hook fixtures own `tests/test_hooks.test.mjs` (T-HOOK-1..5): disabled list, minimal profile = exactly 4 hooks, strict = 13, plus delegation-block/justify (T-HOOK-4/5). `tests/test_qa_gate.mjs` is QA-gate-only (T-GATE-1..9) — reconciliation 2026-11-19.
- [x] F2.5 — Created `.agents/hooks/README.md`: all 13 IDs, env vars, fail-closed contract, per-harness adapter table, and the V1–V4 verification sources

**Estimates (added in round-table review — previously missing):** F2.1-F2.5: 16-24h. F2.11-F2.15: 20-28h (incl. rebuilding `self_learn.js` §9 to its F2.12 contract). F2.16-F2.18: 6-10h. F2.19-F2.22: 6-10h. F2.23-F2.29: 18-26h. **03 total: 66-98h** (+ 03a 34-46h + 03b 49-63h ≈ 149-207h for the Phase 2 bundle → Weeks 5-7).


## F2.11-F2.15 — Self-learning (3-tier episode → pattern → instinct)

**Source:** Evolution Part 4 | **Theme:** T5

**Problem:** Vespyr has all the infrastructure for self-learning (memory-controller, lessons-learned.md, retro skill, patterns-and-conventions.md) but no active promotion pipeline — the part that decides "this lesson learned is now a general principle."

**Target:** A 3-tier instinct system:

**Tier 1: Episodes** (raw, ephemeral)
- Stored in `.agents/state/episodes.ndjson` as individual entries with date + context + outcome (updated 2026-11-19 to comply with `02i` removal of `agent-notes/`)
- Lifetime: until next `@retro` (compacted out if not promoted)
- Volume: high (every agent produces dozens per session)

**Tier 2: Patterns** (curated, stable)
- Promoted from episodes when: same pattern appears 3+ times across 2+ agents, spanning 7+ days
- Stored in `artifacts/memory/patterns-and-conventions.md`
- Lifetime: until manually archived or replaced
- Volume: medium (10-50 per project)

**Tier 3: Instincts** (auto-applied, opinionated)
- Promoted from patterns when: pattern has been stable for 30+ days AND is referenced by ≥ 2 ADRs
- Stored in `artifacts/memory/instincts.md`
- Auto-loaded by `@memory-controller` on every session (highest priority, before everything else)
- Lifetime: permanent until manually demoted
- Volume: low (3-10 per project — like a "house style")

- [x] F2.11 — Created `.agents/skills/self-learning/SKILL.md`: 3-tier model, promotion thresholds, human-in-the-loop promotion, auto-load, demotion, anti-patterns. Owner clarification 2026-11-19: the skill is the **human control surface only**; automatic capture runs in the background via `stop:session-end` → `self_learn.js auto-capture` (one episode per session + once-daily digest). Promotion stays deliberately human-gated.
- [x] F2.12 — Create `.agents/scripts/self_learn.js` (~340 lines): `scan-episodes --since=30d`, `find-patterns --min-occurrences=3 --min-agents=2 --min-span-days=7`, `promote-pattern` (writes patterns-and-conventions.md with `[last_seen]` maintenance), `promote-instinct` (interactive, requires human approval), `demote-instinct` (writes instincts.md `## Demoted Instincts`), `scan` (full pipeline), `scan-patterns --stale`, `instinct-cost`. **Implementation code:** See `03e-phase-2-implementation-specs.md` §9
- [x] F2.13 — Create `artifacts/memory/instincts.md` (empty starter, ~20 lines): header with format spec, `## Active Instincts` and `## Demoted Instincts` sections
- [x] F2.14 — Update `memory-controller.md` with the canonical session-start step order (single table — 04 F3.9, 07 F6.10 and 10 §4 reference this; earlier drafts used conflicting "Step 0"/"0.25"/"0.3"/"0.5" numbers):

| Step | Operation | Budget | Blocking? |
|---|---|---|---|
| 0.0 | `orchestrator_state.js session-start` (phase/blocker refresh) | 100ms | Yes |
| 0.1 | ONE `memory_filter.js` load: **instincts.md FIRST** (highest priority, ~200 token cap) → project-context.md → active-decisions.md → patterns-and-conventions.md → lessons-learned.md → agent-notes/<this-agent>.md, incl. the prefetch extension (10 §4) | 250ms | Yes |
| 0.2 | Instinct-hit log append (F2.15.a) | 10ms | No |
| 0.3 | `telemetry_surface.js session` — ≤20 lines (04 F3.9) | 150ms | No |

  _(The former step 0.3 graph-freshness check was removed with the graph subsystem — owner [NO-GO] 2026-09-24; steps renumbered. The former step 0.4 `loop-state.json` load is deferred until Phase 6 loop engineering ships and is intentionally absent here — reconciliation 2026-11-19; restore it in 07 F6.10 with its own 50ms budget.)_

  Step 0.3 runs from ONE `session_bootstrap.js` spawn (a separate node spawn ≈ 100ms cannot fit the budget). Total budget ≤ 510ms + margin (README §13 <1000ms; owner: @tech-lead; instrument: `test_session_latency.js`, 03e-phase-2-implementation-specs.md §16). The graph-check budget (was 300ms) is reclaimed by the removal.
- [x] F2.15 — Update `memory_filter.js`: add `instincts.md` to loadable files with highest priority, cap at ~200 tokens

### Self-learning outcome metrics

**Problem:** Episodes → patterns → instincts is well-specified as a pipeline, but there's no mechanism to answer: "did promoting this instinct actually improve agent outcomes?" Without measuring whether instincts help, the system could accumulate noise that costs tokens without adding value.

**Target:** 3 metrics with implementable definitions (redesigned in round-table review — fuzzy "cites the pattern" matching was unmeasurable):

1. **Instinct citation rate:** agents emit an explicit `[INSTINCT: INS-001]` marker when they apply a loaded instinct (a lightweight response marker mirroring the `[DIRECT-IO-JUSTIFIED: …]` convention). `memory_filter.js` logs every load (`{ts, type: "load", agent, instinct_ids, tokens, session_id}`); a Stop-hook scanner logs citations (`{ts, type: "cite", agent, instinct_ids, session_id}`) to `state/instinct-hits.json`. Metric = distinct sessions with a cite ÷ distinct sessions with a load, per instinct, rolling 14-day window. Target: > 50%. Report only when ≥10 standard-mode sessions are in the window (1-turn sessions and Flint sessions pollute the denominator). Directional target, not a gate (01b R39).
2. **Pattern freshness:** pattern headers carry `[last_seen: YYYY-MM-DD]`; `scan-episodes` re-matches new episodes against promoted patterns and maintains `occurrences` + `last_seen`. Stale := last_seen > 90 days AND occurrences < 3 → archive candidate. `self_learn.js scan-patterns --stale` reports them (F2.15.b).
3. **Token cost of instincts:** `instinct-cost --since=7d` reads the load events: `{total_loads, avg_tokens, p95, over_cap_count}` (cap 200 tokens). If over_cap_count > 0, **@retro Step 1** (compaction owner) produces demotion candidates — the actor is assigned, not implied (F2.15.c).

- [x] F2.15.a — Add instinct hit tracking: `memory_filter.js` logs `load` events; Stop-hook scanner (`stop:session-end` family) logs `cite` events to `state/instinct-hits.json` (schema in 03e-phase-2-implementation-specs.md §9)
- [x] F2.15.b — Add stale pattern reporting to `self_learn.js scan-patterns --stale`: flag patterns with last_seen > 90 days AND occurrences < 3
- [x] F2.15.c — Add token cost tracking: `self_learn.js instinct-cost` reports total/avg/p95/over-cap per week; demotion review owner is @retro Step 1

## F2.16-F2.18 — Witness (artifact integrity)

**Source:** Evolution §2.5 | **Theme:** T3

**Problem:** When a Vespyr skill produces an artifact, there's no way to detect if it was silently corrupted between sessions.

**Target:** A lightweight SHA-256 witness system (no Ed25519 — overkill for local-first). Extends the Phase 1 script of the same name (currently a memory-structure validator) rather than creating a new file.

- [x] F2.16 — Extended `.agents/scripts/memory_check.js` (renamed from `witness.js` on 2026-09-30 — the old name meant three unrelated things) (~180 lines) with: `sign`, `verify`, `check`, `list`. Storage: `.agents/state/witness.json` — **gitignored, machine-local** (the memory files it signs are gitignored; a committed registry of gitignored inputs was incoherent). Registry covers memory files AND release/evidence artifacts (`qa-report.md`, `utter-satisfaction.json`) so `validate_satisfaction.js` rule 9 has a fingerprint source (F2.28 linkage). **Implementation behavior:** `03e-phase-2-implementation-specs.md` §8 — reconciliation 2026-11-19: §8's code block still uses the retired `witness.js` path; merge its behavior into the live `memory_check.js`, do not create a second script.
- [x] F2.17 — Updated `memory-controller.md` with the sign-after-write step, and wired `memory_write.js` to auto-sign the canonical path after retention so the registry actually populates; the documented step remains the human-facing contract (first warning informational, second blocking) (positional args — §8 has no `--file=` flag). The witness is a history, not a lock. First `[INTEGRITY-WARNING]` on a file is informational; the second occurrence on the same file is blocking (occurrence counter in the registry, reset on re-sign).
- [x] F2.18 — Updated `retro/steps/step-05-compact.md` §5b: run `memory_check.js check` before compaction. Second occurrence on same file is `[INTEGRITY-BLOCK]`, exit 1; do not compact over a blocked file. Implemented 2026-11-19.

**Stated limitation (02f R47 context):** self-referential trust — anyone with repo write access can re-sign entries. Accepted for local-first; the drift monitor covers `.agents/` baselines.

## F2.19-F2.22 — Delegation enforcement (audit + logging)

**Source:** Evolution §1.8 | **Theme:** T1

**Note:** The policy (`delegation-policy.md`) and the contract blocks on 13 reasoning agents ship in Phase 0 T7.1. Phase 2 ships the audit script and invocation logging. `delegation_audit.js` already exists on disk from Phase 1 — F2.21 EXTENDS it, it does not create it.

**Full delegation-policy.md content (if not already created in Phase 0):**

```markdown
# Delegation Policy — When to Use Sub-Agents

**Rule:** Reasoning agents do I/O via harness-native subagents where the harness supports them, and direct calls where it does not. The `@reader`/`@writer`/`@executor` trio personas were **deleted 2026-08-10** and MUST NOT be referenced as dispatch targets. `@memory-controller` remains the mandatory memory path. (Canonical: `.agents/references/delegation-policy.md`.)

## Task → dispatch mapping

| Task type | Dispatch | Why |
|---|---|---|
| Read 1-3 small files (< 500 lines total) | direct | overhead exceeds benefit |
| Read 1+ large file OR 4+ files | harness subagent / direct | keeps main context lean |
| Search codebase (grep/glob) | harness subagent / direct | fast regex, condensed output |
| Write a single file < 50 lines | direct | overhead exceeds benefit |
| Write 1+ file OR > 50 lines | harness subagent / direct | atomic write, consistent format |
| Refactor across N files | harness subagent (batch) / direct | one transaction, N outputs |
| Run any bash command | harness execution / direct | parses output, returns summary |
| Read/write memory files | `@memory-controller` | validates schema, enforces format |
| Read/write skill/agent files | direct (human-gated proposal) | versioned, reviewable diff |

## Override protocol

If you must do I/O directly (outside the table above), emit one line:
[DIRECT-IO-JUSTIFIED: {task} because {reason}]

## Anti-patterns
- Reading 5 files then summarizing inline — batch the reads via a harness subagent to keep main context lean
- Running npm test and pasting full output — summarize and return the verdict + failures only
- Writing 3 related files in 3 separate edit calls — batch into one call sequence
- Direct memory writes without @memory-controller — bypasses schema validation
```

- [x] F2.19 — `.agents/references/delegation-policy.md` already exists (created in Phase 0, verified 2026-11-19); the conditional "create if missing" is satisfied.
- [x] F2.20 — All 19 reasoning personas now declare `## Delegation Contract` (the plan's "13 / done in Phase 0" premise was false — none had it). Inserted before `## Socratic Stance` in every agent except the `memory-controller` I/O sub-agent; verified by `tests/test_delegation_audit.test.js`.
- [x] F2.21 — Extended `.agents/scripts/delegation_audit.js` (~140 lines): reads `state/delegation-log.ndjson` (append-only, NOT a re-written JSON file — the old spec rewrote the whole log on every I/O-subagent invocation, O(n) on the hottest path), computes per-agent delegated/direct counts + rate, **flags agents below the threshold** (`--fail-below 50` default; dogfood M4 uses `--fail-below 70 --since 14d`), `--since <Nd>` window, `--json` output. Agent list derived from `.agents/agents/*.md`, never hardcoded. **Implementation code:** See `03e-phase-2-implementation-specs.md` §10 — reconciliation 2026-11-19: the live audit + `delegation-policy.md` + spec §10 currently read `delegation-log.json` via `JSON.parse`, and §10 hardcodes 13 names (including the non-existent `ml-engineer`). Migrating to append-only `.ndjson` and the directory-derived roster is part of THIS task; until it lands, hooks that write `.ndjson` are invisible to the audit.
- [x] F2.22 — Invocation logging is now produced by `pre:bash:delegation` / `pre:edit:delegation`, appending `{ts, agent, tool, args, justification, delegated:false}` to `.agents/state/delegation-log.ndjson`; `delegation_audit.js` reads that format. **Reworked (2026-09-24): the `@reader`/`@writer`/`@executor` persona files were deleted, so there is no trio persona to self-log `delegated: true`.** The delegation metric now derives from harness-side signals + the direct-I/O hook events:
  - Delegation hooks (F2.1 `pre:bash:delegation` / `pre:edit:delegation`): append `{ts, agent, tool, args, justification, delegated: false}` for every blocked OR justified direct-I/O event to `state/delegation-log.ndjson`. This is the primary signal.
  - Where the harness exposes subagent-spawn events, log `{ts, agent, mechanism, task, delegated: true}` from the harness adapter (03c M1/M2/M3), not from a persona file. On harnesses with no subagent telemetry, the metric is direct-I/O-rate only (documented limitation), not a fabricated delegation count.
  - Log rotation: rotate at ~10MB (tail-read by the audit).

## F2.23-F2.27 — QA as hard gate

**Source:** Evolution §1.10 | **Theme:** T1

**Problem:** `develop/SKILL.md` Step 7 makes QA skippable in practice — the wording says "can run in parallel" and "if applicable," which the LLM reads as "optional." No QA artifact is required to transition out of development. `@qa-engineer` is the most under-invoked specialist agent.

**Target:** Make QA a hard gate with three enforcement layers: skill wording, a single fail-closed gate script, and a pre-handoff checklist.

**Two-gate contract (round-table redesign):** **Gate 1 (dev-advance, F2.23/F2.26)** = `qa_check.js`: sign-off exists, recommendation parsed (not regex'd) as GO/NO-GO/CONDITIONAL, sign-off verdict equals report verdict, signature verified, fresh, conditions parsed, mode is M1/M2/M3. **Gate 2 (release, F2.28)** = `validate_satisfaction.js`: full team matrix, evidence refs verified against the witness registry, no open conditions (CONDITIONAL is not shippable per `08-cross-cutting-utter-satisfaction-dna.md` §4). A CONDITIONAL sign-off advances development; it never ships.

**Full Step 7 rewrite (sequential, blocking):**

```markdown
### Step 7: Quality Gates (sequential, blocking)

**This step is mandatory. The skill CANNOT complete without it.**

Steps 7a → 7b → 7c → 7d run sequentially (not in parallel). 7a (QA) is a hard gate — 7b, 7c only run after 7a passes.

#### Step 7a: QA — HARD GATE
**You MUST invoke @qa-engineer here. Do not skip. Do not claim completion without an actual QA report file.**

Invoke @qa-engineer to:
1. Read the user story acceptance criteria from artifacts/output/03-strategy/user-stories.md
2. Write and run comprehensive tests (unit, integration, e2e as appropriate)
3. Produce artifacts/output/05-execution/quality/qa-report.md with:
   - **Date:** {YYYY-MM-DD}                      ← must be today
   - Test run summary (N passed, M failed)
   - Per-AC pass/fail (AC-H, AC-U, AC-E)
   - Coverage percentage
   - Open defects (if any)
   - **Release recommendation:** {GO | NO-GO | CONDITIONAL}
4. Halt condition: if NO-GO, the developer must fix and re-run. Max 2 QA-dev cycles, then escalate to @tech-lead.

#### Step 7b: Security Audit (if applicable)
Run ONLY after 7a is GO or CONDITIONAL.

#### Step 7c: Performance Review (if applicable)
Run ONLY after 7b passes (or is N/A).

#### Step 7d: QA Sign-off Artifact (gate token)
After 7a (and optionally 7b/7c), write artifacts/output/05-execution/quality/qa-signoff.md:
# QA Sign-off — {feature name}
**Date:** {YYYY-MM-DD}                      ← must be today
**QA Engineer:** @qa-engineer
**Release recommendation:** {GO | NO-GO | CONDITIONAL}   ← must equal qa-report.md's line
**Conditions:** {None | - item 1; - item 2}  ← CONDITIONAL requires a list; empty = None
**Mode:** {M1 | M2 | M3}                    ← solo-mode sign-offs are INVALID (03b F3b.27)
**Linked artifacts:** qa-report.md, {findings-report.md if security ran}, {perf-report.md if perf ran}
**Signature:** {sha256 of qa-report.md content + '\n' + mtimeMs}
The orchestrator calls qa_check.js — a single fail-closed validator — as the gate token to advance from development. It parses the recommendation, recomputes the signature, and verifies freshness; a file-existence check alone is NOT the gate.
```

> **Reconciliation note (2026-11-19):** the shipped sign-off contract is `.agents/skills/develop/templates/qa-signoff.md`. It uses YAML frontmatter `date:` / `verdict:` plus a bracketed `VERDICT: [GO]` line — not the `**Date:**` / `**Release recommendation:**` prose in the block above. The canonical format is the shipped template, extended by this slice with `Mode:` and `Signature:`. `qa_check.js` accepts bracketed verdicts and rejects an unbracketed prose verdict. The two paths above were corrected to `05-execution/quality/` to match the template, `develop_completion_check.js`, and `step-07-quality-gates.md`.

#### Step 7e: UTTERLY SATISFIED Team Gate

After the domain gates, collect the active-agent matrix defined in
`08-cross-cutting-utter-satisfaction-dna.md`. The gate requires evidence-backed
`SATISFIED` states, explicit `NOT ACTIVATED` reasons for out-of-scope domains,
and no unresolved `CHANGES REQUESTED` or `BLOCKED` state. A material change
after sign-off invalidates affected rows.

- [x] F2.23 — Gate 1 in `qa_check.js` (single enforcement point — `orchestrator_state.js next` imports it rather than duplicating regex logic): before allowing `next` out of `development`, call `checkQA()`. Block with reasons on: missing files, unparseable/mismatched recommendation, signature mismatch, stale date, solo mode, or NO-GO. Accepts GO or CONDITIONAL for dev-advance; CONDITIONAL is not shippable (cross-ref 14 §4 + F2.28). **Implementation code + fixture tests T-GATE-1..9:** See `03e-phase-2-implementation-specs.md` §11/§16
- [x] F2.24 — Step 7 is already sequential and blocking in the shipped `develop/SKILL.md` and `steps/step-07-quality-gates.md` ("QA is a hard gate — cannot be skipped", bracketed sign-off verdict, `--require-signoff` in Done-when). Reconciliation 2026-11-19: no rewrite needed; this slice only adds the `Mode:`/`Signature:` fields and the `qa_check.js` gate-token reference (F2.26/F2.27).
- [x] F2.25 — Added `## Mandatory Invocation Contract` to `.agents/agents/qa-engineer.md`: read ACs, write+run tests, produce `qa-report.md` + `qa-signoff.md` with bracketed verdict, Conditions and Mode fields; emit `[NO-GO]` with reason if tests cannot run — never silently pass.
- [x] F2.26 — Created `.agents/scripts/qa_check.js` (module + CLI, ~210 lines). Reuses `develop_completion_check.js` parsers; adds signature, verdict cross-check, date, Mode, and placeholder checks. `signature` subcommand prints the value to paste. Implemented 2026-11-19.
- [x] F2.27 — Gate token wired into `develop/SKILL.md` step 7, `steps/step-07-quality-gates.md` §7f, `qa-engineer.md` (Mandatory Invocation Contract), and both `orchestrator_state.js next` and `advance` via one shared `evaluateTransitionGates()` helper. The sign-off template now carries `Mode:` and `Signature:`.
- [x] F2.28 — Created `.agents/scripts/validate_satisfaction.js` (module + CLI) implementing §15 rules 1–9 with witness fingerprint verification, and wired strict validation into release-affecting transitions in `orchestrator_state.js` — evidence refs must exist AND match their witness signature; open conditions fail the release gate. **Implementation spec:** `03e-phase-2-implementation-specs.md` §15
- [x] F2.29 — Created `tests/test_qa_gate.mjs` (T-GATE-1..9), `tests/test_satisfaction.mjs` (T-SAT-1..5), and `tests/test_qa_gate_cli.test.js` (CLI + orchestrator integration). `tests/run-all.js` now discovers `test_*.mjs`; all 25 new tests pass. Hook fixtures T-HOOK-1..5 belong to `tests/test_hooks.test.mjs` (F2.4), not this file. **Spec:** `03e-phase-2-implementation-specs.md` §16
- [x] F2.30 — **RESOLVED 2026-11-19 (no code change required).** The shipped `.agents/scripts/worktree.js` already uses `execFileSync('git', args, …)` with argument arrays at every call site (lines 28, 104, 136, 162) — no shell-string interpolation, no `shell: true`. The premise was stale. §12 is labeled "Phase 0, T7.1b", not Phase 2. A regression fixture asserting arg-array-only execution remains an optional follow-up; it is no longer a Phase 2 blocker.

---

## Done when

- [x] 13 hooks registered, env-var-disablable, documented (T-HOOK-1..3 fixture tests pass: disable list, minimal profile = exactly 4, strict = 13) — `tests/test_hooks.test.mjs`, 11/11 pass
- [x] `/self-learning` runs end-to-end on a real project: `self_learn.js scan` produces a digest at `state/self-learning-digest.md` (named artifact — existence asserted) — verified 2026-11-20 alongside `SKILL-SELF-LEARNING` in `evals/suites/skills/operations.json` and the held-out cross-domain outcome benchmark in `tests/test_self_learning.test.js` (14/14 pass)
- [x] `node .agents/scripts/memory_check.js check` exits 0 on a clean project; a second modification of the same file exits 1 (occurrence tracking) — verified by `tests/test_memory_witness.test.js` (8 tests: sign, clean check, first warning, second block, re-sign reset, unsigned verify, auto-sign on canonical write, corrupt registry)
- [x] `node .agents/scripts/delegation_audit.js --since 7d --fail-below 50` reports ≥ 5 fixture-seeded log events (direct-I/O overrides and, only where the harness exposes subagent-spawn telemetry, `delegated: true` events) AND flags agents below threshold. Reconciliation 2026-11-19: on harnesses without subagent telemetry the audit reports direct-I/O-rate only (F2.22); no delegation count is fabricated.
- [x] `orchestrator_state.js next` refuses to advance out of `development` without a valid `qa-signoff.md` (T-GATE-3) — verified by the CLI integration test in `tests/test_qa_gate_cli.test.js` (action `qa-gate-blocked`)
- [x] `VESPYR_DISABLED_HOOKS=pre:bash:tmux` actually disables that hook (active-set assertion: 12 remain, tmux absent)
- [x] `VESPYR_HOOK_PROFILE=minimal` strips the format/quality hooks (exactly 4 remain)
- [x] **Delegation enforcement:** `pre:bash:delegation` and `pre:edit:delegation` hooks block direct I/O from reasoning agents unless `[DIRECT-IO-JUSTIFIED: ...]` is present, AND log both blocked and justified events to `delegation-log.ndjson` (T-HOOK-4/5 — verified by spawn tests)
- [x] **Self-learning metrics:** `instinct-cost`, `scan-patterns --stale`, `citation-rate`, and `suggest` implemented, wired into `/retro` Step 1 and `/self-learning` Step 0, and verified by `tests/test_self_learning.test.js` + `SKILL-SELF-LEARNING` eval benchmark (2026-11-20)
- [x] **T8 runtime gate:** an incomplete, blocked, or evidence-free satisfaction record prevents release advancement and reports every failing row (T-SAT-1..5)
- [x] **QA gate suite:** `tests/test_qa_gate.mjs` T-GATE-1..9 all pass — including forged-signature, stale-date, verdict-tamper, solo-mode, and missing-Mode cases (verified 2026-11-19; 25/25 gate tests green)
- [x] **Session-start budget:** `test_session_latency.js` exits 0 on fixture (Step 0.0 optimized to ~91ms < 100ms budget via direct `.git/HEAD` resolution; Step 0.1 < 250ms; Step 0.2 < 10ms; total < 1000ms; Step 0.3 `telemetry_surface.js` emits `[SKIPPED]` until Phase 3 F3.8)

## Risks

- **Hooks break in different harnesses.** Per-harness adapter in `bin/cli.js`; OpenCode has no `hooks` config key — its adapter is a generated plugin (F2.3 + verification tasks V1-V4). CI runs against all 3. Safety hooks `exit 0` by default; `exit 2` only for explicit safety events. Hook crashes fail closed (exit 2), never silently pass.
- **`memory_check.js` false positives.** Re-sign on every `@memory-controller write`. Witness is a history, not a lock. First warning is informational; second occurrence on the same file is blocking.
- **Self-learning promotes false patterns.** 3+ occurrences, 2+ agents, 7+ day span — all required. Every promotion is human-in-the-loop; instinct promotion requires interactive confirmation.
- **Delegation audit reveals low rate.** This is the audit's job; don't game the metric.
- **Delegation hooks block legitimate direct I/O.** The `[DIRECT-IO-JUSTIFIED: ...]` protocol is the escape hatch. If the hook blocks too aggressively, users can disable it via `VESPYR_DISABLED_HOOKS=pre:bash:delegation,pre:edit:delegation`. Justifications are logged, and the audit flags implausible justification rates (the string check is a convenience, not a security boundary — see 01b R20a).
- **Satisfaction becomes rubber-stamping.** Require evidence, revalidation fingerprints, and explicit escalation after two feedback cycles. Do not optimize for zero blocking states. The gate verifies signatures and witness fingerprints, not just file existence.
- **QA gate blocks every release (regex-vs-template class).** The gate parses the recommendation value (strips `**`/braces) and fails closed on unparseable values — no regex-on-prose. T-GATE-1..9 cover both the good path and the tamper paths (including the unsubstituted Conditions template and missing Mode).

### Rollback plan

If Phase 2 breaks:
- **Hooks:** `VESPYR_DISABLED_HOOKS=*` disables all hooks. Or delete `.agents/hooks/hooks.json` — hooks are opt-in per harness.
- **Self-learning:** delete `instincts.md` — the system falls back to the 2-tier memory (project-context + patterns). No data is lost; episodes and patterns remain.
- **QA hard gate:** if `qa-signoff.md` blocks a legitimate release, fix the gate or its evidence. A manual `CONDITIONAL` sign-off does not bypass the T8 release gate and is not shippable until conditions are satisfied (two-gate contract, F2.23/F2.28).

## Handoff to Phase 3

- 13 hooks live, with stable IDs and env-var disable.
- 10 MCP tools callable from external harnesses — 5 wrappers + 5 capability tools (see `03b-phase-2-mcp-integration-plan.md`).
- `instincts.md` is the first thing loaded in every session (step 0.1).
- `witness.json` tracks every critical artifact's hash (memory + release evidence).
- The UTTERLY SATISFIED state contract is machine-validated for release-affecting handoffs.
- Delegation is enforced at the harness layer (hooks block direct I/O, log both directions) and auditable (audit script flags < threshold).
- QA is a hard gate verified by a single fail-closed validator with signature + freshness checks.

---

## Completion Checklist

**Phase 2 Enablement status: COMPLETE (updated 2026-11-20 after roundtables `phase2-self-learning_native_1.md` and `phase2-remaining-clusters_native_1.md`) — all Phase 2 deliverables (F2.1–F2.5, F2.11–F2.30), security/gate hardening, skill catalog & 03e spec sync, and held-out self-learning outcome benchmark verified across the full test suite.**

- [x] 13 lifecycle hooks registered and configurable per harness — F2.1–F2.5 landed 2026-11-19; V1–V4 verified and recorded
- [x] Self-learning engine (`self_learn.js`) and instinct promotion pipeline — F2.11–F2.15c + mid-session `suggest` boost workflow, `03e §9` sync, `SKILL-SELF-LEARNING` eval, and held-out cross-domain outcome benchmark verified 2026-11-20 (14/14 tests pass)
- [x] Memory witness verification (`memory_check.js`) for tamper-evident artifacts — F2.16–F2.18 landed 2026-11-19; Gate 2 fingerprint path is no longer degraded when a registry exists
- [x] Delegation enforcement hooks (`pre:bash:delegation`, `pre:edit:delegation`) — F2.22 invocation logging now writes the NDJSON the F2.21 audit reads
- [x] QA hard release gate (`qa_check.js` & `validate_satisfaction.js`) — F2.23/F2.26/F2.27/F2.28/F2.29 landed; 25 new tests green
- [x] Session-start latency budget enforcement (<1000ms) — Step 0.0 optimized under 100ms budget (~91ms adjusted); `tests/test_session_latency.js` passes (Step 0.3 `[SKIPPED]` until Phase 3 F3.8)

---

## Sign-Off

**@architect (Vera):** PENDING — Gated on Phase 1 completion (02h, 02i, 02j).  
**@tech-lead (Grant):** PENDING — Execution scheduled for v2.1.  
**@qa-engineer (Nina):** PENDING — Test suite fixtures specified in 03d.
