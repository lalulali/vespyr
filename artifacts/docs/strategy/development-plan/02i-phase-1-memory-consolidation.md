# Memory Consolidation & Lifecycle Architecture Epic (02i)

**Decision:** Streamline the Vespyr persistent memory layer into an authoritative, auto-synchronized coordination layer. Deprecate dead folders (`pending-questions/`, `session-checkpoints/`, role-siloed `agent-notes/`), make `project-context.md` the authoritative auto-synced front gate for all swarms, and enforce memory compaction and validation at every phase handoff.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 10th in the `02*` series, positioned after `02h-phase-1-graph-shutup-and-cli.md` and immediately prior to `02j-phase-1-evals-and-agnostic-harness.md`. Must be implemented and verified before Phase 2 enablement.

**Gate Reviews:** Round table 2026-08-14 (@founder, @architect, @tech-lead, @product-manager, @developer), unanimous consensus recorded in `artifacts/memory/active-decisions.md`.

---

## 1. Mandate & Strategic Rationale

### 1.1 Mandate (from Chris)
"Project context is the gate for agent to understand the context, the information should be enough for agent to understand the context... consolidate the fragmented memory files, eliminate role-siloed agent-notes and ghost folders, and make project-context.md + active-decisions.md the authoritative core."

### 1.2 The 5 Core Problems Being Solved

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        The 5 Persistent Memory Pathologies                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1. Frozen Front Gate (project-context.md)                                             │
│     Seeded once on init and never updated, leaving agents with obsolete stack info.   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  2. The "Write-Only Graveyard" (agent-notes/*.md)                                      │
│     Agents wrote extensive notes, but downstream agents never read them due to no hooks│
├────────────────────────────────────────────────────────────────────────────────────────┤
│  3. Role Siloing in Memory                                                             │
│     Separating developer-notes from architect-notes blocked holistic cross-agent context│
├────────────────────────────────────────────────────────────────────────────────────────┤
│  4. Split-Brain Checkpoints                                                            │
│     Duplicate session-checkpoints/checkpoint.md and session-summaries/latest.md created│
│     ambiguity over which file represented the authoritative active cursor.             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  5. Compaction Delay & Decision Drift                                                  │
│     Compaction only occurred at retro (every 5 cycles), accumulating stale decisions.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Target Memory Layer Architecture & Specifications

### 2.1 Consolidated 3-Tier Memory Hierarchy

```
artifacts/memory/
├── project-context.md          # [Tier 1] Living Front Gate: Auto-synced stack, git, phase, sprint (<300 tok)
├── active-decisions.md         # [Tier 1] Active Architectural & Design Constraints (<400 tok)
├── patterns-and-conventions.md # [Tier 2] Consolidated Code & Arch Patterns (Consolidates agent-notes, <500 tok)
├── lessons-learned.md          # [Tier 2] High-value gotchas, bugs fixed, and retro lessons (<500 tok)
├── blockers-and-risks.md       # [Tier 3] Live active blockers and mitigations (Auto-cleaned when resolved)
├── session-summaries/
│   └── latest.md               # [Tier 3] Single Authoritative Live Cursor & latest milestone summary
└── archive/                    # [Tier 3] Compacted historical quarterly logs & superseded decisions
```

### 2.2 Memory File Contracts & Budgets

| Memory File | Tier | Strict Token Budget | Primary Read Triggers | Primary Write Triggers |
|---|---|---|---|---|
| **`project-context.md`** | Tier 1 | $< 300\text{ tokens}$ | Initialized on every turn / agent bootstrap | `orchestrator_state.js` atomic sync (phase, stack, sprint) |
| **`active-decisions.md`** | Tier 1 | $< 400\text{ tokens}$ | Strategy, Architecture, Plan, Dev, Grill | `@grill-me`, `/design`, `/develop` decision commits |
| **`patterns-and-conventions.md`** | Tier 2 | $< 500\text{ tokens}$ | Feature implementation, refactoring | `@developer`, `@architect` upon establishing code pattern |
| **`lessons-learned.md`** | Tier 2 | $< 500\text{ tokens}$ | Bug fixing, incident triage, retro | `@qa-engineer`, `@devops-engineer`, `/retro` |
| **`blockers-and-risks.md`** | Tier 3 | Dynamic | Swarm blocker triage | Lifecycle blocker logging (`--blocker`, `--resolve-blocker`) |
| **`session-summaries/latest.md`** | Tier 3 | Dynamic | Resuming previous conversation | Session-write / milestone checkpoints |

---

## 3. Machine State Fencing & Atomic Synchronization Protocol

### 3.1 Isolated Machine State Fence Specification
To prevent human-LLM parser collisions and split-brain overwrites, `project-context.md` uses machine comment delimiters:

```markdown
# Project Context

## [IDENTITY]
- Project Name: vespyr
- User Nickname: Chris
- Primary Objective: Autonomous Multi-Agent Engineering Swarm

<!-- BEGIN MACHINE STATE -->
## [RUNTIME STATE]
- Stack: TypeScript, Node.js (v20+), Vitest
- Git Branch: feature/02h-streamlining
- Active Phase: 01-discovery (Phase 1 / vespyr 2.0.0)
- Active Sprint: Sprint 4
- Blocker Status: 0 active blockers
- Engine Version: 2.0.0-alpha.4
<!-- END MACHINE STATE -->

## [CONSTRAINTS & POLICIES]
- No Yes-Men in the Swarm: Push back before you help ship the mess.
- Memory Load Limit: Tier 1 + Tier 2 budget strictly < 1500 tokens.
```

### 3.2 Atomic Synchronization Algorithm (`orchestrator_state.js`)
Whenever `orchestrator_state.js` advances a phase, updates sprint status, or logs blockers, it executes an atomic read-replace-write sequence:
1. **Read Existing Content:** Read `artifacts/memory/project-context.md`.
2. **Auto-Detect Environmental Metadata:** Inspect repository manifest (`package.json`, `Cargo.toml`, etc.) and run `git branch --show-current` to ensure stack and branch are never stale.
3. **Regex Splice Machine Block:** Match `/<!-- BEGIN MACHINE STATE -->[\s\S]*?<!-- END MACHINE STATE -->/` and replace only the fenced section with updated runtime state.
4. **Atomic File Write:** Write the payload to a temporary file (`project-context.md.tmp`) and atomically rename it (`fs.renameSync`) over the target file to prevent partial write corruption.

---

## 4. De-Siloing & Idempotent Migration Engine

### 4.1 Merging Role Notes into `patterns-and-conventions.md`
The migration script (`.agents/scripts/migrate_memory_v2.js`) scans all legacy role-siloed files in `artifacts/memory/agent-notes/`:
- `developer-notes.md`
- `architect-notes.md`
- `product-designer-notes.md`
- `qa-notes.md`
- `devops-notes.md`

```javascript
// Migration & De-duplication Logic
const roleNotes = fs.readdirSync('artifacts/memory/agent-notes');
const unifiedPatterns = new Map();

for (const file of roleNotes) {
  const content = fs.readFileSync(path.join('artifacts/memory/agent-notes', file), 'utf8');
  const sections = parseMarkdownSections(content);
  for (const [header, body] of sections) {
    if (!unifiedPatterns.has(header)) {
      unifiedPatterns.set(header, body);
    }
  }
}
// Writes deduplicated content to artifacts/memory/patterns-and-conventions.md with <500 token budget check
```

### 4.2 Ghost Directory Purge
Once migrated and verified, the script purges legacy directories:
```bash
rm -rf artifacts/memory/pending-questions/
rm -rf artifacts/memory/session-checkpoints/
rm -rf artifacts/memory/agent-notes/
```

---

## 5. Phase-Boundary Compaction Gate Specification

### 5.1 Compaction on Phase Advance
When `node .agents/scripts/orchestrator_state.js advance` is called to transition the project across phase boundaries (e.g. Discovery ➔ Strategy ➔ Architecture ➔ Dev ➔ QA ➔ Launch), an automated memory compaction routine is triggered:
1. **Decision Archival Sweep:** Scan `active-decisions.md` for completed, superseded, or rejected decisions.
2. **Historical Sharding:** Move inactive decisions into `artifacts/memory/archive/YYYY-QX-archive.md` with timestamp and resolving agent metadata.
3. **Active Retain Gate:** Retain only live architectural invariants and active constraints in `active-decisions.md`.
4. **Token Budget Assertion:** Assert that `active-decisions.md` is strictly under 400 tokens before allowing the phase advance to succeed.

---

## 6. Swarm Reference Scrubbing & Tooling Updates

### 6.1 Scrubbing Inventory
- **Agent Prompts (`.agents/agents/*.md`):** Scrub references instructing agents to read or write to `agent-notes/` or `session-checkpoints/`. Update instructions to use `patterns-and-conventions.md` and `session-summaries/latest.md`.
- **Skill Steps (`.agents/skills/*/steps/*.md`):** Update all step execution guides to reference the consolidated memory layout.
- **CLI Scaffolder (`bin/cli.js`):** Update `scaffoldArtifacts()` so that newly initialized projects generate the streamlined 6-file memory directory structure.
- **Memory Filter (`.agents/scripts/memory_filter.js`):** Update Tier 1/2/3 loader functions to read from the consolidated files.

---

## 7. Workstreams & Execution Tasks

### WS-1: Script & State Machine Synchronization
- [x] **Task 1.1**: Update `orchestrator_state.js` to execute atomic writes inside `<!-- BEGIN MACHINE STATE -->` in `project-context.md` on state changes.
- [x] **Task 1.2**: Implement stack and git branch auto-detector in `orchestrator_state.js`.
- [x] **Task 1.3**: Add phase-boundary compaction trigger in `orchestrator_state.js advance` with structural deduping and archival sharding.
- [x] **Task 1.4**: Update `memory_filter.js` for the consolidated 3-tier layout without references to deleted directories.

### WS-2: Idempotent Migration Engine & Cleanup
- [x] **Task 2.1**: Author `.agents/scripts/migrate_memory_v2.js` to merge `agent-notes/*.md` into `patterns-and-conventions.md` with collision resolution.
- [x] **Task 2.2**: Execute directory cleanup purging `pending-questions/`, `session-checkpoints/`, and `agent-notes/`.
- [x] **Task 2.3**: Update `bin/cli.js` `scaffoldArtifacts()` to scaffold the consolidated memory layout on `vespyr init`.

### WS-3: Cross-Swarm Reference Updates & Verification Harness
- [x] **Task 3.1**: Scrub all 20 `.agents/agents/*.md` persona files of dead memory folder references.
- [x] **Task 3.2**: Update `.agents/skills/` step files to reference streamlined memory paths.
- [x] **Task 3.3**: Update `AGENTS.md`, `workflow.md`, and `skills.md` documentation for the consolidated memory system.
- [x] **Task 3.4**: Author deterministic memory migration test fixtures asserting zero data loss and concurrent state-write locks.

---

## 8. Definition of Done (DoD)

1. `orchestrator_state.js` automatically and atomically syncs runtime state within `<!-- BEGIN MACHINE STATE -->` in `project-context.md` without clobbering human-edited sections.
2. `patterns-and-conventions.md` replaces all legacy `agent-notes/*.md` files, verified by deterministic migration test fixtures.
3. Ghost folders (`pending-questions/`, `session-checkpoints/`, `agent-notes/`) are completely removed with zero lingering references across all agent personas and skill steps.
4. Phase handoff via `orchestrator_state.js advance` automatically archives superseded decisions and enforces $<400$ token budget in `active-decisions.md`.
5. All automated unit and memory validation tests pass cleanly.

---

## 9. Completion Checklist

**02i plan authoring status: COMPLETE.**

**Execution Checklist:**
- [x] Epic 02i authored and positioned as 10th sub-plan in Phase 1 series
- [x] Round-table review completed; machine-fenced state & token budgeting guardrails incorporated
- [x] Task 1.1 — Update `orchestrator_state.js` for atomic writes inside `<!-- BEGIN MACHINE STATE -->` in `project-context.md`
- [x] Task 1.2 — Implement stack and git branch auto-detector in `orchestrator_state.js`
- [x] Task 1.3 — Add phase-handoff compaction trigger in `orchestrator_state.js advance` with structural deduping
- [x] Task 1.4 — Update `memory_filter.js` for 3-tier consolidated memory layout without deleted directories
- [x] Task 2.1 — Implement idempotent migration utility for `agent-notes/` merging into `patterns-and-conventions.md` (<500 tokens)
- [x] Task 2.2 — Purge `pending-questions/`, `session-checkpoints/`, and legacy `agent-notes/` directories
- [x] Task 2.3 — Update `bin/cli.js` `scaffoldArtifacts()` for consolidated memory layout
- [x] Task 3.1 — Scrub all `.agents/agents/*.md` personas of dead memory folder references
- [x] Task 3.2 — Update all `.agents/skills/` step files to reference streamlined memory paths
- [x] Task 3.3 — Update `AGENTS.md`, `workflow.md`, and `skills.md` documentation
- [x] Task 3.4 — Execute deterministic migration test fixtures & concurrent write stress tests

---

## 11. Post-02i Architecture: Self-Learning Engine & Memory Security Governance (Round Table 2026-08-19)

**Context & Trigger:** Round Table architectural alignment with `@ml-ai-engineer` (Kai), `@architect` (Vera), and `@security-engineer` (Victor). Codifies how Vespyr executes non-parametric continual self-learning across sessions without prompt drift, Model Autophagy Disorder (MAD), or security poisoning.

### 11.1 The 3-Tier Progressive Cache Hierarchy

Learning operates via non-parametric context optimization and trajectory distillation rather than runtime prompt mutation:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Core System Invariants (<300 tokens)                │
│ File: artifacts/memory/project-context.md (Stack, Phase)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Pre-fetches
┌──────────────────────────────▼──────────────────────────────┐
│ Tier 2: Domain & Role Patterns (<500 tokens)                │
│ Files: lessons-learned.md, active-decisions.md              │
└──────────────────────────────┬──────────────────────────────┘
                               │ On-demand query
┌──────────────────────────────▼──────────────────────────────┐
│ Tier 3: Episodic Archive & Task Traces (<500 tokens)        │
│ Files: session-summaries/latest.md, archive/index.ndjson    │
└─────────────────────────────────────────────────────────────┘
```

- **Context Budget Ceiling:** Total injected memory context is strictly capped under **1,000 tokens**, eliminating "Lost in the Middle" attention degradation and context dilution.
- **Pattern Pre-Fetching:** On session start, `@memory-controller` pre-fetches only the Tier 2/3 heuristics relevant to the active agent's domain (`@developer` loads coding patterns; `@architect` loads ADRs; `@security-engineer` loads trust boundaries).

### 11.2 The 5-Stage Trajectory Distillation Pipeline

```
[Agent Action] ──► [Execution Result]
                          │
                          ▼
            [Stage 1: Deterministic Verification Gate]
            ├─ Compiler / Test Runner (Exit Code 0)
            ├─ Spec Linter (spec_check.js)
            └─ AST Assertions (Only verified actions proceed)
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
         [PASS]                      [FAIL]
   (Golden Trajectory)         (Error Signature)
             │                         │
             └────────────┬────────────┘
                          ▼
          [Stage 2: Socratic Reflection & Distillation]
          - Root Cause + Generalized Invariant + Countermeasure
          - Conversational filler & transient debris filtered out
                          │
                          ▼
          [Stage 3: Deduplication & Compaction Guard]
          - Checks active-decisions.md & lessons-learned.md
          - Merges recurring patterns (hit counter increment)
                          │
                          ▼
          [Stage 4: Epistemic Memory Commit]
          - Secret scrubbing + Prompt injection sanitization
          - Appends structured Markdown entry via @memory-controller
                          │
                          ▼
          [Stage 5: Just-In-Time Progressive Injection]
          - Retrieved as passive T3 data in subsequent sessions
```

### 11.3 Memory Security Governance & Pre-Write Pipeline

To prevent **Persistent Sleeper Exploits** (adversarial instructions injected into memory from untrusted external data), every write to `artifacts/memory/` passes through a deterministic security pipeline:

1. **Deterministic Secret Scrubber (OWASP LLM02):** High-entropy regex scanners redact API keys, JWTs, AWS credentials (`AKIA*`), and private keys before writing to disk (`[REDACTED_SECRET]`).
2. **Instruction-Stripping Sanitizer:** Strips prompt-injection delimiters (`<|im_start|>`, `[SYSTEM DIRECTIVE]`, `System:`), role-override instructions, and hidden markdown tags (`<!-- ... -->`).
3. **Strict Provenance Attestation:** All entries must contain valid metadata headers (`[agent: @<name>]`, `[date: YYYY-MM-DD]`, `[domain: <TAG>]`). Unattributed writes are rejected.
4. **Trust Hierarchy Precedence:**
   $$\text{Tier 0 (Root Guardrails)} \gg \text{Tier 1 (Project State)} \gg \text{User Input} \gg \text{Tier 2 (Conventions)} \gg \text{Tier 3 (Learned Memory)}$$
5. **Passive Context Encapsulation:** Injected memory is wrapped in explicit safety boundaries (`<HISTORICAL_MEMORY_DATA trust_level="T3_PASSIVE_DATA">`) instructing the LLM to treat memory strictly as reference facts, never as executable instructions.

---

## 12. Sign-Off & Verification Status

**02i execution status: COMPLETE — ALL TASKS & POST-02i HARDENINGS VERIFIED (2026-08-19).**

**Sign-Off Record:**
- **@founder (Elena):** APPROVED — SATISFIED (2026-08-14). Scope: authoritative `project-context.md` front gate with zero memory fragmentation.
- **@architect (Vera):** APPROVED — SATISFIED (2026-08-19). Scope: 3-tier progressive cache, fenced machine block in `project-context.md`, `<1,000` token budget ceiling, and atomic file locking.
- **@tech-lead (Grant):** APPROVED — SATISFIED (2026-08-14). Scope: atomic write locks (`memory_write.js`), idempotent migration fixtures, and structured state injection.
- **@qa-engineer (Nina):** APPROVED — SATISFIED (2026-08-14). Scope: idempotent migration fixtures with rollback protection and structural compaction diff checks.
- **@security-engineer (Victor):** APPROVED — SATISFIED (2026-08-19). Scope: write-time credential scrubbing (`scrubSecrets`), injection sanitization (`sanitizeContent`), and passive T3 context encapsulation.
- **@ml-ai-engineer (Kai):** APPROVED — SATISFIED (2026-08-19). Scope: 3-signal mathematical deduplication ensemble ($S_{\text{word}}, S_{\text{ngram}}, S_{\text{exact}}$) and 5-stage trajectory distillation lifecycle.
- **@memory-controller (Mnemos):** APPROVED — SATISFIED (2026-08-19). Scope: streamlined 3-tier memory protocol without ghost directories.

---

## 13. Master Execution Checklist & TODOs

### Phase 1 Memory Consolidation (Core Tasks)
- [x] **Task 1.1:** Update `orchestrator_state.js` for atomic state writes within machine block fences.
- [x] **Task 1.2:** Implement stack and git branch auto-detection in `orchestrator_state.js`.
- [x] **Task 1.3:** Add phase-boundary compaction trigger in `orchestrator_state.js advance`.
- [x] **Task 1.4:** Update `memory_filter.js` for 3-tier consolidated layout (<1,000 tokens).
- [x] **Task 2.1:** Author `migrate_memory_v2.js` merging `agent-notes/` into `patterns-and-conventions.md`.
- [x] **Task 2.2:** Purge `pending-questions/`, `session-checkpoints/`, and legacy `agent-notes/`.
- [x] **Task 2.3:** Update `bin/cli.js` `scaffoldArtifacts()` for 6-file memory layout.
- [x] **Task 3.1:** Scrub all 20 `.agents/agents/*.md` personas of dead memory folder paths.
- [x] **Task 3.2:** Update `.agents/skills/` step files to reference streamlined memory layout.
- [x] **Task 3.3:** Update documentation (`AGENTS.md`, `workflow.md`, `skills.md`).
- [x] **Task 3.4:** Author deterministic migration test fixtures & concurrent write stress tests.

### Post-02i Security & Self-Learning Invariants
- [x] **Task 11.1:** Implement pre-write secret scrubbing (`scrubSecrets()`) in `memory_write.js`.
- [x] **Task 11.2:** Implement prompt injection & instruction-stripping sanitization (`sanitizeContent()`).
- [x] **Task 11.3:** Implement 3-signal similarity ensemble ($S_{\text{word}}, S_{\text{ngram}}, S_{\text{exact}}$) in `dedupe_validator.js`.
- [x] **Task 11.4:** Wrap injected context in passive T3 data boundaries (`<HISTORICAL_MEMORY_DATA>`).
- [x] **Task 11.5:** Implement zero-loss archival sharding to `artifacts/memory/archive/index.ndjson`.




