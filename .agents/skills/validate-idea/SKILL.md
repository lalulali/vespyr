---
name: validate-idea
description: Socratic GO/RESHAPE/NO-GO stress-test for a product concept, feature idea, or pitch before any research or engineering spend. Use when the user says "validate this idea", "stress-test my idea", "poke holes in this concept", "is this idea worth building", "should I build this", "validate my startup idea", "sanity-check my feature idea", or invokes /validate-idea — including brownfield feature ideas and problem-first entries from /unpack-problem. Emits a validation brief with behavioral demand evidence, quantified status-quo cost, framework scores, and one bracketed Decision-Gate verdict. Do NOT use for market/competitor evidence (/explore-idea), raw-note structuring (/shape-up), problem discovery with no solution yet (/unpack-problem), idea generation (/brainstorming), or a single-claim interrogation (/grill-me).
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
---
# Validate Idea

<!-- router-skill -->

## Harness adherence (non-negotiable)
- Follow the step sequence for the selected mode exactly. Do NOT skip steps or reorder them.
- Each step file is a contract. Read it fully before executing. Step files override general guidelines.
- Mode detection is automatic. The router decides create/edit/validate. Do NOT ask the user which mode unless the intent is genuinely ambiguous.

## Mode selection

**Explicit user intent always wins over file presence.** If the user says "stress-test this fresh
idea" while a stale brief sits on disk, that is create mode — say so and proceed. File presence is
a *default*, not a veto.

| Mode | Trigger | Sentinel |
|---|---|---|
| **Create** | No `validation-brief.md` exists, or the user brought a new/foreign idea | `artifacts/output/01-discovery/validation-brief.md` absent |
| **Edit** | `validation-brief.md` exists **and** the user wants to refine it | brief present + refine intent |
| **Validate** | `validation-brief.md` exists **and** the user wants to stress-test it question-by-question | brief present + interrogate intent |

**Only `validation-brief.md` is a mode sentinel.** `idea-brief.md` is an *entry input*, never a
sentinel: it is written by create mode's skip-to-exploration path and by `explore-idea`, so keying
mode detection on it makes create mode unreachable after the first run — a one-way lock into
edit/validate. Do not repeat that mistake.

**Problem-first entry:** `artifacts/output/02-research/problem-space-brief.md` from `/unpack-problem`
is accepted as the idea to validate. It routes to **create mode** with the problem brief's selected
solution concept as the framed idea (see `steps/step-03a-idea-framing.md`) — it never routes to edit
or validate, even if a `validation-brief.md` also exists. The problem brief is the newer artifact and
wins; say which one you adopted.

If intent is genuinely ambiguous, ask: "Are you starting a new idea, refining an existing brief, or stress-testing it?"

## Mode routing + steps
**Step 0 — Scope Gate (non-skippable):** anchor scope first via `steps/step-00-scope-and-decision-anchoring.md`; the selected mode is the locked track. `step_tracker.js` exits 1 if Step 1 begins without a locked track.
Intent triage at gate: Clear (C ≥ 0.85) runs the locked track; Ambiguous (0.50–0.85) halts to a 2–3 Track Fork; Trivial (C < 0.50) executes directly. Gate enforced in all `step_tracking` modes including `off` (DNA 4).

- **Create** (7 steps) → `steps/step-01a-session-setup.md` → `steps/step-02a-input-analysis.md` → `steps/step-03a-idea-framing.md` → `steps/step-04a-stress-test-r1.md` → `steps/step-05a-stress-test-r2.md` → `steps/step-06a-go-pivot-kill.md` → `steps/step-07a-handoff.md`
- **Edit** (5 steps) → `steps/step-01b-load-existing.md` → `steps/step-02b-identify-gaps.md` → `steps/step-03b-revise.md` → `steps/step-04b-stress-test.md` → `steps/step-05b-finalize.md`
- **Validate** (5 steps) → `steps/step-01c-open-questions.md` → `steps/step-02c-7-branches.md` → `steps/step-03c-cross-branch-check.md` → `steps/step-04c-decision-log.md` → `steps/step-05c-lock-handoff.md`

## When to invoke
- The user has a concept, pitch, or feature idea that nobody has stress-tested, and wants it challenged before research or engineering time is committed
- The user says "stress-test this idea", "poke holes in this", "validate this concept", or invokes `/validate-idea`
- A brief already exists and the user wants it refined (edit mode) or interrogated question-by-question (validate mode)
- A `problem-space-brief.md` from `/unpack-problem` needs its selected solution concept validated (problem-first entry, create mode)

## When NOT to invoke
- The user has a *problem*, not an idea — use `/unpack-problem`; there is nothing to validate yet
- The concept has already passed validation and the ask is market evidence — use `/explore-idea`
- The ask is to structure raw notes into a brief — use `/shape-up`
- The ask is to *generate* concepts, not test one — use `/brainstorming`
- The ask is to *interrogate one claim* (this premise, this architecture bet, this estimate) rather
  than judge a whole concept — use `/grill-me`. A panel is cheaper than a wrong GO.
- The ask is how to *run* a validation experiment (smoke test, concierge MVP, landing page) after
  the concept is already validated — use `/validation-patterns`
- Multi-stakeholder or irreversible concepts where a solo Socratic pass is not enough seats — the
  7-branch validate mode is a *single-agent* review; escalate to `/round-table` for genuine
  opposition between personas

## Prerequisites
- Create mode: none (this is the entry point)
- Edit mode: `artifacts/output/01-discovery/validation-brief.md` exists
- Validate mode: `artifacts/output/01-discovery/validation-brief.md` exists
- `idea-brief.md` is an accepted **entry input** in edit/validate mode when no `validation-brief.md`
  exists yet (read-only — never write to it; see Mode selection on why it is not a sentinel)
- Problem-first entry: `artifacts/output/02-research/problem-space-brief.md` from `/unpack-problem` is accepted as the idea to validate — routes to create mode

## Halt conditions
- `[NO-GO]` verdict issued (create mode) — the autopsy and a route back to problem discovery are the whole output; no build steps
- **Scope-dispute arbitration:** PM vs. tech-lead scope conflicts escalate to `@founder` per `.agents/workflow.md` §3.2 Escalation Ladder Level 3 (binding).
- Cross-branch contradiction unresolved (validate mode)
- Revision-round limits without convergence (edit mode): per-section rounds per `steps/step-03b-revise.md`, stress-test resolution rounds per `steps/step-04b-stress-test.md`

## Anti-sycophancy gate (SPC)
If the user's answers across a stress-test round are uniformly positive — every push lands a confident answer, no red flags surface, no assumption cracks — do not proceed to the next round or verdict on momentum. Inject one adversarial question built from the strongest counter-hypothesis the answers imply (e.g., "Everything you've said says this should already exist — why doesn't it?"). If the answer survives, record it as validated evidence; if it cracks, that crack is the finding. A stress-test with zero friction has tested nothing. The step files apply this gate at their checkpoints (step-04a, step-04b, step-05a).

**Emit the marker.** Every round that survives the gate records one machine-readable line, so a
zero-friction round is visible in the transcript instead of hiding in prose:

```
[SPC: <one-line adversarial probe> → <survived | cracked: what gave>]
```

A round that closes with no `[SPC:]` line and no red flag is an unexamined round. Coverage is
exercised by `evals/suites/invariants/validate-idea-no-go.json`.

## Session durability (long Socratic sessions)

Create mode can span 7 rounds and dozens of answers. Nothing is written to disk until `step-07a`,
so a crash, a context truncation, or an abandoned session loses every answer. Checkpoint as you go:

- **After each round** (end of `step-04a`, `step-05a`), append the answers gathered so far to
  `artifacts/output/01-discovery/validation-brief.md` under a `## Diagnostic log (in progress)`
  heading. Say plainly that the brief is incomplete.
- **On abandon or interruption** — user says stop, goes quiet, or the session ends without a
  verdict — the in-progress brief plus the Q1–Q7 coverage table (unasked questions dispositioned
  `DEFERRED` + owner + revisit trigger) is the deliverable. Persist it and tell the user where it
  is. A partial brief with honest coverage beats a complete brief invented from summary.
- Never issue a verdict from a truncated answer set. Missing evidence makes a criterion `PARTIAL`,
  which forces `[RESHAPE]` (see `steps/step-06a-go-pivot-kill.md`).

## State machine integration
At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/validation-brief.md`

## Memory integration
**At start:** Load founder context before any Socratic analysis:
```
@memory-controller load founder [validate-idea — {idea name}]
```

**At completion:** Write verdict and rationale to memory, then session summary — mandatory:
```
@memory-controller write active-decisions.md
### [PRODUCT] Idea validation verdict — {idea name} [date: YYYY-MM-DD] [agent: @founder]
Verdict: [GO] When: <NOW|GATED|NEXT-CYCLE> | [RESHAPE] | [NO-GO]
Survived: everything | the need, not the mechanism | nothing
Rationale: {1-2 sentences on why, in plain language}
Key assumptions validated: {list}
**Status:** active

@memory-controller session-write [agent: @founder]
Worked on: Idea validation — {idea name}
Decisions: {plain sentence: build this / keep the why replace the how / don't build this} — [GO|RESHAPE|NO-GO]. {key rationale}
Next step: {explore-idea if [GO], re-run validate-idea if [RESHAPE], unpack-problem if [NO-GO]}
Blockers: {unresolved assumptions or "none"}
```

Verdict tokens stay bracketed in memory too — a bare `Verdict: NO-GO` is unparseable downstream.

## Output artifacts

Full paths, so `step_tracker.js audit` can decide whether this skill ran untracked:

- `artifacts/output/01-discovery/validation-brief.md` — create mode (canonical)
- `artifacts/output/01-discovery/shaped-brief.md` — when entered from `/shape-up`
- `artifacts/output/01-discovery/idea-brief.md` — brownfield/edit mode **only**; never a
  create-mode output (writing it would poison mode detection on the next run)

This section exists because `audit --all` cross-checks declared artifact paths against
`step-audit.json`. Without it, a skill with zero step records and artifacts on disk is
indistinguishable from one that never ran — and this skill was measured at 18 step files and
**zero** records, which nothing reported.

## Done when
- Brief written to `artifacts/output/01-discovery/validation-brief.md` following
  `.agents/templates/discovery/validation-brief-template.md` (canonical output — see
  `steps/step-07a-handoff.md`). **`idea-brief.md` is never a create-mode output** — writing it
  would poison mode detection on the next run.
- Every Q1–Q7 question carries a terminal state (`COVERED` / `DEFERRED` / `REJECTED` / `OUT-OF-SCOPE`) — no blanks
- The brief (the **document** surface) ends with the plain sentence and one bracketed verdict card at the depth the stakes require; `Survived:`, plus `When:` on `[GO]` — format in `.agents/references/vespyr-dna.md` §Decision Gate
- The chat reply carried only the plain sentence, the consequence, and the next action — no token, no card field, no marker (`.agents/references/vespyr-dna.md` §Two surfaces)
- `[NO-GO]` → No-Go Autopsy emitted, alternatives omitted, next action routes to problem discovery
- Handoff to next phase is unambiguous
