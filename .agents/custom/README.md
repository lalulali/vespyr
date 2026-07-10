# Customization Overrides

Override files let you customize any Vespyr agent **without editing the agent file directly.** Your changes survive `npx vespyr` upgrades because they live in `.agents/custom/`, not in the agent source.

## How it works

Two files per agent:

| File | Purpose | Regenerated on upgrade? |
|---|---|---|
| `.agents/agents/<name>/customize.toml` | Defaults — the agent's factory settings | Yes (always rebuilt) |
| `.agents/custom/<name>.toml` | Override — your project-specific tweaks | No (never touched) |

The merge script combines them at runtime. The override file wins on conflicts.

## Merge rules

| Value type | Rule |
|---|---|
| Scalars (string, number, boolean) | Override wins over default |
| Tables (nested objects) | Deep merge — override keys replace, new keys add |
| Arrays of tables with `code` or `id` | Keyed merge — matching entries replace, new entries append |
| All other arrays | Append |

## Example: override developer temperature

Create `.agents/custom/developer.toml`:

```toml
temperature = 0.3
```

Run the merge to verify:

```bash
node .agents/scripts/merge_customization.js developer
```

Expected output includes `"temperature": 0.3` overriding the default `0.1`.

## How do I know it worked?

The merge script prints the merged config as JSON. Spot-check the field you changed.

When an agent loads, the orchestrator feeds it the merged config. If `temperature` shows your value instead of the default, it worked.

## What can I override?

Anything in the agent's `customize.toml` defaults file — temperature, model, permissions, capabilities, principles, squad membership. The agent's identity block (`<!-- IDENTITY: do not edit -->`) and frontmatter (`name`, `icon`, `origin`) are **not overridable** — those are hardcoded.
