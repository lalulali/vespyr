---
name: validation-patterns
description: Apply validation methods from a 30-method catalog — smoke tests, concierge MVPs, five-second tests, and more. Use when the user says "how should I validate this", "cheapest way to test demand", "run a smoke test on my concept", or invokes /validation-patterns before committing engineering resources.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Validation Patterns — Method Selection & Execution

## What this skill does

Searches the 30-method validation catalog (`methods.csv`) and applies the best-fit validation pattern to test a product hypothesis before building. Covers smoke tests, concierge MVPs, customer discovery interviews, A/B test design, and more.

## Persona delegation

This skill delegates to `@founder`. The founder selects and executes the validation method. The skill file provides the method catalog and selection logic; `@founder` provides the GO/RESHAPE/NO-GO judgment, challenge stance, and decision logging.

## When to use

- "How should I validate this idea?"
- "What's the cheapest way to test demand?"
- "Run a smoke test on my concept"
- Pre-build validation before committing engineering resources

## Workflow

### Step 1: Understand the hypothesis

Ask the user: what are you trying to validate? What's the hypothesis? What would count as validation vs. invalidation?

### Step 2: Select method

Run:

```bash
node .agents/scripts/match_methods.js --source validation --context "{user's hypothesis}"
```

Return the top 3-5 matching methods with relevance scores. Recommend the best one with reasoning. Let the user choose or accept the recommendation.

### Step 3: Design the validation

Load the selected method from `methods.csv`. Design the validation:
- Define the test (what will you do?)
- Define the signal (what result validates the hypothesis?)
- Define the duration and sample size
- Identify confounds and edge cases

### Step 4: Execute and record

Guide the user through execution. Record results:

```
@memory-controller write active-decisions.md
### [VALIDATION] {method name} — {hypothesis} [date: YYYY-MM-DD] [agent: @founder]
{method used, test design, results, verdict}
**Status:** active
```

## Output artifacts

- Validation design and results written to `artifacts/memory/active-decisions.md`
- If the validation produces a structured output (survey results, A/B data), write to `artifacts/output/02-research/validation-results.md`

## Done when — checked mechanically

This skill ships a catalog and a `match_methods.js`, and **no gate of any kind** — no Decision Gate
step, no gate script, and nothing checks the verdict `@founder` is said to provide. The record format
below is the entire artifact contract, and it is written from five lines of prose with no template.

```bash
node .agents/scripts/validation_record_check.js check \
  --file artifacts/output/02-research/validation-results.md --json
```

**The gate applies to a structured validation record, and that file is optional.** Step 4 writes the
result to `active-decisions.md`; `validation-results.md` is produced only when the validation yields
structured output (survey results, A/B data). This section used to invoke the gate against that path
unconditionally, so a memory-only run — which followed every step — was told a required deliverable was
missing. If there is no structured output, there is no record to check and the gate does not apply;
say so in the memory entry rather than creating an empty file to satisfy a checker.

| Rule | What is checked |
|---|---|
| **Record hygiene** | no unfilled template placeholders; a date in the declared `[date: YYYY-MM-DD]` form |
| **Hypothesis** | stated, and substantive — the record format is `[VALIDATION] {method} — {hypothesis}`, and a validation with no hypothesis has no signal either |
| **Method exists** | exactly one of the 30 in `methods.csv`. Exact, not substring: "Concierge MVP Extreme" is not a method |
| **The signal, BOTH directions** | what validates **and** what invalidates. See below |
| **A measure** | a duration or sample size containing a number — a signal without a denominator is not measurable |
| **A confound** | at least one named confound, alternative explanation or edge case |
| **Verdict** | present, and from the declared `GO` / `RESHAPE` / `NO-GO` set |

### The signal is the centrepiece

Step 3 says *"define the signal (what result validates the hypothesis?)"* and nothing ever checked it
— so the cheapest passing record defined success and stopped. Measured against a record that did
exactly that:

> *"This validates the hypothesis if the click rate exceeds 15%. Demand exists… and we proceed to
> build the concierge flow."*

→ **3 failures**: no invalidation condition, no measure, no confound. A test that cannot fail is not a
test, and a verdict reached by one is not a judgement — it is a preference. This is the same defect
family as `research-plan`'s `{goal} — falsifiable? Yes/No`, and it is the reason this gate exists.

### What this gate does not check

Whether the test is a good test, whether the signal is the right signal, whether the confounds were
the right confounds, or whether the verdict is correct. Those need a researcher. It stops a validation
that was never designed from reading as one that was.

### Record template

```markdown
@memory-controller write active-decisions.md
### [VALIDATION] {method} — {hypothesis} [date: YYYY-MM-DD] [agent: @founder]

**Hypothesis:** {the claim, in enough detail that a result could contradict it}

**Method used:** {one of the 30 method_name values in methods.csv}.
Test: {what you will actually do, with whom, over how long}

**Signal.** This validates the hypothesis if {measurable result}. It invalidates the hypothesis if
{the result that would make you stop} — in which case we are wrong about {what} and should not build.

**Confounds.** {what else could explain the same result; selection bias; seasonal; promo; sample
already engaged}

**Verdict:** `[GO|RESHAPE|NO-GO]` — {the plain reason}

**Status:** active
```

Exit 0 conformant · 1 failures · 2 usage/IO error, fail-closed.

## State machine integration

At start: run `node .agents/scripts/orchestrator_state.js status`
At end: run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact validation-results`

## Handoff

- Hypothesis validated → load `/shape-up` or `/design`
- Hypothesis invalidated → load `/validate-idea` (re-scope)
- Need more research → load `/explore-idea`
