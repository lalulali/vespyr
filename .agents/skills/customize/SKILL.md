---
name: customize
description: Guided authoring flow for agent customization — describe your intent, map it to override fields, write the TOML, and verify it works
version: "1.0"
last_updated: 2026-07-10
---

# Customize — Agent Override Authoring

## What this skill does

Helps you customize any Vespyr agent without editing the agent file directly. You describe what you want to change, the skill maps your intent to the correct override fields, writes a `.agents/custom/<agent>.toml` file, and verifies the merge works.

## When to use

- "Customize @developer to use a higher temperature"
- "Change the model for @architect"
- "Add a new capability to @qa-engineer"
- "Override the developer guidelines for this project"

## When NOT to use

- For one-off behavior changes (just tell the agent in your prompt)
- For squad-wide changes (use `/squad`)
- When you just want to document a convention (use memory instead)

## Prerequisites

- The agent file exists under `.agents/agents/<name>.md`
- You know which agent you want to customize
- If the agent has no `customize.toml` defaults yet, the merge will only apply your override

## Workflow

### Step 1: Describe your intent

Ask the user what they want to change. Use these probes:
- Which agent?
- What specific behavior or setting?
- What's the current value (if known)?
- What should the new value be?
- Why this change?

Example intents:
- "I want @developer to be more creative — set temperature to 0.5"
- "I want @architect to always use TypeScript interfaces, not types"
- "I want @qa-engineer to skip performance tests by default"

### Step 2: Map intent to override fields

Use `@reader` to read the agent's frontmatter and identify which fields to override. Common override targets:

| Intent | Field | Type |
|---|---|---|
| More/less creativity | `temperature` | number |
| Different model | `model` | string |
| Add/remove capability | `capabilities` | array of strings |
| Change permissions | `permission` | table |
| Add tool access | `tools` | table |
| Adjust principles | `principles` | array of strings |
| Project-specific conventions | `conventions` | table |

If the user's intent doesn't map to an existing field, suggest it as a new convention entry.

### Step 3: Build the override TOML

Construct the `.agents/custom/<agent>.toml` content. Keep it minimal — only include the fields being changed. Example:

```toml
# developer.toml — project-specific overrides for @developer
temperature = 0.5
model = "anthropic/claude-sonnet-4"

[conventions]
testing = "jest + @testing-library/react"
exports = "named exports only, no default exports"
quotes = "single quotes, no semicolons"
```

### Step 4: Write the override file

Use `@writer` to create or update `.agents/custom/<agent>.toml` with the content from Step 3.

If the file already exists, read it first, merge the new fields into the existing content, and write the updated version.

### Step 5: Verify the merge

Run via `@executor`:

```bash
node .agents/scripts/merge_customization.js <agent-name>
```

Check the JSON output:
- The overridden field shows the new value
- Unchanged fields show the defaults
- No errors or warnings

Report to the user:
```
Customization applied to @<agent>:
  temperature: 0.1 → 0.5
  model: unchanged (opencode-go/claude-sonnet-4)

Override file: .agents/custom/<agent>.toml
```

### Step 6: Log the change

Append to `artifacts/memory/active-decisions.md`:

```
### [DECISION] Customized @<agent> [date: YYYY-MM-DD]
**Changes:** {summary of what was changed and why}
**Override file:** .agents/custom/<agent>.toml
**Status:** active
```

## Anti-patterns

- **Editing the agent file directly.** Your changes will be lost on the next `npx vespyr` run.
- **Overriding fields you don't understand.** Read the agent's documentation first.
- **Creating empty override files.** Only override what you need to change.
- **Forgetting to verify.** Always run the merge script to confirm the output is what you expect.

## Output artifacts

- `.agents/custom/<agent>.toml` (the override file)
- `artifacts/memory/active-decisions.md` (change log entry)

## State machine integration

After write: `node .agents/scripts/orchestrator_state.js complete --agent customize --artifact <agent>.toml`
