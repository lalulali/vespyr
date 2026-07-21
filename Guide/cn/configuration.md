# 3. 配置

> [← 返回指南](index.md) | [上一章：快速上手](getting-started.md) | [下一章：技能与工作流 →](skills-and-workflows.md)

## `.agents/config.yaml`

Vespyr 的配置位于 `.agents/config.yaml`。安装时创建，升级时不会被覆盖。

### 完整配置参考

```yaml
# .agents/config.yaml
step_tracking: off          # off | silent | verbose

graph:
  code:
    src: src/               # 代码图谱扫描的源目录（逗号分隔）
  doc:
    docs:                   # 扫描 .md 文档的目录
      - artifacts/input/
      - artifacts/memory/
      - artifacts/output/
    ids:                    # 文档 ID 提取的正则模式
      - US-\d+
      - REQ-\d+
```

### 步骤追踪

控制技能执行期间的步骤级审计记录：
- `off` — 不追踪（默认，最快）
- `silent` — 写入 `artifacts/output/step-audit.json`；不向智能体输出
- `verbose` — 写入并每步打印一行到智能体标准输出

### 图谱配置

完整指南请参见[结构图谱](structural-graphs.md)。快速参考：

| 键 | 用途 | 默认值 |
|-----|---------|---------|
| `graph.code.src` | 扫描代码导入/导出的目录 | `src/` |
| `graph.doc.docs` | 扫描文档的目录/文件 | `artifacts/input/`, `artifacts/memory/`, `artifacts/output/` |
| `graph.doc.ids` | 文档 ID 提取的正则模式 | `US-\d+`, `REQ-\d+` |

### 用于已有项目

如果你的项目不遵循 Vespyr 的 `artifacts/` 约定，配置文档图谱以扫描你的文档：

```yaml
graph:
  doc:
    docs:
      - docs/
      - README.md
      - wiki/
    ids:
      - JIRA-\d+
      - '#\d+'
```

CLI 标志（`--src`、`--docs`、`--ids`）会覆盖配置值，用于一次性扫描。

## 自定义智能体覆盖

个性化智能体行为且不被升级覆盖：

```
.agents/agents/<name>/customize.toml   # 出厂默认值（升级时重新生成）
.agents/custom/<name>.toml              # 你的覆盖配置（永不被触碰）
```

示例——让 developer 更简洁：

```toml
# .agents/custom/developer.toml
[tuning]
temperature = 0.3

[behavior]
verbosity = "concise"
```

合并规则：
- **标量** — 覆盖即赢
- **表** — 深度合并
- **数组** — 按键合并（匹配 ID 的项目更新，不重复）

应用自定义：

```
/customize
```

这将运行引导式创作流程——描述你的意图，映射到覆盖字段，写入 TOML，验证。

## 团队配置

切换团队预设：

```
/squad
```

可用预设：
- **完整团队** — 全部 21 个智能体（默认）
- **精简版** — 8 个核心群体智能体 + @reader/@writer/@executor
- **单人** — 单智能体模式，可访问技能

`/squad` 命令也允许你初始化自定义团队预设。

## 记忆配置

记忆位于 `artifacts/memory/`。关键文件：
- `project-context.md` — 项目技术栈、约束、架构
- `active-decisions.md` — 关键设计选择
- `lessons-learned.md` — 工程洞察、错误修复、经验教训
- `patterns-and-conventions.md` — 已建立的代码、设计和过程模式
- `blockers-and-risks.md` — 活跃阻塞项及缓解措施

随时搜索归档：

```
/memory "认证令牌过期"
```
