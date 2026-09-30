# Model Approved for Production

> **Producer:** `@ml-ai-engineer` (Kai) — this card is the deployment contract. **Handoff consumer:** `@ml-ai-ops` (Atlas), who owns the serving pipeline from this point.
> **Integration contract:** the model-serving integration (endpoint shape, auth, schemas) must match §1–§4 before promotion.

## 1. Model Identity
- **Model Name / Version**: 
- **Task / Purpose**: 
- **Type**: (e.g. LLM, RAG, SLM, Classification)

## 2. Evaluation Results & Provenance
- **Evaluation Dataset Path & Hash**: (e.g. `evals/suites/model-benchmarks.json`, SHA-256)
- **Evaluation Output Artifact**: `eval-results.json` (machine-readable metrics compliant with telemetry schema)
- **Deterministic Hard Floors**: Biomarkers passed (SCR=1.0, MSHA=1.0, PD=0.0, PCI=0.0)
- **Metrics**: Accuracy/Win Rate vs. Baseline, Hallucination Rate, Precision/Recall/F1
- **Inter-Rater Agreement ($\kappa$)**: ($\ge 0.70$ shadow judge calibration)

## 3. SLA Targets & Budgets
- **Latency P95 Target**: 
- **Token Cost Budget per Transaction**: 
- **Token Inflation Ceiling vs. Baseline**: $\le 10\%$
- **Throughput Expectations**: 

## 4. Fallback Behavior & Graceful Degradation
- **Deterministic Heuristic Fallback**: 
- **Timeout Threshold**: (e.g. `AbortSignal.timeout(30000)`)
- **Rate Limit (429) & Error (500) Policy**: 

## 5. Deployment, Shadow Routing & Drift Monitoring
- **Hardware Requirements / Provider Endpoints**: 
- **Shadow Routing Plan**: $N$-day shadow traffic verification against baseline before production promotion
- **Shadow Promotion Gate Criteria**: Win rate vs. baseline $\ge 50\%$, 0% critical regression rate
- **Reference Embedding Baseline**: Path & hash to reference vector baseline for drift monitoring
- **Semantic Drift Threshold**: Maximum allowable cosine distance shift $\Delta$ before alert
- **Prompt Caching Strategy**: 
- **Vector DB Index Info (if RAG)**: 
- **Closed-Loop Telemetry**: Production drift & fallback trips feed directly into next-generation Golden Eval Dataset

## 6. Rollback Procedure & Rehearsal Record (required — no card, no deploy)
- **Rollback Trigger**: the metric/threshold that forces a rollback (e.g. eval pass-rate drop, drift breach, error-rate spike).
- **Traffic Restore SLO**: how fast traffic returns to the previous version (e.g. < 5 minutes via pinned revision).
- **Rollback Steps**: the exact commands/paths to revert serving + index + prompt versions.
- **Last Rehearsal Date & Result**: a rollback that has never been rehearsed is a hope, not a plan — record date, operator, and observed restore time.
