# Validation Brief: {one-sentence summary}

> **Used by:** `validate-idea` skill
> **Feeds into:** `explore-idea`
> **Save to:** `artifacts/output/01-discovery/validation-brief.md`

---

## Context

- **Mode:** {startup | company | personal}
- **Maturity:** {greenfield | brownfield}
- **Questions asked:** {Q1, Q2, Q4 … — the set this run's routing actually covered}
- **Not asked, and why:** {Q1 — brownfield substitute used: usage/churn/support data | none}

---

## Problem statement

{One sentence. What's broken and who is affected — in concrete terms, not categories.}

---

## Proposed solution

{One sentence. What is being built, in plain language. If the run entered problem-first from `/unpack-problem`, carry the selected concept across from `problem-space-brief.md`.}

---

## Value proposition

> "For [specific user], [product] replaces [status quo workaround] by [narrowest wedge], which matters because [future-fit thesis]."

{The refined value statement from step-05a (create) or step-04c (validate) — this is the anchor for all downstream agents. Do not use the original rough hypothesis here.}

---

## Demand evidence (Q1)

{Specific behaviors, quotes, payments — or "not yet validated". Be precise: someone who'd be upset if this disappeared tomorrow, not someone who said "sounds interesting."}

---

## Status quo (Q2)

{What people do today to solve this, even badly. Include time cost, dollar cost, or tools duct-taped together.}

---

## Target user (Q3)

{Name, role, company, consequence — as specific as possible. "Marketing teams" is a filter, not a person.}

---

## Narrowest wedge (Q4)

{The smallest version someone would use this week — not after the full platform is built. One workflow. One feature. Something shippable in days.}

---

## Observation (Q5)

{What surprised you about user behavior during any direct observation — or "no direct observation yet". Something that contradicted your assumptions is the strongest signal.}

---

## Future-fit thesis (Q6)

{Why this problem becomes more urgent in 3 years. A specific thesis about how the world changes — not "the market is growing."}

---

## Scope & team reality check (Q7)

> *Optional — answer if relevant to avoid over-scoping early.*

- **Assumed team size:** {solo / small team / org}
- **Assumed timeline to narrowest wedge:** {days / weeks / months}
- **Budget or resource constraints:** {any known limits}
- **Does the scope match the team?** {yes / no — if no, note the gap}

---

## Premises

{3-5 statements that must be true for this to work, agreed during the step-05a premise challenge. Note any where the user disagreed.}

1. [statement] — {agreed | disagreed: reason}
2. [statement] — {agreed | disagreed: reason}
3. [statement] — {agreed | disagreed: reason}

---

## Framework scores

{One row per framework applied in step-05a. Cite the answer that earned the score, not the framework name.}

| Framework | Score | Evidence it scored on |
|-----------|-------|----------------------|
| {Golden Circle / Pre-mortem / First Principles / Moat / Unit Economics / Market Timing / Dependency Stack} | [GO] / [RESHAPE] / [NO-GO] | {the specific answer} |

---

## Alternatives considered

| Approach | Effort | Ships in | Risk | Why considered | Why rejected / chosen |
|----------|--------|----------|------|----------------|-----------------------|
| A: {name} | S/M/L/XL | {timeframe} | Low/Med/High | ... | ... |
| B: {name} | S/M/L/XL | {timeframe} | Low/Med/High | ... | ... |
| C: {name} (optional) | S/M/L/XL | {timeframe} | Low/Med/High | ... | ... |

**Chosen direction:** {which approach and why}

---

## Verdict

**{[GO] / [RESHAPE] / [NO-GO]}** — {rationale in 2-3 sentences. Be direct. Don't soften a NO-GO.}

**When:** {NOW | GATED — the named checkable condition, its owner, and its number | NEXT-CYCLE}

Required on `[GO]` — a `[GO]` without a `When:` axis is an illegal verdict. `[RESHAPE]` implies `NOW` and `[NO-GO]` implies `NEVER`; do not restate them.

---

## Next action

{One concrete real-world step — not "go research this." Example: "Interview 5 ops managers at mid-size logistics companies about their current scheduling workflow before any market sizing."}

---

## Open questions for exploration

{What the research pipeline must answer. Each question should be specific enough that a researcher knows when they've answered it. These feed directly into `explore-idea`.}

| Question | Why it matters | Researcher |
|----------|---------------|------------|
| ... | ... | @researcher / @user-researcher |

---

**Document info:**
- Author: @founder
- Date: {date}
- Status: {Draft | [GO] for exploration | [RESHAPE] pending | [NO-GO]}
