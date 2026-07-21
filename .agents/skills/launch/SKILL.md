---
name: launch
description: Go-to-market coordination — release readiness, deployment, smoke testing, post-launch monitoring, and completion
---

# Launch — Multi-Step Workflow

Takes a completed feature from development and ships it. The bridge between "code is done" and "users have it."

## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps or reorder them.
- Every readiness gate must pass before deployment. No exceptions.
- Each step file is a contract. Read it fully before executing.

## When to use
- Development is complete and all QA gates have passed
- Feature needs to go live for users
- Coordinated release orchestration is required

## Skill chain
- Prev: `develop` (produces working, tested code)
- Next: `iterate` (post-launch improvements), `retro` (process review), or `incident` (production issues)

## Prerequisites
- All tasks in `artifacts/output/04-planning/execution-plan.md` are complete
- Code review passed, QA validated, PM signed off
- `qa-signoff.md` exists with GO/CONDITIONAL

## Step sequence
1. **Readiness Check** — verify all pre-launch gates → `steps/step-01-readiness-check.md`
2. **Deploy** — deploy to production → `steps/step-02-deploy.md`
3. **Smoke Test** — validate production deployment → `steps/step-03-smoke-test.md`
4. **Monitor** — post-launch observation → `steps/step-04-monitor.md`
5. **Launch Log** — write completion report → `steps/step-05-launch-log.md`

## State & memory integration
At start: `node .agents/scripts/orchestrator_state.js status`. If uninitialized, run `squad` first, then `next`.
At end: `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/launch-log.md`
**Memory:** Step 05 closes with `@memory-controller session-write` — mandatory per GUARDRAILS §Session Continuity.
