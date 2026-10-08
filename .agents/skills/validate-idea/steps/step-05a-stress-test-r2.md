---
step: 5a
name: Stress-Test Round 2
mode: create
prerequisites:
  - step-04 completed
output_contract:
  citations: not-required
---

# Step 5 — Stress-Test Round 2

Second round: deeper questions, premise challenge, value synthesis, framework application.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 5`
## Q5: Observation
**Ask:** "Have you watched someone struggle with this problem? What surprised you?"

Push for: a specific surprise, something that contradicted assumptions.
Best signal: users doing something the product wasn't designed for — the real problem often lives there.
Red flags: "We sent a survey." "Nothing surprising."

## Q6: Future-fit
**Ask:** "In 3 years, does this problem become more urgent or less? Why?"

Push for: a specific thesis about how the world changes.
Red flags: "Market is growing 20%." "AI makes everything better."

## Q7: Scope & team reality check (optional)
When to ask: Startup/Company mode when the concept sounds large or team seems small.

**Ask:** "What team size and timeline are you assuming to ship the narrowest wedge? Does that match what similar products required?"

Push for: a concrete answer. Solo developer with a 2-week runway is fine — just name it. "We'll figure it out" is not a plan.

Red flags: assuming a 2-person team can ship what took Notion 3 years. Timelines that require everything to go right. No budget estimate for paid tools or infrastructure.

**Why it matters:** Scope mismatch is a silent killer. The idea may be valid but unbuildable at the assumed cost and team size — better to catch it here than after months of work.

## Value proposition synthesis
Distill the diagnostic into a clear value statement:

"For [specific user], [product] replaces [status quo workaround] by [narrowest wedge], which matters because [future-fit thesis]."

Present to user: "Based on what you've told me, here's what I think you're actually building: [value proposition]. Does this capture it?"

## Premise challenge
Challenge the foundations. Present 3-5 explicit premises that must hold for this to work:

```
PREMISES:
1. [statement] — agree/disagree?
2. [statement] — agree/disagree?
3. [statement] — agree/disagree?
```

Max 2 revision cycles on premises. If you can't agree, note disagreement in brief — an unresolved
premise is `PARTIAL`, not a pass, and it blocks `[GO]` in step 06.

Also ask:
- **What if this problem doesn't exist?** Could a different framing make this irrelevant?
- **What if we do nothing?** Is the pain real enough?
- **Steelman the opposition.** What's the strongest case AGAINST building this?

## Framework application

**Full definitions, red flags, and output shapes: `.agents/references/founder-frameworks.md`.**
Load it — do not work from memory and do not restate it here.

Apply **2–4** frameworks:
- **Golden Circle — MANDATORY.** A concept with no WHY is a feature, not an idea.
- **Pre-mortem — MANDATORY.** Forces concrete failure thinking before any investment.
- Then 0–2 more, chosen by what the idea actually risks: First Principles (buzzword-buried),
  Moat & Defensibility (feature-level concept), Unit Economics (revenue is central),
  Market Timing (depends on a recent shift), Dependency Stack (external APIs or behavior change),
  Opportunity Assessment Lens (scoring urgency + willingness to pay + distribution + defensibility
  over 18 months — a concept scoring high on none is a hobby, not a business).

Score each framework applied: 🟢 PASS / 🟡 WEAK / 🔴 FAIL, with the red flag that fired (or
"none" for 🟢). A 🔴 framework blocks `[GO]` — it forces `[RESHAPE]` or `[NO-GO]` in step 06.

## Output
Qualified answers for all relevant Qs, synthesized value proposition, premise agreement, framework score.

## SPC gate — before completing this step
If the round was uniformly positive (no red flags surfaced, no assumption cracks), inject one adversarial counter-hypothesis question (see SKILL.md "Anti-sycophancy gate") and record the outcome before running the tracker-complete.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 5`
