---
name: validate-game-idea
description: Stress-test a game concept before investing production cycles — Socratic diagnostic for indie devs, game studios, and hobbyists
---

## What this skill does

Led by `@founder` acting as a tough thinking partner, not a cheerleader. Stress-test a game concept through Socratic questioning before any agent does research or production work.

This is the gate BEFORE `product-exploration`. If the concept survives, it enters the research pipeline with evidence. If it doesn't, you save weeks of wasted dev time.

**Key Agent:** `@founder` ( Elena )

**Next skill:** If GO → load `explore-game-idea` (the validation brief replaces the concept brief).

## When to use

- "I have an idea for a game" — any concept without playtest evidence
- "Is this worth building?" — uncertainty about whether anyone will play it
- "Should we add feature Y?" — feature proposal for an existing game
- "Help me think through Z" — strategic game design decision

**Skip when:** You already have paying players, retention data, or a live game with metrics. Go directly to `iterate` or `design`.

## Context modes

Determine at the start. This changes the questions and the bar for evidence.

| Mode | You are | Evidence bar |
|---|---|---|
| **Startup** | Indie dev, studio founder | High — need behavioral demand evidence |
| **Company** | Studio PM, creative director | Medium — need stakeholder pull and business case |
| **Personal** | Solo dev, modder, hobbyist | Low — clarity and excitement matter more than evidence |

**Game maturity** also affects routing:
- **Greenfield** (no existing game) → full diagnostic, all questions relevant
- **Brownfield** (existing game / sequel) → skip Q1 demand evidence (you have players), focus on Q2 genre landscape, Q4 core loop wedge, Q5 playtest observation

## Workflow

### Phase 1: Context

1. Invoke `@founder` to load existing project context if available:
   ```
   @memory-controller load founder [game idea validation]
   ```
   If memory files don't exist yet (new project), the controller will return "File not found" — that's fine, proceed without context.
2. Check `artifacts/output/` for prior validation briefs or design docs
3. Ask: **What's your context?** (startup / company / personal)
4. Ask: **Is this greenfield or brownfield?** (new game / existing game or sequel)
5. Ask: **What experience are you creating, and what's the core fun loop?** — Get both the player desire ("I want the tension of survival crafting with meaningful multiplayer trade") and the proposed mechanics ("scarce resources, player-driven economy, perma-death squads"). This is a rough hypothesis — the diagnostic will refine it into a value proposition.

   **If the answer is ambiguous**, push for clarity before proceeding:
   - **Vague terms** ("a roguelike with a twist," "soulslike but different") → "What's the twist? What do you actually do each session? Describe 60 seconds of gameplay."
   - **Mechanics without an experience** ("I want crafting, base building, and PvP") → "That's a feature list. What feeling does it create? What makes a player boot it up instead of the 10 other games with crafting, base building, and PvP?"
   - **Experience without mechanics** ("a game about loss and recovery") → "Good — that's a strong theme. How does the player interact with that theme? What do they actually DO?"
   - **Too broad** ("I want to make an MMO") → "That's a scope, not a concept. What's the core interaction loop? What does a player do in their first 5 minutes? Name one game like yours that exists — how is yours different?"

   Don't move to Phase 2 until you have both a **stated player experience** and a **proposed core mechanic**, even if rough. Reframe constructively: "Let me try restating: you want players to feel [experience] through [core mechanics] in a [genre/setting]. Does that capture it?"

### Phase 2: Diagnostic (one question at a time)

`@founder` asks questions **one at a time**. Wait for the answer. Push on vague answers.

**How to push:** Category-level answers ("RPG fans," "action gamers") → ask for a specific player. Hypothetical ("players would love...") → ask for observed playtest behavior. "Everyone will play this" → ask who'll refund it in the first hour.

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

**Ask:** "What's the strongest evidence someone would actually play this — not 'sounds interesting,' but would spend time and/or money on it?"

**Push for:** Specific behavior. Someone who played a prototype. Wishlists on Steam. Someone asking "when can I play this?" unprompted. A mod or fangame with real engagement.

**Red flags:** "My friends say it's cool." "People on Reddit liked the concept art." None of these are demand.

**Company reframe:** "What evidence do you have that players need THIS experience NOW versus the 50 other games on their backlog?"

**Light version (personal):** "Have you personally wanted to play a game like this? What did you play instead?"

#### Q2: Genre landscape

**Ask:** "What games are filling this space right now? What do they do well, and where do they fall short?"

**Push for:** Specific titles. Specific pain points. "Rust has the survival tension but the time commitment is punishing. Valheim nails exploration but the combat is shallow." A gap in the landscape, not a crowded space you're copying.

**Red flag:** "No game like this exists." If no one has tried, the audience probably isn't there, or the idea is unworkable.

**Company reframe:** "What's the competitive landscape? Which games have your target players spent 100+ hours in, and what do those players complain about?"

#### Q3: Specificity

**Ask:** "Who specifically would love this game? Name a real person — what games are in their Steam library, what do they spend time on, what makes them tell a friend 'you have to play this'?"

**Push for:** A specific player persona. Name, game history, play style, what makes them evangelize a game.

**Company reframe:** "Which player segment would champion this? What's their typical session length? What do they grind?"

#### Q4: Core fun loop wedge

**Ask:** "What's the smallest version of this someone would enjoy for 15 minutes — not after you build the full vision?"

**Push for:** One interaction loop. Something playable in days, not months. A vertical slice of the core fun.

**Bonus:** "What if the player needed zero tutorial — just picked up and played — to feel the fun?"

**Red flags:** "Need the full map, all classes, and multiplayer first." "Stripping it removes the identity." = attachment to scope over fun.

#### Q5: Playtest observation

**Ask:** "Have you watched someone play this? What surprised you about what they enjoyed, got frustrated by, or did that you didn't expect?"

**Push for:** A specific moment. Something that contradicted your assumptions.

**Red flags:** "We sent a survey." "Nothing surprising." Surveys lie. "As expected" = filtered through designer assumptions.

**Best signal:** Players doing something the game wasn't designed for — emergent behavior — that's often the real fun emerging.

#### Q6: Future-fit

**Ask:** "In 3 years, does the market for this kind of experience grow or shrink? Why?"

**Push for:** A specific thesis about how the industry changes — platform shifts, genre cycles, tech changes — and why that makes this game more relevant.

**Red flags:** "The market is growing." Growth rate isn't a vision. "Roguelikes are popular." Every competitor knows that.

#### Q7: Scope & team reality check (optional)

**When to ask:** Startup or Company mode when the concept sounds large, scope keeps expanding, or the team seems small relative to competitors.

**Ask:** "What's your assumed team size and timeline to ship the core fun loop as a playable prototype? Does that match what similar games in this genre typically required?"

**Push for:** A concrete answer. Solo dev with a 2-month timeline is fine — just name it. "We'll figure it out" is not a plan.

**Red flags:** Assuming 2 developers can ship what took the Minecraft team years. Feature lists that require all systems to exist before the fun loop works. No budget for art, audio, or QA.

**Why it matters:** Scope mismatch is where indie games die. The concept may be valid and the market real — but if the required team and timeline don't match reality, the game won't ship.

---

### Phase 2.5: Value proposition synthesis

Before challenging premises, distill what the diagnostic revealed into a clear value statement:

1. **Restate the player desire** — based on Q2 (genre landscape) and Q5 (playtest observation), not the user's original framing
2. **Restate the player** — based on Q3 (specificity), not demographics
3. **Synthesize the value proposition:** "For [specific player], [game] scratches an itch that [competing games] leave open by [core fun loop], which matters because [future-fit thesis]."

Present this to the user: "Based on what you've told me, here's what I think you're actually making: [value proposition]. Does this capture it?"

If the user disagrees, revise. This refined statement — not the original rough hypothesis — becomes the anchor for the rest of the session.

### Phase 3: Premise challenge

Before concluding, challenge the foundations:

1. **What if no one actually wants this experience?** Could a different angle make this more compelling?
2. **What if we don't make it?** Is the gap in the genre landscape real enough that players are stuck with unsatisfying options?
3. **Steelman the opposition.** What's the strongest case AGAINST making this game?
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
APPROACH A: [Name] — Minimal playable
  Summary:    [1-2 sentences]
  Effort:     S / M / L / XL
  Ships in:   [days / weeks / months]
  Risk:       Low / Med / High
  Why it wins:  [one reason]
  Why it fails: [one reason]

APPROACH B: [Name] — Full vision
  ...

APPROACH C: [Name] — Creative/lateral (optional)
  ...
```

Rules:
- At least 2 approaches. 3 preferred for non-trivial concepts.
- One must be the smallest playable experience someone would enjoy this week.
- One must be the ideal long-term direction.
- **Every approach must define a paper prototype or weekend vertical slice** — what can be tested in 2-3 days to validate the core fun loop before any production work? If an approach can't be prototyped quickly, that's a risk worth naming.

### Phase 5: Verdict

Based on diagnostic, premises, and alternatives, give ONE verdict:

**GO** — Worth exploring. Demand evidence exists or the gap is clear enough to validate through prototyping.
→ Produce validation brief. Handoff to `product-exploration`.

**PIVOT** — The core experience itch is real, but this approach is wrong.
→ Propose a reframed direction. Re-run this skill with the revised framing.

**KILL** — Doesn't survive scrutiny. No demand, no gap, premises don't hold.
→ Document why in the brief. Don't soften it. Kill early to save time.

Every verdict includes one concrete **next action** — a specific real-world step, not "go research this."

## Output

`artifacts/output/00-discovery/validation-brief.md`

Use the template: `.agents/templates/game-validation-brief-template.md`

## Handoff

**GO →** Load `explore-game-idea`. The validation brief replaces the concept brief — `@founder` uses it as input instead of synthesizing from scratch. Research agents focus on the open questions listed in the brief.

**PIVOT →** Re-run `game-idea-validation` with the revised framing.

**KILL →** Stop. The brief documents why. Revisit only if new evidence emerges.

## Guiding principles

- **One question at a time.** Wait for each answer before the next.
- **Push, then push again.** The first answer is the polished version. The real answer comes after the second push.
- **Take a position.** Don't say "that's interesting." Say "this is weak because..." or "this works because..." and state what evidence would change your mind.
- **Behavior over interest.** "Sounds cool" and wishlists don't count. Playtime, return sessions, and word-of-mouth evangelism count.
- **The genre landscape is the real competitor.** Not other games you're directly cloning — the 50 other games competing for your player's finite attention.
- **Narrow beats wide.** The smallest fun loop someone enjoys in one sitting beats the 100-hour epic vision.
- **Never start implementation.** This skill produces a validation brief, not code.

---

## State Machine Integration

The pipeline state machine (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run via `@executor`:
```bash
node .agents/scripts/orchestrator_state.js status
```

If pipeline is uninitialized, initialize first:
```bash
node .agents/scripts/orchestrator_state.js init --name "<project>" --type <startup|company|personal>
```

Then run `next` to confirm the current phase expects validation work.

### At End — Record Completion

For the validation brief this skill produces, run via `@executor`:
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/validation-brief.md
```

If the user chose to skip validation and go straight to exploration (producing an `idea-brief.md` instead), record that:
```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/idea-brief.md
```

This records the artifact, fires `agent_invoke` telemetry, and updates the pipeline history.
