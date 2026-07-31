# Vespyr

> [English](README.md) | 中文

**一个平台无关、基于文件的多智能体引擎。** 将 22 个专业 AI 角色直接安装到你的仓库中。它们规划、设计、构建、审查、测试和交付——拥有跨会话持久化的结构化记忆，以及三大其他框架无法同时具备的架构护城河。

[![Vespyr Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/lalulali/vespyr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

📖 **[完整文档 →](Guide/cn/index.md)**

---

## 🏛️ 为什么选择 Vespyr

| 差异化能力 | 成本影响 | 质量影响 |
|---|---|---|
| **权限拒绝式 I/O 分离** — 推理智能体不能触碰文件或 Shell。所有 I/O 通过窄化子代理。 | **API 成本节省 85-95%。** 上下文窗口保持在约 1,000 tokens，而非 15,000+。 | 子代理产出一致、结构化的输出——推理流中无临时文件 diff。 |
| **苏格拉底式深度方法** — 每个智能体声明其挑战的内容。`/grill-me` 运行 7+1 分支决策树。 | 在代码编写*之前*捕捉隐藏假设——避免代价高昂的重写。 | 架构冲突和边界情况在设计阶段就被暴露，而非在审查中才发现。 |
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

> **初次使用 Vespyr？** 跟随[快速上手指南](Guide/cn/getting-started.md)逐步学习。

---

## 👥 团队（22 个智能体）

### 核心群体

| `@founder` 🧭 | `@product-manager` 📋 | `@product-designer` 🎨 | `@architect` 🏗️ |
| `@tech-lead` 📐 | `@developer` 💻 | `@code-reviewer` 🔍 | `@qa-engineer` 🧪 |

### 领域专家

| `@researcher` 🔬 | `@user-researcher` 👥 | `@ux-researcher` 🎭 | `@shifu` 🎓 |
| `@data-analyst` 📊 | `@security-engineer` 🔒 | `@performance-engineer` ⚡ | `@ml-engineer` 🤖 |
| `@devops-engineer` 🚀 | `@technical-writer` ✍️ |

### I/O 子代理 (4)

`@reader` 📖 · `@writer` ✏️ · `@executor` ⚙️ · `@memory-controller` 🧠

---

## 🛠 工作原理

```
┌──────────────────────────────────────────┐
│           推理智能体 (18)                 │
│  founder、PM、architect、developer...    │
│  （按设计无文件权限、无 Shell）           │
└──────────────┬───────────────────────────┘
                │ 委托至
                ▼
┌──────────────────────────────────────────┐
│           I/O 子代理 (4)                 │
│  @reader · @writer · @executor           │
│  @memory-controller                      │
│  三级渐进式加载 + 模式预取               │
└──────────────────────────────────────────┘
```

**推理智能体思考。子代理执行。** 这种分离不是限制——是架构设计。它保持上下文窗口精简，输出结构化，每次操作可审计。[委托工作原理 →](Guide/cn/reference.md#委托策略)

---

## 📋 流水线一览

```
validate → explore → design → plan → develop → launch → iterate → retro
```

从创意验证到发布后迭代共 11 个阶段。`/help-me` 始终告诉你下一步。`.agents/references/phase-table.md` 是权威来源。

[完整流水线指南 →](Guide/cn/skills-and-workflows.md)

---

## 🧩 核心功能

- **39 个斜杠命令** — 从 `/validate-idea`、`/design` 到 `/develop`、`/launch`、`/code-graph`、`/customize-skill` 和 `/create-skill`
- **结构图谱** — 代码图谱映射依赖，文档图谱映射可追溯性。智能体直接查询而无需 grep。
- **智能体自定义** — 双文件 TOML 合并。升级时你的覆盖配置保持不变。
- **多平台支持** — 兼容 OpenCode、Claude Code、Cursor、Windsurf、Copilot、Kiro、Aider。
- **11 阶段流水线** — 带强制执行。无越序执行。

[完整技能目录 →](Guide/cn/skills-and-workflows.md) · [图谱配置 →](Guide/cn/structural-graphs.md) · [自定义 →](Guide/cn/configuration.md)

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
