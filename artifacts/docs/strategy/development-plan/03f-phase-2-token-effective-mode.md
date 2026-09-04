# Phase N — Flint Mode (Token-Effective Communication)

**Status:** Planned  
**Date:** 2026-07-28  
**Inspired by:**
- [ponytail](https://github.com/DietrichGebert/ponytail) — *load only what the task needs* (input/infrastructure savings)
- [caveman](https://github.com/juliusbrussee/caveman) — *why use many token when few do trick* (output compression, ~65% output token reduction)

**Addresses:** Token waste across both sides of the token equation — what Vespyr *loads* (input) and what agents *say* (output).

---

## The Problem: Both Sides of the Token Equation

Vespyr's full stack is expensive in two distinct ways:

### Side A — What Gets Loaded (Input / Infrastructure)

| Layer | Approx tokens | When loaded |
|---|---|---|
| AGENTS.md (210 lines) | ~2,500 | Every session |
| GUARDRAILS.md (139 lines) | ~1,500 | Every session |
| Memory Tier 1-3 | ~1,000 | Every session (@memory-controller) |
| Agent persona (7-22KB each) | ~2,000–5,000 | Per agent invocation |
| Skill SKILL.md + step files | ~400–2,000 | Per skill invocation |
| Delegation overhead | ~200/hop | Per @reader/@writer/@executor call |
| **Total minimum** | **~7,000–12,000+** | Before the user's question is processed |

### Side B — What Gets Said (Output / Communication Style)

Even when loading is minimal, agents produce verbose output by default:

- Preamble: "Sure! I'd be happy to help with that. The issue you're experiencing is most likely caused by..."
- Padding: "Let me explain the rationale behind each decision in detail..."
- Over-explanation: full sentence where a keyword suffices.

Caveman's finding: default verbose replies can be cut ~65% with zero technical accuracy loss. A March 2026 paper (*Brevity Constraints Reverse Performance Hierarchies in Language Models*) found that constraining models to brief answers improved accuracy by ~26 points on some benchmarks. Less word = more correct.

**Ponytail fixes Side A. Caveman fixes Side B. Flint Mode fixes both.**

---

## Solution: Flint Mode

> 🪨 *Flint — primitive, sharp, sparks exactly what's needed. Nothing more.*

A lightweight mode that:
1. **Strips infrastructure** to essentials (ponytail's Response Ladder)
2. **Compresses agent speech** to caveman-style concise output
3. **Applies to any agent, at any time**, during any process

The user can activate Flint Mode mid-session — including mid-development sprint, mid-QA cycle, or mid-design discussion — and it immediately overwrites the agent's communication style and load behavior for the remainder of the session.

---

## The Two Levers

### Lever 1 — Response Ladder (ponytail-inspired, Side A)

Before loading Vespyr machinery, stop at the first rung that holds:

```
1. Just answer?         → yes: respond directly from current context (0 load)
2. Need to read code?   → yes: direct file read, no @reader delegation
3. Need memory?         → yes: load Tier 1 only (project-context.md, ~200 tokens)
4. Need a skill?        → yes: stay in Flint Mode, load skill; keep T8, safety, evidence, and release rules
5. Only then:           → full Vespyr (all tiers, delegation, Socratic, citations)
```

### Lever 2 — Speech Compression (caveman-inspired, Side B)

Three compression levels, switchable anytime:

| Level | Style | Output reduction | Use when |
|---|---|---|---|
| `flint lite` | Cut filler, keep full sentences | ~30% | Long planning sessions, design discussions |
| `flint full` | Terse subject-verb-object, no preamble | ~55% | Active development, QA cycles |
| `flint ultra` | Caveman-core: keyword + action + result | ~70% | High-volume @developer/@qa sprints |

**Examples (same answer, three levels):**

| Scenario | `lite` | `full` | `ultra` |
|---|---|---|---|
| Auth bug | Token expiry check fails because `<` should be `<=`. Fix the middleware guard. | Token expiry: `<` → `<=`. Fix middleware. | Auth bug. `<` → `<=`. Fix. |
| Re-render question | Component re-renders because inline object prop creates new reference each render. Wrap in `useMemo`. | New ref each render. Wrap in `useMemo`. | Inline prop = new ref. `useMemo`. |
| Test failure | The failing test asserts `status === 200` but the endpoint returns `201` on creation. Update the assertion. | Test wrong: expects 200, gets 201. Fix assertion. | Test: 200 ≠ 201. Fix. |

Speech compression preserves: code, commands, file paths, error messages — byte-for-byte exact. Only natural language prose is compressed.

---

## Activating Flint Mode

### Anytime, Per Agent

Flint Mode can be activated **during any running process** — no need to restart. It overwrites the active agent's communication style immediately.

```bash
# Activate Flint Mode (defaults to 'full' compression)
/flint

# Activate with specific compression level
/flint lite       # light compression, full sentences
/flint full       # terse, no preamble (recommended for dev/QA)
/flint ultra      # keyword-only, maximum savings

# Target a specific agent (mid-session)
"@developer activate flint ultra"
"@qa activate flint full"

# Deactivate (return to standard Vespyr style)
/standard
```

### When to Use Ponytail Generalist vs Domain Personas

Flint Mode supports two usage patterns:

| Pattern | Target Persona | When to Use | Token Cost |
|---|---|---|---|
| **Ponytail Generalist Persona** | `.agents/agents/flint.md` (standalone generalist) | • Quick ad-hoc technical Q&A<br>• One-off utility scripts or simple refactoring<br>• Fast code lookups or simple shell commands<br>• Any task where specialized role boundaries don't matter | **Lowest** (~800 input tokens) |
| **Domain Persona + Flint Modifier** | `@developer`, `@qa`, `@architect` + Flint modifier | • Structured implementation sprints<br>• Automated test creation & regression cycles<br>• Codebase audits & architecture execution<br>• Any task requiring strict role expertise (e.g. Rex coding standards, Nina test patterns) | **Low** (~1,500 input tokens) |

---

### Config Default

```yaml
# .agents/config.yaml
mode: standard          # standard | flint
flint_level: full       # lite | full | ultra (used when mode: flint)
```

### Mid-Sprint Workflow Example

```
User: "Starting a big implementation sprint. @developer and @qa activate flint full."

@developer: Flint full. Ready.
@qa: Flint full. Ready.

[... 20-message sprint with compressed output ...]

User: /standard
All agents: Standard mode restored.
```

---

## Suggested Workflow Across Development Lifecycle

To get maximum value from both modes, follow this phased workflow:

```
[Phase 1: Strategy & Design]   -->   [Phase 2: Dev & QA Sprints]   -->   [Phase 3: Wrap-Up & Retro]
    Standard Vespyr Mode                 Flint Mode (/flint full)            Standard Vespyr Mode
(Full stack, Socratic depth)            (Ponytail load + Caveman mouth)     (Memory compaction & ADRs)
```

| Lifecycle Phase | Recommended Mode | Why |
|---|---|---|
| **1. Strategic Discovery & PRD Scoping** | `standard` | High reasoning needs full persona depth, Socratic challenge (`/grill-me`), and memory tiering. |
| **2. Architecture Design & ADRs** | `standard` | Architecture trade-offs require full context and citation protocols. |
| **3. Implementation Sprint** | `/flint full` or `ultra` | **Ponytail** bypasses delegation hops; **Caveman** cuts verbosity. Fast code writing with 95% token savings. |
| **4. Bug Fixing & QA Regression** | `/flint full` | Direct code reads, fast assertions, zero preambles. High ROI during repetitive test cycles. |
| **5. Quick Q&A / Code Lookup** | `/flint lite` or `full` | Avoids loading 10,000+ tokens just to ask a simple syntax or API design question. |
| **6. Sprint Retro & Memory Sync** | `standard` | Switch back to standard mode so `@memory-controller` can record lessons learned into persistent memory. |

---


## Mode Comparison

| Concern | `standard` | `flint lite` | `flint full` | `flint ultra` |
|---|---|---|---|---|
| Session-start load | ~7,000–12,000+ tokens | ~1,500 tokens | ~800 tokens | ~800 tokens |
| Delegation | @reader/@writer/@executor | direct I/O | direct I/O | direct I/O |
| Memory | Tier 1–3 | Tier 1 on demand | Tier 1 on demand | none |
| Skills | all | all (stripped Socratic) | all (stripped Socratic) | none |
| Socratic stance | yes | no | no | no |
| Citations | yes | no | no | no |
| UTTERLY SATISFIED state/evidence | yes | yes | yes | yes |
| Release gate and revalidation | yes | yes | yes | yes |
| Output compression | none | ~30% | ~55% | ~70% |
| Response preamble | yes | no | no | no |
| Step tracking | yes | yes | no | no |
| Artifacts | full | full | discussion only | discussion only |

---

## What Flint Mode Always Preserves (Non-Negotiable)

| Guardrail | Preserved? | Why |
|---|---|---|
| Bash safety (no drive-level destructive commands) | ✅ yes | Physical safety |
| Deletion approval | ✅ yes | Data safety |
| Scope restriction (project dir only) | ✅ yes | Security boundary |
| Honesty (no hallucination) | ✅ yes | Trust foundation |
| Code / command accuracy | ✅ yes | Technical correctness — only prose is compressed |
| Socratic stance | ❌ no | Discussion-mode trade-off |
| Citation protocol | ❌ no | Quick answers, not research |
| Context budget tracking | ❌ no | Minimal context by default |
| Session continuity | ❌ no (ultra) / ✅ yes (lite/full) | Ultra = ephemeral |
| Delegation sub-agents | ❌ no | Direct I/O saves ~200 tokens/hop |
| **UTTERLY SATISFIED culture** | ✅ yes | The DNA cannot be disabled; release records still require evidence and revalidation |

---

## Honest Caveats (from caveman benchmarks)

> *"Honest number warning."* — caveman README

- **Output savings are real but asymmetric.** The compression skill itself adds ~1–1.5k input tokens per turn. On already-terse workloads, net savings can go negative.
- **Best ROI:** long conversations, verbose-by-default agents (@developer, @qa), high message-count sprints.
- **Poor ROI:** single-message queries, @reader/@writer (already terse), skill-heavy invocations where output is mostly code.
- **Ultra is aggressive.** At `ultra`, some context may be lost between agents. Use for isolated tasks, not multi-hop chains.

---

## Token Impact

| Scenario | Standard mode | Flint full | Flint ultra | Best case |
|---|---|---|---|---|
| Single quick question | ~10,000 tokens | ~1,000 tokens | ~700 tokens | **93% savings** |
| 10-message dev discussion | ~100,000 tokens | ~8,000 tokens | ~5,000 tokens | **95% savings** |
| 20-message @developer sprint | ~200,000 tokens | ~15,000 tokens | ~9,000 tokens | **96% savings** |
| 5-message @qa cycle | ~50,000 tokens | ~5,000 tokens | ~3,500 tokens | **93% savings** |

*Savings compound because the full stack persists across every turn. Flint's minimal ruleset stays ~800 tokens regardless of conversation length. Output savings stack on top.*

---

## Files to Deliver

### New Files

| File | Purpose | Lines (est) |
|---|---|---|
| `.agents/agents/flint.md` | Flint persona — no Socratic, no citations, direct I/O, compressed output at the active level | ~60 |
| `.agents/rules/flint-mode.md` | Minimal ruleset — safety (bash, deletion, scope), honesty, speech compression levels, response ladder | ~40 |
| `.agents/skills/flint/SKILL.md` | `/flint [lite\|full\|ultra]` — activates Flint Mode mid-session, overwrites active agent style | ~25 |

### Modified Files

| File | Change |
|---|---|
| `.agents/config.yaml` | Add `mode: standard` and `flint_level: full` defaults |
| `AGENTS.md` | Add "Flint Mode" section (~12 lines) — when to use, how to toggle, what's stripped |
| `.agents/GUARDRAILS.md` | Add: "In Flint Mode, only §Bash Safety, §Deletion Approval, §Scope Restriction, and §Honesty apply." |
| `.agents/rules/flint-mode.md` | Explicitly preserve T8 state vocabulary, evidence, escalation, and release/revalidation gates at every compression level |

**No new scripts. No new dependencies.** The mode switch is a behavior change — agents read different persona/rule files. No runtime operation.

---

## Open Questions

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | Should Flint Mode allow file writes? | A: No (discussion only) · B: Yes if user asks explicitly | **B** — `lite` and `full` allow writes; `ultra` is discussion-only |
| 2 | Should `/flint` persist across sessions? | A: No (per-session only) · B: Yes (writes to config.yaml) | **A** — per-session; users who want it permanent edit config |
| 3 | Should Flint Mode be the default for repeat users? | A: No (standard default) · B: Yes (flint default) | **A** — standard showcases Vespyr's value; flint is opt-in |
| 4 | Should `flint ultra` suppress step tracking? | A: Yes (maximum savings) · B: No (always track) | **A** — ultra is ephemeral; tracking adds tokens with no benefit |
| 5 | Should agents auto-suggest Flint Mode when context is large? | A: No · B: Warn at >50k tokens: "suggest /flint full" | **B** — proactive token awareness improves UX |
| 6 | Which compression level should `/flint` default to? | A: `lite` (safe) · B: `full` (recommended) · C: last used | **B** — `full` is the sweet spot: significant savings, no accuracy loss |

---

## Implementation Sequence

- [ ] Write `.agents/rules/flint-mode.md` (Response Ladder + speech compression rules for each level)
- [ ] Write `.agents/agents/flint.md` (generalist persona — terse, direct, no ceremony, level-aware)
- [ ] Write `.agents/skills/flint/SKILL.md` (`/flint [lite|full|ultra]` — mid-session activation)
- [ ] Add `mode: standard` and `flint_level: full` to `.agents/config.yaml`
- [ ] Add "Flint Mode" section to `AGENTS.md`
- [ ] Add Flint Mode guardrail note to `.agents/GUARDRAILS.md`
- [ ] Test: verify `flint full` loads ~800 tokens, standard mode unchanged
- [ ] Test: verify speech compression applies correctly at each level
- [ ] Test: verify mid-session activation overwrites active agent style
- [ ] Test: verify Flint, including `ultra`, cannot advance an incomplete or blocked T8 release gate

**Effort:** ~3 hours. No new scripts. No changes to existing scripts.

---

## Relationship to Existing Plan

Standalone feature — not part of any phase, but still governed by T8. Ships
independently at any time and can be activated mid-sprint without weakening the
shared satisfaction or release contract.

| Plan item | Relationship |
|---|---|
| Phase 0 (T7 identity) | T8-compatible modifier — Flint may compress context and prose, but cannot strip the shared satisfaction DNA or release gate |
| Phase 2 (hooks) | Flint may reduce non-critical context hooks, but safety and satisfaction/release enforcement remain active |
| `12-step-tracker.md` | Step tracking may be off at `ultra`; satisfaction state tracking and release evidence remain mandatory |
| Session-start latency budget (README §13) | Flint Mode has its own budget: <50ms (no memory, no graph, no telemetry) |
| @developer / @qa agents | Primary beneficiaries — high message-count, high output-volume agents gain the most from `flint full`/`ultra` |

---

## Inspiration Credit

| Source | Contribution |
|---|---|
| [ponytail](https://github.com/DietrichGebert/ponytail) | Response Ladder architecture — "load only what the task needs" |
| [caveman](https://github.com/juliusbrussee/caveman) | Speech compression — "why use many token when few do trick" (~65% output savings, multi-level compression, per-session toggle) |

---

## Completion Checklist

**03f status: PLANNED (v2.1 Scope — Not Started).**

- [ ] Response Ladder architecture (L1–L4 token allocation)
- [ ] Speech compression and concise mode toggles
- [ ] Token budget tracking per agent session
- [ ] Integration with memory tiering and prompt compaction

---

## Sign-Off

**@architect (Vera):** PENDING — Response ladder and context budgeting review.  
**@tech-lead (Grant):** PENDING — Execution scheduled for v2.1.  
**@ml-ai-engineer (Kai):** PENDING — Token economics and prompt compression calibration.
