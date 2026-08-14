# 3. Configuration

> [← Back to Guide](index.md) | [Previous: Getting Started](getting-started.md) | [Next: Skills & Workflows →](skills-and-workflows.md)

## `.agents/config.yaml`

Vespyr's configuration lives in `.agents/config.yaml`. It's created during installation and never overwritten by upgrades.

### Complete Configuration Reference

```yaml
# .agents/config.yaml
step_tracking: off          # off | silent | verbose

graph:
  code:
    src: src/               # source directories for code-graph (comma-separated)
  doc:
    docs:                   # directories to scan for .md documentation
      - artifacts/input/
      - artifacts/memory/
      - artifacts/output/
    ids:                    # regex patterns for document ID extraction
      - US-\d+
      - REQ-\d+
```

### Step Tracking

Controls step-level audit breadcrumbs during skill execution:
- `off` — No tracking (default, fastest)
- `silent` — Writes breadcrumbs to `artifacts/output/step-audit.json`; no output to agent stdout
- `verbose` — Writes breadcrumbs + prints one-liner per step transition

### Graph Configuration

See [Structural Graphs](structural-graphs.md) for a complete guide. Quick reference:

| Key | Purpose | Default |
|-----|---------|---------|
| `graph.code.src` | Directories to scan for code imports/exports | `src/` |
| `graph.doc.docs` | Directories/files to scan for documentation | `artifacts/input/`, `artifacts/memory/`, `artifacts/output/` |
| `graph.doc.ids` | Regex patterns for document ID extraction | `US-\d+`, `REQ-\d+` |

### For Pre-Existing Projects

If your project doesn't follow Vespyr's `artifacts/` convention, configure the doc-graph to scan your docs:

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

CLI flags (`--src`, `--docs`, `--ids`) override config values for one-off scans.

## Custom Agent Overrides

Personalize agent behavior without being overwritten by upgrades:

```
.agents/agents/<name>/customize.toml   # Optional factory defaults
.agents/custom/<name>.toml              # Your declaration (never touched)
```

Example — make the developer more concise:

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

Use `/customize-agent` to describe intent, map it to override fields, write the TOML, and verify the merged preview. Runtime consumption of these declarations is not wired yet, so the preview does not change agent behavior.

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
