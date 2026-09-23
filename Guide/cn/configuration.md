# 3. 配置

> [← 返回指南](index.md) | [上一章：快速上手](getting-started.md) | [下一章：技能与工作流 →](skills-and-workflows.md)

## `.agents/config.yaml`

Vespyr 的配置位于 `.agents/config.yaml`。安装时创建，升级时不会被覆盖。

### 完整配置参考

```yaml
# .agents/config.yaml
step_tracking: off          # off | silent | verbose

language:
  artifacts: en             # PRD、ADR、规格、代码注释、提交信息的固定语言
```

### 步骤追踪

控制技能执行期间的步骤级审计记录：
- `off` — 不追踪（默认，最快）
- `silent` — 写入 `artifacts/output/step-audit.json`；不向智能体输出
- `verbose` — 写入并每步打印一行到智能体标准输出

### 语言

设置生成物的语言（见 DNA 9）。对话始终跟随你书写的语言——没有对话语言设置。用 `vespyr lang` 管理：

| 键 | 用途 | 默认值 |
|-----|---------|---------|
| `language.artifacts` | PRD、ADR、规格、代码注释、提交信息的固定语言 | `en` |

```
vespyr lang                          # 显示当前设置
vespyr lang set id                   # 将生成物设为印尼语
vespyr lang set en                   # 将生成物设为英语
vespyr lang list                     # 列出支持的语言与别名
```

支持：`en, id, zh-Hans, zh-Hant, ja, ko, es, pt, hi, de, fr, ru, ar`。若只需某份文档用其他语言，直接用那种语言提出请求即可。

## 自定义智能体声明（仅限预览）

声明特定于项目的智能体配置覆盖项，在升级时得以保留且无需直接编辑智能体源文件：

```
.agents/agents/<name>/customize.toml   # 可选的出厂默认值
.agents/custom/<name>.toml              # 你的声明（升级时永不覆盖）
```

> [!NOTE]
> 覆盖文件为经过验证的配置声明。当前尚无运行时组件在加载智能体时动态读取 `.agents/custom/*.toml`，因此声明目前不会改变运行时的实际行为。你可以使用 `node .agents/scripts/merge_customization.js <agent-name>` 或 `/customize-agent` 技能编写并预览合并结果。

示例——用于调整 developer 参数的声明：

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

创建并预览自定义声明：

```
node .agents/scripts/merge_customization.js <agent-name>
```

使用 `/customize-agent` 描述意图、映射覆盖字段、写入 TOML 并验证合并预览。

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
