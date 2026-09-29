# Frontmatter Compliance Audit — all SKILL.md (R1.18)

**Date:** 2026-09-29 · **Epic:** `02p` R1.18 (C5) · **Mode:** mechanical, script-checked
**Command:** `node .agents/scripts/spec_check.js` → exit 0
**Result:** `✓ All 40 skills pass agentskills.io spec checks.`

## Scope

| Item | Value | Evidence |
|---|---|---|
| Skills audited | **40** SKILL.md (one per skill directory) | `ls .agents/skills/*/SKILL.md \| wc -l` → 40 |
| Count correction | Plan said 42; the live catalog is 40 (later epics added/removed skills) | `ls .agents/skills \| wc -l` → 40 |
| Validator | `spec_check.js` — encodes the agentskills.io frontmatter contract | header comments, lines 8–15 |

## Rules enforced by the validator (all pass)

1. Top-level keys limited to `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`.
2. `name` equals the parent directory name, matches `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 64 chars.
3. `description` 1–1024 chars, non-empty, single-line (no block scalars, no unquoted `: `).
4. `compatibility` 1–500 chars when present, single-line.
5. `allowed-tools` is a space-separated string (YAML list form rejected).
6. `metadata` values are strings (nested maps/lists/block scalars rejected).
7. Warnings only (exit 0): body > 500 lines; description < 40 chars.

## Deviations

**None.** Zero errors, zero warnings emitted at audit time. No fixes required.

## Notes

- The audit is part of the per-build verification chain (`compile_skills.js` compiles the catalog; `spec_check.js` validates frontmatter; `validate_frontmatter.js` separately validates agents + step files).
- Re-run policy: run `spec_check.js` before any release cut and after any bulk skill edit. A red run fails closed (non-zero exit).
