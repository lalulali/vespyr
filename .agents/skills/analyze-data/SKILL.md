---
name: analyze-data
description: General data analysis companion — EDA, dataset provision, visualization mapping, insight extraction, metric value evaluation, and PM metric co-piloting
metadata:
  version: "2.0"
  last_updated: "2026-07-30"
---

# Analyze Data — General Data Analysis & Metric Strategy Workflow

## What this skill does

Provides a structured, end-to-end framework for data analysis, synthetic dataset creation, visual encoding design, chart-to-insight decoding, metric necessity auditing, and product manager metric co-design.

## Persona delegation

This skill delegates to **`@data-analyst` (Nova)**. Nova provides the analytical rigor, Edward Tufte visual display principles, Avinash Kaushik measurement frameworks, and Socratic challenge stance.

## When to use

- "Analyze this dataset / telemetry log"
- "Generate synthetic / mock data for this user flow"
- "How should we visualize these metrics?"
- "What insights can we extract from this chart or visualization?"
- "Evaluate if this metric actually matters and why we're measuring it"
- "Collaborate with PM to define product metrics and event tracking plans"
- Trigger command: `/analyze-data`

---

## Workflows & Primary Modes

The agent will prompt or auto-detect which mode fits your request:

---

### Mode 1: General Data Analysis & Exploration Partner

Focuses on raw data, synthetic dataset generation, exploratory data analysis, visual encodings, narrative insight extraction, and metric purpose validation.

#### Step 1: Mode & Sub-Flow Selection
Identify which data activity is requested:
1. **Provide Data** — Synthetic & mock dataset generation
2. **Analyze Data** — Exploratory Data Analysis (EDA) & diagnostics
3. **Translate Data to Visualization** — Visual encoding & chart selection
4. **Translate Visualization to Insight** — Narrative extraction & "so what?" analysis
5. **Understand What Matters & Why We Measure This** — First-principles metric audit

---

#### Step 2: Sub-Flow Execution

##### 1. Provide Data (Synthetic & Mock Dataset Generation)
When you need realistic sample data for testing, prompt validation, or schema prototyping:
- Define the schema: entity fields, data types, constraints, and relationships.
- Specify realistic statistical distributions:
  - *User activity / session counts*: Log-normal or Poisson distribution.
  - *Conversion rates / probabilities*: Beta distribution.
  - *Response times / latency*: Skewed gamma distribution with long-tail outliers.
- Include edge cases: zero-states (new users), null/missing values, extreme outliers, and invalid inputs.
- Output clean Markdown tables, JSON event arrays, or CSV sample rows.

##### 2. Analyze Data (Exploratory Data Analysis & Diagnostics)
When given raw data, telemetry logs, or summary statistics:
- **Central Tendencies & Variance**: Calculate mean, median, P90/P95/P99, standard deviation, and interquartile range (IQR).
- **Funnel & Cohort Breakdown**: Analyze step-by-step conversion drop-offs, user retention decay curves, and segment variations (e.g., mobile vs. desktop, free vs. paid).
- **Anomaly Detection**: Flag values exceeding 2+ standard deviations from baseline or sudden step-function shifts.
- **Correlation vs. Causation Check**: Identify potential confounding variables (seasonality, marketing campaign overlap, feature rollout flags) before making causal assertions.

##### 3. Translate Data to Visualization (Tufte Visual Display Standards)
When mapping data dimensions to visual chart representations:
- **Encoding Matrix**:
  - *Trends over continuous time*: Line charts, sparklines, or area charts.
  - *Discrete category comparisons*: Horizontal bar charts (sorted by magnitude).
  - *Correlation / relationship between 2 continuous variables*: Scatter plots or bubble charts.
  - *Multidimensional cohort comparisons*: Small multiples (grid of synchronized small graphs).
  - *Flows & drop-offs*: Sankey diagrams or funnel charts.
- **Edward Tufte Audit**:
  - **Data-Ink Ratio**: Strive for maximum data-ink. Remove heavy gridlines, dark backgrounds, 3D shadows, and decorative elements (chartjunk).
  - **Graphical Integrity**: Ensure visual elements match numerical proportions (avoid truncated Y-axes that artificially amplify minor noise).
  - **Color Palette**: Use muted, accessible, functional colors for data; reserve bright colors exclusively for highlighted insights or alerts.

##### 4. Translate Visualization to Insight (Chart Decoding)
When extracting strategic meaning from visual representations or chart specs:
- **Pattern Identification**: Locate inflection points, inflection speed changes, plateaus, seasonality cycles, and outlier clusters.
- **Root-Cause Hypotheses**: Formulate 2–3 plausible hypotheses for *why* the visual pattern occurred.
- **The "So What?" Action Map**: Translate visual patterns into direct business decisions:
  - *Observation*: "Conversion drops 45% at step 2 on mobile."
  - *Insight*: "Mobile layout forces keyboard overlap on input field."
  - *Action*: "Redesign mobile step 2 to auto-focus and auto-advance."

##### 5. Understand What Matters & Why We Measure This (Metric Evaluation)
When auditing existing or proposed metrics to ensure they drive real value:
- **The "So What?" Test**: Ask: "If this number changes by 20%, what specific decision changes?" If the answer is "nothing," flag it as a vanity metric.
- **Core vs. Proxy vs. Vanity Classification**:
  - *Core Metric*: Direct measure of user value or business sustainability (e.g., 30-day retention rate).
  - *Proxy Metric*: Intermediate surrogate predicting core outcome (e.g., key feature activation in week 1).
  - *Vanity Metric*: Feel-good count that increases regardless of product health (e.g., total signups, pageviews).
- **Goodhart's Law Audit**: Examine how the metric could be gamed or distorted by teams or users if aggressively targeted.

---

### Mode 2: PM Metric Strategy & Collaboration Co-Pilot

Partner directly with `@product-manager` to define product metrics, driver trees, and telemetry tracking plans during product scoping.

#### Step 1: Joint Metric Discovery
- Load product requirements (`artifacts/output/03-strategy/requirements.md` or PRD).
- Apply **Avinash Kaushik's Digital Analytics Measurement Framework**:
  1. *Business Objective*: Core purpose of the feature/product.
  2. *Goals*: Specific strategies supporting the objective.
  3. *KPIs*: Measurable metrics tracking each goal.
  4. *Targets*: Explicit quantitative success benchmarks (e.g., $> 20\%$ weekly active usage).
  5. *Segments*: Key user cohorts to analyze.

#### Step 2: Construct Metric Drivers Tree
Build a top-down metric hierarchy:
```
                    North Star Metric (NSM)
                               │
            ┌──────────────────┴──────────────────┐
     Primary Driver 1                      Primary Driver 2
            │                                     │
    ┌───────┴───────┐                     ┌───────┴───────┐
Input Metric A  Input Metric B        Input Metric C  Input Metric D
    │               │                     │               │
 [Event 1]       [Event 2]             [Event 3]       [Event 4]
```

#### Step 3: Guardrail & Counter Metrics
Pair every primary KPI with a guardrail metric to catch negative side effects:
- *Primary KPI*: Increase free trial conversions $\rightarrow$ *Guardrail*: 30-day refund / chargeback rate.
- *Primary KPI*: Reduce onboarding completion time $\rightarrow$ *Guardrail*: Profile completion accuracy rate.

#### Step 4: Telemetry Tracking Plan & Data Dictionary
Produce an implementation-ready specification for `@developer`:
- **Event Name**: Standardized snake_case or noun_verb format (e.g., `checkout_step_completed`).
- **Trigger Condition**: Exact user interaction or system condition firing the event.
- **Properties**: Payload key-value pairs (e.g., `step_number`, `payment_method`, `error_code`).
- **Business Question**: The precise question answered by this event.

---

## Output Artifacts & Delivery

Write:

1. **For General Data Analysis & Insights**:
   - Location: `artifacts/output/07-iteration/data-analysis-report.md`
2. **For PM Metric Strategy & Tracking Plans**:
   - Location: `artifacts/output/03-strategy/measurement-plan.md`

Save key measurement decisions to shared memory via `@memory-controller`:
```
@memory-controller write active-decisions.md
### [DECISION] {Metric / Analysis Title} [date: YYYY-MM-DD] [agent: @data-analyst]
{Key metric selection, visual spec, or telemetry decision}
**Status:** active
```
