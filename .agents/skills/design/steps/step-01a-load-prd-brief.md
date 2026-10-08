---
step: 1a
name: Load PRD Brief
mode: create
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1 — Load PRD Brief

Load the validated idea and research artifacts. This is the foundation for the PRD.

## Goal
Read the discovery brief and research outputs. Understand the validated problem, user, and market context before writing requirements.

## Prerequisites
Verify these artifacts exist:
- `artifacts/output/01-discovery/validation-brief.md` OR `idea-brief.md`
- `artifacts/output/02-research/market-analysis.md`
- `artifacts/output/02-research/competitive-analysis.md`
- `artifacts/output/02-research/user-personas.md`

If any are missing, **check whether the user's prompt already states the brief before reaching for another skill.**

- The prompt states the concrete outcome, the constraints, and the audience → **that is a
  brief.** Normalise it to `artifacts/output/01-discovery/idea-brief.md` with the
  `DERIVED FROM THE USER PROMPT` provenance comment, mark unavailable upstream research
  `[ABSENT — not commissioned]`, and continue. Running `/explore-idea` here produces market
  and competitive analysis for a product the user may not be launching at all.
- The prompt is an idea with no outcome, constraints, or audience, and this is a commitment
  gate (budget, headcount, calendar) → load `explore-idea` first, per the Intent Ladder.

**Do not fabricate an upstream artifact to satisfy a prerequisite.** A labelled brief derived
from the prompt is honest; an invented `validation-brief.md` is not, and a reviewer cannot
tell the two apart without the provenance comment.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 1`
1. `@product-manager` reads the discovery brief in full.
2. Read only the executive summary + relevant sections of each research artifact (context budget: target paragraphs, not full documents).
3. Extract: target user, core problem, validated demand signals, competitive gaps, key constraints.

## Feature proposal gate
If operating in `semi-autonomous` mode and `FeatureDesignInteraction` is not `false` in `project-context.md`:
- Draft a high-level feature list and scope summary
- **Pause** and present to the user for feedback — user can select, add, modify, or delete features
- In `autonomous` mode or with `FeatureDesignInteraction: false`, skip the pause

## Motion intent gate (halt-and-ask)

After reading the brief, run the deterministic motion-intent detector before drafting requirements:

```bash
node .agents/scripts/motion_intent_check.js check --json
```

- `decisionRequired: true` → **HALT and ASK the user** (this is a DNA 4 decision, not a silent action). The brief/PRD signals a motion-led product (an explicit "interactive/creative/motion design website", scroll/WebGL/micro-interaction language, or a Vibrant Brand-First / Conversion Storefront context) but no motion decision is recorded. Ask: *"This looks motion-led ({signals}). Run `/motion` for a proper motion spec, or should I record motion as out of scope?"* Do NOT silently proceed static, and do NOT silently launch `/motion` — the user decides. Record the choice (run `/motion`, or "Motion: not in scope — {reason}") so the detector does not re-prompt.
- `decisionRequired: false` → proceed. Either no motion signal exists, or the motion decision is already recorded.

The script always exits 0 — it is advisory input to a human-gated decision, never a build failure.

## Output
Loaded context: brief summary, feature scope (approved or auto-selected), research key points.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 1`
