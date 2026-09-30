---
step: 3a
name: User Stories
mode: create
prerequisites:
  - step-02 completed
output_contract:
  citations: not-required
---

# Step 3 — User Stories

Write exhaustive, testable user stories from the validated PRD. These are the engineering contract.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 3`
## Goal
Every PRD feature must have ≥1 user story. Every user story must have acceptance criteria. Stories must be testable by QA.

## User-story template contract
Start from `.agents/templates/product/user-story-template.md`; do not replace it with a flat story list. Preserve the backlog tree, Epic → Feature → Story hierarchy, metadata fields, Business/Technical Requirements, all applicable Gherkin `AC-H`/`AC-U`/`AC-E` blocks, UI/UX notes, data notes, out-of-scope items, and open questions. Every story must retain a real `Traces to PRD` FR reference and a `Traces to Product Spec` reference. A missing template block is a handoff failure.

**Scaffold first, then populate (do NOT author from scratch):**
1. Copy the template to the output path before writing any content:
   ```bash
   cp .agents/templates/product/user-story-template.md artifacts/output/03-strategy/user-stories.md
   ```
2. Replace the placeholder Epic/Feature/Story blocks with real ones, keeping the hierarchy, every per-story metadata field, the Business/Technical Requirement sections, the multi-line Given/When/Then AC blocks, and the Story Dependencies Diagram. Never collapse stories into a flat `US-NN` list or a "story matrix" summary table — that is the exact off-template drift observed in the 2026-09 parity benchmarks.

## Agent invocation
`@product-manager` generates user stories from the PRD:
- Exhaustive coverage — every feature, edge case, and error state
- Acceptance criteria per story: AC-H (happy path), AC-U (unhappy/error path), AC-E (edge case)
- Stories must reference specific screen states and transitions from the product spec

## Acceptance-criteria depth (do this here, not downstream)

These criteria are the engineering contract. Their quality is decided **now**, in this step — not repaired later by `/test` or an `/elicitation` pass. Three things carry that weight:

1. **Work the 16-category risk sweep per story** (`user-story-instructions.md` §3.2). Every category resolves to an `AC-…` reference or a concrete `N/A because <reason>`, in the mandatory **AC Coverage Self-Audit** block. Categories 5 (write ordering), 11 (clock/time), 14 (degraded capability) and 15 (observability) exist because `/test` was already catching those risks downstream with nowhere upstream to record them.
2. **Give every Feature a state model** (`user-story-instructions.md` §3.4). One `#### State Model` table per Feature, listing the entity's states and every transition between them, with each `no` row naming the criterion that forbids it. Per-story reasoning cannot find illegal transitions between stories — this is where they hide.
3. **Make the self-audit honest.** Every `AC-…` you cite must be one you actually defined; a dangling reference fails the gate. Reasons must be specific to the story — the same wording across three or more stories is flagged as a smell, because a filled-in sweep is not a reasoned one. A story may legitimately be simple; it may not be lazy.

**Do not target a count.** A uniform AC count across stories is itself a warning: it is the tell that coverage was filled to a shape instead of reasoned per case.

## Alignment rules
- User stories MUST strictly align with the validated PRD
- Screen transitions and UI edge cases in the product spec must map directly to story ACs
- Zero divergences or omission of spec details

## Gate check
- Every PRD feature has ≥1 user story
- Every user story carries a complete, resolved AC Coverage Self-Audit (all 16 categories)
- Every story defines at least one acceptance criterion, and every `AC-…` its self-audit cites is one that story actually writes
- Every Feature's state model names its illegal transitions, and every one of them points at a criterion that exists in the document
- Every AC referenced in a self-audit resolves to a criterion that story defines
- Every Feature carries a state model whose illegal transitions each name a criterion
- All user stories strictly follow the PRD and product spec
- Cross-validation checklist passes (PM agent Step 4)
- **Template conformance (mechanical):** `node .agents/scripts/template_conformance.js check --mode create` exits 0. A flat story list, missing Epic/Feature hierarchy, missing per-story metadata, single-line (non-Gherkin) ACs, a dangling self-audit reference, or a Feature without a state model all fail this gate — fix before proceeding. Reasoning smells print as warnings and do not fail the build, but read them.

## Output
`artifacts/output/03-strategy/user-stories.md` — use template `.agents/templates/product/user-story-template.md`

Record completion:
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 03-strategy/user-stories.md
```

Write story architecture decisions to memory:
```
@memory-controller write active-decisions.md
### [PRODUCT] User Story Map for {feature} [date: YYYY-MM-DD] [agent: @product-manager]
{story count, key architectural decisions encoded in ACs, any planned deferrals}
**Status:** active
```

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 3`
