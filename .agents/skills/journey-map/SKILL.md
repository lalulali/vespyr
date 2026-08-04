---
name: journey-map
description: Visualize user touchpoints, emotional state transitions, and friction points across current workflows
version: "2.0"
last_updated: 2026-07-20
---

# Journey Map

Maps the current-state user journey with touchpoints, emotions, and friction. Outputs to `artifacts/output/02-research/journey-map.md`.

## Persona delegation
This skill delegates to `@user-researcher`. The researcher maps the journey from user data. The skill provides the map structure; `@user-researcher` provides the journey analysis.

## When to use
- "Map the user's journey for {workflow}"
- "Where are users getting stuck?"
- "Show me the end-to-end experience"
- Before redesigning a flow

## Workflow

### Step 1: Define the journey scope

Identify the start and end of the journey. Example: "From discovering the product to completing first purchase."

### Step 2: Map stages

Walk through each stage of the journey:
1. **Awareness** — How do they discover the need/solution?
2. **Consideration** — How do they evaluate options?
3. **Decision/Action** — What triggers them to act?
4. **Onboarding/First Use** — What's the first experience?
5. **Ongoing Use** — What's the recurring experience?
6. **Exit/Churn** — When and why do they leave?

### Step 3: At each stage, capture

- **Touchpoint:** Where does the interaction happen? (app, email, support, word of mouth)
- **Action:** What does the user do?
- **Emotion:** High/Med/Low — with brief description
- **Friction:** What makes this stage harder than it should be?
- **Opportunity:** What would improve this stage?

### Step 4: Output

Delegate to `@writer` for `artifacts/output/02-research/journey-map.md`:

```markdown
# Journey Map — {journey name}
**Date:** YYYY-MM-DD
**User segment:** {who}
**Scope:** {start} → {end}

## Journey Stages
| Stage | Touchpoint | Action | Emotion | Friction | Opportunity |
|-------|-----------|--------|---------|----------|-------------|
| 1. Awareness | {where} | {what} | 😃/😐/😟 {why} | {pain} | {fix} |

## Emotional Arc
```
😃   |        ████
😐   |  ████      ████
😟   |      ████      ████
     |________________________
     Awar. Cons. Dec. Onbrd. Use
```

## Key Friction Points
1. **{stage}:** {friction} — Impact: {High/Med/Low}

## Priority Opportunities
1. **{stage}:** {opportunity} — Effort: {High/Med/Low}, Impact: {High/Med/Low}
```

## State machine integration
At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/journey-map.md`
