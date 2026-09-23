# 3. Configuration

> [← Back to Guide](index.md) | [Previous: Getting Started](getting-started.md) | [Next: Skills & Workflows →](skills-and-workflows.md)

## `.agents/config.yaml`

Vespyr's configuration lives in `.agents/config.yaml`. It's created during installation and never overwritten by upgrades.

### Complete Configuration Reference

```yaml
# .agents/config.yaml
step_tracking: off          # off | silent | verbose

language:
  artifacts: en             # fixed language for PRDs, ADRs, specs, code docs, commits
```

### Step Tracking

Controls step-level audit breadcrumbs during skill execution:
- `off` — No tracking (default, fastest)
- `silent` — Writes breadcrumbs to `artifacts/output/step-audit.json`; no output to agent stdout
- `verbose` — Writes breadcrumbs + prints one-liner per step transition

### Language

Sets the language for generated artifacts (see DNA 9). Conversation always mirrors the language you write in — there is no chat setting. Manage it with `vespyr lang`:

| Key | Purpose | Default |
|-----|---------|---------|
| `language.artifacts` | Fixed language for PRDs, ADRs, specs, code comments, commits | `en` |

```
vespyr lang                          # show current setting
vespyr lang set id                   # set artifact output to Indonesian
vespyr lang set en                   # set artifact output to English
vespyr lang list                     # list supported languages & aliases
```

Supported: `en, id, zh-Hans, zh-Hant, ja, ko, es, pt, hi, de, fr, ru, ar`. For a one-off document in another language, just ask for it in that language.

## Custom Agent Declarations (Preview Only)

Declare project-specific agent configuration overrides that survive upgrades without editing agent source files:

```
.agents/agents/<name>/customize.toml   # Optional factory defaults
.agents/custom/<name>.toml              # Your declaration (never touched by upgrades)
```

> [!NOTE]
> Override files are validated configuration declarations. No runtime harness component currently consumes `.agents/custom/*.toml` dynamically when loading agents, so declarations do not yet alter live agent execution. You can author and preview them using `node .agents/scripts/merge_customization.js <agent-name>` or the `/customize-agent` skill.

Example declaration for developer tuning:

```toml
# .agents/custom/developer.toml
[tuning]
temperature = 0.3

[behavior]
verbosity = "concise"
```

Merge rules:
- **Scalars** — override wins
- **Tables** — deep merge
- **Arrays** — keyed merge (items with matching IDs are updated, not duplicated)

To create and preview a customization declaration:

```
node .agents/scripts/merge_customization.js <agent-name>
```

Use `/customize-agent` to describe intent, map it to override fields, write the TOML, and verify the merged preview.

## Memory Configuration

Memory lives in `artifacts/memory/`. The key files:
- `project-context.md` — Project stack, constraints, architecture
- `active-decisions.md` — Critical design choices
- `lessons-learned.md` — Engineering insights, bugs, gotchas
- `patterns-and-conventions.md` — Established code, design, and process patterns
- `blockers-and-risks.md` — Active blockers and mitigation

Search the archive at any time:

```
/memory "authentication token expiry"
```
