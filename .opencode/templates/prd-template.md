# PRD Template

> **Used by:** @product-manager → **Feeds into:** @product-designer, @architect, @tech-lead, @developer, @data-analyst
> **Save to:** `artifacts/output/02-strategy/requirements.md`

**Version:** 1
**Last changed:** YYYY-MM-DD
**Change log:**
- v1: Initial draft

Use this template when writing the Product Requirements Document.

This document is for **management and business teams** — keep it strategic, not technical.

---

## 1. Executive Summary

**One paragraph (3-5 sentences)** that answers:
- What problem are we solving?
- Who is it for?
- What is the proposed solution at the highest level?
- What is the expected business impact?

## 2. Problem Statement

### 2.1 Current Pain
- What is happening today that shouldn't be?
- Who feels this pain and how often?
- What is the cost of this problem (time, money, risk, churn)?

### 2.2 Evidence
- Research findings that support this problem (cite `artifacts/output/01-research/`)
- Key quotes from user research (`artifacts/output/01-research/user-personas.md`)
- Market data points that show the opportunity (`artifacts/output/01-research/market-analysis.md`)

### 2.3 Opportunity
- What changes if we solve this?
- What is the upside (revenue, retention, efficiency, competitive advantage)?

## 3. Goals & Success Metrics

### 3.1 Business Goals
| Goal | Metric | Target | Timeframe |
|------|--------|--------|-----------|
| e.g., Reduce churn | Monthly churn rate | < 5% | 6 months post-launch |

### 3.2 Product Goals
| Goal | Metric | Target | Timeframe |
|------|--------|--------|-----------|
| e.g., Increase adoption | Feature activation rate | > 30% of DAUs | 3 months post-launch |

### 3.3 Success Criteria (Go/No-Go)
What must be true for this feature to be considered a success?
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## 4. Target Audience

### 4.1 Primary Persona
- Name, role, context (reference `artifacts/output/01-research/user-personas.md`)
- Goals they want to achieve
- Pain points this feature addresses

### 4.2 Secondary Personas (if any)
- Brief description of who else benefits

### 4.3 Out of Target
- Explicitly who this is NOT for (prevents scope creep)

## 5. Feature Overview

### 5.1 What the Feature Does (Narrative)
Describe the feature in plain language as if explaining it to a customer. 2-3 paragraphs max.

### 5.2 Key Capabilities
List the high-level capabilities. Do NOT describe implementation — describe what the user can do.

1. **Capability name** — one-sentence description
2. **Capability name** — one-sentence description
3. **Capability name** — one-sentence description

### 5.3 Functional Requirements (Features)

<!-- 
CRITICAL RULE FOR PRODUCT MANAGERS:
1. DO NOT write high-level persona journeys or multi-step scenarios spanning multiple functional domains (e.g. "Rina scans QR, completes form, pays, gets label"). These are user journeys/personas, not developer-ready functional stories.
2. DO write granular, modular functional capabilities that focus on a single, testable, sprint-ready behavior.
3. Every requirement must have a dedicated Sprint assignment (e.g., Sprint 1, Sprint 2).
4. DO NOT use previous/legacy persona-based stories. Focus strictly on functional capabilities.
-->

Provide a brief summary of the functional requirements. These are strategic capabilities that will be translated into detailed user stories in the companion `user-stories.md` document.
Reference: `artifacts/output/02-strategy/user-stories.md`

| Requirement ID | Category | Description | Priority |
|----------------|----------|-------------|----------|
| FR-001 | Authentication | FR: user can login with secure credentials<br>- validate email format<br>- encrypt passwords at rest | [Must-have / Should-have / Could-have] |
| FR-002 | Authentication | FR: user can request password reset link via email<br>- generate single-use token valid for 1 hour<br>- send transactional email containing secure reset link | [Must-have / Should-have / Could-have] |


## 6. Non-Functional Requirements

| Requirement ID | Category | Description | Priority |
|----------------|----------|-------------|----------|
| NFR-001 | Performance | NFR: system must load pages in under 2 seconds<br>- measure home page loads<br>- measure dashboard responsiveness | Must-have |
| NFR-002 | Security | NFR: system must encrypt all PII data at rest<br>- encrypt user email addresses<br>- encrypt phone numbers | Must-have |
| NFR-003 | Scalability | NFR: system must support 10k concurrent users<br>- conduct load testing<br>- optimize query caching | Should-have |
| NFR-004 | Compliance | NFR: system must be fully GDPR and CCPA compliant<br>- automate right-to-be-forgotten requests<br>- log compliance audit events | Must-have |
| NFR-005 | Accessibility | NFR: system must conform to WCAG 2.1 AA guidelines<br>- enable full keyboard navigation<br>- provide high-contrast UI states | Must-have |
| NFR-006 | ML/AI | NFR: prediction models must maintain accuracy > 90%<br>- validate baseline performance on test set<br>- monitor prediction drift | Must-have |

## 7. Timeline & Phases

### 7.1 Phased Releases (MoSCoW)
| Phase | Features | Priority | Target Date |
|-------|----------|----------|-------------|
| MVP | Core capabilities | Must-have | ... |
| V1.1 | Enhanced capabilities | Should-have | ... |
| Future | Nice-to-haves | Could-have | ... |

### 7.2 Milestones
- [ ] **Milestone 1:** ... (date)
- [ ] **Milestone 2:** ... (date)

## 8. Out of Scope

Explicitly what is NOT included in this release. Be specific.

1. ...
2. ...
3. ...

## 9. Dependencies & Risks

### 9.1 Dependencies
| Dependency | Type | Status | Owner |
|------------|------|--------|-------|
| e.g., API v2 from Platform team | External | In progress | Platform team |

### 9.2 Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| e.g., User adoption is lower than expected | Medium | High | Build onboarding flow, measure activation |

### 9.3 Assumptions to Validate
Reference assumptions from the idea brief that must hold true:
- [ ] A1: ... (validated by @researcher)
- [ ] A2: ... (validated by @user-researcher)

## 10. Open Questions & Decisions

| Question | Owner | Deadline | Status |
|----------|-------|----------|--------|
| ... | ... | ... | Open / Resolved |

## 11. Optional Components

### 11.1 ML/AI Requirements (if applicable)
- What ML capabilities are required for MVP vs. future phases?
- What training data is needed and who is responsible for it?
- What is the acceptable accuracy/latency trade-off?

### 11.2 Accessibility Requirements
- Target WCAG compliance level
- Assistive technology support requirements

---

**Document info:**
- Version: 2.0
- Author: @product-manager
- Date: ...
- Next review: ...
- Companion document: `artifacts/output/02-strategy/user-stories.md`
- Supersedes: v1.0 (added ML/AI §11.1, Assumptions to Validate §9.3)