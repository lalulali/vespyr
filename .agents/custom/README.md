# Customization Overrides

Override files let you customize any Vespyr agent **without editing the agent file directly.** Your changes survive `npx vespyr` upgrades because they live in `.agents/custom/`, not in the agent source. You can use the `/customize-agent` workflow for guided override authoring.

## How it works

Override files live in `.agents/custom/<name>.toml` and are never touched by upgrades. A defaults file per agent (`.agents/agents/<name>/customize.toml`) is optional — the merge script treats a missing defaults file as empty, so an override alone is valid.

The merge script combines them for validation and preview. The override file wins on conflicts.

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

> [!IMPORTANT]
> **Known gap:** the merged output is a validated preview only — no runtime component currently loads `.agents/custom/*.toml` when an agent starts. Until that wiring exists, overrides do not change agent behavior; they are declarations awaiting consumption.

## What can I override?

Anything in the agent's `customize.toml` defaults file — temperature, model, permissions, capabilities, principles. The agent's identity block (`<!-- IDENTITY: do not edit -->`) and frontmatter (`name`, `icon`, `origin`) are **not overridable** — those are hardcoded.
