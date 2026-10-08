---
name: shape-up
description: Structure and stress-test a semi-cooked idea into a design-ready brief with a fixed appetite, fenced scope boundaries, and named rabbit holes. No prerequisites — works at any point in the pipeline. Use when the user says "shape this up", "turn these notes into a brief", "I have a rough pitch", "scope this down", "what should I cut", or invokes /shape-up. Emits shaped-brief.md with the shaping gate. Do NOT use to stress-test whether a concept should exist at all (/validate-idea), to research market or competitors (/explore-idea), to frame a problem you have not stated yet (/unpack-problem), or to turn research into specs (/design).
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
---
# Shape Up

<!-- router-skill -->

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
- **Problem brief exists** (`02-research/problem-space-brief.md`) → uses problem definition as intake, shapes the selected solution concept
- **Research artifacts exist** (`02-research/*.md`) → synthesizes findings into the brief
- **Shaped brief already exists** (`01-discovery/shaped-brief.md`) → re-shape mode (post-research re-run)

## When to invoke
- The user has a semi-cooked idea — a plan, pitch, doc, or scattered notes — and wants it shaped into a brief that `/design` can consume
- `/explore-idea` has returned findings that need consolidating before specs
- The user says "shape this up", "turn these notes into a brief", "I have a rough pitch", or invokes `/shape-up`
- The user wants to re-shape an existing `shaped-brief.md` against new research evidence

## When NOT to invoke
- There is a validated concept and market evidence already exists — go to `/explore-idea` or `/design` directly
- The input is a *problem* rather than a proposed solution — use `/unpack-problem`; shaping a solution before the problem is framed launders the assumption

## Halt conditions
- Stress-test reveals the idea is fundamentally unviable -> recommend `validate-idea` instead
- Gap analysis surfaces 5+ blocker-severity gaps with no path to resolution
- User abandons shaping mid-flow (decisions logged, partial brief saved)

## Done when
- `artifacts/output/01-discovery/shaped-brief.md` exists with the **shaping gate** recorded in the document — **plain sentence first**, then the bracketed card (`VERDICT: [GO] — When: <NOW|GATED|NEXT-CYCLE>` / `VERDICT: [RESHAPE]` / `VERDICT: [NO-GO]`; format in `.agents/references/vespyr-dna.md` §Decision Gate). The chat reply carries only the plain wording.
- The brief states **Appetite** (a timebox budget, not an estimate), **Scope In / Scope Out**, and **Rabbit Holes** explicitly fenced — a brief with non-goals but no fenced rabbit holes will get them re-litigated mid-build
- Every assumption is marked verified / plausible / unverified, and every `verified` one carries the evidence it was verified against
- The shaping gate is honest about the distinction: this skill gates **shaping readiness**, not concept viability. `[GO]` on shaping readiness is unavailable while any assumption is unverified — that is `[RESHAPE]` (needs evidence). Concept viability belongs to `/validate-idea`.
- Every gap found in Step 3 is either closed with evidence or carried forward as a named open question with a disposition
- Every decision written to `active-decisions.md` passes `memory_check.js` (written via `memory_write.js`, not hand-edited)
- The handoff step names the next skill and the artifact it consumes
- `@memory-controller session-write` has run

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

## Output artifacts

The **document** surface — the machine record lives here, and the gates read these files.

- `artifacts/output/01-discovery/shaped-brief.md`
- `artifacts/memory/active-decisions.md` (appended)

The chat reply is the human surface: plain wording and a link, never a token or card field
(`.agents/references/vespyr-dna.md` §Two surfaces).

## State & memory integration
At start, run: `node .agents/scripts/orchestrator_state.js status`

**At start:** Load context before context scan (step-01):
```
@memory-controller load founder [shape-up — {idea or feature name}]
```

At end: `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/shaped-brief.md`
**Memory:** Final step closes with `@memory-controller session-write` — mandatory per GUARDRAILS §Session Continuity.
