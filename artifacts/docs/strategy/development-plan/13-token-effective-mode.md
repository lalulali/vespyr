# Phase N — Token-Effective Mode (Quick Discussion Without the Full Stack)

**Status:** Planned  
**Date:** 2026-07-16  
**Inspired by:** [ponytail](https://github.com/DietrichGebert/ponytail) — "write only what the task needs"  
**Addresses:** Token waste when users want a quick discussion, not a full multi-agent pipeline run

---

## Problem

Vespyr's full stack is expensive. Every session loads:

| Layer | Approx tokens | When loaded |
|---|---|---|
| AGENTS.md (210 lines) | ~2,500 | Every session |
| GUARDRAILS.md (139 lines) | ~1,500 | Every session |
| Memory Tier 1-3 | ~1,000 | Every session (@memory-controller) |
| Agent persona (7-22KB each) | ~2,000-5,000 | Per agent invocation |
| Skill SKILL.md + step files | ~400-2,000 | Per skill invocation |
| Delegation overhead | ~200/hop | Per @reader/@writer/@executor call |
| **Total minimum** | **~7,000-12,000+** | Before the user's question is processed |

For a user who just wants to ask "should I use Postgres or SQLite?" or "what do you think of this API design?", loading 21-agent rosters, 7 guardrail sections, 3 memory tiers, and a 6-step skill is pure waste. And the full stack persists in context across every turn — a 10-message discussion carries ~100,000+ tokens of ceremony.

Ponytail's insight, applied to Vespyr: **load only what the interaction needs.** Ponytail asks "does this code need to exist?" Vespyr should ask "does this interaction need the full stack?"

---

## Solution: Quick Mode

A lightweight mode that strips Vespyr to its essentials: a single generalist persona, minimal safety rules, direct I/O, no delegation, no memory tiers, no skills, no step tracking. The user gets a fast, cheap conversation. When they need the full machinery, they switch back.

### The Response Ladder (ponytail-inspired)

Before loading Vespyr machinery, stop at the first rung that holds:

```
1. Just answer?         → yes: respond directly from current context (0 load)
2. Need to read code?   → yes: direct file read, no @reader delegation
3. Need memory?         → yes: load Tier 1 only (project-context.md, ~200 tokens)
4. Need a skill?        → yes: switch to standard mode, load full stack
5. Only then:           → full Vespyr (all tiers, delegation, Socratic, citations)
```

Lazy about the ceremony, never about safety and honesty.

---

### Core Design

| Concern | Decision | Rationale |
|---|---|---|
| Toggle | **`mode: standard \| quick`** in `.agents/config.yaml` + `/quick` slash command | Config for default, slash for mid-session switch (matches ponytail's `/ponytail lite\|full\|off`) |
| Persona | **Single generalist** (`.agents/agents/quick.md`, ~50 lines) | No 21-persona roster. One agent that can discuss anything, directly. |
| Ruleset | **Minimal safety + honesty** (`.agents/rules/quick-mode.md`, ~30 lines) | Bash safety, deletion approval, scope restriction, no-halluculation. Skip Socratic, citations, context budget, change request protocol, session continuity, etc. |
| Memory | **Tier 1 only, on demand** | Load `project-context.md` only if the question references project context. Skip Tier 2-3. |
| Delegation | **Direct I/O** | No @reader/@writer/@executor hops. The agent reads and writes directly. Saves ~200 tokens/hop. |
| Skills | **None** | Quick mode is conversation-only. If a skill is needed, switch to standard mode. |
| Step tracking | **Off** (forced) | No step_tracker.js calls. |
| Artifacts | **Discussion only** | No file writes unless user explicitly asks. No orchestrator_state.js updates. |
| Socratic stance | **Skipped** | No challenge depth. Direct answers. |
| Citation protocol | **Skipped** | No inline citations required. (Honesty still enforced.) |
| Response style | **Concise by default** | Match ponytail's "he says nothing, writes one line, it works." |

---

### Mode Toggles

```yaml
# .agents/config.yaml
mode: standard    # standard | quick
```

```bash
# Mid-session switch
/quick            # → quick mode (strip to essentials)
/standard         # → standard mode (full Vespyr stack)
```

| Mode | Session-start cost | Delegation | Memory | Skills | Socratic | Citations |
|---|---|---|---|---|---|---|
| `standard` (default) | ~7,000-12,000+ tokens | full @reader/@writer/@executor | Tier 1-3 | all skills | yes | yes |
| `quick` | ~800 tokens | direct I/O | Tier 1 on demand | none | no | no |

---

## What Quick Mode Preserves (Non-Negotiable)

| Guardrail | Preserved? | Why |
|---|---|---|
| Bash safety (no drive-level destructive commands) | yes | Physical safety |
| Deletion approval | yes | Data safety |
| Scope restriction (project dir only) | yes | Security boundary |
| Honesty (no hallucination) | yes | Trust foundation |
| Concise chat responses | yes | Token effectiveness |
| Socratic stance | no | Discussion, not stress-testing |
| Citation protocol | no | Quick answers, not research |
| Context budget | no | Minimal context by default |
| Change request protocol | no | No artifacts to change |
| Session continuity | no | No session to persist |
| Step tracking | no | No steps to track |
| Delegation | no | Direct I/O |
| Feedback loop limits | no | Single agent, no loops |

---

## Token Impact

| Scenario | Standard mode | Quick mode | Savings |
|---|---|---|---|
| 10-message discussion | ~100,000 tokens (full stack persists × 10 turns) | ~3,000 tokens (minimal ruleset × 10 + user content) | **~97%** |
| Single quick question | ~10,000 tokens | ~1,000 tokens | **~90%** |
| 30-min design discussion (20 messages) | ~200,000 tokens | ~6,000 tokens | **~97%** |

The savings compound because the full stack persists in context across every turn. Quick mode's minimal ruleset stays constant at ~800 tokens regardless of conversation length.

---

## Files to Deliver

### New Files

| File | Purpose | Lines (est) |
|---|---|---|
| `.agents/agents/quick.md` | Generalist persona — no Socratic, no citations, no delegation, direct I/O, concise responses | ~50 |
| `.agents/rules/quick-mode.md` | Minimal ruleset — safety (bash, deletion, scope), honesty, conciseness, response ladder | ~30 |
| `.agents/skills/quick/SKILL.md` | `/quick` slash command — switches agent to quick persona + ruleset mid-session | ~20 |

### Modified Files

| File | Change |
|---|---|
| `.agents/config.yaml` | Add `mode: standard` default |
| `AGENTS.md` | Add "Quick Mode" section (~10 lines) — when to use, how to toggle, what's stripped |
| `.agents/GUARDRAILS.md` | Add note: "In quick mode, only §Bash Safety, §Deletion Approval, §Scope Restriction, and §Honesty apply." |

**No new scripts. No new dependencies.** The mode switch is a behavior change (agent reads different files), not a runtime operation.

---

## Open Questions

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | Should quick mode allow file writes? | A: No (discussion only) · B: Yes if user asks explicitly | **B** — reading is common, but "write this function to X" shouldn't require a mode switch |
| 2 | Should quick mode load any memory? | A: None · B: Tier 1 on demand · C: Tier 1 always | **B** — load project-context.md only when the question references the project |
| 3 | Should quick mode be the default for new users? | A: No (standard default) · B: Yes (quick default) | **A** — standard showcases Vespyr's value; quick is opt-in for repeat users who know what they want |
| 4 | Should `/quick` persist across sessions? | A: No (per-session only) · B: Yes (writes to config.yaml) | **A** — per-session is simpler; if users want it permanent, they edit config manually |
| 5 | Should quick mode have access to specialized agents? | A: Generalist only · B: Can invoke 1 specialist if needed | **A** — if you need a specialist, you need standard mode |
| 6 | Should quick mode write a session summary? | A: No (zero persistence) · B: Minimal session-write on exit | **A** — quick discussions are ephemeral; if it matters, switch to standard |

---

## Implementation Sequence

1. Write `.agents/rules/quick-mode.md` (minimal ruleset — safety + honesty + response ladder)
2. Write `.agents/agents/quick.md` (generalist persona — concise, direct, no ceremony)
3. Write `.agents/skills/quick/SKILL.md` (`/quick` slash command — mode switch instructions)
4. Add `mode: standard` to `.agents/config.yaml`
5. Add "Quick Mode" section to `AGENTS.md`
6. Add quick-mode guardrail note to `.agents/GUARDRAILS.md`
7. Test: verify quick mode loads ~800 tokens, standard mode unchanged

**Effort:** ~2 hours. No new scripts. No changes to existing scripts.

---

## Relationship to Existing Plan

Standalone feature — not part of any phase. Ships independently at any time.

| Plan item | Relationship |
|---|---|
| Phase 0 (T7 identity) | Independent — quick mode strips T7 features (delegation, memory tiers, Socratic) but doesn't conflict; they coexist |
| Phase 2 (hooks) | Independent — quick mode would skip hooks, but hooks still exist for standard mode |
| `12-step-tracker.md` | Independent — quick mode forces step_tracking off, but the tracker still exists for standard mode |
| Session-start latency budget (README §13) | Quick mode has its own budget: <50ms (no memory, no graph, no telemetry) |
