# PRD Template

> **Used by:** Sarah (@product-manager)
> **Feeds into:** Ivy (@product-designer), Vera (@architect), Grant (@tech-lead), Rex (@developer), Nova (@data-analyst)
> **Save to:** `artifacts/output/03-strategy/requirements.md`
> **Paired with:** `SPEC.md` (`.agents/templates/product/SPEC.md`) for distilled agent contract, `user-story-template.md` (`.agents/templates/product/user-story-template.md`) for sprint stories
> **Prototype track/runtime:** `{static-html | nextjs-component | not in scope}` / `{runtime}`

<!--
TEMPLATE REVISION HISTORY (Vespyr framework internal — DO NOT copy into the generated document).
This tracks how the *template* itself evolved. It is NOT the version of the PRD you are writing.
When you generate a real PRD from this template, the document's own version below ALWAYS starts at
1 on first creation, regardless of the template revision number. Do not carry "v5" (or any template
revision) into the document's `**Version:**` field.
- Template v5: Added Evidence Ledger §14 (reverse mode — `path#id` anchors, `[OPEN]` fencing, `[DEFERRED TO SPEC]` fidelity partition)
- Template v4: Added Research Foundation §2; renumbered all subsequent sections; standardized 03-strategy output paths and DNA 7 concise specifications
- Template v3: Added Hypothesis of Solution §3; renumbered subsequent sections
- Template v2: Added ML/AI §11.1, Assumptions to Validate §9.3
- Template v1: Initial draft
-->

<!--
DOCUMENT VERSION (this is the one you fill in — belongs to the PRD, not the template).
On first generation this is ALWAYS `1`. Increment it only on later edits to this same
requirements.md (v2, v3, …), appending a dated change-log line each time.
-->
**Version:** 1
**Last changed:** YYYY-MM-DD
**Change log:**
- v1: Initial draft

Use this template when writing the Product Requirements Document.
This document is for **management and business teams** — keep it strategic, not technical.

> [!IMPORTANT]
> **Radical Brevity & Concise Specifications (DNA 7):**
> Eliminate verbose elaboration, repetitive filler, and convoluted academic phrasing. State requirements, goals, and constraints in the simplest, most direct terms possible. When domain-specific or technical concepts are essential, demystify them using intuitive, plain-English explanations that blend naturally into the specification without meta-labels. Save tokens, avoid bloat, and deliver immediately actionable clarity.

---

## 1. Executive Summary

**One paragraph (3-5 sentences)** that answers:
- What problem are we solving?
- Who is it for?
- What is the proposed solution at the highest level?
- What is the expected business impact?

## 2. Research Foundation

<!--
Link every upstream research document that informed this PRD.

NO SOURCE, NO FACT (DNA 5 — hard rule): Mark a row `Reviewed` and write a `Key Finding`
ONLY for a file that actually exists on disk and that you have read. Never invent a status,
a finding, or a citation for a file that is not present. Verify each path with the file
system before filling its row.

- Reverse mode / imported prototype: there is usually NO upstream discovery or research flow,
  so these files do NOT exist. Do not fabricate them. Mark each absent row
  `[ABSENT — no upstream research]` with a `—` finding, and add one line above the table:
  "This PRD was reverse-engineered from an imported prototype; no upstream research artifacts
  exist. The §14 Evidence Ledger (prototype inventory) is the sole evidence base." Only the
  Prototype Inventory row may be `Reviewed`, and only if prototype-inventory.md exists.
- If a document is planned but not yet written, mark it `[PENDING]` and assign an owner.
-->

| Document | Path | Status | Key Finding (1 sentence) |
|----------|------|--------|--------------------------|
| Idea Brief | `artifacts/output/01-discovery/idea-brief.md` | [ ] Reviewed / [PENDING] / [ABSENT] | ... |
| Validation Brief | `artifacts/output/01-discovery/validation-brief.md` | [ ] Reviewed / [PENDING] / [ABSENT] | ... |
| Market Analysis | `artifacts/output/02-research/market-analysis.md` | [ ] Reviewed / [PENDING] / [ABSENT] | ... |
| Competitive Analysis | `artifacts/output/02-research/competitive-analysis.md` | [ ] Reviewed / [PENDING] / [ABSENT] | ... |
| User Personas | `artifacts/output/02-research/user-personas.md` | [ ] Reviewed / [PENDING] / [ABSENT] | ... |
| UX Research Report | `artifacts/output/02-research/ux-research-report.md` | [ ] Reviewed / [PENDING] / [ABSENT] | ... |

> **Research sign-off:** In create mode, all rows above must be [ ] Reviewed before this PRD moves to the Design phase. In reverse/imported mode, absent upstream research is expected — mark those rows `[ABSENT — no upstream research]` and rely on the §14 Evidence Ledger; never fabricate a Reviewed status.

## 3. Problem Statement

### 3.1 Current Pain
- What is happening today that shouldn't be?
- Who feels this pain and how often?
- What is the cost of this problem (time, money, risk, churn)?

### 3.2 Evidence
- Research findings that support this problem (cite `artifacts/output/02-research/`)
- Key quotes from user research (`artifacts/output/02-research/user-personas.md`)
- Market data points that show the opportunity (`artifacts/output/02-research/market-analysis.md`)

### 3.3 Opportunity
- What changes if we solve this?
- What is the upside (revenue, retention, efficiency, competitive advantage)?

## 4. Hypothesis of Solution

<!--
This section captures the solution bet — the explicit, falsifiable prediction that connects the problem to the proposed approach.
Write one hypothesis per major solution direction. Prefer fewer, sharper hypotheses over a long list.
-->

### 4.1 Primary Hypothesis

> **We believe that** [proposed solution/capability]
> **will result in** [measurable outcome for the user or business]
> **as evidenced by** [leading indicator or validation signal we will observe within X weeks/sprints]

**Confidence level:** Low / Medium / High
**Validation method:** A/B test / User interview / Analytics / Prototype test / ...
**Owner:** @product-manager

### 4.2 Secondary Hypotheses (if any)

| # | We believe that... | Will result in... | Evidenced by... | Confidence |
|---|-------------------|-------------------|-----------------|------------|
| H2 | ... | ... | ... | Low/Medium/High |
| H3 | ... | ... | ... | Low/Medium/High |

### 4.3 What Would Invalidate This Hypothesis?
- If we observe [counter-signal], the hypothesis is wrong and we must pivot.
- If [assumption] does not hold after [validation activity], revisit the approach.

### 4.4 Validation Plan

<!--
One row per hypothesis from §4.1 and §4.2. Make the test concrete enough to execute.
Test Type distinguishes discovery validation (pre-build) from in-market validation (post-launch).
-->

| Hypothesis | Test Type | Method | Success Signal | Sample Size | Timeline | Owner |
|------------|-----------|--------|----------------|-------------|----------|-------|
| H1 (Primary) | Discovery | Moderated usability test on clickable prototype | ≥ 4/5 users complete core task unassisted | 5–8 users | Week 2 of design | @ux-researcher |
| H1 (Primary) | In-market | A/B test: new onboarding flow vs. control | Activation rate +20% at p < 0.05 | 2k users per arm | 4 weeks post-launch | @data-analyst |
| H2 | Discovery | Concept test with 1-pager + pricing | ≥ 60% "would definitely try" | 30 respondents | Week 1 of research | @user-researcher |

## 5. Goals & Success Metrics

### 5.1 Business Goals

<!--
Business goals measure company-level outcomes (revenue, market position, funding, brand).
Tier them into:
- Primary   : the 1-2 business outcomes this product MUST move to be considered successful.
- Secondary : supporting business outcomes that are valuable but not make-or-break.
Use the "Why this matters" column so execs can scan goals without reading the full problem statement.
Note: "Guardrail" semantics for business goals belong in §11.2 Risks, not in this table.
-->

| Type | Goal | Metric | Target | Timeframe | Why this matters |
|------|------|--------|--------|-----------|------------------|
| **Primary** | e.g., Achieve product-market fit | Weekly retention curve slope | Flat or positive after W8 | 8 weeks post-launch | Determines whether we keep investing in this product |
| **Primary** | e.g., Reach $X ARR | MRR | $X | 12 months post-launch | Proves commercial viability for the board and investors |
| **Secondary** | e.g., Build strategic brand presence | Share of voice in category | Top 3 | 12 months post-launch | Strengthens long-term positioning and inbound pipeline |
| **Secondary** | e.g., Establish investor narrative | Funding round closed | $XM raised | 18 months post-launch | Unlocks the next stage of company growth |

### 5.2 Product Goals

<!--
Use four metric tiers to give every goal a clear role:
- North Star   : the single metric that best captures long-term product value — move this and everything else should follow.
- Primary      : the 1-3 direct outcome metrics this feature is expected to move.
- Secondary    : supporting/leading indicators that explain *why* primary metrics moved.
- Guardrails   : hard limits — if crossed, the feature is reverted regardless of primary metric wins.
-->

**North Star Metric**
| Metric | Current Baseline | Target | Timeframe |
|--------|-----------------|--------|-----------|
| e.g., Weekly Active Users completing core action | 0 | > 10 k | 6 months post-launch |

**Primary Metrics** *(direct outcomes this feature must move)*
| Metric | Current Baseline | Target | Timeframe |
|--------|-----------------|--------|-----------|
| e.g., Feature activation rate | 0% | > 30% of DAUs | 3 months post-launch |

**Secondary Metrics** *(leading indicators & explanatory signals)*
| Metric | Current Baseline | Direction | Notes |
|--------|-----------------|-----------|-------|
| e.g., Onboarding completion rate | 0% | ↑ | Explains activation uplift |

**Guardrail Metrics** *(must NOT degrade — hard stop if crossed)*
| Metric | Current Baseline | Threshold | Action if breached |
|--------|-----------------|-----------|--------------------|
| e.g., P99 page load time | 800 ms | < 1 200 ms | Revert feature flag immediately |
| e.g., Support ticket volume | baseline | ≤ 110% of baseline | Escalate to PM + Eng lead |

### 5.3 Success Criteria (Go/No-Go)
What must be true for this feature to be considered a success?
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## 6. Target Audience

### 6.1 Primary Persona
- Name, role, context (reference `artifacts/output/02-research/user-personas.md`)
- Goals they want to achieve
- Pain points this feature addresses

### 6.2 Secondary Personas (if any)
- Brief description of who else benefits

### 6.3 Out of Target
- Explicitly who this is NOT for (prevents scope creep)

## 7. Feature Overview

### 7.1 What the Feature Does (Narrative)
Describe the feature in plain language as if explaining it to a customer. 2-3 paragraphs max.

### 7.2 Key Capabilities
List the high-level capabilities. Do NOT describe implementation — describe what the user can do.

1. **Capability name** — one-sentence description
2. **Capability name** — one-sentence description
3. **Capability name** — one-sentence description

### 7.3 Functional Requirements (Features)

<!-- 
CRITICAL RULE FOR PRODUCT MANAGERS:
1. DO NOT write high-level persona journeys or multi-step scenarios spanning multiple functional domains (e.g. "Rina scans QR, completes form, pays, gets label"). These are user journeys/personas, not developer-ready functional stories.
2. DO write granular, modular functional capabilities that focus on a single, testable, sprint-ready behavior.
3. Every requirement must have a dedicated Sprint assignment (e.g., Sprint 1, Sprint 2).
4. DO NOT use previous/legacy persona-based stories. Focus strictly on functional capabilities.
-->

Provide a brief summary of the functional requirements. These are strategic capabilities that will be translated into detailed user stories in the companion `user-stories.md` document.
Reference: `artifacts/output/03-strategy/user-stories.md`

| Requirement ID | Category | Description | Priority |
|----------------|----------|-------------|----------|
| FR-001 | Authentication | FR: user can login with secure credentials<br>- validate email format<br>- encrypt passwords at rest | [Must-have / Should-have / Could-have] |
| FR-002 | Authentication | FR: user can request password reset link via email<br>- generate single-use token valid for 1 hour<br>- send transactional email containing secure reset link | [Must-have / Should-have / Could-have] |


## 8. Non-Functional Requirements

| Requirement ID | Category | Description | Priority |
|----------------|----------|-------------|----------|
| NFR-001 | Performance | NFR: system must load pages in under 2 seconds<br>- measure home page loads<br>- measure dashboard responsiveness | Must-have |
| NFR-002 | Security | NFR: system must encrypt all PII data at rest<br>- encrypt user email addresses<br>- encrypt phone numbers | Must-have |
| NFR-003 | Scalability | NFR: system must support 10k concurrent users<br>- conduct load testing<br>- optimize query caching | Should-have |
| NFR-004 | Compliance | NFR: system must be fully GDPR and CCPA compliant<br>- automate right-to-be-forgotten requests<br>- log compliance audit events | Must-have |
| NFR-005 | Accessibility | NFR: system must conform to WCAG 2.1 AA guidelines<br>- enable full keyboard navigation<br>- provide high-contrast UI states | Must-have |
| NFR-006 | ML/AI | NFR: prediction models must maintain accuracy > 90%<br>- validate baseline performance on test set<br>- monitor prediction drift | Must-have |

## 9. Timeline & Phases

### 9.1 Phased Releases

> **Framework reference:** See `.agents/references/release-planning-frameworks.md` for all options (MoSCoW, RICE, Kano, Now/Next/Later, Value vs. Effort, WSJF) and when to use each.

**Selected framework:** [name]
**Reason for choice:** [one sentence]

| Phase / Horizon | Features | Priority / Score | Target Date |
|----------------|----------|-----------------|-------------|
| MVP | ... | ... | ... |
| V1.1 | ... | ... | ... |
| Future | ... | ... | ... |


### 9.2 Milestones
- [ ] **Milestone 1:** ... (date)
- [ ] **Milestone 2:** ... (date)

## 10. Out of Scope

Explicitly what is NOT included in this release. Be specific.

1. ...
2. ...
3. ...

## 11. Dependencies & Risks

### 11.1 Dependencies
| Dependency | Type | Status | Owner |
|------------|------|--------|-------|
| e.g., API v2 from Platform team | External | In progress | Platform team |

### 11.2 Risks & Mitigation

<!--
For each risk, assign:
- Likelihood  : Low / Medium / High
- Impact      : Low / Medium / High / Critical
- Status      : Open / Mitigated / Accepted / Closed
Sort by (Impact × Likelihood) descending so the top row is always the biggest threat.
-->

**Product & UX Risks**
| Risk | Likelihood | Impact | Mitigation | Owner | Status |
|------|------------|--------|------------|-------|--------|
| e.g., Low user adoption due to poor discoverability | Medium | High | Add in-app onboarding tooltips; measure activation within 14 days | PM | Open |

**Technical Risks**
| Risk | Likelihood | Impact | Mitigation | Owner | Status |
|------|------------|--------|------------|-------|--------|
| e.g., Third-party API rate limits under peak load | Medium | High | Implement request queuing + graceful degradation | Tech Lead | Open |

**Business & External Risks**
| Risk | Likelihood | Impact | Mitigation | Owner | Status |
|------|------------|--------|------------|-------|--------|
| e.g., Regulatory change invalidates core feature | Low | Critical | Monitor regulatory landscape quarterly; build modular compliance layer | Legal + PM | Open |

> **Pre-mortem prompt:** *Imagine it is 6 months post-launch and this feature failed spectacularly. What went wrong?*
> Write the top 3 failure modes here and turn each into a row above.

### 11.3 Assumptions to Validate
Reference assumptions from the idea brief that must hold true:
- [ ] A1: ... (validated by @researcher)
- [ ] A2: ... (validated by @user-researcher)

## 12. Open Questions & Decisions

| Question | Owner | Deadline | Status |
|----------|-------|----------|--------|
| ... | ... | ... | Open / Resolved |

## 13. Optional Components

### 13.1 ML/AI Requirements (if applicable)
- What ML capabilities are required for MVP vs. future phases?
- What training data is needed and who is responsible for it?
- What is the acceptable accuracy/latency trade-off?
- **Eval rubric & golden set:** which evaluation dataset gates this feature, and what pass threshold blocks release?
- **Hallucination budget:** maximum acceptable ungrounded-output rate, and how it is measured.
- **p95 inference latency budget:** the declared ceiling (with streaming TTFT if applicable).
- **Token cost ceiling:** cost-per-generation cap and the monthly budget that triggers arbitration (`@devops-engineer` FinOps owner).
- **Safety & governance rules:** input sanitization, PII redaction, output moderation, and the human-in-the-loop gate for high-impact actions.

### 13.2 Accessibility Requirements
- Target WCAG compliance level
- Assistive technology support requirements

## 14. Evidence Ledger (reverse mode only)

<!--
Reverse mode (/design reverse): populate BEFORE synthesis. Every behavioral statement
carries a `path#id` anchor (frozen A11 grammar: repo-relative path + one `#` + anchor token).
No anchor, no fact — a statement without resolvable evidence is `[OPEN]`, never invented.
`[DEFERRED TO SPEC]` marks infrastructure/telemetry/DB bounds that no prototype can prove
(Fidelity Partition, Review 10 §4). This section is parsed by `.agents/scripts/spec_parity.js`.
-->

| ID | Statement | Anchor (`path#id`) | Type | Status |
|---|---|---|---|---|
| L-01 | {behavioral statement} | `{path}#{anchor}` | prototype | confirmed |
| L-02 | {statement with no prototype evidence yet} | — | owner | `[OPEN]` |
| L-03 | {infrastructure/telemetry bound} | `{path}#{anchor}` | prototype | `[DEFERRED TO SPEC]` |

- **Type:** `prototype` (anchored to a prototype artifact or `prototype-inventory.md#INV-NN`) · `user` (anchored to a research artifact) · `owner` (anchored to a decision record).
- **Status:** `confirmed` · `[OPEN]` (question put to the owner — never filled by inference) · `[DEFERRED TO SPEC]` (fidelity partition).
- **Open questions** raised by `[OPEN]` rows are mirrored to §12; they do not block synthesis, but they must be listed in `parity-report.md`.

---

**Document info:**
- Version: 1
- Author: @product-manager
- Date: ...
- Next review: ...
- Spec kernel: `artifacts/output/03-strategy/SPEC.md`
- Companion document: `artifacts/output/03-strategy/user-stories.md`
- Supersedes: none (first generation)