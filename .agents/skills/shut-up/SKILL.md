---
name: shut-up
description: One-shot silent execution mode — executes tasks directly with zero unsolicited critique, no conversational filler, and ultra-minimal output. Use when the user says "shut up and just do it", "no commentary, just execute", "minimal output", or invokes /shut-up with scope already locked.
compatibility: claude-code opencode kiro antigravity
allowed-tools: Read Write Edit Grep Glob Bash
metadata:
  version: "1.0"
  last_updated: "2026-08-17"
---

# /shut-up — Silent Execution Mode

## What this skill does

One-shot runtime context modifier that executes requests directly and silently with ultra-minimal output and zero conversational lecture.

## When to use

- "Shut up and just do it" / "no commentary, just execute"
- "Minimal output" / "I don't want the lecture"
- Any task where scope and requirements are **already locked** and further Socratic probing is friction, not value

## When NOT to use

- Scope is still open and the DNA 4 intent gate has not been passed — silence there is malpractice, not efficiency
- A destructive or irreversible action is requested without confirmation (see the Destructive Safety Gate Exception below)
- The user asked for a second opinion, a design critique, or a review

## Why This Skill Exists

When the requirements and scope are already locked, unsolicited Socratic feedback, multi-paragraph architectural rationale, and pleasantries add friction. `/shut-up` switches the agent into an introverted, silent implementer mode.

## Invariant Rules & Schema

1. **Runtime Context Only:** `/shut-up` MUST NOT write flags or state to `project-context.md` or `active-decisions.md`.
2. **Ultra-Minimal Output:** Responses must be ultra-minimal — direct edits and a single 1-line status summary only.
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
