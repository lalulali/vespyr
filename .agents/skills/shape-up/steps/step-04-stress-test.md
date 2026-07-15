---
step: 4
name: Stress-Test
prerequisites:
  - step-03 completed
delegation:
  reads: "direct (structured draft < 200 lines; per delegation-policy.md 1 file < 500 lines)"
  writes: none
  runs: none
  direct_justified: ["pure Socratic reasoning; no file writes; draft is in-conversation"]
output_contract:
  citations: not-required
---

# Step 4 — Stress-Test

Focused Socratic stress-test for plan viability. Lighter than full `/grill-me` — targets loopholes and blind spots specifically.

## Guiding principles
- **One question at a time.** Wait for each answer before the next.
- **Take a position.** Don't say "that's interesting." Say "this is weak because..." or "this works because..." and state what would change your mind.
- **Challenge the plan, not the person.** The goal is a stronger plan, not a defeated user.
- **Behavior over intent.** "People would want this" doesn't count. "People currently do X as a workaround" counts.
- **The narrowest version wins.** Push toward the smallest thing that delivers value.

## Focus areas

### F1: Viability
**Ask:** "Given the constraints you listed, is this actually buildable in the timeframe you're imagining? What's the hardest technical bet?"

Push for: a specific technical risk. If the user says "it's straightforward," ask which part they've built before and which part is new territory.

### F2: Edge cases
**Ask:** "What happens when [the core feature] gets zero input? What happens when it gets 10x the expected input? What breaks first?"

Push for: a specific failure mode. If the user says "we'll handle it," ask how.

### F3: Scope vs. value
**Ask:** "If you could only ship ONE thing from this plan and it had to deliver value on its own — what would it be?"

Push for: a single capability. If the user names 2+, they haven't found the wedge yet.

### F4: Risk surface
**Ask:** "What's the worst plausible outcome if this ships and doesn't work? Is it embarrassing, expensive, or dangerous? How would you know before users tell you?"

Push for: a detection mechanism, not just a risk label.

### F5: Competition with status quo
**Ask:** "What are people doing right now instead of using this? What would it take for them to switch from their current workaround to your solution?"

Push for: switching cost awareness. The status quo is the real competitor.

## Escape hatch
After **3+ questions**, the user can say "enough" or "move on." Remaining concerns are logged as open questions in the brief — they don't disappear, they become explicit deferrals.

## How this differs from /grill-me
- No 7+1 branch tree — 5 focused areas instead of 8 exhaustive branches
- No mandatory branch exhaustion — escape hatch after 3 questions
- Goal is viability confirmation, not exhaustive decision documentation
- If the user needs the full treatment, recommend `/grill-me` explicitly

## Output
Stress-test findings: confirmed strengths, identified weaknesses, and open questions for step 5.

## Delegation
- **Reads:** direct — structured draft (< 200 lines)
- **Writes:** none
- **Direct:** pure Socratic reasoning
