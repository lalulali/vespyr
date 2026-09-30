# 1. 安装

> [← 返回指南](index.md) | [下一章：快速上手 →](getting-started.md)

## 前置条件

- **Node.js** ≥ 18
- 一个 **AI 开发工具** — OpenCode、Claude Code、Kiro、GitHub Copilot 提供一等安装支持；Google Antigravity 与 Codex 原生读取通用 `.agents/` 目录；Aider 与 Gemini CLI 通过 `AGENTS.md` 接入。Cursor/Windsurf 仅为旧安装清理，重设计推迟至 Phase 2。
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

1. **平台选择** — 选择你的 IDE/CLI 平台（OpenCode、Claude Code、Kiro、GitHub Copilot）
2. **项目目标** — 安装到哪个仓库（默认为当前目录）

## 创建的文件

安装后，项目根目录将包含：

```
your-project/
├── .agents/              # 智能体角色、技能、脚本、配置、参考
│   ├── agents/           # 20 个智能体角色 Markdown 文件
│   ├── skills/           # 41 个原子化技能工作流
│   ├── scripts/          # 编排器、记忆、遥测
│   ├── config.yaml       # 项目配置
│   └── references/       # 阶段表、术语表、契约
├── artifacts/
│   ├── memory/           # 持久化共享记忆
│   │   ├── project-context.md
│   │   ├── active-decisions.md
│   │   └── lessons-learned.md
│   ├── input/            # 用户提供的原始材料
│   └── output/           # 智能体生成的制品（按阶段）
├── agent.md              # 入口文件（agent.md 约定工具）
├── AGENTS.md             # 通用指令基线（Copilot 人格随此生效）
├── CLAUDE.md             # 入口文件（Claude Code）
└── README.md             # 项目概览
```

> **平台说明：** 规范配置目录为 `.agents/`。安装器会按你选择的平台创建对应链接（`.opencode`、`.claude`、`.kiro/skills`、`.github/skills`）——请勿重命名或移动 `.agents/`，否则链接会失效。

## 支持的开发工具

| 开发工具 | 安装方式 | 安装内容 |
|---|---|---|
| OpenCode | 一等支持 | `.opencode -> .agents` 符号链接 |
| Claude Code | 一等支持 | `.claude -> .agents` 符号链接 + `CLAUDE.md` |
| Kiro | 一等支持（混合） | `.kiro/skills` 符号链接 + `.kiro/steering/vespyr-steering.md` |
| GitHub Copilot | 一等支持 | `.github/copilot-instructions.md` + `.github/skills -> .agents/skills`；人格通过根目录 `AGENTS.md` 生效 |
| Google Antigravity | 无需安装 | 原生读取 `.agents/skills/`（及 `.agents/rules/`、`.agents/workflows/`） |
| Codex | 无需安装 | 原生读取根目录 `AGENTS.md` 并扫描 `.agents/` 技能 |
| Cursor / Windsurf | 旧安装清理 | 仅探测/卸载旧安装；重设计在 Phase 2 |
| Aider / Gemini CLI | 读取并采用 | 使用根目录 `AGENTS.md` 调用模式 |

**注意事项：** GitHub Copilot 会在功能上读取 `~/.agents/skills` 的个人技能，但不会在自动补全/选择器中列出（functional-but-invisible）；VS Code 的 `/` 选择器通过安装生成的 `.github/skills` 链接解析项目技能，而非根目录 `.agents/skills`。Antigravity 的 `.agents/agents.md` 团队文件与 Vespyr 的 `.agents/agents/` 人格目录不冲突。权威且持续更新的矩阵见 `.agents/references/harness-matrix.md`。

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

## 完整性与安全校验

你可以验证安装的供应链完整性与安全合规性：

```bash
# 对照固定的 SHA-256 清单校验 .agents/ 完整性（暂未签名，见 ADR-002 §2.1.1）
npx vespyr verify

# 运行供应链安全与内容完整性扫描器
npx vespyr audit

# 重新计算并输出清单校验和
npx vespyr manifest
```

## 升级

```bash
npm update vespyr
```

`.agents/custom/` 中的自定义声明在升级时不会被覆盖。可使用 `node .agents/scripts/merge_customization.js <agent-name>` 预览合并结果，但当前没有运行时组件在智能体加载时读取这些文件，因此它们尚不会改变智能体行为。
