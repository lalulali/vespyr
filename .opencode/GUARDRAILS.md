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

## Session Continuity
- At the end of any significant work session, invoke `@memory-controller session-write` with a brief summary of what was done, decisions made, next step, and new blockers.
- Use the format in `.opencode/templates/session-summary-template.md`.
- This is not optional for sessions that produce decisions or code — it is the primary mechanism for cross-session continuity.
- The session summary costs ~100 tokens to load and saves the next agent from re-reading all memory files to understand where things stand.

## Merge Conflict Resolution
- `artifacts/memory/archive/index.ndjson` is append-only. If a git merge conflict occurs:
  1. **Never** pick one side and discard the other.
  2. Run `node .opencode/scripts/archive_manager.js merge --ours index.ndjson --theirs index.ndjson --out index.ndjson`
  3. The script concatenates both entry lines, deduplicates by ID, and re-sorts by date.
  4. Always validate after merge: `node .opencode/scripts/archive_manager.js validate --file index.ndjson`
- For legacy `index.json` files, convert to NDJSON first: `node .opencode/scripts/archive_manager.js migrate --from index.json --to index.ndjson`

## Upstream Artifact Read Policy
- Before reading any upstream artifact, **always check if the file exists** first.
- If an expected upstream artifact is missing, **do NOT proceed silently and do NOT hallucinate its content.**
- Present the user with exactly these two options:
  1. **Continue** — Proceed with whatever context is available. Explicitly list every missing file and note the gaps in your reasoning.
  2. **Restart from beginning** — Tell the user which upstream agent needs to run first (e.g., "`artifacts/output/01-research/` is missing — invoke `@founder` and `@researcher` first").
- **Default:** If the user does not respond within this turn, choose **Continue** but prominently flag all missing context as `[MISSING]` in your output.
- Never fabricate requirements, personas, or competitive data from a missing file.

## Change Request Protocol

When an agent discovers an issue with an upstream artifact (spec gap, implementation blocker, design conflict, etc.):

1. **Do NOT re-invoke the upstream agent** to "fix" or "revise" the artifact.
2. **File a change request** to `artifacts/output/04-planning/change-requests.md`:
   ```
   ## CR-NNN [OPEN]
   **From:** @{agent}
   **To:** @{upstream-agent}
   **Target:** {file} → {section}
   **Issue:** {specific problem}
   **Proposed fix:** {concrete suggestion}
   **Impact:** {effort estimate, user-facing impact}
   **Status:** OPEN
   ```
3. The upstream agent responds to **only this request**, not its full workflow.
4. If unresolved after one response, **escalate to the decision authority** (see table below).
5. No agent may re-process an entire artifact in response to a change request.

### Decision Authority

| Dispute | Decider | Binding |
|---------|---------|---------|
| Spec vs. implementation feasibility | `@tech-lead` | Yes |
| Spec vs. business value | `@product-manager` | Yes |
| Tech-lead vs. PM on scope | `@founder` | Yes |
| Design vs. accessibility | `@ux-researcher` | Yes |
| Security finding vs. timeline | `@security-engineer` | Yes |

## Small-File Direct Write

Thinking agents (@founder, @architect, @product-manager, @product-designer, @tech-lead, @researcher, @user-researcher, etc.) may write files directly without delegating to `@writer` when:

| Condition | Write directly | Delegate to @writer |
|-----------|---------------|---------------------|
| File size | < 200 lines or < 500 words | ≥ 200 lines or ≥ 500 words |
| File type | CRs, status updates, short reports, notes | PRDs, specs, ADRs, user stories, research reports |
| Edit type | Append new entry, edit single section | Rewrite entire document, structural changes |

**Rationale:** The double-hop tax (agent → @writer → disk) costs ~200 tokens per invocation. For small files, this overhead exceeds the file content itself. Large documents benefit from @writer's transcription focus, keeping the thinking agent's context clean.

**Exception:** If an agent's frontmatter explicitly denies `edit` permission, they must delegate regardless of file size.

## Concise Chat Responses (Save Tokens & Noise)

- **Do NOT duplicate or summarize written files in chat**: When you write, modify, or update a document/file (such as a PRD, spec, user stories, code, or report), you must reply with a very short and concise message in the chat pane.
- **Never dump, quote, or repeat the content of the written document** back to the user or other agents in the chat thread. The written file is already the record of truth.
- **Focus on the "Why" and Key Decisions**: If explanation is needed, reply only with the strategic or technical *why* (rationale) behind your choices and any outstanding questions/decisions. Do not repeat *what* is in the document itself.
- **Format:** Use a single-sentence or extremely brief bulleted confirmation with a link to the modified file, followed by a maximum of 2-3 sentences explaining the core rationale ("why") if appropriate.

## Architectural Boundaries (Architect vs. Developer)

- **Focus on Contracts, NOT Implementation**: In all architectural design documents, ADRs, and system specs, `@architect` must focus strictly on defining structural boundaries, system components, database DDLs/schemas, type declarations, and API payloads/JSON shapes.
- **Never Write Business Logic or Application Code**: The `@architect` must NEVER write raw controller/handler logic, application algorithms, helper methods, or UI components.
- **Preserve Developer Creativity**: Leaving implementation details open ensures the `@developer` retains complete coding creativity, performance optimization control, and technical execution autonomy.


