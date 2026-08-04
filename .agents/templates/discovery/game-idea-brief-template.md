# Game Idea Brief Template (Founder Memo)

> **Used by:** Elena (@founder)
> **Feeds into:** Iris (@researcher), Paige (@user-researcher)
> **Save to:** `artifacts/output/01-discovery/idea-brief.md`

Use this template when writing the strategic game concept brief after ideation.

This document is a **strategic founder memo** — it makes the case for ONE game direction before any market research begins. It should be dense, decisive, and readable in 3 minutes.

---

## 1. Pitch Sentence

**One clear sentence.** No commas, no hedging. If you can't state it in one sentence, the concept isn't ready.

> Example: "A cozy survival game where players build floating villages on a flooded world, trading with other players for scarce resources."

## 2. Golden Circle

### 2.1 WHY — Why does this experience matter?
What fundamental player desire does this serve? What feeling or itch does it scratch? Why would anyone boot this up in 5 years?

### 2.2 HOW — What makes this approach meaningfully different?
Not "we have better graphics" — what about the design creates an unfair advantage or fresh experience over existing games?

### 2.3 WHAT — What exactly are we making?
One sentence. The game, not the studio.

## 3. Stress-Test Results

Which tools did the founder apply? What did they reveal? Be honest about red flags — a founder who can kill a bad concept is more valuable than one who can't.

### 3.1 Tools Applied

Check all that were used (minimum 3 recommended):

- [ ] **Golden Circle** — WHY / HOW / WHAT coherence
- [ ] **Core Loop Breakdown** — Can you describe 60 seconds of gameplay without jargon?
- [ ] **Genre Gap Analysis** — Why hasn't this exact experience been made yet?
- [ ] **Session Design Sanity Check** — Is the first 5 minutes as compelling as hour 50?
- [ ] **Pre-mortem** — What's the #1 risk we're choosing to accept?
- [ ] **Market Timing Assessment** — Why NOW and not 3 years ago?
- [ ] **Platform Fit** — Does this game belong on Steam, console, mobile, or web? Why?

### 3.2 Key Findings

| Tool | Finding | Severity | Mitigation or Decision |
|------|---------|----------|----------------------|
| e.g., Pre-mortem | "Most likely failure: core loop is fun for 2 hours but lacks long-term progression" | High | Researcher must validate retention hooks (A1) |
| e.g., Session Design | "First 5 minutes are confusing without a tutorial; but tutorial kills the discovery feeling" | Medium | Prototype no-tutorial onboarding (A3) |
| ... | ... | ... | ... |

### 3.3 Red Flags & Kill Criteria

Did any tool reveal a fatal flaw?

- [ ] **No red flags** — Concept survives all tests
- [ ] **Yellow flag** — Risks exist but are manageable with validation
- [ ] **Red flag** — Fatal flaw identified; concept should be killed or pivoted

If red or yellow flag, explain:
- What is the flaw?
- Why is it fatal (or manageable)?
- What would a pivot look like?

## 4. Target Player

### 4.1 Who is this for? (Primary)
- Play style / persona (e.g., "cozy gamer," "hardcore roguelike fan," "social multiplayer seeker")
- Current game library (3-5 specific titles they have 100+ hours in)
- Session habits (how long, how often, solo vs. multiplayer)

### 4.2 Who else benefits? (Secondary, if any)
Brief — don't dilute the focus.

### 4.3 Who is this NOT for?
Explicitly exclude player types to prevent scope creep.

## 5. Value Proposition

### 5.1 Genre Landscape Gap
What existing games fill this space? Where do they fall short? What itch do they leave unscratched?

### 5.2 Our Advantage
Why would a player choose this over the 50 other games in their backlog? Quantify if possible ("Valheim's exploration + Rust's social tension, but in 20-minute sessions").

### 5.3 One-Sentence Pitch
The elevator pitch. Memorable, not technical.

> Example: "Stardew Valley meets Subnautica — a farming game where your crops grow underwater and the ocean is trying to eat you."

## 6. Alternatives Considered

| Direction | Why It Was Considered | Why It Was Rejected |
|-----------|----------------------|---------------------|
| ... | ... | ... |
| ... | ... | ... |

Rules:
- Minimum 2 alternatives (proves you didn't settle on the first idea)
- Each rejection must have a real reason (not "we didn't think of it")
- The chosen direction should feel inevitable in hindsight

## 7. Key Assumptions

What must be true for this game to work? Researchers will validate these. Be specific and testable.

| # | Assumption | If True | If False | Researcher to Validate |
|---|-----------|---------|----------|----------------------|
| A1 | e.g., Players want 20-minute survival sessions, not 3-hour base-building marathons | Core loop is validated | Wrong session length kills retention | User researcher |
| A2 | e.g., The floating village mechanic is intuitive without a tutorial | Low friction onboarding | Tutorial bloat or player confusion | User researcher |
| A3 | e.g., No direct competitor offers multiplayer trading in a cozy survival genre | Clear genre gap | Red ocean; need sharper positioning | Competitor analyst |
| A4 | e.g., Steam is the right primary platform for this audience | Correct platform fit | Wrong platform = poor discovery | Market researcher |
| A5 | ... | ... | ... | ... |

Rules for assumptions:
- **Fatal assumptions first** — if wrong, the concept dies
- **Quantified where possible** — "players want X" is weak; "80% of surveyed players quit after 30 min without progression" is strong
- **Assigned to a researcher** — every assumption has an owner who will test it

## 8. Open Questions

What must the research phase answer before we commit to production?

| Question | Why It Matters | Researcher |
|----------|---------------|------------|
| ... | ... | ... |

Rules:
- Don't answer these yourself — that's the researchers' job
- Frame as questions, not statements
- Prioritize: which unanswered question would kill the concept?

## 9. Recommended Next Step

One sentence. What should happen immediately after this memo?

> Example: "Validate A1 and A2 through a paper prototype playtest with 10 target players before any market sizing."

## 10. Optional Agents Requested

Which specialized downstream agents should be activated?

- [ ] @ml-ai-engineer — concept depends on ML/AI (procedural generation, NPC behavior, matchmaking)
- [ ] @performance-engineer — concept has strict performance targets (e.g., 60fps on mid-tier hardware)
- [ ] @security-engineer — concept handles sensitive data (payments, player PII, anti-cheat)
- [ ] @ux-researcher — concept involves complex controls, novel interactions, or accessibility-critical features

---

**Document info:**
- Version: 1.0
- Author: @founder
- Date: ...
- Status: Draft / Approved for Research
- Downstream agents to summon: [list from §10]
