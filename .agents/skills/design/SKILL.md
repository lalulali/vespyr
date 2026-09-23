---
name: design
description: Defines product requirements from validated ideas, then produces detailed developer-ready specs. Supports reverse (prototype-first), create, edit, and validate modes.
metadata:
  version: "1.1"
---

# Design

Bridges exploration and development. Takes validated ideas and turns them into a PRD with requirements, user stories, and detailed product specs with flows, interactions, and visual direction.

## Prerequisites
- Reverse mode: `artifacts/output/03-strategy/SPEC.md` Spec Kernel (Review 10 §4) + a reachable prototype source (HTML mock, code, Figma export, AI-generated prototype); no `requirements.md` yet.
- Create/edit/validate: `artifacts/output/01-discovery/validation-brief.md` OR `idea-brief.md` OR `shaped-brief.md`
- `artifacts/output/02-research/market-analysis.md` (optional if entering via `shape-up` with all assumptions verified)
- `artifacts/output/02-research/competitive-analysis.md` (optional if entering via `shape-up`)
- `artifacts/output/02-research/user-personas.md` (optional if entering via `shape-up`)

If entering from `shape-up` with all assumptions verified, research artifacts are optional.
If entering from `explore-idea`, all research artifacts should exist. If any are missing, load `explore-idea` first.

## Skill chain
- Prev: `explore-idea`, `shape-up`, or `game-explore-idea`
- Next: `develop`

## Primary personas
- `@product-manager` — owns requirements, user stories, and PRD scope
- `@product-designer` — owns screen specs, design tokens, and product spec

These personas are invoked by step files. The router declares them so the agent knows which reasoning personas are active for this skill before loading steps.

## Harness adherence (non-negotiable)
> **Intent gate:** entering Create mode on an unvalidated idea at a commitment gate (budget/headcount/calendar about to be committed)? Escalate to `/grill-me` first (Intent Escalation Ladder Level 3 — `vespyr-dna.md`). Ordinary ambiguities stay at Levels 0–2.

- Follow the step sequence for the selected mode exactly. Do NOT skip steps or reorder them.
- Each step file is a contract. Read it fully before executing. Step files override general guidelines.
- Mode detection is automatic. The router decides reverse/create/edit/validate (reverse checked first, A1). Do NOT ask the user which mode unless the intent is genuinely ambiguous.

## Mode selection + routing
Detect by checking for existing artifacts + parsing user wording:
**Step 0 — Scope Gate (non-skippable):** anchor scope first via `steps/step-00-scope-and-decision-anchoring.md`; the selected mode is the locked track. Step 0 also runs the staleness hook (`step0_staleness.js` — a stale, broken, or partial freeze witness blocks every mode; script failure halts loudly). `step_tracker.js` exits 1 if Step 1 begins without a locked track.
Intent triage at gate: Clear (C ≥ 0.85) runs the locked track; Ambiguous (0.50–0.85) halts to a 2–3 Track Fork; Trivial (C < 0.50) executes directly. Gate enforced in all `step_tracking` modes including `off` (DNA 4).

- **Reverse (checked FIRST — A1)** → `prototype-inventory.md` exists ∧ no `requirements.md`; or the user arrives prototype-first (prototype source present, no requirements). Requires the SPEC.md Spec Kernel anchor. Route: `steps/step-01d-ingest-prototype.md`
- **Create** → no `requirements.md` or `product-spec.md` exists (and no prototype-first signal). Route: `steps/step-01a-load-prd-brief.md`
- **Edit** → artifacts exist, user wants to refine. Route: `steps/step-01b-load-existing.md`
- **Validate** → artifacts exist, user wants design review. Route: `steps/step-01c-heuristic-eval.md`

If unclear, ask: "Are you designing from scratch, refining existing specs, reviewing a design, or turning a prototype into a PRD?"

## UI stack gate (shadcn/Tailwind — owner request 2026-09-23)

Runs only when the user has NO recorded stack preference (prompt / `project-context.md` / `design.md`). Evidence beats questions — detect first:

1. **Detect:** `node .agents/scripts/shadcn_gate.js detect --json`
   - `stack: shadcn|tailwind` → chosen (evidence: `components.json` / dependencies).
   - `stack: none` → ask exactly one question: "Use the shadcn/Tailwind stack?" Yes → chosen; No → normal flow. Never ask when evidence already answers; never re-ask once a preference is recorded (write it to `project-context.md`).
2. **shadcn MCP (only when stack = shadcn):** detect result `mcp: absent | disabled | installed`
   - `absent`/`disabled` → ask: "Install/enable the shadcn MCP server (browse, search, and install registry components)?" Yes → add/enable in `opencode.json` per https://ui.shadcn.com/docs/mcp:
     `"mcp": { "shadcn": { "type": "local", "command": ["npx", "shadcn@latest", "mcp"], "enabled": true } }` (or `pnpm dlx shadcn@latest mcp init --client <client>`), then restart the harness. No → continue without it — **MCP never gates design**. Classified `gated` in `.agents/scripts/validate_matrix.js`.
3. **Guideline lint (stack = shadcn/tailwind):** `@shadcn/lint` is the machine-checkable design guideline.
   - Not configured → set it up before any UI work: "Read https://github.com/shadcn-ui/lint/blob/main/SETUP.md and set up @shadcn/lint in this project" (confirm installs with the user).
   - When the stack is chosen, author prototypes/UI as component code (React/Vue/Svelte + Tailwind) — one-off HTML mocks are outside the linter's reach.
   - After every UI/prototype change run `npm run lint`; **zero `shadcn/*` violations before any gate** (step-01d completeness, handoff, dev loop). The lint error is the fix instruction — loop until green.
   - Mechanical check: `node .agents/scripts/shadcn_gate.js verify` exits 1 when a chosen stack has no lint configured (test-backed: `tests/test_shadcn_gate.test.js`).

## Create mode step sequence
1. Load PRD Brief → `steps/step-01a-load-prd-brief.md`
2. Define Personas → `steps/step-02a-define-personas.md`
3. User Stories → `steps/step-03a-user-stories.md`
4. Screen States → `steps/step-04a-screen-states.md`
5. Design Tokens → `steps/step-05a-design-tokens.md`
6. Handoff → `steps/step-06a-handoff.md`

## Reverse mode step sequence (prototype-first)
1. Ingest Prototype → `steps/step-01d-ingest-prototype.md`
2. Evidence Ledger → `steps/step-02d-evidence-ledger.md`
3. PRD Synthesis (looped create steps 02a→05a, ledger as fixed input) → `steps/step-03d-prd-synthesis.md`
4. Parity Gate → `steps/step-04d-parity-gate.md`
5. Spike Rollback (Sync Contract v2 — invoked only on QA falsification) → `steps/step-05d-sync-contract.md`

## Edit mode step sequence
1. Load Existing → `steps/step-01b-load-existing.md`
2. Identify Gaps → `steps/step-02b-identify-gaps.md`
3. Revise → `steps/step-03b-revise.md`
4. Finalize → `steps/step-04b-finalize.md`

## Validate mode step sequence
1. Heuristic Eval → `steps/step-01c-heuristic-eval.md`
2. Consistency Check → `steps/step-02c-consistency-check.md`
3. Accessibility Check → `steps/step-03c-a11y-check.md`
4. Lock & Handoff → `steps/step-04c-lock-handoff.md`

## Output artifacts
`requirements.md`, `user-stories.md`, `product-spec.md`, `product-spec.html`, `design.md`, plus `measurement-plan.md` and `ux-research-report.md` (optional).
## State & memory integration
At start, run: `node .agents/scripts/orchestrator_state.js status` then `next`. Also: `@memory-controller load product-manager [design — {feature}]`

**After PRD + user stories (create step 3 / edit step 3):** Write key product decisions:
```
@memory-controller write active-decisions.md
### [PRODUCT] {feature} design decisions [date: YYYY-MM-DD] [agent: @product-manager]
{key decisions: scope boundaries, prioritized stories, deferred items}
**Status:** active
```

**Memory:** Final step in each mode closes with `@memory-controller session-write` — mandatory per GUARDRAILS §Session Continuity.
