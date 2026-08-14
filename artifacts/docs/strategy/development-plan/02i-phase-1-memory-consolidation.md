# Memory Consolidation & Lifecycle Architecture Epic (02i)

**Decision:** Streamline the Vespyr persistent memory layer into an authoritative, auto-synchronized coordination layer. Deprecate dead folders (`pending-questions/`, `session-checkpoints/`, role-siloed `agent-notes/`), make `project-context.md` the authoritative auto-synced front gate for all swarms, and enforce memory compaction and validation at every phase handoff.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 10th in the `02*` series, positioned after `02h-phase-1-graph-shutup-and-cli.md` and immediately prior to `02j-phase-1-evals-and-agnostic-harness.md`. Must be implemented and verified before Phase 2 enablement.

**Gate Reviews:** Round table 2026-08-14 (@founder, @architect, @tech-lead, @product-manager, @developer), unanimous consensus recorded in `artifacts/memory/active-decisions.md`.

---

## 1. Mandate & Strategic Scope

### 1.1 Mandate (from Chris)
"Project context is the gate for agent to understand the context, the information should be enough for agent to understand the context... consolidate the fragmented memory files, eliminate role-siloed agent-notes and ghost folders, and make project-context.md + active-decisions.md the authoritative core."

### 1.2 The 5 Core Problems Being Solved

1. **Frozen Front Gate (`project-context.md`)**: `project-context.md` core metadata (stack, git repo, phase, sprint, blockers) was seeded once on project initialization and stayed frozen, leaving agents with obsolete context.
2. **The "Write-Only Graveyard"**: Agents wrote extensively to `agent-notes/*.md`, but subsequent agents rarely or never read them because standard IDE harnesses lack automated pre-prompt injection hooks.
3. **Role Siloing in Notes**: Separating `developer-notes.md` from `architect-notes.md` blocked cross-disciplinary context sharing.
4. **Duplicate / Ephemeral Checkpoints**: Having both `session-checkpoints/checkpoint.md` and `session-summaries/latest.md` created ambiguity over which was authoritative. Active discussions were lost if sessions closed before a final exit write.
5. **Compaction Delay**: Memory compaction only ran at retro (every 5 cycles), allowing `active-decisions.md` to accumulate contradictory and obsolete rules across intermediate phases.

---

## 2. Target Architecture

```
artifacts/memory/
├── project-context.md          # Tier 1 Living Front Gate: Identity, Auto-detected Stack, Git Repo, Active Phase, Sprint, Dev Plan
├── active-decisions.md         # Active Architectural & Design Constraints (Pruned at every phase handoff)
├── patterns-and-conventions.md # Unified Code & Architecture Patterns (Consolidates all role notes)
├── lessons-learned.md          # High-value gotchas, bugs fixed, and architectural retrospective lessons
├── blockers-and-risks.md       # Live active blockers and mitigations (Auto-cleaned when resolved)
├── session-summaries/
│   └── latest.md               # Single Authoritative Live Cursor & latest milestone summary
└── archive/                    # Compacted historical quarterly logs & superseded decisions
```

### 2.1 Key Architectural Changes

1. **Auto-Syncing `project-context.md` with Isolated Machine State Fences**:
   - `orchestrator_state.js` automatically updates `project-context.md` within a dedicated machine-managed comment block (`<!-- BEGIN MACHINE STATE --> ... <!-- END MACHINE STATE -->`).
   - Prevents split-brain markdown parser clobbering: human/LLM custom sections remain untouched.
   - Dynamic auto-detection: Inspects `package.json`, `Cargo.toml`, `go.mod`, etc. for current stack and runs `git` commands for active branch/repo.
2. **Single Live Cursor (`session-summaries/latest.md`)**:
   - Scrap `session-checkpoints/checkpoint.md`.
   - Milestones and breaks write directly to `session-summaries/latest.md` and `active-decisions.md` during execution.
3. **De-siloing `agent-notes/` into Budgeted `patterns-and-conventions.md`**:
   - Role-specific notes (`developer-notes.md`, `architect-notes.md`, etc.) are merged into `patterns-and-conventions.md`.
   - Enforce strict token budgeting (<500 tokens) with active pattern eviction to avoid context junk-drawer bloat.
4. **Phase-Boundary Compaction Gate & Validation**:
   - Every phase handoff (e.g. Discovery ➔ Strategy ➔ Architecture ➔ Dev) runs an automated memory validation sweep to archive superseded decisions from `active-decisions.md` into `archive/`.
   - Structural diff validation: Ensures no active architectural constraint is archived without explicit resolution status.

---

## 3. Workstreams & Execution Tasks

### WS-1: Script & State Machine Synchronization
- [ ] **Task 1.1**: Update `orchestrator_state.js` to write machine state atomically inside `<!-- BEGIN MACHINE STATE -->` in `project-context.md` on every state change (phase advance, complete, sprint, blocker updates).
- [ ] **Task 1.2**: Implement project metadata auto-detector in `orchestrator_state.js` (detect stack from manifest files, branch from git).
- [ ] **Task 1.3**: Add phase-handoff compaction trigger in `orchestrator_state.js advance` (running structural deduping and archiving superseded entries).
- [ ] **Task 1.4**: Update `memory_filter.js` to reflect the consolidated memory layout (Tiers 1–3) without relying on deleted `agent-notes/` folders.

### WS-2: Directory & Artifact Cleanup & Idempotent Migration
- [ ] **Task 2.1**: Author idempotent migration utility to merge active entries from `artifacts/memory/agent-notes/*.md` into `patterns-and-conventions.md` with header collision resolution and rollback protection.
- [ ] **Task 2.2**: Delete `artifacts/memory/pending-questions/`, `artifacts/memory/session-checkpoints/`, and legacy `agent-notes/`.
- [ ] **Task 2.3**: Update `bin/cli.js` `scaffoldArtifacts()` to scaffold the consolidated memory layout for newly initialized projects.

### WS-3: Skill & Agent Reference Updates & Test Harness
- [ ] **Task 3.1**: Scrub agent prompt files (`.agents/agents/*.md`) removing references to `agent-notes/` and `session-checkpoints`.
- [ ] **Task 3.2**: Update `.agents/skills/` step files to reference the streamlined memory paths and auto-syncing `project-context.md`.
- [ ] **Task 3.3**: Update `AGENTS.md`, `workflow.md`, and `skills.md` to document the consolidated 3-tier memory protocol.
- [ ] **Task 3.4**: Author memory migration test fixtures asserting zero data loss across legacy memory snapshots and concurrent state-write stress tests.

---

## 4. Definition of Done (DoD) & Verification

1. Running `node .agents/scripts/orchestrator_state.js advance` automatically and atomically updates machine state inside `artifacts/memory/project-context.md` without corrupting human-edited sections.
2. Idempotent memory migration runs cleanly with zero data loss or header collisions, validated by deterministic test fixtures.
3. No agent prompt or skill step references non-existent `agent-notes/` or `session-checkpoints/`.
4. `artifacts/memory/active-decisions.md` contains only live, non-contradictory constraints, with superseded items properly archived in `artifacts/memory/archive/`.
5. Automated test suite passes with zero memory filter, atomic write, or frontmatter validation errors.

---

## 5. Completion Checklist

**02i plan authoring status: COMPLETE.**

**Execution Checklist:**
- [x] Epic 02i authored and positioned as 10th sub-plan in Phase 1 series
- [x] Round-table review completed; machine-fenced state & token budgeting guardrails incorporated
- [ ] Task 1.1 — Update `orchestrator_state.js` for atomic writes inside `<!-- BEGIN MACHINE STATE -->` in `project-context.md`
- [ ] Task 1.2 — Implement stack and git branch auto-detector in `orchestrator_state.js`
- [ ] Task 1.3 — Add phase-handoff compaction trigger in `orchestrator_state.js advance` with structural deduping
- [ ] Task 1.4 — Update `memory_filter.js` for 3-tier consolidated memory layout without deleted directories
- [ ] Task 2.1 — Implement idempotent migration utility for `agent-notes/` merging into `patterns-and-conventions.md` (<500 tokens)
- [ ] Task 2.2 — Purge `pending-questions/`, `session-checkpoints/`, and legacy `agent-notes/` directories
- [ ] Task 2.3 — Update `bin/cli.js` `scaffoldArtifacts()` for consolidated memory layout
- [ ] Task 3.1 — Scrub all `.agents/agents/*.md` personas of dead memory folder references
- [ ] Task 3.2 — Update all `.agents/skills/` step files to reference streamlined memory paths
- [ ] Task 3.3 — Update `AGENTS.md`, `workflow.md`, and `skills.md` documentation
- [ ] Task 3.4 — Execute deterministic migration test fixtures & concurrent write stress tests

---

## 6. Sign-Off

**@founder (Elena):** APPROVED — SATISFIED (2026-08-14). Scope: authoritative project-context.md front gate with zero memory fragmentation.  
**@architect (Vera):** APPROVED — SATISFIED (2026-08-14). Scope: fenced machine block in project-context.md preventing split-brain corruption; <500 token budget on patterns-and-conventions.md.  
**@tech-lead (Grant):** APPROVED — SATISFIED (2026-08-14). Scope: atomic write locks and structured state injection rather than brittle raw markdown regex rewrites.  
**@qa-engineer (Nina):** APPROVED — SATISFIED (2026-08-14). Scope: idempotent migration fixtures with rollback protection and structural compaction diff checks.  
**@memory-controller (Mnemos):** APPROVED — SATISFIED (2026-08-14). Scope: streamlined 3-tier memory protocol without ghost directories.
