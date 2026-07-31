---
step: 7
name: Quality Gates
prerequisites:
  - step-06 completed
delegation:
  reads: "@reader (QA reports, security findings; per delegation-policy.md multi-file)"
  writes: "@writer (quality reports, findings-report.md)"
  runs: "@executor (orchestrator_state.js complete; per delegation-policy.md all bash)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 7 — Quality Gates

QA is a hard gate. Security and performance are conditional gates. They can run in parallel once the dev loop completes.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 7`
## 7a. QA (hard gate — cannot be skipped)

**Auto-execution rule (non-negotiable):** QA runs automatically without asking the user. The swarm does NOT block on human input — QA proceeds automatically. Humans review test results asynchronously via `report.md`. Do NOT ask "should I run tests?" or "want me to write tests?" — just run them.

`@qa-engineer`:
- Writes and runs comprehensive tests against acceptance criteria (AC-H, AC-U, AC-E)
- If bugs found, feeds back to developer for fixes
- Re-tests after fixes until all criteria pass
- Reports final coverage and remaining known issues

**Loop limit:** Max 2 QA-dev cycles per bug. If same bug resurfaces after 2 fix attempts, escalate to `@tech-lead`.

**Output:** `artifacts/output/05-execution/quality/qa-report.md`
Structure: `Test Run Summary, Pass/Fail by Suite, Open Defects, Release Recommendation`

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent qa-engineer --artifact 05-execution/quality/qa-report.md
```

## 7b. Security Audit (conditional)

**Auto-decision rule (non-negotiable):** Determine whether this gate applies by checking the spec-kernel and user stories yourself. Do NOT ask the user. If the spec mentions auth, PII, payments, or external APIs → invoke `@security-engineer` automatically. If the spec contains none of these → skip this gate silently and note "Security gate skipped — no auth/sensitive-data/API surface detected."

Invoke `@security-engineer` when the feature touches:
- Authentication, authorization, or session management
- Sensitive data (PII, payments, health records)
- External APIs or third-party integrations

**Output:** `artifacts/output/05-execution/quality/findings-report.md`
Structure: `Severity, File:Line, Issue, Suggested Fix, Blocker?`

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent security-engineer --artifact 05-execution/quality/findings-report.md
```

If any Critical or High findings:
```
@memory-controller write blockers-and-risks.md
### [SEC] Critical/High finding: {finding summary} [date: YYYY-MM-DD] [agent: @security-engineer]
{file:line, issue, suggested fix, blocker status}
**Status:** active
```

## 7c. Performance Review (conditional)

**Auto-decision rule (non-negotiable):** Determine whether this gate applies by checking the spec-kernel and user stories yourself. Do NOT ask the user. If the spec mentions core user paths, large data sets, or performance SLAs → invoke `@performance-engineer` automatically. If the spec contains none of these → skip this gate silently and note "Performance gate skipped — no core-path/data/SLA surface detected."

Invoke `@performance-engineer` when the feature:
- Impacts core user paths (page load, key interactions)
- Handles large data sets or high traffic
- Has defined performance SLAs in the spec

**Output:** `artifacts/output/05-execution/quality/performance-report.md`

## Halt condition
- QA finds a bug that can't be reproduced locally
- Security finding rated Critical or High
- Performance benchmark exceeds SLA by >20%

## Delegation
- **Reads:** @reader for QA reports and security findings
- **Writes:** @writer for quality reports and findings-report.md
- **Runs:** @executor for orchestrator_state.js complete
- **Memory:** @memory-controller for blockers-and-risks (Critical/High findings)

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 7`
