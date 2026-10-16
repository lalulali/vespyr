# Dashboard Specs Template

> **Used by:** Nova (@data-analyst)
> **Feeds into:** whoever builds the dashboard — `@devops-engineer` for external tools, `@developer` via `/design` for in-app
> **Save to:** `artifacts/output/03-strategy/dashboard-specs.md`

**This is the wire from analysis to a dashboard.** `measurement-plan-template.md` §5 says *which metrics to watch*; `analytics-insights-template.md` says *what the data showed and which chart shape fits it*. Neither builds anything. This file is the one a human or a script can act on without re-deriving the decisions.

**Why it declares a target instead of assuming one.** A spec for Grafana, for Metabase, for a set of SQL views and for a React page are four different documents — but they share every field below. Naming the target first is what lets the fields be concrete (`Query / definition` is PromQL in one and a Metabase question ID in another) without the template picking a vendor for you.

---

## Header

**Target:** `{grafana | metabase | looker | superset | in-app | sql-only | other: <name>}`
**Refresh:** `{real-time | hourly | daily | weekly | monthly}`
**Built by:** `{@devops-engineer | @developer | @data-analyst}`
**Live object:** `{URL, dashboard ID, or route — "not yet built" until it exists}`
**Source analysis:** `artifacts/output/07-iteration/analytics-insights.md`

---

## Panels

Every panel names what it shows, where the number comes from, how it is computed, and how it is drawn. A row missing any of the four is a wish with a title.

| # | Panel | Metric | Source | Query / definition | Chart | Layout | Owner |
|---|-------|--------|--------|--------------------|-------|--------|-------|
| P1 | Error rate | errors / requests | `events` table | `sum(errors) / sum(requests)` | line | row 1, full width | @devops-engineer |
| P2 | Activation rate | activated / exposed | `events` table | `count(distinct activated) / count(distinct exposed)` | line + target band | row 2, left | @data-analyst |
| P3 | Funnel drop-off | step conversion | `events` table | step-by-step `count(distinct user_id)` | funnel | row 2, right | @data-analyst |
| P4 | Adoption by segment | active by plan | `users` join `events` | grouped by `plan`, `device` | small multiples | row 3, full width | @data-analyst |

**Chart** is chosen from `analyze-data/SKILL.md`'s Encoding Matrix — trends over time take a line or sparkline, discrete category comparisons take a sorted horizontal bar, two continuous variables take a scatter, cohort comparisons take small multiples, flows and drop-offs take a funnel or Sankey. State the choice; a panel with no chart type is not specifiable.

---

## Alerts

Required when `Refresh: real-time`. A real-time panel with no threshold is a screen nobody watches.

| Panel | Threshold | Channel | Owner |
|-------|-----------|---------|-------|
| P1 | error rate > 0.5% for 5 min | PagerDuty | on-call engineer |
| P2 | activation < 5% of expected (hourly) | Slack #alerts | @data-analyst |

---

## Data sources

| Source | What it is | Access | Refresh |
|--------|-----------|--------|---------|
| `events` table | Product telemetry, one row per event | read-only role `analytics_ro` | streaming |
| `users` table | Account and plan attributes | read-only role `analytics_ro` | daily 02:00 |

---

## Build notes

- **External target** (grafana/metabase/looker/superset): the builder configures from the tables above. No code ships. `Live object` is filled in when the dashboard exists.
- **In-app target**: hand off to `/design` with this file as input — the panels become screen states, and the queries become the API or data-layer work. `/develop` builds it.
- **sql-only**: the `Query / definition` column *is* the deliverable. Ship it as views; the dashboard is whatever the consumer points at them.
- **Access:** every source names its access level. A dashboard spec that does not say who can read the data has not been designed, only drawn.
- **PII:** if a panel groups by a user-identifying dimension, say so here and check it against the measurement plan's Privacy & Compliance section.

---

## What this template does not do

It does not build the dashboard, and it does not decide whether the metrics are the right ones. It records the decisions a builder needs — target, panel, source, query, chart, layout, owner, access — so that building is configuration rather than interpretation.
