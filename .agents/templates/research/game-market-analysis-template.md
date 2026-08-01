# Game Market Analysis Template

> **Used by:** Iris (@researcher)
> **Feeds into:** Sarah (@product-manager)
> **Save to:** `artifacts/output/01-research/market-analysis.md`

Use this template when writing the genre market analysis report.

This document validates whether the **founder's game concept has a market worth entering.** It is data-driven, sourced, and ruthless about sizing. No optimism without evidence.

---

## 1. Executive Summary

**3-4 sentences** that answer:
- Is there a genre market for this concept?
- How big is the addressable player base?
- Is the genre growing, shrinking, or stable?
- What is the single most important finding?

## 2. Genre Market Size

### 2.1 Total Genre Market
- Definition: All players who actively buy/play games in this genre
- Size with unit: X million players / $X billion annual revenue
- Source: [cite source with URL — Steam Spy, Newzoo, platform reports, genre-specific studies]
- Confidence level: High / Medium / Low

### 2.2 Addressable Player Base
- Definition: Subset you can realistically reach with your platform, pricing, and discoverability
- Size with unit: X million players
- Calculation method: [explain how you derived this from total genre market]
- Confidence level: High / Medium / Low

### 2.3 Realistic Capture
- Definition: What you can capture in 3-5 years with your team size, budget, and marketing
- Size with unit: X thousand copies / $X million revenue
- Rationale: [why this number is realistic — compare to similar indie/studio launches]
- Confidence level: High / Medium / Low

### 2.4 Market Size Sanity Check
- Does the realistic capture justify the production investment? (e.g., AAA needs 1M+ units; indie needs 10K+ at $20)
- What is the price point required to break even?
- At what market penetration does this become sustainable?

## 3. Platform Dynamics

| Platform | Audience Fit | Discovery Risk | Revenue Share | Recommended? |
|----------|-------------|----------------|---------------|--------------|
| Steam | High / Medium / Low | Algorithm-dependent; genre saturation? | 70/30 | Yes / No / Primary |
| Console (PS/Xbox/Switch) | High / Medium / Low | Certification time; porting cost | 70/30 | Yes / No |
| Mobile (iOS/Android) | High / Medium / Low | Pay-to-win stigma; discoverability crisis | 70/30 or 85/15 | Yes / No |
| Web / Browser | High / Medium / Low | Low barrier; monetization harder | Varies | Yes / No |
| Epic Games Store | High / Medium / Low | Smaller audience; better rev share | 88/12 | Yes / No |

Rules:
- Match platform to target player habits (where do they already buy games?)
- Factor in porting costs and certification timelines
- Flag platform-specific risks (e.g., Steam review bombing, mobile ad fatigue)

## 4. Genre Trends

| Trend | Direction | Evidence | Impact on Our Game |
|-------|-----------|----------|-------------------|
| e.g., Cozy game boom | Growing | Steam tags, social media trends, streamer coverage | Positive — audience is primed |
| e.g., Live service fatigue | Growing | Player backlash against FOMO, battle passes | Positive — premium single-purchase stands out |
| e.g., AI-generated content stigma | Growing | Player pushback on asset stores, art quality concerns | Negative — must prove handcrafted quality |
| ... | ... | ... | ... |

Rules:
- Cite sources for every trend (platform reports, sales data, community sentiment)
- Distinguish between fad (1-2 years) and structural shift (5+ years)
- Flag trends that directly help or hurt the specific concept
- **If procedural/AI generation is relevant, flag:** player acceptance, quality bar, uniqueness risk

## 5. Target Player Segments

### 5.1 Primary Segment
- **Who:** Specific play style, genre preferences, platform habits
- **Itch intensity:** Critical (no good alternative) / Important (has alternatives but wants better) / Nice-to-have (casually interested)
- **Willingness to pay:** Full price / Sale only / F2P with cosmetics / Subscription
- **Evidence:** [Steam library analysis, community posts, streamer demographics]
- **Size of segment:** X million players addressable

### 5.2 Secondary Segments (if any)
- Brief description and size
- Why they are secondary (different play style, lower engagement, harder to reach)

### 5.3 Segment Validation Against Founder Assumptions

Reference the founder's idea brief (`artifacts/output/00-discovery/idea-brief.md`). Did the founder get the target player right?

| Founder Assumption | Research Finding | Match / Mismatch | Implication |
|-------------------|------------------|------------------|-------------|
| e.g., "Target is cozy gamers on Steam" | "Cozy gamers are split between Steam and Switch; Switch has lower competition" | Mismatch | Consider Switch port or change marketing focus |
| ... | ... | ... | ... |

## 6. Pricing & Monetization Landscape

| Model | Genre Fit | Player Acceptance | Benchmark Titles | Revenue Potential |
|-------|-----------|-------------------|-----------------|-------------------|
| Premium ($15-30) | High / Medium / Low | High / Medium / Low | e.g., Hades, Stardew Valley | One-time purchase |
| Premium ($30-60) | High / Medium / Low | High / Medium / Low | e.g., AAA titles | Higher per-unit, smaller audience |
| F2P with cosmetics | High / Medium / Low | High / Medium / Low | e.g., Fortnite, Genshin Impact | Requires live ops team |
| Early Access | High / Medium / Low | High / Medium / Low | e.g., Valheim, Baldur's Gate 3 | Revenue during development, community building |
| DLC / Expansion | High / Medium / Low | High / Medium / Low | e.g., Civilization, Crusader Kings | Long tail revenue |

## 7. Market Risks

| Risk | Likelihood | Impact | Evidence | Mitigation |
|------|------------|--------|----------|------------|
| e.g., Genre is oversaturated | Medium | High | 20+ similar titles released on Steam in last 12 months | Sharpen differentiation; target underserved sub-genre |
| e.g., Platform algorithm changes reduce visibility | Medium | Medium | Steam discovery updates favor established studios | Build community early; use influencers |
| e.g., Production scope exceeds budget | High | High | Team of 3, 2-year timeline, scope is AAA-sized | Cut scope to vertical slice; Early Access |
| ... | ... | ... | ... | ... |

## 8. Market Opportunities

| Opportunity | Size | Evidence | How to Capture |
|-------------|------|----------|----------------|
| e.g., Underserved sub-genre on console | $10M market | No cozy survival games on Switch | Port to Switch after Steam validation |
| e.g., Streamer-friendly mechanics | Viral potential | Similar games gained 1M+ views on Twitch | Design for spectator value |
| ... | ... | ... | ... |

## 9. Go / No-Go Recommendation

### 9.1 Verdict
- [ ] **GO** — Genre market exists, is large enough, and trends are favorable
- [ ] **GO WITH CAUTION** — Genre market exists but with significant risks that must be mitigated
- [ ] **NO-GO** — Genre is too small, shrinking, or saturated

### 9.2 Rationale
One paragraph explaining the verdict. Reference specific data points from Sections 2-8.

### 9.3 Conditions (if GO WITH CAUTION)
If the verdict is "GO WITH CAUTION," what must be true before proceeding?
- [ ] Condition 1
- [ ] Condition 2

## 10. Implications for Downstream Agents
Briefly note:
- Any **procedural generation/ML** considerations for @ml-ai-engineer (e.g., "market success depends on infinite replayability via procedural maps")
- Any **performance** considerations for @performance-engineer (e.g., "target market plays on mid-tier laptops; must maintain 60fps on GTX 1060")
- Any **anti-cheat/multiplayer** considerations for @security-engineer (e.g., "PvP trading requires server-authoritative architecture")

## 11. Sources

| # | Source | URL | Date | What It Proved |
|---|--------|-----|------|----------------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |

Rules:
- Use inline citations (e.g., `[1]`) to connect claims directly to the sources listed in this section
- Every claim in this document must trace to a source
- Prefer primary sources (platform data, sales trackers, direct research) over secondary (blog posts, opinion pieces)
- If exact data is unavailable, provide well-reasoned estimates with assumptions stated

---

**Document info:**
- Version: 1.0
- Author: @researcher
- Date: ...
- Input: `artifacts/output/00-discovery/idea-brief.md`
- Supersedes: v1.0 (initial)
