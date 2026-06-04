# Implementation Plan — Vespyr 1.7.0 NPX Installer & Multiple Harness Support

This document outlines the detailed architecture, specifications, and execution steps for transitioning the Vespyr agent system from a single-harness cloned system (.opencode) to a multi-harness system installed cleanly via `npx vespyr` at the **v1.7.0** milestone.

---

## 1. Versioning Strategy (v1.7.0)

> [!IMPORTANT]
> **Ecosystem Parity: Aligning NPM Package and Engine to v1.7.0**
> - **Parity vs. Resetting**: Although this is the first release of the `npx vespyr` package (which would technically start at `1.0.0` for a fresh package), we will set the NPM package version directly to **`1.7.0`** to match the Vespyr engine's version milestone (`v1.7.0`).
> - **Why we do this**:
>   - **Consistency**: Running `npx vespyr` makes it immediately clear that the user is running the latest `v1.7.0` engine.
>   - **Industry Standard**: Major framework CLIs (e.g. `npx create-next-app` or `npx svelte`) align their version numbers exactly with the core library version rather than maintaining separate, confusing CLI version tracks.
>   - **Tokenization**: Keeps the entire Vespyr codebase, roadmap, and installation packages in a unified release track.

### Semver Policy for `vespyr` npm Package

| Bump | Trigger | Examples |
|:---|:---|:---|
| **Major** (x.0.0) | Breaking change to `.agents/` directory structure, removal of a supported harness, removal of an agent, changes to `project-context.md` format, changes to CLI flags | Deleting an agent file, removing `--yes` flag, renaming `.agents/scripts/` to `.agents/runtime/` |
| **Minor** (0.x.0) | New harness support, new agent added, new CLI flag, new skill, new script | Adding `@sre-engineer` agent, adding `--verbose` flag, adding `code-review` skill |
| **Patch** (0.0.x) | Bug fixes, typo corrections in agent prompts, script fixes, dependency updates (for plugin deps inside `.agents/`) | Fixing `parseFrontmatter()` regex, correcting skill description, updating `@opencode-ai/plugin` |

> [!IMPORTANT]
> Since the npm package version is locked to the Vespyr engine version, **every release is a minor or patch bump within the same major version** until a fundamental architectural change forces v2.0.0.

---

## 2. User Review & Critical Checklists

> [!CAUTION]
> **ASCII Spacing and Indentation Check in `cli.js`**
> Markdown parsers in code editors and renderers frequently normalize or auto-trim leading whitespace from fenced code blocks (stripping the common prefix). 
> 
> **To bypass this, we must ensure that in `cli.js` the raw ASCII art string is implemented mathematically exact:**
> - Line 1: `  __  __` (exactly **two** leading spaces)
> - Line 2: ` /\ \/\ \` (exactly **one** leading space)
> - Line 3: ` \ \ \ \ \` (exactly **one** leading space)
> - Line 4: `  \ \ \ \ \` (exactly **two** leading spaces)
> - Line 5: `   \ \ \_/` (exactly **three** leading spaces)
> - Line 6: `    \ `\___/` (exactly **four** leading spaces)
> - Line 7: `     `\/__/` (exactly **five** leading spaces)
> - Line 8: `                             \ \_\` (exactly **twenty-nine** leading spaces)
> - Line 9: `                              \/_/` (exactly **thirty** leading spaces)
> 
> We will verify this byte-for-byte in the test sandbox during the validation phase!

---

## 3. Master Folder Layout under `.agents/` (Mandatory Core)

When a user runs the installer, the core of Vespyr is unpacked into a folder called `.agents/` at the root of their project. 
This master folder is **mandatory** and always scaffolded first. Below is the exhaustive file and directory specification of what will reside inside the `.agents/` folder:

```
.agents/
├── agents/                       # 21 Core Agent Persona prompts
│   ├── founder.md                # Validation and Discovery Lead
│   ├── product-manager.md        # PRD & User Story Specifier
│   ├── product-designer.md       # Screen & Flow Specifier
│   ├── architect.md              # System Architecture & ADR Designer
│   ├── tech-lead.md              # Kanban Board & Parallelism Planner
│   ├── developer.md              # Feature Implementer
│   ├── code-reviewer.md          # Read-only Code Reviewer
│   ├── qa-engineer.md            # Acceptance Criteria Tester
│   ├── researcher.md             # Market & Competitor Analyst
│   ├── user-researcher.md        # Demographics & Persona Builder
│   ├── ux-researcher.md          # Usability & Accessibility Auditor
│   ├── data-analyst.md           # Metrics & Tracking Planner
│   ├── security-engineer.md      # OWASP & Threat Modeler
│   ├── performance-engineer.md   # Latency & Load Evaluator
│   ├── ml-engineer.md            # ML Architecture & Pipeline Designer
│   ├── devops-engineer.md        # CI/CD & Secrets Engineer
│   ├── technical-writer.md       # API Reference & Guide Writer
│   ├── memory-controller.md      # Memory Gatekeeper (Sub-Agent)
│   ├── reader.md                 # Codebase Reader (Sub-Agent)
│   ├── writer.md                 # Contiguous File Writer (Sub-Agent)
│   └── executor.md               # Bash Command Executor (Sub-Agent)
├── commands/                     # Slash Command Definitions
│   ├── init.md                   # Harness-agnostic bootstrap command
│   ├── scaffold-agents.md        # AGENTS.md template (single source of truth)
│   ├── scaffold-agent.md         # agent.md template (single source of truth)
│   └── scaffold-claude.md        # CLAUDE.md template (single source of truth)
├── references/                   # PM/Founder Frameworks & Guidelines
│   ├── founder-frameworks.md     # Golden Circle, Unit Economics sheets
│   ├── pm-frameworks.md          # PRD templates & traceability framework
│   ├── developer-guidelines.md   # Clean Code, Testing & Git conventions
│   ├── pm-workflows.md           # Acceptance criteria & Traceability rules
│   ├── socratic-universal.md     # Universal Socratic rules for critical inquiry
│   ├── socratic/                 # Per-agent Socratic rules
│   │   ├── founder.md
│   │   ├── developer.md
│   │   └── ...
│   └── templates/                # Instruction templates for reference sections
├── scripts/                      # System Background Operations Scripts
│   ├── archive_manager.js        # NDJSON archive operations
│   ├── compaction_guard.js       # Memory file size check threshold
│   ├── compile_skills.js         # Skills catalog compiler for help-me skill
│   ├── dedupe_validator.js       # Duplicate memory entry prevention
│   ├── doc_graph.js              # Document relationship & traceability mapper
│   ├── ensure_graph.js           # Self-healing graph wrapper (mtime-aware)
│   ├── hot_path_analyzer.js      # Optimization profiling calculator
│   ├── incremental_graph.js      # mtime codebase import/export analyzer
│   ├── memory_filter.js          # Tier 3 keyword + recency scoring
│   ├── orchestrator_state.js     # DAG state machine controller
│   ├── pipeline_simulator.js     # Synthetic pipeline runner
│   ├── shallow_graph.js          # Fast codebase import scans
│   ├── squads.js                 # Squad preset loader and parser
│   ├── swarm_telemetry.js        # Token and phase usage reporting
│   └── token_profiler.js         # Static token sizing analysis
├── skills/                       # Curated Phase Workflows (25 skills)
│   ├── code-graph/               # Codebase structural dependency mapper
│   ├── delegate/                 # One-shot I/O offload to sub-agents
│   ├── design/                   # PRD & screen design specs from validated ideas
│   ├── develop/                  # Core MVP workflow (spec → impl → QA → docs)
│   ├── doc-graph/                # Document relationship & traceability graph
│   ├── explore-game-idea/        # Game concept market & competitor research
│   ├── explore-idea/             # Concept validation via market & user research
│   ├── find-skills/              # Discover and install agent skills
│   ├── grill-me/                 # Socratic alignment interviewer
│   ├── help-me/                  # Dynamic next-step project state navigator
│   ├── humanize/                 # AI-writing tell elimination
│   ├── incident/                 # Production incident triage, RCA, post-mortem
│   ├── iterate/                  # Post-launch feature iteration & data analysis
│   ├── kanban/                   # Kanban board display & task tracking
│   ├── launch/                   # Go-to-market coordination & release readiness
│   ├── memory/                   # Search archived (compacted) memory entries
│   ├── phase/                    # Current phase display, switch, artifact listing
│   ├── plan/                     # Standalone execution plan from existing specs
│   ├── retro/                    # Post-cycle review, lessons, memory compaction
│   ├── review/                   # Standalone code review on current changes
│   ├── squad/                    # Squad preset listing, switching, initialization
│   ├── status/                   # Quick project state snapshot
│   ├── test/                     # Run tests and summarize failures
│   ├── validate-game-idea/       # Socratic diagnostic for game concepts
│   └── validate-idea/            # Socratic diagnostic for startup/company ideas
├── squads/                       # Squad Preset Configurations
│   ├── full-team.md
│   ├── startup.md
│   ├── build.md
│   ├── research.md
│   ├── design.md
│   ├── ship.md
│   └── game-studio.md
├── templates/                    # Markdown Output Templates (39 templates)
│   ├── active-decisions-template.md
│   ├── adr-template.md
│   ├── analytics-insights-template.md
│   ├── blockers-and-risks-template.md
│   ├── competitive-analysis-template.md
│   ├── execution-plan-template.md
│   ├── game-competitive-analysis-template.md
│   ├── game-idea-brief-template.md
│   ├── game-market-analysis-template.md
│   ├── game-user-personas-template.md
│   ├── game-validation-brief-template.md
│   ├── go-nogo-decision-template.md
│   ├── idea-brief-template.md
│   ├── incident-triage-template.md
│   ├── iteration-backlog-template.md
│   ├── iteration-results-template.md
│   ├── kanban-template.md
│   ├── launch-log-template.md
│   ├── lessons-learned-template.md
│   ├── market-analysis-template.md
│   ├── measurement-plan-template.md
│   ├── memory-entry-template.md
│   ├── patterns-and-conventions-template.md
│   ├── post-incident-review-template.md
│   ├── post-launch-report-template.md
│   ├── prd-template.md
│   ├── product-spec-template.html
│   ├── product-spec-template.md
│   ├── project-context-template.md
│   ├── rca-template.md
│   ├── release-notes-template.md
│   ├── release-readiness-template.md
│   ├── retrospective-template.md
│   ├── session-summary-template.md
│   ├── user-personas-template.md
│   ├── user-story-template.md
│   ├── ux-research-report-template.md
│   └── validation-brief-template.md
├── GUARDRAILS.md                 # Shared safety rules & Change Request protocol
├── skills.md                     # Skills catalog registry
└── workflow.md                   # Full Execution graph and handoff contracts
```

> [!NOTE]
> `tests/` lives at the workspace root (extracted during Phase 1) and is excluded by not being in the `"files"` array.

---

## 4. Custom Harness Linker Strategy

By making the `.agents/` folder and root `AGENTS.md` / `agent.md` files mandatory core outputs:
- **Amp**, **Antigravity**, **Cline**, **Codex**, **Cursor**, **Deep Agents**, **Dexto**, **Firebender**, **Gemini CLI**, **GitHub Copilot**, **Kimi Code CLI**, **OpenCode**, **Warp**, and **Zed** (which use `.agents/` folders natively out-of-the-box) are **supported natively out-of-the-box** on every single install and always included during installation.
- The installer CLI only prompts for **optional integrations** that require special symlinking or file compilation:

| Optional Harness Integration | Target Path | Link Mode | Link Source | Description / Notes |
|:---|:---|:---|:---|:---|
| **opencode** | `.opencode` | Folder Symlink | `.agents` | opencode expects `.opencode/`. Points directly to `.agents/`. |
| **Claude Code** | `.claude` | Folder Symlink | `.agents` | Claude Code reads subagents from `.claude/agents/` and commands from `.claude/commands/`. Points directly to `.agents/`. |
| **Claude Code** | `CLAUDE.md` | File Bootstrap | Template | `CLAUDE.md` is Claude Code's project memory file. Scaffolded at project root with Vespyr agent invocation instructions. |
| **Cursor** | `.cursor/rules/` | File Transpilation | `.agents/agents/*.md` | *See Section 6 for MDC Transpilation.* |
| **Windsurf** | `.windsurfrules` | File Symlink | `.agents/GUARDRAILS.md` | Windsurf expects a global `.windsurfrules`. We link it directly. |
| **Windsurf** | `.windsurf/workflows/` | Folder Symlink | `.agents/skills` | Windsurf looks for workflows in `.windsurf/workflows/`. We link it to skills. |
| **GitHub Copilot** | `.github/agents/` | File Transpilation | `.agents/agents/*.md` | *See Section 6 for YAML Transpilation.* |
| **GitHub Copilot** | `.github/copilot-instructions.md` | File Symlink | `AGENTS.md` | repository-level context is linked directly to `AGENTS.md`. |
| **Kiro** | `.kiro/steering/` | Folder Symlink | `.agents/agents` | Kiro consumes manual steering rules inside `.kiro/steering/` directly. |

---

## 5. Interactive Installer CLI (`bin/cli.js`) Specification

The installer CLI will be written in pure, native Node.js to achieve **Zero Dependencies** for maximum speed, robustness, and ease of execution.

### Global Welcome Art Display:
To establish a premium, branded console experience, the beautiful custom bubbly ASCII art is **always printed first** at the very top of the CLI console as soon as `npx vespyr` executes, regardless of whether it goes into a fresh installation or an existing action menu:

```
  __  __                                         
 /\ \/\ \                                        
 \ \ \ \ \     __    ____  _____   __  __  _ __  
  \ \ \ \ \  /'__`\ /',__\/\ '__`\/\ \/\ \/\`'__\
   \ \ \_/ \/\  __//\__, `\ \ \L\ \ \ \_\ \ \ \/ 
    \ `\___/\ \____\/\____/\ \ ,__/\/`____ \ \_\ 
     `\/__/  \/____/\/___/  \ \ \/  `/___/> \/_/ 
                             \ \_\     /\___/    
                              \/_/     \/__/
```

### CLI Auto-Detection & Lifecycle (Update/Uninstall):
When the user executes `npx vespyr` in a target directory, the CLI automatically checks if `.agents/` already exists in that folder.
- **If NOT Installed**: The CLI prints the ASCII art and goes directly into the Interactive Installation Flow.
- **If Already Installed**: The CLI prints the ASCII art and displays the following **Action Menu**:
  ```
  ====================================================
     VESPYR v1.7.0 — AI Agent Team CLI
  ====================================================
  Vespyr is already configured in this directory.
  
  Select an action:
  ❯ 1 - Update Vespyr (Sync latest agent prompts, scripts, and skills)
    2 - Reconfigure (Re-run interactive setup / add or remove harnesses)
    3 - Uninstall Vespyr (Cleanly remove all Vespyr folders and files)
  ```
  
  #### Command Implementations:
  - **Action 1 (Update)**: Overwrites the `.agents/` folder with the latest packed agent files, templates, scripts, references, and workflows. It **preserves** the user's `artifacts/` history and custom stack in `project-context.md`. It then automatically **re-compiles** all configured harness files (regenerating Cursor `.mdc`, Copilot `.yml`, and Kiro steering links) to ensure they are fully synchronized with the updated master files!
  - **Action 2 (Reconfigure)**: Re-runs the interactive prompts so the user can toggle additional harness checklist configurations.
  - **Action 3 (Uninstall - Data Preserving)**:
    - **No Deletion of Artifacts**: Under no circumstances will uninstallation delete the `artifacts/` directory or its subfolders (`output/`, `memory/`, `telemetry/`, `input/`, etc.). All research, strategy documents, PM specifications, system designs, and shared context logs are permanently preserved.
    - Cleanly deletes the `.agents/` master folder.
    - Cleanly deletes all symlinks and compiled directories (`.opencode`, `.claude`, `.cursor/rules/*.mdc` rules generated by Vespyr, `.github/agents/`, `.github/copilot-instructions.md`, `.windsurf/workflows`, `.windsurfrules`, `.kiro/steering/`).
    - Cleanly deletes root `AGENTS.md`, `agent.md`, and `CLAUDE.md`.

---

### Premium Bmad-Style Checklist Selector UX:
To give the user an extremely premium interactive experience without heavy third-party packages, `cli.js` will implement a native **Interactive Checklist Renderer** using Node's keypress events in raw mode:
- **Checklist Presentation**: Checks are rendered dynamically in the terminal with colored status glyphs (`◯` for unchecked, `◉` or `✔` for checked).
- **Navigation**: The user can move the pointer (`❯`) Up and Down using standard `Up` / `Down` arrow keys.
- **Toggle selection**: Pressing `Space` toggles the checkbox of the currently highlighted item.
- **Submit**: Pressing `Enter` submits the choices and moves to the next step.

### CLI User Experience Flow:
1. **ASCII Welcome Header**:
   *Always printed first (as specified in Global Welcome Art Display).*
   ```
   ====================================================
      VESPYR v1.7.0 — AI Agent Team Installer
   ```
2. **Harness Checklist Selector (Interactive Checkboxes)**:
   - "Select harness integrations to configure (Space to toggle, Enter to confirm):"
      - `✔ Core Agent Directory (natively supported by: Amp, Antigravity, Cline, Codex, Cursor, Deep Agents, Dexto, Firebender, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode, Warp, Zed, etc.) [Mandatory]` (Locked/pre-selected; Space key is disabled)
     - `◯ opencode` (scaffolds `.opencode` -> `.agents` symlink)
     - `◯ Claude Code` (scaffolds `.claude` -> `.agents` symlink)
     - `◯ Cursor Rules` (scaffolds `.cursor/rules/*.mdc` rules with metadata)
     - `◯ GitHub Copilot & CLI` (scaffolds `.github/agents/*.yml` compiled rules)
     - `◯ Windsurf` (scaffolds `.windsurf/workflows` symlink & `.windsurfrules` symlink)
     - `◯ Kiro Steering` (scaffolds `.kiro/steering/` manual rule folder)

3. **Installation Scope & Method Selector**:
    - **Step 3.1 (Installation Scope)**:
      - "Select installation scope:"
        - `❯ 1 - Project-level (Install in current workspace)`
        - `  2 - Global (Install in user home/global environment paths)`
    
    - **Step 3.2 (Installation Method)**:
      - "Select installation method:"
        - `❯ 1 - Symlink (Recommended - references the master folder, allowing prompt updates to automatically propagate)`
        - `  2 - Copy (Static copy of all agent folders and files)`
    
    - **Step 3.3 (If Global chosen)**:
     - The installer searches standard environment paths for the user's OS and selected harnesses:
       - Antigravity / General CLI: `~/.agents/`
       - Claude Code: `~/.claude/`
       - Cursor (macOS): `~/Library/Application Support/Cursor/User/globalRules/`
       - Cursor (Linux): `~/.config/Cursor/User/globalRules/`
       - opencode: `~/.opencode/`
       - GitHub Copilot: `~/.config/github-copilot/`
       - Windsurf: `~/.windsurf/`
       - Kiro: `~/.kiro/`
     - Establishes symlinks or copies files globally depending on the selected installation method.
   
    - **Step 3.4 (If Project-level chosen)**:
     - "Select target directory:"
       - `❯ 1 - Current directory (.)`
        - `  2 - Custom path (Enter a custom folder path)`

4. **Personalization Prompt (Becoming More Human)**:
   - Prompt: `What should the agent squad call you? (e.g., Christian, Sarah) [Default: User]: `
   - If user hits Enter without input, defaults to `"User"`.
   - Stored as `userNickname` and dynamically injected into `artifacts/memory/project-context.md`.

### Extraction Mechanism
The `.agents/` folder is bundled inside the npm package. At runtime, `cli.js` locates it relative to itself:
```js
const AGENTS_SRC = path.join(__dirname, '..', '.agents');
```
On `npx vespyr`, npm downloads and extracts the package to a temp cache. The `bin/cli.js` entry point uses `path.resolve(__dirname, '..')` to find the bundled `.agents/` directory regardless of where npm cached it.

The install operation is a recursive copy (not a symlink) from the bundled `.agents/` into the target directory:
1. **Copy**: `fs.cpSync(AGENTS_SRC, TARGET + '/.agents', { recursive: true })` — only `.md`, `.js`, `.json` files are needed; `node_modules/` is excluded per `.npmignore`.
2. **Atomicity**: Copy to a temp directory first (`cpSync` → temp), then `fs.renameSync(temp, target)` for atomic placement on the same filesystem.
3. **Permissions**: Files are copied with read/write permissions (0o644 for files, 0o755 for dirs). Scripts (`.js` files in `scripts/`) keep the execute bit.

### Symlink Creation (Cross-Platform)
Node.js `fs.symlinkSync()` handles platform differences:

| Platform | `fs.symlinkSync(target, path, 'dir')` behavior |
|:---|:---|
| **macOS / Linux** | Creates a POSIX symlink. No special privileges required. |
| **Windows (non-admin)** | Creates a **junction** (directory junction) when `'dir'` type is specified. Requires no elevation. |
| **Windows (admin)** | Creates a **directory symlink**. Prefer junctions for broader compatibility. |

File symlinks (for `.windsurfrules`, `.github/copilot-instructions.md`) use `fs.symlinkSync(target, path, 'file')`:
- macOS/Linux: POSIX symlink
- Windows: File symlink (requires admin or Developer Mode enabled). If file symlinks fail, fall back to copying the file.

```js
function createLinkOrCopy(target, linkPath, type = 'dir', method = 'symlink') {
  if (method === 'copy') {
    try {
      if (type === 'dir') {
        fs.cpSync(target, linkPath, { recursive: true });
      } else {
        fs.copyFileSync(target, linkPath);
      }
    } catch (err) {
      throw err;
    }
  } else {
    try {
      fs.symlinkSync(target, linkPath, type);
    } catch (err) {
      if (err.code === 'EPERM' && type === 'file' && process.platform === 'win32') {
        // Fallback: copy file on Windows without symlink privileges
        fs.copyFileSync(target, linkPath);
        console.warn(`  ⚠ Symlink failed, copied file instead: ${linkPath}`);
      } else {
        throw err;
      }
    }
  }
}
```

### Conflict Detection & Resolution
Before creating any symlink or copying any file, the installer checks for existing targets and handles them:

| Conflict | Detection | Resolution |
|:---|:---|:---|
| **Real directory at `.opencode/`** | `fs.existsSync('.opencode') && !fs.lstatSync('.opencode').isSymbolicLink()` | Warn user, offer to back up to `.opencode.backup/` before replacing with symlink. Abort if user declines. |
| **Real directory at `.claude/`** | Same as above | Same backup strategy. |
| **Existing symlink at `.opencode/`** | `fs.lstatSync('.opencode').isSymbolicLink()` | Check if it already points to `.agents/`. If yes, skip. If it points elsewhere, warn and ask to overwrite. |
| **Existing `.cursor/rules/`** | `fs.existsSync('.cursor/rules')` | If it exists, merge — add Vespyr `.mdc` files without touching existing rules. |
| **Existing `.github/agents/`** | `fs.existsSync('.github/agents')` | Same merge strategy — add Vespyr `.yml` files alongside existing agent configs. |
| **Existing `.windsurfrules`** | `fs.existsSync('.windsurfrules') && !fs.lstatSync('.windsurfrules').isSymbolicLink()` | Copy to `.windsurfrules.backup`, then replace with symlink. |
| **`.agents/` already exists (update flow)** | `fs.existsSync('.agents')` | Trigger the Action Menu (Section 5, CLI Auto-Detection). Never overwrite without explicit user confirmation. |

### Dry-Run Mode (`--dry-run`)
```bash
npx vespyr --dry-run
```
When `--dry-run` is passed:
- Prints every action that **would** be taken without executing any of them.
- Format: `[DRY RUN] Would create symlink: .opencode -> .agents`
- Useful for CI pipelines and cautious users.
- Detected via `process.argv.includes('--dry-run')`.

### Flags Reference
| Flag | Effect |
|:---|:---|
| `--dry-run` | Preview all actions without making changes |
| `--yes` / `-y` | Skip all interactive prompts, use defaults (full-team, local install in CWD, no optional harnesses) |
| `--target <path>` | Specify installation directory, skip path prompt |
| `--harness <name>` | Pre-select harness(es), comma-separated: `--harness opencode,claude` |
| `--version` / `-v` | Print version and exit |
| `--help` / `-h` | Print usage and exit |

### Error Handling Strategy
All file operations are wrapped in try/catch with user-friendly messages:

| Error Class | User Message | Exit Code |
|:---|:---|:---|
| `EACCES` / `EPERM` | `Permission denied. Try running with appropriate privileges or check directory ownership.` | 1 |
| `ENOSPC` | `Not enough disk space to complete installation.` | 1 |
| `EEXIST` (conflict) | Handled by Conflict Resolution flow above — no hard exit. | N/A |
| `ENOENT` (invalid path) | `The specified path does not exist. Create it first or choose a different directory.` | 1 |
| Unexpected error | `Installation failed: [error.message]. Run with --dry-run to debug, or report at github.com/anomalyco/vespyr/issues.` | 1 |

All errors ensure no partial state — if any step fails after files have been written, the installer rolls back by deleting `.agents/` and any created symlinks before exiting.

---

## 6. Harness Transpilation/Conversion Engines

Only two harnesses require active prompt conversions because they do not consume raw markdown prompts directly: **GitHub Copilot** (expects YAML format under `.github/agents/`) and **Cursor** (expects `.mdc` format with specific frontmatter keys under `.cursor/rules/`). All other harnesses consume standard markdown.

### 6.1 GitHub Copilot YAML Conversion Engine
For each agent prompt `.agents/agents/*.md`, the script:
1. Parses the Markdown frontmatter.
2. Formats a new YAML file using:
   - `name`: agent basename
   - `description`: frontmatter description
   - `instructions`: the entire prompt text wrapped in a multiline block (`|`)
   - `tools`: maps codebase capabilities if `edit` or `bash` was enabled
3. Writes the output file under `.github/agents/{agent-name}.yml`.

**Implementation** (`cli.js` inline function, no separate file needed):
```js
function transpileCopilotYAML(agentsDir, outputDir) {
  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const { data, body } = parseFrontmatter(content);
    const name = path.basename(file, '.md');

    const yml = [
      `name: ${name}`,
      `description: "${(data.description || '').replace(/"/g, '\\"')}"`,
      `instructions: |`,
      ...body.split('\n').map(line => `  ${line}`),
      
    ].join('\n');

    fs.writeFileSync(path.join(outputDir, `${name}.yml`), yml);
  }
}
```

**Frontmatter parser** (shared by both transpilation engines):
```js
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };
  const data = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const kv = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1].trim();
      data[currentKey] = kv[2].trim();
    }
  }
  return { data, body: content.substring(match[0].length).trim() };
}
```

### 6.2 Cursor MDC Conversion Engine
Cursor `.mdc` files require specific frontmatter (`globs`, `alwaysApply`) to execute correctly inside Cursor's rule matching engine. Rather than linking `.md` files directly (which causes extension matching issues), the installer reads `.agents/agents/*.md` and generates a translated `.mdc` rule for each:

1. **Parse Markdown Frontmatter**: Reads `description`.
2. **Translate to Cursor MDC Keys**:
   - `globs`: Configured to `*` by default so the agent context is pullable/summonable anywhere.
   - `alwaysApply`: Set to `false` (we want the rules to be requested on-demand when the user mentions `@agent-name` in the Cursor chat pane, rather than polluting every single query with 21 agent prompts).
3. **Embed Rules Body**: Emits the exact agent instructions.
4. **Link/Write output**: Saves to `.cursor/rules/{agent-name}.mdc`.

**Implementation** (inline in `cli.js`):
```js
function transpileCursorMDC(agentsDir, outputDir) {
  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const { data, body } = parseFrontmatter(content);
    const name = path.basename(file, '.md');

    const mdc = [
      '---',
      `description: "${(data.description || '').replace(/"/g, '\\"')}"`,
      'globs: "*"',
      'alwaysApply: false',
      '---',
      '',
      body
    ].join('\n');

    fs.writeFileSync(path.join(outputDir, `${name}.mdc`), mdc);
  }
}
```

**Transpilation Errors**: If frontmatter parsing fails for an agent file, the transpiler logs a warning `⚠ Skipping ${file}: no frontmatter found` and continues with the next file. The installer never fails wholesale because of a single bad agent prompt.

---

## 7. Adjustments to the `/init` Command (`init.md`)

The `/init` command inside `.agents/commands/init.md` will be rewritten to dynamically adapt its generated files based on the detected or active harness. Below is the complete specification:

```markdown
# /init — Bootstrap a Vespyr-Powered Project

## What this command does

Initializes a project for use with the Vespyr multi-agent engine. It analyzes the target directory, generates a `project-context.md`, and dynamically scaffolds the root reference files (`AGENTS.md`, `agent.md`, and `CLAUDE.md`) using a unified format but with paths tailored to the detected harnesses.

## When to use

- Fresh install of Vespyr in a new or existing project
- First time setting up a project after cloning from a template
- Re-initializing after major structural changes

## Workflow

### Step 1: Analyze the project

Use `@reader` to scan the project root and determine:
1. **Project name**: `path.basename(cwd)`
2. **Stack**: Check for `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`, etc.
3. **Git remote**: Run `git remote get-url origin` to detect repository URL.
4. **Existing configs**: Check for CI files, lint configs, test frameworks.

### Step 2: Generate project-context.md

Create or update `artifacts/memory/project-context.md`:

```markdown
# Project Context

## Identity
- **Project Name**: {detected-name}
- **Repository**: {detected-repo-url}
- **User Nickname**: {user-nickname}
- **Created**: {iso-date}

## Technical
- **Stack**: {detected-stack}
- **Architecture**: {inferred-or-none}
- **Constraints**: None recorded

## Team
- **Squad**: full-team
- **Operation Mode**: semi-autonomous
- **Active Agents**: 21 (full-team preset)

## Memory
- **Lessons Learned**: None yet
- **Active Decisions**: None yet
```

### Scaffolding Logic
```js
function scaffoldArtifacts(targetDir, projectName) {
  const artifactsDir = path.join(targetDir, 'artifacts');
  if (fs.existsSync(artifactsDir)) return; // Never overwrite existing artifacts

  const dirs = [
    'directions',
    'input/data', 'input/designs', 'input/documents', 'input/example', 'input/flows',
    'memory/agent-notes', 'memory/archive', 'memory/pending-questions', 'memory/structural',
    'output/01-research', 'output/02-strategy', 'output/03-architecture',
    'output/04-planning', 'output/05-execution', 'output/06-quality',
    'output/07-infrastructure', 'output/08-documentation',
    'telemetry'
  ];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(artifactsDir, dir), { recursive: true });
  }

  // .gitkeep for empty directories that should be tracked
  fs.writeFileSync(path.join(artifactsDir, 'memory/pending-questions/.gitkeep'), '');

  // project-context.md
  const context = `# Project Context

## Identity
- **Project Name**: ${projectName}
- **Repository**: None (not a git repository)
- **Created**: ${new Date().toISOString().split('T')[0]}

## Technical
- **Stack**: None (Starting from scratch)
- **Architecture**: Not yet defined
- **Constraints**: None recorded

## Team
- **Squad**: full-team
- **Operation Mode**: semi-autonomous
- **Active Agents**: 21 (full-team preset)

## Memory
- **Lessons Learned**: None yet
- **Active Decisions**: None yet
`;

  fs.writeFileSync(path.join(artifactsDir, 'memory', 'project-context.md'), context);
}
```

---

## 10. `AGENTS.md`, `agent.md` & `CLAUDE.md` Bootstrap Templates

The canonical template content lives in `.opencode/commands/` (installed as `.agents/commands/`):

| Template File | Target | Purpose |
|:---|:---|:---|
| `scaffold-agents.md` | `AGENTS.md` | Harness-agnostic agent roster, invocation guidelines, memory protocol |
| `scaffold-agent.md` | `agent.md` | Agent quick-reference (identical to AGENTS.md except prompt references `agent.md`) |
| `scaffold-claude.md` | `CLAUDE.md` | Claude Code harness project memory (scaffolded only when Claude Code is selected) |

### Bootstrap Logic
```js
function bootstrapRootDocs(targetDir, projectName, selectedHarnesses) {
  const commandsDir = path.join(targetDir, '.agents', 'commands');

  // AGENTS.md and agent.md — always scaffolded
  const agentsMd = fs.readFileSync(path.join(commandsDir, 'scaffold-agents.md'), 'utf8')
    .replace('{Project Name}', projectName);
  const agentMd = fs.readFileSync(path.join(commandsDir, 'scaffold-agent.md'), 'utf8');

  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const agentPath = path.join(targetDir, 'agent.md');
  if (!fs.existsSync(agentsPath)) fs.writeFileSync(agentsPath, agentsMd);
  if (!fs.existsSync(agentPath))  fs.writeFileSync(agentPath, agentMd);

  // CLAUDE.md — only when Claude Code harness is selected
  if (selectedHarnesses.includes('claude')) {
    const claudeMd = fs.readFileSync(path.join(commandsDir, 'scaffold-claude.md'), 'utf8');
    const claudePath = path.join(targetDir, 'CLAUDE.md');
    if (!fs.existsSync(claudePath)) fs.writeFileSync(claudePath, claudeMd);
  }
}
```

### Key Differences Between Templates

| Aspect | `AGENTS.md` | `agent.md` | `CLAUDE.md` |
|:---|:---|:---|:---|
| **Header** | `{Project Name} — Vespyr Multi-Agent Engine` | `Vespyr — Multi-Agent Engine` | `CLAUDE.md — Vespyr Multi-Agent Engine` |
| **Prompt pattern** | References `this document` | References `agent.md` | References `CLAUDE.md` |
| **Harness paths** | `.opencode/agents/` | `.opencode/agents/` | `.claude/agents/` |
| **Skills paths** | `.opencode/skills/` | `.opencode/skills/` | `.claude/skills/` |
| **When scaffolded** | Always | Always | Only if Claude Code selected |

---

## 11. Migration Path for Existing Users

Users who previously ran Vespyr from a cloned repository (with `.opencode/` at the project root) need a migration path. The installer detects this scenario and offers guided migration.

### Detection
The CLI checks for the following signals (in order):
1. `.opencode/` exists as a **real directory** (not a symlink) AND `.agents/` does NOT exist → **Migrate scenario**
2. `.agents/` exists → **Already installed** (Action Menu)
3. Neither exists → **Fresh install**

### Migration Flow
When the migrate scenario is detected:
```
============================================================
   VESPYR v1.7.0 — Migration Detected
============================================================
An existing .opencode/ directory was found. This appears to be
a pre-v1.7.0 Vespyr installation (cloned repo style).

Vespyr v1.7.0 uses .agents/ as the canonical folder with
optional harness symlinks. We can migrate your setup.

Select an action:
❯ 1 - Migrate (Rename .opencode/ to .agents/, create .opencode symlink)
  2 - Fresh install (Back up .opencode/ to .opencode.backup/, start fresh)
  3 - Cancel (Keep everything as-is)
```

### Migration Steps (Action 1)
1. **Backup**: Copy `.opencode/` to `.opencode.backup.{timestamp}/` as a safety net.
2. **Rename**: `fs.renameSync('.opencode', '.agents')` — atomic on same filesystem.
3. **Extract tests**: `fs.renameSync('.agents/tests', 'tests')` — moves test files to workspace root. Tests are for engine development only and should not live inside the installed `.agents/` folder.
4. **Symlink**: `fs.symlinkSync('.agents', '.opencode', 'dir')` — preserves backward compatibility for opencode harness.
5. **Path updates**: Run the Phase 2 path adjustments (Section 8) against `.agents/` contents in-place. Since the user's files may have custom modifications, use regex replacement rather than wholesale overwrite:
   ```js
   function updatePathsInDir(dir) {
     for (const entry of walkSync(dir)) {
       if (!entry.endsWith('.md') && !entry.endsWith('.js')) continue;
       let content = fs.readFileSync(entry, 'utf8');
       content = content.replace(/\.opencode\//g, '.agents/');
       fs.writeFileSync(entry, content);
     }
   }
   ```
6. **Preserve artifacts**: `artifacts/` is never touched during migration.
7. **Report**: Print a summary of what was changed.

### Migration Constraints
- Migration is **one-way**. There is no "undo migration" beyond restoring from `.opencode.backup.{timestamp}/`.
- Custom user modifications to agent files are preserved (regex replacement is surgical).
- If the user has a root `opencode.json`, it is **not modified** (it already lives outside `.opencode/`).

---

## 12. Publishing & CI/CD Workflow

### GitHub Actions Release Workflow (`.github/workflows/publish.yml`)
```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for npm provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Release Process
1. **Bump version**: Update `version` in root `package.json` to the next semver (e.g., `1.7.0` → `1.7.1`).
2. **Commit**: `git commit -m "chore: bump to v1.7.1"`
3. **Tag**: `git tag v1.7.1`
4. **Push**: `git push origin main --tags`
5. **GitHub Actions** triggers on the tag, runs `npm publish`, and creates a GitHub Release automatically.

### Pre-Publish Checklist (Manual)
- [ ] All Phase 2 path updates verified (no `.opencode` references remain in `AGENTS.md`, `agent.md`, `README.md`, scripts)
- [ ] `.npmignore` present and excludes `node_modules/`, `tests/`
- [ ] `bin/cli.js` tested with `node ./bin/cli.js --dry-run`
- [ ] Full verification (Section 16) passes in a clean `test-project/`
- [ ] `npm pack --dry-run` shows only expected files
- [ ] Version in root `package.json` matches the git tag

### Distribution
- **npm**: `npm install -g vespyr` or `npx vespyr`
- **pnpm**: `pnpm dlx vespyr`
- **yarn**: `yarn dlx vespyr`
- **bun**: `bunx vespyr`
- **Homebrew**: Not required. `npx` provides zero-install execution. A brew tap can be added later if user demand warrants it.

---

## 13. Error Handling, Edge Cases & Conflict Resolution

### Comprehensive Error Table

| Scenario | Detection | Behavior | Exit Code |
|:---|:---|:---|:---|
| Target directory doesn't exist | `!fs.existsSync(targetDir)` | Prompt user to create it or choose another path | N/A (prompt loop) |
| Target is a file, not a directory | `fs.statSync(targetDir).isFile()` | Error: `"{path}" is a file, not a directory. Choose a different target.` | 1 |
| No write permission to target | `EACCES` on `fs.mkdirSync` | Error: `Permission denied. Check directory ownership.` | 1 |
| Disk full | `ENOSPC` on `fs.writeFileSync` | Error: `Not enough disk space.` | 1 |
| `.opencode/` is a real dir (migrate) | `fs.existsSync('.opencode') && !symlink` | Offer migration flow (Section 11) | N/A |
| `.opencode/` is a symlink to somewhere else | `symlink && readlink !== '.agents'` | Warn: `Symlink .opencode points to {other}. Overwrite?` | N/A (prompt) |
| `.claude/` is a real dir | Same as `.opencode/` | Offer backup + replace | N/A |
| `.cursor/rules/` already has files | `fs.existsSync` + `readdir` non-empty | Merge: add new `.mdc` files without deleting existing ones | 0 |
| `.github/agents/` already has files | Same as cursor rules | Merge: add new `.yml` files alongside existing ones | 0 |
| `.windsurfrules` is a real file | `fs.existsSync && !symlink` | Backup to `.windsurfrules.backup`, replace with symlink | 0 (with warning) |
| Symlink creation fails (Windows, no dev mode) | `EPERM` on `fs.symlinkSync` | Fall back to file copy for file symlinks. For directory symlinks, warn and skip: `⚠ Could not create symlink: .opencode (requires admin or Developer Mode on Windows). Skipping.` | 0 (partial install) |
| Agent file has no frontmatter | `parseFrontmatter` returns empty data | Warn: `⚠ Skipping {file}: no frontmatter found`; skip that file in transpilation | 0 |
| Agent file has malformed YAML in frontmatter | `parseFrontmatter` throws | Warn and skip, same as above | 0 |
| Interrupted installation (Ctrl+C) | SIGINT handler | Clean up partial `.agents/` and any created symlinks. Print: `Installation cancelled. No changes were made.` | 130 |
| `npx` cache has stale package | npm handles this natively | `npx vespyr@latest` always fetches the latest | N/A |
| User runs `npx vespyr` with `--yes` + `--target` | CLI flags provided | Skip all interactive prompts, install directly | 0 |
| `project-context.md` already exists | `fs.existsSync` | Never overwrite. Log: `Existing project-context.md found, skipping.` | 0 |

### Partial Install Recovery
If the installer crashes mid-operation, the user can safely re-run it. The installer uses these guards:
1. `artifacts/` is never deleted or overwritten.
2. `.agents/` is deleted and replaced on update, but never on first install (first install by definition has no `.agents/` yet).
3. Symlinks are idempotent — if the symlink already points to `.agents/`, skip it.
4. If `.agents/` exists but is incomplete, the user can run Action 1 (Update) from the Action Menu to re-extract a clean copy.

### Signal Handling
```js
let installed = false;
process.on('SIGINT', () => {
  if (installed) {
    // Partial install — rollback
    if (fs.existsSync(targetAgentsDir)) fs.rmSync(targetAgentsDir, { recursive: true });
    // Remove any created symlinks
    for (const link of createdLinks) {
      if (fs.existsSync(link)) fs.unlinkSync(link);
    }
    console.log('\nInstallation cancelled. No changes were made.');
  }
  process.exit(130);
});
```

---

## 14. Post-Install Summary Output

After a successful install, the CLI prints a summary showing exactly what was done and next steps:

```
============================================================
   VESPYR v1.7.0 — Installation Complete
============================================================

  Target:       /Users/you/my-project
  Squad:        full-team (21 agents)
  Harnesses:    opencode, claude-code, cursor

  Created:
    ✓ .agents/                        (core agent engine)
    ✓ .opencode -> .agents            (opencode harness)
    ✓ .claude -> .agents             (Claude Code harness)
    ✓ .cursor/rules/*.mdc            (21 Cursor rules)
    ✓ artifacts/                      (memory + output directories)
    ✓ AGENTS.md                       (harness-agnostic guide)
    ✓ agent.md                        (agent quick reference)

  Next steps:
    1. Run /init to bootstrap your project context
    2. Use @squad to view or switch team presets
    3. Use @help-me for a tailored navigation report
    4. Type @founder "your idea" to stress-test a concept

  Docs: https://github.com/anomalyco/vespyr
  Report issues: https://github.com/anomalyco/vespyr/issues
============================================================
```

### Summary Logic
```js
function printSummary(targetDir, selections) {
  const lines = [
    `\n============================================================`,
    `   VESPYR v1.7.0 — Installation Complete`,
    `============================================================`,
    ``,
    `  Target:       ${targetDir}`,
    `  Squad:        full-team (21 agents)`,
    `  Harnesses:    ${selections.harnesses.join(', ') || 'core only'}`,
    ``,
    `  Created:`,
    `    ✓ .agents/                        (core agent engine)`,
  ];

  // Add harness-specific lines
  if (selections.harnesses.includes('opencode'))
    lines.push(`    ✓ .opencode -> .agents            (opencode harness)`);
  if (selections.harnesses.includes('claude')) {
    lines.push(`    ✓ .claude -> .agents             (Claude Code harness)`);
    lines.push(`    ✓ CLAUDE.md                      (Claude Code project memory)`);
  }
  if (selections.harnesses.includes('cursor'))
    lines.push(`    ✓ .cursor/rules/*.mdc            (21 Cursor rules)`);
  if (selections.harnesses.includes('github'))
    lines.push(`    ✓ .github/agents/*.yml           (21 Copilot agents)`);
  if (selections.harnesses.includes('windsurf'))
    lines.push(`    ✓ .windsurf/workflows -> skills  (Windsurf workflows)`);
  if (selections.harnesses.includes('kiro'))
    lines.push(`    ✓ .kiro/steering -> agents       (Kiro steering)`);

  lines.push(
    `    ✓ artifacts/                      (memory + output directories)`,
    `    ✓ AGENTS.md                       (harness-agnostic guide)`,
    `    ✓ agent.md                        (agent quick reference)`,
    ``,
    `  Next steps:`,
    `    1. Run /init to bootstrap your project context`,
    `    2. Use @squad to view or switch team presets`,
    `    3. Use @help-me for a tailored navigation report`,
    `    4. Type @founder "your idea" to stress-test a concept`,
    ``,
    `  Docs: https://github.com/anomalyco/vespyr`,
    `  Report issues: https://github.com/anomalyco/vespyr/issues`,
    `============================================================`
  );

  console.log(lines.join('\n'));
}
```

---

## 15. Unit Test Specification

`cli.js` is a single-file zero-dependency module. All tests are written using Node's built-in `node:test` runner (no Jest/Mocha dependency). Test files live in `tests/` at the workspace root. Run with:

```bash
node --test tests/
```

### Test 1: `parseFrontmatter()`
| Case | Input | Expected |
|:---|:---|:---|
| Valid frontmatter | `"---\nname: founder\ndescription: Tests ideas\n---\n# Body"` | `{ data: { name: 'founder', description: 'Tests ideas' }, body: '# Body' }` |
| No frontmatter | `"# Just a heading"` | `{ data: {}, body: '# Just a heading' }` |
| Empty frontmatter | `"---\n---\n# Body"` | `{ data: {}, body: '# Body' }` |
| Frontmatter with comments | `"---\nname: editor\n# comment\ntype: subagent\n---\nBody"` | `{ data: { name: 'editor', type: 'subagent' }, body: 'Body' }` |
| CRLF line endings | Same as valid, `\r\n` instead of `\n` | Same output as valid |
| Missing closing `---` | `"---\nname: test\nBody"` | `{ data: {}, body: '---\nname: test\nBody' }` (graceful fallback) |

### Test 2: `transpileCopilotYAML()`
| Case | Input | Expected |
|:---|:---|:---|
| Single agent | `founder.md` with `description: "Validates ideas"` | `.github/agents/founder.yml` with `name: founder`, `description: "Validates ideas"`, `instructions: \|` + body |
| 21 agents | Full `.agents/agents/` directory | 21 `.yml` files, all parseable YAML |
| Agent with no description | `agent.md` with no `description` field | `.yml` with `description: ""` (empty string, no crash) |
| Agent with quotes in description | `description: 'She said "hello"'` | `.yml` with `description: "She said \\"hello\\""` (escaped) |

### Test 3: `transpileCursorMDC()`
| Case | Input | Expected |
|:---|:---|:---|
| Single agent | `founder.md` with frontmatter | `.cursor/rules/founder.mdc` with `globs: "*"`, `alwaysApply: false`, frontmatter + body |
| 21 agents | Full directory | 21 `.mdc` files, all with correct frontmatter keys |
| Agent missing from source | `404.md` doesn't exist | Skipped (no output file) |

### Test 4: `createLinkOrCopy()`
| Case | OS | Method | Expected |
|:---|:---|:---|:---|
| Directory symlink | macOS/Linux | symlink | POSIX symlink created, `readlink()` returns target |
| Directory symlink | Windows (admin/DevMode) | symlink | Directory symlink created |
| Directory symlink | Windows (no admin) | symlink | Junctions created, `lstat().isSymbolicLink()` returns true for the junction |
| File symlink | macOS/Linux | symlink | POSIX symlink created |
| File symlink | Windows (no admin) | symlink | Falls back to `copyFileSync`, original file unchanged |
| Symlink already exists, points to same target | Any | symlink | Skipped, no error |
| Symlink already exists, points elsewhere | Any | symlink | Throws `EEXIST` (handled by conflict resolution, not this function) |
| Directory copy | Any | copy | Recursively copies directory using `fs.cpSync` |
| File copy | Any | copy | Copies file using `fs.copyFileSync` |
| Permission denied | Any | Any | Throws `EACCES` with appropriate message |

### Test 5: `detectState()`
| Case | `.opencode/` | `.agents/` | Expected |
|:---|:---|:---|:---|
| Fresh project | No | No | `'fresh'` |
| Already installed | Symlink | Yes | `'installed'` |
| Migration needed | Real dir | No | `'migrate'` |
| Migration needed (both) | Real dir | Yes (from prior partial) | `'migrate'` (prioritize migration offer) |

### Test 6: `getInstalledVersion()` / `writeVersionFile()`
| Case | Expected |
|:---|:---|
| Write version file | `.agents/.vespyr-version` created with `{ version: '1.7.0', installed: '<iso>' }` |
| Read on fresh install | Returns `null` (file doesn't exist) |
| Read after write | Returns `'1.7.0'` |
| Malformed JSON in file | Returns `null` (graceful fallback) |

### Test 7: `scaffoldArtifacts()`
| Case | Expected |
|:---|:---|
| First run | All 19 directories created, `project-context.md` written with project name from `path.basename(targetDir)` |
| Second run (already exists) | No changes (returns early), existing `project-context.md` untouched |
| Project name from dir | Target `/foo/my-app` → `Project Name: my-app` |
| `.gitkeep` | `memory/pending-questions/.gitkeep` created |

### Test 8: `bootstrapRootDocs()`
| Case | Expected |
|:---|:---|
| First run, no harnesses | `AGENTS.md` and `agent.md` created with harness-agnostic content referencing `.agents/` |
| First run, claude harness selected | `AGENTS.md`, `agent.md`, and `CLAUDE.md` created. `CLAUDE.md` references `.claude/agents/` and Vespyr workflows |
| Second run | None of the three files overwritten (returns early for each) |
| Content check | `AGENTS.md` contains `".agents/"`, does NOT contain `".opencode/"` as primary path |
| Content check | `agent.md` contains `".agents/agents/"`, references squad skill correctly |
| Content check | `CLAUDE.md` contains `".claude/agents/"` and references `/develop`, `/review`, `/test` skills |

### Test 9: `asciiArtSpacing()`
| Case | Expected |
|:---|:---|
| Line 1 | Starts with exactly 2 spaces before `__  __` |
| Line 8 | Starts with exactly 29 spaces before `\ \_\` |
| Line 9 | Starts with exactly 30 spaces before `\/_/` |
| No tab characters | Zero `\t` in the entire art string |

### Test 10: `parseFlags()`
| Case | Input | Expected |
|:---|:---|:---|
| No flags | `[]` | `{ dryRun: false, yes: false, target: null, harnesses: [] }` |
| `--dry-run` | `['--dry-run']` | `{ dryRun: true, ... }` |
| `--yes` / `-y` | `['-y']` | `{ yes: true, ... }` |
| `--target /path` | `['--target', '/tmp/proj']` | `{ target: '/tmp/proj', ... }` |
| `--harness opencode,claude` | `['--harness', 'opencode,claude']` | `{ harnesses: ['opencode', 'claude'], ... }` |
| `--version` / `-v` | `['-v']` | Prints version from `package.json`, exits 0 |
| `--help` / `-h` | `['--help']` | Prints usage, exits 0 |
| Unknown flag | `['--foo']` | Prints `Unknown flag: --foo`, exits 1 |
| Combined flags | `['--dry-run', '--yes', '--target', './here']` | All three set correctly |

---

## 16. Verification Plan

We will perform comprehensive verification of our changes inside a dedicated test folder to fulfill the rule: `"during testing, create a new folder and test inside that test folder"` and `"no automatic push to git"`.

### Step-by-Step Testing & Verification Checklist:

#### Step 1: Create Test Target Directory
Create an empty target project folder named `test-project/` inside the workspace.
```bash
mkdir -p test-project
```

#### Step 2: Run Local Installer
Invoke the installer CLI locally using Node.js, specifying `test-project` as the installation target.
```bash
node ./bin/cli.js
```
- During prompts:
   - **Harnesses**: Select `1, 2, 3, 4, 5` (opencode, Claude Code, Cursor, GitHub Copilot, Windsurf).
   - **Path**: Enter `./test-project`.

#### Step 3: Assert Folder Structure & Contents
Verify that the files and folders are present:
1. `test-project/.agents/` must exist and contain all core directories and files.
2. `test-project/artifacts/` must contain the output, telemetry, and memory folders.
3. `test-project/artifacts/memory/project-context.md` must be present and contain:
    - `Project Name: test-project`
    - `Stack: None (Starting from scratch)` (as it is a blank project)
    - `Squad: full-team`
    - `Operation Mode: semi-autonomous`
4. `test-project/AGENTS.md`, `test-project/agent.md`, and `test-project/CLAUDE.md` must exist in the target root.

#### Step 4: Assert Link & Transpilation Resolutions
1. `test-project/.opencode/` must be a valid symlink pointing to `.agents/`.
2. `test-project/.claude/` must be a valid symlink pointing to `.agents/`.
   - `test-project/CLAUDE.md` must exist and contain Vespyr agent invocation instructions and reference `.claude/agents/`.
3. `test-project/.cursor/rules/` must contain 21 `.mdc` file rules translated and compiled from `.agents/agents/*.md` with proper metadata.
4. `test-project/.windsurf/workflows` must be a valid symlink pointing to `.agents/skills`.
5. `test-project/.windsurfrules` must be a valid symlink pointing to `.agents/GUARDRAILS.md`.
6. `test-project/.github/agents/` must contain 21 `.yml` configuration files compiled correctly from the agent prompts.
7. `test-project/.github/copilot-instructions.md` must point to `AGENTS.md`.

#### Step 5: Test Backward Compatibility
Run all scripts inside `.agents/scripts/` to confirm that they resolve paths correctly after the rename:
```bash
node ./test-project/.agents/scripts/token_profiler.js
node ./test-project/.agents/scripts/compile_skills.js
node ./test-project/.agents/scripts/squads.js
```
Assert that each script completes without path errors and correctly finds `.agents/` resources.

#### Step 6: Test Update Flow (Action 1 — Already Installed)
Simulate the "already installed" action menu:
1. Re-run the installer while Vespyr is already configured:
   ```bash
   node ./bin/cli.js
   ```
   - CLI must detect `.agents/` and display the Action Menu (Update / Reconfigure / Uninstall).
2. **Select Action 1 (Update)**:
   - Assert that `.agents/` contents are overwritten with the latest packed files.
   - Assert that `artifacts/` directory and `project-context.md` are **preserved unchanged**.
   - Assert that all previously configured harness files are re-compiled (Cursor `.mdc`, Copilot `.yml`, and symlinks) to reflect any updated agent prompts.

#### Step 7: Test Reconfigure Flow (Action 2)
1. From the Action Menu, **select Action 2 (Reconfigure)**.
2. Toggle an additional harness integration (e.g. add Kiro Steering).
3. Assert that the new harness symlink is created.

#### Step 8: Test Uninstall Flow (Action 3 — Data Preserving)
1. From the Action Menu, **select Action 3 (Uninstall)**.
2. Assert that `test-project/.agents/` is deleted.
3. Assert that all harness symlinks and compiled directories are deleted:
    - `test-project/.opencode/` (symlink removed)
    - `test-project/.claude/` (symlink removed)
    - `test-project/.cursor/rules/*.mdc` (deleted)
    - `test-project/.github/agents/` (deleted)
    - `test-project/.windsurf/workflows` (symlink removed)
    - `test-project/.windsurfrules` (symlink removed)
    - `test-project/AGENTS.md` (deleted)
    - `test-project/agent.md` (deleted)
    - `test-project/CLAUDE.md` (deleted)
4. **CRITICAL**: Assert that `test-project/artifacts/` is **fully preserved** — all subdirectories (`output/`, `memory/`, `telemetry/`, `input/`) and their contents remain intact.

#### Step 9: Test Clean Reinstall After Uninstall
After uninstall, run the installer again in the same directory. Assert that:
- `.agents/` and all harness links are re-created correctly.
- The preserved `artifacts/` directory is detected and reused (no overwrite of historical data).

#### Step 10: Test ASCII Art Verification
Assert the welcome art is printed byte-for-byte as specified in Section 5. Run:
```bash
node ./bin/cli.js 2>&1 | head -n 10
```
Confirm the output matches the exact spacing defined in lines 24-36 (no whitespace trimming by terminal or markdown renderer).

---

## 15. User Nickname & Personalization Integration

To make the AI agent squad feel significantly more premium, natural, and human, the installation process includes an interactive personalization question.

### 15.1 CLI Prompt Logic
During a fresh installation (or reconfiguration), the CLI prompts the user with the following text:
```
? What should the agent squad call you? (e.g., Christian, Sarah) [Default: User]:
```
* **Defaults**: If the user presses `Enter` without typing anything, or runs the installer in non-interactive/silent mode (`--yes` / `-y`), it defaults to `"User"`.
* **Sanitization**: The input is trimmed and sanitized to ensure it is alphanumeric (allowing spaces and standard punctuation).

### 15.2 Storage in Project Context
The collected name is stored in `artifacts/memory/project-context.md` under the identity block:
```markdown
## Identity
- **Project Name**: {project-name}
- **Repository**: {repo-url-or-none}
- **User Nickname**: {user-name}
```

### 15.3 Harnessing the Nickname (How Agents Use It)
Since all agents load `project-context.md` as Tier 1 core memory, they automatically parse the `User Nickname` field. We enforce the following rules in the core framework:
1. **Direct Address**: When formulating interactive Socratic questions (e.g., during Socratic validation or when prompting the user for feature selection/PRD approvals), agents must greet and address the user directly by their nickname instead of generic placeholders like "human", "user", or "developer".
   * *Example*: *"Hello Christian, before we dive into..."* instead of *"Hello user, before we..."*.
2. **Commit Messages & Walkthroughs**: When attributing stakeholder decisions or drafting manual walkthrough outputs (like `walkthrough.md`), agents will refer to the user by their nickname when logging decisions.
3. **Tone Guidelines**: Added explicitly to `socratic-universal.md` and default prompt structures, instructing all 21 agent personas to respect this personalization parameter for a more conversational and natural collaborative experience.
