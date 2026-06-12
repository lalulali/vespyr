# User Personas & Research Template

> **Used by:** Paige (@user-researcher)
> **Feeds into:** Sarah (@product-manager), Ivy (@product-designer)
> **Save to:** `artifacts/output/01-research/user-personas.md`

Use this template when writing the user research report.

This document proves that **real people have the problem** the founder identified. It is grounded in behavior, not demographics. The goal is to make the user vivid and specific enough that the product team can design for them.

---

## 1. Executive Summary

**3-4 sentences** that answer:
- Who are the target users?
- What is their core problem and how do they currently solve it?
- Are they willing to change their behavior (switch to our solution)?
- What is the single most important user insight?

## 2. Research Methodology

How was this research conducted?

- **Method:** [Interviews / Surveys / Ethnographic observation / Jobs-to-be-Done interviews / Diary studies / Usability testing]
- **Sample size:** N = [number]
- **Participant criteria:** [how they were selected]
- **Recruitment method:** [how participants were found]
- **Duration:** [total research timeframe]
- **Limitations:** [what this research cannot claim]

Rules:
- Be honest about sample size and methodology
- Small sample (N=5-10) is fine for qualitative if participants are representative
- Always state limitations — prevents overconfidence
- Note any incentives offered to participants

## 3. User Personas

### Persona 1: [Name] — The [Archetype]

**Demographics (minimal)**
- Age range, role, location, company size
- Keep this short — behavior matters more than demographics

**Context**
- When and where do they encounter the problem?
- What are they trying to achieve in that moment?
- Who else is involved? (boss, team, customer, family)
- What tools/products do they currently use?

**Current Behavior**
- Step by step: how do they solve the problem today?
- What tools, processes, or workarounds do they use?
- How much time does it take? How much does it cost?
- What is the emotional experience? (frustrated, anxious, indifferent?)

**Pain Points**
- **Critical:** What makes them angry, lose money, or look bad?
- **Annoying:** What makes them sigh, work around, or tolerate?
- **Unmet:** What do they wish existed but have given up on?

**Quote**
> "Exact words from a real user (paraphrased if necessary, but capture the emotion)."

**Jobs-to-be-Done**
- **Functional job:** What practical task are they trying to complete?
- **Social job:** How do they want to be perceived by others?
- **Emotional job:** How do they want to feel?

**Willingness to Change**
- Are they actively looking for a solution? (high intent)
- Would they try something new if it crossed their path? (medium intent)
- Are they satisfied enough with the status quo? (low intent — warning sign)

**Technology Comfort**
- What tools do they already use daily?
- What is their tolerance for learning new software?
- Mobile-first, desktop-first, or hybrid?
- Attitude toward AI/ML features: [eager / skeptical / indifferent]

**Success Criteria**
- How will they know this product is working for them?
- What is the "magic moment" that would make them stick?

**Participant Source**
- Which interview/survey participant(s) informed this persona?

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

## 4. User Journey Map

For the **primary persona**, map the end-to-end experience:

| Stage | What They Do | What They Think | What They Feel | Pain Point | Opportunity |
|-------|-------------|-------------------|----------------|------------|-------------|
| **Awareness** | First realizes they have a problem | "This is taking too long" | Frustrated | Doesn't know solutions exist | SEO, content, word of mouth |
| **Consideration** | Evaluates alternatives | "Is this worth the switching cost?" | Cautious | Overwhelmed by options | Clear comparison, free trial |
| **Decision** | Chooses a solution | "I'll try this for a month" | Hopeful | Fear of commitment | Easy onboarding, no lock-in |
| **Onboarding** | First use of product | "I hope this isn't complicated" | Anxious | Too many steps to value | Guided setup, quick win |
| **Habitual Use** | Regular use | "This saves me 30 min/day" | Satisfied | Feature gaps vs. old workflow | Expand use cases |
| **Advocacy** | Recommends to others | "My team needs this too" | Enthusiastic | No referral mechanism | Referral program, case studies |

### Journey Map Notes
- Flag any stages where the user interacts with **existing competitors** — this is where switching friction lives
- Note any stages where **AI/ML features** could enhance the experience (if applicable)
- Identify **emotional peaks** (delight) and **valleys** (frustration) — these are design priorities

---

## 5. User Research Validation Against Founder Assumptions

Reference the founder's idea brief (`artifacts/output/00-discovery/idea-brief.md`). Did the founder understand the user?

| Founder Assumption | Research Finding | Match / Mismatch | Implication |
|-------------------|------------------|------------------|-------------|
| e.g., "Users are frustrated with current tools" | "Users are not frustrated — they are complacent. Friction is low enough that switching is hard to justify" | Mismatch | Need stronger value prop or lower switching cost |
| e.g., "Decision maker is the end user" | "End user loves it, but procurement approves budget. Two-person sale" | Mismatch | Add procurement-friendly features (security, compliance, bulk pricing) |
| ... | ... | ... | ... |

---

## 6. Prioritized User Needs

| Need | Frequency | Severity | Evidence | Priority |
|------|-----------|----------|----------|----------|
| e.g., "Export data to Excel" | Daily | High | 8/10 users mentioned it unprompted | Must-have |
| e.g., "Mobile app" | Weekly | Medium | 4/10 users asked; others use desktop | Should-have |
| e.g., "Dark mode" | Rare | Low | 1 user mentioned | Could-have |

Rules:
- **Frequency:** How often does this need arise? (Daily, weekly, monthly, rarely)
- **Severity:** What happens if unmet? (Blocks work, causes errors, annoying, nice-to-have)
- **Evidence:** Did users mention it unprompted? (Unprompted = stronger signal)
- **Priority:** Must-have / Should-have / Could-have / Won't-have

---

## 7. "How Might We" Opportunity Statements

Turn the top 3-5 user needs into actionable opportunity statements for the product team:

| # | How Might We... | Tied to Need | Priority |
|---|-----------------|-------------|----------|
| 1 | "How might we reduce report generation time from 2 hours to 5 minutes?" | "Export to Excel" daily pain | Must-have |
| 2 | "How might we let managers approve requests without leaving Slack?" | "Two-person sale" friction | Should-have |
| ... | ... | ... | ... |

---

## 8. Competitive User Alternatives

What are users doing today with competitor tools? (Cross-reference with `artifacts/output/01-research/competitive-analysis.md`)

| Competitor / Tool | Who Uses It for This | What They Like | What They Hate | Switching Difficulty |
|-------------------|---------------------|----------------|----------------|---------------------|
| ... | ... | ... | ... | ... |

This helps @product-designer understand the UX they're competing against and @product-manager prioritize differentiators.

---

## 9. Sources & Raw Notes

| # | Participant | Method | Date | Key Quote |
|---|-------------|--------|------|-----------|
| 1 | [Role, anonymized] | Interview | ... | "..." |
| 2 | [Role, anonymized] | Survey | ... | "..." |
| ... | ... | ... | ... | ... |

Rules:
- Use inline citations (e.g., `[1]`) to connect claims directly to the sources listed in this section
- Protect participant anonymity
- Store raw notes separately if they contain PII
- Link to raw data if stored elsewhere

---

**Document info:**
- Version: 2.0
- Author: @user-researcher
- Date: ...
- Input: `artifacts/output/00-discovery/idea-brief.md` + `artifacts/output/01-research/competitive-analysis.md`
- Supersedes: v1.0 (added Participant Source, Technology Comfort including AI attitude, Competitive User Alternatives §8, Journey Map Notes)