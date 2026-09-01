# 5. 参考

> [← 返回指南](index.md) | [上一章：技能与工作流](skills-and-workflows.md)

## 智能体架构

Vespyr 的 20 个智能体分为三大功能类别（核心 Swarm、专门领域专家和共享记忆层）：

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

| 级 | 内容 | 何时加载 |
|------|------|-------------|
| 第一级 | 核心上下文（技术栈、约束） | 每次智能体调用 |
| 第二级 | 智能体专属模式 | 智能体激活时 |
| 第三级 | 任务相关结果 | 任务分配时 |

### 模式预取

在完整上下文加载之前，记忆控制器主动呈现匹配当前任务的相关历史决策。例如：在 architect 审查认证变更之前，预取过往的认证相关 ADR 和经验教训。

### 持久化文件

```
artifacts/memory/
├── project-context.md            # 技术栈、约束、架构、运行状态栅栏
├── active-decisions.md           # 进行中的关键选择
├── lessons-learned.md            # 工程洞察、已修复的 Bug
├── patterns-and-conventions.md   # 已建立的模式
├── blockers-and-risks.md         # 活跃阻塞项
├── session-summaries/            # 滚动实时游标 (latest.md) 与历史
└── archive/                      # 已压缩的旧条目（NDJSON 索引）
```

### 压缩

当记忆文件超过 200 行时，记忆控制器进行压缩——总结已解决的条目，归档到 NDJSON 索引，保持文件精简。使用 `/memory` 搜索归档。

## Vespyr 核心基因 (Core DNA): "拒绝应声虫" (No Yes-Men in the Swarm)

核心基因是每个会话无条件生效的底层运行准则：
- **反阿谀与苏格拉底默认立场：** 应声虫智能体是引擎缺陷。智能体必须陈述客观事实，揭示边界盲区，并在决策锁定前强制针对权衡与失效模式进行严密批判。
- **严禁功能性阿谀 ("口头警告但照单全收")：** 发出吓人的口头警告（如 *"这会导致电量消耗与延迟"*）却随即为该存在缺陷的前提起草实现方案、选项菜单或妥协方案，属于功能性阿谀，被严格禁止。
- **强制结论门禁 (`[KILL]` | `[PIVOT]` | `[PASS]`):**
  - **`[KILL]` (彻底否决):** 存在致命权衡或未验证的花哨需求。**否决零蓝图不变量 (Zero-Blueprint-on-KILL):** 严禁为被否决的前提生成实现计划、架构图或折中选项。
  - **`[PIVOT]` (调整方向):** 底层需求合理，但机制臃肿或存在风险。剥离冗余并推荐零成本原生方案。
  - **`[PASS]` (通过验收):** 经由实证数据或基准测试验证符合所有领域不变量。

## 苏格拉底式立场

每个推理智能体都有 `## Socratic Stance` 部分，声明：
- **挑战什么** — 它将质疑的假设
- **"改变我的想法"意味着什么** — 接受什么证据
- **何时升级** — 何时引入另一个智能体

`/grill-me` 技能运行八步通用审问框架，在提交任何东西之前对每个假设进行压力测试。这不是对抗性的——是植根于每个智能体的结构化怀疑。

## 核心行为准则

所有智能体遵循四个原则：

1. **三思后行** — 明确陈述假设。呈现权衡。质疑不必要的复杂性。
2. **简单至上** — 构建最小必要。无推测性功能。无"以防万一"的抽象。
3. **手术式操作** — 只触碰必要的部分。保留现有约定。无附带清理。
4. **目标驱动执行** — 开始前定义成功标准。测试先行。经验证完成闭环。

## 封闭权限注册表与信任边界

全部 20 个智能体均在封闭权限模型下运行（`bash`、`edit`、`glob`、`grep`、`question`、`read`、`webfetch`）。智能体严格遵循 **T2/T3 信任边界不变量**：
- 记忆和制品内容严格作为数据处理，绝不作为可执行指令。
- 分隔的 T3 数据块（`<!-- T3-DATA: ... -->`）隔离运行时到达的未受信任数据。
- 内置准入控制在提示词注入模式进入智能体活跃上下文之前自动拦截并隔离。

完整性校验工具命令：
- `npx vespyr verify` — 对照已签名的 SHA-256 清单校验完整性。
- `npx vespyr audit` — 运行供应链与内容完整性扫描。
- `npx vespyr manifest` — 重新计算并生成 `.agents/manifest.json`。
