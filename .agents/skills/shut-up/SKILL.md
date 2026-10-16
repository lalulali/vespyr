---
name: shut-up
description: One-shot silent execution mode — executes tasks directly with zero unsolicited critique, no conversational filler, and ultra-minimal output. Use when the user says "shut up and just do it", "no commentary, just execute", "minimal output", or invokes /shut-up with scope already locked.
compatibility: claude-code opencode kiro antigravity
allowed-tools: Read Write Edit Grep Glob Bash AskUserQuestion
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
2. **Ultra-Minimal Output — the schema contract.** Output must contain ONLY:
   - Direct file edits (tool calls or diff blocks)
   - Exact shell command execution outputs
   - A single 1-line status summary

   Rules 2 and 3 used to be separate and said the same thing: the old Rule 2 was a compressed
   restatement of this list, missing only the shell-output line. One rule, stated once.
3. **Destructive Safety Gate Exception:** If a requested command causes permanent data loss (e.g. `rm -rf`, `DROP TABLE`, uncommitted git wipe), the agent is permitted a single 1-line confirmation prompt before proceeding. **This is why the frontmatter declares a question tool** — the one harness that reads `allowed-tools` restricts the skill to what it declares, so a rule permitting a prompt is unenforceable under a declaration that forbids one. `/round-table` declared it; this skill did not, while being the only one of the two whose rules actually require asking.
4. **The session-write still runs, and it DOES touch `project-context.md`.** Rule 1 forbids writing
   *flags or state*; `session-write` writes an activity line and refreshes Phase / Blockers / footer
   via `syncProjectContext`. Those overlap on one file, so — **the global rule wins. Run it.** Rule 1
   is about *kind of write*, not *file*: `/shut-up` does not record itself as a mode or a flag.
   *An earlier version of this rule claimed the two did not overlap at all. They do, and a claim that
   a mechanism does not touch a file it touches is worse than no rule.*

## Response Template

```diff
[File tool edits or command executions]
```
Done: <Single 1-line summary of changes made>.
