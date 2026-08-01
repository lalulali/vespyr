# Execution Plan Template

> **Used by:** Grant (@tech-lead)
> **Feeds into:** Rex (@developer), Nova (@data-analyst), Kai (@ml-ai-engineer)
> **Save to:** `artifacts/output/04-planning/execution-plan.md`

**Version:** 1
**Last changed:** YYYY-MM-DD
**Change log:**
- v1: Initial draft

Use this template when writing the development execution plan.

This document breaks the work into tasks that developers can pick up and complete independently. It is the bridge between architecture and code.

---

## 1. Plan Overview

### 1.1 Scope
What is being built in this plan? Reference the product spec and user stories.

- Product spec: `artifacts/output/02-strategy/product-spec.md`
- User stories: `artifacts/output/02-strategy/user-stories.md`
- Architecture: `artifacts/output/03-architecture/`

### 1.2 Timeline
| Phase | Duration | Target Date | Deliverable |
|-------|----------|-------------|-------------|
| Phase 1: Foundation | 1 week | ... | Core infrastructure, auth, database schema |
| Phase 2: Core Features | 2 weeks | ... | US-001 through US-005 |
| Phase 3: Polish & QA | 1 week | ... | Testing, bug fixes, performance tuning |
| **Total** | **4 weeks** | | |

### 1.3 Team & Parallelization
Which tasks can run in parallel? Who owns what?

| Developer | Tasks | Parallel With |
|-----------|-------|---------------|
| Dev A | Auth, user management | — |
| Dev B | Core API, database | Dev A (after schema is ready) |
| Dev C | Frontend screens, integration | Dev B (after API contracts defined) |

### 1.4 Optional Agent Activation
Based on `idea-brief.md`, which optional agents are engaged?

- [ ] @ml-ai-engineer — ML-specific tasks (see §X)
- [ ] @data-analyst — instrumentation plan (will deliver during Phase 1)
- [ ] @performance-engineer — performance audit before release

---

## 2. Task Breakdown

### 2.1 Task: [Task Name]

**Task ID:** T-001
**Story IDs:** US-001, US-002
**Priority:** Must-have
**Effort:** Small / Medium / Large
**Delegation:** required / optional / none
**Assigned:** [Developer name or "TBD"]
**Dependencies:** T-XXX (must complete before), T-YYY (can run in parallel)
**ML-related:** [Yes/No — if Yes, reference ML engineer task M-XX]

#### Definition of Done
- [ ] Code implemented following architecture ADRs
- [ ] Unit tests cover happy path + primary error paths
- [ ] Integration tests verify API contracts
- [ ] Code review approved by @code-reviewer
- [ ] QA tests pass against acceptance criteria in user stories
- [ ] No regressions in existing test suite
- [ ] Documentation updated (API docs, runbooks, inline comments only if non-obvious)
- [ ] Performance benchmarks within threshold (if applicable)
- [ ] Security review completed (if applicable)

#### Files to Create / Modify
```
src/
  components/
    NewComponent.tsx          [NEW]
  api/
    routes/
      new-route.ts            [NEW]
    services/
      existing-service.ts     [MODIFY — add method X]
  tests/
    new-component.test.ts     [NEW]
    new-route.test.ts         [NEW]
```

#### Key Implementation Details
- What patterns from `artifacts/output/03-architecture/` should be followed?
- What are the critical implementation choices?
- What edge cases must be handled? (Reference user story AC-U* and AC-E*)
- What is the API contract? (request/response shapes, error codes)

#### Testing Requirements
- Which acceptance criteria from user stories must this task verify?
- What test coverage target? (e.g., >80% branch coverage)
- Any load or performance tests needed?

#### Risk & Unknowns
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ... | ... | ... | ... |

---

### 2.2 [ML Task: if applicable]

**Task ID:** M-001
**Story IDs:** US-XXX (maps to user stories that require ML)
**Priority:** Must-have / Should-have
**Effort:** Small / Medium / Large
**Assigned:** @ml-ai-engineer
**Dependencies:** T-XXX (data pipeline must be ready), T-YYY (API contract defined)

#### Definition of Done
- [ ] Data pipeline implemented and validated
- [ ] Model trained and evaluated against acceptance criteria (AC-ML-1)
- [ ] Inference endpoint deployed and tested (AC-ML-2: latency target)
- [ ] Fallback behavior implemented and tested (AC-ML-3)
- [ ] Bias audit completed (AC-ML-4)
- [ ] Drift monitoring configured (AC-ML-5)
- [ ] Retraining pipeline operational (AC-ML-6)
- [ ] A/B test plan documented and approved

#### Model Details
- **Problem type:** [classification / regression / generation / ranking / recommendation]
- **Training data source:** [where and how much]
- **Model architecture:** [with justification]
- **Evaluation metrics:** [accuracy, precision, recall, F1, latency]
- **Baseline performance:** [simple heuristic / rule-based baseline]

---

### 2.3 Task: [Next Task Name]
[Same structure as 2.1]

---

## 3. Dependency Graph

Visual representation of task order:

```
T-001 (Schema) ──▶ T-002 (API) ──▶ T-004 (Frontend)
     │                │
     └──▶ T-003 (Auth) ────────────▶ T-005 (Integration)

M-001 (ML Pipeline) ──▶ M-002 (Model Training) ──▶ T-004 (Integration)
```

**Critical path:** T-001 → T-002 → T-004 (longest dependency chain)
**Parallelizable:** T-003 can run alongside T-002 after T-001

---

## 4. Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|------------|--------|------------|-------|
| R1 | API latency exceeds 200ms p95 | Medium | High | Add caching layer (ADR-003); load test in Phase 2 | Tech lead |
| R2 | Third-party API changes contract | Low | High | Abstract behind adapter; integration test catches breaks | Dev B |
| R3 | Scope creep from PM | Medium | Medium | Weekly scope review; change request process | Tech lead |
| R4 | Key developer unavailable | Low | Medium | Cross-training; pair programming on critical tasks | Tech lead |

---

## 5. Spikes & Investigation Tasks

Tasks that must happen before committing to implementation:

| Spike | Question | Effort | Blocks | Owner |
|-------|----------|--------|--------|-------|
| S-001 | "Can our database handle 10k concurrent writes?" | 2 days | T-002, T-005 | Dev A |
| S-002 | "Does the third-party SDK support webhooks?" | 1 day | T-003 | Dev B |
| S-ML-001 | "Is the training dataset large enough for production accuracy?" | 3 days | M-001, M-002 | ML Engineer |

Rules:
- Spikes are time-boxed (1-3 days max)
- Spikes produce a decision, not production code
- If a spike fails, the plan is updated before proceeding

---

## 6. Quality Gates

| Gate | When | What It Checks | Pass Criteria |
|------|------|----------------|---------------|
| Code review | After each task | Correctness, patterns, security | Zero blocking issues from @code-reviewer |
| QA validation | After dev loop | AC coverage, edge cases | All AC-H, AC-U, AC-E pass |
| PM verification | After QA | Matches spec, meets business goals | PM signs off |
| Security audit | Before ship | OWASP, vulnerabilities | Zero Critical/High findings from @security-engineer |
| Performance audit | Before ship | Latency, throughput | Meets NFR targets in PRD from @performance-engineer |
| UX research | Before dev handoff (if @ux-researcher activated) | Usability, accessibility, IA | Zero Critical/serious findings; or @product-designer has documented rationale for proceeding |
| ML validation | Before ship (if applicable) | Model accuracy, latency, bias | All AC-ML* criteria pass |

---

## 7. Post-Release

| Activity | Owner | Timing |
|----------|-------|--------|
| Monitor production errors | @devops-engineer | Continuous |
| Track business metrics vs. targets | @data-analyst | Daily / Weekly |
| Monitor model performance (if ML) | @ml-ai-engineer | Continuous |
| Collect user feedback | @user-researcher | Within 2 weeks |
| Retrospective | @tech-lead | Within 1 week |

---

**Document info:**
- Version: 2.0
- Author: @tech-lead
- Date: ...
- Inputs: `artifacts/output/02-strategy/product-spec.md` + `artifacts/output/02-strategy/user-stories.md` + `artifacts/output/03-architecture/`
- Optional agent inputs: @ml-ai-engineer (if activated)