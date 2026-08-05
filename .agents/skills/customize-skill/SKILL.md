---
name: customize-skill
description: Guided authoring flow for agent customization — describe your intent, map it to override fields, write the TOML, and verify it works. Use this skill whenever you need to modify, customize, adjust, or override any Vespyr agent's settings, model, temperature, capabilities, permissions, or conventions without editing the agent file directly.
metadata:
  version: "2.0"
  last_updated: "2026-07-30"
---

# Customize Skill — Agent Override Authoring

## What this skill does

Helps you customize any Vespyr agent without editing the agent file directly. You describe what you want to change, the skill maps your intent to the correct override fields, writes a `.agents/custom/<agent>.toml` file, and verifies the merge works.

## When to use

- "Customize @developer to use a higher temperature"
- "Change the model for @architect"
- "Add a new capability to @qa-engineer"
- "Override the developer guidelines for this project"
- "Set custom conventions for @tech-lead"

## When NOT to use

- For one-off behavior changes in a single prompt (just instruct the agent in your prompt)
- For squad-wide changes (use `/squad`)
- When you just want to document a project context/convention (use memory instead)

## Prerequisites

- The agent file exists under `.agents/agents/<name>.md`
- You know which agent you want to customize
- If the agent has no `customize.toml` defaults yet, the merge will apply your override cleanly

---

## Safety & Governance Principles

### Principle of Least Surprise
Customization overrides alter agent defaults for your entire workspace. **Do not create overrides that introduce unexpected side effects, break existing agent contracts, or silently alter team-wide security configurations** without explicit confirmation from the user.

### Non-Overridable Core Identity
The following agent frontmatter and blocks are **hardcoded and cannot be overridden** via TOML:
- `<!-- IDENTITY: do not edit -->` section
- `name`, `icon`, `origin` frontmatter fields

Everything else in `customize.toml` defaults (temperature, model, permissions, capabilities, principles, conventions) is fully overridable.

---

## Workflow

### Step 1: Capture Intent (Socratic Probes)

Ask the user or extract from context what they want to change using these probes:
1. **Which agent?** (e.g., `@developer`, `@architect`)
2. **What specific behavior or setting?** (e.g., temperature, model, coding rules, tool access)
3. **What is the current value (if known)?**
4. **What should the new value be?**
5. **Why this change?**

Example intents:
- *"I want @developer to be more creative — set temperature to 0.5"*
- *"I want @architect to always use TypeScript interfaces, not types"*
- *"I want @qa-engineer to skip performance tests by default"*

### Step 2: Map Intent to Override Fields

Use `@reader` to inspect `.agents/agents/<name>/customize.toml` (if available) or the agent's markdown definition to identify target fields:

| Intent | Field | Type |
|---|---|---|
| More/less creativity | `temperature` | number |
| Different model | `model` | string |
| Add/remove capability | `capabilities` | array of strings |
| Change permissions | `permission` | table |
| Add/configure tool access | `tools` | table |
| Adjust core principles | `principles` | array of strings |
| Project-specific conventions | `conventions` | table |

If the user's intent doesn't map to an existing field, create a clean entry under `[conventions]`.

### Step 3: Build the Override TOML

Construct the `.agents/custom/<agent>.toml` content. Keep it minimal — **include only the fields being changed**.

```toml
# developer.toml — project-specific overrides for @developer
temperature = 0.5
model = "anthropic/claude-sonnet-4.6"

[conventions]
testing = "vitest + @testing-library/react"
exports = "named exports only, no default exports"
quotes = "single quotes, no semicolons"
```

### Step 4: Write the Override File

Use `@writer` to create or update `.agents/custom/<agent>.toml`.

> [!IMPORTANT]
> If `.agents/custom/<agent>.toml` already exists, read it first, merge the new fields into existing keys surgically, and write back the updated file. Do NOT blindly overwrite existing custom settings.

### Step 5: Verify the Merge

Run via `@executor`:

```bash
node .agents/scripts/merge_customization.js <agent-name>
```

Check the JSON output:
- The overridden field reflects your new value
- Unchanged fields show the default values
- No syntax or TOML parsing errors occur

Report to the user:
```
Customization applied to @<agent>:
  temperature: 0.1 → 0.5
  model: unchanged (claude-sonnet-4.6)

Override file: .agents/custom/<agent>.toml
```

### Step 6: Log the Change

Append to `artifacts/memory/active-decisions.md`:

```markdown
### [DECISION] Customized @<agent> [date: YYYY-MM-DD]
**Changes:** {summary of what was changed and why}
**Override file:** .agents/custom/<agent>.toml
**Status:** active
```

---

## Troubleshooting & Edge Cases

| Issue | Root Cause | Solution |
|---|---|---|
| Merge script output unchanged | Misspelled field key or invalid TOML table syntax | Inspect `.agents/custom/<agent>.toml` line by line against `customize.toml` default keys |
| Frontmatter error | Attempted to override `name` or `origin` | Remove identity keys from `.agents/custom/<agent>.toml` |
| Array overwrite instead of merge | Scalar array type override | Note that scalar arrays (strings/numbers) append by default; table arrays with `code`/`id` replace matching entries |

---

## Anti-patterns

- **Editing agent `.md` files directly.** Your changes will be wiped on the next `npx vespyr` upgrade.
- **Overriding entire files for single-field changes.** Only put altered fields in `.agents/custom/<agent>.toml`.
- **Forgetting to verify.** Always run `merge_customization.js` to confirm the output is as expected.

---

## Output Artifacts

- `.agents/custom/<agent>.toml` (the override file)
- `artifacts/memory/active-decisions.md` (audit log entry)
