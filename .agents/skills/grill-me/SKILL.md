---
name: grill-me
description: Relentless Socratic stress-test interview that uncovers truth and surfaces unseen risks in ANY plan, design, program, strategy, or decision — software or not. Runs an eight-move interrogation frame with dynamic ordering and auditable coverage. Use when you want to be grilled on anything before committing.
metadata:
  version: "3.0"
  last_updated: "2026-08-24"
---

# Grill-Me — Universal Socratic Stress-Test

## What this skill does

Runs a relentless Socratic interview over any plan, design, program, strategy, or decision — code or curriculum, product or policy. Eight interrogation moves guarantee nothing load-bearing goes unexamined; dynamic conversation order keeps the interview humane. Every move ends explicitly dispositioned in a decision log that survives the session.

**Operating model: rigid about coverage, flexible about conversation.** The frame is a checklist the interviewer clears — not a script the user endures.

## When to use

- User says "grill me on this …" — a plan, architecture, spec, training program, business idea, hiring decision, migration, launch, policy
- Before `/validate-idea` exits the loop phase
- Before any ADR is written (forces decisions to be explicit)
- After `/design` produces a PRD (sanity check before `/develop`)
- Before committing budget, headcount, or calendar to any non-software program

## When NOT to use

- For open-ended brainstorming (use `/validate-idea` first)
- For technical debugging (use `/incident` instead)
- For retrospective analysis (use `/retro` instead)

## Prerequisites

- A concrete artifact to interrogate (plan, spec, architecture, hypothesis, design, curriculum, proposal)
- Its **ground-truth material** — for software: the actual codebase; for anything else: existing documents, data, metrics, prior attempts, audience information. If none exists, ask for the closest thing before starting; a grill without ground truth is opinions trading punches.

## The eight moves

Each move is an interrogation **function**, not an engineering artifact. The software probes below are the default worked example — before interviewing, instantiate every move in the subject's own terms (Step 0).

| # | Move | Function | Default probes (software) |
|---|---|---|---|
| 1 | **Premise & Purpose** | Is the underlying need real — measured or assumed? Is this an XY distraction? | *"If the user couldn't use this feature at all, what would they do instead?"* · *"Real pain point or hypothetical?"* · *"What's the underlying problem the stated solution masks?"* |
| 2 | **Mechanism & Structure** | How exactly does this cause the outcome? Where are the seams and boundaries? | *"If we ripped this out in 6 months, how painful?"* · *"Does this reach across a layer it shouldn't know about?"* · *"Which alternative did you reject, and why specifically?"* |
| 3 | **State & Consistency** | What must stay true throughout — and where can it corrupt? | *"What becomes inconsistent if this crashes midway?"* · *"What invariant must hold after every operation, and what restores it?"* · *"Which data-shape/timing/ordering assumption is still unverified?"* |
| 4 | **Consequences & Second-Order Effects** | What else moves when this moves? | *"Which 3 places have the highest blast radius — dependents checked?"* · *"What happens when the dependency is down 30 min? A day?"* · *"What existing behavior changes — intentionally or accidentally?"* |
| 5 | **Adversarial & Exposure** | What can attack, game, abuse, or leak through this? | *"Where does untrusted input enter — every path escaped/parameterized?"* · *"What secrets/PII could reach logs, errors, responses?"* · *"What's the auth check on every action — including 'internal-only' ones?"* |
| 6 | **Failure & Recovery** | When it breaks mid-flight, what then? | *"How would we know it's going badly before users tell us?"* · *"Is there a retry/idempotency story — or can retries duplicate effects?"* · *"Crash mid-operation: clean resume, manual repair, or corruption?"* |
| 7 | **Cost & Sustainability** | Marginal cost at 10x and 100x — sustainable? | *"Cost per unit/request/user at 100x volume?"* · *"What ongoing maintenance burden does this create?"* · *"If this lands 3x late, what's cut first?"* |
| 8 | **Reduction & Scope Lock** | Can 80% of the value ship in a day? Who actually asked for the rest? | *"Smallest increment that still delivers value — and how long?"* · *"Which part is speculative just-in-case engineering — who requested it?"* · *"What metric proves it was worth building?"* |

### Worked instantiation — a training program (non-software)

| Move | Instantiated question |
|---|---|
| 1 Premise & Purpose | Is the skills gap measured, or assumed? Who says training solves it rather than better tooling or hiring? |
| 2 Mechanism & Structure | Does this module sequence actually *cause* retention — or just attendance? |
| 3 State & Consistency | Which prerequisite chains break when a learner misses a week? |
| 4 Consequences | What workload lands on learners' teams? What expectations do managers raise post-certification? |
| 5 Adversarial & Exposure | How does assessment gaming, proxy attendance, or content leakage manifest — and what detects it? |
| 6 Failure & Recovery | The instructor drops out; a cohort falls three weeks behind. What's the recovery path? |
| 7 Cost & Sustainability | Per-learner marginal cost — does quality survive a 10x cohort? |
| 8 Reduction & Scope Lock | Would a 1-day workshop plus a reference doc deliver 80% of the outcome? |

## Workflow

### Step 0: Subject framing (mandatory — no questions before this is done)

1. Identify the subject type and stakes (reversible? who is exposed?)
2. Gather the ground-truth material and **explore it before asking anything** — code for software, materials/data/prior attempts otherwise
3. Instantiate all eight moves in the subject's own terms — one line each — and write them into the decision-log header. *You cannot silently skip a move you were forced to instantiate first.*
4. Ask the user: *"What worries you most about this?"* — their answer opens the interview and is diagnostic data in itself

### Step 1: Order selection

Open at the user's hottest concern (it maps to one of the eight moves). Then steer toward the highest-risk moves still unexamined. **Sequence follows the conversation; coverage never does.**

### Step 2: Question loop

For each open question in the active move:
1. Ask the question, ONE at a time
2. Provide your recommended answer with reasoning
3. Wait for the user's response (recommend / counter / refine)
4. Update the running decision log

**Proportional depth:** a low-stakes move closes in ONE honest exchange. High-stakes moves get the full drill. Depth is set by blast radius, not by remaining curiosity.

**Stop asking in a move when:** resolved, or the user says "move on."

### Step 3: Decision log + disposition ledger

After each resolved question, write to `artifacts/memory/active-decisions.md`:

```
## AD-YYYY-MM-DD — <move> — <decision title>

**Decision:** <the resolved choice, one line>

**Rationale:**
- <key trade-off that was weighed>
- <what was rejected and why>

**Status:** <Open | Complete>
```

One entry per resolved question. Keep entries terse — the log is read back in Step 4.

**Disposition ledger (coverage contract):** the log header lists all eight moves, each ending in exactly one state:
- **EXAMINED (n questions)** — probed and resolved
- **SKIPPED — reason** — e.g., *"SKIPPED — subject has no external attack surface; internal-only material"*

No third state exists. Skipping with a reason is knowledge; a silently dropped move is a blind spot that survives the session.

### Step 4: Cross-move consistency check

After all eight moves are dispositioned, scan the log for contradictions:
- Does a Mechanism conclusion contradict the Premise findings?
- Does a Failure & Recovery answer invalidate a Structure choice?
- Does Cost rule out something Consequences assumed?
- Did any Skipped move become load-bearing mid-interview?

If contradictions surface, present them and ask which move to revisit.

### Step 5: Lock + handoff

Append a summary block to `artifacts/output/{current-phase}/grill-me-decisions.md` with:
- Date
- Subject type + instantiation table (or link to it)
- Disposition ledger: examined/skipped counts with skip reasons
- Number of decisions resolved
- Cross-move contradictions found
- Handoff recommendation (e.g., "ready for /design", "ready to author syllabus", "needs /validate-idea first")

> **Path note:** `{current-phase}` maps to the active phase directory under `artifacts/output/`. If unknown, fall back to `artifacts/memory/grill-me-decisions.md`.

## Output artifacts

- `artifacts/memory/active-decisions.md` (running decision log + disposition ledger)
- `artifacts/output/{current-phase}/grill-me-decisions.md` (final summary)

## State machine integration

At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact grill-me-decisions.md`

## Anti-patterns to avoid

- **Do not recite the moves in fixed order like a checklist.** Rigidity belongs in the coverage ledger, not the room.
- **Do not let a move die silently.** Unasked ≠ skipped. A skip needs a logged reason or it hasn't happened.
- **Do not ask multiple questions at once.** The interview loses depth if you bundle.
- **Do not recommend the user's first answer uncritically.** *"That's interesting — what if the opposite is true?"* beats "yes, that works."
- **Do not soften a probe to keep the mood warm.** The DNA applies double here: the interviewer's job is the uncomfortable question.
- **Do not grill without ground truth.** No material, no interview — go collect it first.
