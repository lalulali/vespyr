# 4. 技能与工作流

> [← 返回指南](index.md) | [上一章：配置](configuration.md) | [下一章：结构图谱 →](structural-graphs.md)

## 所有斜杠命令

Vespyr 将复杂操作组织为原子化技能。每个技能是一个文件夹，包含 `SKILL.md` 路由器 + `steps/` 目录。

### 核心工作流（生命周期与塑形）

| 命令 | 阶段 | 描述 |
|---------|-------|-------------|
| `/validate-idea` | -1 | 在研究前对产品概念进行压力测试 |
| `/validate-game-idea` | -1 | 在制作前对游戏概念进行压力测试 |
| `/explore-idea` | 0-1 | 市场、竞品和用户调研 |
| `/explore-game-idea` | 0-1 | 游戏品类市场和玩家调研 |
| `/unpack-problem` | 0-1 | 在解决方案构思前先探索问题 |
| `/shape-up` | 1-2 | 将半成品创意塑形为设计就绪简报（独立使用或生命周期桥梁） |
| `/design` | 2-3 | PRD 和界面规格创建 |
| `/motion` | 2-4 | 动效调研、动效规格，以及移交 `/develop` 的明确流程 |
| `/plan` | 4 | 独立或冲刺执行计划 |
| `/develop` | 5 | MVP 开发周期 |
| `/launch` | 6 | 发布准备和部署 |
| `/iterate` | 7 | 发布后的行为改进 |
| `/retro` | 9 | 周期回顾和记忆压缩 |

### 设计思维与发现

| 命令 | 描述 |
|---------|-------------|
| `/research-plan` | 研究目标、方法论和访谈指南 |
| `/empathy-map` | 用户共情四象限画布（说/想/做/感） |
| `/journey-map` | 用户触点与情绪状态旅程图 |
| `/jtbd` | Jobs-to-be-Done 声明 + How Might We 机会问题 |
| `/discovery-report` | 将设计思维输出编译为统一报告 |
| `/root-cause` | 苏格拉底式 5-Whys 和鱼骨图根因分析 |
| `/validation-patterns` | 从 30 种验证方法目录中选择 |

### 学习与教学

| 命令 | 描述 |
|---------|-------------|
| `/teach-me` | 个人学习伙伴——快速、解释或深度学习任何主题 |
| `/craft-lesson` | 创建多种格式的教育材料（大纲、详细手册、速查表、演示、课堂、视频脚本） |

### 创意塑造与苏格拉底对齐

| 命令 | 描述 |
|---------|-------------|
| `/shape-up` | 将半成品创意结构化并压力测试为设计就绪简报 |
| `/brainstorming` | 从 60 种头脑风暴方法中选择（SCAMPER、六顶思考帽等） |
| `/grill-me` | 严苛的苏格拉底式对齐和压力测试访谈 |

### 数据与分析

| 命令 | 描述 |
|---------|-------------|
| `/analyze-data` | 数据分析助手——EDA、可视化映射与 PM 指标协作 |

### 操作

| 命令 | 描述 |
|---------|-------------|
| `/help-me` | 对话式项目导航助手 |
| `/status` | 当前项目状态快照 |
| `/sprint-status` | 以交互式看板表显示流水线状态 |
| `/phase` | 显示/切换阶段 |
| `/plan` | 独立执行计划 |
| `/review` | 独立代码审查 |
| `/test` | 运行测试，汇总失败信息 |
| `/kanban` | 显示并更新看板 |
| `/memory` | 搜索归档项目上下文 |

### 智能

| 命令 | 描述 |
|---------|-------------|
| `/code-graph` | 生成/扫描依赖关系图 |
| `/doc-graph` | 生成/扫描文档链接和追溯覆盖 |
| `/humanize` | AI 写作风格检测器和规范化工具 |
| `/elicitation` | 69 种结构化提示引导，推动模型完善输出 |
| `/round-table` | 多智能体分阶段圆桌讨论（覆盖全 11 个阶段与 23 个智能体角色） |

### 其他与自定义

| 命令 | 描述 |
|---------|-------------|
| `/customize-skill` | 对现有技能进行手术式自定义 |
| `/create-skill` | 创建新技能、重大重写及评估集 |
| `/create-agent` | 创建并注册新的智能体角色 |
| `/customize-agent` | 预览智能体 TOML 自定义声明 |
| `/incident` | 生产事故响应 |

## 流水线阶段表

Vespyr 的 11 阶段流水线。`.agents/references/phase-table.md` 是权威来源。

| 阶段 | ID | 目录 | 主要技能 |
|-------|-----|------|------|
| 验证 | 1 | `01-discovery/` | `/validate-idea` |
| 发现 | 1 | `01-discovery/` | `/unpack-problem` |
| 调研 | 2 | `02-research/` | `/explore-idea` |
| 塑形桥梁 | 1-2 | `01-discovery/` | `/shape-up` |
| 战略 | 3 | `03-strategy/` | `/design` |
| 架构 | 4 | `04-architecture/` | Architecture ADRs |
| 规划 | 5 | `05-planning/` | `/plan` |
| 实现 | 6 | `root` | `/develop` |
| 发布 | 7 | `06-launch/` | `/launch` |
| 迭代 | 8 | `07-iteration/` | `/iterate` |
| 文档 | 9 | （贯穿） | 技术文档撰写 |
| 回顾 | 10 | `09-retro/` | `/retro` |

## 技能工作原理

每个技能遵循相同的架构：

```
.agents/skills/<skill-name>/
├── SKILL.md              # 路由器：≤60 行，定义何时/如何使用
└── steps/                # 操作步骤（每步 30-80 行）
    ├── step-01-read.md
    ├── step-02-plan.md
    └── ...
```

每个步骤文件声明：
- **停止条件** — 在继续前必须满足的条件
- **委托契约** — 由哪些子代理处理读取、写入和运行
- **输出规格** — 产出什么制品

### 多模式技能

部分技能根据已有制品自动检测模式：

```
.agents/skills/design/
├── SKILL.md
└── steps/
    ├── step-01a-load-prd-brief.md   # 创建模式（当 PRD/规格不存在时运行）
    ├── step-01b-load-existing.md    # 编辑模式（PRD/规格存在且需要修改时）
    ├── step-01c-heuristic-eval.md   # 验证模式（验证现有设计时）
    └── ...
```

### 可恢复执行

输出文档的 YAML 前置元数据中包含 `stepsCompleted` 数组：

```yaml
stepsCompleted: [1, 2, 3]
```

重新调用技能时自动从步骤 4 恢复。无需在智能体上下文中维护状态。

### 多智能体圆桌讨论 (/round-table)

`/round-table` 协调多智能体小组讨论，每个智能体作为一个具有独立推理能力的真实子代理参与。该技能跨越所有 11 个产品开发阶段，动态选择阶段感知的智能体阵容：

- **验证 (阶段 -1)**: `@founder`, `@product-manager`, `@researcher`
- **探索与研究 (阶段 0 & 1)**: `@founder`, `@researcher`, `@user-researcher`, `@ux-researcher`
- **策略与需求 (阶段 2)**: `@product-manager`, `@founder`, `@product-designer`, `@user-researcher`
- **架构与系统设计 (阶段 3)**: `@architect`, `@tech-lead`, `@security-engineer`, `@performance-engineer`
- **规划与拆解 (阶段 4)**: `@tech-lead`, `@product-manager`, `@architect`, `@devops-engineer`
- **开发与实现 (阶段 5)**: `@tech-lead`, `@developer`, `@qa-engineer`, `@code-reviewer`
- **发布与部署 (阶段 6)**: `@devops-engineer`, `@product-manager`, `@qa-engineer`, `@technical-writer`
- **发布后迭代与遥测 (阶段 7)**: `@product-manager`, `@data-analyst`, `@ux-researcher`, `@performance-engineer`
- **文档与知识传递 (阶段 8)**: `@technical-writer`, `@shifu`, `@architect`, `@developer`
- **复盘与流程改进 (阶段 9)**: `@product-manager`, `@tech-lead`, `@shifu`, `@qa-engineer`

跨领域专家（`@security-engineer`、`@performance-engineer`、`@ml-ai-engineer`、`@ml-ai-ops`、`@devops-engineer`、`@data-analyst`、`@technical-writer`、`@shifu`）可根据话题相关性动态引入任何讨论中。
