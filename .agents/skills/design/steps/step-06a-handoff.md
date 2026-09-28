---
step: 6a
name: Handoff
mode: create
prerequisites:
  - step-05 completed
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
- If a prototype was produced, did `@product-designer` and `@tech-lead` complete `prototype-collaboration.md`?
- Does `prototype_collab_gate.js verify` pass for the selected track, runtime, and prototype?
- Is the selected prototype track (`static-html` or `nextjs-component`) recorded and does its runtime match the handoff?

## Gate checklist
- `requirements.md` exists ✓
- `requirements.md` follows `.agents/templates/product/prd-template.md` ✓ — **verified by `node .agents/scripts/template_conformance.js check --mode create` (exit 0)**
- `user-stories.md` exists ✓
- `user-stories.md` follows `.agents/templates/product/user-story-template.md` ✓ — **verified by the same command (exit 0)**
- `product-spec.md` exists ✓
- `product-spec.html` exists ✓
- `design.md` exists ✓
- `design.md` obeys the Anti-generic rule ✓ — **verified by `node .agents/scripts/anti_generic_check.js check` (exit 0)**
- `prototype-collaboration.md` exists when a prototype was produced ✓
- All ACs are testable ✓
- No blocking open questions remain ✓
- UX sign-off (if applicable) ✓

## Template conformance validator (blocking)

The handoff is blocked until this command exits 0 — it is the mechanical enforcement of the two template-conformance checklist lines above (prose "✓" is not sufficient):

```bash
node .agents/scripts/template_conformance.js check --mode create --json
```

A compact/off-template `requirements.md` (missing §§1–14, FR/NFR tables) or a flat `user-stories.md` (no Epic/Feature hierarchy, missing metadata, single-line ACs) fails this gate. Fix the documents against their templates — do not waive.

## Anti-generic validator (blocking)

The handoff is blocked until this command exits 0 — it is the mechanical enforcement of the two `design.md` checklist lines above (prose "✓" is not sufficient):

```bash
node .agents/scripts/anti_generic_check.js check --json
```

A `design.md` with a banned navy dark surface, a missing/placeholder signature differentiator, an unfilled taste brief, a starter Inspiration shelf, or — for a motion-led Product context (Vibrant Brand-First / Conversion Storefront) — empty Motion tables with no recorded skip, fails this gate. This is the enforcement for the reported "always ends up traditional design" defect. Fix by restarting from the brief — do not waive.

## Motion spec validator (blocking when motion is in scope)

When `motion-spec.md` exists, the handoff is additionally blocked until this command exits 0:

```bash
node .agents/scripts/motion_spec_check.js check --json
```

It parses the real `motion-spec.md` and fails on any incomplete `MO-###` prompt (missing field, non-composited animated property, non-fade reduced-motion fallback, non-numeric timing tolerance), a spec-side orphan, or a prompt not referenced in `user-stories.md`. When `motion-spec.md` is absent the script exits 0 (motion not in scope) and this line is a no-op.

## Prototype collaboration validator

When a prototype is in scope, the handoff is blocked until this command exits 0:

```bash
node .agents/scripts/prototype_collab_gate.js verify \\
  --record artifacts/output/03-strategy/prototype-collaboration.md \\
  --track <static-html|nextjs-component> \\
  --prototype <prototype> --scope handoff --json
```

## Architect phase gate (interactive choice)
**Pause and ask the user** before loading `develop`:
- **Option A (Architect first):** Invoke `@architect` for components, models, schemas, ADRs. Recommended for greenfield features, complex integrations.
- **Option B (Direct to Developer):** Bypass architecture. Hand off specs directly to `@tech-lead` for planning. Recommended for straightforward features.

Based on choice, set `ArchitectPhase` in `project-context.md`.

## Kanban seeding
In semi-autonomous mode: pause for explicit spec approval, then `@product-manager` seeds the Kanban board (`artifacts/output/05-planning/kanban.md`).
In autonomous mode: skip pauses, auto-finalize, seed Kanban.

## State machine
```bash
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 03-strategy/requirements.md
node .agents/scripts/orchestrator_state.js complete --agent product-manager --artifact 03-strategy/user-stories.md
node .agents/scripts/orchestrator_state.js complete --agent product-designer --artifact 03-strategy/product-spec.md
```

If measurement plan exists:
```bash
node .agents/scripts/orchestrator_state.js complete --agent data-analyst --artifact 03-strategy/measurement-plan.md
```

## Memory closeout
```
@memory-controller session-write
Worked on: Product design — {feature/product name}
Decisions made:
- {key PRD scope decision}
- {key design decision}
- Prototype track/runtime: {track/runtime or "not in scope"}
- Designer–tech collaboration: {SATISFIED/BLOCKED or "not in scope"}
Next step: Load develop
Blockers: {any open design questions, or "none"}
```

## Handoff
Include the selected prototype track, runtime, prototype path, and collaboration status in the handoff summary. Load `develop` to proceed.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-create --step 6`
