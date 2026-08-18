# Graph Deletion, /shut-up, "No Yes-Men" DNA & CLI Modernization Epic (02h)

**Decision:** Execute immediate engine streamlining, DNA-level anti-sycophancy hardening, and validation governance:
1. **Graph Deletion**: Fully scrap all homegrown legacy graph scripts (`shallow_graph.js`, `incremental_graph.js`, `doc_graph.js`, `ensure_graph.js`, `query_graph.js`) and structural JSON artifacts (`code-graph.json`, `doc-graph.json`), deprecating `/code-graph` and `/doc-graph` skills. Let users independently adopt external graph tooling (e.g. Graphify) or PKM if desired.
2. **`/shut-up` Skill**: Author a dedicated 1-shot skill (`/shut-up <instructions>`) enforcing an introvert, ultra-minimal response style with zero unsolicited Socratic lecturing, pausing only on destructive actions.
3. **"No Yes-Men in the Swarm" Core DNA, `/grill-me` Hardening & `/round-table` Dialectic Collision**: Formally embed the *"No Yes-Men in the Swarm"* anti-sycophancy principle directly into Vespyr's Core DNA alongside the Universal Socratic Default. Treat agreeable AI rubber-stamping as an engine defect. Upgrade `/grill-me` as the primary operational interrogation loop that enforces pushback before code is ever written. Hardcode the 4-Phase Dialectic Cross-Examination protocol in `/round-table` to turn passive multi-agent polling into active position defense under pushback.
4. **CLI Modernization (`bin/cli.js`)**: Modernize the `npx vespyr` CLI with automatic stack detection on init, first-class `npx vespyr update` mode, expanded harness options (Antigravity, Gemini, Aider), headless CI/CD flags, and aligned memory scaffolding.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 9th in the `02*` series, positioned immediately prior to `02i-phase-1-memory-consolidation.md` and `02j-phase-1-evals-and-agnostic-harness.md`.

**Gate Reviews:** Round table 2026-08-14 (@founder, @architect, @tech-lead, @developer, @devops-engineer, @qa-engineer, @ml-ai-engineer), unanimous alignment recorded in `artifacts/memory/active-decisions.md`.

---

## 1. Mandate & Scope

### 1.1 Mandate (from Chris)
- Combine graph deletion, `/shut-up`, `/grill-me` improvements, `/round-table` dialectic hardening, and CLI modernization into Epic 02h.
- **Embed *"No Yes-Men in the Swarm"* into Vespyr Core DNA alongside the Socratic stance across the entire swarm.**
- Separate `/grill-me` clearly from `/shut-up`: they serve two completely opposite, complementary purposes in the workflow.
- **Eliminate passive committee consensus in `/round-table`:** enforce true perspective collision where agents are mandated to defend their positions under pushback or justify concessions with technical proof.

### 1.2 Vespyr Core DNA: "No Yes-Men in the Swarm"

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Vespyr DNA: The Anti-Sycophancy Principle                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  "No Yes-Men in the Swarm."                                                           │
│  "A yes-man agent is an engine defect. Push back before you help ship the mess."       │
│                                                                                        │
│  1. Sycophancy is an Engine Defect: An agreeable LLM that immediately generates code   │
│     around a flawed premise is not 'helpful'—it is accelerating catastrophic waste.   │
│  2. Pushback Before Execution: Every agent must aggressively challenge happy-path      │
│     assumptions, boundary blindspots, and architectural blast radiuses.                │
│  3. Decisions Over Code: Require written decision logs and trade-off justification     │
│     before constructing multi-file abstractions and phantom backlog tasks.            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Two Distinct Skills for Two Distinct Purposes

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Execution vs. Interrogation Separation                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  /shut-up (Execution Mode)             │  /grill-me (Interrogation Mode)               │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│  • Purpose: Silent, frictionless work  │  • Purpose: Ruthless Socratic stress-testing  │
│  • Trigger: Scope is already locked    │  • Trigger: Before committing to plans/specs   │
│  • Output: Diffs & code only (<100 tok)│  • Output: Decision log & branch challenge    │
│  • Attitude: Introverted, zero lecture │  • Attitude: Anti-sycophantic, zero nodding   │
│  • Stance: Suppress all debate         │  • Stance: Attack assumptions, demand proof   │
│  • Target: Shipping verified tasks     │  • Target: Killing bugs before they are coded │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Perspective Collision: Single Assistant vs. Naive Polling vs. Dialectic Roundtable

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│              The Multi-Agent Isolation vs. Collision Spectrum                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1. Single-Agent Isolation   → Optimizes locally; suffers from blindspots & anchoring.  │
│  2. Naive Multi-Agent Polling→ Fan-out presentation; collapses into additive consensus.│
│  3. Dialectic Roundtable     → Forces pairwise cross-examination; agents must defend   │
│                                positions under pushback or record justified concessions│
│                                with hard empirical evidence. Gaps surface here.        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pillar 1: Legacy Graph Deletion & Scrap Specification

### 2.1 Strategic Rationale
Homegrown graph scripts (`shallow_graph.js`, `incremental_graph.js`, `doc_graph.js`, `ensure_graph.js`, `query_graph.js`) created significant maintenance overhead, AST parsing brittleness, and duplicate structural state files (`code-graph.json`, `doc-graph.json`). Modern developer ecosystems have dedicated, mature graph tooling (e.g. Graphify, Tree-sitter AST indexers, IDE LSP). Vespyr removes homegrown graph scripts to keep the engine lightweight and focused on agent orchestration.

### 2.2 File Deletion Inventory

```
.agents/scripts/
├── [DELETE] shallow_graph.js        # Legacy initial full-repo AST graph parser
├── [DELETE] incremental_graph.js    # Legacy incremental git-diff graph updater
├── [DELETE] doc_graph.js            # Legacy markdown document link mapper
├── [DELETE] ensure_graph.js         # Legacy startup graph verification check
└── [DELETE] query_graph.js          # Legacy blast-radius and symbol query script

artifacts/memory/structural/
├── [DELETE] code-graph.json         # Large 50KB+ generated codebase AST graph
└── [DELETE] doc-graph.json          # Large generated markdown traceability graph

.agents/skills/
├── [DELETE] code-graph/             # Legacy codebase graph skill directory
│   ├── SKILL.md
│   └── steps/
└── [DELETE] doc-graph/              # Legacy document graph skill directory
    ├── SKILL.md
    └── steps/
```

### 2.3 Agent Prompts & System Template Scrubbing
All agent persona files and system canonical templates must be scrubbed of `query_graph.js` references:
- Remove instructions referencing `node .agents/scripts/query_graph.js summary`
- Remove instructions referencing `node .agents/scripts/query_graph.js blast --symbol <X>`
- Remove instructions referencing `node .agents/scripts/query_graph.js trace --doc <Y>`
- Files affected:
  - `.agents/agents/*.md` (all 20 persona files)
  - `.agents/templates/system/*.canonical`
  - `.agents/skills/develop/steps/01-spec-review.md`
  - `.agents/skills/develop/steps/02-architecture.md`
  - `.agents/skills/plan/steps/*.md`

### 2.4 Automated Deprecation Assertion Script (`test/graph-deprecation.test.js`)
An automated test assertion will run in CI to guarantee that zero references to deleted graph scripts or JSON artifacts remain:
```javascript
// Asserts that no file in .agents/, artifacts/, bin/, or guide/ contains query_graph, code-graph.json, or doc-graph.json
const forbiddenPatterns = [
  'query_graph.js',
  'shallow_graph.js',
  'incremental_graph.js',
  'ensure_graph.js',
  'code-graph.json',
  'doc-graph.json',
  '/code-graph',
  '/doc-graph'
];
```

---

## 3. Pillar 2: `/shut-up` Skill Specification

### 3.1 Concept & Architectural Boundary
`/shut-up` is a **one-shot, runtime prompt context modifier**. It temporarily suppresses the agent's verbose Socratic persona, educational explanations, and multi-paragraph commentary.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                /shut-up Execution Model                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  User Input:  /shut-up add email validation regex to auth helper                       │
│                                                                                        │
│  Agent Response Under /shut-up:                                                        │
│  ```diff                                                                               │
│  +export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); │
│  ```                                                                                   │
│  Added `isValidEmail` to `src/utils/auth.ts`.                                          │
│                                                                                        │
│  Token Spend: ~45 tokens (vs. ~650 tokens with unsolicited Socratic review)             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Invariant Rules & Schema
1. **Runtime Context Only:** `/shut-up` MUST NOT write flags or state to `project-context.md` or `active-decisions.md`.
2. **Output Token Ceiling:** Responses must strictly remain under **100 output tokens**.
3. **Schema Contract:** Output must contain ONLY:
   - Direct file edits (diff blocks or file tool calls)
   - Exact shell command execution outputs
   - A single 1-line status summary
4. **Destructive Safety Gate Exception:** If a requested command causes permanent data loss (e.g. `rm -rf`, `DROP TABLE`, uncommitted git wipe), the agent is permitted a single 1-line confirmation prompt before proceeding.

### 3.3 Skill Frontmatter & Content (`.agents/skills/shut-up/SKILL.md`)
```yaml
---
name: shut-up
description: One-shot silent execution mode — executes tasks directly with zero unsolicited critique, no conversational filler, and ultra-minimal output.
metadata:
  version: "1.0"
  last_updated: "2026-08-14"
---
```

---

## 4. Pillar 3: "No Yes-Men" Core DNA, `/grill-me` Hardening & `/round-table` Dialectic Collision

### 4.1 Codifying Anti-Sycophancy in Vespyr Core DNA
The anti-sycophancy directive is injected into the foundation of all 20 agents:
- **`AGENTS.md` (§Default Stance: Socratic — Always On):**
  > **No Yes-Men in the Swarm.**  
  > *A yes-man agent is an engine defect. Push back before you help ship the mess.*  
  > Agreeable rubber-stamping (*"Sounds like a great idea!"*, *"I'll write that immediately"*) on broken, incomplete, or hazardous premises is strictly forbidden.
- **`.agents/references/vespyr-dna.md`:** Codified mandate requiring every agent to challenge unverified assumptions, boundary risks, and missing error paths before code is written.

### 4.2 `/grill-me` Hardening: The 7+1 Failure-Mode Decision Tree

`/grill-me` (`.agents/skills/grill-me/SKILL.md`) is upgraded into an active interrogation protocol across 8 specific risk branches:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        The 7+1 Branch Adversarial Decision Tree                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Branch 1: Problem & Premise Validation (Is this a real problem or an XY distraction?) │
│  Branch 2: Architecture & Boundaries (Does this violate Layer-0 isolation?)            │
│  Branch 3: Data Mutations & Invariants (Can state become inconsistent or corrupted?)   │
│  Branch 4: Blast Radius & Side Effects (What breaks when this service fails?)          │
│  Branch 5: Security & Secrets (Are there injection, auth, or plaintext leaks?)        │
│  Branch 6: Failure Paths & Recoverability (How does the system recover from crashes?)   │
│  Branch 7: Unit Economics & Scale (What is the marginal cost at 100x traffic?)         │
│  Branch 8: YAGNI & MVP Scope Lock (Can 80% of this be cut to ship in 1 day?)          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Mandatory Decision Log Output Contract
`/grill-me` concludes by generating an immutable decision log saved to:
1. `artifacts/output/{phase}/grill-me-decisions.md`
2. Appended to `artifacts/memory/active-decisions.md`

```markdown
### [DECISION] AD-YYYY-MM-DD: <Decision Title> [agent: @grill-me]
- **Target Premise:** <What was proposed>
- **Challenges Identified:** <Flaws, unhappy paths, or blast radius surfaced>
- **Resolution & Trade-Off:** <Explicit agreed solution and what was discarded>
- **Handoff Target:** @developer / @design
**Status:** active
```

### 4.4 `/round-table` Dialectic Hardening: The 4-Phase Cross-Examination Protocol

The current `/round-table` skill (`.agents/skills/round-table/SKILL.md`) implements **Parallel Polling (Scatter/Gather)**: subagents are sampled independently to eliminate anchor bias, but their outputs are merely aggregated. To enforce true perspective collision where agents must defend their positions under pushback, `/round-table` is upgraded to a **4-Phase Dialectic State Machine**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   The 4-Phase Dialectic Roundtable Protocol                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Phase 1: Position Stating (Scatter)                                                   │
│  • Independent parallel subagent dispatch (no anchor bias, unconditioned priors).      │
│                                                                                        │
│  Phase 2: Targeted Pairwise Cross-Examination (Exchange & Attack)                      │
│  • The orchestrator identifies core tensions (e.g. @architect vs @developer).          │
│  • Agent X receives Agent Y's stance with an explicit mandate: identify unstated       │
│    assumptions, boundary blindspots, and invalid invariants.                           │
│                                                                                        │
│  Phase 3: Defense & Justified Concession (Rebuttal)                                    │
│  • Challenged agents MUST defend with hard empirical constraints (token budgets,       │
│    benchmarks, schema invariants) OR formally log a concession with root-cause proof. │
│  • Passive nodding or unacknowledged pivots are rejected as Sycophantic Drift.        │
│                                                                                        │
│  Phase 4: Synthesis Gate & Irreconcilable Trade-Off Escalation                         │
│  • No false consensus: if trade-offs are mutually exclusive, log them as an explicit  │
│    ADR decision record rather than synthesizing a muddy compromise.                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Invariant Anti-Sycophancy Rules for `/round-table`:
1. **Mandatory Pairwise Critique in Multi-Agent Debates:** Every multi-agent session with >1 panelist must execute Phase 2 cross-examination before synthesis.
2. **Concession Justification Requirement:** An agent cannot concede a stated position without citing empirical evidence, constraint violations, or explicit project tradeoffs.
3. **Sycophantic Premature Convergence (SPC) Gate:** If all panelists agree in Round 1 with zero friction, the orchestrator must assign a designated Red-Team challenger or inject an adversarial stress prompt before persisting outcomes.

---

## 5. Pillar 4: `bin/cli.js` Modernization & Centralized Helper Infrastructure

### 5.1 CLI Modularization (`bin/lib/`)
To eliminate the 2,300+ line monolith smell in `bin/cli.js` and simplify long-term maintenance, `bin/` is split into clean, single-responsibility helper modules:
- `bin/lib/detector.js`: Stack auto-detection across repository manifests (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`).
- `bin/lib/prompts.js`: Interactive TTY readline and raw-mode terminal wizard widgets (`askChecklist`, `askSingleChoice`, `askQuestion`) with robust raw-mode cleanup on exit/SIGINT.
- `bin/lib/transpilers.js`: Transpilation generators for harness integration rules (Copilot YAML, Cursor MDC, Kiro steering & skills).
- `bin/cli.js`: Slim CLI coordinator (~250 lines) managing flag parsing, subcommand routing, and execution.

### 5.2 Automatic Stack Detection (`detectStack`)
On initialization (`npx vespyr init` or `npx vespyr`), the CLI inspects the target directory for language/framework manifests and automatically populates `project-context.md`:

```javascript
function detectStack(targetDir) {
  const checks = [
    { file: 'package.json', check: (pkg) => pkg.dependencies?.next ? 'Next.js' : pkg.dependencies?.react ? 'React' : 'Node.js' },
    { file: 'Cargo.toml', label: 'Rust' },
    { file: 'go.mod', label: 'Go' },
    { file: 'pyproject.toml', label: 'Python' },
    { file: 'requirements.txt', label: 'Python' },
    { file: 'pom.xml', label: 'Java (Maven)' },
    { file: 'build.gradle', label: 'Java (Gradle)' }
  ];
  // Returns detected stack string (e.g. "TypeScript, Next.js, Tailwind")
}
```

### 5.3 First-Class Update Mode (`npx vespyr update`)
The CLI introduces safe, non-destructive engine updates:
- **Overwrites:** Core engine personas (`.agents/agents/*.md`), core skill workflows (`.agents/skills/*`), and engine scripts (`.agents/scripts/*`).
- **Strictly Preserves:** `artifacts/memory/` and `artifacts/output/` are never touched or clobbered.
- **Custom Conflict Backups:** If a user has customized an existing skill or agent file, the updater creates `.bak-${YYYYMMDD}` backups (e.g. `SKILL.md.bak-20260814`) rather than silently discarding user changes.

### 5.4 Expanded Multi-Harness Integration
Adds first-class scaffolding for modern AI developer harnesses:
- **`antigravity`:** Scaffolds `.agents/` + Antigravity configuration shims.
- **`gemini`:** Generates Gemini CLI configuration templates.
- **`aider`:** Generates `.aider.conf.yml` and pre-prompt instructions.

### 5.5 Headless CI/CD Automation Flags
Enables one-line zero-prompt installation for CI/CD runners:
```bash
npx vespyr init --project-name "my-app" --user-nickname "Alex" --stack "Next.js" --harness "antigravity" --yes
```

### 5.6 NPX Package Distribution & Manifest Verification (`package.json`)
To guarantee that updating the CLI to a modular structure (`bin/lib/`) works flawlessly when executed via `npx vespyr` globally or headlessly:
- **Package Manifest Audit:** `package.json` must explicitly include `"bin/"` and `".agents/"` in its `"files"` array so npm includes all modular helpers (`bin/lib/*.js`) during publishing.
- **NPX Packaging Verification:** Automated test suite runs `npm pack --dry-run` and executes the resulting tarball via `npx` to verify zero missing module errors.

### 5.7 Centralized Engine Runtime Helper Infrastructure (`.agents/scripts/lib/`)
To eliminate duplicate file parsing, fragile `process.cwd()` dependencies, and un-atomic JSON file writes across engine scripts (`orchestrator_state.js`, `archive_manager.js`, `step_tracker.js`, etc.), a shared runtime helper library is established under `.agents/scripts/lib/`:

```
.agents/scripts/lib/
├── fs_atomic.js      # Safe atomic JSON & text reads/writes via .tmp + renameSync
├── workspace.js      # Deterministic workspace root finder (climbs up to locate .agents/ or git root)
├── frontmatter.js    # Centralized YAML frontmatter parser and serializer
└── identity.js       # Unified reader/writer updating both ## [IDENTITY] and markdown lists in project-context.md
```

- **Crash-Safe Atomic State Writes:** `fs_atomic.js` replaces raw `writeFileSync` in `orchestrator_state.js`, `session_checkpoint.js`, and `memory_write.js` with `.tmp` write + atomic `renameSync` to prevent memory corruption on aborts.
- **Unified Identity Synchronization:** `identity.js` ensures nickname updates synchronise both `## [IDENTITY]\nUser Nickname: <Name>` and `- **User Nickname**: <Name>` in `project-context.md`.

---

## 6. Workstreams & Execution Tasks

### WS-1: Graph Subsystem Deletion & Cleanliness
- [ ] **Task 1.1**: Delete all 5 graph scripts in `.agents/scripts/` (`shallow_graph.js`, `incremental_graph.js`, `doc_graph.js`, `ensure_graph.js`, `query_graph.js`).
- [ ] **Task 1.2**: Remove `artifacts/memory/structural/` (`code-graph.json`, `doc-graph.json`) and skill folders (`.agents/skills/code-graph/`, `.agents/skills/doc-graph/`).
- [ ] **Task 1.3**: Scrub references to `query_graph.js` from all agent `.md` files, skill step files, and canonical system templates.
- [ ] **Task 1.4**: Author `test/graph-deprecation.test.js` static AST/grep regression assertion script asserting zero dangling graph references across `.agents/`, `artifacts/`, and `bin/`.
- [ ] **Task 1.5**: Run `node .agents/scripts/compile_skills.js` and `spec_check.js` to ensure clean build.

### WS-2: `/shut-up` Skill Implementation & Registration
- [ ] **Task 2.1**: Author `.agents/skills/shut-up/SKILL.md` with runtime-only context modifier and <100 token ceiling.
- [ ] **Task 2.2**: Register `/shut-up` in `skills.md`, `workflow.md`, `README.md`, `README_CN.md`, and `opencode.json`.
- [ ] **Task 2.3**: Author automated snapshot test fixtures asserting brevity (<100 tokens) and destructive confirmation gates.

### WS-3: "No Yes-Men" DNA, `/grill-me` Hardening & `/round-table` Dialectic Upgrades
- [ ] **Task 3.1**: Codify the "No Yes-Men in the Swarm" anti-sycophancy principle in `AGENTS.md` and `.agents/references/vespyr-dna.md`.
- [ ] **Task 3.2**: Update `.agents/skills/grill-me/SKILL.md` with 7+1 branch failure-path interrogation and role challenge modules.
- [ ] **Task 3.3**: Update agent system templates (`.agents/templates/system/*.canonical`) to ban premature agreeableness and rubber-stamping.
- [ ] **Task 3.4**: Author test fixtures verifying `/grill-me` output decision log generation and clean handoff into downstream planning.
- [ ] **Task 3.5**: Update `.agents/skills/round-table/SKILL.md` to codify the 4-Phase Dialectic Cross-Examination protocol (Scatter -> Targeted Pairwise Attack -> Rebuttal/Concession -> ADR Escalation Gate).
- [ ] **Task 3.6**: Author test fixtures verifying `/round-table` pairwise critique enforcement, concession tracking, and anti-sycophantic convergence blocking.

### WS-4: `bin/cli.js` Modernization, CLI Helpers & NPX Package Verification
- [ ] **Task 4.1**: Extract CLI helper modules into `bin/lib/` (`detector.js`, `prompts.js`, `transpilers.js`) and slim `bin/cli.js`.
- [ ] **Task 4.2**: Implement `detectStack(targetDir)` helper with multi-language manifest checks.
- [ ] **Task 4.3**: Implement `npx vespyr update` subcommand handling with memory preservation and `.bak-${YYYYMMDD}` conflict backups.
- [ ] **Task 4.4**: Add Antigravity, Gemini, and Aider to harness options and configuration scaffolding.
- [ ] **Task 4.5**: Implement non-interactive headless CLI parameter flags (`--project-name`, `--user-nickname`, `--stack`, `--harness`, `--yes`).
- [ ] **Task 4.6**: Author cross-platform initialization and update test matrix across clean workspaces and pre-existing versions.
- [ ] **Task 4.7**: NPX Packaging & Manifest Verification (`npm pack` dry-run audit and zero-missing-module execution test).

### WS-5: Centralized Engine Runtime Helper Infrastructure (`.agents/scripts/lib/`)
- [ ] **Task 5.1**: Build `.agents/scripts/lib/fs_atomic.js` providing atomic JSON/text file read and write helpers.
- [ ] **Task 5.2**: Build `.agents/scripts/lib/workspace.js` providing dynamic workspace root resolution.
- [ ] **Task 5.3**: Build `.agents/scripts/lib/frontmatter.js` providing unified YAML frontmatter parsing and serialization.
- [ ] **Task 5.4**: Build `.agents/scripts/lib/identity.js` providing dual-block identity updates for `project-context.md`.
- [ ] **Task 5.5**: Refactor `orchestrator_state.js`, `archive_manager.js`, `step_tracker.js`, `session_checkpoint.js`, `memory_write.js`, and `sync-entry-points.js` to consume `.agents/scripts/lib/` helpers.
- [ ] **Task 5.6**: Update test suite to verify atomic writes, root resolution, and frontmatter parsing integrity.

---

## 7. Definition of Done (DoD)

1. Zero legacy graph scripts (`shallow_graph.js`, etc.) or structural JSON files exist in the repository, verified by automated static AST/grep deprecation test.
2. `/shut-up` is fully registered across all documentation and executes tasks in $<100$ tokens without writing persistent state.
3. The *"No Yes-Men in the Swarm"* Anti-Sycophancy principle is embedded in `AGENTS.md`, universal Socratic references, and persona templates.
4. `/grill-me` actively interrogates assumptions across the 7+1 decision tree, and `/round-table` enforces the 4-phase dialectic cross-examination protocol (Scatter -> Attack -> Rebuttal -> ADR Gate), eliminating unearned additive consensus.
5. `bin/cli.js` is modularized with `bin/lib/`, accurately detects repository stacks, executes safe non-destructive `update` operations, supports Antigravity/Gemini/Aider, operates in headless mode, and passes NPX package verification (`npm pack` dry-run).
6. `.agents/scripts/lib/` provides centralized atomic I/O, root resolution, frontmatter parsing, and identity sync across engine scripts.
7. All automated unit and regression tests pass cleanly.

---

## 8. Completion Checklist

**02h plan authoring status: COMPLETE.**

**Execution Checklist:**
- [x] Epic 02h authored and positioned as 9th sub-plan in Phase 1 series
- [x] Round-table review completed; anti-sycophancy DNA, skill separation, /round-table dialectic protocol, centralized helper architecture, and NPX packaging plan incorporated
- [x] Task 1.1 — Delete 5 legacy graph scripts in `.agents/scripts/`
- [x] Task 1.2 — Remove `artifacts/memory/structural/` JSON files and skill folders
- [x] Task 1.3 — Scrub `query_graph.js` references across `.agents/agents/*.md`, skills, and templates
- [x] Task 1.4 — Author static AST/grep regression assertion script asserting zero dangling graph references
- [x] Task 1.5 — Run `compile_skills.js` and `spec_check.js` cleanly
- [x] Task 2.1 — Author `.agents/skills/shut-up/SKILL.md` (runtime-only, <100 token ceiling)
- [x] Task 2.2 — Register `/shut-up` across skill catalogs, READMEs, workflow, and OpenCode permissions
- [x] Task 2.3 — Author snapshot verification fixtures for `/shut-up` brevity and destructive confirmation gate
- [x] Task 3.1 — Codify "No Yes-Men in the Swarm" DNA in `AGENTS.md` and `vespyr-dna.md`
- [x] Task 3.2 — Update `.agents/skills/grill-me/SKILL.md` with anti-sycophancy directives & failure-mode checklists
- [x] Task 3.3 — Update agent system templates to ban rubber-stamping and premature codegen
- [x] Task 3.4 — Test `/grill-me` handoff into active decisions and downstream planning
- [x] Task 3.5 — Update `.agents/skills/round-table/SKILL.md` with 4-phase Dialectic Cross-Examination protocol
- [x] Task 3.6 — Author test fixtures verifying `/round-table` pairwise critique and concession justification enforcement
- [x] Task 4.1 — Extract CLI helpers to `bin/lib/` (`detector.js`, `prompts.js`, `transpilers.js`) and slim `bin/cli.js`
- [x] Task 4.2 — Implement `detectStack(targetDir)` helper with multi-language manifest checks
- [x] Task 4.3 — Implement `npx vespyr update` with memory preservation and `.bak-${YYYYMMDD}` conflict backups
- [x] Task 4.4 — Add Antigravity, Gemini, and Aider harness options to CLI
- [x] Task 4.5 — Add non-interactive headless CLI parameters (`--project-name`, `--user-nickname`, `--stack`, `--harness`, `--yes`)
- [x] Task 4.6 — Run cross-platform initialization and update test matrix across OS fixtures
- [x] Task 4.7 — NPX Packaging & Manifest Verification (`npm pack` dry-run audit and zero-missing-module execution test)
- [x] Task 5.1 — Build `.agents/scripts/lib/fs_atomic.js` for crash-safe atomic reads and writes
- [x] Task 5.2 — Build `.agents/scripts/lib/workspace.js` for dynamic workspace root resolution
- [x] Task 5.3 — Build `.agents/scripts/lib/frontmatter.js` for unified YAML frontmatter parsing and serialization
- [x] Task 5.4 — Build `.agents/scripts/lib/identity.js` for dual-block identity updates in `project-context.md`
- [x] Task 5.5 — Refactor `orchestrator_state.js`, `archive_manager.js`, `step_tracker.js`, etc. to use `.agents/scripts/lib/`
- [x] Task 5.6 — Update test suite to verify atomic writes, root resolution, and frontmatter parsing integrity

---

## 9. Sign-Off

**@founder (Elena):** APPROVED — SATISFIED (2026-08-14). Scope: "No Yes-Men in the Swarm" embedded as non-negotiable core DNA alongside Socratic stance; clean separation of /shut-up (silent execution), /grill-me (Socratic interrogation), and /round-table (dialectical cross-examination).  
**@architect (Vera):** APPROVED — SATISFIED (2026-08-14). Scope: Anti-Sycophancy DNA stops premature Layer 0 blast radius; /round-table 4-phase state machine transforms passive broadcasting into pairwise challenge and justified concessions; modular CLI (`bin/lib/`), NPX package distribution verification, and runtime helper library (`.agents/scripts/lib/`) locked.  
**@tech-lead (Grant):** APPROVED — SATISFIED (2026-08-14). Scope: execution ordering locked (02h -> 02i -> 02j); /round-table state loop codified into 4 discrete phases; helper infrastructure eliminates ~1,200 lines of duplicated boilerplate and guarantees crash-safe state updates; NPX tarball build verified.  
**@qa-engineer (Nina):** APPROVED — SATISFIED (2026-08-14). Scope: happy-path destruction across all agent personas, /round-table concession assertion tests, mandatory AST deprecation lint, CLI upgrade matrix, and atomic write + NPX pack test suite.  
**@ml-ai-engineer (Kai):** APPROVED — SATISFIED (2026-08-14). Scope: anti-sycophancy prompt heuristics across system canonicals; elimination of Sycophantic Premature Convergence (SPC) via mandatory pairwise cross-examination; token ceilings for /shut-up.



