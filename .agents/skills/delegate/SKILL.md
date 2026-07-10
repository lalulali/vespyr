---
name: delegate
description: One-shot I/O offload to @reader, @writer, or @executor — keeps your context focused on reasoning
version: "2.0"
last_updated: 2026-07-10
---

# Delegate — I/O Offload

## What this skill does

Routes operational I/O tasks to the appropriate sub-agent. Reasoning agents use this to keep their context lean — reading, writing, and executing are delegated so the reasoning agent stays focused on decisions.

## When to use

- "Read src/auth.ts and summarize" → delegate to @reader
- "Write this config file" → delegate to @writer
- "Run the tests and tell me what failed" → delegate to @executor
- "Load context for this task" → delegate to @memory-controller
- Any quick I/O task that doesn't need a full skill

## When NOT to use

- For multi-step workflows (use the full skill, e.g., `/develop`)
- When the task requires reasoning before I/O (do the reasoning first, then delegate)

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

## Workflow

### For read tasks

```
@reader — Read [file/path] and summarize [specific aspect]
```

The reader returns structured, summarized content. Be specific about what you need — vague queries waste context.

### For write tasks

```
@writer — Write [file/path] with the following content:
[exact content]
```

**Always set `IsArtifact: false`** for standard workspace files (within `artifacts/`, `src/`, or `.agents/`). Set `IsArtifact: true` only for IDE planning artifacts (`task.md`, `implementation_plan.md`, `walkthrough.md`). This ensures files write directly to the workspace instead of the IDE's internal app data folders.

### For command tasks

```
@executor — Run [command] and summarize output
```

Specify what output matters. "Run tests and tell me which failed" not just "run tests".

### For memory tasks

```
@memory-controller load [task description]
```

The controller filters context by relevance, returns a compressed bundle.

## Token economics

Delegation saves 85-95% of I/O tokens by keeping raw file content and command output out of the reasoning agent's context window. A task that reads 5 large files costs ~15,000 tokens inline vs. ~1,000 tokens via @reader (summarized).

## Override protocol

If you must do I/O directly (outside the table above), emit one line:

```
[DIRECT-IO-JUSTIFIED: {task} because {reason}]
```

## Anti-patterns

- **Reading 5 files then summarizing inline** — that's `@reader`'s job
- **Running `npm test` and pasting output** — that's `@executor`'s job
- **Writing 3 related files in 3 separate edit calls** — batch into one `@writer` call
- **Direct memory writes without `@memory-controller`** — bypasses schema validation
