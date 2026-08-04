# Canonical Phase Table (Single Source of Truth)

| # | Folder | Phase Name | Primary Skill | Primary Agent | Gate |
|---|--------|-----------|---------------|---------------|------|
| -1 | (none) | Validation | `validate-idea` | `@founder` | GO/PIVOT/KILL |
| 0 | `01-discovery/` | Discovery | `explore-idea` | `@researcher` + `@user-researcher` | Brief sign-off |
| 1 | `02-research/` | Research | (sub-skill of explore-idea) | parallel researchers | Quality gate |
| 2 | `03-strategy/` | Strategy | `design` (PRD) | `@product-manager` | PRD approval |
| 3 | `04-architecture/` | Architecture | (sub-skill of design) | `@architect` | ADR sign-off |
| 4 | `05-planning/` | Planning | `plan` (execution plan) | `@tech-lead` | Plan approval |
| 5 | `05-execution/` | Execution | `develop` | `@developer` (multi-worktree) | All tests green |
| 6 | `06-launch/` | Launch | `launch` | `@devops-engineer` + `@product-manager` | Production deploy |
| 7 | `07-iteration/` | Iteration | `iterate` | `@product-manager` + `@data-analyst` | Insights reviewed |
| 8 | `08-documentation/` | Documentation | (cross-cutting) | `@technical-writer` | Docs current |
| 9 | `09-retro/` | Retro | `retro` | `@product-manager` | Action items filed |

**Conventions:**
- Folder names use 2-digit zero-padded numbers (00, 01, ..., 09)
- Phase numbers are 0-indexed (Phase 0 = Discovery)
- The folder name does not always equal the phase number when 2 phases share a folder (e.g., 03-strategy contains both Phase 2 and Phase 3 outputs)
- Validation (Phase -1) has no folder by design — it is a pre-phase gate, not a phase. Its output is a GO/PIVOT/KILL decision that seeds `01-discovery/idea-brief.md`, not a folder of its own.
