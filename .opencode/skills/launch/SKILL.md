---
name: launch
description: Go-to-market coordination — release readiness, stakeholder alignment, launch orchestration, and post-launch monitoring
---

## What this skill does

Takes a completed feature from development and ships it. Coordinates release readiness, launch orchestration, stakeholder communication, and post-launch monitoring. This is the bridge between "code is done" and "users have it."

**Previous skill:** `develop` (produces working, tested code)
**Next skill:** After launch, load `iterate` for post-launch improvements or `retro` for process review.

## Prerequisites

Before starting, verify:
- [ ] All tasks in `artifacts/output/04-planning/execution-plan.md` are complete
- [ ] Code review and QA passed
- [ ] PM signed off on the feature

## Workflow steps

### Step 1: Release Readiness Review

Invoke `@product-manager` to assess launch readiness across all dimensions:

**Checklist — every item must pass:**
- [ ] All acceptance criteria from user stories are met
- [ ] Code review passed with no blocking issues
- [ ] QA validated all acceptance criteria pass
- [ ] PM signed off on feature completeness
- [ ] Security review completed (if applicable — see @security-engineer)
- [ ] Performance benchmarks within thresholds (if applicable — see @performance-engineer)
- [ ] Documentation is updated (@technical-writer)
- [ ] Migration scripts tested and rollback plan exists
- [ ] Feature flags configured (if rolling out incrementally)
- [ ] Monitoring and alerting configured (@devops-engineer)

**Any red item blocks launch.** Document yellow items as known risks with mitigation plans.

**Output:** `artifacts/output/06-launch/release-readiness.md` (Use template: `.opencode/templates/release-readiness-template.md`)

### Step 2: Go/No-Go Decision (gate)

Invoke `@product-manager` and `@product-manager` to make the launch call:
- Review release readiness checklist
- Assess known risks and their mitigations
- Confirm target release date and time
- Define rollback criteria (what triggers a rollback, who decides)
- Confirm stakeholder notification plan

**Gate check:** Both @product-manager and @product-manager must agree on GO.
If either says NO-GO, document the blocking issue and resolve before retrying.

**Output:** `artifacts/output/06-launch/go-nogo-decision.md` (Use template: `.opencode/templates/go-nogo-decision-template.md`)

### Step 3: Launch Preparation (parallelizable)

Steps 3a and 3b can run **in parallel**.

#### Step 3a: Infrastructure ⟨parallel⟩
Invoke `@devops-engineer` to prepare deployment:
- Finalize deployment pipeline and runbook
- Configure feature flags for phased rollout (if applicable)
- Set up canary/monitoring checks
- Verify rollback procedures
- Prepare deployment communication

#### Step 3b: Documentation ⟨parallel⟩
Invoke `@technical-writer` to finalize:
- Release notes
- Migration guides (if applicable)
- User-facing documentation updates
- Known issues documentation

**Output:** Deployment runbook (in launch-log), release notes (Use template: `.opencode/templates/release-notes-template.md`), migration guides

### Step 4: Launch Execution

Invoke `@devops-engineer` and `@product-manager` to execute the launch:
- Deploy to production following the runbook
- Monitor health checks and key metrics
- Verify feature flags and gradual rollout
- Track real-time error rates and user impact

**Output:** `artifacts/output/06-launch/launch-log.md` (Use template: `.opencode/templates/launch-log-template.md`)

### Step 5: Post-Launch Monitoring

Invoke `@data-analyst` and `@product-manager` to monitor:
- Track core metrics against success criteria from the PRD
- Monitor error rates, latency, and system health
- Watch user adoption and feature usage
- Collect early user feedback

**Duration:** Monitor for 24-72 hours depending on feature scope.

**If issues are found:**
- **Critical:** Rollback immediately, invoke `incident` skill
- **Medium:** Hotfix path via `@developer` → `@code-reviewer` → `@qa-engineer`
- **Low:** Log for next iteration via `iterate` skill

**Output:** `artifacts/output/06-launch/post-launch-report.md` (Use template: `.opencode/templates/post-launch-report-template.md`)

### Step 6: Launch Retrospective (quick)

Invoke `@product-manager` to conduct a launch retro:
- What went well in the launch process?
- What could be improved for next time?
- Were there any near-misses?
- Update runbook and checklist based on learnings

Write learnings to memory:
```
@memory-controller write lessons-learned.md
### [LESSON] {title} [date: YYYY-MM-DD] [agent: @product-manager]
{launch lesson}
**Status:** active
```

Write session summary:
```
@memory-controller session-write
Worked on: Product launch — {feature name}
Decisions made:
- {go/no-go decision and rationale}
- {any rollout decisions}
Next step: Monitor post-launch metrics for 24-72h, then load iterate
New blockers: {any issues found during launch, or "none"}
```

**Output:** `artifacts/output/06-launch/launch-retro.md`

## Output artifacts
- `artifacts/output/06-launch/release-readiness.md`
- `artifacts/output/06-launch/go-nogo-decision.md`
- `artifacts/output/06-launch/launch-log.md`
- `artifacts/output/06-launch/post-launch-report.md`
- `artifacts/output/06-launch/launch-retro.md`

## When to use
Use this when:
1. Development is complete and all QA gates have passed
2. The feature needs to go live for users
3. You need coordinated release orchestration

## Handoff
After launch:
- For feature improvements based on user data → load `iterate`
- For process review and team improvement → load `retro`
- For production incidents → load `incident`

---

## State Machine Integration

The pipeline state machine (`node .opencode/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run via `@executor`:
```bash
node .opencode/scripts/orchestrator_state.js status
```

If pipeline is uninitialized, run `squad` first (or `init` directly). Then run `next` to confirm the project is in the development phase and that all required development artifacts are present.

### At End — Record Completion

Record each launch artifact:

```bash
node .opencode/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/release-readiness.md
node .opencode/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/go-nogo-decision.md
node .opencode/scripts/orchestrator_state.js complete --agent devops-engineer --artifact 06-launch/launch-log.md
node .opencode/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/post-launch-report.md
node .opencode/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/launch-retro.md
```

Record only the artifacts actually produced. The post-launch report is the critical one — once it's recorded, `iterate` becomes the natural next skill.