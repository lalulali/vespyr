---
step: 7
name: Quality Gates
prerequisites:
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
  - step-06 completed
---

# Step 7 — Quality Gates

QA is a hard gate. Security and performance are conditional gates. They can run in parallel once the dev loop completes.

## 7a. QA (hard gate — cannot be skipped)

`@qa-engineer`:
- Writes and runs comprehensive tests against acceptance criteria (AC-H, AC-U, AC-E)
- If bugs found, feeds back to developer for fixes
- Re-tests after fixes until all criteria pass
- Reports final coverage and remaining known issues

**Loop limit:** Max 2 QA-dev cycles per bug. If same bug resurfaces after 2 fix attempts, escalate to `@tech-lead`.

**Output:** `artifacts/output/06-quality/report.md`
Structure: `Test Run Summary, Pass/Fail by Suite, Open Defects, Release Recommendation`

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent qa-engineer --artifact 06-quality/report.md
```

## 7b. Security Audit (conditional)

Invoke `@security-engineer` when the feature touches:
- Authentication, authorization, or session management
- Sensitive data (PII, payments, health records)
- External APIs or third-party integrations

**Output:** `artifacts/output/06-quality/findings-report.md`
Structure: `Severity, File:Line, Issue, Suggested Fix, Blocker?`

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent security-engineer --artifact 06-quality/findings-report.md
```

If any Critical or High findings:
```
@memory-controller write blockers-and-risks.md
### [SEC] Critical/High finding: {finding summary} [date: YYYY-MM-DD] [agent: @security-engineer]
{file:line, issue, suggested fix, blocker status}
**Status:** active
```

## 7c. Performance Review (conditional)

Invoke `@performance-engineer` when the feature:
- Impacts core user paths (page load, key interactions)
- Handles large data sets or high traffic
- Has defined performance SLAs in the spec

**Output:** `artifacts/output/06-quality/report.md`

## Halt condition
- QA finds a bug that can't be reproduced locally
- Security finding rated Critical or High
- Performance benchmark exceeds SLA by >20%

## Delegation
- Reads: @reader (QA reports, security findings)
- Writes: @writer (quality reports, findings-report.md)
- Runs: @executor (orchestrator_state.js complete)
- Memory: @memory-controller (blockers-and-risks for Critical/High findings)
