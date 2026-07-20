---
step: 4
name: Stress-Test Round 1
mode: create
prerequisites:
  - step-03 completed
delegation:
  reads: "direct (brief < 200 lines; per delegation-policy.md 1 file < 500 lines)"
  writes: none
  runs: none
  direct_justified: ["pure Socratic reasoning; brief is < 200 lines; no file writes"]
output_contract:
  citations: not-required
---

# Step 4 — Stress-Test Round 1

First round of Socratic diagnostic. Ask questions one at a time. Wait for each answer.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 4`
## Guiding principles
- **One question at a time.** Wait for each answer before the next.
- **Push, then push again.** The first answer is polished; the real answer follows the second push.
- **Take a position.** Don't say "that's interesting." Say "this is weak because..." or "this works because..." and state what evidence would change your mind.
- **Behavior over interest.** Waitlists and "people love it" don't count. Money, panic, and workarounds count.
- **The status quo is the real competitor.** Not other startups — the spreadsheet-and-email workaround.
- **Narrow beats wide.** The smallest version someone uses this week beats the full platform vision.
- **Never start implementation.** This skill produces a validation brief, not code.

Push technique: category answers ("enterprises," "developers") → ask for a name. Hypothetical ("people would want...") → ask for observed behavior.

## Q1: Demand evidence
**Ask:** "What's the strongest evidence someone actually needs this — not 'is interested,' but would be upset if it disappeared tomorrow?"

Push for: specific behavior (someone paying, expanding usage, scrambling if it vanished).
Red flags: "People say it's interesting." "We got waitlist signups."
Company reframe: "What evidence do you have that your team needs this NOW versus six other priorities?"
Light version (personal): "Have you personally felt this pain? How often? What do you do instead?"

## Q2: Status quo
**Ask:** "What are people doing right now to solve this — even badly? What does that cost them?"

Push for: a specific workflow, hours spent, dollars wasted, tools duct-taped together.
Red flag: "Nothing — no solution exists." If no one is doing anything, the problem probably isn't painful enough.
Company reframe: "What's the current internal workflow? How much time/money does it waste per week?"

## Q3: Specificity
**Ask:** "Who specifically needs this most? Name, role, company. What gets them promoted? What keeps them up at night?"

Push for: a name, a role, a specific consequence. "Marketing teams" is a filter, not a person.
Company reframe: "Which specific stakeholder would champion this? What do they need to show their VP?"

## Q4: Narrowest wedge
**Ask:** "What's the smallest version of this someone would use this week — not after you build the full thing?"

Push for: one feature, one workflow. Something shippable in days.
Bonus: "What if the user needed zero setup — no login, no integration — to get value?"
Red flag: "Need the full platform first." "Stripping it down removes differentiation." = attachment to architecture over value.

## Halt condition
If the user invokes the escape hatch after Q1+Q2, skip remaining Qs and proceed to step 05.

## Delegation
- **Reads:** direct — brief (< 200 lines)
- **Writes:** none
- **Direct:** pure Socratic reasoning; no file writes

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 4`
