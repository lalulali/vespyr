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
- `unpack-problem → **shape-up** → design` — problem-first: explore problem → shape solution → design
- Double-run: `shape-up → explore → shape-up → design` — shape, research, re-shape

## Context detection
No explicit modes. The skill checks what artifacts exist and adapts:
- **Nothing exists** → full shaping from user input
- **Validation brief exists** (`01-discovery/validation-brief.md`) → incorporates premises, skips re-framing
- **Problem brief exists** (`01-research/problem-space-brief.md`) → uses problem definition as intake, shapes the selected solution concept
- **Research artifacts exist** (`02-research/*.md`) → synthesizes findings into the brief
- **Shaped brief already exists** (`01-discovery/shaped-brief.md`) → re-shape mode (post-research re-run)

## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps or reorder them.
- Each step file is a contract. Read it fully before executing.
- Context detection is automatic — adapt step depth based on existing artifacts. Do NOT ask the user which mode to use.

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
- `artifacts/output/01-discovery/shaped-brief.md`
- `artifacts/memory/active-decisions.md` (appended)

## State & memory integration
At start, via `@executor`: `node .agents/scripts/orchestrator_state.js status`

**At start:** Load context before context scan (step-01):
```
@memory-controller load founder [shape-up — {idea or feature name}]
```

At end: `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/shaped-brief.md`
**Memory:** Final step closes with `@memory-controller session-write` — mandatory per GUARDRAILS §Session Continuity.

