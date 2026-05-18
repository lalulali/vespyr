# Measurement Plan Template

> **Used by:** @data-analyst → **Feeds into:** @developer, @qa-engineer, @performance-engineer, @ml-engineer
> **Save to:** `artifacts/output/02-strategy/measurement-plan.md`

Use this template when defining analytics instrumentation and success metrics.

This document ensures the feature can be measured from day one. If you can't measure it, you can't improve it.

---

## 1. Measurement Overview

### 1.1 Purpose
What business questions must this measurement plan answer?

- Are users adopting the feature?
- Are users successfully completing key actions?
- Is the feature driving the expected business outcome?
- Where are users dropping off?

### 1.2 Input Documents
- PRD: `artifacts/output/02-strategy/requirements.md` (business goals, success metrics)
- User stories: `artifacts/output/02-strategy/user-stories.md` (user behaviors to track)
- Product spec: `artifacts/output/02-strategy/product-spec.md` (screens, flows, interactions)
- Architecture: `artifacts/output/03-architecture/` (system constraints, data models)

---

## 2. Success Metrics (North Star)

### 2.1 Primary Metric
The one metric that matters most.

| Field | Value |
|-------|-------|
| **Metric name** | ... |
| **Definition** | Precise calculation (e.g., "% of users who complete checkout within 7 days of signup") |
| **Target** | ... |
| **Baseline** | Current value before feature launch |
| **Timeframe** | When do we evaluate? (e.g., "30 days post-launch") |
| **Source** | Which system captures this? (database query, analytics event, BI tool) |

### 2.2 Secondary Metrics
Supporting metrics that explain the primary metric.

| # | Metric | Definition | Target | Why It Matters |
|---|--------|-----------|--------|----------------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |

### 2.3 Guardrail Metrics
Metrics that must NOT get worse.

| Metric | Definition | Threshold | If Exceeded |
|--------|-----------|-----------|-------------|
| e.g., Page load time | p95 load time for feature screens | < 2s | Rollback or optimize |
| e.g., Error rate | % of API calls returning 5xx | < 0.1% | Stop rollout, investigate |

### 2.4 ML Metrics (if applicable)
Metrics specific to ML model performance, tracked alongside business metrics.

| Metric | Definition | Target | Monitoring Frequency | Owner |
|--------|-----------|--------|---------------------|-------|
| e.g., Prediction accuracy | % of correct predictions on holdout set | > 90% | Weekly | @ml-engineer |
| e.g., Inference latency p95 | 95th percentile prediction time | < 100ms | Continuous | @performance-engineer |
| e.g., Data drift score | Statistical distance between training and live distributions | < threshold | Daily | @ml-engineer |
| e.g., Model staleness | Days since last retraining | < 7 days | Weekly | @ml-engineer |

---

## 3. Event Tracking Plan

### 3.1 Event Taxonomy

Every user action worth measuring is an event.

| Event Name | Trigger | Properties | Business Question |
|-----------|---------|------------|-------------------|
| `feature_viewed` | User lands on feature screen | `screen_name`, `referrer`, `user_id` | "How many users discover the feature?" |
| `feature_activated` | User completes key action for first time | `user_id`, `time_to_activation_hours` | "How long does activation take?" |
| `feature_used` | User completes key action (repeat) | `user_id`, `action_type`, `duration_seconds` | "How often do users return?" |
| `feature_abandoned` | User leaves flow before completion | `user_id`, `step_reached`, `time_spent_seconds` | "Where do users drop off?" |
| `error_occurred` | System error during feature use | `error_code`, `error_message`, `user_id`, `screen` | "What is breaking and for whom?" |

### 3.2 ML-Specific Events (if applicable)

| Event Name | Trigger | Properties | Business Question |
|-----------|---------|------------|-------------------|
| `prediction_requested` | Model receives inference request | `model_version`, `feature_values`, `prediction`, `confidence` | "How often is the model queried?" |
| `prediction_fallback` | Model unavailable, fallback used | `fallback_type`, `original_prediction`, `user_id` | "How often does the fallback trigger?" |
| `model_feedback` | User provides feedback on prediction | `prediction_id`, `actual_outcome`, `user_id` | "Is the model getting accurate feedback?" |
| `model_drift_detected` | Statistical drift detected | `drift_score`, `affected_features`, `drift_method` | "When does data drift occur?" |

### 3.3 Event Specifications

For each critical event, define exactly when it fires:

#### Event: `feature_activated`

**Trigger condition:**
- WHEN: User completes [specific action]
- WHERE: [Screen or API endpoint]
- WHO: [Logged-in user only? Anonymous allowed?]

**Properties:**

| Property | Type | Required | Example | Description |
|----------|------|----------|---------|-------------|
| `user_id` | String | Yes | "usr_12345" | Unique user identifier |
| `feature_name` | String | Yes | "checkout_v2" | Feature identifier |
| `time_to_activation_hours` | Number | Yes | 48 | Hours from signup to first use |
| `device_type` | String | No | "mobile" | mobile / tablet / desktop |
| `referrer` | String | No | "email_campaign" | How user discovered feature |

**Validation rules:**
- `user_id` must be non-null for logged-in users
- `time_to_activation_hours` must be >= 0
- Fires exactly once per user (first activation only)

**Backend counterpart:**
- Database table: `user_activations`
- Columns: `user_id`, `feature_name`, `activated_at`, `properties_jsonb`
- Unique constraint: `(user_id, feature_name)`

### 3.4 User Property Updates

What user-level properties change as a result of feature usage?

| Property | Type | Update Trigger | Value |
|----------|------|----------------|-------|
| `feature_adopter` | Boolean | `feature_activated` fires | true |
| `activation_date` | Date | `feature_activated` fires | timestamp |
| `feature_usage_count` | Number | Each `feature_used` event | increment by 1 |

---

## 4. Funnel Analysis

Map the user journey and identify drop-off points:

| Step | Event | % Users Reaching | % Users Dropping Off | Target |
|------|-------|------------------|----------------------|--------|
| 1. Feature viewed | `feature_viewed` | 100% | — | — |
| 2. Feature engaged | `feature_interaction_started` | 40% | 60% | > 50% |
| 3. Feature activated | `feature_activated` | 15% | 25% (of engaged) | > 30% |
| 4. Feature retained (7d) | `feature_used` within 7 days | 8% | 7% (of activated) | > 15% |

**Key insight:** [Where is the biggest drop-off? What does it mean?]

---

## 5. Dashboard Specifications

### 5.1 Real-Time Monitoring
Metrics that need immediate visibility:

| Metric | Alert Threshold | Alert Channel | Owner |
|--------|----------------|---------------|-------|
| Error rate | > 0.5% | PagerDuty | On-call engineer |
| Feature activation rate (hourly) | < 5% of expected | Slack #alerts | Data analyst |
| Inference error rate (if ML) | > 1% | PagerDuty | @ml-engineer |

### 5.2 Daily Dashboard
Metrics reviewed every day:

- [ ] Total feature activations
- [ ] Activation rate (% of users who saw feature)
- [ ] Error rate
- [ ] Average time to activation
- [ ] ML prediction volume (if applicable)

### 5.3 Weekly Review Dashboard
Metrics reviewed in team sync:

- [ ] Cohort retention (Day 1, Day 7, Day 30)
- [ ] Feature adoption by segment (user type, device, geography)
- [ ] Funnel drop-off rates
- [ ] Guardrail metric status
- [ ] Model accuracy trends (if ML)
- [ ] Data drift indicators (if ML)

### 5.4 Monthly Business Review Dashboard
Metrics for leadership:

- [ ] Primary metric vs target
- [ ] Secondary metrics trends
- [ ] ROI calculation (revenue or cost impact)
- [ ] Comparison to PRD success criteria
- [ ] ML model performance summary (if applicable)

---

## 6. A/B Test Design (if applicable)

### 6.1 Hypothesis
> "If we [change], then [metric] will [increase/decrease] by [amount] because [reasoning]."

### 6.2 Experiment Design

| Field | Value |
|-------|-------|
| **Variant A (Control)** | Current experience |
| **Variant B (Treatment)** | [Describe the change] |
| **Primary metric** | ... |
| **Secondary metrics** | ... |
| **Sample size** | N = [calculated based on effect size and power] |
| **Duration** | [X days / until significance reached] |
| **Allocation** | 50/50 |
| **Success criteria** | [Metric] shows [statistically significant] [increase/decrease] of [minimum detectable effect] |

### 6.3 Randomization Unit
How are users assigned to variants?

- [ ] User ID (consistent across sessions)
- [ ] Session ID (may see different variants)
- [ ] Device ID

### 6.4 Avoiding Bias
- [ ] Exclude users who saw both variants
- [ ] Check pre-experiment metric balance
- [ ] Monitor for novelty effect (initial spike that fades)

---

## 7. Data Dictionary

### 7.1 Event Catalog
Alphabetical list of all events:

| Event Name | Category | Description | First Implemented |
|-----------|----------|-------------|-------------------|
| `error_occurred` | System | Something went wrong | v1.0 |
| `feature_activated` | Feature | User completes key action for first time | v1.0 |
| ... | ... | ... | ... |

### 7.2 Property Catalog
Alphabetical list of all properties:

| Property | Type | Events Used In | Description |
|----------|------|----------------|-------------|
| `device_type` | String | All | mobile / tablet / desktop |
| `error_code` | String | `error_occurred` | HTTP status or internal code |
| ... | ... | ... | ... |

---

## 8. Privacy & Compliance

### 8.1 PII Handling
What personally identifiable information is collected?

| Data | Collection Method | Storage | Retention | GDPR/CCPA Action |
|------|------------------|---------|-----------|------------------|
| `user_id` | Server-side hash | Database | 2 years | Pseudonymized; deletable on request |
| `email` | Not collected in events | — | — | — |

### 8.2 Consent
- [ ] Users are informed of analytics collection in privacy policy
- [ ] Users can opt out of non-essential tracking
- [ ] Event data is not shared with third parties without consent

### 8.3 Data Retention
- Raw event data: [X days / months]
- Aggregated metrics: [Indefinitely / X years]
- User deletion: Events purged within [X days] of account deletion request

---

## 9. ML Model Monitoring (if applicable)

### 9.1 Model Performance Tracking
| Metric | Target | Alert Threshold | Check Frequency |
|--------|--------|----------------|----------------|
| Accuracy / F1 | > 90% | Drops below 85% | Daily |
| Inference latency p95 | < 100ms | Exceeds 200ms | Continuous |
| Throughput | > 100 req/s | Drops below 50 req/s | Continuous |
| Data drift score | < 0.1 | Exceeds 0.2 | Daily |

### 9.2 Retraining Triggers
- Scheduled retraining: [frequency, e.g., weekly / monthly]
- Performance-triggered retraining: if accuracy drops below threshold
- Data-triggered retraining: if drift score exceeds threshold

---

**Document info:**
- Version: 2.0
- Author: @data-analyst
- Date: ...
- Inputs: `artifacts/output/02-strategy/requirements.md` + `artifacts/output/02-strategy/user-stories.md` + `artifacts/output/02-strategy/product-spec.md`
- Supersedes: v1.0 (added ML tracking events, ML dashboard, model monitoring section)