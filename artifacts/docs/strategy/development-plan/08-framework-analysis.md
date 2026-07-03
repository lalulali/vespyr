# Framework Analysis — Condensed

> **Source:** Condensed from `1. framework_comparison_vespyr_ecc_bmad_ruflo.md` (412 lines → ~200). Keeps insights only. Full analysis is in the original file (kept for reference).

---

## Executive Summary

Four AI agent frameworks occupy four distinct positions:

| Framework | Core Bet | Primary Output |
|---|---|---|
| **Vespyr** | Force a hard split between reasoning and I/O via permission denial. | Installable CLI + 21 personas + Socratic methodology + 24 skills |
| **ECC** | An AI coding agent should be an operating system: curated catalog, hooks, manifests, multi-harness. | Plugin for 9+ harnesses with 64 agents / 262 skills / 84 commands |
| **BMAD** | LLMs drift. Counter with micro-file step architecture, persona-channeled agents, locked terminology. | Methodology library — 119 skills / 25+ agents, 8 modules |
| **Ruflo** | Wrap Claude Code with consensus, vector memory, federated agents, zero-trust governance. | TypeScript monorepo with 314 MCP tools, AgentDB, SONA, 33 plugins |

**Key takeaway:** Each has a real, defensible insight the others lack. None is a strict superset. The question is which insights to adopt, not which to copy wholesale.

---

## Where Each Framework Excels (top 5 per framework)

### Vespyr
1. **Permission-denial reasoning/I/O split** — the only framework using OS-level permissions, not prompt instructions. **This is the moat. Protect it.**
2. **Socratic methodology** — anti-sycophancy rules, per-agent socratic files, `grill-me` skill, `pending-questions/` for cross-session continuity.
3. **3-tier progressive memory** — keyword+recency scoring, dedup, compaction. More thoughtful than ECC's session persistence, lighter than Ruflo's HNSW.
4. **Quality gates with named decision authorities** — who arbitrates scope disputes, who blocks timelines on security.
5. **Squad presets** — 7 named teams that activate curated agent subsets.

### ECC
1. **Catalog depth with curation** — 262 skills, median 189 lines, real engineering notes.
2. **Multi-harness by design** — 9+ first-class adapters with sync scripts.
3. **Code-reviewer false-positive guard** — the most honest LLM-as-reviewer pattern in the ecosystem.
4. **Selective install (24 modules)** — install just `security` or `framework-language` without the rest.
5. **Security-first** — CVE citations, Snyk ToxicSkills data, AURA threat-model integration.

### BMAD
1. **Step-file / micro-file architecture** — one instruction file per step, sequential loading. Solves context drift.
2. **Persona-channeled mentors** — Marty Cagan, Mijo Balic, Porter+Minto. Consistent, distinctive behavior.
3. **Tri-modal workflows** (create/edit/validate) — real pattern for iterative LLM work.
4. **CSV-driven technique libraries** — 61 brainstorming + 70 elicitation methods.
5. **"Extract, don't ingest"** — source docs go to subagents for relevance filtering, parent context stays lean.

### Ruflo
1. **Verification/witness system** — 3-layer regression protection with Ed25519 signatures; per-OS split for hash drift.
2. **CLAUDE.md (52KB) with calibrated honesty** — explicit "150x-12,500x NOT reproduced — was brute-force fallback."
3. **MetaHarness governance** — default-deny MCP policy, `maxToolCallsPerTurn: 200`. Enforced, not aspirational.
4. **Dual-mode (Claude Code + Codex)** — shared `collaboration` namespace, real architectural idea.
5. **73 ADRs** — impressive design discipline for a project of this velocity.

---

## Vespyr's Weaknesses (the 12 items, condensed to 1 line each)

1. `artifacts/output/` is mostly empty — system used to plan itself, not to build external products.
2. `artifacts/memory/` is nearly empty — sophisticated engine, no fuel.
3. Some skills are thin (grill-me 11 lines, squad 42, delegate 50, plan 65, code-graph 59, memory 44).
4. "21 agents" is partly marketing — 9 Domain Experts feel like org-chart inventory, some overlap.
5. Secondary technical agents are shallower (ml-engineer 139 lines vs founder 259).
6. The npx installer is mostly aspirational — plan is 74KB, CLI is 2,563 lines.
7. CLAUDE.md / agent.md / AGENTS.md are duplicated (~168 lines each, near-identical).
8. Test coverage of the agent system itself is essentially zero.
9. The "Game" pipeline is shallow — skills exist but no @game-designer, @narrative-engineer.
10. Socratic tone can be alienating — no opt-out tone profile.
11. Naming/phase-numbering inconsistencies (Phase -1 vs 00-discovery, Phase 7 vs 06-launch).
12. `humanize` skill (565 lines) is third-party-sourced — will go stale without active maintenance.

---

## Synthesis Matrix — Where Each Framework Has the Only Answer

| Capability | Vespyr | ECC | BMAD | Ruflo |
|---|---|---|---|---|
| Permission-denial reasoning/I/O split | **unique** | — | — | — |
| Step-file / micro-file architecture | — | — | **unique** | — |
| Multi-harness by design (9+) | 8 active | **unique** | 4 IDE layers | dual mode |
| Socratic methodology depth | **unique** | — | via elicitation | — |
| HNSW vector memory | — | — | — | **unique** |
| Verification/witness system | — | tests | — | **unique** |
| Persona-channeled mentors | — | — | **unique** | — |
| Tri-modal workflows (create/edit/validate) | — | — | **unique** | — |
| Default-deny MCP policy | — | — | — | **unique** |
| Selectable squads (named teams) | **unique** | — | — | — |
| 3-tier progressive memory | **unique** | sessions | progress | HNSW |
| Code reviewer false-positive guard | — | **unique** | — | — |

### Where each has the only answer

- **Vespyr:** Permission-denial I/O split; squad presets; 3-tier progressive memory; Socratic depth.
- **ECC:** Multi-harness by design; selective install; code-reviewer false-positive guard; AURA threat model.
- **BMAD:** Step-file architecture; persona-channeled mentors; tri-modal workflows; locked terminology.
- **Ruflo:** HNSW vector memory; witness system; default-deny MCP; mTLS federation; calibrated honesty.

---

## The Single Most Important Takeaway

**Vespyr's permission-denial reasoning/I/O split is unique among the four.** This is the kind of architectural insight that's easy to miss and hard to replicate. Protect it.

The strategic question is not "which framework to copy" but "which unique insights to borrow." The adoption matrix in `README.md` §6 shows exactly where each insight lands in Vespyr's plan.
