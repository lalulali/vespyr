---
name: empathy-map
description: Map user feelings, thoughts, sayings, and doings from observation data into an empathy quadrant canvas. Use when the user says "map out the user experience", "what are users thinking", "build an empathy map", or invokes /empathy-map before designing a feature.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Empathy Map

## What this skill does

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
**Evidence basis:** {interviewed N / observed / analytics / support-tickets / survey / hypothesis — pick one, and label unvalidated content in the body}

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

## Done when — checked mechanically

These canvases shipped for the whole life of this repo with **no gate at all**: the template in the
Output step could be written to disk verbatim and nothing would notice. `discovery_canvas_check.js`
now checks form and evidence declaration:

```bash
node .agents/scripts/discovery_canvas_check.js check --kind empathy-map --file artifacts/output/02-research/empathy-map.md --json
```

It requires:
- **no unfilled template placeholders** — `{direct quotes}` and `{pain point}` are the template, not
  an artifact
- **`**Evidence basis:**` declared** — one of `interviewed` / `observed` / `analytics` /
  `support-tickets` / `survey` / `hypothesis`. A canvas that does not say where it came from cannot be
  read as research, and nothing downstream can tell your finding from your guess
- **when the basis is `hypothesis`, the body must say so too** — announced only in a header, a
  hypothesis reads as a finding three paragraphs later
- the kind's structural minimum, below

**A green result is not a research finding.** The gate checks form and one declaration. It cannot
tell you whether the analysis is correct, and it does not pretend to.

**Exit 0** conformant · **1** failures · **2** usage/IO error, fail-closed, never a silent pass.

Run this **before** the `complete` call below, so a non-conformant canvas is never recorded as
delivered.
**Empathy-map minimums:** all four quadrants populated; the `Says` quadrant carrying quoted material or
a source link — if there was no interview, declare the basis as a hypothesis rather than writing a
plausible paraphrase and presenting it as something a person said; non-empty Pains and Gains.

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/empathy-map.md`
