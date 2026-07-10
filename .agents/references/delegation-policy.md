# Delegation Policy — When to Use Sub-Agents

> **Companion to:** `.agents/delegation-pattern.md` (cross-harness concept) — this file is the Vespyr-specific operational policy.

**Rule:** Reasoning agents (developer, code-reviewer, architect, qa-engineer, etc.) delegate I/O to sub-agents by default. Direct I/O requires a `[DIRECT-IO-JUSTIFIED: ...]` line in the response.

## Task → Sub-agent mapping

| Task type | Delegate to | Why |
|---|---|---|
| Read 1-3 small files (< 500 lines total) | direct | overhead exceeds benefit |
| Read 1+ large file OR 4+ files | `@reader` | keeps main context lean |
| Search codebase (grep/glob) | `@reader` | fast regex, condensed output |
| Write a single file < 50 lines | direct | overhead exceeds benefit |
| Write 1+ file OR > 50 lines | `@writer` | atomic write, consistent format |
| Refactor across N files | `@writer` (batch mode) | one transaction, N outputs |
| Run any bash command | `@executor` | parses output, returns summary |
| Read/write memory files | `@memory-controller` | validates schema, enforces format |
| Read/write skill/agent files | `@writer` | versioned, reviewable diff |

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

Allowed for tiny, low-risk operations. The justification is logged to `state/delegation-log.json` for audit.

## Anti-patterns

- **Reading 5 files then summarizing inline** — that's `@reader`'s job
- **Running `npm test` and pasting output** — that's `@executor`'s job
- **Writing 3 related files in 3 separate edit calls** — batch into one `@writer` call
- **Direct memory writes without `@memory-controller`** — bypasses schema validation
