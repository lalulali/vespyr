# Game Competitive Analysis Template

> **Used by:** @competitor-analyzer → **Feeds into:** @product-manager, @product-designer
> **Save to:** `artifacts/output/01-research/competitive-analysis.md`

Use this template when writing the competitive landscape report.

This document maps the **genre landscape** the founder will enter. It is objective, specific, and unsentimental. The goal is to find white space, not to validate the founder's uniqueness.

---

## 1. Executive Summary

**3-4 sentences** that answer:
- What are the main games in this space?
- What is their core positioning?
- Where is the white space or opportunity?
- What is the single most important competitive threat?

## 2. Competitor Profiles

### 2.1 Direct Competitors

For each direct competitor (minimum 3, ideally 5-7):

#### Competitor: [Name]
- **Store page:** [Steam / Console store / Itch.io URL]
- **Released:** [Year]
- **Developer / Publisher:** [Studio name, size]
- **Target player:** [Who plays this — play style, session length]
- **Core experience:** [One sentence — what does the player feel?]
- **Key mechanics:** [3-5 bullets — what do they actually DO?]
- **Monetization:** [Price, DLC, battle pass, cosmetic store]
- **Platform(s):** [Steam, Switch, PS5, etc.]
- **Player count / sales:** [If known — Steam reviews, player estimates]
- **Strengths:** [What the game does brilliantly — why players love it]
- **Weaknesses:** [Where players complain — Steam reviews, Reddit, Discord sentiment]
- **Recent updates:** [Last major patch, DLC, community events]
- **Threat level:** High / Medium / Low

### 2.2 Indirect Competitors

Games that scratch a similar itch but in a different genre:

| Game | Same Itch, Different Genre | Why Players Choose It | Where It Falls Short | Switching Friction |
|------|---------------------------|----------------------|---------------------|--------------------|
| e.g., Stardew Valley | Relaxation + progression | Polished, endless content | No multiplayer co-op village building | Low (just buy) |
| e.g., Rust | Social tension + survival | Intense PvP, emergent stories | Too hostile for cozy players | High (learn new systems) |
| ... | ... | ... | ... | ... |

### 2.3 Potential Future Releases

What could enter this space and why?

| Game / Studio | Why They Might Enter | Likelihood | Threat If They Do |
|---------------|--------------------|-----------|--------------------|
| e.g., ConcernedApe's next game | Proven cozy game track record; audience overlap | High | Very High — brand loyalty + distribution |
| ... | ... | ... | ... |

## 3. Competitive Feature Matrix

| Feature / Mechanic | Us | Game A | Game B | Game C | Genre Standard |
|--------------------|---|--------|--------|--------|---------------|
| Core mechanic 1 | ✅ Planned | ✅ | ✅ | ❌ | Expected |
| Core mechanic 2 | ✅ Planned | ✅ | ❌ | ✅ | Expected |
| Differentiator 1 | 🌟 Unique | ❌ | ❌ | ❌ | — |
| Differentiator 2 | 🌟 Unique | ⚠️ Partial | ❌ | ❌ | — |
| Table stakes 1 | ✅ Planned | ✅ | ✅ | ✅ | Required |
| Multiplayer design | ⚠️ Planned | ❌ | ✅ | ✅ Beta | Emerging |
| Procedural content | ⚠️ Planned | ✅ | ❌ | ❌ | Niche |
| ... | ... | ... | ... | ... | ... |

Legend: ✅ Has it | ❌ Missing | 🌟 Our differentiator | ⚠️ Partial | 🔄 Planned

Rules:
- Compare against the **founder's concept**, not a hypothetical perfect game
- Be honest about where competitors are stronger
- "Genre Standard" = what players expect regardless of who offers it
- Flag procedural/AI capabilities specifically — they're often hidden behind marketing language

## 4. Player Sentiment Analysis

What do players actually say about games in this space?

### 4.1 Common Praise (what players love)
| Theme | Frequency | Example Quote | Games Mentioned |
|-------|-----------|---------------|----------------|
| e.g., "Relaxing after work" | Very common | "I play this to unwind, not to min-max" | Stardew, Cozy Grove |
| ... | ... | ... | ... |

### 4.2 Common Complaints (what players hate)
| Theme | Frequency | Example Quote | Games Mentioned |
|-------|-----------|---------------|----------------|
| e.g., "Grindy late game" | Common | "After 20 hours it's just waiting for crops" | Stardew, Animal Crossing |
| ... | ... | ... | ... |

### 4.3 Unmet Desires (what players wish existed)
| Desire | Evidence | Opportunity for Our Game |
|--------|----------|--------------------------|
| e.g., "I want co-op but not PvP" | Reddit threads, Discord | Our game focuses on cooperative building, zero PvP |
| ... | ... | ... |

## 5. Positioning Map

Place competitors and the founder's concept on a 2x2 matrix:

**Axis 1:** [e.g., Tension: Relaxing → Intense]
**Axis 2:** [e.g., Social: Solo → Multiplayer]

| | Relaxing | Intense |
|---|---|---|
| **Solo** | Game X | Game Y |
| **Multiplayer** | Game Z | **Our Position** |

White space: [Where is the gap? Which quadrant is underserved?]

## 6. Competitive Validation Against Founder Assumptions

Reference the founder's idea brief (`artifacts/output/00-discovery/idea-brief.md`). Did the founder get the competitive landscape right?

| Founder Assumption | Research Finding | Match / Mismatch | Implication |
|-------------------|------------------|------------------|-------------|
| e.g., "No one does cozy survival with trading" | "Competitor X added trading 6 months ago but it's shallow" | Partial Match | Differentiate on depth of economy, not trading alone |
| e.g., "Indies can't compete with AAA polish" | "Players forgive lower polish if the core loop is unique and charming" | Mismatch | Polish is secondary to fun loop; don't over-scope visuals |
| ... | ... | ... | ... |

## 7. Strategic Recommendations

### 7.1 How to Win
- What is our single most defensible advantage?
- What should we build first to differentiate?
- What should we NOT build (because competitors already own it)?

### 7.2 How to Lose
- What would make us indistinguishable from competitors?
- What is the most dangerous competitive move an established studio could make?
- What is our "moat decay" timeline — how long until competitors catch up?

### 7.3 Genre Convention Breakers
- Which genre conventions should we follow (player expectation)?
- Which should we deliberately break (differentiation)?
- What are the risks of breaking each convention?

### 7.4 Implications for Downstream Agents
- Note anything that affects @product-manager's prioritization (e.g., "must ship multiplayer before single-player to differentiate")
- Flag mechanics that have @security-engineer implications (e.g., "competitors with anti-cheat; our PvP needs server authority")
- Note any competitor procedural/AI capabilities that our @ml-engineer should study

## 8. Sources

| # | Source | URL | Date | What It Proved |
|---|--------|-----|------|----------------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |

---

**Document info:**
- Version: 1.0
- Author: @competitor-analyzer
- Date: ...
- Input: `artifacts/output/00-discovery/idea-brief.md` + `artifacts/output/01-research/market-analysis.md`
- Supersedes: v1.0 (initial)
