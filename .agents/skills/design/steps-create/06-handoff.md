---
step: 6
name: Handoff
mode: create
prerequisites:
  - step-05 completed
delegation:
  reads: none
  writes: "@writer (product-spec.md + design.md + product-spec.html; per delegation-policy.md multi-file output)"
  runs: "@executor (orchestrator_state.js complete)"
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 6 — Handoff

Final review, architect phase gate, Kanban seeding, and handoff to develop.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-create --step 6`
## Design review gate
- All acceptance criteria trace back to user stories?
- Edge cases covered and testable?
- Open questions documented for dev?
- No blocking open questions remain?

## Gate checklist
- `requirements.md` exists ✓
- `user-stories.md` exists ✓
- `product-spec.md` exists ✓
- `product-spec.html` exists ✓
- `design.md` exists ✓
- All ACs are testable ✓
- No blocking open questions remain ✓
- UX sign-off (if applicable) ✓

## Architect phase gate (interactive choice)
**Pause and ask the user** before loading `develop`:
- **Option A (Architect first):** Invoke `@architect` for components, models, schemas, ADRs. Recommended for greenfield features, complex integrations.
- **Option B (Direct to Developer):** Bypass architecture. Hand off specs directly to `@tech-lead` for planning. Recommended for straightforward features.

Based on choice, set `ArchitectPhase` in `project-context.md`.

## Kanban seeding
In semi-autonomous mode: pause for explicit spec approval, then `@product-manager` seeds the Kanban board (`artifacts/output/04-planning/kanban.md`).
In autonomous mode: skip pauses, auto-finalize, seed Kanban.

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-strategy/requirements.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 02-strategy/user-stories.md
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 02-strategy/product-spec.md
```

If measurement plan exists:
```bash
node .agents/scripts/orchestrator_state.js complete --agent data-analyst --artifact 02-strategy/measurement-plan.md
```

After all: `node .agents/scripts/ensure_graph.js doc`

## Memory closeout
```
@memory-controller session-write
Worked on: Product design — {feature/product name}
Decisions made:
- {key PRD scope decision}
- {key design decision}
Next step: Load develop
Blockers: {any open design questions, or "none"}
```

## Handoff
Load `develop` to proceed.

## Delegation
- **Reads:** none
- **Writes:** @writer for product-spec.md, design.md, and product-spec.html
- **Runs:** @executor for orchestrator_state.js complete

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 6`
