# Phase 6 — Loop Engineering

> **Release:** v2.1
> **Calendar:** Week 6 (after Phase 2, parallel with Phase 3)
> **Themes:** T4 (Harness contracts), T7 (Vespyr identity), T8 (UTTERLY SATISFIED culture)
> **Goal:** Vespyr runs itself on a loop. The user designs the loop, not the prompts. After this phase, Vespyr has a `/goal` primitive (run-until-verifiable-condition with a separate verifier model), a heartbeat (scheduled automations that discover and triage work), and on-disk loop state (so tomorrow's run picks up where today stopped). The maker/checker split — already a Vespyr differentiator — is applied to the stop condition itself, while T8 prevents loops from mistaking a passing command for a satisfied release.

**Source:** Addy Osmani, "Loop Engineering" (June 7, 2026). The article identifies 6 primitives for a self-running agent loop. 4 already exist in Vespyr (skills, sub-agents, state/memory, squads). This phase ships the missing 2: automations (the heartbeat) and `/goal` (run-until-done with verifier). Worktree isolation — the 6th primitive — ships in Phase 0 T7.1b (the loop's foundation).

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| Loop engineering | Not in original plan | **New phase** | Addy Osmani's article (June 2026) crystallized the pattern. The primitives map onto Vespyr's existing architecture with 2 gaps. This phase fills them. |
| Worktree tooling | T7.1 (policy only, Phase 0) | **T7.1b added to Phase 0** (the script) | Worktree isolation is the foundation — parallel agents can't loop without it. Cheap (4h), mechanical, ships v2.0. See `01-phase-0-foundation.md` T7.1b. |
| `/goal` primitive | Not in original plan | **F6.1-F6.4** | Highest-leverage piece. Run-until-verifiable-condition with a *separate* verifier model grading "done" — the maker/checker split applied to the stop condition. |
| Automations/heartbeat | Not in original plan | **F6.5-F6.8** | Turns one-shot swarms into an actual loop. Starts with ONE boring task (CI-failure triage) to measure real token cost before scaling. |
| Loop state | Not in original plan | **F6.9-F6.10** | The 6th primitive. The model forgets between runs; the repo doesn't. Loop state lives on disk, not in context. |

## Source mapping

| F-item | Primitive (Osmani) | Vespyr status before | Ships in |
|---|---|---|---|
| T7.1b (Phase 0) | Worktrees | Policy only (T7.1) | v2.0 |
| F6.1-F6.4 | `/goal` (run-until-done + verifier) | Missing | v2.1 |
| F6.5-F6.8 | Automations (heartbeat) | Missing | v2.1 |
| F6.9-F6.10 | State (on-disk loop memory) | Partial (3-tier memory exists, no loop-specific state) | v2.1 |
| — | Skills | Already exists (26 skills) | v2.0 |
| — | Sub-agents (maker/checker) | Already exists (21 personas, code-reviewer/qa-engineer) | v2.0 |
| — | Plugins/connectors (MCP) | Phase 2 F2.6-F2.10 | v2.1 |

---

## Prerequisites — Proof of concept required

**This phase is the most innovative but the least validated.** `/goal` with a separate verifier is genuinely novel, but it's specified in ~130 lines with one starter automation and no prototype. Before committing to the full spec:

- [ ] **PoC-1:** Manually run a `/goal`-like loop 3 times on a real task (e.g., "make all tests in `tests/auth/` pass"). Document: how many iterations it took, whether the verifier rubber-stamped, token cost per iteration, and whether the output was useful.
- [ ] **PoC-2:** Manually run the CI-failure triage automation once. Document: what it found, token cost, whether the triage file was actionable.
- [ ] **Go/no-go:** If PoC-1 shows the verifier rubber-stamps > 50% of the time, redesign the verifier separation before implementing. If PoC-2 shows token cost exceeds the value of findings, reconsider the automation scope.

PoC results are filed as a short report in `artifacts/output/01-discovery/loop-engineering-poc.md` and inform any spec revisions before implementation begins.

---

## F6.1-F6.4 — `/goal` primitive (run-until-verifiable-condition)

**Source:** Osmani "Loop Engineering" §Automations (`/goal` primitive) | **Theme:** T7

The user gives a verifiable stop condition (e.g., "all tests in test/auth pass and lint is clean"). The agent works in iterations: implement → verify → check stop condition. A *separate* verifier sub-agent — not the maker — grades whether the condition is met. The maker/checker split applied to the stop condition itself.

- [ ] F6.1 — Create `.agents/skills/goal/SKILL.md` (~150 lines):
  - When to invoke: user has a verifiable end condition and wants to walk away
  - Workflow: (1) Parse stop condition → (2) Plan iterations → (3) Implement via @developer → (4) Run verification via @executor → (5) Invoke @goal-verifier to grade → (6) If not done, loop to (3) → (7) If done, write loop-state + report
  - Stop condition syntax: shell command that exits 0 (e.g., `npm test -- --grep auth && npm run lint`)
  - Pause/resume/clear semantics: loop-state.json stores current iteration, last failure, next action
  - Hard limit: max 10 iterations per `/goal` invocation (configurable via `VESPYR_GOAL_MAX_ITERATIONS`)
  - Anti-patterns: uncheckable conditions ("make it good"), conditions the maker grades itself, no iteration limit
- [ ] F6.2 — Create `.agents/scripts/goal_check.js` (~120 lines): `run <condition>`, `status`, `resume`, `clear`. Runs the verification command, captures exit code + output, writes result to `.agents/state/loop-state.json`. **Implementation code:** See `10-implementation-specs.md` §13
- [ ] F6.3 — Create `.agents/agents/goal-verifier.md` (~80 lines): a narrow sub-agent that reads the verification output + stop condition and returns `DONE` or `NOT-DONE: <reason>`. It does NOT read the maker's code — it reads only the verification result. This is the structural safeguard: the agent that wrote the code is not the one grading "done." Mode: `subagent`. Capabilities: `read`. No write, no bash.
- [ ] F6.4 — Add `goal` command to `bin/cli.js`: `vespyr goal <condition>` starts the loop, `vespyr goal status` shows current state, `vespyr goal resume` continues, `vespyr goal clear` resets

## F6.5-F6.8 — Automations (the heartbeat)

**Source:** Osmani "Loop Engineering" §Automations | **Theme:** T4

An automation = prompt + cadence + skill + environment. Runs on a schedule, does discovery and triage, writes findings to a triage inbox. Runs that find nothing archive themselves. Starts with ONE boring task to measure real token cost before scaling.

- [ ] F6.5 — Create `.agents/skills/automation/SKILL.md` (~120 lines):
  - When to invoke: user wants a recurring task automated (triage, CI failure summary, commit briefing, bug hunt)
  - Automation definition: name, prompt, cadence (cron or interval), skill to invoke, environment (local checkout or background worktree)
  - Triage inbox: findings land in `artifacts/output/01-discovery/triage/<automation-name>/`
  - Archive: runs that find nothing are archived to `artifacts/output/01-discovery/triage/<automation-name>/archive/`
  - Anti-patterns: automations that modify code without a human review gate, automations that run all 21 agents, no cadence limit
- [ ] F6.6 — Create `.agents/scripts/automation.js` (~180 lines): `create`, `list`, `run <id>`, `run-all`, `archive <id>`. Stores definitions in `.agents/state/automations.json`. `run` executes the prompt + skill, writes findings to triage inbox. **Implementation code:** See `10-implementation-specs.md` §14
- [ ] F6.7 — Create starter automation: daily CI-failure triage
  - Prompt: "Read yesterday's CI failures from `.agents/state/ci-log.json` (or GitHub Actions API via MCP), summarize root causes, write findings to triage inbox"
  - Cadence: daily (cron `0 9 * * *` or GitHub Actions schedule)
  - Skill: none (direct prompt; uses @reader for CI log reads, @writer for triage file writes)
  - Environment: background worktree (does not touch local checkout)
  - This is the ONE automation that ships in v2.1. More can be added, but each must clear the same gating as a new persona (Gate A: 3+ community requests, or Gate B: documented token cost analysis)
- [ ] F6.8 — Integrate with Phase 2 hooks for scheduling
  - `Stop` hook (`stop:session-end`) can trigger `automation.js run-all --due`
  - GitHub Actions workflow template in `.agents/templates/github-actions/vespyr-automation.yml` for cloud-side scheduling
  - Document both paths in `automation/SKILL.md`

## F6.9-F6.10 — Loop state (on-disk memory)

**Source:** Osmani "Loop Engineering" §State | **Theme:** T7

The model forgets between runs. The repo doesn't. Loop state lives on disk so tomorrow's run picks up where today stopped.

- [ ] F6.9 — Create `.agents/state/loop-state.json` schema:
  ```json
  {
    "active_goal": { "condition": "...", "iteration": 3, "last_failure": "...", "started_at": "...", "status": "paused|running|done" },
    "automation_runs": [{ "id": "...", "last_run": "...", "findings": 2, "archived": 0 }],
    "worktrees": [{ "branch": "...", "path": "...", "agent": "...", "created_at": "..." }]
  }
  ```
  Read/written by `goal_check.js`, `automation.js`, and `worktree.js` (Phase 0 T7.1b). Committed to repo (not gitignored) so runs are resumable across machines.
- [ ] F6.10 — Update `memory-controller.md`: add Step 0.5 "Load loop-state.json" (before full 3-tier load). If `active_goal.status === "paused"`, surface to the user: "You have a paused /goal: <condition> at iteration <N>. Resume?" If `automation_runs` has overdue entries, surface: "Automation <name> is due."

---

## F6.11-F6.12 — Satisfaction-aware loops

**Source:** `14-utter-satisfaction-dna.md` | **Theme:** T8

Loops must distinguish "the verification command passed" from "the shared
outcome is ready to hand off or ship." The separate verifier validates the
technical condition; active domain agents validate the broader result.

- [ ] **F6.11** — Extend `/goal` state with `satisfaction_state`,
  `evidence_refs`, `feedback_cycles`, `blocking_issues`, and
  `revalidation_required`. A release-affecting goal reaches `DONE` only when
  `@goal-verifier` returns `DONE` and the T8 gate is `SATISFIED`.
- [ ] **F6.12** — Extend automation output with an owner, affected agents,
  evidence, and next review state. Automations may discover and triage work but
  may never mark a release `SATISFIED`, auto-merge code, or close a blocker.

The loop still has a hard iteration limit. If the goal passes technically but a
domain agent returns `CHANGES REQUESTED` or `BLOCKED`, the loop records the
disagreement and routes it to the owner or escalation authority.

---

## Done when

- [ ] **PoC complete:** `loop-engineering-poc.md` filed with results from 3 manual `/goal` runs and 1 manual automation run
- [ ] `vespyr goal "npm test && npm run lint"` runs iterations, invokes @goal-verifier, and stops when the condition passes
- [ ] @goal-verifier returns `DONE` or `NOT-DONE: <reason>` — never grades the maker's code, only the verification output
- [ ] `vespyr goal status` shows current iteration, last failure, and next action
- [ ] `vespyr goal resume` continues a paused goal from loop-state.json
- [ ] Max 10 iterations per `/goal` (configurable via `VESPYR_GOAL_MAX_ITERATIONS`) — hard stop, no infinite loops
- [ ] `automation.js create` registers an automation in `automations.json`
- [ ] `automation.js run <id>` executes the automation and writes findings to `artifacts/output/01-discovery/triage/`
- [ ] The starter automation (CI-failure triage) runs and produces a triage file
- [ ] `loop-state.json` persists goal + automation state across sessions
- [ ] `memory-controller` surfaces paused goals and overdue automations on session start
- [ ] Release-affecting goals require both verifier `DONE` and T8 `SATISFIED`; automation output cannot fabricate approval

## Risks

- **Token cost runaway.** A `/goal` with 10 iterations × full swarm context is expensive. Mitigation: hard iteration limit (10, configurable), `goal_check.js` runs only the verification command (not full agent context), @goal-verifier is a narrow read-only sub-agent (~80 lines, minimal context). Automations start with ONE task; each new automation must clear the persona gating (Gate A or B).
- **The verifier rubber-stamps.** The separate verifier model is the whole point — if it's too lenient, the loop lies about "done." Mitigation: @goal-verifier reads ONLY the verification command output, not the maker's code or reasoning. It can't be talked into "done" by the maker. If the verification command exits non-zero, the verifier MUST return `NOT-DONE`.
- **Comprehension debt accelerates.** The faster the loop ships code the user didn't write, the wider the gap. Mitigation: `/goal` writes a report at the end (what changed, what passed, what to review). Automations write to a triage inbox for human review — they do not auto-merge. The loop surfaces work; the human reviews it. This is the article's own warning, not a new one.
- **Cognitive surrender.** "The loop runs itself" is tempting. The user stops having opinions. Mitigation: `/goal` requires a verifiable condition (forces the user to define "done" upfront). Automations require a human review gate before any code modification. The loop is a tool, not an autopilot.
- **Worktree sprawl.** Orphaned worktrees accumulate. Mitigation: `worktree.js clean-all` (Phase 0 T7.1b) + `stop:session-end` hook (Phase 2 F2.2) can auto-clean stale worktrees. `loop-state.json` tracks active worktrees.
- **Automations run all 21 agents.** This is the expensive failure mode. Mitigation: each automation invokes ONE skill or ONE agent. No automation spawns the full swarm. The starter automation uses @reader + @writer only.
- **A passing command is mistaken for team satisfaction.** Keep technical verification and domain sign-off separate; require the T8 state/evidence record before any release-affecting loop can finish.

### Rollback plan

If Phase 6 breaks:
- **`/goal` primitive:** `goal_check.js clear` resets the active goal. Delete `loop-state.json` to fully reset. The `/goal` skill is standalone — removing it doesn't affect any other skill.
- **Automations:** `automation.js archive <id>` archives any automation's findings. Delete `.agents/state/automations.json` to remove all automations. The starter automation (CI-failure triage) is the only one that ships; if it causes issues, delete it.
- **Loop state:** `loop-state.json` is committed to the repo. If it becomes corrupted, delete it — goals and automations reset, but no data is lost (triage files remain on disk).

## Handoff to Phase 3

- `/goal` is the run-until-done primitive; automations are the heartbeat.
- Both depend on Phase 2 hooks (for scheduling) and Phase 0 T7.1b worktree tooling (for isolation).
- Loop state is on disk, resumable across sessions and machines.
- The maker/checker split now applies to: (a) code review (existing), (b) QA gate (Phase 2), (c) stop-condition verification (this phase).
- The loop surfaces work for human review. It does not replace the human. This is the article's own conclusion, and Vespyr's existing "Think Before Acting" guardrail.
- Release-affecting loops also preserve the T8 team gate and cannot auto-approve unresolved domain feedback.

## What this phase does NOT do

- **No auto-merge.** Automations and `/goal` surface work; they do not merge PRs or advance the pipeline without human review. The QA hard gate (Phase 2 F2.23) still applies.
- **No full-swarm cron.** Each automation invokes one skill or one agent. The 21-agent swarm is not put on a schedule. That's the expensive, dangerous version of this idea.
- **No auto-promotion of loop output to memory.** Loop findings land in the triage inbox. Promoting them to `active-decisions.md` or `lessons-learned.md` is a human action (or a @memory-controller action with explicit user confirmation).
- **No 35-harness automation port.** Automations run via hooks (Phase 2) or GitHub Actions. Per-harness cron adapters are out of scope. The harness's native scheduling is the scheduler.
