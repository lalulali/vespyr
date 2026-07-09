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

## Architecture Comparison (key dimensions)

| Dimension | Vespyr | ECC | BMAD | Ruflo |
|---|---|---|---|---|
| **Distribution** | `npx vespyr` CLI; 2,563 lines of `bin/cli.js` | Plugin via `install.sh`/`install.ps1` | `_bmad/` installable; module-config TOML | Monorepo pnpm workspace; 27 `@claude-flow/*` packages |
| **Source of truth** | `.agents/agents/*.md` (21), `.agents/skills/*/SKILL.md` (24), `.agents/templates/` (41), `.agents/scripts/*.js` (18) | `agents/`, `skills/`, `commands/`, `rules/`, `hooks/`, `manifests/`, `schemas/` | `_bmad/<module>/` + `.agent/skills/<skill>/SKILL.md` (119) + 4 IDE mirrors | `v3/@claude-flow/*` (27 pkgs) + `ruflo/` wrapper + `plugins/` (33) |
| **Total markdown** | ~7,500 lines skills + ~1,700 lines agents | 1,487 docs files; 262 skills × 189-line median | ~5,361 markdown files | 1,697 markdown files |
| **Executable code** | 18 Node.js scripts (~150 KB) | 190 Node.js + Python scripts; 2,000+ lines Python; 20 files Rust | 2 Python scripts + 6 Node.js WDS scaffold scripts | 1,789 TypeScript files; 198 `.mjs` scripts; Rust crates |
| **Multi-harness** | 8 active + 36 future | 9+ first-class with per-IDE adapters | 4 IDE layers mirrored | Dual Claude Code + Codex mode |
| **Memory layer** | 3-tier progressive: ~200+~300+~500 tokens; keyword+recency; auto-compaction; NDJSON archive | Session persistence to `~/.claude/sessions/`; 4-step `memory-persistence`; continuous-learning | Persistent facts via `file:` prefix; per-agent `progress/[agent].md` | AgentDB + HNSW (claimed ~1.9x–4.7x faster than brute force, recall@10 ~0.99) |
| **Testing surface** | `tests/test_cli.js` (39 KB) — CLI parser/transpiler tests; no tests for memory/orchestrator scripts | 166 test files, ~1,764 tests passing | 1 test file | 1,999 vitest tests in `@claude-flow/cli` |
| **Security posture** | GUARDRAILS.md with upstream-artifact read policy, change-request protocol, decision-authority table | `the-security-guide.md` (456 lines) with named CVEs, Snyk ToxicSkills data, AURA trust-check | TOML customization merge; locked terminology; agent contracts | `.harness/mcp-policy.json` (default-deny); AIDefence; CVE-REMEDIATION.ts; Ed25519 witness |
| **On-disk size** | Modest — 22 dirs, ~1,500 files | Massive — 80 dirs, ~750 surface files + 1,487 docs | Compact top-level but vast under `_bmad/` | Largest — 1.1 GB; 30+ dirs in `v3/`; 33 plugins |

---

## Recommendations (Tiered by Impact/Cost)

### Tier 1 — High impact, low cost (adopt quickly)

1. **From BMAD: Step-file architecture for complex skills.** Break the largest skills into ordered step files loaded sequentially. Prevents LLM context drift.
2. **From BMAD: Tri-modal workflows (create/edit/validate).** Adding edit/validate modes gives the user iteration power.
3. **From ECC: Code-reviewer false-positive guard list.** A 10+ item "Common False Positives - Skip These" list. Costs almost nothing; dramatically improves the review experience.
4. **From Ruflo: Honest self-assessment in CLAUDE.md.** Either mark the plan as "v1.2 aspirational" with explicit status, or split into "shipped" vs "planned" sections.
5. **From ECC: Manifest with version-aware install-modules.json.** Allow users to opt out of the game pipeline or specific domain experts.

### Tier 2 — High impact, medium cost (plan carefully)

6. **From BMAD: CSV-driven technique libraries.** Extend `elicitation/methods.csv`, add `brain-methods.csv` (61 techniques), `validation-patterns.csv`.
7. **From ECC: Cross-platform sync scripts.** Replace duplicated `CLAUDE.md`/`agent.md`/`AGENTS.md` with a `sync-entry-points.js` script.
8. **From Ruflo: Verification/witness system.** Hash artifacts with SHA-256. Verify on subsequent invocations. Catches regressions.
9. **From BMAD: Persona-channeled mentor references.** Replace bare "persona" descriptions with explicit "channeled mentor" attributions.

### Tier 3 — Speculative, high cost (research first)

10. **From BMAD: WDS-style locked terminology + agent contracts.** A `references/glossary.md` with "One definition per term" plus an `agent-contracts.md` with "owns / does NOT own" boundaries.
11. **From Ruflo: HNSW vector memory for `artifacts/memory/`.** Only worth it if memory becomes the bottleneck. Vespyr is deliberately file-based.
12. **From ECC: AURA-style trust integration.** A read-only adapter with explicit threat model for any third-party content the agent consumes.

### Tier 4 — Do NOT adopt (would dilute Vespyr)

- **Ruflo's 314-MCP-tool catalog** — Vespyr's strength is curation, not coverage.
- **Ruflo's federation / consensus stack** — Vespyr runs locally; federation is a different problem domain.
- **ECC's domain sprawl** (homelab, prediction-market, supply-chain) — these are the maintainer's own consulting work.
- **BMAD's WDS agency-style opinionation** — Norse mythology, Swedish/English bilingual. Doesn't fit Vespyr's product-team positioning.
- **Ruflo's "v3 is the current version" naming** — confusing; don't repeat.

---

## Patterns NOT Adopted (with reason)

| Source pattern | Why not |
|---|---|
| **Ruflo — vector DB / HNSW / embeddings** | Vespyr is deliberately file-based. `memory_filter.js` keyword scoring is the right primitive. |
| **Ruflo — plugin marketplace (30+ plugins)** | Out of scope; v3.0 backlog. |
| **Ruflo — federation / multi-node trust** | Single-repo, single-machine. |
| **Ruflo — WASM neural runtime (SONA, EWC++, LoRA)** | Out of scope; no model fine-tuning in Vespyr. |
| **BMAD — 10+ harness dotfolder mirrors (literal copies)** | We use symlinks + thin shims. |
| **BMAD — `<workflow>` XML pseudo-DSL** | Adds a parsing layer; plain Markdown is just as expressive for short step files. |
| **BMAD — 3-file TOML with 4-layer merge** | Overkill; 2-file is enough. |
| **BMAD — WDS persona handoff (wrap/start)** | Round-table skill already does multi-agent spawning. Defer to v3.0. |
| **ECC — AIDefence 3-gate PII pipeline** | Out of scope; Vespyr is a dev framework, not a production PII handler. |
| **ECC — 12-locale README translations** | High effort, low value. Backlog for v3.0+. |
| **ECC — 20+ language-specific reviewer agents** | Captured as language subagents of `@developer`/`@code-reviewer`, not 20 top-level personas. |

**Principle:** adopt the *idea*, not the *inventory*. We do not want Vespyr to look like BMAD v6.8 with different file names.

---

## The Single Most Important Takeaway

**Vespyr's permission-denial reasoning/I/O split is unique among the four.** This is the kind of architectural insight that's easy to miss and hard to replicate. Protect it.

The strategic question is not "which framework to copy" but "which unique insights to borrow." The adoption matrix in `README.md` §6 shows exactly where each insight lands in Vespyr's plan.
