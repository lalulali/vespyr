---
step: 0
name: Scope & Decision Anchoring
output_contract:
  citations: not-required
---

# Step 0 — Scope & Decision Anchoring (Non-Skippable Gate)

Halt condition for underspecified briefs. No mode routing or Step 1 work may begin until the scope track is locked.

## 1. Input Inspection
Confirm the user prompt states all three:
- **Concrete outcome** — the artifact or result this `/design` run produces
- **Boundary constraints** — platform invariants, design-system constraints, breakpoints in/out of scope
- **Target decision** — the decision this design work informs

## 2. Staleness Hook (all modes — 02n.1)
Before mode routing, run the deterministic witness check:

```bash
node .agents/scripts/step0_staleness.js --report artifacts/output/03-strategy/parity-report.md
```

- **exit 0** → proceed (`witness: fresh` or `absent` — nothing frozen yet).
- **exit 1** (`[BLOCK] ...`) → **HALT**. A stale, broken, or partial freeze witness blocks every mode. Restore the frozen prototype, or run the step-05d Spike Rollback to re-extract and re-witness, before any step executes.
- **script missing / unexpected failure** → **HALT loudly**. Never proceed silently — a bypassed staleness gate is a correctness failure (DoD 3).

Reverse mode additionally requires the **SPEC.md Spec Kernel anchor** (`artifacts/output/03-strategy/SPEC.md`); missing kernel → halt (Review 10 §4) **for the `generated` sub-track only**. See the prototype-source resolution below — the `imported` sub-track derives the kernel instead of halting.

## Reverse-mode prototype source (resolve before Step 1 — sub-track selection)

Reverse mode has two sub-tracks that differ only in *where the prototype comes from* and *whether a kernel already exists*. Downstream synthesis (Evidence Ledger → PRD synthesis → parity gate) is identical for both.

- **`generated`** — the prototype was produced by Vespyr's own prototype track and lives in the project. A SPEC.md Spec Kernel already exists (forward PM flow). A **freeze witness** in `parity-report.md` gates staleness. Missing kernel → halt. Route Step 1 → `steps/step-01d-ingest-prototype.md`.
- **`imported`** — the prototype was authored outside Vespyr (Figma export, Google Stitch, hand-coded HTML for pixel-perfect fidelity) and dropped into `artifacts/input/prototype/`. There is no upstream PM flow, so **no SPEC.md kernel exists yet** — reverse mode derives it (`steps/step-00e-derive-kernel.md`) instead of halting. Staleness is gated by an **import witness** (a SHA-256 hash of the imported file taken at ingest). Route Step 1 → `steps/step-01e-ingest-imported.md`.

Resolve the sub-track by evidence:
- `artifacts/input/prototype/` contains a reachable prototype ∧ no `artifacts/output/03-strategy/SPEC.md` → **`imported`**.
- A project prototype exists with a SPEC.md kernel (forward flow) → **`generated`**.
- If both signals are present, ask the owner which source is authoritative; do not guess.

> **Import witness vs freeze witness (honest limitation — do not oversell):** both are stored SHA-256 hashes used as tamper-checks. A **freeze witness** can promise the prototype is the whole truth and won't change, because Vespyr generated and controls it. An **import witness** only proves *the imported file* is unchanged since ingest — it **cannot** see the design tool it came from. If a designer edits Figma/Stitch and does not re-export, the imported file still matches its hash while the real design has moved on. Detecting a design-tool edit is a **human responsibility**; the engine cannot enforce origin parity, only file parity.

## Prototype track selection (when prototyping is in scope)

Lock one track before prototype work begins:

- **`static-html`** — vanilla HTML/CSS/JS with Tailwind Browser CDN and shadcn-flavored visual tokens/patterns. This is a visual/interaction prototype, not installed shadcn components; React, Next.js, and `@shadcn/lint` are not prerequisites.
- **`nextjs-component`** — Next.js + React + Tailwind + shadcn source components for an engineering-ready prototype. `@shadcn/lint` is mandatory and the R1 lint gate is mandatory.

An explicit user choice wins. A recorded project preference may provide a default but never overrides the user. If neither exists, pause with a two-track fork and ask which prototype outcome is wanted; do not let `shadcn_gate detect` silently choose a track. Record `Prototype Track` and `Prototype Runtime` through `@memory-controller` before Step 1.

## 3. Decision Fork
- **Unambiguous (C ≥ 0.85):** proceed to mode routing (reverse / create / edit / validate) — reverse checked FIRST (A1).
- **Ambiguous / multi-track (0.50 ≤ C < 0.85):** HALT. Emit the 2–3 Track Fork card — e.g., full create flow vs edit of existing spec vs heuristic-validate only. Each track names its recommended `@agent` + `/skill` handles. Wait for selection. Zero artifact scaffolding to `artifacts/output/` before selection (GUARDRAILS: Anti-Premature Execution).
- **Trivial single-action (C < 0.50):** execute directly — do not run this skill at all.
- **Reverse-first precedence (A1):** when artifact signals collide (prototype source or `prototype-inventory.md` present ∧ no `requirements.md`), reverse wins — route to `steps/step-01d-ingest-prototype.md`, never create.
- **Deterministic evidence:** `node .agents/scripts/step_tracker.js route --skill design --json` reports artifact presence + witness state + the computed route (A1 precedence). Lock the returned track (`reverse` / `create` / `edit`; `rollback` → HALT to step-05d). The route is evidence, not an override — the staleness hook above still gates.

## 4. Satisfaction Checkpoint
After track selection, lock the scope (the selected mode is the track) before advancing:

```bash
node .agents/scripts/step_tracker.js scope-lock --skill design --track "<create|edit|validate|reverse>"
node .agents/scripts/step_tracker.js begin --skill design --step 0
```

Record `[SCOPE_LOCKED: <track-name>]` (`scope_locked: true`, `track_selected: "<track-name>"`) in the session summary.

**Deterministic enforcement:** `step_tracker.js` exits 1 with `[ERROR] Step 0 Scope Gate bypassed. Scope must be locked before Step 1 execution.` on any `begin --step 1+` for this skill while no scope lock is recorded.

```bash
node .agents/scripts/step_tracker.js complete --skill design --step 0
```
