# Harness Matrix — Supported Shapes, Mechanisms & Verified Behaviour

> **Status:** canonical source of truth for harness claims. Created 2026-09-29 by `02p` R1.17; supersedes the interim `02g` §3.4 pointer to `03d` and any "eight-harness" marketing. **Rule (02p First Principle 6 / R58): marketing follows matrix** — no doc may claim more harnesses than this table + the registry (`bin/lib/harnesses/index.js`) support and tests prove.
>
> Owner scope (2026-08-24, decisions C1–C7): five owned shapes — OpenCode, Claude Code, Kiro, GitHub Copilot, Google Antigravity — plus Codex, resolved 2026-09-24/29 to zero-work (native read). Cursor and Windsurf are legacy-cleanup-only pending the Phase-2 redesign (`03c`).

## Project scope (repo install)

| Shape | Class | Mechanism on install | Where implemented |
|---|---|---|---|
| OpenCode | First-class install | `.opencode -> .agents` symlink; commands-folder sweep when opencode is NOT selected (core commands only, user commands preserved) | `bin/lib/harnesses/opencode.js` |
| Claude Code | First-class install | `.claude -> .agents` symlink + `CLAUDE.md` project-memory doc | `bin/lib/harnesses/claude-code.js` + installer `bootstrapRootDocs` |
| Kiro | First-class install (hybrid) | `.kiro/skills -> .agents/skills` symlink + `.kiro/steering/vespyr-steering.md` emitted from `.agents/templates/system/vespyr-steering.md.canonical` + `.kiro/agents/<name>.json` transpiled per persona (`tools` array, `permissions.rules` derived from `permission.*`, body as `prompt`; `_vespyr.generated` marker gates reinstall/uninstall) | `bin/lib/harnesses/kiro.js`; `tests/cli/kiro-conformance.test.js` |
| GitHub Copilot | First-class install (generate-target) | `.github/copilot-instructions.md` pointer stub + `.github/skills -> .agents/skills` link. Personas ride the root `AGENTS.md` — no `.agent.md` emission (`transpileCopilotYAML()` was cut; legacy `.yml` emitter already gone) | `bin/lib/harnesses/github-copilot.js`; `tests/test_harness_adapters.test.js` |
| Google Antigravity | Zero-work (native read) | None. Reads `<repo>/.agents/skills/` (default) plus `.agents/rules/`, `.agents/workflows/`; `.agents/agents.md` is its team-file convention | vendor docs, accessed 2026-08-24 (`antigravity.google/docs/skills`) |
| Codex | Zero-work (native read) | None — intentionally NO adapter. Reads root `AGENTS.md` and scans `$REPO_ROOT/.agents/` skills (+ `~/.agents/skills`); `.codex/` is a legacy location it no longer needs | registry comment `bin/lib/harnesses/index.js` + owner decision; `tests/test_harness_adapters.test.js` asserts codex is not an option. *(Doc/code-comment-sourced — no vendor citation yet; re-check on any Codex release note about skill discovery.)* |
| Cursor / Windsurf | Legacy cleanup only | Not installable, not in the interactive checklist; detect + uninstall sweep of pre-existing installs. Both legacy transpilers (`transpileCursorMDC`, `transpileCopilotYAML`) were **cut 2026-08-25** (commit `5c97065` — `bin/lib/transpilers.js` removed); redesign deferred to `03c` (post-v2) | `LEGACY_CLEANUP_ADAPTERS` in `bin/lib/harnesses/index.js`; `git show 5c97065 --stat` |
| Aider / Gemini CLI | Read-and-adopt (out of first-class scope) | Root `AGENTS.md` single-agent invocation pattern; no adapter planned for v2.0 | `02p` §1.2 owner scope |

**Kiro caveats (user expectations):**

- **Custom agents are generated as JSON, not linked.** Kiro parses an agent config as its runtime settings (`tools` as an array, `permissions.rules`), while Vespyr personas carry OpenCode-shaped frontmatter (`tools` as a map, `permission:` singular). `.kiro/agents/<name>.json` is therefore transpiled on every install/update, not symlinked; a raw symlink would surface 20 schema-invalid picker entries.
- **JSON, not Markdown — verified against the product.** Kiro CLI 3.1.0 discovers only `.json` in `.kiro/agents`: a Markdown agent is absent from `kiro-cli agent list`, and `kiro-cli agent validate` parses `.md` as JSON and rejects it. `tests/cli/kiro-conformance.test.js` runs the real `kiro-cli validate` and `kiro-cli list` against every generated config, so this claim fails loudly if a future Kiro changes the rule. Markdown agents emitted by the previous adapter version are removed on upgrade (only those carrying the old marker).
- **Generated files are marked.** Each generated config carries `_vespyr.generated` plus a checksum; Kiro tolerates unknown top-level keys (verified with `kiro-cli agent validate`). Reinstall overwrites only marked files, and uninstall deletes only marked files — a hand-written `.kiro/agents/*.json` survives both.
- **A legacy `agents` symlink is replaced, not written through.** If `.kiro/agents` is already a symlink to `.agents/agents`, it is unlinked first; writing generated files through that link would rewrite the source personas.
- **Conflict backups live in `.kiro/.bak/`, mirroring the tree.** Kiro scans `.kiro/steering/` and `.kiro/agents/`, so a `*.backup.<ts>` file left beside an original is litter inside a scanned tree. `handleConflict` accepts a `backupDir` (plus the base path to measure the relative path from); the Kiro adapter passes `.kiro/.bak` rooted at `.kiro`, so backups read `.bak/steering/vespyr-steering.md.backup.<ts>` and `.bak/agents/<name>.json.backup.<ts>` — the same convention `.agents/.bak/` uses. Pre-upgrade litter is relocated there preserving its path, and the doc sync never rewrites an adapter-owned path, so a clean update creates no backups at all.
- **Uninstall sweeps only Vespyr's own backups.** A backup is deleted when what it preserved was Vespyr output — a generated agent config (`_vespyr` marker), a legacy generated Markdown agent, a steering document identical to the canonical template, or a directory that is only a copy of the core skills. A backup of the owner's own file (an edited steering doc, a custom skills directory) is left in place and reported: `Kept N backup entries in .kiro/.bak (not Vespyr-generated)`. An empty `.bak` is pruned, so `.kiro` is still removed when nothing else remains.
- **Generated agents are checksum-guarded.** `_vespyr.checksum` carries a checksum of the config with the checksum blanked. On reinstall, untouched output from an older Vespyr is replaced silently; a generated file that was edited by hand is copied to `.kiro/.bak/` before regeneration. A hand-written agent with a colliding name is skipped and never backed up, because nothing overwrites it.

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
