---
step: 10
name: Completion
prerequisites:
  - step-09 completed
output_contract:
  citations: not-required
---

# Step 10 — Completion

Record completion, update state, and advance the phase.

## Goal
Finalize the development cycle: verify all completion criteria, write the state, and hand off to the next phase.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 10`
1. **Run the completion gate — this is not a checklist, it is a gate:**

   ```bash
   node .agents/scripts/develop_completion_check.js check --require-signoff --json
   ```

   **`--require-signoff` is mandatory.** Without it an absent sign-off is a *skip* and the gate
   reports `ok: true` with nothing on disk — correct for callers where development completion is
   not in scope, useless here. Reaching step 10 means the sign-off is in scope, so an absent file
   is a missing deliverable.

   It fails on: no bracketed verdict; `[NO-GO]`; `[GO]` with named conditions; `[GO]` with open
   findings; `[CONDITIONAL]` with no conditions, or a condition with no owner or no date; a
   citation to an artifact that does not exist; and a coverage report older than the newest
   source change.

   **Never weaken the gate to pass it.** Fix the sign-off. If a rule is genuinely wrong for this
   project, say so in the handoff rather than editing the rule.

2. Confirm all completion criteria are met:
   - All tasks in execution plan are complete
   - Code review passes with no blocking issues
   - QA validates all acceptance criteria pass (AC-H, AC-U, AC-E)
   - PM signs off on the feature
   - Documentation is updated
   - Security audit passes (if applicable — zero Critical/High)
   - Performance benchmarks within SLAs (if applicable)
3. Write final `stepsCompleted` to `artifacts/output/05-execution/develop-state.md`.
4. Run `node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 05-execution/{feature}.md`.
5. Run `node .agents/scripts/orchestrator_state.js next`.

   **Confirm it advanced — or record why it did not. Do not force it.** The phase advances only
   if the pipeline state was seeded by the earlier phases. A tree initialised fresh reports
   something like `Active phase: validation / Action needed: generate artifacts — idea-brief.md`,
   and `next` correctly does nothing. Running `advance` repeatedly to make the token true would
   walk the pipeline *backwards* through five phases to satisfy a sentence — a blind run refused
   and recorded the mismatch instead, which is the right call.

   If it did not advance, record the observed phase and the reason in `develop-state.md`.

## Memory closeout (mandatory per GUARDRAILS §Session Continuity)

1. `@memory-controller write lessons-learned.md` — capture patterns discovered, pitfalls encountered, bugs fixed during this cycle. Include `[DEV]` domain tag, date, and agent attribution.

2. `@memory-controller write active-decisions.md` — persist key architectural and process decisions made during development. Include `[ARCH]`, `[PLAN]`, or `[DEV]` domain tags.

3. `@memory-controller write blockers-and-risks.md` — log any unresolved blockers, known issues, or risks carried forward.

4. `@memory-controller session-write`:
   ```
   worked on: [feature implementation — {feature name}]
   decisions: [list up to 5 key decisions made during this cycle]
   next step: load launch skill or restart develop for next feature
   blockers: [list any unresolved blockers]
   ```

5. `@memory-controller status` — report memory file health.

## Handoff
- Feature ready to ship → load `launch` skill
- Need to build another feature → restart this skill
- Production incident → load `incident` skill

## Delegation
- **Memory:** @memory-controller for lessons, decisions, blockers, session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 10`
