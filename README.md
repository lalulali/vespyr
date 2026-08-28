# Vespyr

> English | [中文](README_CN.md)

**A platform-agnostic, file-based multi-agent engine.** Install 20 specialized AI personas directly into your repository. They plan, design, build, review, test, and ship — with structured memory that persists across sessions and two architectural moats no other framework combines.

[![Vespyr Version](https://img.shields.io/badge/version-2.0.7-blue)](https://github.com/lalulali/vespyr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

📖 **[Full Documentation →](Guide/en/index.md)**

---

## 🏛️ Why Vespyr

| Differentiator | Cost Impact | Quality Impact |
|---|---|---|
| **Socratic methodology depth** — every agent declares what it challenges. `/grill-me` runs an eight-move interrogation frame. | Catches hidden assumptions *before* code is written — preventing expensive rewrites. | Architectural conflicts and edge cases surfaced by design, not caught in review. |
| **3-tier progressive memory** — context loads in tiers (core → agent-specific → task-relevant), with proactive pattern pre-fetch. | No context bloat from loading everything. No amnesia from loading nothing. | Agents get relevant past decisions, patterns, and risks without context window flooding. |

**Intent & Scope Triage Gate (DNA 4):** un-persona'd domain requests are intercepted before execution — ambiguous prompts halt and receive a 2–3 Track Fork card with recommended `@agent` / `/skill` handles; trivial tasks pass unimpeded.

---

## ⚡ Quick Start

```bash
# Install globally
npm install vespyr
npx vespyr
```

```bash
# Or install from cloned repo
git clone https://github.com/lalulali/vespyr.git
cd vespyr
npm install
node bin/cli.js --yes --target /path/to/my-project --harness opencode,claude
```

The interactive CLI wizard configures Vespyr for your IDE harness and bootstraps your project.

```bash
# Non-interactive (skip wizard)
npx vespyr --yes --target /path/to/my-project --harness opencode,claude
```

Then run your first workflow:

```
/validate-idea   →   /explore-idea   →   /design   →   /develop   →   /launch
```

> **New to Vespyr?** Follow the step-by-step [Getting Started Guide](Guide/en/getting-started.md).

---

## 👥 The Team (20 Agents)

### Core Swarm

| `@founder` 🧭 | `@product-manager` 📋 | `@product-designer` 🎨 | `@architect` 🏗️ |
| `@tech-lead` 📐 | `@developer` 💻 | `@code-reviewer` 🔍 | `@qa-engineer` 🧪 |

### Domain Experts

| `@researcher` 🔬 | `@user-researcher` 👥 | `@ux-researcher` 🎭 | `@shifu` 🎓 |
| `@data-analyst` 📊 | `@security-engineer` 🔒 | `@performance-engineer` ⚡ | `@ml-ai-engineer` 🤖 |
| `@ml-ai-ops` ⚙️ | `@devops-engineer` 🚀 | `@technical-writer` ✍️ |

### Memory Layer

`@memory-controller` 🧠 — script-backed memory service (progressive context loading, validated writes, compaction)

---

## 🛠 How It Works

```
┌──────────────────────────────────────────┐
│               AGENTS (20)                │
│  founder, PM, architect, developer...    │
└──────────────────────────────────────────┘
        │ memory operations
        ▼
┌──────────────────────────────────────────┐
│           MEMORY SERVICE                 │
│  @memory-controller (script-backed)      │
│  3-tier progressive load + pre-fetch     │
└──────────────────────────────────────────┘
```

**Agents act directly.** Every persona performs its own reads, writes, and command runs with its own tools; memory operations go through `@memory-controller` (a script-backed service, not a reasoning-agent delegate).

---

## 📋 Pipeline at a Glance

```
validate → explore → design → plan → develop → launch → iterate → retro
```

11 phases from idea validation through post-launch iteration. `/help-me` always tells you what's next. The phase table at `.agents/references/phase-table.md` is the canonical source.

[Full pipeline guide →](Guide/en/skills-and-workflows.md)

---

## 🧩 Key Capabilities

- **43 curated skills** — from `/validate-idea`, `/design`, and `/round-table` to `/shut-up`, `/motion`, `/develop`, `/launch`, `/customize-skill`, and `/create-skill` (all validated against the [agentskills.io](https://agentskills.io) spec via CI)
- **Consolidated 3-tier memory & machine fencing** — atomic state syncing in `project-context.md`, streamlined 5-file shared memory, and automatic phase-boundary compaction.
- **Security & integrity engine** — pinned SHA-256 manifest verification (`vespyr verify`; unsigned interim — accidental-drift detection only, see ADR-002 §2.1.1), supply-chain audit (`vespyr audit`), closed permission registry, and T3 data trust boundary admission control.
- **Agent customization** — 2-file TOML merge. Your overrides survive upgrades.
- **Multi-harness** — first-class installs for OpenCode, Claude Code, Kiro, and GitHub Copilot; the universal `.agents/` store is read directly by Aider, Google Antigravity, and Codex.
- **11-phase pipeline** — with enforcement. No out-of-order execution.

[Complete skills catalog →](Guide/en/skills-and-workflows.md) · [Customization →](Guide/en/configuration.md)

---

## 🔒 Integrity & Security Tooling

```bash
# Verify integrity of .agents/ against pinned SHA-256 manifest
npx vespyr verify

# Run supply-chain security and content integrity scanner
npx vespyr audit

# Generate or update .agents/manifest.json checksums
npx vespyr manifest
```

---

## 📚 Documentation

| Level | Resource |
|-------|----------|
| **Start here** | [Getting Started Guide](Guide/en/getting-started.md) — first project, invoking agents, basic pipeline |
| **Comprehensive** | [Full Guide](Guide/en/index.md) — installation, configuration, skills, graphs, reference |
| **Quick overview** | [QUICK-REFERENCE.md](QUICK-REFERENCE.md) — one-page system cheat sheet |
| **Agent reference** | [AGENTS.md](AGENTS.md) — full agent framework & behavioral guidelines |

---

MIT License. [GitHub Issues](https://github.com/lalulali/vespyr/issues)
