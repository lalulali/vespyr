# Vespyr

> English | [中文](README_CN.md)

A platform-agnostic, file-based multi-agent engine that installs a structured product development team directly into your repository. 21 specialized agent personas, 31 atomic skills, spec-kernel artifacts, shared persistent memory, and three architectural moats that no other framework combines.

[![Vespyr Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/lalulali/vespyr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏛️ Why Vespyr

| Differentiator | What it means | Why it matters |
|---|---|---|
| **Permission-denial I/O split** | Reasoning agents cannot touch files or run commands. All I/O goes through narrow sub-agents (`@reader`, `@writer`, `@executor`). | Context windows stay lean (~1,000 tokens vs 15,000+). 85-95% API cost savings. Sub-agents produce consistent, structured output. |
| **Socratic methodology depth** | Every reasoning agent has a `## Socratic Stance` declaring what it challenges. `/grill-me` runs a 7+1-branch decision tree. | Catches hidden assumptions, architectural conflicts, and edge cases that consensus-seeking teams miss. Challenge is baked into the persona layer. |
| **3-tier progressive memory** | Context loads in three tiers (core → agent-specific → task-relevant), with pattern pre-fetch that surfaces relevant past decisions proactively. | No context bloat from loading everything. No amnesia from loading nothing. Agents get exactly what they need, when they need it. |

---

## ⚡ Quick Start

```bash
npm install vespyr
npx vespyr
```

The interactive CLI wizard configures Vespyr for your IDE harness (OpenCode, Claude Code, Cursor, Windsurf, GitHub Copilot, Kiro) and bootstraps `artifacts/memory/` and `.agents/`.

```bash
# Install with defaults, skip wizard
npx vespyr --yes --target /path/to/my-project --harness opencode,claude

# Or run the CLI directly from the repo
node bin/cli.js --yes --target /path/to/my-project
```

---

## 👥 The Team

### Core Swarm (8 agents)

| Agent | Role | Channeled by |
|---|---|---|
| `@founder` 🧭 | Strategic concept stress-testing. GO/PIVOT/KILL verdict. | Paul Graham + Ben Horowitz |
| `@product-manager` 📋 | PRD, user stories, kanban, success metrics. | Marty Cagan + Teresa Torres |
| `@product-designer` 🎨 | UX/UI specs, screen states, wireframes, design system. | Don Norman + Julie Zhuo |
| `@architect` 🏗️ | System architecture, ADRs, API contracts, data models. | Rich Hickey + John Carmack |
| `@tech-lead` 📐 | Execution plans, task breakdown, estimation, parallel coordination. | Will Larson + Camille Fournier |
| `@developer` 💻 | Test-driven feature implementation and refactoring. | Kent Beck + Robert C. Martin |
| `@code-reviewer` 🔍 | Read-only code audits, pattern violations, systemic escalation. | Dave Cheney + John Regehr |
| `@qa-engineer` 🧪 | Integration testing, regression validation, release certification. | James Bach + Michael Bolton |

### Domain Experts (9 agents)

| Agent | Role | Channeled by |
|---|---|---|
| `@researcher` 🔬 | Market analysis, competitive landscape, technology trends. | Clayton Christensen + Cindy Alvarez |
| `@user-researcher` 👥 | User interviews, personas, jobs-to-be-done. | Steve Krug + Erika Hall |
| `@ux-researcher` 🎭 | Usability evaluation, journey mapping, interaction patterns. | Don Norman + Jakob Nielsen |
| `@data-analyst` 📊 | Telemetry, dashboards, funnel analysis, experiments. | Avinash Kaushik + Edward Tufte |
| `@security-engineer` 🔒 | Threat models, vulnerability scans, findings. | Bruce Schneier + OWASP |
| `@performance-engineer` ⚡ | Latency profiling, optimization, load testing. | Brendan Gregg + Aleksey Shipilëv |
| `@ml-engineer` 🤖 | Model integration, prompt templates, eval harnesses. | Andrej Karpathy + François Chollet |
| `@devops-engineer` 🚀 | CI/CD, cloud provisioning, monitoring, deployment. | Kelsey Hightower + Charity Majors |
| `@technical-writer` ✍️ | User manuals, API specs, release notes, docs site. | Strunk + White |

### I/O Sub-Agents (4 agents)

| Agent | Role |
|---|---|
| `@reader` 📖 | Fast file queries, regex searches, structured summaries. |
| `@writer` ✏️ | Precise file edits and writes. Zero reasoning overhead. |
| `@executor` ⚙️ | Shell command execution with curated summaries. |
| `@memory-controller` 🧠 | Context loading, memory validation, compaction, session continuity. |

---

## 📋 Workflow Phases

Vespyr organizes work into 11 sequential phases. The canonical phase table at `.agents/references/phase-table.md` is the single source of truth.

| Phase | Folder | Primary Skill | Gate |
|---|---|---|---|
| -1 | Validation | `/validate-idea` | GO/PIVOT/KILL |
| 0-1 | Discovery & Research | `/explore-idea` | Quality gate |
| 2-3 | Strategy & Architecture | `/design` | PRD + ADR approved |
| 4 | Planning | `/plan` | Plan approved |
| 5 | Execution | `/develop` | All tests green |
| 6 | Launch | `/launch` | Production deploy |
| 7 | Iteration | `/iterate` | Insights reviewed |
| 8 | Documentation | (cross-cutting) | Docs current |
| 9 | Retro | `/retro` | Action items filed |

**Key workflows:** `/shape-up` (idea structuring), `/help-me` (navigator), `/grill-me` (Socratic stress-test), `/squad` (team presets), `/memory` (archive search), `/customize` (agent overrides).

---

## 🛠 How It Works

```
┌──────────────────────────────────────┐
│           REASONING AGENTS           │
│  founder, PM, architect, developer…  │
│  (no file access, no shell — by      │
│   design. Must delegate I/O.)        │
└──────────────┬───────────────────────┘
               │ delegates to
               ▼
┌──────────────────────────────────────┐
│           I/O SUB-AGENTS             │
│  @reader  — reads & summarizes       │
│  @writer  — writes & edits precisely │
│  @executor — runs commands           │
└──────────────┬───────────────────────┘
               │ context via
               ▼
┌──────────────────────────────────────┐
│        @memory-controller            │
│  3-tier progressive load + pattern   │
│  pre-fetch + auto-compaction         │
└──────────────────────────────────────┘
```

**Delegation Protocol:** Reasoning agents follow `.agents/references/delegation-policy.md` — a task-to-sub-agent mapping with threshold rules (≤3 small files read directly, >3 delegated to @reader; ≤50 lines written directly, >50 delegated to @writer). Direct I/O outside these rules requires `[DIRECT-IO-JUSTIFIED: ...]`.

**Memory System:** 5 persistent files (`project-context`, `active-decisions`, `patterns-and-conventions`, `lessons-learned`, `blockers-and-risks`) plus an archive with keyword+recency scoring. Pattern pre-fetch surfaces relevant past decisions before the full context load.

---

## 🧩 Atomic Skills & Artifacts

### Skills

Every skill is a folder with a `SKILL.md` router (≤ 60 lines) + `steps/` directory. Each step is a self-contained 30-80 line file with its own halt conditions and delegation contract.

- **Tri-modal:** `validate-idea` and `design` have `steps-create/`, `steps-edit/`, `steps-validate/` subfolders. Mode detection is automatic — the skill checks for the artifact and routes accordingly.
- **Context-detecting:** `shape-up` detects existing artifacts (validation brief, research, shaped brief) and adapts its 6-step flow — no mode selector. Works standalone (`shape-up → design`) or between any pipeline phases (`validate → explore → shape-up → design`).
- **Resumable:** The `stepsCompleted` array in the output document's YAML frontmatter makes resumption deterministic. Re-activate `develop` with `stepsCompleted: [1,2,3,4,5]` and it jumps to step 6.
- **Delegation contracts:** Every step file declares which sub-agents to use for reads, writes, and runs — step-specific, not generic.

### Artifacts

Long monolithic templates (14KB PRDs) are replaced by a **5-field spec kernel** + content-typed companions:

```
<artifact-folder>/
├── SPEC.md                  # Why / Capabilities / Constraints / Non-goals / Success signal
├── glossary.md              # term definitions
├── acceptance-criteria.md   # Given/When/Then per AC
├── user-journey.md          # journey map
└── decision-log.md          # canonical memory for this spec
```

Capability IDs (`CAP-1`, `CAP-2`, ...) are stable — subsequent artifacts reference them for traceability. `design.md` defines the visual spec (colors, typography, component states, animations, breakpoints, spacing) as the engineering source of truth.

### State & Pipeline Enforcement

`sprint-status.yaml` is the human-readable source of truth. `orchestrator_state.js status`/`next` print ASCII dashboards by default (phase pipeline, artifact completeness, blockers). Pipeline enforcement rules ensure agents verify phase state at startup and log completion at shutdown — no out-of-order execution.

### Agent Depth

All 9 domain expert agents have ≥ 200 lines with decision trees (when to invoke/escalate), failure modes (5-7 domain-specific), and conflict resolution patterns. `@code-reviewer` includes a 15-item false-positive guard that stops LLM reviewers from pattern-matching against their training corpus.

---

## 🎨 Customization

Agent overrides survive upgrades via 2-file TOML merge:

```
.agents/agents/<name>/customize.toml   # factory defaults (regenerated)
.agents/custom/<name>.toml              # your overrides (never touched)
```

Scalars override-wins, tables deep-merge, arrays keyed-merge. Edit `.agents/custom/developer.toml` to set `temperature = 0.5` — it sticks across `npx vespyr` updates.

---

## 📚 References

| Document | Purpose |
|---|---|
| `AGENTS.md` | Full agent framework & behavioral guidelines |
| `.agents/references/phase-table.md` | Canonical 11-phase pipeline |
| `.agents/references/glossary.md` | Locked terminology (no synonyms) |
| `.agents/references/agent-contracts.md` | Owns vs. does NOT own per agent |
| `.agents/references/delegation-policy.md` | Task→sub-agent mapping + override protocol |
| `.agents/delegation-pattern.md` | Cross-harness delegation concept |
| `QUICK-REFERENCE.md` | One-page system overview |

---

MIT License. [GitHub Issues](https://github.com/lalulali/vespyr/issues)
