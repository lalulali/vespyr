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
**Inferred quadrants:** {which of Thinks / Feels are your inference rather than their words — usually both}

## User & Scenario
- **Segment:** {who specifically — role plus what distinguishes them: size, tool, constraint, tenure}
- **Scenario:** {the actual moment: when, doing what, with what at stake}

## Empathy Canvas
| Says | Thinks |
|------|--------|
| {direct quotes} | {inferred thoughts} |

| Does | Feels |
|------|-------|
| {observed behaviors} | {emotional states} |

## Pains
1. {pain point} — {severity: high/medium/low, or how many users hit it}

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

### Four defects the first version of this gate missed

Re-audited after the gate shipped. A canvas that passes every check above can still be dishonest and
still be useless downstream. Each of these greened a map that should not have:

| Defect | What is now required |
|---|---|
| **The canvas erases the distinction this skill itself draws.** Step 2 defines `Says` as what the user verbalises and `Thinks` as what they *do not say aloud, inferred* — then renders all four quadrants as one table with identical formatting. A quoted sentence and your imagination of what someone felt are indistinguishable to the reader | `**Inferred quadrants:**` naming which quadrants are inference. This asks for a **label, not new content** — it requires labelling what you already know is an inference |
| **`Segment: admins`, `Scenario: general` is not a persona.** A role name with nothing distinguishing it describes a population, and every downstream decision inherits the vagueness | The segment must carry enough to tell this user from the neighbouring one; the scenario must name a moment. `general`, `whenever`, `various` and friends are rejected as standing in for having one |
| **`interviewed 1` was a full segment map.** The basis is now required to state its count. A count **below five is a named limit, not a failure** — printed as a caveat on both the pass and fail paths, and carried in the JSON | The interviews already happened; failing on a small N would only push an author to misstate the number, which is strictly worse |
| **Four pains, no order of importance.** A numbered list is document order, not priority — it hands the decision of what to fix to whoever reads it first | Each pain carries a severity, frequency, or priority marker |

**What this gate still cannot do:** judge whether an inference is *correct*, or whether the pain you
ranked highest is the one that matters. It checks that the map tells the truth about its own
provenance. Judging the analysis is a researcher's job.

## State machine integration
At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/empathy-map.md`
