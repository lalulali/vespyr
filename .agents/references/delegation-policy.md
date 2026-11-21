# Delegation Policy — When to Use Sub-Agents

> **Companion to:** ~~`.agents/delegation-pattern.md`~~ (deleted 2026-08-10; capability-based direct I/O is canonical) — this file is the Vespyr-specific operational policy.

**Rule:** Reasoning agents do direct I/O via harness-native subagents where the harness supports them, direct calls where it does not. The `@reader`/`@writer`/`@executor` trio personas were deleted 2026-08-10 (02g re-scope) and MUST NOT be referenced as dispatch targets. `@memory-controller` remains the mandatory memory path.

## Task → Sub-agent mapping

| Task type | Delegate to | Why |
|---|---|---|
| Read 1-3 small files (< 500 lines total) | direct | overhead exceeds benefit |
| Read 1+ large file OR 4+ files | harness subagent / direct | keeps main context lean |
| Search codebase (grep/glob) | harness subagent / direct | fast regex, condensed output |
| Write a single file < 50 lines | direct | overhead exceeds benefit |
| Write 1+ file OR > 50 lines | harness subagent / direct | atomic write, consistent format |
| Refactor across N files | harness subagent (batch mode) / direct | one transaction, N outputs |
| Run any bash command | harness execution / direct | parses output, returns summary |
| Read/write memory files | `@memory-controller` | validates schema, enforces format |
| Read/write skill/agent files | direct (human-gated proposal only) | versioned, reviewable diff |

## Multi-developer worktree rules

When `@developer` spawns parallel tasks via worktrees:
- Each worktree's I/O is isolated — one worktree cannot read or write files in another
- Worktree creation: `node .agents/scripts/worktree.js create <branch>`
- Worktree cleanup: `node .agents/scripts/worktree.js clean <branch>`
- Active worktrees are tracked in `.agents/state/loop-state.json`

## Override protocol

If you must do I/O directly (outside the table above), emit one line:

```
[DIRECT-IO-JUSTIFIED: {task} because {reason}]
```

Allowed for tiny, low-risk operations. The justification is appended to `.agents/state/delegation-log.ndjson` for audit (F2.21/F2.22 — append-only, tail-read at ~10MB; the legacy `.json` log is still read for backward compatibility).

**Cadence (02p R1.10, 2026-09-29; updated F2.21 2026-11-19):** run `node .agents/scripts/delegation_audit.js --since 7d --fail-below 50` weekly. The append-only log is `.agents/state/delegation-log.ndjson`; the legacy `.json` file remains readable for existing installs. The roster is derived from `.agents/agents/*.md`, never hardcoded. The audit reports per-agent delegated/direct counts and rate, flags agents below the threshold (exit 1), and flags implausible justification rates. When no log data exists it falls back to session-summary mentions, explicitly labeled lower confidence — no delegation count is fabricated. Hooks write the log events (F2.1); until a harness exposes subagent-spawn telemetry, direct-I/O rate is the only signal on that harness.

## Delegation-path lines (decision 2026-09-29, 02p R1.11 — DESCOPE)

The per-skill `Delegation path: <capability> → <role> | direct-fallback` rollout is **descoped**. The line was designed for the trio-persona delegation model that was removed outright (2026-08-10), and the ban-only lint (`compile_skills.js`, 02p R0.2) does not require it. Exactly **one** skill retains the line because it genuinely dispatches persona subagents: `round-table/SKILL.md:27`. No other skill gets one — fabricating them would manufacture record claims without semantics (the exact defect class `02p` exists to kill). Verify: `grep -rl "^Delegation path:" .agents/skills/ | wc -l` → 1.

## Anti-patterns

- **Reading 5 files then summarizing inline** — batch the reads via a harness subagent to keep main context lean
- **Running `npm test` and pasting full output** — summarize the output, return the verdict plus failures only
- **Writing 3 related files in 3 separate edit calls** — batch into one call sequence
- **Direct memory writes without `@memory-controller`** — bypasses schema validation
