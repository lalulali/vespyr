# Harness Matrix — Supported Shapes, Mechanisms & Verified Behaviour

> **Status:** canonical source of truth for harness claims. Created 2026-09-29 by `02p` R1.17; supersedes the interim `02g` §3.4 pointer to `03d` and any "eight-harness" marketing. **Rule (02p First Principle 6 / R58): marketing follows matrix** — no doc may claim more harnesses than this table + the registry (`bin/lib/harnesses/index.js`) support and tests prove.
>
> Owner scope (2026-08-24, decisions C1–C7): five owned shapes — OpenCode, Claude Code, Kiro, GitHub Copilot, Google Antigravity — plus Codex, resolved 2026-09-24/29 to zero-work (native read). Cursor and Windsurf are legacy-cleanup-only pending the Phase-2 redesign (`03c`).

## Project scope (repo install)

| Shape | Class | Mechanism on install | Where implemented |
|---|---|---|---|
| OpenCode | First-class install | `.opencode -> .agents` symlink; commands-folder sweep when opencode is NOT selected (core commands only, user commands preserved) | `bin/lib/harnesses/opencode.js` |
| Claude Code | First-class install | `.claude -> .agents` symlink + `CLAUDE.md` project-memory doc | `bin/lib/harnesses/claude-code.js` + installer `bootstrapRootDocs` |
| Kiro | First-class install (hybrid) | `.kiro/skills -> .agents/skills` symlink + `.kiro/steering/vespyr-steering.md` emitted from `.agents/templates/system/vespyr-steering.md.canonical` | `bin/lib/harnesses/kiro.js` |
| GitHub Copilot | First-class install (generate-target) | `.github/copilot-instructions.md` pointer stub + `.github/skills -> .agents/skills` link. Personas ride the root `AGENTS.md` — no `.agent.md` emission (`transpileCopilotYAML()` was cut; legacy `.yml` emitter already gone) | `bin/lib/harnesses/github-copilot.js`; `tests/test_harness_adapters.test.js` |
| Google Antigravity | Zero-work (native read) | None. Reads `<repo>/.agents/skills/` (default) plus `.agents/rules/`, `.agents/workflows/`; `.agents/agents.md` is its team-file convention | vendor docs, accessed 2026-08-24 (`antigravity.google/docs/skills`) |
| Codex | Zero-work (native read) | None — intentionally NO adapter. Reads root `AGENTS.md` and scans `$REPO_ROOT/.agents/` skills (+ `~/.agents/skills`); `.codex/` is a legacy location it no longer needs | registry comment `bin/lib/harnesses/index.js` + owner decision; `tests/test_harness_adapters.test.js` asserts codex is not an option. *(Doc/code-comment-sourced — no vendor citation yet; re-check on any Codex release note about skill discovery.)* |
| Cursor / Windsurf | Legacy cleanup only | Not installable, not in the interactive checklist; detect + uninstall sweep of pre-existing installs. Both legacy transpilers (`transpileCursorMDC`, `transpileCopilotYAML`) were **cut 2026-08-25** (commit `5c97065` — `bin/lib/transpilers.js` removed); redesign deferred to `03c` (post-v2) | `LEGACY_CLEANUP_ADAPTERS` in `bin/lib/harnesses/index.js`; `git show 5c97065 --stat` |
| Aider / Gemini CLI | Read-and-adopt (out of first-class scope) | Root `AGENTS.md` single-agent invocation pattern; no adapter planned for v2.0 | `02p` §1.2 owner scope |

**GitHub Copilot caveats (user expectations):**

- **Project picker:** VS Code's `/` command picker does **not** discover skills from root `.agents/skills`; it does resolve them through the emitted `.github/skills` link (owner field test 2026-08-25).
- **Global personal skills:** Copilot consumes `~/.agents/skills` functionally but does **not** list them in autocomplete/picker — **functional-but-invisible** (owner field report 2026-08-24). Smoke tests assert functional activation (agent applies a skill), never autocomplete visibility.

**C6 — naming non-conflict:** Antigravity's team-file convention is `.agents/agents.md` (a *file*); Vespyr's canonical persona directory is `.agents/agents/` (a *directory*). The two can coexist; no path collision. Verified: `test -d .agents/agents` → true; Vespyr requires no `.agents/agents.md`.

## Global scope (personal install)

**C4 = A (single canonical):** always install personal skills to `~/.agents/skills`; per-shape bridges apply only where a tool does not read that path natively.

| Shape | Personal skills path | Source |
|---|---|---|
| Canonical | `~/.agents/skills` | owner ruling C4=A (2026-08-24) |
| GitHub Copilot | `~/.agents/skills` consumed (invisible to picker); `~/.copilot/skills` also recognized | vendor docs, accessed 2026-08-24 |
| Google Antigravity | project `.agents/skills/` natively; global `~/.gemini/config/skills/` (docs); CLI bridge `~/.gemini/antigravity-cli/skills/` | vendor docs + owner C4 ruling |
| Codex | `~/.agents/skills` + root `AGENTS.md` | registry comment |

## Registry truth (source of truth for code)

- Active installable adapters: `opencode`, `claude`, `github`, `kiro` (`ADAPTERS` in `bin/lib/harnesses/index.js`).
- Legacy cleanup adapters: `cursor`, `windsurf` (`LEGACY_CLEANUP_ADAPTERS`) — hidden from the interactive checklist; resolvable only for detect/uninstall.
- Codex: no adapter by design — zero emission is required, so there is nothing to install.
- The interactive checklist therefore lists the four installable shapes; Antigravity and Codex need no selection (native read).

## Change control

Any harness claim in README / Guide / AGENTS.md must match this table plus the registry. Adding a shape requires, in order: (1) adapter or documented native-read proof, (2) adapter test, (3) matrix row update, (4) registry entry. Claims that outrun this sequence are record defects (see `02p`). Doc-only rows (Antigravity, Codex) carry no code — re-verify them when the vendor docs change; each row names its source and re-verification trigger.
