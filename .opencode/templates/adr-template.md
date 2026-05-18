you# Architecture Decision Record (ADR) Template

> **Used by:** @architect → **Feeds into:** @developer, @tech-lead, @security-engineer, @devops-engineer, @qa-engineer
> **Save to:** `artifacts/output/03-architecture/adr-NNN-short-name.md`

Use this template when documenting significant architectural decisions. Each ADR is a permanent record of a decision and its rationale.

An ADR is **not** for trivial choices (e.g., "we used camelCase"). It is for decisions that:
- Are expensive to reverse
- Have significant trade-offs
- Affect multiple parts of the system
- Will be questioned in 6 months

---

## ADR-NNN: [Short Title]

**Status:** Proposed / Accepted / Deprecated / Superseded by ADR-XXX
**Date:** ...
**Deciders:** @architect, @tech-lead, [stakeholders]
**Input:** `artifacts/output/02-strategy/product-spec.md` + `artifacts/output/02-strategy/user-stories.md`

---

## 1. Context

### 1.1 Problem Statement
What problem are we solving? Why does this decision matter?

### 1.2 Forces at Play
What constraints and requirements are shaping this decision?

| Force | Description | Priority |
|-------|-------------|----------|
| e.g., Scalability | Must support 10k concurrent users within 12 months | Must-have |
| e.g., Team expertise | Team has 3 years of Node.js, zero Go experience | Constraint |
| e.g., Time to market | MVP must ship in 8 weeks | Must-have |
| e.g., Compliance | Must be SOC 2 Type II compliant | Must-have |
| e.g., ML requirements | Model inference must complete in <100ms | Must-have (if ML applicable) |
| ... | ... | ... |

### 1.3 Business Context
How does this decision affect business outcomes?

- What happens if we get this wrong? (cost, delay, risk)
- What happens if we get this right? (speed, advantage, flexibility)
- What is the "decay timeline" — how long until this decision needs revisiting?

### 1.4 Alignment with Upstream Decisions
Ties this ADR back to strategy:
- Referenced PRD section: `artifacts/output/02-strategy/requirements.md` §X.Y
- Referenced user stories: US-XXX, US-YYY
- Referenced product spec section: `artifacts/output/02-strategy/product-spec.md` §Z

---

## 2. Decision

### 2.1 What We Decided
State the decision in one clear sentence.

> Example: "We will use PostgreSQL as the primary database with Redis for caching and session storage."

### 2.2 Why This Option Won

Compare against the serious alternatives (not strawmen):

| Criteria | Chosen Option: [X] | Alternative A: [Y] | Alternative B: [Z] |
|----------|-------------------|-------------------|-------------------|
| **Performance** | Meets 10k user target | Same | Requires more tuning |
| **Operational cost** | $500/mo managed | $200/mo self-hosted | $800/mo managed |
| **Team ramp-up** | 1 week | 3 weeks | 2 weeks |
| **Ecosystem** | Rich ORMs, monitoring | Minimal | Growing |
| **Lock-in risk** | Low (SQL standard) | High (proprietary) | Medium |
| **Migration path** | Straightforward | Difficult | Moderate |

**Key differentiator:** [The one reason this option won. Be honest about trade-offs.]

### 2.3 Trade-offs We Accepted

What did we give up? Every decision has downsides.

| Trade-off | Impact | Mitigation |
|-----------|--------|------------|
| e.g., Higher operational cost than self-hosted | $300/mo more | Use managed service to save engineering time; revisit at 100k users |
| e.g., Vendor lock-in for managed service | Medium | Data exportable via standard SQL; can migrate to self-hosted if needed |
| ... | ... | ... |

### 2.4 ML Considerations (if applicable)
- How does this decision affect ML model training or inference?
- Does this create data pipeline requirements?
- Impact on model serving latency or feature availability?

---

## 3. Consequences

### 3.1 Positive
- What capabilities does this unlock?
- What future decisions become easier?
- What risks does this reduce?

### 3.2 Negative
- What new risks does this introduce?
- What future decisions become harder?
- What technical debt are we accepting?

### 3.3 Neutral / Notes
- What are we explicitly NOT deciding here? (Prevents scope creep)
- What related decisions are blocked until this one is implemented?

### 3.4 Downstream Impact
- **@developer:** How does this affect implementation patterns?
- **@devops-engineer:** What infrastructure requirements does this create?
- **@security-engineer:** Any new security boundaries or concerns?
- **@performance-engineer:** Any new performance constraints or targets?

---

## 4. Validation

### 4.1 How Do We Know This Was the Right Decision?
What metrics or signals would confirm this decision was correct?

- [ ] Metric 1: [e.g., "Query p95 < 100ms at 10k users"]
- [ ] Metric 2: [e.g., "Zero unplanned downtime in first 3 months"]
- [ ] Metric 3: ...

### 4.2 When Do We Revisit This Decision?
Every architectural decision should have a re-evaluation trigger:

- **Time-based:** Revisit in [6 months / 1 year] or when we hit [X users / Y revenue]
- **Event-based:** Revisit if [specific condition happens]
- **Success criteria:** If [metric] exceeds [threshold], consider migration to [alternative]

---

## 5. Related Decisions

| ADR | Relationship | Description |
|-----|-------------|-------------|
| ADR-001 | Parent | This decision builds on the database choice in ADR-001 |
| ADR-003 | Blocks | Cannot implement caching strategy until this ADR is accepted |
| ... | ... | ... |

---

## 6. References

- Product spec: `artifacts/output/02-strategy/product-spec.md` (Section X.Y)
- User stories: `artifacts/output/02-strategy/user-stories.md` (US-XXX)
- Spike/prototype: [link if applicable]
- External resources: [blog posts, papers, RFCs that informed the decision]

---

## 7. Amendment History

| Date | Author | Change | Reason |
|------|--------|--------|--------|
| ... | @architect | Created | Initial proposal |
| ... | @tech-lead | Amended §2.2 | Added alternative after developer feedback |

---

**Document info:**
- Version: 2.0
- Author: @architect
- Date: ...
- Review date: ...
- Supersedes: ADR-XXX (if applicable)
- Status: [Proposed / Accepted / Deprecated]
