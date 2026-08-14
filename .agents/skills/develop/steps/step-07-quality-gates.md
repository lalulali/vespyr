---
step: 7
name: Quality Gates
prerequisites:
  - step-06 completed
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

### 7a. Motion QA (conditional hard gate)

Run this gate when `artifacts/output/03-strategy/motion-spec.md` or `artifacts/output/05-planning/motion-handoff.md` exists. Motion work cannot pass QA on generic component tests alone.

`@qa-engineer` must add a `## Motion Verification` section to `qa-report.md` covering:
- [ ] Every `MO-###` maps to one spec prompt, one user story, one implementation reference, and one QA assertion.
- [ ] Timing is within the prompt's numeric tolerance, default `±16ms` unless the prompt documents another tolerance.
- [ ] Trigger, keyboard focus, hover, and state-transition behavior are verified.
- [ ] `prefers-reduced-motion: reduce` is tested with browser emulation and preserves state meaning.
- [ ] Informational motion has a persistent non-motion equivalent.
- [ ] Automatically moving content lasting more than five seconds alongside other content has pause/stop/hide control unless essential.
- [ ] Flashing is checked against WCAG 2.3.1 thresholds.
- [ ] Non-essential interaction-triggered animation can be disabled unless essential, per WCAG 2.3.3.
- [ ] Only `transform` and `opacity` are animated; no layout properties, filters, or other animated properties are present.
- [ ] Performance evidence shows the target framerate on a mid-range device.
- [ ] Motion tokens match `design.md`; SSR/hydration behavior is covered where applicable.

Any missing motion evidence is a QA failure and sends the task back to `@developer` or `@product-designer`.

### 7c. Accessibility Audit (A11Y.md hard gate)

`@qa-engineer` conducts an accessibility audit enforcing [fecarrico/A11Y.md](https://github.com/fecarrico/A11Y.md/blob/main/docs/en/A11Y.md) severity thresholds:
- [ ] 🔴 **CRITICAL:** Keyboard operability, focus management, semantic HTML elements — zero unlogged failures allowed.
- [ ] 🟠 **HIGH:** Contrast ratios (4.5:1 text, 3:1 UI), min target sizes (24x24px / 44x44px), image `alt` text resolution, media controls — zero unlogged failures allowed.
- [ ] **Artifacts generated:** `artifacts/output/06-quality/a11y-report.md` (audit report) and `artifacts/output/06-quality/EXCEPTIONS.md` (if any approved WCAG SC exceptions exist).

Any unlogged 🔴 CRITICAL or 🟠 HIGH violation blocks release sign-off.

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

## 7d. UTTERLY SATISFIED collaboration gate

Before leaving quality gates, identify every active agent whose domain is
affected by the release and collect a satisfaction state using
`.agents/references/utter-satisfaction.md`.

- `SATISFIED` requires evidence and resolved feedback.
- `CHANGES REQUESTED` or `BLOCKED` sends the work back to the responsible owner.
- `NOT ACTIVATED` requires a specific out-of-scope reason.
- After two unsuccessful feedback cycles on the same issue, escalate through
  the workflow ladder; do not mark the issue satisfied to preserve schedule.

The team cannot proceed to PM verification or launch readiness until all active
agents are `SATISFIED`.

## Halt condition
- QA finds a bug that can't be reproduced locally
- Security finding rated Critical or High
- Performance benchmark exceeds SLA by >20%

## Delegation
- **Memory:** @memory-controller for blockers-and-risks (Critical/High findings)

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 7`
