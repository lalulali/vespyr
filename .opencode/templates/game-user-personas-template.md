# Player Personas & Research Template

> **Used by:** Paige (@user-researcher)
> **Feeds into:** Sarah (@product-manager), Ivy (@product-designer)
> **Save to:** `artifacts/output/01-research/user-personas.md`

Use this template when writing the player research report.

This document proves that **real players want this experience** the founder identified. It is grounded in behavior, not demographics. The goal is to make the player vivid and specific enough that the game team can design for them.

---

## 1. Executive Summary

**3-4 sentences** that answer:
- Who are the target players?
- What is their core itch and how do they currently scratch it?
- Are they willing to try something new?
- What is the single most important player insight?

## 2. Research Methodology

How was this research conducted?

- **Method:** [Playtests / Interviews / Surveys / Community observation / Stream analysis / Diary studies]
- **Sample size:** N = [number]
- **Participant criteria:** [how they were selected — play time in genre, platform, play style]
- **Recruitment method:** [Discord, Reddit, Steam forums, playtest groups]
- **Duration:** [total research timeframe]
- **Limitations:** [what this research cannot claim]

Rules:
- Be honest about sample size and methodology
- Small sample (N=5-10) is fine for qualitative if participants are representative
- Always state limitations — prevents overconfidence
- Note any incentives offered to participants (free game key, gift card)

## 3. Player Personas

### Persona 1: [Name] — The [Archetype]

**Demographics (minimal)**
- Age range, location, platform preference
- Keep this short — behavior matters more than demographics

**Gaming Context**
- When and where do they play? (evenings, commute, weekends)
- What are they looking for in that moment? (relaxation, challenge, social connection)
- Who else is involved? (solo, friends, online community)
- What games do they currently play? (3-5 specific titles with play time)

**Current Behavior**
- Step by step: what does a typical gaming session look like?
- What games do they boot up by default?
- How long do they play? How often?
- What is the emotional experience? (relaxed, stressed, social, solitary?)

**Pain Points**
- **Critical:** What makes them quit a game, refund it, or warn friends away?
- **Annoying:** What makes them sigh, tolerate, or mod around?
- **Unmet:** What do they wish existed but have given up on finding?

**Quote**
> "Exact words from a real player (paraphrased if necessary, but capture the emotion)."

**Player Motivations**
- **Achievement:** Progression, mastery, completion, rankings
- **Social:** Friendship, teamwork, competition, community belonging
- **Immersion:** Story, world-building, escapism, roleplay
- **Creativity:** Building, modding, self-expression
- Which motivation is PRIMARY for this persona?

**Willingness to Try New Games**
- Do they actively seek new releases? (high intent)
- Would they try something new if recommended? (medium intent)
- Do they stick to proven favorites? (low intent — warning sign)

**Platform & Spending Habits**
- Primary platform(s): [Steam, Switch, mobile, etc.]
- Typical spend: [full price, sale only, F2P with occasional purchase, whale]
- Discovery method: [Steam recommendations, streamers, friends, Reddit]
- Attitude toward Early Access: [eager / skeptical / avoids]

**Success Criteria**
- How will they know this game is "for them"?
- What is the "magic moment" that would make them stick?
- What would make them tell a friend "you have to play this"?

**Participant Source**
- Which playtest/interview participant(s) informed this persona?

---

### Persona 2: [Name] — The [Archetype]
[Same structure as Persona 1]

### Persona 3: [Name] — The [Archetype] (if applicable)
[Same structure as Persona 1]

Rules:
- Maximum 3 personas. More than 3 means you don't have a clear target.
- One persona must be the **primary** — the one you would build for if you could only build for one.
- Personas must be distinct, not variations of the same person.
- Every persona must be based on real research, not invention.

---

## 4. Player Journey Map

For the **primary persona**, map the end-to-end experience:

| Stage | What They Do | What They Think | What They Feel | Pain Point | Opportunity |
|-------|-------------|-------------------|----------------|------------|-------------|
| **Discovery** | Sees game on Steam / hears from friend | "This looks like my kind of thing" | Curious | Store page doesn't show core loop | Clear 30-second gameplay gif |
| **First Session** | Boots up, plays first 5-60 minutes | "Do I understand what to do? Is it fun?" | Excited or confused | Tutorial too long or missing | Immediate agency + quick first win |
| **Early Game** | Returns for sessions 2-10 | "I'm starting to see the depth" | Engaged | Progression feels too slow or too fast | Meaningful early milestones |
| **Mid Game** | Has 10-50 hours in | "This is my go-to evening game" | Committed | Content repetition, grind walls | Fresh mechanics or events |
| **Late Game** | Has 50+ hours in | "What keeps me coming back?" | Dedicated or bored | Lack of end-game purpose | Social features, creative tools, leaderboards |
| **Evangelism** | Recommends to friends, writes review | "My friends need to play this" | Enthusiastic | No easy way to play together | Referral rewards, co-op onboarding |

### Journey Map Notes
- Flag any stages where the player interacts with **existing competitors** — this is where switching friction lives
- Note any stages where **procedural/AI features** could enhance the experience (if applicable)
- Identify **emotional peaks** (delight) and **valleys** (frustration) — these are design priorities

---

## 5. Player Research Validation Against Founder Assumptions

Reference the founder's idea brief (`artifacts/output/00-discovery/idea-brief.md`). Did the founder understand the player?

| Founder Assumption | Research Finding | Match / Mismatch | Implication |
|-------------------|------------------|------------------|-------------|
| e.g., "Players want a challenging survival game" | "Players want survival tension but with generous checkpoints; permadeath is a turn-off" | Mismatch | Add checkpoint system; market as "forgiving survival" |
| e.g., "Multiplayer is essential" | "Primary persona plays solo 80% of the time; multiplayer is nice-to-have" | Mismatch | Ship single-player first; add multiplayer later |
| ... | ... | ... | ... |

---

## 6. Prioritized Player Needs

| Need | Frequency | Severity | Evidence | Priority |
|------|-----------|----------|----------|----------|
| e.g., "Save anywhere" | Every session | High | 8/10 players mentioned it unprompted | Must-have |
| e.g., "Character customization" | Early game | Medium | 4/10 players asked; others use defaults | Should-have |
| e.g., "Photo mode" | Rare | Low | 1 player mentioned | Could-have |

Rules:
- **Frequency:** How often does this need arise? (Every session, often, sometimes, rarely)
- **Severity:** What happens if unmet? (Quits game, frustrated, annoyed, indifferent)
- **Evidence:** Did players mention it unprompted? (Unprompted = stronger signal)
- **Priority:** Must-have / Should-have / Could-have / Won't-have

---

## 7. "How Might We" Opportunity Statements

Turn the top 3-5 player needs into actionable opportunity statements for the game team:

| # | How Might We... | Tied to Need | Priority |
|---|-----------------|-------------|----------|
| 1 | "How might we let players feel progress after every 20-minute session?" | "Short play sessions" daily need | Must-have |
| 2 | "How might we make multiplayer feel safe for solo players?" | "Social anxiety" barrier | Should-have |
| ... | ... | ... | ... |

---

## 8. Competitive Player Alternatives

What are players doing today with competitor games? (Cross-reference with `artifacts/output/01-research/competitive-analysis.md`)

| Game | Who Plays It for This | What They Love | What They Hate | Switching Difficulty |
|------|---------------------|----------------|----------------|---------------------|
| ... | ... | ... | ... | ... |

This helps @product-designer understand the UX they're competing against and @product-manager prioritize differentiators.

---

## 9. Sources & Raw Notes

| # | Participant | Method | Date | Key Quote |
|---|-------------|--------|------|-----------|
| 1 | [Play style, anonymized] | Playtest | ... | "..." |
| 2 | [Play style, anonymized] | Interview | ... | "..." |
| ... | ... | ... | ... | ... |

Rules:
- Use inline citations (e.g., `[1]`) to connect claims directly to the sources listed in this section
- Protect participant anonymity
- Store raw notes separately if they contain PII
- Link to raw data if stored elsewhere

---

**Document info:**
- Version: 1.0
- Author: @user-researcher
- Date: ...
- Input: `artifacts/output/00-discovery/idea-brief.md` + `artifacts/output/01-research/competitive-analysis.md`
- Supersedes: v1.0 (initial)
