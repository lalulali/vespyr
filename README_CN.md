# Vespyr

> [English](README.md) | 中文

**一个平台无关、基于文件的多智能体引擎。** 将 20 个专业 AI 角色直接安装到你的仓库中。它们规划、设计、构建、审查、测试和交付——拥有跨会话持久化的结构化记忆，以及两大其他框架无法同时具备的架构护城河。

[![Vespyr Version](https://img.shields.io/badge/version-2.0.7-blue)](https://github.com/lalulali/vespyr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

📖 **[完整文档 →](Guide/cn/index.md)**

---

## 🏛️ 为什么选择 Vespyr

| 差异化能力 | 成本影响 | 质量影响 |
|---|---|---|
| **苏格拉底式深度方法** — 每个智能体声明其挑战的内容。`/grill-me` 运行八步通用审问框架。 | 在代码编写*之前*捕捉隐藏假设——避免代价高昂的重写。 | 架构冲突和边界情况在设计阶段就被暴露，而非在审查中才发现。 |
| **三级渐进式记忆** — 上下文分三层加载（核心 → 角色专属 → 任务相关），配合主动模式预取。 | 不会因加载全部内容导致上下文膨胀，也不会因什么都不加载导致遗忘。 | 智能体在需要时获取相关的历史决策、模式和风险，不受上下文窗口洪泛影响。 |

---

## ⚡ 快速开始

```bash
# 全局安装
npm install vespyr
npx vespyr
```

```bash
# 或从克隆的仓库安装
git clone https://github.com/lalulali/vespyr.git
cd vespyr
npm install
node bin/cli.js --yes --target /path/to/my-project --harness opencode,claude
```

交互式 CLI 向导为你的 IDE 平台配置 Vespyr 并初始化项目。

```bash
# 非交互式（跳过向导）
npx vespyr --yes --target /path/to/my-project --harness opencode,claude
```

然后运行你的第一个工作流：

```
/validate-idea   →   /explore-idea   →   /design   →   /develop   →   /launch
```

涵盖从 `/validate-idea`、`/design`、`/round-table` 到 `/shut-up`、`/motion`、`/develop`、`/launch`、`/customize-skill` 和 `/create-skill` 等 43 个端到端工作流（全部通过 CI 校验符合 [agentskills.io](https://agentskills.io) 智能体技能规范）。

> **初次使用 Vespyr？** 跟随[快速上手指南](Guide/cn/getting-started.md)逐步学习。

---

## 👥 团队（20 个智能体）

### 核心群体

| `@founder` 🧭 | `@product-manager` 📋 | `@product-designer` 🎨 | `@architect` 🏗️ |
| `@tech-lead` 📐 | `@developer` 💻 | `@code-reviewer` 🔍 | `@qa-engineer` 🧪 |

### 领域专家

| `@researcher` 🔬 | `@user-researcher` 👥 | `@ux-researcher` 🎭 | `@shifu` 🎓 |
| `@data-analyst` 📊 | `@security-engineer` 🔒 | `@performance-engineer` ⚡ | `@ml-ai-engineer` 🤖 |
| `@ml-ai-ops` ⚙️ | `@devops-engineer` 🚀 | `@technical-writer` ✍️ |

### 记忆层

`@memory-controller` 🧠 — 基于脚本的记忆服务（渐进式上下文加载、经校验的写入、压缩）

---

## 🛠 工作原理

```
┌──────────────────────────────────────────┐
│           推理智能体 (19)                  │
│  founder、PM、architect、developer...     │
└──────────────┬───────────────────────────┘
                │ 委托至
                ▼
┌──────────────────────────────────────────┐
│           记忆服务                        │
│  @memory-controller (基于脚本)            │
│  三级渐进式加载 + 模式预取                  │
└──────────────────────────────────────────┘
```

**智能体直接行动。** 每个智能体都使用自己的工具直接执行读取、写入和命令运行；记忆操作经由 `@memory-controller`（基于脚本的服务，而非推理智能体的委托对象）。

---

## 📋 流水线一览

```
validate → explore → design → plan → develop → launch → iterate → retro
```

从创意验证到发布后迭代共 11 个阶段。`/help-me` 始终告诉你下一步。`.agents/references/phase-table.md` 是权威来源。

[完整流水线指南 →](Guide/cn/skills-and-workflows.md)

---

## 🧩 核心功能

- **43 个精心策划的技能** — 涵盖从 `/validate-idea`、`/design`、`/round-table` 到 `/shut-up`、`/motion`、`/develop`、`/launch`、`/customize-skill` 和 `/create-skill` 等。
- **整合的三级记忆与机器状态栅栏** — `project-context.md` 原子状态自动同步、精简的 5 文件共享记忆与阶段边界自动归档压缩。
- **安全与完整性引擎** — 已签名的 SHA-256 清单校验（`vespyr verify`）、供应链安全审计（`vespyr audit`）、封闭权限注册表与 T3 数据信任边界准入控制。
- **智能体自定义** — 双文件 TOML 合并。升级时你的覆盖配置保持不变。
- **多平台支持** — 兼容 OpenCode、Claude Code、Cursor、Windsurf、Copilot、Kiro、Aider、Google Antigravity。
- **11 阶段流水线** — 带强制执行。无越序执行。

[完整技能目录 →](Guide/cn/skills-and-workflows.md) · [自定义 →](Guide/cn/configuration.md)

---

## 🔒 完整性与安全工具

```bash
# 校验 .agents/ 文件与已签名 SHA-256 清单的完整性
npx vespyr verify

# 运行供应链安全与内容完整性审计扫描
npx vespyr audit

# 生成或更新 .agents/manifest.json 校验和文件
npx vespyr manifest
```

---

## 📚 文档

| 层级 | 资源 |
|-------|----------|
| **从这里开始** | [快速上手指南](Guide/cn/getting-started.md) — 首个项目、调用智能体、基础流水线 |
| **综合指南** | [完整指南](Guide/cn/index.md) — 安装、配置、技能、图谱、参考 |
| **快速概览** | [QUICK-REFERENCE.md](QUICK-REFERENCE.md) — 单页系统速查表 |
| **智能体参考** | [AGENTS.md](AGENTS.md) — 完整智能体框架与行为准则 |

---

MIT License. [GitHub Issues](https://github.com/lalulali/vespyr/issues)
