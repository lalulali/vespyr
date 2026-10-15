---
name: grill-me
description: Relentless Socratic interview that turns a loose idea into decisions you can defend — any plan, design, program, strategy, or decision, software or not. Follows each thread until it holds or breaks. Use when you want to be grilled on anything before committing. Consult @ml-ai-engineer where eval design, judging rubrics, or benchmark interpretation are under review.
metadata:
  version: "6.0"
  last_updated: "2026-10-15"
---

# Grill-Me — Socratic Stress-Test

## What this skill does

Interviews you until you can commit to an idea. **It's a conversation, not an interview** — you own
the scope, the skill asks the questions, and the order follows your answers rather than a script.

**It is stateless.** It writes no files and leaves no workspace behind; the only result is a clearer
version of the idea, in your head. It needs no repo and does not assume the subject is software —
people use it for business calls, for writing, and for what to do next.

## When to use

- "Grill me on this …" — a plan, architecture, spec, training program, business idea, hiring decision, migration, launch, policy
- Before `/validate-idea` exits the loop phase
- Before any ADR is written (forces decisions to be explicit)
- After `/design` produces a PRD (sanity check before `/develop`)
- Before committing budget, headcount, or calendar to any non-software program

## When NOT to use

- For open-ended brainstorming — use `/validate-idea` first
- For technical debugging — use `/incident`
- For retrospective analysis — use `/retro`
- When you can already specify the thing precisely — you don't need to grill it
- When the ask is a critique of *text* rather than a judgement on an *idea* — use `/elicitation`

## Prerequisites

- A concrete artifact to interrogate (plan, spec, architecture, hypothesis, design, curriculum, proposal)
- Its **ground-truth material** — for software the actual codebase; otherwise existing documents, data,
  metrics, prior attempts, audience information. If none exists, ask for the closest thing first.
  **A grill without ground truth is opinions trading punches.**

## When invoked indirectly

Most of the triggers above are other skills. When one of those calls this skill, **do not ask "What
worries you most about this?"** — the caller has a specific question, so answer it. Do not open a
chooser. Hand the caller your findings and stop; the caller owns its own artifact.

## The stance

**Do not accept the first answer.** That is the whole mechanism. A perfect question list in the hands
of an agreeable interviewer produces shallow answers and a nod.

Follow each thread until it either **holds** or **breaks**:

- *"You said X — why X and not Y?"* then *"what would have to be true for Y to be better?"*
- *"What's the strongest argument against that?"* — and don't accept a strawman.
- *"You're confident. What would change your mind?"* — if nothing would, that is the finding.

Give your own recommended answer with reasoning each time, so there is something to push against.
**Depth is set by blast radius, not by remaining curiosity:** a low-stakes question closes in one
honest exchange, a load-bearing one gets the full drill.

**Before you close, read it back.** Scan what was said for contradictions — a later answer that
undercuts an earlier one, a cost that rules out something the design assumed, a question you skipped
that turned out to be load-bearing. **Surface them and make them resolve.** An interview that ends
with two answers that cannot both be true has not finished; it has stopped.

## The questions you will forget

An interviewer defaults to the happy path. These are the questions that get skipped — check them
before you close, and instantiate each in the subject's own terms rather than asking it verbatim.

| Question | Ask it as |
|---|---|
| **What must stay true?** | *"What invariant must hold after every operation — and what restores it if it doesn't?"* |
| **What else moves?** | *"What breaks elsewhere when this changes — has anyone checked the dependents?"* |
| **Who attacks it?** | *"Where does untrusted input enter, what could leak, and what's the check on the 'internal-only' path?"* |
| **How does it fail?** | *"Crash mid-operation: clean resume, manual repair, or corruption? Can a retry duplicate the effect?"* |
| **What does it cost at 100x?** | *"Marginal cost per unit at 100x volume — and what maintenance burden does this create?"* |
| **What can we cut?** | *"Smallest increment that still delivers value — and who actually asked for the rest?"* |
| **What does done mean?** | *"What metric moves, who declares it done, and what are we willing to sacrifice for it?"* |

**This list is not complete and is not meant to be.** If your subject has a risk that fits none of
these — legal, ethical, a person who will be upset — **name it and drill it with the same rigor.** The
list exists to catch what an agreeable interviewer skips, not to bound what may be asked.

**Worked instantiation — a training program** (not software, to show the questions travel). Each label
below stays on one line so the wrapping cannot hide one:
*What must stay true?* Prerequisite chains — a learner who misses week 2 can still pass week 4, or the sequence is decorative.
*What else moves?* Learners' teams absorb the workload; the instructor's other cohorts lose prep time.
*Who attacks it?* Assessment gaming and content leakage — and what detects either.
*How does it fail?* The instructor drops out mid-cohort: who finishes it, and does the cohort repeat or skip?
*What does it cost at 100x?* Per-learner marginal cost at ten cohorts, plus the instructor time each cohort permanently consumes.
*What can we cut?* A one-day workshop plus a reference doc, delivering 80% of the outcome.
*What does done mean?* Retention at 90 days, not attendance — and who signs off that it worked.

## Three boundaries

### Some questions cannot be answered by talking

*"One long form or three pages?"* and *"how should this interaction feel?"* are **ungrillable** — you
need something to react to. When you hit one, **stop grilling:** build the throwaway version, look at
it, come back and answer in one line. Sessions grow too long when you try to talk through an
ungrillable question, and **the scope grows with the uncertainty.**

### Count rounds, not questions

*"Forty-six questions across four rounds is an ordinary session."* Two hundred questions usually means
the **scope was too large** — break the work into smaller pieces and grill each. Very long sessions
also drift into the **dumb zone**, where the context window fills and the questions get worse. Length
is not thoroughness.

### Passivity — you can be the sycophant

> *"Answering 'agreed, agreed, agreed' for forty questions and coming out with a plan the agent wrote
> and you nodded at. It feels productive because it was long. But you decided nothing."*

There is no coverage count that proves you thought. So: push back on a question less detailed than you
need, say when the scope is drifting, and answer *"I don't know"* and mean it. An unanswerable question
is usually a signal to prototype, not to guess.

**It's working if** you disagree with something, later rounds build on earlier answers, you end
somewhere you didn't expect, and you could defend each choice to someone who wasn't there.

## Anti-patterns

- **Reciting the questions in fixed order.** They are a coverage check, not a script.
- **Accepting the first answer.** *"That's what you'd expect — what if the opposite is true?"* beats "yes, that works."
- **Asking multiple questions at once.** The interview loses depth if you bundle.
- **Softening a probe to keep the mood warm.** The DNA applies double here: the interviewer's job is the uncomfortable question.
- **Grilling without ground truth.** No material, no interview — go collect it first.
- **Grilling an ungrillable question.** If it needs something to react to, stop and prototype.
