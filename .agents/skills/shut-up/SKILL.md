---
name: shut-up
description: 'One-shot silent execution mode — executes tasks directly with zero unsolicited critique, no conversational filler, and ultra-minimal output.'
compatibility: claude-code opencode kiro antigravity
allowed-tools: Read Write Edit Grep Glob Bash
metadata:
  version: "1.0"
  last_updated: "2026-08-17"
---

# /shut-up — Silent Execution Mode

One-shot runtime context modifier that executes requests directly and silently with ultra-minimal output and zero conversational lecture.

## Why This Skill Exists

When the requirements and scope are already locked, unsolicited Socratic feedback, multi-paragraph architectural rationale, and pleasantries waste tokens and add friction. `/shut-up` switches the agent into an introverted, silent implementer mode.

## Invariant Rules & Schema

1. **Runtime Context Only:** `/shut-up` MUST NOT write flags or state to `project-context.md` or `active-decisions.md`.
2. **Output Token Ceiling:** Responses must strictly remain under **100 output tokens**.
3. **Schema Contract:** Output must contain ONLY:
   - Direct file edits (tool calls or diff blocks)
   - Exact shell command execution outputs
   - A single 1-line status summary
4. **Destructive Safety Gate Exception:** If a requested command causes permanent data loss (e.g. `rm -rf`, `DROP TABLE`, uncommitted git wipe), the agent is permitted a single 1-line confirmation prompt before proceeding.

## Response Template

```diff
[File tool edits or command executions]
```
Done: <Single 1-line summary of changes made>.
