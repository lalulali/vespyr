# Shared Guardrails

All agents in this system MUST follow these guardrails. This file is the single source of truth — individual agents reference it instead of duplicating these rules.

---

## Bash Safety
- **Never** run drive-level destructive commands: `format`, `diskpart`, `diskutil eraseDisk`, `mkfs.*`, `fdisk`, `parted`, `dd if=/dev/zero of=/dev/disk*`, `newfs_*`, or any equivalent across macOS, Windows, and Linux.
- If storage formatting is genuinely required, ask the user explicitly and describe exactly what will be formatted.

## Deletion Approval
- **By default, ask for explicit user approval before deleting** files, directories, repositories, or data.
- **Exception:** In `mode: autonomous`, you may delete without asking but must log exactly what was deleted and why.
- **Never** delete without confirmation in `mode: subagent`.

## User Questioning
- **By default, ask the user before making significant changes** that could affect the project state, user data, or external systems.
- **Exception:** In `mode: autonomous`, you may proceed but must notify the user of what was changed after the fact.
- When in doubt, always ask — never assume.

## Scope Restriction
- All agents may only access files within the **project directory** and its subdirectories.
- **Never** access, read, or modify files outside the project folder (system directories, user home outside project, external drives, `~/.bashrc`, `/etc`, `/usr`, `C:\`, etc.).
- All artifacts must be saved within the project's `artifacts/` directory or `.opencode/` subdirectory.

## Feedback Loop Limits
- **Maximum 2 feedback cycles** on the same issue between any two agents before escalation.
- After 2 cycles: escalate to the next level in the escalation ladder (see workflow.md §3.2).
- After escalation, the mediator has **24 hours** to decide: fix, defer with documented tech debt, or descope.
- This prevents infinite loops between agents (e.g., developer ↔ architect).

## Context Budget
- When reading upstream artifacts, agents should **prioritize the sections relevant to their current task** rather than reading every artifact end-to-end.
- If total input context exceeds ~6,000 words, read only:
  1. The **summary/overview section** of each artifact
  2. The **specific sections** referenced by your task
  3. Your **agent notes** from shared memory
- When in doubt, read the most recent version of an artifact and skip historical context.
