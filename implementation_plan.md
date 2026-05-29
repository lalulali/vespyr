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
├── agents/                       # 22 Core Agent Persona prompts
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
│   ├── executor.md               # Bash Command Executor (Sub-Agent)
│   └── orchestrator.md           # Swarm Coordinator & Pipeline Manager
├── commands/                     # Slash Command Definitions
│   └── init.md                   # Harness-agnostic bootstrap command instructions
├── reference/                    # PM/Founder Frameworks & Guidelines
│   ├── founder-frameworks.md     # Golden Circle, Unit Economics sheets
│   ├── pm-frameworks.md           # PRD templates & traceability framework
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
│   ├── hot_path_analyzer.js      # Optimization profiling calculator
│   ├── incremental_graph.js      # mtime codebase import/export analyzer
│   ├── memory_filter.js          # Tier 3 keyword + recency scoring
│   ├── orchestrator_state.js     # DAG state machine controller
│   ├── pipeline_simulator.js     # Synthetic pipeline runner
│   ├── shallow_graph.js          # Fast codebase import scans
│   ├── squads.js                 # Squad preset loader and parser
│   ├── swarm_telemetry.js        # Token and phase usage reporting
│   └── token_profiler.js         # Static token sizing analysis
├── skills/                       # Curated Phase Workflows (24 skills)
│   ├── code-graph/               # Codebase structural dependency mapper
│   ├── delegate/                 # One-shot I/O offload to sub-agents
│   ├── design/                   # PRD & screen design specs from validated ideas
│   ├── develop/                  # Core MVP workflow (spec → impl → QA → docs)
│   ├── doc-graph/                # Document relationship & traceability graph
│   ├── explore-game-idea/        # Game concept market & competitor research
│   ├── explore-idea/             # Concept validation via market & user research
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
├── templates/                    # Markdown Output Outlines
│   ├── idea-brief-template.md
│   ├── memory-entry-template.md
│   ├── session-summary-template.md
│   └── ...
├── GUARDRAILS.md                 # Shared safety rules & Change Request protocol
├── TROUBLESHOOTING.md            # Diagnoses for common workspace blocks
├── .gitignore                    # Ignore rules for .agents/ directory
├── delegation-pattern.md         # I/O separation model
├── skills.md                     # Skills catalog registry
├── workflow.md                   # Full Execution graph and handoff contracts
├── package.json                  # NPM dependencies for harness plugins (excluded from npm pack)
└── package-lock.json             # NPM package lock for harness plugins (excluded from npm pack)
```

> [!IMPORTANT]
> **NPM Package Exclusion**: The `node_modules/`, `package.json`, and `package-lock.json` inside `.agents/` must be excluded from the published npm package. These are excluded via root `.npmignore`:
> ```
> .agents/node_modules/
> .agents/package.json
> .agents/package-lock.json
> ```
> `tests/` lives at the workspace root (extracted during Phase 1) and is excluded by not being in the `"files"` array.
> These files are only used during local development when running the opencode harness natively from the workspace.

---

## 4. Custom Harness Linker Strategy

By making the `.agents/` folder and root `AGENTS.md` / `agent.md` files mandatory core outputs:
- **Antigravity**, **Codex CLI**, and other standard `.agents/`-compatible CLI assistants are **supported natively out-of-the-box** on every single install.
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
     - `✔ Core Agent Directory (natively supported by: Antigravity, Codex, etc.) [Mandatory]` (Locked/pre-selected; Space key is disabled)
     - `◯ opencode` (scaffolds `.opencode` -> `.agents` symlink)
     - `◯ Claude Code` (scaffolds `.claude` -> `.agents` symlink)
     - `◯ Cursor Rules` (scaffolds `.cursor/rules/*.mdc` rules with metadata)
     - `◯ GitHub Copilot & CLI` (scaffolds `.github/agents/*.yml` compiled rules)
     - `◯ Windsurf` (scaffolds `.windsurf/workflows` symlink & `.windsurfrules` symlink)
     - `◯ Kiro Steering` (scaffolds `.kiro/steering/` manual rule folder)

3. **Path Selector (Local vs. Global)**:
    - **Step 3.1**: "Where do you want to install Vespyr?"
      - `❯ 1 - Local Installation (Current project folder)`
      - `  2 - Global Installation (Global environment paths)`
    
    - **Step 3.2 (If Global chosen)**:
     - The installer searches standard environment paths for the user's OS and selected harnesses:
       - Antigravity / General CLI: `~/.agents/`
       - Claude Code: `~/.claude/`
       - Cursor (macOS): `~/Library/Application Support/Cursor/User/globalRules/`
       - Cursor (Linux): `~/.config/Cursor/User/globalRules/`
       - opencode: `~/.opencode/`
       - GitHub Copilot: `~/.config/github-copilot/`
       - Windsurf: `~/.windsurf/`
       - Kiro: `~/.kiro/`
     - Automatically copies the master `.agents` folder and establishes symlinks globally.
   
    - **Step 3.3 (If Local chosen)**:
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
function createLink(target, linkPath, type = 'dir') {
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
   - `alwaysApply`: Set to `false` (we want the rules to be requested on-demand when the user mentions `@agent-name` in the Cursor chat pane, rather than polluting every single query with 22 agent prompts).
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

The `/init` command inside `.agents/commands/init.md` will be rewritten to be harness-agnostic. Below is the complete replacement content:

```markdown
# /init — Bootstrap a Vespyr-Powered Project

## What this command does

Initializes a project for use with the Vespyr multi-agent engine. It analyzes the target directory, generates a `project-context.md`, creates root `AGENTS.md` and `agent.md` files, and configures harness integration points.

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
- **Active Agents**: 22 (full-team preset)

## Memory
- **Lessons Learned**: None yet
- **Active Decisions**: None yet
```

### Step 3: Bootstrap root files

If `AGENTS.md` or `agent.md` do not exist, create them from `.agents/templates/` (see Section 10 of the implementation plan for template content).

### Step 4: Verify harness integration

Check which harness symlinks/compiled directories exist:
- `.opencode -> .agents` → opencode detected
- `.claude -> .agents` → Claude Code detected
- `.cursor/rules/*.mdc` → Cursor detected
- `.github/agents/*.yml` → GitHub Copilot detected
- `.windsurf/workflows -> .agents/skills` → Windsurf detected
- `.kiro/steering -> .agents/agents` → Kiro detected

Print a summary of detected harnesses.

## Guardrails

> [!CAUTION]
> **Dotfolder Isolation**: You MUST NOT read, scan, or analyze any files inside system harness dotfolders — this includes `.agents/`, `.opencode/`, `.claude/`, `.cursor/`, `.github/`, `.windsurf/`, `.kiro/`, and any other `.`-prefixed harness directories. These contain the engine itself, not the project being initialized.

> **Canonical Paths**: All generated references MUST use `.agents/` as the canonical master path for agents, commands, skills, templates, scripts, and squads. Do not reference `.opencode/` (which is just a symlink for the opencode harness).

> **Preserve User Data**: Never overwrite existing `artifacts/`, `project-context.md`, `AGENTS.md`, or `agent.md` without user confirmation.
```

### Migration Notes
When updating `init.md` in the source:
1. **Replace** the entire content of `.agents/commands/init.md` with the above.
2. **Verify** that the old version (which referenced `.opencode/` exclusively) is fully replaced.
3. **Test** by running `/init` in a blank test project and asserting that all generated paths reference `.agents/`, not `.opencode/`.

---

## 8. Proposed Source Code Modifications

We will perform the following changes in the source repository:

### Phase 1: Directory Restructuring
- **Rename** `.opencode/` to `.agents/` in the workspace root.
- **Create Symlink** `.opencode -> .agents` in the workspace root so that any local opencode commands or developers using opencode continue to run flawlessly.
- **Preserve** root `opencode.json` as-is. This file is the harness configuration for opencode (plugin declarations, agent permissions) and lives outside the `.agents/` directory. No changes needed.
- **Extract** `tests/` from `.agents/` to workspace root. After the rename, `.agents/tests/` exists (it was `.opencode/tests/`). Move it: `fs.renameSync('.agents/tests', 'tests')`. Tests are for engine development only — they should not ship inside the installed `.agents/` folder and are excluded from npm pack because they're at the workspace root (not in `"files"`).

### Phase 2: Global Path Adjustments
We will update all instances of `.opencode/` to `.agents/` across the codebase using exact string replacements:
- **Agents**: Update references in all 22 agent files (e.g. `memory-entry-template.md`, `references/socratic/...`).
- **Guidelines**: Update references in `.agents/references/` (e.g. `pm-workflows.md`, `pm-frameworks.md`, `developer-guidelines.md`, `socratic-universal.md`).
- **Core Files**: Update root `AGENTS.md`, `agent.md`, `README.md`, `QUICK-REFERENCE.md`, `PORTING.md`, and `.agents/GUARDRAILS.md`.
- **Commands**: Update `.agents/commands/init.md` to generalize dotfolder isolation rules.
- **Scripts**: 
  - Update `token_profiler.js` (lines 18-20, 229), `incremental_graph.js` (line 206), `doc_graph.js` (line 115), `shallow_graph.js` (line 226), and `swarm_telemetry.js` (lines 249, 255) to check for `.agents/` first, falling back to `.opencode/`.
  - Update exclusion lists in `incremental_graph.js`, `doc_graph.js`, and `shallow_graph.js` to also exclude `.agents/` (in addition to `.opencode/`) so scripts do not scan themselves after the rename.
  - Update comment in `compile_skills.js` (line 3) to reference `.agents/skills/`.

### Phase 3: Create Package Metadata
- **Create** `package.json` at the root of the repository:
  ```json
  {
    "name": "vespyr",
    "version": "1.7.0",
    "description": "Multi-agent engine for product development",
    "main": "index.js",
    "type": "module",
    "bin": {
      "vespyr": "./bin/cli.js"
    },
    "files": [
      ".agents",
      "bin",
      "AGENTS.md",
      "QUICK-REFERENCE.md",
      "PORTING.md",
      "README.md",
      "agent.md"
    ]
  }
  ```
- **Create** `.npmignore` at the repository root to exclude development-only files from the published package:
  ```
  .agents/node_modules/
  .agents/package.json
  .agents/package-lock.json
  ```
  Note: `tests/` does not need an entry — it lives at the workspace root and is not listed in `"files"`, so it's excluded by default.
- **Create** `bin/cli.js` implementing the installer CLI (see Section 5).

### Phase 4: Build CLI Entry Point
- **Create** `bin/cli.js` with the following structure:
  ```js
  #!/usr/bin/env node
  'use strict';
  
  // --help / --version handling (early exit, no deps)
  // args: parse process.argv for --dry-run, --yes, --target, --harness
  // detect: check fs.existsSync('.agents') to branch install vs action menu
  // render: ASCII art (always first)
  // prompt: interactive checklist for harnesses (raw mode keypress)
  // prompt: path selector (local vs global)
  // scaffold: copy .agents/ from __dirname/../.agents to target
  // scaffold: create artifacts/ with project-context.md
  // scaffold: bootstrap AGENTS.md and agent.md in target root
  // link: create symlinks per selected harnesses
  // transpile: run MDC and YAML transpilers if Cursor/Copilot selected
  // summary: print post-install summary (Section 14)
  // version-tag: write .agents/.vespyr-version (Phase 5)
  // cleanup: on error, rollback (delete .agents/ and symlinks in target)
  ```

#### Execution Flow (Function Dependency Graph)

```
main()
├── printASCII()                          // Always first
├── parseFlags()                          // --help, --version, --dry-run, --yes, --target, --harness
├── detectState(targetDir)
│   ├── hasRealO penc = lstat('.opencode').isDirectory() && !isSymlink()
│   ├── hasAgents    = existsSync('.agents')
│   └── return: 'fresh' | 'installed' | 'migrate'
│
├── [migrate] → migrateFlow()             // Section 11
│   ├── backupOpencode()
│   ├── renameToAgents()
│   ├── createSymlink('.opencode', '.agents')
│   └── updatePathsInAgents()             // regex .opencode → .agents
│
├── [fresh] → installFlow()               // Interactive prompts
│   ├── printWelcome()
│   ├── selectedHarnesses = promptHarnessChecklist()   // Keypress raw mode
│   ├── installPath = promptPathSelector()
│   ├── scaffoldAgents(src, target)                     // cpSync from bundle
│   │   └── writeVersionFile(target + '/.agents')        // Phase 5
│   ├── scaffoldArtifacts(target, projectName)            // Section 9
│   ├── bootstrapRootDocs(target, projectName, selectedHarnesses)  // Section 10 (incl. CLAUDE.md)
│   ├── linkHarnesses(target, selectedHarnesses)
│   │   ├── createLink('.agents', '.opencode', 'dir')    // opencode
│   │   ├── createLink('.agents', '.claude', 'dir')      // claude
│   │   ├── transpileCursorMDC(…)                        // Cursor
│   │   ├── transpileCopilotYAML(…)                      // GitHub Copilot
│   │   ├── createLink('AGENTS.md', 'copilot-instructions.md', 'file')
│   │   ├── createLink('.agents/GUARDRAILS.md', '.windsurfrules', 'file')
│   │   ├── createLink('.agents/skills', '.windsurf/workflows', 'dir')
│   │   └── createLink('.agents/agents', '.kiro/steering', 'dir')
│   └── printSummary(target, selections)                  // Section 14
│
├── [installed] → actionMenuFlow()        // Already configured
│   ├── printActionMenu()
│   ├── [1: Update]    → updateAgents() + recompileHarnesses()
│   ├── [2: Reconfigure] → promptHarnessChecklist() + linkHarnesses()
│   └── [3: Uninstall] → uninstallFlow()
│       ├── deleteAgents()
│       ├── deleteSymlinks()
│       ├── deleteRootDocs()
│       └── preserveArtifacts()                           // Never delete
│
└── registerSignalHandlers()
    └── SIGINT → rollbackPartialInstall()
```

### Phase 5: Version Tracking Marker
The installer writes a version marker file to enable the update flow to detect version drift:

**File**: `.agents/.vespyr-version`
**Content**:
```json
{ "version": "1.7.0", "installed": "2026-05-26T12:00:00.000Z" }
```

**Purpose**:
- `--version` flag reads this to report the installed engine version.
- Action 1 (Update) compares this against the bundled version. If they match, the update is skipped with `Already up to date (v1.7.0).`.
- Future: enables migration scripts that transform `.agents/` when upgrading across breaking versions.

**Implementation**:
```js
function writeVersionFile(agentsDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  fs.writeFileSync(
    path.join(agentsDir, '.vespyr-version'),
    JSON.stringify({ version: pkg.version, installed: new Date().toISOString() }, null, 2)
  );
}

function getInstalledVersion(targetDir) {
  const versionFile = path.join(targetDir, '.agents', '.vespyr-version');
  if (!fs.existsSync(versionFile)) return null;
  return JSON.parse(fs.readFileSync(versionFile, 'utf8')).version;
}
```

---

## 9. `artifacts/` Scaffolding Specification

When the installer runs for the first time in a target directory, it scaffolds the `artifacts/` directory with the following structure:

```
{target}/artifacts/
├── directions/
├── input/
│   ├── data/
│   ├── designs/
│   ├── documents/
│   ├── example/
│   └── flows/
├── memory/
│   ├── agent-notes/
│   ├── archive/
│   ├── patterns-and-conventions.md
│   ├── pending-questions/
│   │   └── .gitkeep
│   └── structural/
├── output/
│   ├── 01-research/
│   ├── 02-strategy/
│   ├── 03-architecture/
│   ├── 04-planning/
│   ├── 05-execution/
│   ├── 06-quality/
│   ├── 07-infrastructure/
│   └── 08-documentation/
└── telemetry/
```

### `project-context.md` Template

Created at `{target}/artifacts/memory/project-context.md`:

```markdown
# Project Context

## Identity
- **Project Name**: {project-name}
- **Repository**: {repo-url-or-none}
- **User Nickname**: {user-name}
- **Created**: {iso-date}

## Technical
- **Stack**: None (Starting from scratch)
- **Architecture**: Not yet defined
- **Constraints**: None recorded

## Team
- **Squad**: full-team
- **Operation Mode**: semi-autonomous
- **Active Agents**: 22 (full-team preset)

## Memory
- **Lessons Learned**: None yet
- **Active Decisions**: None yet
```

Variables filled at install time:
- `{project-name}`: derived from target directory name (e.g., `path.basename(resolve(targetDir))`)
- `{repo-url-or-none}`: attempted via `git remote get-url origin` if a git repo exists, otherwise `"None (not a git repository)"`
- `{iso-date}`: `new Date().toISOString().split('T')[0]`

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
- **Active Agents**: 22 (full-team preset)

## Memory
- **Lessons Learned**: None yet
- **Active Decisions**: None yet
`;

  fs.writeFileSync(path.join(artifactsDir, 'memory', 'project-context.md'), context);
}
```

---

## 10. `AGENTS.md` & `agent.md` Bootstrap Templates

Both files are written to the target root and reference `.agents/` as the canonical path.

### `AGENTS.md` Template
```markdown
# {project-name}

A platform-agnostic, file-based multi-agent system powered by [Vespyr](https://github.com/anomalyco/vespyr).

> [!IMPORTANT]
> **Harness Directory Adaptation**
> Vespyr installs its core agent definitions in the `.agents/` directory. Depending on your active AI harness, you may need to configure a symlink or path mapping:
> - **OpenCode**: `.opencode -> .agents` (symlink configured during install)
> - **Claude Code**: `.claude -> .agents` (symlink configured during install)
> - **Cursor**: Agent rules available under `.cursor/rules/*.mdc`
> - **GitHub Copilot**: Agent definitions available under `.github/agents/*.yml`
> - **Windsurf**: Workflows linked from `.windsurf/workflows -> .agents/skills`
> - **Kiro**: Steering rules linked from `.kiro/steering -> .agents/agents`

## Invocation & Multi-Harness Guidelines

Since agents are defined as plain Markdown personas, they can be loaded and executed by any AI developer harness.

### 1. Context-Aware & Mention-Capable IDEs (e.g., Cursor, Windsurf, GitHub Copilot)
- Use the `@` symbol in your chat pane to mention the agent's markdown configuration file (e.g., `@.agents/agents/founder.md` or `@founder.md`).
- Attach the specific agent's `.md` file to the chat window before starting your task.

### 2. Single-Agent & Terminal Harnesses (e.g., Claude Code, opencode)
- Instruct the active LLM session to read and adopt the persona explicitly:
  ```
  Adopt the role defined in: .agents/agents/[agent-name].md
  Read that file to understand your persona, goals, workflow, and safety guardrails.
  Strictly adhere to the 4 Core Behavioral Guidelines (Think Before Acting, Simplicity First, Surgical Actions, Goal-Driven Execution) defined in AGENTS.md.
  Then, execute this task: [detailed instructions]
  ```

### 3. Standard Browser-Based LLMs (e.g., ChatGPT, Claude.ai)
- Copy the entire contents of `.agents/agents/[agent-name].md` and paste it as the first system message in a new chat thread.

## Core Agent Personas (22 specialized roles)

The system features 22 highly tuned role profiles divided into three functional categories:

### Core Swarm & Engineering Roles
| Agent | Focus | Outputs |
|:---|:---|:---|
| `@orchestrator` | Swarm coordinator, multi-agent pipeline execution | `artifacts/memory/swarm-state.json` |
| `@founder` (Elena) | Strategic concept stress-testing | `artifacts/output/00-discovery/` |
| `@product-manager` | PRD generation, user story maps, kanban | `requirements.md`, `kanban.md` |
| `@product-designer` | UX/UI design specs, screen states, wireframes | `product-spec.md` |
| `@architect` | System design, ADR records | `adr/*.md` |
| `@tech-lead` | Execution plans, task estimation (1-4h) | `execution-plan.md` |
| `@developer` | Feature implementation, test suites | Source Code & Unit Tests |
| `@code-reviewer` | PR reviews, security validation | Review Checklists |
| `@qa-engineer` | Integration testing, regression, release cert | `test-report.md` |

### Specialized Domain Experts
| Agent | Focus | Outputs |
|:---|:---|:---|
| `@researcher` | Market, competitor, genre research | `artifacts/output/01-research/` |
| `@user-researcher` | User research, interviews, personas | `artifacts/output/01-research/user-research/` |
| `@ux-researcher` | Usability, journey maps, interaction design | `artifacts/output/01-research/ux/` |
| `@data-analyst` | Analytics, telemetry, dashboards | `artifacts/output/07-iteration/` |
| `@security-engineer` | Threat modeling, vulnerability scanning | `artifacts/output/03-architecture/security/` |
| `@performance-engineer` | Latency analysis, bottleneck profiling | `artifacts/output/07-iteration/performance/` |
| `@ml-engineer` | AI logic, model integration, prompt templates | `artifacts/output/03-architecture/ml/` |
| `@devops-engineer` | CI/CD, infrastructure, environments | `.github/workflows/`, Terraform |
| `@technical-writer` | User manuals, API specs, release docs | `docs/`, `api-reference.md` |

### Operational I/O Sub-Agents
| Agent | Role |
|:---|:---|
| `@reader` | Fast codebase queries, regex searches, file reads (read-only) |
| `@writer` | Contiguous file edits/writes, zero reasoning overhead (write-only) |
| `@executor` | Shell command execution, curated summaries |
| `@memory-controller` | Memory gatekeeper — load, validate, persist, compact |

## Shared Memory & Context Persistence

All agents leverage the localized text-based memory system in `artifacts/memory/`:
- **`project-context.md`**: Source of truth for codebase stack, constraints, architecture
- **`active-decisions.md`**: Critical design choices
- **`lessons-learned.md`**: Engineering insights, bugs fixed

## 🌟 Core Behavioral Guidelines (Karpathy-Inspired)

To maximize reliability, reduce over-engineering, and enforce high-fidelity execution across all development phases (Discovery, Strategy, Planning, Design, Dev, QA, etc.), all Vespyr agents follow these four core principles:

### 1. Think Before Acting
*   **No Silent Assumptions**: State all assumptions explicitly before executing. If a task or specification is ambiguous, pause and ask for clarification rather than making a guess and running with it.
*   **Surface Trade-Offs**: Present multiple potential paths (e.g., in design, architecture, research, or testing) with their pros and cons. Never select a path silently.
*   **Push Back When Warranted**: If a simpler path, lighter design, or more direct method exists to solve the problem, suggest it. Push back on unnecessary overhead.
*   **Pause on Ambiguity**: If any inputs (requirements, user feedback, APIs) are unclear, stop immediately, identify the confusion, and ask the user or squad lead.

### 2. Simplicity First
*   **Minimum Complexity**: Build/write/design the minimum necessary to fulfill the requirements. No speculative engineering or "just-in-case" abstractions.
*   **No Speculative Features**: Do not add undocumented features, design options, or processes that were not requested.
*   **Sleek Abstractions**: Avoid complex framework structures, heavy architectures, or bloated documentation templates for simple, single-use tasks. Keep files concise (e.g., if a spec can be 1 page instead of 5, keep it to 1; if a component can be 50 lines instead of 200, write 50).
*   **The Senior Standard**: Constantly ask: *"Would a principal leader criticize this as over-complicated or bloated?"* If yes, refactor it down to its elegant core.

### 3. Surgical Actions
*   **Minimize Footprint**: Touch only what is strictly necessary to complete the task. Never refactor or touch adjacent files, code, formatting, or documentation that are out of scope.
*   **Preserve Context**: Maintain existing styles, structures, and naming conventions, even if you would personally implement them differently.
*   **No Side-Effect Cleanup**: Do not silently delete or "clean up" unrelated dead code, comments, or document sections. If you notice unrelated issues, document them in `lessons-learned.md` or mention them, but do not touch them.
*   **Surgical Edits**: When editing files, use the most precise edit tools possible. Avoid rewriting whole files when changing a few lines.

### 4. Goal-Driven Execution
*   **Define Success Early**: Before starting any phase (Discovery, Design, Dev, QA, etc.), clearly define the deliverables and their exact verification criteria.
*   **Test-First Discipline**: For developers, write tests before or alongside code. For other roles, establish checklist benchmarks (e.g., user story mapping for PMs, usability tests for Designers).
*   **Rigorous Verification**: Never claim a task is complete until it has been explicitly verified using automated tests, manual walkthroughs, or system feedback.
*   **Close the Loop**: Log outcomes and update persistent memory (`lessons-learned.md` or `active-decisions.md`) upon completion.

---

## 🛡️ Guardrails

All agents follow the safety and conflict resolution rules in `.agents/GUARDRAILS.md`.
```

### `agent.md` Template
```markdown
# Vespyr Agent Instructions

You are operating within the Vespyr multi-agent engine. Your core agent definitions, workflows, and shared memory live in the `.agents/` directory.

## Quick Reference
- **Agent Personas**: `.agents/agents/` (22 specialized roles)
- **Skills/Workflows**: `.agents/skills/` (24 curated phase workflows)
- **Shared Memory**: `artifacts/memory/project-context.md`
- **Squad Presets**: `.agents/squads/` (7 team configurations)
- **Guardrails**: `.agents/GUARDRAILS.md`

## Getting Started
1. Run `/init` to bootstrap this project if it's newly installed.
2. Use `@squad` to see or switch team presets.
3. Use `@status` for a quick project state snapshot.
4. Use `@help-me` for a tailored navigation report.

## Harness Compatibility
Vespyr is harness-agnostic. Your current harness integrations were configured during install. See `AGENTS.md` for invocation instructions per harness.

## 🌟 Core Behavioral Guidelines (Karpathy-Inspired)

To maximize reliability, reduce over-engineering, and enforce high-fidelity execution across all development phases (Discovery, Strategy, Planning, Design, Dev, QA, etc.), all Vespyr agents follow these four core principles:

### 1. Think Before Acting
*   **No Silent Assumptions**: State all assumptions explicitly before executing. If a task or specification is ambiguous, pause and ask for clarification rather than making a guess and running with it.
*   **Surface Trade-Offs**: Present multiple potential paths (e.g., in design, architecture, research, or testing) with their pros and cons. Never select a path silently.
*   **Push Back When Warranted**: If a simpler path, lighter design, or more direct method exists to solve the problem, suggest it. Push back on unnecessary overhead.
*   **Pause on Ambiguity**: If any inputs (requirements, user feedback, APIs) are unclear, stop immediately, identify the confusion, and ask the user or squad lead.

### 2. Simplicity First
*   **Minimum Complexity**: Build/write/design the minimum necessary to fulfill the requirements. No speculative engineering or "just-in-case" abstractions.
*   **No Speculative Features**: Do not add undocumented features, design options, or processes that were not requested.
*   **Sleek Abstractions**: Avoid complex framework structures, heavy architectures, or bloated documentation templates for simple, single-use tasks. Keep files concise (e.g., if a spec can be 1 page instead of 5, keep it to 1; if a component can be 50 lines instead of 200, write 50).
*   **The Senior Standard**: Constantly ask: *"Would a principal leader criticize this as over-complicated or bloated?"* If yes, refactor it down to its elegant core.

### 3. Surgical Actions
*   **Minimize Footprint**: Touch only what is strictly necessary to complete the task. Never refactor or touch adjacent files, code, formatting, or documentation that are out of scope.
*   **Preserve Context**: Maintain existing styles, structures, and naming conventions, even if you would personally implement them differently.
*   **No Side-Effect Cleanup**: Do not silently delete or "clean up" unrelated dead code, comments, or document sections. If you notice unrelated issues, document them in `lessons-learned.md` or mention them, but do not touch them.
*   **Surgical Edits**: When editing files, use the most precise edit tools possible. Avoid rewriting whole files when changing a few lines.

### 4. Goal-Driven Execution
*   **Define Success Early**: Before starting any phase (Discovery, Design, Dev, QA, etc.), clearly define the deliverables and their exact verification criteria.
*   **Test-First Discipline**: For developers, write tests before or alongside code. For other roles, establish checklist benchmarks (e.g., user story mapping for PMs, usability tests for Designers).
*   **Rigorous Verification**: Never claim a task is complete until it has been explicitly verified using automated tests, manual walkthroughs, or system feedback.
*   **Close the Loop**: Log outcomes and update persistent memory (`lessons-learned.md` or `active-decisions.md`) upon completion.
```

### `CLAUDE.md` Template (Claude Code Harness Only)
Scaffolded at project root only when the user selects the Claude Code harness. This file serves as Claude Code's project memory, instructing it on how to discover and invoke Vespyr agents:

```markdown
# CLAUDE.md — Vespyr Multi-Agent Engine

This project is powered by Vespyr, a platform-agnostic, file-based multi-agent system consisting of 22 specialized agent personas, structured workflows, and a shared persistent memory layer.

**Trade-Off Policy**: The guidelines below prioritize absolute execution quality, simplicity, and precision over sheer speed. Adhere to them strictly for all tasks.

---

## 🌟 Core Behavioral Guidelines (Karpathy-Inspired)

To maximize reliability, reduce over-engineering, and enforce high-fidelity execution across all development phases, all agents must follow these four core principles:

### 1. Think Before Acting
*   **No Silent Assumptions**: State all assumptions explicitly before executing. If a task or specification is ambiguous, pause and ask for clarification rather than making a guess and running with it.
*   **Surface Trade-Offs**: Present multiple potential paths (e.g., in design, architecture, research, or testing) with their pros and cons. Never select a path silently.
*   **Push Back When Warranted**: If a simpler path, lighter design, or more direct method exists to solve the problem, suggest it. Push back on unnecessary overhead.
*   **Pause on Ambiguity**: If any inputs (requirements, user feedback, APIs) are unclear, stop immediately, identify the confusion, and ask the user or squad lead.

### 2. Simplicity First
*   **Minimum Complexity**: Build/write/design the minimum necessary to fulfill the requirements. No speculative engineering or "just-in-case" abstractions.
*   **No Speculative Features**: Do not add undocumented features, design options, or processes that were not requested.
*   **Sleek Abstractions**: Avoid complex framework structures, heavy architectures, or bloated documentation templates for simple, single-use tasks. Keep files concise (e.g., if a spec can be 1 page instead of 5, keep it to 1; if a component can be 50 lines instead of 200, write 50).
*   **The Senior Standard**: Constantly ask: *"Would a principal leader criticize this as over-complicated or bloated?"* If yes, refactor it down to its elegant core.

### 3. Surgical Actions
*   **Minimize Footprint**: Touch only what is strictly necessary to complete the task. Never refactor or touch adjacent files, code, formatting, or documentation that are out of scope.
*   **Preserve Context**: Maintain existing styles, structures, and naming conventions, even if you would personally implement them differently.
*   **No Side-Effect Cleanup**: Do not silently delete or "clean up" unrelated dead code, comments, or document sections. If you notice unrelated issues, document them in `lessons-learned.md` or mention them, but do not touch them.
*   **Surgical Edits**: When editing files, use the most precise edit tools possible. Avoid rewriting whole files when changing a few lines.

### 4. Goal-Driven Execution
*   **Define Success Early**: Before starting any phase (Discovery, Design, Dev, QA, etc.), clearly define the deliverables and their exact verification criteria.
*   **Test-First Discipline**: For developers, write tests before or alongside code. For other roles, establish checklist benchmarks (e.g., user story mapping for PMs, usability tests for Designers).
*   **Rigorous Verification**: Never claim a task is complete until it has been explicitly verified using automated tests, manual walkthroughs, or system feedback.
*   **Close the Loop**: Log outcomes and update persistent memory (`lessons-learned.md` or `active-decisions.md`) upon completion.

---

## 👥 Agent Discovery & Invocation

Vespyr agents are installed under `.claude/agents/` (symlinked to `.agents/agents/` or `.opencode/agents/`). To invoke an agent, instruct the LLM session to adopt its persona:

```
Adopt the role of the agent defined in .claude/agents/founder.md.
Read that file to understand your persona, goals, workflow, and safety guardrails.
Strictly adhere to the 4 Core Behavioral Guidelines defined in CLAUDE.md.
Then, execute this task: [your detailed instructions]
```

### Core Agent Personas

| Persona | Domain | Focus Area & Primary Responsibilities | Core Deliverables |
| :--- | :--- | :--- | :--- |
| **`@orchestrator`** | Swarm | Swarm coordinator, manages multi-agent pipeline execution | `swarm-state.json` |
| **`@founder`** | Swarm | Strategic concept stress-testing (Elena) | `00-discovery/` |
| **`@product-manager`** | Swarm | Scoping, PRD, user stories, Kanban | `requirements.md` |
| **`@product-designer`** | Swarm | UX/UI designs, screen states, wireframes | `product-spec.md` |
| **`@architect`** | Swarm | System design, ADR trade-offs | `adr/*.md` |
| **`@tech-lead`** | Swarm | Execution plans, task estimation, backlog | `execution-plan.md` |
| **`@developer`** | Swarm | Core feature implementation, code quality, unit tests | Source Code & Tests |
| **`@code-reviewer`** | Swarm | PR reviews, security validation, compliance checks | Checklists & Feedbacks |
| **`@qa-engineer`** | Swarm | Integration testing, regression verification | `test-report.md` |

Full agent roster is available under `.claude/agents/` (22 specialized profiles). See `AGENTS.md` for a complete reference.

---

## 🛠️ Workflows (Skills)

Vespyr provides 24 curated workflows under `.claude/commands/` (symlinked to `.agents/skills/`):
- `/help-me` — Project state navigator
- `/grill-me` — Socratic alignment interview
- `/design` — PRD and screen specs
- `/develop` — Full MVP development cycle
- `/review` — Standalone code review
- `/test` — Run tests, summarize failures
- `/retro` — Post-cycle review and memory compaction

---

## 🧠 Shared Memory & Context Persistence

Project context and decisions persist in `artifacts/memory/`:
- `project-context.md` — Stack, constraints, architecture
- `active-decisions.md` — Key design choices
- `lessons-learned.md` — Engineering insights

## 🛡️ Guardrails

All agents follow safety rules in `.agents/GUARDRAILS.md`. Do not delete or modify files inside `.agents/`, `.claude/`, or `artifacts/memory/` without understanding the system.
```

### Bootstrap Logic
```js
function bootstrapRootDocs(targetDir, projectName, selectedHarnesses) {
  const agentsMd = generateAgentsMd(projectName);     // AGENTS.md template
  const agentMd = generateAgentMd();                   // agent.md template
  const claudeMd = generateClaudeMd();                 // CLAUDE.md template

  // AGENTS.md and agent.md — always scaffolded
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const agentPath = path.join(targetDir, 'agent.md');
  if (!fs.existsSync(agentsPath)) fs.writeFileSync(agentsPath, agentsMd);
  if (!fs.existsSync(agentPath))  fs.writeFileSync(agentPath, agentMd);

  // CLAUDE.md — only when Claude Code harness is selected
  if (selectedHarnesses.includes('claude')) {
    const claudePath = path.join(targetDir, 'CLAUDE.md');
    if (!fs.existsSync(claudePath)) {
      fs.writeFileSync(claudePath, claudeMd);
    }
  }
}
```

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
- [ ] `.npmignore` present and excludes `node_modules/`, `tests/`, `.agents/package.json`
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
  Squad:        full-team (22 agents)
  Harnesses:    opencode, claude-code, cursor

  Created:
    ✓ .agents/                        (core agent engine)
    ✓ .opencode -> .agents            (opencode harness)
    ✓ .claude -> .agents             (Claude Code harness)
    ✓ .cursor/rules/*.mdc            (22 Cursor rules)
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
    `  Squad:        full-team (22 agents)`,
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
    lines.push(`    ✓ .cursor/rules/*.mdc            (22 Cursor rules)`);
  if (selections.harnesses.includes('github'))
    lines.push(`    ✓ .github/agents/*.yml           (22 Copilot agents)`);
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
| 22 agents | Full `.agents/agents/` directory | 22 `.yml` files, all parseable YAML |
| Agent with no description | `agent.md` with no `description` field | `.yml` with `description: ""` (empty string, no crash) |
| Agent with quotes in description | `description: 'She said "hello"'` | `.yml` with `description: "She said \\"hello\\""` (escaped) |

### Test 3: `transpileCursorMDC()`
| Case | Input | Expected |
|:---|:---|:---|
| Single agent | `founder.md` with frontmatter | `.cursor/rules/founder.mdc` with `globs: "*"`, `alwaysApply: false`, frontmatter + body |
| 22 agents | Full directory | 22 `.mdc` files, all with correct frontmatter keys |
| Agent missing from source | `404.md` doesn't exist | Skipped (no output file) |

### Test 4: `createLink()`
| Case | OS | Expected |
|:---|:---|:---|
| Directory symlink | macOS/Linux | POSIX symlink created, `readlink()` returns target |
| Directory symlink | Windows (admin/DevMode) | Directory symlink created |
| Directory symlink | Windows (no admin) | Junctions created, `lstat().isSymbolicLink()` returns true for the junction |
| File symlink | macOS/Linux | POSIX symlink created |
| File symlink | Windows (no admin) | Falls back to `copyFileSync`, original file unchanged |
| Symlink already exists, points to same target | Any | Skipped, no error |
| Symlink already exists, points elsewhere | Any | Throws `EEXIST` (handled by conflict resolution, not this function) |
| Permission denied | Any | Throws `EACCES` with appropriate message |

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
3. `test-project/.cursor/rules/` must contain 22 `.mdc` file rules translated and compiled from `.agents/agents/*.md` with proper metadata.
4. `test-project/.windsurf/workflows` must be a valid symlink pointing to `.agents/skills`.
5. `test-project/.windsurfrules` must be a valid symlink pointing to `.agents/GUARDRAILS.md`.
6. `test-project/.github/agents/` must contain 22 `.yml` configuration files compiled correctly from the agent prompts.
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
3. **Tone Guidelines**: Added explicitly to `socratic-universal.md` and default prompt structures, instructing all 22 agent personas to respect this personalization parameter for a more conversational and natural collaborative experience.
