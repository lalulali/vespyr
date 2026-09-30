# FinOps & Cloud-Cost Guidelines

> **Owner:** `@devops-engineer` (Axel) — single owner of FinOps / cloud-cost arbitration.
> **Related owners:** `@architect` owns the AI/token-cost scaling *model* at the architecture layer; `@performance-engineer` supplies utilization/load data; `@ml-ai-ops` supplies token-cost telemetry; `@product-manager` decides when a budget ceiling changes scope.

## 1. Cost allocation

- Tag every billable resource with `service`, `environment`, and `team` (cost-allocation tags) — untagged spend is unattributable and therefore unmanageable.
- Surface spend on a cost dashboard alongside the operational dashboards; review monthly.

## 2. Budget alerts

- Configure budget thresholds with alerting at **50% / 80% / 100%** of the monthly budget so overruns are caught before the invoice, not after.
- The 100% alert is a blocking signal: new spend increases require arbitration before proceeding.

## 3. Rightsizing loop

1. `@performance-engineer` provides utilization and load-test data.
2. `@devops-engineer` recommends and applies instance/resource rightsizing — never by gut feel.
3. Downsize idle/over-provisioned resources; flag reserved-capacity/savings-plan opportunities.
4. Record every rightsizing action with before/after cost and the utilization evidence.

## 4. Arbitration (who decides what)

| Conflict | Arbitrator | Resolution artifact |
|---|---|---|
| Token-cost vs. infra-cost trade-off | `@devops-engineer` | Cost decision note in the ops log |
| AI cost-scaling model vs. serving reality | `@devops-engineer` (arbitrates), `@architect` supplies the model | Updated cost projection in the AI-ADR |
| Budget ceiling forces scope change | `@product-manager` (scope), `@founder` if strategic | Decision record in `active-decisions.md` |
| Blocked promotion due to token inflation | `@devops-engineer` + `@ml-ai-ops` | Promotion unblock requires either a cost fix or an explicit budget exception from `@product-manager` |

## 5. Blocked-promotion resolution (required path)

A model promotion blocked by the token-cost gate is not resolved by retrying. It resolves by one of:
1. **Cost fix** — caching, prompt compression, smaller model, or batching, verified by re-running the eval gate.
2. **Budget exception** — `@product-manager` records an explicit, dated exception with the expected spend increase.

Until one of these is recorded, the promotion stays blocked — no silent overrides.
