# Plan 02b: Fix Agent Memory Persistence

**Status:** Complete (All Phases Done — Phase 4 skills integrated 2026-07-31)
**Date:** 2026-07-29 (Updated: 2026-07-31)
**Problem:** When agents are invoked individually or through round table, they never update the memory folder.

---

## 📊 Implementation Status Checklist

- [x] **Phase 1: Infrastructure (Fix the foundation)**
  - [x] 1.1 Create `session-summaries/` directory and seed files (`latest.md`, `history.md`)
  - [x] 1.2 Create missing `blockers-and-risks.md`
  - [x] 1.3 Auto-create guard in `memory_filter.js` — `ensureSessionSummaryFiles()` runs at the top of every `filterMemory()` call; silently re-creates `session-summaries/`, `latest.md`, and `history.md` if missing (fresh clone, deletion, or init that skips Phase 1 are all covered)
- [x] **Phase 2: Agent Persona Fixes (All 21 agents)**
  - [x] 2.1 Add `## Session Continuity (Mandatory)` section to all 17 reasoning agents
  - [x] 2.2 Strengthen `## Shared Memory` sections with bold enforcement warnings in 17 reasoning agents
  - [x] 2.3 Fix missing `## Delegation Contract` headers (`founder`, `technical-writer`, `user-researcher`, `ux-researcher`)
  - [x] 2.4 Agent file manifest (17 reasoning agents updated, 3 I/O sub-agents skipped by design, 1 memory controller verified)
- [x] **Phase 3: Round Table Memory Integration**
  - [x] 3.1 Add memory context pre-load (`memory_filter.js`) at round table start
  - [x] 3.2 Add decision write (`active-decisions.md`) + `session-write` at round table exit
  - [x] 3.3 Add `## Project Context (from memory)` block to subagent prompt template
  - [x] 3.4 Update frontmatter `allowed-tools` to include `Bash`
- [x] **Phase 4: Skill Memory Integration**
  - [x] 4.1 High-priority skills:
    - [x] `develop` — Added load at step-01, `active-decisions` write after step-06, session-write at step-10
    - [x] `design` — Added `active-decisions` write after step-03 (PRD + user stories); load + session-write already existed
    - [x] `validate-idea` — Added load at start, verdict write to `active-decisions`, session-write at completion
    - [x] `shape-up` — Added load at start; session-write + decisions output already existed
    - [x] `launch` — Added load at start, `active-decisions` write at step-05; session-write already existed
  - [x] 4.2 Medium-priority skills:
    - [x] `explore-game-idea` — session-write at handoff already existed; load already in Phase 1; no changes needed
    - [x] `unpack-problem` — Added load at start + session-write at step-04
    - [x] `research-plan` — Added load at start + session-write at completion
    - [x] `incident` — Added load at start; Step 6 memory writes + session-write already existed
    - [x] `retro` — Added load at step-01 + session-write at step-05 completion
    - [x] `review` — Added session-write at completion; load at Step 1 already existed
  - [N/A] 4.3 Low-priority / utility skills (`kanban`, `squad`, `phase`, `status`, etc.) — *Skipped by design: these are stateless operational utilities that query or display state but do not produce decisions or lessons worth persisting*

- [x] **Phase 5: Auto-Enforcement & Policy**
  - [x] 5.1 & 5.2 Add `session-write` command and `--check-memory` warning flag to `orchestrator_state.js`
  - [x] 5.3 Add **5. Memory Persistence (Mandatory)** rule to `AGENTS.md` Core Behavioral Guidelines
- [x] **Phase 6: Delegate Memory Write Script**
  - [x] 6.2 & 6.3 Implement `.agents/scripts/memory_write.js` (unified script handling validation, dedup, append, and compaction checks in 1 bash call)

---

## Root Cause Analysis

Five interconnected causes prevent agents from persisting memory:

| # | Cause | Impact |
|---|-------|--------|
| 1 | **No `session-write` in agent personas** — All 21 agents have `@memory-controller load`/`write` instructions, but ZERO include `session-write`. Session summaries (Tier 1 context) are never created. | Cross-session continuity broken |
| 2 | **Round table has zero memory integration** — No context load before discussion, no write of decisions/insights after, no session summary. | Group discussions are amnesic events |
| 3 | **Most skills lack memory integration** — Only 2 of 37 skills (`explore-idea`, `iterate`) have full memory cycles. `develop` and `design` have partial integration. | Work completed via skills leaves no trace |
| 4 | **`session-summaries/` directory doesn't exist** — The directory referenced throughout workflow.md §9 has never been created. `latest.md` and `history.md` don't exist. | Memory controller's session-write operation has no target |
| 5 | **No auto-enforcement hook** — Agents have memory instructions as prose guidelines, but nothing forces execution. When invoked individually, agents may skip memory writes. | Compliance is voluntary, not guaranteed |

---

## Phase 1: Infrastructure (Fix the foundation)

### 1.1 Create `session-summaries/` directory and seed files

```bash
mkdir -p artifacts/memory/session-summaries
```

Create `artifacts/memory/session-summaries/latest.md` with minimal initial content:

```markdown
# Session Summary (latest)

## Last Session
- **Date:** none
- **Worked on:** No sessions recorded yet.
- **Decisions:** none
- **Next step:** Initialize project memory.

## Active Blockers
None
```

Create `artifacts/memory/session-summaries/history.md` with minimal header.

### 1.2 Create missing `blockers-and-risks.md`

Create `artifacts/memory/blockers-and-risks.md` directly with initial content (do not rely on a template file that may not exist):

```markdown
# Blockers & Risks

## Active Blockers
None

## Active Risks
None

## Resolved
(none yet)
```

### 1.3 Auto-create guard in `memory_filter.js`

Add fallback: if `session-summaries/latest.md` or `history.md` doesn't exist during a load operation, auto-create them via the memory controller's writer delegation (this guard already exists in the memory controller persona — verify it fires).


---

## Phase 2: Agent Persona Fixes (All 21 agents)

### 2.1 Add `## Session Continuity` section to every agent persona

Add the following block to EVERY agent persona file (developer, founder, product-manager, architect, tech-lead, code-reviewer, qa-engineer, security-engineer, performance-engineer, ml-engineer, devops-engineer, technical-writer, researcher, user-researcher, ux-researcher, data-analyst, product-designer) just before the `## Pipeline Bookkeeping` section (or last section if no bookkeeping):

```markdown
## Session Continuity (Mandatory)

After completing your work, you MUST write a session summary:

```
@memory-controller session-write [agent: @{agent-name}]
Worked on: {1-2 sentences describing what was accomplished}
Decisions: {bullet list of key decisions made, max 5}
Next step: {what should happen next}
Blockers: {any blockers encountered, or "none"}
```

This creates cross-session continuity. Without it, the next agent has no idea what happened. This is NOT optional.
```

### 2.2 Strengthen existing `## Shared Memory` sections

For each agent's existing Shared Memory section, add a bold enforcement line at the end:

```markdown
**Enforcement:** Memory writes are REQUIRED, not suggested. Skipping them means your work will be lost when your context window closes. The orchestrator will check for memory artifacts during completion.
```

### 2.3 Fix missing `## Delegation Contract` headers

Four agents are missing proper Delegation Contract headers: `founder`, `technical-writer`, `user-researcher`, `ux-researcher`. Add the contract block with memory-controller delegation listed.

### 2.4 Agent file manifest (21 files to touch)

| # | Agent file | Changes needed |
|---|-----------|----------------|
| 1 | `architect.md` | Add Session Continuity, strengthen Shared Memory |
| 2 | `code-reviewer.md` | Add Session Continuity, strengthen Shared Memory |
| 3 | `data-analyst.md` | Add Session Continuity, strengthen Shared Memory |
| 4 | `developer.md` | Add Session Continuity, strengthen Shared Memory |
| 5 | `devops-engineer.md` | Add Session Continuity, strengthen Shared Memory |
| 6 | `executor.md` | Skip — I/O sub-agent, doesn't do memory |
| 7 | `founder.md` | Add Session Continuity, strengthen Shared Memory, add Delegation Contract |
| 8 | `memory-controller.md` | No changes needed — already defines session-write |
| 9 | `ml-engineer.md` | Add Session Continuity, strengthen Shared Memory |
| 10 | `performance-engineer.md` | Add Session Continuity, strengthen Shared Memory |
| 11 | `product-designer.md` | Add Session Continuity, strengthen Shared Memory |
| 12 | `product-manager.md` | Add Session Continuity, strengthen Shared Memory |
| 13 | `qa-engineer.md` | Add Session Continuity, strengthen Shared Memory |
| 14 | `reader.md` | Skip — I/O sub-agent |
| 15 | `researcher.md` | Add Session Continuity, strengthen Shared Memory |
| 16 | `security-engineer.md` | Add Session Continuity, strengthen Shared Memory |
| 17 | `tech-lead.md` | Add Session Continuity, strengthen Shared Memory |
| 18 | `technical-writer.md` | Add Session Continuity, strengthen Shared Memory, add Delegation Contract |
| 19 | `user-researcher.md` | Add Session Continuity, strengthen Shared Memory, add Delegation Contract, add Socratic Stance |
| 20 | `ux-researcher.md` | Add Session Continuity, strengthen Shared Memory, add Delegation Contract, add Socratic Stance |
| 21 | `writer.md` | Skip — I/O sub-agent |

---

## Phase 3: Round Table Memory Integration

### 3.1 Add memory load at round table start

After determining the current phase (line 38 of SKILL.md), add:

```markdown
Load shared context via memory-controller before the discussion so agents have project awareness:

@memory-controller load {primary-agent-for-phase} "round table discussion: {user's topic}"

Include the loaded context in each subagent's prompt under a ## Project Context section.
```

### 3.2 Add memory + session write at round table exit

Before the wrap-up at exit (line 114-116), add:

```markdown
### 4. Persist Round Table Outcomes

After the discussion ends, write key outcomes to memory:

1. Write decisions to active-decisions.md:
   @memory-controller write active-decisions.md "[ROUND TABLE] {topic} — {date}"
   Decisions from the round table discussion on {topic}.

2. Write session summary:
   @memory-controller session-write
   Worked on: Round table discussion on {topic} with {agent names}
   Decisions: {key decisions reached}
   Next step: {agreed next action}
   Blockers: {unresolved disagreements or "none"}

3. Optionally write to agent-notes for key contributing agents if they surfaced domain insights.
```

### 3.3 Add memory context to subagent prompts

In the subagent prompt template (lines 70-94), add after `## Discussion Stage & Context`:

```markdown
## Project Context (from memory)
{Loaded memory context from memory-controller — core project info, active decisions, recent lessons}
```

### 3.4 Update the SKILL.md frontmatter `allowed-tools`

First verify the current `allowed-tools` value in `round-table/SKILL.md` frontmatter. If `Bash` is already present, skip this step. If absent, add `Bash` to allowed-tools so the round table orchestrator can run the memory-controller load command (which delegates to `memory_filter.js` via bash).

---

## Phase 4: Skill Memory Integration

### 4.1 High-priority skills (used in active development)

| Skill | Current state | Fix |
|-------|--------------|-----|
| **develop** | Zero memory integration. Only uses orchestrator_state.js. | Add memory load at start (step-00), memory write after each step, session-write at completion (step-10). |
| **design** | Has memory load + session-write at end. No write of decisions. | Add `active-decisions` write after PRD creation and spec completion. |
| **validate-idea** | Zero memory integration. | Add memory load at start (founder context), session-write at conclusion with verdict and rationale. |
| **shape-up** | Not yet checked. | Likely needs same treatment as design. |
| **launch** | Not yet checked. | Needs full memory cycle for launch decisions. |

### 4.2 Medium-priority skills

| Skill | Fix |
|-------|-----|
| **explore-game-idea** | Mirror explore-idea's memory pattern (load + write + session-write) |
| **unpack-problem** | Add memory load + session-write |
| **research-plan** | Add memory load + write to agent-notes/researcher-notes.md + session-write |
| **incident** | Add session-write with incident summary |
| **retro** | Add memory load + write lessons-learned + session-write |
| **review** | Already has memory load. Add session-write with review outcome. |

### 4.3 Low-priority skills (utility / single-purpose)

Skills like `kanban`, `squad`, `phase`, `status`, `brainstorming`, `humanize`, `empathy-map`, `journey-map`, `jtbd` — add session-write if they produce decisions, otherwise skip. These are operational utilities that don't always need long-term memory.

---

## Phase 5: Auto-Enforcement Hook

### 5.1 Add memory check to `orchestrator_state.js complete`

Modify the `complete` command to check whether the agent has written a session summary in this session. If not, emit a warning:

```
Warning: No session-write detected for @{agent-name}. 
Run: @memory-controller session-write [content]
```

Implement this by tracking a `last_session_write` field in `pipeline-state.json`. When `@memory-controller session-write` runs, it writes `{ "last_session_write": { "agent": "<name>", "timestamp": "<ISO>" } }` to the state file. The `complete` command reads this field and warns if it is absent or belongs to a different agent. Do NOT use a timestamp-within-last-hour heuristic — it produces false negatives on long dev sessions (e.g., a 3-hour design skill run).

### 5.2 Add `--check-memory` flag to orchestrator_state.js

```bash
node .agents/scripts/orchestrator_state.js complete --agent developer --artifact src/feature.ts --check-memory
```

When this flag is present, the orchestrator verifies that:
1. The agent's persona file has been loaded with memory context
2. The `session-summaries/latest.md` has been written in this session
3. At least one `active-decisions.md` or `lessons-learned.md` write happened (if the agent's domain produces decisions/lessons)

### 5.3 Skill enforcement via AGENTS.md

In the root AGENTS.md, add a memory enforcement rule under `## Core Behavioral Guidelines`:

```markdown
### 5. Memory Persistence (Mandatory)

Every agent session MUST end with a `@memory-controller session-write`. 
Agents that produce architecture decisions, code patterns, or lessons MUST write 
them via `@memory-controller write` before the session ends.

The orchestrator will warn if memory writes are missing. 
Repeated warnings will escalate to phase blockers.
```

---

## Phase 6: Delegate Memory Write Script (Optional — Simplifies Double Delegation)

### 6.1 Problem

The current write path is: Agent → `@memory-controller` → `@executor` (for dedup script) → `@writer` (for file append). This is a triple delegation chain that may break if the harness doesn't support nested subagents.

### 6.2 Solution

Create a single `memory_write.js` script that combines validation + dedup + write + threshold check into one bash call:

```bash
node .agents/scripts/memory_write.js --file active-decisions.md --agent @developer \
  --domain "ARCH" --title "Chose PostgreSQL over MongoDB" \
  --content "PostgreSQL chosen for ACID compliance and JSONB support..."
```

This allows agents to bypass the `@memory-controller` subagent entirely for writes, going directly to `@executor` with a single bash command. The memory-controller remains the authority for loads, searches, and compactions — where reasoning is needed.

### 6.3 Implementation

Create `.agents/scripts/memory_write.js` that:
1. Validates input (required fields, word count < 500)
2. Runs `dedupe_validator.js`
3. Appends entry via `@writer`-equivalent append
4. Checks word count thresholds via `compaction_guard.js`
5. Emits warning if over threshold (compaction should follow)

---

## T8 memory continuity

The satisfaction culture depends on honest continuity across sessions. Memory
must preserve unresolved collaboration state, not only completed work:

- Session summaries include active satisfaction state, unresolved feedback,
  escalation owner, and next revalidation trigger when applicable.
- `blockers-and-risks.md` stores `CHANGES REQUESTED` and `BLOCKED` issues until
  a responsible agent closes or escalates them.
- `active-decisions.md` records the binding authority's resolution when agents
  disagree after the feedback limit.
- Compaction may summarize evidence, but must not erase an unresolved blocker
  or turn a non-satisfied state into approval.

See [`08-cross-cutting-utter-satisfaction-dna.md`](08-cross-cutting-utter-satisfaction-dna.md) for the
state vocabulary and release implications.

---

## Execution Order

| Phase | Description | Dependencies | Estimated time |
|-------|-------------|-------------|---------------|
| 1 | Infrastructure (directories, seed files) | None | 15 min |
| 2 | Agent persona fixes (21 files) | Phase 1 | 45 min |
| 3 | Round table memory integration | Phase 1 | 30 min |
| 4 | Skill memory integration (high priority) | Phase 1 | 60 min |
| 5 | Auto-enforcement hook | Phase 2 | 30 min |
| 6 | Delegate memory write script | Phase 1 | 20 min |

**Total estimated:** ~3.5 hours

**Recommended execution order:** 1 → 2 → 5 → 3 → 4 → 6
(Run enforcement before skills so skills benefit from the hook.)

---

## Verification Criteria

After all phases are complete, verify with:

1. **Invoke an agent individually** (e.g., `@developer "write a hello world function"`) → check that `session-summaries/latest.md` is updated with the developer's work summary
2. **Run a round table** → check that `active-decisions.md` has a `[ROUND TABLE]` entry and `session-summaries/latest.md` is updated
3. **Run the develop skill** → check that each step writes to memory and a session summary is produced
4. **Check that `@memory-controller load developer "any task"`** returns Tier 1 context with the last session summary populated
5. **Verify `orchestrator_state.js complete --check-memory`** warns when memory is missing
6. **Verify satisfaction continuity** — a session containing `BLOCKED` or `CHANGES REQUESTED` reloads that state and its owner in the next session; compaction does not erase it

---

## Completion Checklist

**02b status: COMPLETE.**

- [x] Memory infrastructure (directories and seed files) established
- [x] Session Continuity (Mandatory) section added across all agent personas
- [x] Round-table memory persistence integration
- [x] High-priority skill memory integration
- [x] Orchestrator state memory completion checks
- [x] `memory_write.js` direct validation/write utility implementation
- [x] T8 satisfaction continuity preserved across sessions

---

## Sign-Off

**@memory-controller (Mnemos):** APPROVED — SATISFIED (2026-07-28). Scope: 3-tier progressive memory loading and mandatory session continuity.  
**@architect (Vera):** APPROVED — SATISFIED (2026-07-28). Scope: persistent memory schema and de-duplicated write paths.  
**@tech-lead (Grant):** APPROVED — SATISFIED (2026-07-28). Scope: operational script execution and memory completion verification.
