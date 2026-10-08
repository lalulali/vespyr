---
step: 1a
name: Session Setup
mode: create
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1 — Session Setup

Initialize the validation session. Load project context and determine the user's mode and maturity.

## Goal
Establish the validation environment: load memory, check for prior artifacts, and identify the user's context (startup/company/personal) and product maturity (greenfield/brownfield).

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 1`
1. `@memory-controller load founder [idea validation]` — seed project context. If memory files don't exist yet (new project), proceed without context.
2. Check `artifacts/output/` for prior validation briefs or design docs.
3. Ask: **What's your context?** (startup / company / personal)
4. Ask: **Is this greenfield or brownfield?** (new thing / improving existing thing)

## Context modes
| Mode | You are | Evidence bar |
|---|---|---|
| **Startup** | Founder, indie hacker | High — need behavioral demand evidence |
| **Company** | PM at work, intrapreneur | Medium — need stakeholder pull and business case |
| **Personal** | Builder, learner, hobbyist | Low — clarity and excitement matter more than evidence |

## Product maturity routing
- **Greenfield** (no existing product) → full diagnostic, all questions relevant
- **Brownfield** (existing product/feature) → **Q1 is answered from product telemetry, never skipped.**

**Brownfield never skips Q1.** Step 06's `[GO]` gate requires behavioral demand evidence, so a
route that drops Q1 makes `[GO]` structurally unreachable and forces every brownfield idea to
`[RESHAPE]` or `[NO-GO]`. Existing products are the *cheapest* place to get behavioral evidence —
ask for the instrumented version of Q1:

| Brownfield Q1 source | What it proves |
|---|---|
| Usage / retention / expansion data | People already spend behavior on the adjacent job |
| Support tickets, churn reasons, exit interviews | The pain is felt, not imagined |
| Internal workaround traffic (Slack threads, spreadsheets, shadow tools) | The status quo is expensive |
| Sales objections and lost-deal reasons | Someone will pay to remove it |

Record the source with the answer (`[^N]` per DNA 5). If no instrument exists, say so and route Q1
as a **named pre-GO action** in the next-action line — do not silently substitute interest for
behavior.

## Output
Context mode and maturity stored for use in subsequent steps.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 1`
