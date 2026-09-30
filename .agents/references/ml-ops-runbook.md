# ML Ops Runbook

> **Owner:** `@ml-ai-ops` (Atlas). The model card (`artifacts/output/04-architecture/model-approved-for-production.md`) is the upstream contract; this runbook is the operating procedure that fulfills it.

## 1. Serving SLA

- Record the inference endpoint's p95 latency ceiling and availability target from the model card.
- Graceful degradation: when the model or vector index is unavailable, the endpoint falls back deterministically — never fail open to raw errors.

## 2. Shadow promotion

1. Route production traffic to the new model/prompt in shadow mode for the card's declared N-day window.
2. Compare against the live baseline: win rate, critical-regression rate, latency, and token cost.
3. Promotion requires: shadow window complete + gate criteria met + a rehearsed rollback on record (see §4).

## 3. Drift monitoring

- **Semantic drift:** cosine distance of live embeddings against the pinned reference baseline; alert on the card's declared threshold.
- **Reference refresh cadence:** refresh the reference baseline on a defined schedule (stale baselines produce false confidence).
- **Token-cost telemetry:** alert at >10% inflation vs. baseline; the shared eval baseline gate blocks promotion at its recorded threshold (default 15%).
- **Eval gate:** the Golden Dataset harness (`tools/eval/baseline.js`, exit 2 = blocked) shares one pinned baseline with `@qa-engineer` — pre-ship and deploy-time checks cannot disagree.

## 4. Rollback procedure & rehearsal

- **Trigger:** eval pass-rate drop, drift breach, error-rate spike, or token-cost breach beyond the declared ceiling.
- **Steps:** revert serving revision, index version, and prompt version to the pinned previous set; verify with a smoke eval.
- **Rehearsal:** rehearse the rollback before promotion and record date, operator, and observed restore time in the model card §6. An unrehearsed rollback is a hope, not a plan.

## 5. Escalation

| Situation | Route |
|---|---|
| Model card incomplete (no eval evidence, SLAs, or rollback) | Block promotion; return to `@ml-ai-engineer` |
| Serving infrastructure scaling beyond model config | `@devops-engineer` |
| Inference latency ceiling under current architecture | `@architect` |
| Token-cost anomaly / budget breach | `@devops-engineer` (FinOps owner) |
| Endpoint abuse / model-extraction surface | `@security-engineer` |
