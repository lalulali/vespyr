---
name: validate-idea
description: Stress-test an idea before investing research cycles — Socratic diagnostic for startup, company, and personal contexts
---

## What this skill does

A tough thinking partner, not a cheerleader. Stress-test an idea through Socratic questioning before any agent does research work.

This is the gate BEFORE `explore-idea`. If the idea survives, it enters the research pipeline with evidence. If it doesn't, you save hours of wasted agent time.

**Next skill:** If GO → load `explore-idea` (the validation brief replaces the idea brief).

## When to use

- "I have an idea for X" — any idea without validated demand
- "Is this worth building?" — uncertainty about viability
- "Should we add feature Y?" — feature proposal at work
- "Help me think through Z" — strategic product decision

**Skip when:** You already have paying customers, measured demand, or a live product with user data. Go directly to `iterate` or `design`.

## Context modes

Determine at the start. This changes the questions and the bar for evidence.

| Mode | You are | Evidence bar |
|---|---|---|
| **Startup** | Founder, indie hacker | High — need behavioral demand evidence |
| **Company** | PM at work, intrapreneur | Medium — need stakeholder pull and business case |
| **Personal** | Builder, learner, hobbyist | Low — clarity and excitement matter more than evidence |

**Product maturity** also affects routing:
- **Greenfield** (no existing product) → full diagnostic, all questions relevant
- **Brownfield** (existing product/feature) → skip Q1 demand evidence (you have users), focus on Q2 status quo, Q4 wedge, Q5 observation

## Workflow

### Phase 1: Context

1. Load existing project context if available:
   ```
   @memory-controller load founder [idea validation]
   ```
   If memory files don't exist yet (new project), the controller will return "File not found" — that's fine, proceed without context.
2. Check `artifacts/output/` for prior validation briefs or design docs
3. Ask: **What's your context?** (startup / company / personal)
4. Ask: **Is this greenfield or brownfield?** (new thing / improving existing thing)
5. Ask: **What problem are you solving, and what's your proposed solution?** — Get both the pain ("ops managers waste 10 hrs/week on manual scheduling") and the proposed fix ("automated scheduling that learns from past patterns"). This is a rough hypothesis — the diagnostic will refine it into a value proposition.

   **If the answer is ambiguous**, push for clarity before proceeding:
   - **Vague terms** ("make onboarding better," "something with AI") → "What do you mean by 'better'? Can you describe what's broken today in concrete terms — what happens, who's affected, and what it costs them?"
   - **Solution without a problem** ("I want to build a dashboard for X") → "That's a solution. What's the problem it solves? Who has this problem today and what are they doing instead?"
   - **Problem without a solution** ("scheduling is a mess at our company") → "Good — that's a real pain. What's your proposed fix? Even a rough one."
   - **Too broad** ("I want to help small businesses") → "Which small businesses? Doing what? The narrower you go, the sharper the diagnostic. Name one specific person at one specific business."

   Don't move to Phase 2 until you have both a **stated problem** and a **proposed solution**, even if rough. Reframe constructively: "Let me try restating: you're saying [problem reframe] and your proposed fix is [solution reframe]. Does that capture it?"

### Phase 2: Diagnostic (one question at a time)

Ask questions **one at a time**. Wait for the answer. Push on vague answers.

**How to push:** Category-level answers ("enterprises," "developers") → ask for a name. Hypothetical ("people would want...") → ask for observed behavior. "Everyone needs this" → ask who panics when it breaks.

**Question routing:**

| Mode × Maturity | Questions |
|---|---|
| Startup + greenfield | Q1, Q2, Q3, Q4, Q5, Q6 |
| Startup + brownfield | Q2, Q4, Q5, Q6 |
| Company + greenfield | Q2, Q3, Q4, Q6 |
| Company + brownfield | Q2, Q4, Q5 |
| Personal + greenfield | Q1-light, Q4, Q5 |
| Personal + brownfield | Q4, Q5 |

**Escape hatch:** If the user says "just do it" or shows impatience:
- "The hard questions are the value. Let me ask the two most critical, then we move."
- If they push back again, respect it — proceed to Phase 3 immediately.

---

#### Q1: Demand evidence

**Ask:** "What's the strongest evidence someone actually needs this — not 'is interested,' but would be upset if it disappeared tomorrow?"

**Push for:** Specific behavior. Someone paying. Someone expanding usage. Someone who'd scramble if it vanished.

**Red flags:** "People say it's interesting." "We got waitlist signups." None of these are demand.

**Company reframe:** "What evidence do you have that your team needs this NOW versus six other priorities on the roadmap?"

**Light version (personal):** "Have you personally felt this pain? How often? What do you do instead?"

#### Q2: Status quo

**Ask:** "What are people doing right now to solve this — even badly? What does that cost them?"

**Push for:** A specific workflow. Hours spent. Dollars wasted. Tools duct-taped together.

**Red flag:** "Nothing — no solution exists." If no one is doing anything, the problem probably isn't painful enough.

**Company reframe:** "What's the current internal workflow? How much time/money does it waste per week?"

#### Q3: Specificity

**Ask:** "Who specifically needs this most? Name, role, company. What gets them promoted? What keeps them up at night?"

**Push for:** A name. A role. A specific consequence. "Marketing teams" is a filter, not a person.

**Company reframe:** "Which specific stakeholder would champion this? What do they need to show their VP?"

#### Q4: Narrowest wedge

**Ask:** "What's the smallest version of this someone would use this week — not after you build the full thing?"

**Push for:** One feature. One workflow. Something shippable in days.

**Bonus:** "What if the user needed zero setup — no login, no integration — to get value?"

**Red flags:** "Need the full platform first." "Stripping it down removes differentiation." = attachment to architecture over value.

#### Q5: Observation

**Ask:** "Have you watched someone struggle with this problem? What surprised you?"

**Push for:** A specific surprise. Something that contradicted assumptions.

**Red flags:** "We sent a survey." "Nothing surprising." Surveys lie. "As expected" = filtered through existing assumptions.

**Best signal:** Users doing something the product wasn't designed for — that's often the real problem emerging.

#### Q6: Future-fit

**Ask:** "In 3 years, does this problem become more urgent or less? Why?"

**Push for:** A specific thesis about how the world changes and why that makes this more essential.

**Red flags:** "Market is growing 20%." Growth rate isn't a vision. "AI makes everything better." Every competitor says that.

#### Q7: Scope & team reality check (optional)

**When to ask:** Startup or Company mode when the concept sounds large or the team seems small.

**Ask:** "What team size and timeline are you assuming to ship the narrowest wedge? Does that match what similar products required?"

**Push for:** A concrete answer. Solo developer with a 2-week runway is fine — just name it. "We'll figure it out" is not a plan.

**Red flags:** Assuming a 2-person team can ship what took Notion 3 years to build. Timelines that require everything to go right. No budget estimate for paid tools or infrastructure.

**Why it matters:** Scope mismatch is a silent killer. The idea may be valid but unbuildable at the assumed cost and team size — better to catch it here than after months of work.

---

### Phase 2.5: Value proposition synthesis

Before challenging premises, distill what the diagnostic revealed into a clear value statement:

1. **Restate the problem** — based on Q2 (status quo) and Q5 (observation), not the user's original framing
2. **Restate the user** — based on Q3 (specificity), not categories
3. **Synthesize the value proposition:** "For [specific user], [product] replaces [status quo workaround] by [narrowest wedge], which matters because [future-fit thesis]."

Present this to the user: "Based on what you've told me, here's what I think you're actually building: [value proposition]. Does this capture it?"

If the user disagrees, revise. This refined statement — not the original rough hypothesis — becomes the anchor for the rest of the session.

### Phase 3: Premise challenge

Before concluding, challenge the foundations:

1. **What if this problem doesn't exist?** Could a different framing make this irrelevant?
2. **What if we do nothing?** Is the pain real enough that the status quo is unsustainable?
3. **Steelman the opposition.** What's the strongest case AGAINST building this?
4. **What has to be true?** List 3-5 premises that must hold for this to work.

Present as explicit premises:

```
PREMISES:
1. [statement] — agree / disagree?
2. [statement] — agree / disagree?
3. [statement] — agree / disagree?
```

If the user disagrees, revise understanding. **Max 2 revision cycles** on premises — if you can't agree after 2 rounds, note the disagreement in the brief and move on.

### Phase 4: Alternatives

Generate 2-3 distinct approaches:

```
APPROACH A: [Name] — Minimal viable
  Summary:    [1-2 sentences]
  Effort:     S / M / L / XL
  Ships in:   [days / weeks / months]
  Risk:       Low / Med / High
  Why it wins:  [one reason]
  Why it fails: [one reason]

APPROACH B: [Name] — Ideal long-term
  ...

APPROACH C: [Name] — Creative/lateral (optional)
  ...
```

Rules:
- At least 2 approaches. 3 preferred for non-trivial ideas.
- One must be the smallest thing someone would use this week.
- One must be the ideal long-term direction.

### Phase 5: Verdict

Based on diagnostic, premises, and alternatives, give ONE verdict:

**GO** — Worth exploring. Demand evidence exists or the problem is clear enough to validate through research.
→ Produce validation brief. Handoff to `explore-idea`.

**PIVOT** — The core problem is real, but this approach is wrong.
→ Propose a reframed direction. Re-run this skill with the revised framing.

**KILL** — Doesn't survive scrutiny. No demand, no urgency, premises don't hold.
→ Document why in the brief. Don't soften it. Kill early to save time.

Every verdict includes one concrete **next action** — a specific real-world step, not "go research this."

## Output

`artifacts/output/00-discovery/validation-brief.md`

Use the template: `.opencode/templates/validation-brief-template.md`

## Handoff

**GO →** Load `explore-idea`. The validation brief replaces the idea brief — `@founder` uses it as input instead of synthesizing from scratch. Research agents focus on the open questions listed in the brief.

**PIVOT →** Re-run `idea-validation` with the revised framing.

**KILL →** Stop. The brief documents why. Revisit only if new evidence emerges.

## Guiding principles

- **One question at a time.** Wait for each answer before the next.
- **Push, then push again.** The first answer is the polished version. The real answer comes after the second push.
- **Take a position.** Don't say "that's interesting." Say "this is weak because..." or "this works because..." and state what evidence would change your mind.
- **Behavior over interest.** Waitlists and "people love it" don't count. Money, panic, and workarounds count.
- **The status quo is the real competitor.** Not other startups — the spreadsheet-and-email workaround.
- **Narrow beats wide.** The smallest version someone uses this week beats the full platform vision.
- **Never start implementation.** This skill produces a validation brief, not code.
