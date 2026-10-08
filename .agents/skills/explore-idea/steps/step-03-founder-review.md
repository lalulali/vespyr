---
step: 3
name: Founder Review
prerequisites:
  - step-02a completed
  - step-02b completed
  - step-02c completed
output_contract:
  citations: required
---

# Step 3 — Founder Review

Gate check after all research completes. The founder reviews findings against the brief and decides the path forward.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill explore-idea --step 3` at step start; `complete --skill explore-idea --step 3` at step close.

## Workflow

### 3a. Load all research

Read:
- `artifacts/output/02-research/market-analysis.md`
- `artifacts/output/02-research/competitive-analysis.md`
- `artifacts/output/02-research/user-personas.md`
- Validation brief (or idea brief)

### 3b. Review findings

`@founder` evaluates:
- Does the market validate the opportunity? (Check GO/NO-GO in market analysis)
- Does user research confirm the target persona and pain points? Inputs labeled `HYPOTHESIS-ONLY (no human data)` count as `[PARTIAL]` evidence — they can inform the decision but cannot confirm persona fit; require a human-run session before treating it as validated.
- Does competitive analysis reveal viable positioning?
- Cross-reference against the validation brief's premises — do premises still hold after research?

### 3c. Decision

**SPC check — before issuing the verdict:** if all three research artifacts are uniformly positive (no red flags, no disconfirming evidence, no competitive threat), run one adversarial pass — name the strongest reason this fails and either refute it with evidence or record it as the risk in a qualified pass. Uniformly rosy research is a red flag, not a green light.

**Emit the marker** so a zero-friction review is visible instead of hiding in prose:

```
[SPC: <one-line adversarial probe> → <survived | cracked: what gave>]
```

A review that closes with no `[SPC: …]` line and no red flag is an unexamined review. The marker belongs in `research-synthesis.md`, not in chat.

**If research contradicts assumptions**, issue a Decision Gate verdict. **Plain sentence first, then the bracketed card** — the token is the machine companion, never the message. Format and depth: `.agents/references/vespyr-dna.md` §Decision Gate (`When:` on `[GO]`; card depth scales with the stakes of the call).
- `[RESHAPE]` — **"Keep the why, replace the how."** Revise the brief and re-run Phase 2.
- `[GO]` — **"Build this."** Premises hold; proceed. A qualified go (proceed despite residual risk) must name the risk in the brief with its supporting evidence and a revisit trigger — never a silent pass. If `When: GATED`, the sentence is **"Build this once \<checkable condition\> — not before."** — never "Build this." followed by a caveat.
- `[NO-GO]` — **"Don't build this."** Abandon the direction; return to problem discovery (`/unpack-problem`).
- A scope adjustment ("refine") is not a verdict — record it as an ADR entry in `artifacts/memory/active-decisions.md` (via `@memory-controller`) naming the trade-off, then re-issue the gate verdict with its plain sentence.
- Maximum 1 pivot before committing to a direction
- A missing or malformed `MARKET VERDICT:` line in market-analysis.md is `[FALSIFIED]` input — re-dispatch Step 2a once, with the template's §7.1 block quoted back to `@researcher` so the shape is unambiguous.
  - **This retry is bounded.** If the line is still absent or malformed on the second attempt, stop and record the failure in `active-decisions.md` as a blocker against the template, then escalate to `@researcher`. Do not re-dispatch a third time: an unbounded re-dispatch loop is the failure mode this bound exists to prevent.

**Two surfaces, and the gate has ONE canonical home.** The skill-level Decision Gate belongs in
`artifacts/output/02-research/research-synthesis.md` — the document this step owns.

**Never write the founder's gate into `market-analysis.md`.** That artifact belongs to `@researcher` (step 2a)
and already ends with its own `MARKET VERDICT:` line. Putting `VERDICT:` there conflates the market sub-gate
with the skill-level decision gate, corrupts another agent's output, and leaves the skill with no canonical
record. `MARKET VERDICT:` (2a's, about the market) and `VERDICT:` (3c's, about the whole concept) are
different gates and live in different files.

**Chat** carries the plain sentence, the consequence, and the next action — no `VERDICT:`, no token, no card
field, no marker (`.agents/references/vespyr-dna.md` §Two surfaces).

### 3d. Write the synthesis (the gate's canonical home)

Write `artifacts/output/02-research/research-synthesis.md`:

- **Evidence rollup** — what each of the three research artifacts actually established, and what it did not.
  Every claim carries its `[^N]` citation back to the source artifact. An unsourced assertion here is a defect.
- **Research-agenda coverage** — each open question carried in from the brief, and its terminal state
  (`COVERED` / `DEFERRED` with owner + revisit trigger / `REJECTED` / `OUT-OF-SCOPE`), per
  `.agents/references/point-coverage.md`. No blanks: a question nobody answered is `DEFERRED`, never silently dropped.
- **Persona evidence status** — whether any persona rests on `HYPOTHESIS-ONLY` data. If **all** of them do
  (the default, since 2c runs no human sessions), say so explicitly and carry it as a named risk on any `[GO]`.
- **The gate** — plain sentence, then the card at the depth the stakes require
  (`.agents/references/vespyr-dna.md` §Decision Gate).

```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 02-research/research-synthesis.md
```

### 3e. Update memory

Delegate to `@memory-controller`:
```
write project-context.md
Update the "Project Name", "Core Goal / Problem", and "Target Audience" fields based on validated findings.
```

```
session-write
Worked on: Product exploration — {concept name}
Decisions made:
- {plain sentence for the market sub-gate} — MARKET VERDICT: [GO]|[RESHAPE]|[NO-GO], {key finding}
- {plain sentence for the concept decision} — VERDICT: [GO]|[RESHAPE]|[NO-GO]
- {target user confirmed/revised, and whether any persona is HYPOTHESIS-ONLY}
- {key competitive positioning}
Next step: Load design to define requirements and create specs
New blockers: {any research gaps or unresolved questions, or "none"}
```

Keep both verdicts in that summary — the market sub-gate (`MARKET VERDICT:`, 2a's) and the concept decision
(`VERDICT:`, this step's) are separate gates and a reader must not have to guess which one is being reported.

### 3f. Handoff

Load `design` to define requirements and create specs — or load `shape-up` first if findings need consolidation before specs.

## Delegation
- **Memory:** @memory-controller for project-context and session-write
