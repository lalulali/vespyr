---
name: incident
description: Production incident management — triage, mitigate, root-cause analysis, and post-incident review
---

## What this skill does

When something breaks in production, this skill provides the structured process to triage, mitigate, analyze, and prevent recurrence. It is not for feature development — it is for when the system is down, errors are spiking, or users are reporting critical problems.

**This skill is reactive.** It is invoked when a production issue is detected, not during normal development.

## Workflow steps

### Step 1: Triage

Invoke `@product-manager` to lead triage:
- **Severity classification:**
  - **SEV1 (Critical):** Service down, data loss, security breach → all hands, immediate response
  - **SEV2 (High):** Major feature broken, significant user impact → urgent response, 4-hour target
  - **SEV3 (Medium):** Feature degraded, workaround exists → next business day
  - **SEV4 (Low):** Minor issue, cosmetic, low impact → backlog
- **Assign incident commander** (default: @product-manager)
- **Assemble responders** based on issue type:
  - Infrastructure issue → @devops-engineer + @architect
  - Application bug → @developer + @tech-lead
  - Security incident → @security-engineer + @devops-engineer
  - Performance degradation → @performance-engineer + @architect
- **Open incident channel** — create `artifacts/output/08-incidents/INC-NNN/` directory

**Output:** `artifacts/output/08-incidents/INC-NNN/triage.md` (Use template: `.agents/templates/incident/incident-triage-template.md`)

### Step 2: Mitigate

The first priority is **user impact reduction**, not root cause.

Invoke appropriate responders to:
- Stop the bleeding: rollback, feature flag off, scale up, redirect traffic
- Communicate status to stakeholders (internal and external if applicable)
- Preserve evidence: logs, traces, screenshots, user reports
- Document what was done and timeline

**Key rule:** Mitigate first, analyze second. Never debug in production when a rollback fixes the user-facing issue.

**Output:** `artifacts/output/08-incidents/INC-NNN/mitigation.md`

### Step 3: Root-Cause Analysis

Once users are unblocked, invoke `@architect` or `@tech-lead` to lead RCA:
- **5 Whys analysis** — drill to root cause
- **Timeline reconstruction** — from first signal to mitigation
- **Contributing factors** — what conditions allowed this to happen
- **Detection gaps** — why wasn't this caught before reaching users
- **Prevention mechanisms** — what would stop this class of issue in the future

**Output:** `artifacts/output/08-incidents/INC-NNN/rca.md` (Use template: `.agents/templates/incident/rca-template.md`)

### Step 4: Remediation (parallelizable)

Invoke appropriate agents for the fix. Code fix and monitoring improvements can run **in parallel**.

#### Step 4a: Code Fix ⟨parallel⟩
Invoke `@developer` (or `@devops-engineer` for infra issues) to:
- Fix the root cause
- Add regression tests that would have caught this

Then (sequential within this path):
- `@code-reviewer` reviews the fix
- `@qa-engineer` validates the fix and regression tests
- `@devops-engineer` deploys the fix

**Loop limit:** Max 2 review cycles on the incident fix. If the fix is still contested, the incident commander (@product-manager) makes the ship/rollback call.

#### Step 4b: Monitoring Improvements ⟨parallel⟩
Invoke `@devops-engineer` to:
- Improve monitoring/alerting to detect similar issues earlier
- Update runbooks with the new failure mode

**Output:** `artifacts/output/08-incidents/INC-NNN/remediation.md`

### Step 5: Post-Incident Review

Invoke `@product-manager` to conduct a blameless post-incident review:
- **What happened** — timeline of events
- **What was the impact** — users affected, duration, data impact
- **What was the root cause** — from RCA
- **What was the mitigation** — what stopped the bleeding
- **What was the remediation** — what prevents recurrence
- **What went well** — things that worked (monitoring, response time, etc.)
- **What could be improved** — detection, response, communication, prevention
- **Action items with owners and deadlines**

**Output:** `artifacts/output/08-incidents/INC-NNN/post-incident-review.md` (Use template: `.agents/templates/incident/post-incident-review-template.md`)

### Step 6: Update Knowledge Base

Invoke `@product-manager` to write incident learnings to memory via `@memory-controller`:

```
@memory-controller write blockers-and-risks.md
### [RISK] {incident title} [date: YYYY-MM-DD] [agent: @product-manager] [RESOLVED: YYYY-MM-DD]
{new risks identified from this incident}
**Status:** resolved

@memory-controller write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @product-manager]
{incident lessons — what happened, root cause, prevention}
**Status:** active

@memory-controller write patterns-and-conventions.md
### [PROCESS] {title} [date: YYYY-MM-DD] [agent: @product-manager]
{new guardrail or operational pattern established}
**Status:** active
```

Write session summary:
```
@memory-controller session-write
Worked on: Incident response — INC-NNN ({brief description})
Decisions made:
- Severity: {SEV level}
- Mitigation: {what was done to stop user impact}
- Root cause: {one sentence}
- Prevention: {key action item}
Next step: {follow-up improvements via iterate, or "monitoring for recurrence"}
New blockers: {any new risks identified, or "none"}
```

## Output artifacts
- `artifacts/output/08-incidents/INC-NNN/triage.md`
- `artifacts/output/08-incidents/INC-NNN/mitigation.md`
- `artifacts/output/08-incidents/INC-NNN/rca.md`
- `artifacts/output/08-incidents/INC-NNN/remediation.md`
- `artifacts/output/08-incidents/INC-NNN/post-incident-review.md`

## When to use
Use this when:
1. A production service is down or critically degraded
2. Error rates spike unexpectedly
3. Security vulnerability is discovered in production
4. Data integrity issue is detected
5. Performance degrades below SLA thresholds

## Key principles
- **Mitigate first, analyze second.** Reduce user impact before finding root cause.
- **Blameless.** Focus on systems and processes, not people.
- **Document everything.** Future incident responders need the timeline.
- **Close the loop.** Every incident must produce at least one prevention action item.
- **No silent fixes.** Every remediation goes through review and QA, even in an incident.

## Severity-specific SLAs

| Severity | Response Time | Mitigation Target | Update Cadence |
|----------|--------------|-------------------|----------------|
| SEV1 | 15 minutes | 1 hour | Every 30 minutes |
| SEV2 | 30 minutes | 4 hours | Every hour |
| SEV3 | 4 hours | Next business day | Daily |
| SEV4 | Next business day | Next sprint | Weekly |

## Handoff
- After incident is resolved → load `iterate` to address follow-up improvements
- If incident reveals architectural issues → load `develop` for broader redesign
- If incident response process needs review → load `retro`

---

## State Machine Integration

The pipeline state machine (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run via `@executor`:
```bash
node .agents/scripts/orchestrator_state.js status
```

If pipeline is uninitialized (e.g., the project has no pipeline state yet but has a live incident), initialize with the current project name and type before recording. If the pipeline is mid-workflow, do NOT advance the phase — incident work happens in parallel.

### At End — Record Completion

For each incident directory `artifacts/output/08-incidents/INC-NNN/`, record the artifacts produced:

```bash
node .agents/scripts/orchestrator_state.js complete --agent devops-engineer --artifact 08-incidents/INC-NNN/triage.md
node .agents/scripts/orchestrator_state.js complete --agent devops-engineer --artifact 08-incidents/INC-NNN/mitigation.md
node .agents/scripts/orchestrator_state.js complete --agent architect --artifact 08-incidents/INC-NNN/rca.md
node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 08-incidents/INC-NNN/remediation.md
node .agents/scripts/orchestrator_state.js complete --agent devops-engineer --artifact 08-incidents/INC-NNN/post-incident-review.md
```

Replace `INC-NNN` with the actual incident ID. The `developer` `complete` call will trigger a code-graph refresh, ensuring the next agent (e.g., a follow-up `architect` reviewing the architectural impact) sees the new code state.

**File a Change Request for cross-team fixes.** If remediation requires a change in another team's domain (e.g., a UX change requested by the architect but owned by the product manager), file a CR:

```bash
node .agents/scripts/orchestrator_state.js file-cr --from developer --to product-manager --target <file> --issue "<issue>"
```

This creates an open CR in `pipeline-state.json` that blocks phase advancement until resolved.