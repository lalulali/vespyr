---
step: 1
name: Exploratory Enrichment
prerequisites:
  - PRD or user stories exist in artifacts/output/03-strategy/
output_contract:
  citations: not-required
---

# Step 1 — Exploratory Enrichment

Before running tests, `@qa-engineer` enriches the acceptance criteria by identifying scenarios the product spec missed.

## Workflow

### 1a. Load baseline

Read:
- `artifacts/output/03-strategy/user-stories.md` — existing acceptance criteria
- `artifacts/output/03-strategy/product-spec.md` — UX flows and screen states
- `artifacts/output/03-strategy/requirements.md` or `SPEC.md` — capability definitions

### 1b. Storm missing scenarios

Apply Socratic gap discovery against the loaded baseline. For each user story, ask:

1. **Boundary values** — What inputs are at the edge? Min, max, null, empty, oversized?
2. **Timing** — What breaks if things happen out of order? Concurrent? Delayed? Repeated?
3. **Failure modes** — What external dependency can fail? Network? DB? Auth? Rate limit?
4. **User behavior** — What does a distracted user do? A malicious user? A first-time user?
5. **State transitions** — Are there invalid state sequences? What happens on double-submit?

### 1c. Output discovered scenarios

Write `artifacts/output/05-execution/quality/enrichment-findings.md`:

```markdown
# QA Enrichment Findings
**Date:** YYYY-MM-DD
**Agent:** @qa-engineer
**Based on:** {user stories and product spec reviewed}

## Newly Discovered Scenarios
| # | Story Ref | Scenario Type | Description | Expected Behavior | Severity |
|---|-----------|---------------|-------------|-------------------|----------|
| 1 | US-001 | Boundary | {scenario} | {expected} | High/Med/Low |

## Assumptions Challenged
| # | Assumption | Challenge | Resolution |
|---|-----------|-----------|------------|

## Spec Gaps Found
| # | Gap | Impact | Recommended Fix |
|---|-----|--------|----------------|
```

### 1d. Gate check

**Non-negotiable:** QA must identify at least 3 newly discovered scenarios (edge cases, failure modes, or boundary conditions) not already covered by existing acceptance criteria. If fewer than 3, the PRD is unusually thorough — document this finding and proceed. If zero, the QA exploration was insufficient — repeat 1b with deeper Socratic probing.

## Memory closeout
- `@memory-controller session-write` — record step 1 exploratory enrichment progress.

## Delegation
- **Memory:** @memory-controller for session-write

