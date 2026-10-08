---
step: 2
name: Analysis Execution
prerequisites:
  - step-01 completed
output_contract:
  citations: required
---

# Step 2 — Analysis Execution

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill unpack-problem --step 2` at step start; `complete --skill unpack-problem --step 2` at step close (scope-gate skill — tracker not optional here).

Execute or prompt the modular analysis sub-skills based on the selected mode. `@product-manager` owns problem framing; `@user-researcher` owns user perspective.

## Sub-skill delegation

This step invokes the 4 standalone design thinking skills as sub-steps. Each is independently invocable via its own `/` command; here they run as a coordinated sequence.

| Analysis | Sub-skill | Output file |
|----------|-----------|-------------|
| Root cause | `/root-cause` | `root-cause-analysis.md` |
| Empathy | `/empathy-map` | `empathy-map.md` |
| Journey | `/journey-map` | `journey-map.md` |
| JTBD + HMW | `/jtbd` | `jtbd-hmw.md` |

In guided mode, invoke each sub-skill by name. In automated/combination mode, run the sub-skill workflows inline (the analysis logic is the same — the difference is who drives: user vs. agent).

## Mode execution

### Guided mode
Walk the user through each sub-skill interactively, one at a time:

1. **Root cause analysis** — Invoke `/root-cause` sub-skill: Apply 5 Whys or Fishbone to the problem statement. Ask: "What caused this? And what caused that?" Continue until root cause is reached. Output: write `root-cause-analysis.md`.

2. **Empathy mapping** — Invoke `/empathy-map` sub-skill: For the affected user segment, map: Says (what they verbalize), Thinks (what they don't say aloud), Does (observable behaviors), Feels (emotional state). Output: write `empathy-map.md`.

3. **Journey mapping** — Invoke `/journey-map` sub-skill: Map the current-state user journey. Where does the pain point occur? What's the emotional arc before, during, and after? Output: write `journey-map.md`.

4. **Jobs-to-be-done + How Might We** — Invoke `/jtbd` sub-skill: Formulate JTBD statements: "When {context}, I want to {action}, so I can {outcome}." For each job, generate HMW opportunity questions. Output: write `jtbd-hmw.md`.

### Automated mode
`@product-manager` and `@user-researcher` auto-draft all four artifacts based on the problem statement. Run the sub-skill workflows (same analysis logic, agent-driven rather than user-driven).

**Dispatch ladder (mandatory):**
1. Subagents available → dispatch `@product-manager` and `@user-researcher` as independent subagents; their artifact drafts are genuinely independent.
2. No subagents, but multiple isolated LLM calls possible → context-firewalled sequential dispatch (each call: problem statement + its own persona only).
3. Single shared context only → run inline, but label every artifact `[AUTO-DRAFT: single-context simulation — perspectives will converge; validate with real users]`. Never present simulated perspectives as independent agent findings.

## Artifact shape contracts

`problem-space-brief.md` has a template (`.agents/templates/discovery/problem-brief.md`, cited at step 4).
The four analysis artifacts do **not** all ship one, so the shape is declared here. Either a step cites a
template or it states the shape inline — an artifact whose structure nobody defines is where downstream
readers get silently incompatible documents.

| Artifact | Shape contract |
|---|---|
| `root-cause-analysis.md` | Problem statement → 5-Whys chain (≥3 levels, each level naming what it disproves) **or** Fishbone across People/Process/Technology/Environment/Policy → root cause → contributing factors → the assumption that, if false, collapses the chain |
| `empathy-map.md` | One block per segment: Says / Thinks / Does / Feels, all four populated (an empty quadrant is a finding, not a blank) → per-segment riskiest assumption |
| `journey-map.md` | Phases before / at / after the pain point, each with: user goal, action, touchpoint, emotion, friction → the moment the pain is created → where a fix would land |
| `jtbd-hmw.md` | **Template exists** — `.agents/templates/discovery/jtbd-hmw.md`. Use it; do not improvise. JTBD must follow "When {context}, I want to {action}, so I can {outcome}", and every HMW question must be open-ended |

Every row also carries the resolved `[AUTO-DRAFT: …]` or `[USER-SOURCED: …]` label and its riskiest
assumption.

Log the resolved tier: `node .agents/scripts/roundtable_eval.js log --mode <native|solo|refused> --tool unpack-problem --topic "{problem statement}" --agents "@product-manager,@user-researcher"`.

### `[AUTO-DRAFT: …]` label — required on EVERY tier

Every artifact produced in automated or combination mode is a **simulated perspective**, regardless of how
it was dispatched. Native subagents still *simulate* users; dispatch changes independence, not evidence.
So the label is required on tiers 1, 2, **and** 3 — with the reason recorded per tier:

| Tier | Label |
|---|---|
| 1 — native subagents | `[AUTO-DRAFT: simulated user perspective, no human data — independent seats, still unvalidated]` |
| 2 — firewalled sequential calls | `[AUTO-DRAFT: simulated user perspective, no human data — context-firewalled, still unvalidated]` |
| 3 — single shared context | `[AUTO-DRAFT: single-context simulation — perspectives will converge; validate with real users]` |

Guided mode is the exception, and only because the user supplies the content in session: label artifacts
`[USER-SOURCED: {session date}]` when the user stated it, and `[AUTO-DRAFT: …]` for anything you filled in.
Never present a simulated perspective as an observed finding or an attributed quote.

### Combination mode (default)
Run automated mode first to produce drafts. Then walk the user through each artifact for review and refinement. For each artifact, report "what this revealed" tied to the problem statement, then ask pointed questions about the weakest finding (e.g., "the empathy map's Feels quadrant has no evidence — which of these emotions did you actually observe?"). Update artifacts after each refinement.

## Optional: Research plan
If the problem brief reveals that user research is needed before analysis can be complete, invoke `/research-plan` to build a 2-part interview guide (Profile + Behavioral). This is optional — only when the analysis surfaces the need for primary research.

## Output validation

After producing all artifacts, verify — each line is a real check, not a vibe:

- Root cause is deeper than the symptom (at least 3 whys deep)
- Empathy map has entries in all 4 quadrants
- Journey map covers before/during/after the pain point
- JTBD statements follow the "When/I want to/so I can" template
- HMW questions are open-ended (not yes/no)
- **Every artifact carries its `[AUTO-DRAFT: …]` or `[USER-SOURCED: …]` label** and names its riskiest assumption
- **Every artifact matches its declared shape contract** in §Artifact shape contracts
- No artifact asserts an observed user fact or an attributed quote that no human supplied

## Memory closeout
- `@memory-controller session-write` — record step 2 analysis execution progress and generated artifacts.

## Delegation
- **Memory:** @memory-controller for session-write
