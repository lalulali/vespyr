---
step: 3
name: Criteria Backport
prerequisites:
  - step-02a completed
  - step-02b completed
delegation:
  reads: "@reader (enrichment-findings.md, feature + fullcycle results; per delegation-policy.md multi-file)"
  writes: "@writer (updated user-stories.md, updated product-spec.md; per delegation-policy.md multi-file output)"
  runs: none
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 3 — Criteria Backport

Append newly discovered scenarios and test findings back to the project's acceptance criteria. This closes the QA → Product feedback loop, ensuring edge cases captured during testing are formalized into requirements.

## Workflow

### 3a. Consolidate findings

`@qa-engineer` reviews all outputs:
- `artifacts/output/06-quality/enrichment-findings.md` (step 01)
- `artifacts/output/06-quality/feature-test-results.md` (step 02a)
- `artifacts/output/06-quality/fullcycle-test-results.md` (step 02b)

Identify scenarios that belong in the acceptance criteria:
- Edge cases not covered by existing AC-H/AC-U/AC-E
- Integration failure modes not anticipated
- Data consistency requirements not specified
- Timing/race conditions not documented

### 3b. Backport to user stories

Delegate to `@writer` to update `artifacts/output/02-strategy/user-stories.md`:

Append a new section at the end of the file:

```markdown
## Acceptance Criteria (QA Enriched)

*Enriched by @qa-engineer on {date}. These scenarios were discovered during exploratory testing and formalized for traceability.*

| ID | Story Ref | Scenario | Expected Behavior | Discovered By | Severity |
|----|-----------|----------|-------------------|---------------|----------|
| QA-001 | US-{NNN} | {scenario} | {expected} | Step 01: Enrichment | High |
| QA-002 | US-{NNN} | {scenario} | {expected} | Step 02b: Full-Cycle | Med |
```

### 3c. Flag spec gaps

If test findings reveal requirements that the PRD/SPEC doesn't address, delegate to `@writer` to update `product-spec.md`:

```markdown
## QA-Discovered Requirements
*Appended by @qa-engineer on {date}*

| # | Finding | Impact | Recommended Spec Update |
|---|---------|--------|-------------------------|
```

### 3d. Verify backport

**Gate check:** Every enrichment finding from step 01 must be accounted for:
- Backported to user stories, OR
- Flagged as a spec gap, OR
- Documented as "unreachable in practice" with justification

## Delegation
- **Reads:** @reader for enrichment-findings.md, feature-test-results.md, fullcycle-test-results.md
- **Writes:** @writer for updated user-stories.md and product-spec.md
- **Runs:** none
