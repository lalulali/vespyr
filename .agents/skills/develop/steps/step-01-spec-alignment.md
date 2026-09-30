---

> **Intent gate:** if the spec's premise is ambiguous, conflicting, or drives multi-day work, escalate to `/grill-me` before alignment continues (Intent Escalation Ladder Level 3 — `vespyr-dna.md`). Single clarifying questions stay at Levels 0–2.

step: 1
name: Spec Alignment & Read Check
prerequisites:
  - PR exists or design docs are in `artifacts/output/03-strategy/`
  - User story is in `artifacts/output/03-strategy/user-stories.md`
output_contract:
  citations: not-required
---

# Step 1 — Spec Alignment & Read Check

Align on the spec before writing any code. Every developer must have read and internalized the strategy documents.

## Goal
Load and cross-check every strategy artifact against the user stories. Confirm acceptance criteria are achievable. File CRs for any spec gap found.

## Agent invocation
- `@product-manager` confirms specs match the PRD requirements and priorities
- `@product-designer` reviews user flows, interaction specs, and visual direction
- `@tech-lead` confirms the recorded prototype track is implementable and that the collaboration gate passed
- `@developer` loads session context and fully digests `product-spec.md` and `user-stories.md` — cannot start coding until this is done:
  1. `@memory-controller load developer [develop: spec alignment for {feature}]`
  2. Read `product-spec.md` and `user-stories.md` in full

## Inputs
- `artifacts/output/03-strategy/SPEC.md` — spec kernel (5 fields: Why, Capabilities, Constraints, Non-goals, Success signal). **This is the primary agent contract — all agents must read this.**
- `artifacts/output/03-strategy/product-spec.md`
- `artifacts/output/03-strategy/requirements.md` (full stakeholder PRD — available for context, not mandatory reading for agents)
- `artifacts/output/03-strategy/user-stories.md`
- `artifacts/output/03-strategy/prototype-collaboration.md` when a prototype is in scope; run `node .agents/scripts/prototype_collab_gate.js verify --record artifacts/output/03-strategy/prototype-collaboration.md --track <track> --prototype <prototype> --scope handoff --json` before coding
- All files in `artifacts/output/04-architecture/` (if they exist)

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 1`
1. Read every file in the inputs list. If any file > 1000 words, read it to summarize.
2. **Incoming-spec conformance (mechanical, blocking):** verify the specs handed off from `/design` actually follow the canonical templates before alignment continues:
   ```bash
   node .agents/scripts/template_conformance.js check --mode create --json
   ```
   Exit 0 required. If `requirements.md` or `user-stories.md` is off-template (a defect that should have been caught at the design handoff gate), halt and route back to `/design` — do not begin coding against a malformed spec.
   Then read the `warnings` array from the same `--json` output. Warnings do not affect the exit code and do not block coding, but they mark thin reasoning: a story marking 13+ of 16 risk categories N/A, the same N/A reason copied across 3+ stories, or a uniform criterion count across stories. If the spec you were handed is full of them, raise it with @product-manager before building on it — those are the stories most likely to hide an untested failure mode.
3. Cross-check ACs against the spec-kernel capabilities (CAP-1, CAP-2, ...).
4. Confirm all edge cases and scope boundaries are defined.
5. If a prototype is in scope, verify the collaboration record's track, runtime, prototype hash, and separate designer/tech-lead sign-offs with `prototype_collab_gate.js`; a failed check is a spec-alignment halt.
6. File CRs for any spec gap. Track them in a running list.

## Output
`artifacts/output/05-execution/spec-alignment-check.md`

## Halt condition
Any spec gap unfilled after 2 CR cycles. Escalate to `@founder`.

## Delegation
- **Memory:** @memory-controller for project-context

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 1`
