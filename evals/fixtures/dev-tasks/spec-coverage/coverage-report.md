---
feature: "US-114 — Rate-limit the verification endpoint (fixture)"
generated: "2026-09-22"
stories: "evals/fixtures/dev-tasks/spec-coverage/user-stories.md"
---

# Spec Coverage Report — US-114 (fixture, 02o.1)

Coverage contract fixture for the orphan-AC sweep (02o.2) and the fidelity review (02o.3). Grammar: `{ac_id, evidence_ref[], mechanism, check}`; refs use the frozen A11 `path#id` anchor syntax.

## AC coverage

| AC id | Evidence refs | Mechanism | Check | Status |
|---|---|---|---|---|
| AC-H1 | `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js#allowRequest`, `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.test.js#allowRequest` | unit assertions cover capacity-honored behavior | `node evals/fixtures/dev-tasks/spec-coverage/rate-limiter.test.js` | covered |
| AC-U1 | `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js#TokenBucketRateLimiter`, `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.test.js#TokenBucketRateLimiter` | unit assertion covers reject-on-empty | `node evals/fixtures/dev-tasks/spec-coverage/rate-limiter.test.js` | covered |
| AC-E1 | `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js#refillRate`, `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.test.js#tokens` | deterministic refill stand-in asserted | `node evals/fixtures/dev-tasks/spec-coverage/rate-limiter.test.js` | covered |

## 10-class fidelity review

| Detail class | Status | Evidence / reason |
|---|---|---|
| Screen states (empty/loading/error) | deferred: no UI surface in this fixture scope | rate-limiter is a headless utility |
| Edge cases & validation | implemented | AC-U1 reject-on-empty assertion |
| Data fields & types | implemented | `capacity` / `refillRate` / `tokens` fields in `rate-limiter.js` |
| Permissions & auth | deferred: no auth surface in this fixture scope | endpoint auth lives outside the utility |
| Navigation & flows | deferred: no navigation surface in this fixture scope | headless utility |
| Copy & tone | deferred: no user-facing copy in this fixture scope | headless utility |
| Telemetry | deferred: metrics land with the service layer (owner: @developer, 2026-09-22) | not implemented in the utility |
| Performance notes | implemented | O(1) token-bucket checks |
| Accessibility | deferred: no UI surface in this fixture scope | headless utility |
| Platform constraints | deferred: runtime-agnostic utility (owner: @developer, 2026-09-22) | no platform branches |
