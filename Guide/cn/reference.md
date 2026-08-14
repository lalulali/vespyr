# 6. 参考

> [← 返回指南](index.md) | [上一章：结构图谱](structural-graphs.md)

## 智能体架构

Vespyr 的 23 个智能体分为三层：

## 记忆协议

每个智能体都使用自己的工具直接执行文件读取、写入和命令运行。唯一的专门化服务是**记忆**：所有记忆操作都经由 `@memory-controller`（基于脚本）。

- **加载** — `@memory-controller load <agent> [task]`：渐进式三级上下文（见记忆系统架构）
- **写入** — `@memory-controller write <file>`：经模式校验的条目写入 `artifacts/memory/`
- **会话** — 每个会话以 `@memory-controller session-write` 结束：更新 `session-summaries/latest.md` 和流水线状态
- **回退** — 若 `@memory-controller` 不可用，直接使用自己的工具读写记忆文件，并在会话摘要中注明

记忆文件位于 `artifacts/memory/`（`project-context.md`、`active-decisions.md`、`lessons-learned.md`）。

## 智能体契约

每个智能体有明确定义的范围。`.agents/references/agent-contracts.md` 是权威来源。

| 智能体 | 拥有 | 不拥有 |
|-------|------|-------------|
| `@founder` | 战略决策、GO/PIVOT/KILL | 实现细节 |
| `@product-manager` | PRD、用户故事、看板 | 技术架构 |
| `@product-designer` | UX/UI 规格、设计系统 | 实现代码 |
| `@architect` | 系统设计、ADR、API 契约 | 执行计划 |
| `@tech-lead` | 任务拆分、评估 | 架构决策 |
| `@developer` | 功能实现、测试 | 产品需求 |
| `@code-reviewer` | 代码质量、安全初扫 | 功能设计 |
| `@qa-engineer` | 测试计划、回归 | 架构决策 |
| `@researcher` | 市场分析、竞争情报 | 用户访谈 |
| `@user-researcher` | 人物画像、JTBD、旅程图 | 可用性评估 |
| `@ux-researcher` | 可用性、交互评估 | 人物画像开发 |
| `@security-engineer` | 威胁建模、漏洞扫描 | 代码修复 |
| `@performance-engineer` | 性能分析、瓶颈分析 | 修改代码 |
| `@ml-ai-engineer` | ML/AI 模型、提示词、RAG、Eval | 数据分析、基础设施、生产部署 |
| `@ml-ai-ops` | 生产部署、向量索引、漂移监控、回滚 | 模型/提示词开发、AI 架构 |
| `@data-analyst` | 遥测、仪表盘、实验 | 系统性能 |
| `@devops-engineer` | CI/CD、基础设施、部署 | 应用代码 |
| `@shifu` | 学习路径、教育内容、自适应解释 | 产品战略 |
| `@technical-writer` | 文档、API 参考、发布说明 | 产品战略 |

## 术语表

术语已锁定——不允许同义词。完整术语表见 `.agents/references/glossary.md`。

| 术语 | 定义 |
|------|-----------|
| **智能体（Agent）** | 一个专门的 AI 角色，有定义的范围、护栏和决策树 |
| **技能（Skill）** | 一个多步骤工作流（包含 SKILL.md + steps/ 的文件夹） |
| **阶段（Phase）** | 11 个顺序流水线阶段之一 |
| **制品（Artifact）** | 智能体产出的任何文件（规格、ADR、代码、测试） |
| **Spec Kernel** | 5 字段规格结构：Why / Capabilities / Constraints / Non-goals / Success signal |
| **ADR** | 架构决策记录 |
| **PRD** | 产品需求文档 |
| **记忆（Memory）** | 跨智能体和会话的持久共享上下文 |
| **平台（Harness）** | 加载智能体的 AI 开发者工具（OpenCode、Claude Code 等） |

## 记忆系统架构

### 三级渐进式加载

| 级 | 内容 | 大小 | 何时加载 |
|------|----------|------|-------------|
| 第一级 | 核心上下文（技术栈、约束） | ~200 tokens | 每次智能体调用 |
| 第二级 | 智能体专属模式 | ~300 tokens | 智能体激活时 |
| 第三级 | 任务相关结果 | ~500 tokens | 任务分配时 |

### 模式预取

在完整上下文加载之前，记忆控制器主动呈现匹配当前任务的相关历史决策。例如：在 architect 审查认证变更之前，预取过往的认证相关 ADR 和经验教训。

### 持久化文件

```
artifacts/memory/
├── project-context.md            # 技术栈、约束、架构
├── active-decisions.md           # 进行中的关键选择
├── lessons-learned.md            # 工程洞察、已修复的 Bug
├── patterns-and-conventions.md   # 已建立的模式
├── blockers-and-risks.md         # 活跃阻塞项
├── pending-questions/            # 按主题分类的待解决问题
├── agent-notes/                  # 每个智能体的观察笔记
├── archive/                      # 已压缩的旧条目（NDJSON 索引）
└── structural/                   # Code-graph.json + doc-graph.json
```

### 压缩

当记忆文件超过 200 行时，记忆控制器进行压缩——总结已解决的条目，归档到 NDJSON 索引，保持文件精简。使用 `/memory` 搜索归档。

## 苏格拉底式立场

每个推理智能体都有 `## Socratic Stance` 部分，声明：
- **挑战什么** — 它将质疑的假设
- **"改变我的想法"意味着什么** — 接受什么证据
- **何时升级** — 何时引入另一个智能体

`/grill-me` 技能运行 7+1 分支决策树，在任何代码被编写之前对每个假设进行压力测试。这不是对抗性的——是植根于每个智能体的结构化怀疑。

## 核心行为准则

所有智能体遵循四个原则：

1. **三思后行** — 明确陈述假设。呈现权衡。质疑不必要的复杂性。
2. **简单至上** — 构建最小必要。无推测性功能。无"以防万一"的抽象。
3. **手术式操作** — 只触碰必要的部分。保留现有约定。无附带清理。
4. **目标驱动执行** — 开始前定义成功标准。测试先行。经验证完成闭环。
