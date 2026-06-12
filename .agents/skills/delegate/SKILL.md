---
name: delegate
description: One-shot I/O offload to @reader, @writer, or @executor — keeps your context focused on reasoning
---

## What this skill does

Provides a quick delegation interface to the three I/O sub-agents. Use when you need to offload an operational task without loading a full workflow skill.

## When to use

- "Read src/auth.ts and summarize" → delegate to @reader
- "Write this config file" → delegate to @writer
- "Run the tests and tell me what failed" → delegate to @executor
- Any quick I/O task that doesn't need a full skill

## Delegation routing

| Task | Agent | Model |
|------|-------|-------|
| Read/search files, return summary | `@reader` | Lightweight (DS Flash) |
| Write/edit files precisely | `@writer` | Lightweight (DS Flash) |
| Run commands, summarize output | `@executor` | Lightweight (DS Flash) |

## Workflow

### For read tasks

```
@reader — Read [file/path] and summarize [specific aspect]
```

### For write tasks

```
@writer — Write [file/path] with the following content:
[exact content]
```

### For command tasks

```
@executor — Run [command] and summarize output
```

## Rules

- Be specific about what you want. Vague requests waste the sub-agent's context.
- For writes, provide exact content. The writer transcribes — it doesn't design.
- For commands, specify what output matters. "Run tests and tell me which failed" not just "run tests".
