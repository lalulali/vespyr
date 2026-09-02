# Idea Brief Template (Founder Memo)

> **Used by:** Elena (@founder)
> **Feeds into:** Iris (@researcher), Paige (@user-researcher)
> **Save to:** `artifacts/output/01-discovery/idea-brief.md`

**Version:** 1
**Last changed:** YYYY-MM-DD
**Change log:**
- v1: Initial draft

Use this template when writing the strategic concept brief after ideation.

This document is a **strategic founder memo** — it makes the case for ONE direction before any market research begins. It should be dense, decisive, and readable in 3 minutes.

---

## 1. Idea Summary

**One clear sentence.** No commas, no hedging. If you can't state it in one sentence, the idea isn't ready.

> Example: "A mobile app that lets restaurant servers take orders by voice so kitchen tickets are never lost or misread."

## 2. Golden Circle

### 2.1 WHY — Why does this matter?
What fundamental human or business need does this serve? Why would anyone care in 5 years?

### 2.2 HOW — What makes this approach meaningfully different?
Not "we use AI" — what about the approach creates an unfair advantage or 10x improvement over alternatives?

### 2.3 WHAT — What exactly are we building?
One sentence. The product, not the company.

## 3. Stress-Test Results

Which tools did the founder apply? What did they reveal? Be honest about red flags — a founder who can kill a bad idea is more valuable than one who can't.

### 3.1 Tools Applied

Check all that were used (minimum 3 recommended):

- [ ] **Golden Circle** — WHY / HOW / WHAT coherence
- [ ] **First Principles Breakdown** — Core mechanism without jargon
- [ ] **Moat & Defensibility Analysis** — Why competitors can't copy in 3 months
- [ ] **Unit Economics Sanity Check** — Can we make money per customer?
- [ ] **Pre-mortem** — What's the #1 risk we're choosing to accept?
- [ ] **Market Timing Assessment** — Why NOW and not 3 years ago?
- [ ] **Dependency Stack** — Dealbreakers outside our control

### 3.2 Key Findings

| Tool | Finding | Severity | Mitigation or Decision |
|------|---------|----------|----------------------|
| e.g., Pre-mortem | "Most likely failure mode: restaurants are too fragmented to sell to at scale" | High | Researcher must validate market concentration (A1) |
| e.g., Unit Economics | "At $50/mo, we need 200 customers to break even; at $20/mo we need 500" | Medium | Price testing in user research (A3) |
| ... | ... | ... | ... |

### 3.3 Red Flags & Kill Criteria

Did any tool reveal a fatal flaw?

- [ ] **No red flags** — Idea survives all tests
- [ ] **Yellow flag** — Risks exist but are manageable with validation
- [ ] **Red flag** — Fatal flaw identified; idea is ruled `[NO-GO]` or reshaped

If red or yellow flag, explain:
- What is the flaw?
- Why is it fatal (or manageable)?
- What would a pivot look like?

## 4. Target User

### 4.1 Who is this for? (Primary)
- Role / persona
- Context (when and where they feel the pain)
- Frequency of the problem (daily, weekly, monthly?)

### 4.2 Who else benefits? (Secondary, if any)
Brief — don't dilute the focus.

### 4.3 Who is this NOT for?
Explicitly exclude audiences to prevent scope creep.

## 5. Value Proposition

### 5.1 Current Alternative
What do users do today? Be specific (competitor name, manual process, workaround).

### 5.2 Our Advantage
Why would they switch? Quantify if possible (10x faster, 5x cheaper, eliminates X risk).

### 5.3 One-Sentence Pitch
The elevator pitch. Memorable, not technical.

> Example: "Slack for hospitals — replacing chaotic pager chains with structured, trackable urgent messages."

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

What must be true for this idea to work? Researchers will validate these. Be specific and testable.

| # | Assumption | If True | If False | Researcher to Validate |
|---|-----------|---------|----------|----------------------|
| A1 | e.g., Restaurant servers lose or misread 10%+ of handwritten tickets | Strong problem validation | Problem is smaller than expected; pivot or kill | Market researcher |
| A2 | e.g., Servers are willing to speak into a phone in front of customers | UX is viable | Privacy/culture barrier kills adoption | User researcher |
| A3 | e.g., Existing POS systems have APIs we can integrate with | Buildable MVP | Need custom hardware; cost explodes | Architect (spike) |
| A4 | e.g., No competitor offers voice-first order taking | Clear differentiation | Red ocean; need sharper positioning | Competitor analyst |
| A5 | ... | ... | ... | ... |

Rules for assumptions:
- **Fatal assumptions first** — if wrong, the idea dies
- **Quantified where possible** — "users want X" is weak; "80% of users complain about Y" is strong
- **Assigned to a researcher** — every assumption has an owner who will test it

## 8. Open Questions

What must the research phase answer before we commit to building?

| Question | Why It Matters | Researcher |
|----------|---------------|------------|
| ... | ... | ... |

Rules:
- Don't answer these yourself — that's the researchers' job
- Frame as questions, not statements
- Prioritize: which unanswered question would kill the idea?

## 9. Recommended Next Step

One sentence. What should happen immediately after this memo?

> Example: "Validate A1 and A2 through user interviews with 10 restaurant servers before any market sizing."

## 10. Optional Agents Requested

Which specialized downstream agents should be activated?

- [ ] @ml-ai-engineer — concept depends on ML/AI as a core capability
- [ ] @performance-engineer — concept has strict performance SLAs
- [ ] @security-engineer — concept handles sensitive data (payments, health, PII)
- [ ] @ux-researcher — concept involves complex multi-step workflows, novel interactions, or accessibility-critical features

---

**Document info:**
- Version: 2.0
- Author: @founder
- Date: ...
- Status: Draft / Approved for Research
- Downstream agents to summon: [list from §10]