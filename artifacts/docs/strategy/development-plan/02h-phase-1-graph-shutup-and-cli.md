# Graph Deletion, /shut-up, "No Yes-Men" DNA & CLI Modernization Epic (02h)

**Decision:** Execute immediate engine streamlining, DNA-level anti-sycophancy hardening, and validation governance:
1. **Graph Deletion**: Fully scrap all homegrown legacy graph scripts (`shallow_graph.js`, `incremental_graph.js`, `doc_graph.js`, `ensure_graph.js`, `query_graph.js`) and structural JSON artifacts (`code-graph.json`, `doc-graph.json`), deprecating `/code-graph` and `/doc-graph` skills. Let users independently adopt external graph tooling (e.g. Graphify) or PKM if desired.
2. **`/shut-up` Skill**: Author a dedicated 1-shot skill (`/shut-up <instructions>`) enforcing an introvert, ultra-minimal response style with zero unsolicited Socratic lecturing, pausing only on destructive actions.
3. **"No Yes-Men in the Swarm" Core DNA & `/grill-me` Hardening**: Formally embed the *"No Yes-Men in the Swarm"* anti-sycophancy principle directly into Vespyr's Core DNA alongside the Universal Socratic Default. Treat agreeable AI rubber-stamping as an engine defect. Upgrade `/grill-me` as the primary operational interrogation loop that enforces pushback before code is ever written.
4. **CLI Modernization (`bin/cli.js`)**: Modernize the `npx vespyr` CLI with automatic stack detection on init, first-class `npx vespyr update` mode, expanded harness options (Antigravity, Gemini, Aider), headless CI/CD flags, and aligned memory scaffolding.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 9th in the `02*` series, positioned immediately prior to `02i-phase-1-memory-consolidation.md` and `02j-phase-1-evals-and-agnostic-harness.md`.

**Gate Reviews:** Round table 2026-08-14 (@founder, @architect, @tech-lead, @developer, @devops-engineer, @qa-engineer), unanimous alignment recorded in `artifacts/memory/active-decisions.md`.

---

## 1. Mandate & Scope

### 1.1 Mandate (from Chris)
- Combine graph deletion, `/shut-up`, `/grill-me` improvements, and CLI modernization into Epic 02h.
- **Embed *"No Yes-Men in the Swarm"* into Vespyr Core DNA alongside the Socratic stance across the entire swarm.**
- Separate `/grill-me` clearly from `/shut-up`: they serve two completely opposite, complementary purposes in the workflow.

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

## 4. Pillar 3: "No Yes-Men" Core DNA & `/grill-me` Hardening

### 4.1 Codifying Anti-Sycophancy in Vespyr Core DNA
The anti-sycophancy directive is injected into the foundation of all 20 agents:
- **`AGENTS.md` (§Default Stance: Socratic — Always On):**
  > **No Yes-Men in the Swarm.**  
  > *A yes-man agent is an engine defect. Push back before you help ship the mess.*  
  > Agreeable rubber-stamping (*"Sounds like a great idea!"*, *"I'll write that immediately"*) on broken, incomplete, or hazardous premises is strictly forbidden.
- **`.agents/references/socratic-universal.md`:** Codified mandate requiring every agent to challenge unverified assumptions, boundary risks, and missing error paths before code is written.

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

---

## 5. Pillar 4: `bin/cli.js` Modernization Specification

### 5.1 Automatic Stack Detection (`detectStack`)
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

### 5.2 First-Class Update Mode (`npx vespyr update`)
The CLI introduces safe, non-destructive engine updates:
- **Overwrites:** Core engine personas (`.agents/agents/*.md`), core skill workflows (`.agents/skills/*`), and engine scripts (`.agents/scripts/*`).
- **Strictly Preserves:** `artifacts/memory/` and `artifacts/output/` are never touched or clobbered.
- **Custom Conflict Backups:** If a user has customized an existing skill or agent file, the updater creates `.bak` backups (e.g. `SKILL.md.bak-20260814`) rather than silently discarding user changes.

### 5.3 Expanded Multi-Harness Integration
Adds first-class scaffolding for modern AI developer harnesses:
- **`antigravity`:** Scaffolds `.agents/` + Antigravity configuration shims.
- **`gemini`:** Generates Gemini CLI configuration templates.
- **`aider`:** Generates `.aider.conf.yml` and pre-prompt instructions.

### 5.4 Headless CI/CD Automation Flags
Enables one-line zero-prompt installation for CI/CD runners:
```bash
npx vespyr init --project-name "my-app" --user-nickname "Alex" --stack "Next.js" --harness "antigravity" --yes
```

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

### WS-3: "No Yes-Men" DNA & `/grill-me` Hardening Upgrades
- [ ] **Task 3.1**: Codify the "No Yes-Men in the Swarm" anti-sycophancy principle in `AGENTS.md` and `.agents/references/socratic-universal.md`.
- [ ] **Task 3.2**: Update `.agents/skills/grill-me/SKILL.md` with 7+1 branch failure-path interrogation and role challenge modules.
- [ ] **Task 3.3**: Update agent system templates (`.agents/templates/system/*.canonical`) to ban premature agreeableness and rubber-stamping.
- [ ] **Task 3.4**: Author test fixtures verifying `/grill-me` output decision log generation and clean handoff into downstream planning.

### WS-4: `bin/cli.js` Modernization & Testing
- [ ] **Task 4.1**: Implement `detectStack(targetDir)` helper in `bin/cli.js` with multi-language manifest checks.
- [ ] **Task 4.2**: Implement `npx vespyr update` subcommand handling with memory preservation and `.bak` conflict backups.
- [ ] **Task 4.3**: Add Antigravity, Gemini, and Aider to harness options and configuration scaffolding.
- [ ] **Task 4.4**: Implement non-interactive headless CLI parameter flags (`--project-name`, `--user-nickname`, `--stack`, `--harness`, `--yes`).
- [ ] **Task 4.5**: Author cross-platform initialization and update test matrix across clean workspaces and pre-existing versions.

---

## 7. Definition of Done (DoD)

1. Zero legacy graph scripts (`shallow_graph.js`, etc.) or structural JSON files exist in the repository, verified by automated static AST/grep deprecation test.
2. `/shut-up` is fully registered across all documentation and executes tasks in $<100$ tokens without writing persistent state.
3. The *"No Yes-Men in the Swarm"* Anti-Sycophancy principle is embedded in `AGENTS.md`, universal Socratic references, and persona templates.
4. `/grill-me` actively interrogates assumptions across the 7+1 decision tree and produces structured decision logs before downstream development.
5. `bin/cli.js` accurately detects repository stacks, executes safe non-destructive `update` operations, supports Antigravity/Gemini/Aider, and operates in headless mode.
6. All automated unit and regression tests pass cleanly.

---

## 8. Completion Checklist

**02h plan authoring status: COMPLETE.**

**Execution Checklist:**
- [x] Epic 02h authored and positioned as 9th sub-plan in Phase 1 series
- [x] Round-table review completed; anti-sycophancy DNA and skill separation incorporated
- [ ] Task 1.1 — Delete 5 legacy graph scripts in `.agents/scripts/`
- [ ] Task 1.2 — Remove `artifacts/memory/structural/` JSON files and skill folders
- [ ] Task 1.3 — Scrub `query_graph.js` references across `.agents/agents/*.md`, skills, and templates
- [ ] Task 1.4 — Author static AST/grep regression assertion script asserting zero dangling graph references
- [ ] Task 1.5 — Run `compile_skills.js` and `spec_check.js` cleanly
- [ ] Task 2.1 — Author `.agents/skills/shut-up/SKILL.md` (runtime-only, <100 token ceiling)
- [ ] Task 2.2 — Register `/shut-up` across skill catalogs, READMEs, workflow, and OpenCode permissions
- [ ] Task 2.3 — Author snapshot verification fixtures for `/shut-up` brevity and destructive confirmation gate
- [ ] Task 3.1 — Codify "No Yes-Men in the Swarm" DNA in `AGENTS.md` and `socratic-universal.md`
- [ ] Task 3.2 — Update `.agents/skills/grill-me/SKILL.md` with anti-sycophancy directives & failure-mode checklists
- [ ] Task 3.3 — Update agent system templates to ban rubber-stamping and premature codegen
- [ ] Task 3.4 — Test `/grill-me` handoff into active decisions and downstream planning
- [ ] Task 4.1 — Implement `detectStack(targetDir)` helper in `bin/cli.js`
- [ ] Task 4.2 — Implement `npx vespyr update` with memory preservation and `.bak` backup conflict handling
- [ ] Task 4.3 — Add Antigravity, Gemini, and Aider harness support to CLI
- [ ] Task 4.4 — Add non-interactive headless CLI parameters (`--project-name`, `--user-nickname`, `--stack`)
- [ ] Task 4.5 — Run cross-platform initialization and update test matrix across OS fixtures

---

## 9. Sign-Off

**@founder (Elena):** APPROVED — SATISFIED (2026-08-14). Scope: "No Yes-Men in the Swarm" embedded as non-negotiable core DNA alongside Socratic stance; clean separation of /shut-up (silent execution) and /grill-me (Socratic anti-sycophancy).  
**@architect (Vera):** APPROVED — SATISFIED (2026-08-14). Scope: Anti-Sycophancy DNA stops premature Layer 0 blast radius; /shut-up bounded strictly as runtime modifier without memory pollution.  
**@tech-lead (Grant):** APPROVED — SATISFIED (2026-08-14). Scope: execution ordering locked (02h -> 02i -> 02j); DNA prevents phantom backlog generation across all agents.  
**@qa-engineer (Nina):** APPROVED — SATISFIED (2026-08-14). Scope: happy-path destruction across all agent personas, mandatory AST deprecation lint, and CLI upgrade matrix.  
**@ml-ai-engineer (Kai):** APPROVED — SATISFIED (2026-08-14). Scope: anti-sycophancy prompt heuristics across system canonicals; token ceilings for /shut-up.


