---
step: 3
name: Founder Review
prerequisites:
  - step-02a completed
  - step-02b completed
  - step-02c completed
output_contract:
  citations: not-required
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
- Does user research confirm the target persona and pain points?
- Does competitive analysis reveal viable positioning?
- Cross-reference against the validation brief's premises — do premises still hold after research?

### 3c. Decision

**SPC check — before issuing the verdict:** if all three research artifacts are uniformly positive (no red flags, no disconfirming evidence, no competitive threat), run one adversarial pass — name the strongest reason this fails and either refute it with evidence or record it as the risk in a qualified pass. Uniformly rosy research is a red flag, not a green light.

**If research contradicts assumptions**, issue a Decision Gate verdict as a parseable line `VERDICT: [GO]|[RESHAPE]|[NO-GO] — <reason>`:
- `[RESHAPE]` — revise brief and re-run Phase 2
- `[GO]` — premises hold; proceed. A qualified go (proceed despite residual risk) must name the risk in the brief with its supporting evidence and a revisit trigger — never a silent pass.
- `[NO-GO]` — abandon the direction; return to problem discovery (`/unpack-problem`)
- A scope adjustment ("refine") is not a verdict — record it as an ADR entry in `artifacts/memory/active-decisions.md` (via `@memory-controller`) naming the trade-off, then re-issue the gate verdict.
- Maximum 1 pivot before committing to a direction
- A missing or malformed `MARKET VERDICT:` line in market-analysis.md is `[FALSIFIED]` input — re-dispatch Step 2a before deciding.

### 3d. Update memory

Delegate to `@memory-controller`:
```
write project-context.md
Update the "Project Name", "Core Goal / Problem", and "Target Audience" fields based on validated findings.
```

```
session-write
Worked on: Product exploration — {concept name}
Decisions made:
- {market verdict: GO/NO-GO and key finding}
- {target user confirmed/revised}
- {key competitive positioning}
Next step: Load design to define requirements and create specs
New blockers: {any research gaps or unresolved questions, or "none"}
```

### 3e. Handoff

Load `design` to define requirements and create specs — or load `shape-up` first if findings need consolidation before specs.

## Delegation
- **Memory:** @memory-controller for project-context and session-write
