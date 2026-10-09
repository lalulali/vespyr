---
name: journey-map
description: Visualize user touchpoints, emotional state transitions, and friction points across current workflows. Use when the user says "map the user journey", "where are users getting stuck", "show me the end-to-end experience", or invokes /journey-map before redesigning a flow.
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Journey Map

## What this skill does

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

Write `artifacts/output/02-research/journey-map.md`:

```markdown
# Journey Map — {journey name}
**Date:** YYYY-MM-DD
**Evidence basis:** {interviewed N / observed / analytics / support-tickets / survey / hypothesis — pick one, and label unvalidated content in the body}
**User segment:** {who}
**Scope:** {start} → {end}

## Journey Stages
| Stage | Touchpoint | Action | Emotion | Friction | Opportunity |
|-------|-----------|--------|---------|----------|-------------|
| 1. Awareness | {where} | {what} | 😃/😐/😟 {why} | {pain} | {fix} |

## Emotional Arc
| Stage | Emotion | Intensity (1-5) | Driver |
|-------|---------|------------------|--------|
| Awareness | 😃/😐/😟 | {n} | {why} |
| Consideration | 😃/😐/😟 | {n} | {why} |
| Decision | 😃/😐/😟 | {n} | {why} |
| Onboarding | 😃/😐/😟 | {n} | {why} |
| Ongoing use | 😃/😐/😟 | {n} | {why} |
| Exit | 😃/😐/😟 | {n} | {why} |

**Arc summary:** {one line — where it peaks, where it bottoms out, and the single stage that flips it}

## Key Friction Points
1. **{stage}:** {friction} — Impact: {High/Med/Low}

## Priority Opportunities
1. **{stage}:** {opportunity} — Effort: {High/Med/Low}, Impact: {High/Med/Low}
```

## Done when — checked mechanically

These canvases shipped for the whole life of this repo with **no gate at all**: the template in the
Output step could be written to disk verbatim and nothing would notice. `discovery_canvas_check.js`
now checks form and evidence declaration:

```bash
node .agents/scripts/discovery_canvas_check.js check --kind journey-map --file artifacts/output/02-research/journey-map.md --json
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
**Journey-map minimums:** at least 3 stages, because a short map hides the middle where friction
actually lives; every stage cell carrying real content (an emoji alone is padding, and padding reads as
coverage); an Emotional Arc with a summary sentence; and named Key Friction Points.

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/journey-map.md`
