# 5. 结构图谱

> [← 返回指南](index.md) | [上一章：技能与工作流](skills-and-workflows.md) | [下一章：参考 →](reference.md)

Vespyr 包含两个结构图谱系统：**代码图谱**（依赖映射）和**文档图谱**（文档可追溯性）。

## 代码图谱

映射整个代码库的导入、导出和依赖关系。

### 追踪内容

- **导入** — 每个文件依赖什么
- **导出** — 每个文件暴露什么
- **被导入** — 哪些文件依赖此文件（影响范围）

### 命令

```bash
# 刷新图谱（自愈——如为最新则无操作）
node .agents/scripts/ensure_graph.js code [--src src/] [--force]

# 查询（使用这些命令而非读取原始 JSON）
node .agents/scripts/query_graph.js summary          # 两个图谱的概览
node .agents/scripts/query_graph.js deps <file>      # 此文件导入了什么？
node .agents/scripts/query_graph.js blast <file>     # 哪些文件依赖此文件？
```

### 使用示例

```bash
node .agents/scripts/query_graph.js blast src/lib/auth.ts
# 输出：
# src/lib/auth.ts blast radius
# imported by (4):
#   <- src/routes/api.ts
#   <- src/middleware/auth.ts
#   <- src/services/login.ts
#   <- src/components/Profile.tsx
```

### 配置

```yaml
# .agents/config.yaml
graph:
  code:
    src: src/,app/,lib/   # 扫描多个目录
```

## 文档图谱

映射文档之间的关系——PRD、用户故事、ADR、记忆文件——及其代码引用。

### 追踪内容

- **Markdown 链接** — 文档间的 `[text](path)` 引用
- **共享 ID** — 引用相同 `US-XXX` 或 `REQ-XXX` 的文档建立连接
- **代码引用** — 文档中提及的 `src/...` 路径链接到代码

### 命令

```bash
# 刷新图谱
node .agents/scripts/ensure_graph.js doc [--force]

# 查询
node .agents/scripts/query_graph.js summary          # 两个图谱的概览
node .agents/scripts/query_graph.js trace <doc>      # 文档关系和连接
node .agents/scripts/query_graph.js search <query>   # 按标题/章节搜索文档
```

### 使用示例

```bash
node .agents/scripts/query_graph.js trace user-stories.md
# 输出：
# artifacts/output/02-strategy/user-stories.md (document): User Stories
# outgoing (2):
#   specifies -> artifacts/output/02-strategy/product-spec.md (via US-001)
#   traces_to -> artifacts/output/03-architecture/architecture.md (via US-001)
# incoming (2):
#   traces_to <- artifacts/output/02-strategy/product-spec.md (via US-001)
```

### 配置

```yaml
# .agents/config.yaml
graph:
  doc:
    docs:                          # 扫描 .md 文件的目录
      - artifacts/input/
      - artifacts/memory/
      - artifacts/output/
    ids:                           # 要提取的 ID 模式
      - US-\d+
      - REQ-\d+
```

### 用于已有项目

配置文档图谱以扫描项目的文档：

```yaml
graph:
  doc:
    docs:
      - docs/
      - README.md
      - wiki/
    ids:
      - JIRA-\d+
      - '#\d+'           # GitHub issues
      - EPIC-\w+-\d+
```

### 连接类型

| 连接 | 含义 |
|------|---------|
| `traces_to` | 文档 A 引用了文档 B 中的某个 ID |
| `specifies` | 用户故事指定了产品规格的某个部分 |
| `defines` | 需求文档定义了用户故事 |
| `references` | 标准 Markdown 从一个文档链接到另一个 |
| `maps_to` | 文档引用了代码文件 |
| `implements` | 用户故事映射到实现代码 |
| `constrains` | ADR 约束某个代码模块 |
| `aligns_with` | ADR 与某个需求对齐 |
| `derived_from` | 生成的文档源自用户输入 |

## 查询命令参考

```bash
node .agents/scripts/query_graph.js --help

# 可用命令：
summary              # 两个图谱的紧凑概览
deps <file>          # 此文件导入/导出了什么？
blast <file>         # 哪些文件依赖此文件？（影响范围）
trace <doc>          # 文档关系和连接
search <query>       # 按标题、章节或路径搜索文档

# 可选标志：
--root <path>        # 指定不同的项目根目录
```

## 智能体如何使用图谱

智能体被指示使用查询命令而非读取原始 JSON：

- `@architect` — 结构变更前执行 `blast <file>`
- `@tech-lead` — `summary` + `deps <file>` 用于任务排序
- `@developer` — 修改代码前执行 `blast <file>`
- `@code-reviewer` — 对每个变更文件执行 `blast <file>`
- `@product-manager` — `trace requirements.md` 检查 FR→US 覆盖
- `@product-designer` — `trace product-spec.md` + `trace user-stories.md`
- `@qa-engineer` — 测试前执行 `trace user-stories.md`

## 问题排查

**图谱为空？**
- 代码图谱：确认 `graph.code.src` 指向存在的源代码目录
- 文档图谱：确认 `graph.doc.docs` 指向包含 `.md` 文件的目录
- 两者：使用 `--force` 强制完整重建
- 从项目根目录运行或使用 `--root <path>`

**文档图谱有 0 条连接？**
- 确认文档包含匹配 `graph.doc.ids` 模式的 ID
- 确认文档通过 Markdown 链接或共享 ID 相互引用
- `summary` 命令会警告：`WARNING: 0 edges — traceability chain is broken`
