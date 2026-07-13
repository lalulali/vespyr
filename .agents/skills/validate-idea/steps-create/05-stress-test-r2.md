---
step: 5
name: Stress-Test Round 2
mode: create
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
prerequisites:
  - step-04 completed
---

# Step 5 — Stress-Test Round 2

Second round: deeper questions, premise challenge, value synthesis, framework application.

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

Max 2 revision cycles on premises. If you can't agree, note disagreement in brief.

Also ask:
- **What if this problem doesn't exist?** Could a different framing make this irrelevant?
- **What if we do nothing?** Is the pain real enough?
- **Steelman the opposition.** What's the strongest case AGAINST building this?

## Framework application
Apply 1-2 frameworks from the founder toolkit:
- Golden Circle (WHY/HOW/WHAT)
- Pre-mortem (It failed — what killed it?)
- First Principles (Strip buzzwords — what's the core mechanism?)
- Moat & Defensibility (Why can't someone copy this in 3 months?)
- Unit Economics (Does the math work at 80% of expected price?)
- Market Timing (Why now and not 3 years ago?)
- Dependency Stack (What must already exist for this to work?)

Score: 🟢 PASS / 🟡 WEAK / 🔴 FAIL.

## Output
Qualified answers for all relevant Qs, synthesized value proposition, premise agreement, framework score.

## Delegation
- Reads: @reader (brief files, research artifacts)
- Writes: @writer (validation outputs)
- Direct: founder reasoning is direct (no delegation needed for Socratic questioning)
