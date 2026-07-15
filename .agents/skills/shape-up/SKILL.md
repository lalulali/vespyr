---
name: shape-up
description: Structure and stress-test semi-cooked ideas into design-ready briefs. No prerequisites — works at any point in the pipeline.
---

# Shape Up

Takes a semi-cooked idea — a plan, pitch, doc, or set of notes — and shapes it into a structured, loophole-tested, design-ready brief. No prerequisites. Works whether the user skipped early phases entirely or completed them and needs a shaping checkpoint before design.

## Supported flows
- `validate-idea → explore-idea → **shape-up** → design` — post-research synthesis
- `**shape-up** → design` — standalone shaping (skip validation + research)
- `**shape-up** → explore-idea → design` — pre-research structuring
- Double-run: `shape-up → explore → shape-up → design` — shape, research, re-shape

## Context detection
No explicit modes. The skill checks what artifacts exist and adapts:
- **Nothing exists** → full shaping from user input
- **Validation brief exists** (`00-discovery/validation-brief.md`) → incorporates premises, skips re-framing
- **Research artifacts exist** (`01-research/*.md`) → synthesizes findings into the brief
- **Shaped brief already exists** (`00-discovery/shaped-brief.md`) → re-shape mode (post-research re-run)

## Prerequisites
None. This is a flexible entry point.

## Step sequence
1. **Context Scan** → `steps/step-01-context-scan.md`
2. **Intake & Structure** → `steps/step-02-intake-structure.md`
3. **Gap Analysis** → `steps/step-03-gap-analysis.md`
4. **Stress-Test** → `steps/step-04-stress-test.md`
5. **Decision Alignment** → `steps/step-05-decision-alignment.md`
6. **Handoff** → `steps/step-06-handoff.md`

## Halt conditions
- Stress-test reveals the idea is fundamentally unviable → recommend `validate-idea` instead
- Gap analysis surfaces 5+ blocker-severity gaps with no path to resolution
- User abandons shaping mid-flow (decisions logged, partial brief saved)

## Output artifacts
- `artifacts/output/00-discovery/shaped-brief.md`
- `artifacts/memory/active-decisions.md` (appended)

## Skill chain
- Prev: `validate-idea`, `explore-idea`, or direct entry (none)
- Next: `design` (if assumptions verified) or `explore-idea` (if assumptions need research)

## State & memory integration
At start, via `@executor`: `node .agents/scripts/orchestrator_state.js status`
At end: `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/shaped-brief.md`
**Memory:** Final step closes with `@memory-controller session-write` — mandatory per GUARDRAILS §Session Continuity.
