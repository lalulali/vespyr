---
name: empathy-map
description: Map user feelings, thoughts, sayings, and doings from observation data into an empathy quadrant canvas
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Empathy Map

Structures user observations into an empathy canvas. Outputs to `artifacts/output/02-research/empathy-map.md`.

## Persona delegation
This skill delegates to `@user-researcher`. The researcher facilitates empathy mapping from user data. The skill provides the canvas; `@user-researcher` provides the user insight and synthesis.

## When to use
- "Help me understand what users are thinking"
- "Map out the user's experience for {scenario}"
- After user interviews — synthesize observations
- Before designing any feature

## Workflow

### Step 1: Define the user and scenario

Identify the specific user segment and the scenario/context you're mapping.

### Step 2: Populate 4 quadrants

Work through each quadrant interactively:

**Says** — What does the user verbalize? Direct quotes from interviews, support tickets, reviews.
**Thinks** — What does the user not say aloud? Inferred from behavior, hesitations, body language.
**Does** — Observable behaviors. What actions do they take? What workarounds do they use?
**Feels** — Emotional state. Frustrated? Anxious? Relieved? Confident? Map the emotional arc.

### Step 3: Identify pains and gains

- **Pains:** What frustrates, blocks, or annoys the user?
- **Gains:** What would delight, relieve, or empower the user?

### Step 4: Output

Write `artifacts/output/02-research/empathy-map.md`:

```markdown
# Empathy Map — {user segment} in {scenario}
**Date:** YYYY-MM-DD

## User & Scenario
- **Segment:** {description}
- **Scenario:** {context}

## Empathy Canvas
| Says | Thinks |
|------|--------|
| {direct quotes} | {inferred thoughts} |

| Does | Feels |
|------|-------|
| {observed behaviors} | {emotional states} |

## Pains
1. {pain point}

## Gains
1. {opportunity for delight}
```

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/empathy-map.md`
