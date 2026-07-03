# Harness Integration — Hermes + OpenClaw

> **Status:** Both deferred to v2.1+ (was Pre-Phase 0 in v2.0 — scope creep)
> **Priority:** OpenClaw FIRST (can enforce permissions), Hermes SECOND (degraded mode)

---

## OpenClaw — Better Fit (can enforce Vespyr's #1 differentiator)

**Honest assessment:** OpenClaw is the BETTER integration target because it can enforce the reasoning/I/O split via `sandbox.mode`. This preserves Vespyr's #1 moat (permission-denial). OpenClaw should be prioritized above Hermes.

### What works

- `sandbox.mode: main` — full access (for @developer, @devops-engineer)
- `sandbox.mode: non-main` — restricted toolset per config (all other agents)
- Per-tool `allow`/`deny` — fine-grained control (@code-reviewer read-only, @writer write-only)
- Auto-discovery from `<workspace>/.agents/skills/` (npx vespyr already scaffolds this)
- `goal()` sub-agent spawning maps to Vespyr's delegation pattern
- File-based memory (`read_file`/`write_file`) maps directly to `artifacts/memory/*.md`
- Optional LanceDB plugin for semantic search across sessions

### The no-dotfolder contradiction (MUST RESOLVE)

The master roadmap says OpenClaw has "no dotfolder prefix, root-level deployment." The OpenClaw integration plan says the installer scaffolds `.openclaw/workspace/`. **These contradict.** Resolution requires reading actual OpenClaw docs — the P0.2 deliverable that hasn't been done yet.

### Security review (MANDATORY before shipping)

The Hunt.io finding (17,470 publicly-exposed OpenClaw instances, 2024-era snapshot) must be verified as patched before integration ships.

- [ ] P0.2 — Verify Hunt.io finding is patched upstream (check OpenClaw changelog/security advisories)
- [ ] If unresolved: ship behind feature flag `VESPYR_OPENCLAW=off` by default
- [ ] Update `GUARDRAILS.md` upstream-artifact read policy to flag OpenClaw-sourced content
- [ ] Threat-model review: sandbox escape surface, root-level deployment risk

### Conversion pipeline (supply chain fix)

The original plan used `curl` from GitHub `main` branch with no version pinning or hash verification. This is a supply chain risk.

- [ ] Pin to tagged release: `curl https://raw.githubusercontent.com/lalulali/vespyr/v2.1.0/.agents/agents/founder.md`
- [ ] SHA-256 verification of downloaded files
- [ ] Or: ship agent files inside the OpenClaw skill package (no download needed)

### Implementation (~5-7h total)

- [ ] Convert 21 agent personas → `.agents/skills/agents/<name>/SKILL.md` with OpenClaw YAML frontmatter (sandbox config per role) — ~2-3h
- [ ] Port 6 priority workflow skills (validate-idea, develop, design, review, test, help-me) — ~2-3h
- [ ] Configure file-based memory protocol + test end-to-end — ~1h

### Agent sandbox mapping

| Agent | sandbox.mode | deny | allow |
|---|---|---|---|
| @developer, @devops-engineer | main | (none) | (all) |
| @code-reviewer | non-main | exec, write, cron, browser | read, apply_patch, web_search |
| @reader | non-main | exec, write, cron | read |
| @writer | non-main | exec, cron, browser | read, write |
| @founder, @product-manager, etc. | non-main | exec, write | read, web_search |

---

## Hermes — Degraded Mode (cannot enforce permissions)

**Honest assessment (stated upfront, not buried):** Hermes has no permission system. The reasoning/I/O split — Vespyr's #1 differentiator — CANNOT be enforced. The cost-saving architecture (routing @reader/@writer/@executor to cheap models) also doesn't work (single-model per session, "profile switching" is clunky). Hermes users get personas + Socratic methodology + file-based memory only. **This is a degraded-mode integration.**

### What works

- Persona loading via `skill_view(name='vespyr/agents/founder')`
- Delegation via `delegate_task(goal=..., context=..., toolsets=[...])`
- File-based memory via `read_file`/`write_file` (maps to `artifacts/memory/*.md`)
- Squad system (documented, not enforced)
- Phase pipeline (documented in master SKILL.md)

### What does NOT work

| Vespyr feature | Hermes limitation | Impact |
|---|---|---|
| Permission-denial (reasoning/I/O split) | No permission system; all agents have all tools | #1 differentiator lost. "Mitigation" is self-discipline + todo() checklist — NOT enforcement. |
| Cost routing (@reader/@writer to cheap models) | Single model per session; profile switching is clunky | #2 cost-saving architecture lost. `delegate_task()` scopes context but doesn't change model. |
| @developer constrained context | No subagent isolation; every tool call runs in same session with full context | @developer persona adds value only when review gates are needed; otherwise inline is better. |

### What a Hermes user gets

- 21 persona SKILL.md files loadable via `skill_view()`
- Socratic methodology (works — it's prompt-based, not tool-based)
- File-based progressive memory (works — it's file I/O)
- Phase pipeline (works — it's documented workflow)
- Squad presets (works — it's routing)
- **What they lose:** permission enforcement, cost routing, constrained developer context

### Implementation (~6-9h total)

- [ ] Convert 21 agent personas → `~/.hermes/skills/vespyr/agents/<name>/SKILL.md` — ~3-4h
- [ ] Port 6 priority workflow skills — ~2-3h
- [ ] Implement memory loading protocol as Hermes workflow + session hand-off templates — ~1-2h
- [ ] Add `todo()` enforcement constraints to each agent skill (self-discipline mitigation) — included in agent conversion

### Conversion pipeline (same supply chain fix as OpenClaw)

- [ ] Pin to tagged release, not `main` branch
- [ ] SHA-256 verification

---

## Both harnesses: shared deliverables

- [ ] Per-harness adapter in `bin/install.js` (writes correct hook config per harness) — v2.1 Phase 2 F2.3
- [ ] Smoke-test plan: "does this install work?" check for each harness
- [ ] Document harness-specific limitations in `QUICK-REFERENCE.md` (a "Known Limitations" section per harness)

---

## Why OpenClaw is prioritized above Hermes

| Criterion | OpenClaw | Hermes |
|---|---|---|
| Can enforce permission-denial (the #1 moat) | **Yes** (sandbox.mode) | No |
| Can route I/O to cheap models | **Yes** (per-delegation model selection) | No (single model) |
| Can constrain @developer context | **Yes** (sub-agent isolation) | Partial (delegate_task scopes context) |
| Security posture | Needs review (Hunt.io finding) | No known issues |
| Deployment model | No-dotfolder (needs design work) | Standard dotfolder |
| Community size | Unknown | Loyal niche |

**Decision:** OpenClaw investigation first (v2.1 Phase 2). Hermes investigation second (v2.1+ if time permits). If only one ships in v2.1, it's OpenClaw.
