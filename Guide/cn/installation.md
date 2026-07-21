# 1. 安装

> [← 返回指南](index.md) | [下一章：快速上手 →](getting-started.md)

## 前置条件

- **Node.js** ≥ 18
- 一个 **AI 开发工具**（任意：OpenCode、Claude Code、Cursor、Windsurf、GitHub Copilot、Kiro、Aider、Google Antigravity）
- 支持智能体调用的终端或 IDE

## 安装


```bash
# 选项 1：作为本地或全局包进行安装
npm install vespyr
npm install -g vespyr

# 选项 2：无需预先安装，直接使用 npx 运行
npx vespyr

# 选项 3：克隆仓库并从源码运行
git clone https://github.com/lalulali/vespyr.git
cd vespyr
npm install
node bin/cli.js --yes --harness opencode,claude
```

交互式 CLI 向导将引导你完成：

1. **平台选择** — 选择你的 IDE/CLI 平台（OpenCode、Claude Code、Cursor 等）
2. **项目目标** — 安装到哪个仓库（默认为当前目录）
3. **团队预设** — 激活哪个智能体团队（完整团队 / 精简版 / 单人）

## 创建的文件

安装后，项目根目录将包含：

```
your-project/
├── .agents/              # 智能体角色、技能、脚本、配置、参考
│   ├── agents/           # 21 个智能体角色 Markdown 文件
│   ├── skills/           # 31+ 原子化技能工作流
│   ├── scripts/          # 编排器、图谱、记忆、遥测
│   ├── config.yaml       # 项目配置
│   └── references/       # 阶段表、术语表、契约
├── artifacts/
│   ├── memory/           # 持久化共享记忆
│   │   ├── project-context.md
│   │   ├── active-decisions.md
│   │   ├── lessons-learned.md
│   │   └── structural/   # 代码图谱与文档图谱
│   ├── input/            # 用户提供的原始材料
│   └── output/           # 智能体生成的制品（按阶段）
├── agent.md              # 平台入口（OpenCode/Copilot 用）
├── AGENTS.md             # 平台入口（Claude/Cursor 用）
├── CLAUDE.md             # 平台入口（Claude Code/Cursor 用）
└── README.md             # 项目概览
```

> **平台说明：** 配置目录为 `.agents/`。部分平台期望不同的文件夹名（如 Claude Code 使用 `.claude/`）。如需匹配，可将 `.agents/` 重命名。

## 快速安装（跳过向导）

```bash
# 使用默认设置安装，目标为当前目录
npx vespyr --yes

# 指定项目路径和平台
npx vespyr --yes --target /path/to/my-project --harness opencode,claude

# 直接从仓库运行 CLI
node bin/cli.js --yes --target /path/to/my-project
```

## 验证安装

安装后，调用导航助手确认一切正常：

```
/help-me
```

应显示导航报告，包含当前阶段、可用技能及推荐的下一步操作。

如出现错误，请检查：
- `.agents/config.yaml` 是否存在
- `artifacts/memory/project-context.md` 是否存在
- 你的开发工具是否能读取 `.agents/agents/*.md` 文件

## 升级

```bash
npm update vespyr
```

`.agents/custom/` 中的自定义配置在升级时不会被覆盖。`.agents/agents/` 中的智能体文件会更新，但 `.agents/custom/` 中的覆盖配置优先。
