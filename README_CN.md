# Vespyr

> [English](README.md) | 中文

一个平台无关、基于文件的多智能体引擎，可直接将结构化的产品研发团队安装到你的仓库中。包含 21 个专业智能体角色、24 个原子化技能、Spec-Kernel 工件体系、共享持久化记忆，以及三大其他框架无法同时具备的架构护城河。

[![Vespyr Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/lalulali/vespyr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏛️ 为什么选择 Vespyr

| 差异化能力 | 含义 | 为什么重要 |
|---|---|---|
| **权限拒绝式 I/O 分离** | 推理智能体不能触碰文件或执行命令，所有 I/O 必须通过窄化子代理 (`@reader`、`@writer`、`@executor`)。 | 上下文窗口保持精简（约 1,000 tokens vs 15,000+），API 成本节省 85-95%。子代理产出结构化、一致的输出。 |
| **苏格拉底式深度方法** | 每个推理智能体都有 `## Socratic Stance` 声明其挑战的内容。`/grill-me` 运行 7+1 分支决策树。 | 捕捉共识型团队遗漏的隐藏假设、架构冲突和边界情况。挑战深植于角色层。 |
| **三级渐进式记忆** | 上下文分三层加载（核心 → 角色专属 → 任务相关），配合模式预取，主动呈现相关历史决策。 | 不会因加载全部内容导致上下文膨胀，也不会因什么都不加载导致遗忘。智能体在需要时获取恰好所需的信息。 |

---

## ⚡ 快速开始

```bash
npm install vespyr
npx vespyr
```

交互式 CLI 向导会为你的 IDE 平台配置 Vespyr（支持 OpenCode、Claude Code、Cursor、Windsurf、GitHub Copilot、Kiro），并初始化 `artifacts/memory/` 和 `.agents/` 目录。

```bash
# 使用默认设置安装，跳过向导
npx vespyr --yes --target /path/to/my-project --harness opencode,claude

# 或直接从仓库运行 CLI
node bin/cli.js --yes --target /path/to/my-project
```

---

## 👥 团队

### 核心群体 (8 个智能体)

| 智能体 | 职责 | 传承导师 |
|---|---|---|
| `@founder` 🧭 | 战略概念压力测试，GO/PIVOT/KILL 裁决。 | Paul Graham + Ben Horowitz |
| `@product-manager` 📋 | PRD、用户故事、看板、成功指标。 | Marty Cagan + Teresa Torres |
| `@product-designer` 🎨 | UX/UI 规格、界面状态、线框图、设计系统。 | Don Norman + Julie Zhuo |
| `@architect` 🏗️ | 系统架构、ADR、API 契约、数据模型。 | Rich Hickey + John Carmack |
| `@tech-lead` 📐 | 执行计划、任务拆分、评估、并行协调。 | Will Larson + Camille Fournier |
| `@developer` 💻 | 测试驱动的特性实现与重构。 | Kent Beck + Robert C. Martin |
| `@code-reviewer` 🔍 | 只读代码审计、模式违规、系统性升级。含 15 条误报排除清单。 | Dave Cheney + John Regehr |
| `@qa-engineer` 🧪 | 集成测试、回归验证、发布认证。 | James Bach + Michael Bolton |

### 领域专家 (9 个智能体)

| 智能体 | 职责 | 传承导师 |
|---|---|---|
| `@researcher` 🔬 | 市场分析、竞争格局、技术趋势。 | Clayton Christensen + Cindy Alvarez |
| `@user-researcher` 👥 | 用户访谈、人物画像、待办任务分析。 | Steve Krug + Erika Hall |
| `@ux-researcher` 🎭 | 可用性评估、用户旅程图、交互模式。 | Don Norman + Jakob Nielsen |
| `@data-analyst` 📊 | 数据埋点、仪表盘、漏斗分析、实验设计。 | Avinash Kaushik + Edward Tufte |
| `@security-engineer` 🔒 | 威胁建模、漏洞扫描、安全审计。 | Bruce Schneier + OWASP |
| `@performance-engineer` ⚡ | 延迟分析、性能优化、负载测试。 | Brendan Gregg + Aleksey Shipilëv |
| `@ml-engineer` 🤖 | 模型集成、Prompt 模板、评估框架。 | Andrej Karpathy + François Chollet |
| `@devops-engineer` 🚀 | CI/CD、云资源供给、监控、部署。 | Kelsey Hightower + Charity Majors |
| `@technical-writer` ✍️ | 用户手册、API 文档、发布说明、文档站。 | Strunk + White |

### I/O 子代理 (4 个智能体)

| 智能体 | 职责 |
|---|---|
| `@reader` 📖 | 快速文件查询、正则搜索、结构化摘要。 |
| `@writer` ✏️ | 精确的文件编辑和写入。零推理开销。 |
| `@executor` ⚙️ | Shell 命令执行，输出精炼摘要。 |
| `@memory-controller` 🧠 | 上下文加载、记忆验证、压缩归档、会话连续性。 |

---

## 📋 工作流程阶段

Vespyr 将工作组织为 11 个顺序阶段。`.agents/references/phase-table.md` 中的阶段表是唯一权威来源。

| 阶段 | 目录 | 主要技能 | 关口 |
|---|---|---|---|
| -1 | 验证 | `/validate-idea` | GO/PIVOT/KILL |
| 0-1 | 发现与研究 | `/explore-idea` | 质量关口 |
| 2-3 | 战略与架构 | `/design` | PRD + ADR 批准 |
| 4 | 规划 | `/plan` | 计划批准 |
| 5 | 执行 | `/develop` | 全部测试通过 |
| 6 | 发布 | `/launch` | 生产部署 |
| 7 | 迭代 | `/iterate` | 洞察已评审 |
| 8 | 文档 | (贯穿) | 文档已更新 |
| 9 | 回顾 | `/retro` | 行动项已记录 |

**关键工作流：** `/help-me`（导航助手）、`/grill-me`（苏格拉底式压力测试）、`/squad`（团队预设）、`/memory`（归档搜索）、`/customize`（智能体覆盖配置）。

---

## 🛠 工作原理

```
┌──────────────────────────────────────┐
│           推理智能体                  │
│  founder、PM、architect、developer…   │
│  （按设计无法访问文件和 Shell——      │
│   必须委托 I/O。）                    │
└──────────────┬───────────────────────┘
               │ 向以下委托
               ▼
┌──────────────────────────────────────┐
│           I/O 子代理                  │
│  @reader  — 读取并摘要               │
│  @writer  — 精确写入和编辑           │
│  @executor — 运行命令                 │
└──────────────┬───────────────────────┘
               │ 通过以下提供上下文
               ▼
┌──────────────────────────────────────┐
│        @memory-controller            │
│  三级渐进式加载 + 模式预取           │
│  + 自动压缩归档                      │
└──────────────────────────────────────┘
```

**委托协议：** 推理智能体遵循 `.agents/references/delegation-policy.md`——任务到子代理的映射及阈值规则（≤3 个小文件直接读取，>3 个委托给 @reader；≤50 行直接写入，>50 行委托给 @writer）。超出此规则的直接 I/O 需要 `[DIRECT-IO-JUSTIFIED: ...]` 标注。

**记忆系统：** 5 个持久化文件（`project-context`、`active-decisions`、`patterns-and-conventions`、`lessons-learned`、`blockers-and-risks`）加上基于关键词和新近度评分的归档。模式预取在完整上下文加载之前主动呈现相关历史决策。

---

## 🧩 原子化技能与工件体系

### 技能

每个技能是一个文件夹，包含 `SKILL.md` 路由器（≤ 60 行）+ `steps/` 目录。每个步骤是一个自包含的 30-80 行文件，拥有自己的停止条件和委托契约。

- **三态模式：** `validate-idea` 和 `design` 拥有 `steps-create/`、`steps-edit/`、`steps-validate/` 子文件夹。模式检测是自动的——技能检查工件是否存在并据此路由。
- **可恢复：** 输出文档 YAML 前置元数据中的 `stepsCompleted` 数组使恢复操作是确定性的。以 `stepsCompleted: [1,2,3,4,5]` 重新激活 `develop`，它会直接跳到步骤 6。
- **委托契约：** 每个步骤文件声明读取、写入、运行操作所使用的子代理——步骤专属，而非通用。

### 工件

冗长的单体模板（14KB PRD）被**五字段 Spec Kernel** + 类型化同伴文件替代：

```
<artifact-folder>/
├── SPEC.md                  # Why / Capabilities / Constraints / Non-goals / Success signal
├── glossary.md              # 术语定义
├── acceptance-criteria.md   # Given/When/Then 验收标准
├── user-journey.md          # 用户旅程图
└── decision-log.md          # 此 Spec 的规范记忆
```

能力 ID（`CAP-1`、`CAP-2`……）是稳定的——后续工件通过引用它们来实现可追溯性。`design.md` 定义视觉规范（颜色、排版、组件状态、动画、断点、间距），作为工程团队的权威来源。

### 状态与流水线执行

`sprint-status.yaml` 是人类可读的权威状态源。`orchestrator_state.js status`/`next` 默认输出 ASCII 仪表盘（阶段流水线、工件完成度、阻塞项）。流水线执行规则确保智能体在启动时验证阶段状态，在关闭时记录完成情况——杜绝越序执行。

### 智能体深度

全部 9 个领域专家智能体均达到 ≥ 200 行，配备决策树（何时调用/升级）、失败模式（5-7 个领域专属项）和冲突解决模式。`@code-reviewer` 包含 15 条误报排除清单，防止 LLM 审查者根据训练语料进行模式匹配而给出误导性反馈。

---

## 🎨 自定义

智能体覆盖配置通过双文件 TOML 合并实现，升级时不会被覆盖：

```
.agents/agents/<name>/customize.toml   # 出厂默认值（重新生成）
.agents/custom/<name>.toml              # 你的覆盖配置（永不被触碰）
```

标量覆盖即赢，表深度合并，数组按键合并。编辑 `.agents/custom/developer.toml` 设置 `temperature = 0.5`——在 `npx vespyr` 更新时保持不变。

---

## 📚 参考文档

| 文档 | 用途 |
|---|---|
| `AGENTS.md` | 完整的智能体框架与行为准则 |
| `.agents/references/phase-table.md` | 规范的 11 阶段流水线 |
| `.agents/references/glossary.md` | 锁定术语（无同义词） |
| `.agents/references/agent-contracts.md` | 每个智能体的职责边界（拥有/不拥有） |
| `.agents/references/delegation-policy.md` | 任务→子代理映射 + 覆盖协议 |
| `.agents/delegation-pattern.md` | 跨开发工具委托概念 |
| `QUICK-REFERENCE.md` | 单页系统概览 |

---

MIT License. [GitHub Issues](https://github.com/lalulali/vespyr/issues)
