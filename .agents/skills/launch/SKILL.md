---
name: launch
description: Go-to-market coordination — release readiness, deployment, smoke testing, post-launch monitoring, and completion. Use when the user says "ship it", "launch this feature", "deploy to production", "are we ready to release", or invokes /launch once development is complete.
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
---
# Launch — Multi-Step Workflow

<!-- router-skill -->

Takes a completed feature from development and ships it. The bridge between "code is done" and "users have it."

## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps or reorder them.
- Every readiness gate must pass before deployment. No exceptions.
- The UTTERLY SATISFIED team gate must pass before deployment. Every active, relevant agent must be `SATISFIED`; unresolved `CHANGES REQUESTED` or `BLOCKED` states are a hard NO-GO.
- Each step file is a contract. Read it fully before executing.

## When to use
- Development is complete and all QA gates have passed
- Feature needs to go live for users
- Coordinated release orchestration is required
- Release orchestration and deployment are led by `@devops-engineer`

## Skill chain
- Prev: `develop` (produces working, tested code)
- Next: `iterate` (post-launch improvements), `retro` (process review), or `incident` (production issues)

## Two surfaces — every step

`/launch` ends by telling the owner two different things, and they must not be confused:

- **Document surface** — `release-readiness.md`, `go-nogo-decision.md` and `launch-log.md` carry
  the machine record: the gate table, the verdict, the scan result. Plain sentence first, then
  the table.
- **Chat surface** — the reply carries the plain sentence, the consequence, and the next action.
  **Never** a gate token, and never a card field (`VERDICT:`, `Disposition:`, `Because:`). A
  reader who has never seen this engine must be able to act on the sentence alone
  (`.agents/references/vespyr-dna.md` §Two surfaces).

State the consequence, not the label. `GO` is not "go" — it is "the scan is clean, two
conditions are open with owners and dates, and here is who closes them before Wednesday."

## Halt conditions
Any one is a hard NO-GO on deployment:
- The UTTERLY SATISFIED team gate has not passed — every active, relevant agent must record `SATISFIED`; an unresolved `CHANGES REQUESTED` or `BLOCKED` blocks the release
- `qa-signoff.md` is missing or is not `GO`/`CONDITIONAL` — **checked** by `launch_readiness_check.js`
- `security-scan.js` exits non-zero, or exits 2 (tool failure). A scanner failure is never read as clean
- A scan pass is quoted as wider than it is — the scan covers the **product scope** declared in `security/audit-spec.json`
  (`scope.product_roots`), not the whole repository, and `verdict` is `SKIPPED` rather than `PASS` when launch is out of scope.
  Branch on `verdict`, never on `ok` alone
- A Critical or High security finding is open
- A rollback plan does not exist for the release

## Done when
- `launch_readiness_check.js check --require-readiness --require-scan` exits 0 **and** reports `verdict: PASS`
  (a `SKIPPED` run means `release-readiness.md` is absent — that is not a pass). Pass
  `--scan-allowlist security/reviewed-allowlist.json` when the repo has one; omitting it scans
  unfiltered, and a named-but-missing allowlist fails the gate.
- All five step files are in `stepsCompleted`
- `artifacts/output/06-launch/launch-log.md` exists
- Post-launch monitoring thresholds are defined and the smoke test has passed against production
- `@memory-controller session-write` has run

## Prerequisites
- All tasks in `artifacts/output/05-planning/execution-plan.md` are complete
- Code review passed, QA validated, PM signed off
- `qa-signoff.md` exists with GO/CONDITIONAL
- `artifacts/output/06-launch/release-readiness.md` contains the completed UTTERLY SATISFIED team gate

**All four are checked by `launch_readiness_check.js` at step 01**, with `--require-readiness`.
Until that gate existed they were prose on a page nobody could falsify — and `security-scan.js`,
a real 11-rule scanner including `INJ-SECRET`, was invoked by **zero skills**.

## Step sequence
1. **Readiness Check** — verify all pre-launch gates → `steps/step-01-readiness-check.md`
2. **Deploy** — deploy to production → `steps/step-02-deploy.md`
3. **Smoke Test** — validate production deployment → `steps/step-03-smoke-test.md`
4. **Monitor** — post-launch observation → `steps/step-04-monitor.md`
5. **Launch Log** — write completion report → `steps/step-05-launch-log.md`

## State & memory integration
At start: `node .agents/scripts/orchestrator_state.js status`. If uninitialized, run `init` first, then `next`.

**At start:** Load context before readiness check:
```
@memory-controller load product-manager [launch — {feature or release name}]
```

**At step-05 (launch log):** Write launch decisions to memory:
```
@memory-controller write active-decisions.md
### [OPS] Launch decisions — {release name} [date: YYYY-MM-DD] [agent: @devops-engineer]
{key decisions: deployment target, rollback plan, monitoring thresholds, feature flags}
**Status:** active
```

At end: `node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 06-launch/launch-log.md`
**Memory:** Step 05 closes with `@memory-controller session-write` — mandatory per GUARDRAILS §Session Continuity.
