# Market Analysis Template

> **Used by:** Iris (@researcher)
> **Feeds into:** Sarah (@product-manager)
> **Save to:** `artifacts/output/01-research/market-analysis.md`

Use this template when writing the market analysis report.

This document validates whether the **founder's idea has a market worth entering.** It is data-driven, sourced, and ruthless about sizing. No optimism without evidence.

---

## 1. Executive Summary

**3-4 sentences** that answer:
- Is there a market for this concept?
- How big is it (TAM/SAM/SOM)?
- Is it growing, shrinking, or stable?
- What is the single most important finding?

## 2. Market Size

### 2.1 TAM (Total Addressable Market)
- Definition: Everyone who could theoretically buy this
- Size with unit: $X billion / million
- Source: [cite source with URL]
- Confidence level: High / Medium / Low

### 2.2 SAM (Serviceable Addressable Market)
- Definition: Subset you can realistically reach with your business model and geography
- Size with unit: $X billion / million
- Calculation method: [explain how you derived this from TAM]
- Confidence level: High / Medium / Low

### 2.3 SOM (Serviceable Obtainable Market)
- Definition: What you can capture in 3-5 years with your current resources and go-to-market
- Size with unit: $X million
- Rationale: [why this number is realistic]
- Confidence level: High / Medium / Low

### 2.4 Market Size Sanity Check
- Does the SOM justify the investment? (e.g., venture-backed needs $1B+ SAM; bootstrapped needs $10M+ SOM)
- What is the revenue per customer required to hit a meaningful business?
- At what market penetration does this become interesting?

## 3. Market Trends

| Trend | Direction | Evidence | Impact on Our Idea |
|-------|-----------|----------|-------------------|
| e.g., Remote work adoption | Growing | McKinsey report, 2023 | Positive — expands addressable market |
| e.g., AI regulation | Tightening | EU AI Act, 2024 | Negative — compliance cost increases |
| ... | ... | ... | ... |

Rules:
- Cite sources for every trend
- Distinguish between fad (1-2 years) and structural shift (5+ years)
- Flag trends that directly help or hurt the specific concept
- **If AI/ML is relevant to the concept, flag:** availability of ML APIs, model costs, training data requirements

## 4. Target Customer Segments

### 4.1 Primary Segment
- **Who:** Specific role, company size, industry
- **Pain intensity:** Critical / Important / Nice-to-have
- **Willingness to pay:** High / Medium / Low
- **Evidence:** [quotes, data, behavior patterns]
- **Size of segment:** $X million addressable

### 4.2 Secondary Segments (if any)
- Brief description and size
- Why they are secondary (lower pain, lower willingness to pay, harder to reach)

### 4.3 Segment Validation Against Founder Assumptions

Reference the founder's idea brief (`artifacts/output/00-discovery/idea-brief.md`). Did the founder get the target user right?

| Founder Assumption | Research Finding | Match / Mismatch | Implication |
|-------------------|------------------|------------------|-------------|
| e.g., "Target is SMB restaurants" | "SMB restaurants have <1% tech budget; mid-market chains are better fit" | Mismatch | Pivot target segment or pricing model |
| ... | ... | ... | ... |

## 5. Market Risks

| Risk | Likelihood | Impact | Evidence | Mitigation |
|------|------------|--------|----------|------------|
| e.g., Market is smaller than estimated | Medium | High | Limited publicly available data; analyst reports conflict | Conservative SOM; plan for lower penetration |
| e.g., Incumbent launches competing feature | Medium | Medium | Incumbent has R&D budget 10x ours; feature roadmap leaked | Differentiate on speed/niche, not head-on |
| ... | ... | ... | ... | ... |

## 6. Market Opportunities

| Opportunity | Size | Evidence | How to Capture |
|-------------|------|----------|----------------|
| e.g., Underserved geographic market | $50M SOM | No localized competitor in LATAM | Partner with local distributor |
| e.g., Adjacent use case discovered | $20M SOM | Users repurpose product for unexpected use | Build dedicated feature, market separately |
| ... | ... | ... | ... |

## 7. Go / No-Go Recommendation

### 7.1 Verdict
- [ ] **GO** — Market exists, is large enough, and trends are favorable
- [ ] **GO WITH CAUTION** — Market exists but with significant risks that must be mitigated
- [ ] **NO-GO** — Market is too small, shrinking, or saturated

### 7.2 Rationale
One paragraph explaining the verdict. Reference specific data points from Sections 2-6.

### 7.3 Conditions (if GO WITH CAUTION)
If the verdict is "GO WITH CAUTION," what must be true before proceeding?
- [ ] Condition 1
- [ ] Condition 2

## 8. Implications for Downstream Agents
Briefly note:
- Any **ML/data** considerations for @ml-engineer and @data-analyst (e.g., "market success depends on recommendation algorithm accuracy")
- Any **performance** considerations for @performance-engineer (e.g., "target market is mobile-first; must load in <3s on 3G")
- Any **compliance** considerations for @security-engineer (e.g., "target market is EU; GDPR compliance is mandatory")

## 9. Sources

| # | Source | URL | Date | What It Proved |
|---|--------|-----|------|----------------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |

Rules:
- Use inline citations (e.g., `[1]`) to connect claims directly to the sources listed in this section
- Every claim in this document must trace to a source
- Prefer primary sources (government data, public filings, direct research) over secondary (blog posts, opinion pieces)
- If exact data is unavailable, provide well-reasoned estimates with assumptions stated

---

**Document info:**
- Version: 2.0
- Author: @researcher
- Date: ...
- Input: `artifacts/output/00-discovery/idea-brief.md`
- Supersedes: v1.0 (added §8 for downstream agent implications)