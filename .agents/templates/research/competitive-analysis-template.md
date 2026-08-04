# Competitive Analysis Template

> **Used by:** Iris (@researcher)
> **Feeds into:** Sarah (@product-manager), Ivy (@product-designer)
> **Save to:** `artifacts/output/02-research/competitive-analysis.md`

Use this template when writing the competitive analysis report.

This document maps the **competitive landscape** the founder will enter. It is objective, specific, and unsentimental. The goal is to find white space, not to validate the founder's uniqueness.

---

## 1. Executive Summary

**3-4 sentences** that answer:
- Who are the main competitors?
- What is their core positioning?
- Where is the white space or opportunity?
- What is the single most important competitive threat?

## 2. Competitor Profiles

### 2.1 Direct Competitors

For each direct competitor (minimum 3, ideally 5-7):

#### Competitor: [Name]
- **Website:** [URL]
- **Founded:** [Year]
- **Funding:** [Stage / Amount / Valuation if known]
- **Target audience:** [Who they sell to]
- **Core value prop:** [One sentence]
- **Key features:** [3-5 bullets]
- **Pricing model:** [e.g., $49/user/mo, freemium, enterprise custom]
- **Strengths:** [What they do well]
- **Weaknesses:** [Where they are vulnerable]
- **Recent moves:** [Product launches, acquisitions, pivots in last 12 months]
- **ML/AI capabilities:** [Do they use ML/AI? What for? How well?]
- **Threat level:** High / Medium / Low

### 2.2 Indirect Competitors

Solutions that solve the same problem differently (spreadsheets, manual processes, doing nothing):

| Alternative | Why Users Choose It | Why It Fails Them | Switching Friction |
|-------------|--------------------|--------------------|--------------------|
| e.g., Excel spreadsheets | Free, familiar | No collaboration, error-prone | Low (just sign up) |
| e.g., "We always did it this way" | Zero effort | Inefficient, unscalable | High (culture change) |
| ... | ... | ... | ... |

### 2.3 Potential Future Entrants

Who could enter this market and why?

| Company | Why They Might Enter | Likelihood | Threat If They Do |
|---------|--------------------|-----------|--------------------|
| e.g., Notion | Already in workspace; adjacent feature expansion | Medium | High — brand + distribution |
| ... | ... | ... | ... |

## 3. Competitive Feature Matrix

| Feature / Capability | Us | Competitor A | Competitor B | Competitor C | Market Standard |
|--------------------|---|-------------|-------------|-------------|----------------|
| Core capability 1 | ✅ Planned | ✅ | ✅ | ❌ | Expected |
| Core capability 2 | ✅ Planned | ✅ | ❌ | ✅ | Expected |
| Differentiator 1 | 🌟 Unique | ❌ | ❌ | ❌ | — |
| Differentiator 2 | 🌟 Unique | ⚠️ Partial | ❌ | ❌ | — |
| Table stakes 1 | ✅ Planned | ✅ | ✅ | ✅ | Required |
| ML/AI features | ⚠️ Planned | ❌ | ✅ | ✅ Beta | Emerging |
| ... | ... | ... | ... | ... | ... |

Legend: ✅ Has it | ❌ Missing | 🌟 Our differentiator | ⚠️ Partial | 🔄 Planned

Rules:
- Compare against the **founder's concept**, not a hypothetical perfect product
- Be honest about where competitors are stronger
- "Market Standard" = what customers expect regardless of who offers it
- Flag ML/AI capabilities specifically — they're often hidden behind marketing language

## 4. Positioning Map

Place competitors and the founder's concept on a 2x2 matrix:

**Axis 1:** [e.g., Price: Low → High]
**Axis 2:** [e.g., Feature depth: Simple → Complex]

| | Low Price | High Price |
|---|---|---|
| **Simple** | Competitor X | Competitor Y |
| **Complex** | Competitor Z | **Our Position** |

White space: [Where is the gap? Who is not serving this quadrant?]

## 5. Competitive Validation Against Founder Assumptions

Reference the founder's idea brief (`artifacts/output/01-discovery/idea-brief.md`). Did the founder get the competitive landscape right?

| Founder Assumption | Research Finding | Match / Mismatch | Implication |
|-------------------|------------------|------------------|-------------|
| e.g., "No one does voice-first order taking" | "Competitor X launched voice feature 6 months ago" | Mismatch | Differentiate on accuracy/speed, not voice alone |
| e.g., "Incumbents are too slow to adapt" | "Incumbents release updates quarterly; we can ship weekly" | Match | Speed is a valid differentiator |
| ... | ... | ... | ... |

## 6. Strategic Recommendations

### 6.1 How to Win
- What is our single most defensible advantage?
- What should we build first to differentiate?
- What should we NOT build (because competitors already own it)?

### 6.2 How to Lose
- What would make us indistinguishable from competitors?
- What is the most dangerous competitive move an incumbent could make?
- What is our "moat decay" timeline — how long until competitors catch up?

### 6.3 Partnership or Acquisition Opportunities
- Are there competitors better suited as partners than enemies?
- Is there a "build vs buy" decision for any capability?

### 6.4 Implications for Downstream Agents
- Note anything that affects @product-manager's prioritization
- Flag features that have @security-engineer implications (competitors with compliance certs we lack)
- Note any competitor ML/AI capabilities that our @ml-ai-engineer should study

## 7. Sources

| # | Source | URL | Date | What It Proved |
|---|--------|-----|------|----------------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |

Rules:
- Use inline citations (e.g., `[1]`) to connect claims directly to the sources listed in this section
- Every claim in this document must trace to a source

---

**Document info:**
- Version: 2.0
- Author: @researcher
- Date: ...
- Input: `artifacts/output/01-discovery/idea-brief.md` + `artifacts/output/02-research/market-analysis.md`
- Supersedes: v1.0 (added ML/AI column to feature matrix, §6.4 downstream implications)