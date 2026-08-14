# Graph Deletion, /shut-up Skill & CLI Modernization Epic (02h)

**Decision:** Execute immediate engine streamlining:
1. **Graph Deletion**: Fully scrap all homegrown legacy graph scripts (`shallow_graph.js`, `incremental_graph.js`, `doc_graph.js`, `ensure_graph.js`, `query_graph.js`) and structural JSON artifacts (`code-graph.json`, `doc-graph.json`), deprecating `/code-graph` and `/doc-graph` skills. Let users independently adopt external graph tooling (e.g. Graphify) or PKM if desired.
2. **`/shut-up` Skill**: Author a dedicated 1-shot skill (`/shut-up <instructions>`) enforcing an introvert, ultra-minimal response style with zero unsolicited Socratic lecturing, pausing only on destructive actions.
3. **CLI Modernization (`bin/cli.js`)**: Modernize the `npx vespyr` CLI with automatic stack detection on init, first-class `npx vespyr update` mode, expanded harness options (Antigravity, Gemini, Aider), headless CI/CD flags, and aligned memory scaffolding.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — 9th in the `02*` series, positioned immediately prior to `02i-phase-1-memory-consolidation.md` and `02j-phase-1-evals-and-agnostic-harness.md`.

**Gate Reviews:** Round table 2026-08-14 (@founder, @architect, @tech-lead, @developer, @devops-engineer), unanimous alignment recorded in `artifacts/memory/active-decisions.md`.

---

## 1. Mandate & Scope

### 1.1 Mandate (from Chris)
"Combine graph deletion, shut up and cli improvement into a separated plan, and shift down the plans for memory and evals."

### 1.2 The Three Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Epic 02h Core Pillars                           │
├────────────────────────────────────────────────────────────────────────┤
│  Pillar 1: Legacy Graph Deletion                                       │
│  - Scrap shallow_graph.js, incremental_graph.js, doc_graph.js, etc.     │
│  - Remove code-graph.json and doc-graph.json                           │
│  - Scrub all agent/skill references to query_graph.js                  │
├────────────────────────────────────────────────────────────────────────┤
│  Pillar 2: /shut-up Skill Implementation                               │
│  - 1-shot invocation: /shut-up <instructions>                          │
│  - Introvert / lazy-to-talk AI behavior: zero lectures, minimal text   │
│  - Destructive safety gate (confirm only on irreversible actions)      │
├────────────────────────────────────────────────────────────────────────┤
│  Pillar 3: bin/cli.js Modernization                                    │
│  - Stack auto-detection on init (package.json, Cargo.toml, etc.)       │
│  - First-class `npx vespyr update` command                             │
│  - Harness additions: Antigravity, Gemini, Aider                       │
│  - Non-interactive headless flags for CI/CD                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Specifications

### 2.1 Pillar 1: Graph Subsystem Deletion
- **Files to Delete:**
  - `.agents/scripts/shallow_graph.js`
  - `.agents/scripts/incremental_graph.js`
  - `.agents/scripts/doc_graph.js`
  - `.agents/scripts/ensure_graph.js`
  - `.agents/scripts/query_graph.js`
  - `artifacts/memory/structural/code-graph.json`
  - `artifacts/memory/structural/doc-graph.json`
  - `.agents/skills/code-graph/`
  - `.agents/skills/doc-graph/`
- **Agent Prompts to Scrub:** Remove `query_graph.js summary/blast/trace` instructions across `.agents/agents/*.md` and `.agents/templates/system/*.canonical`.

### 2.2 Pillar 2: `/shut-up` Skill Specification
- **Skill Location:** `.agents/skills/shut-up/SKILL.md`
- **Frontmatter:**
  ```yaml
  name: shut-up
  description: One-shot silent execution mode — executes tasks directly with zero unsolicited critique, no conversational filler, and ultra-minimal output.
  metadata:
    version: "1.0"
    last_updated: "2026-08-14"
  ```
- **Architectural Boundary:**
  - Strictly a **runtime/prompt context modifier**. It MUST NOT write state, flags, or settings to persistent workspace memory (`active-decisions.md` or `project-context.md`).
- **Positive Structural Directives & Guardrails:**
  1. Suppress Socratic stance, trade-off lectures, and philosophical advice entirely.
  2. Positive output schema: Return ONLY direct code diffs, command executions, and 1–2 line status summaries (strict token ceiling: <100 tokens per turn).
  3. Perform requested file modifications or shell commands immediately without preambles or post-completion essays.
  4. Prompt for confirmation *only* if the commanded action causes irreversible data destruction.

### 2.3 Pillar 3: `bin/cli.js` Improvements
- **Stack Auto-Detection (`detectStack`)**:
  - Checks for `package.json` (React, Next.js, Vue, Vite, Express), `Cargo.toml` (Rust), `go.mod` (Go), `pyproject.toml` / `requirements.txt` (Python).
  - Populates `project-context.md` `Stack:` field dynamically instead of `None`.
- **First-Class Update Mode (`npx vespyr update`)**:
  - Overwrites `.agents/` engine personas and skills with latest release.
  - Strictly preserves `artifacts/memory/` and `artifacts/output/` (untouchable by updates).
  - Creates `.bak` backups on user-customized skill/agent conflict diffs (no destructive overwrites).
- **Expanded Harness Options**:
  - Add `antigravity` (Google Antigravity IDE/CLI), `gemini` (Gemini CLI), and `aider` (.aider.conf.yml).
- **Headless CI/CD Flags**:
  - Support `--project-name`, `--user-nickname`, `--stack`, `--harness`, `--target`, and `--yes` for 1-line non-interactive setup.

---

## 3. Workstreams & Tasks

### WS-1: Graph Deletion & Codebase Cleanliness
- [ ] **Task 1.1**: Delete all 5 legacy graph scripts in `.agents/scripts/`.
- [ ] **Task 1.2**: Remove `artifacts/memory/structural/` JSON files and skill folders.
- [ ] **Task 1.3**: Scrub references to `query_graph.js` from all agent `.md` files, skill step files, and canonical templates.
- [ ] **Task 1.4**: Author static AST/grep regression assertion script asserting zero lingering references to `query_graph.js` or `code-graph.json` across `.agents/`, `artifacts/`, and `bin/`.
- [ ] **Task 1.5**: Run `compile_skills.js` and `spec_check.js` to ensure zero broken dependencies.

### WS-2: `/shut-up` Skill Development & Registration
- [ ] **Task 2.1**: Author `.agents/skills/shut-up/SKILL.md` with positive output constraints and token ceilings.
- [ ] **Task 2.2**: Register `/shut-up` in `skills.md`, `workflow.md`, `README.md`, `README_CN.md`, and `opencode.json`.
- [ ] **Task 2.3**: Verify `/shut-up` behavior across agent runners with brevity and destructive-gate snapshot tests.

### WS-3: `bin/cli.js` Modernization & Testing
- [ ] **Task 3.1**: Implement `detectStack(targetDir)` helper in `bin/cli.js`.
- [ ] **Task 3.2**: Add `npx vespyr update` subcommand handling with memory preservation and `.bak` conflict backups.
- [ ] **Task 3.3**: Add Antigravity, Gemini, and Aider to harness options and transpilation handlers.
- [ ] **Task 3.4**: Add non-interactive parameter flags (`--project-name`, `--user-nickname`, `--stack`).
- [ ] **Task 3.5**: Test local dry-run, installation, and update across clean directories and existing version fixtures.

---

## 4. Definition of Done (DoD)

1. Zero legacy graph scripts or JSON artifacts exist in `.agents/` or `artifacts/memory/`, verified by automated static deprecation check.
2. `/shut-up` is fully functional, runtime-only (no persistent memory pollution), and registered across all documentation and skill catalogs.
3. `bin/cli.js` detects repository stack automatically, supports safe non-destructive `update` mode, supports Antigravity/Gemini/Aider harnesses, and installs cleanly in both interactive and headless modes.
4. All unit and lint checks pass cleanly.

---

## 5. Completion Checklist

**02h plan authoring status: COMPLETE.**

**Execution Checklist:**
- [x] Epic 02h authored and positioned as 9th sub-plan in Phase 1 series
- [x] Round-table review completed; architectural guardrails incorporated
- [ ] Task 1.1 — Delete 5 legacy graph scripts in `.agents/scripts/`
- [ ] Task 1.2 — Remove `artifacts/memory/structural/` JSON files and skill folders
- [ ] Task 1.3 — Scrub `query_graph.js` references across `.agents/agents/*.md`, skills, and templates
- [ ] Task 1.4 — Author static AST/grep regression assertion script asserting zero dangling graph references
- [ ] Task 1.5 — Run `compile_skills.js` and `spec_check.js` cleanly
- [ ] Task 2.1 — Author `.agents/skills/shut-up/SKILL.md` (runtime-only, <100 token ceiling)
- [ ] Task 2.2 — Register `/shut-up` across skill catalogs, READMEs, workflow, and OpenCode permissions
- [ ] Task 2.3 — Author snapshot verification fixtures for `/shut-up` brevity and destructive confirmation gate
- [ ] Task 3.1 — Implement `detectStack(targetDir)` helper in `bin/cli.js`
- [ ] Task 3.2 — Implement `npx vespyr update` with memory preservation and `.bak` backup conflict handling
- [ ] Task 3.3 — Add Antigravity, Gemini, and Aider harness support to CLI
- [ ] Task 3.4 — Add non-interactive headless CLI parameters (`--project-name`, `--user-nickname`, `--stack`)
- [ ] Task 3.5 — Run cross-platform initialization and update test matrix across OS fixtures

---

## 6. Sign-Off

**@founder (Elena):** APPROVED — SATISFIED (2026-08-14). Scope: clean separation of graph scrap, /shut-up, and CLI improvements.  
**@architect (Vera):** APPROVED — SATISFIED (2026-08-14). Scope: /shut-up bounded strictly as runtime modifier without persistent memory pollution; memory-safe CLI update contract.  
**@tech-lead (Grant):** APPROVED — SATISFIED (2026-08-14). Scope: execution ordering locked (02h -> 02i -> 02j); surgical .bak conflict policy for CLI updates.  
**@qa-engineer (Nina):** APPROVED — SATISFIED (2026-08-14). Scope: mandatory AST deprecation lint, /shut-up snapshot test fixtures, and CLI upgrade matrix.  
**@ml-ai-engineer (Kai):** APPROVED — SATISFIED (2026-08-14). Scope: positive structural prompt constraints & token ceilings for /shut-up.
