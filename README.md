# Vespyr

> English | [中文](README_CN.md)

**A platform-agnostic, file-based multi-agent engine.** Install 21 specialized AI personas directly into your repository. They plan, design, build, review, test, and ship — with structured memory that persists across sessions and three architectural moats no other framework combines.

[![Vespyr Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/lalulali/vespyr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

📖 **[Full Documentation →](Guide/en/index.md)**

---

## 🏛️ Why Vespyr

| Differentiator | Cost Impact | Quality Impact |
|---|---|---|
| **Permission-denial I/O split** — reasoning agents can't touch files or shell. All I/O goes through narrow sub-agents. | **85-95% API cost savings.** Context windows stay at ~1,000 tokens instead of 15,000+. | Sub-agents produce consistent, structured output — no ad-hoc diffs in the reasoning stream. |
| **Socratic methodology depth** — every agent declares what it challenges. `/grill-me` runs a 7+1-branch decision tree. | Catches hidden assumptions *before* code is written — preventing expensive rewrites. | Architectural conflicts and edge cases surfaced by design, not caught in review. |
| **3-tier progressive memory** — context loads in tiers (core → agent-specific → task-relevant), with proactive pattern pre-fetch. | No context bloat from loading everything. No amnesia from loading nothing. | Agents get relevant past decisions, patterns, and risks without context window flooding. |

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

## 👥 The Team (21 Agents)

### Core Swarm

| `@founder` 🧭 | `@product-manager` 📋 | `@product-designer` 🎨 | `@architect` 🏗️ |
| `@tech-lead` 📐 | `@developer` 💻 | `@code-reviewer` 🔍 | `@qa-engineer` 🧪 |

### Domain Experts

| `@researcher` 🔬 | `@user-researcher` 👥 | `@ux-researcher` 🎭 | `@data-analyst` 📊 |
| `@security-engineer` 🔒 | `@performance-engineer` ⚡ | `@ml-engineer` 🤖 | `@devops-engineer` 🚀 |
| `@technical-writer` ✍️ |

### I/O Sub-Agents

`@reader` 📖 · `@writer` ✏️ · `@executor` ⚙️ · `@memory-controller` 🧠

---

## 🛠 How It Works

```
┌──────────────────────────────────────────┐
│           REASONING AGENTS (17)           │
│  founder, PM, architect, developer...     │
│  (No file access, no shell — by design)   │
└──────────────┬───────────────────────────┘
               │ delegates to
               ▼
┌──────────────────────────────────────────┐
│           I/O SUB-AGENTS (3)             │
│  @reader · @writer · @executor           │
└──────────────┬───────────────────────────┘
               │ context via
               ▼
┌──────────────────────────────────────────┐
│        @memory-controller                │
│  3-tier progressive load + pre-fetch     │
└──────────────────────────────────────────┘
```

**Reasoning agents think. Sub-agents execute.** This split isn't a limitation — it's the architecture. It keeps context windows lean, output structured, and every operation auditable. [How delegation works →](Guide/en/reference.md#delegation-policy)

---

## 📋 Pipeline at a Glance

```
validate → explore → design → plan → develop → launch → iterate → retro
```

11 phases from idea validation through post-launch iteration. `/help-me` always tells you what's next. The phase table at `.agents/references/phase-table.md` is the canonical source.

[Full pipeline guide →](Guide/en/skills-and-workflows.md)

---

## 🧩 Key Capabilities

- **31 slash commands** — from `/validate-idea` and `/design` to `/develop`, `/launch`, `/code-graph`, and `/grill-me`
- **Structural graphs** — code-graph maps dependencies, doc-graph maps document traceability. Agents query them instead of grepping.
- **Agent customization** — 2-file TOML merge. Your overrides survive upgrades.
- **Multi-harness** — works with OpenCode, Claude Code, Cursor, Windsurf, Copilot, Kiro, Aider.
- **11-phase pipeline** — with enforcement. No out-of-order execution.

[Complete skills catalog →](Guide/en/skills-and-workflows.md) · [Graph configuration →](Guide/en/structural-graphs.md) · [Customization →](Guide/en/configuration.md)

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
