# 2. 快速上手

> [← 返回指南](index.md) | [上一章：安装](installation.md) | [下一章：配置 →](configuration.md)

## 首个项目

Vespyr 围绕 11 个阶段流水线组织。无需记忆——`/help-me` 技能随时告诉你下一步。核心流程：

```
/validate-idea   →   /explore-idea   →   /design   →   /develop   →   /launch
```

### 分步首次运行

**1. 从 `/validate-idea` 开始**

向 founder 智能体描述你的产品概念。它将用框架（黄金圈、预演失败、第一性原理、护城河与防御性）进行压力测试，返回 GO/PIVOT/KILL 裁决。

```
/validate-idea create "面向远程团队的协作白板"
```

**2. 用 `/explore-idea` 进行调研**

如获得 GO，执行市场和用户调研。这会并行调度 `@researcher`、`@user-researcher` 和 `@ux-researcher`。

```
/explore-idea
```

**3. 用 `/design` 进行设计**

生成 PRD（`requirements.md`）、产品规格（`product-spec.md`）和详尽的用户故事（`user-stories.md`）。`/design` 技能自动检测创建/编辑/验证模式。

```
/design create
```

**4. 用 `/develop` 进行开发**

完整的 MVP 周期：tech-lead 执行计划 → 架构评审 → 实现 → 代码审查 → QA 测试。

```
/develop
```

**5. 用 `/launch` 发布**

发布准备、部署、冒烟测试、发布后监控。

```
/launch
```

## 调用智能体

智能体是纯 Markdown 文件。有三种调用方式：

### 方式一：IDE 中提及（Cursor、Windsurf、Copilot）
```
@founder.md 审查这个想法："一个复古音频设备交易市场"
```

### 方式二：系统指令（Claude Code、Aider、CLI）
```
采用 .agents/agents/founder.md 中定义的智能体角色
然后执行：审查这个想法："一个复古音频设备交易市场"
```

### 方式三：粘贴复制（ChatGPT Web、Claude.ai）
将 `.agents/agents/founder.md` 的完整内容复制为第一条消息，然后追加你的任务。

## 理解流水线

Vespyr 使用 11 个顺序阶段。随时查看当前阶段：

```
/phase
```

手动切换阶段：

```
/phase 2
```

流水线强制按序执行——未通过设计关口，无法执行开发。`sprint-status.yaml` 文件（位于 `artifacts/output/sprint-status.yaml`）是权威状态记录。

### 关键导航命令

| 命令 | 功能 |
|---------|-------------|
| `/help-me` | 动态导航——告诉你下一步做什么 |
| `/status` | 快速快照：阶段、阻塞项、记忆健康状况 |
| `/phase` | 显示或切换阶段 |
| `/sprint-status` | 显示 sprint-status.yaml 流水线状态 |
| `/kanban` | 显示并更新看板 |
| `/memory` | 搜索归档的项目上下文 |

## 项目结构

```
artifacts/
├── memory/          # 持久化：项目上下文、决策、经验
├── input/           # 用户提供：原始想法、笔记、需求
└── output/          # 智能体生成，按阶段组织：
    ├── 01-discovery/
    ├── 02-research/
    ├── 03-strategy/
    ├── 04-architecture/
    ├── 05-planning/
    ├── 06-launch/
    ├── 07-iteration/
    ├── 08-incidents/
    └── 09-retro/
```

## 下一步

- 了解[配置](configuration.md)以自定义设置
- 浏览[技能与工作流](skills-and-workflows.md)目录
- 深入了解[结构图谱](structural-graphs.md)的代码库和文档智能
