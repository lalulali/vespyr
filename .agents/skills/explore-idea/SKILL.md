---
name: explore-idea
description: Turns a validated concept into evidence-backed market, competitor, and user research. Use when the user says "research the market for this", "who are the competitors", "competitive landscape", "validate this with users", "is this market worth entering", or invokes /explore-idea — including brownfield entries from /shape-up with unverified assumptions, and problem-first entries from /unpack-problem whose selected concept needs evidence. Emits market-analysis, competitive-analysis, user-personas, and a research-synthesis Decision Gate with cited evidence. Do NOT use to stress-test whether the concept should exist at all (/validate-idea), to structure raw notes (/shape-up), or to design how to run the research (/research-plan).
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
---
# Explore Idea — Market, Competitor & User Research

<!-- router-skill -->

## What this skill does

Takes a validated idea (from `validate-idea`) and runs the research pipeline. Specialist agents validate market potential, competitive landscape, and user needs in parallel.

**Previous skill:** `validate-idea` (produces the validation brief with demand evidence and open questions)
**Next skill:** After research, load `design` to define requirements and create specs.

## When to invoke
- A validation brief, idea brief, shaped brief, or problem-space brief exists and the user wants market, competitor, and user evidence behind it
- The user says "research this market", "who are the competitors", "validate this with users", or invokes `/explore-idea`
- Entering from `shape-up` with a list of unverified assumptions that need evidence, not a broad sweep

## When NOT to invoke
- The concept itself is still unvalidated and nobody has stress-tested it — run `/validate-idea` first; research cannot rescue a premise that was never tested
- The ask is a problem ("users are dropping off"), not an idea — use `/unpack-problem`
- The ask is structuring raw notes or a pitch — use `/shape-up`

## Halt conditions
Any one halts the pipeline before a verdict is issued:
- Market research returns a `MARKET VERDICT: [NO-GO]` — record why and stop; do not synthesize a brief around a dead market
- The validation brief's premises are contradicted by the research and the conflict cannot be resolved from the evidence — escalate to `@founder` rather than reshaping the verdict to fit
- More than 1 pivot has been consumed — a third pivot is thrash, not exploration; stop and escalate to `@founder`
- Research artifacts are missing or partial when the founder review gate opens — the gate cannot certify on absent evidence

## Done when
- `market-analysis.md`, `competitive-analysis.md`, and `user-personas.md` all exist, each with an attributed source list
- `research-synthesis.md` exists and carries the evidence rollup, the research-agenda coverage table (every carried-in question with a terminal state — no blanks), and the skill-level Decision Gate
- `market-analysis.md` ends with a parseable `MARKET VERDICT: [GO]|[RESHAPE]|[NO-GO]` line (2a's gate, distinct from 3c's `VERDICT:`)
- The skill-level decision is recorded **in `research-synthesis.md`** as a bracketed `VERDICT:` card preceded by its plain sentence (the chat reply carries only the plain wording)
- The uniformly-positive anti-sycophancy pass has run and either refuted its own strongest counter-hypothesis or recorded it as a documented risk with a revisit trigger — with the `[SPC: …]` marker written into `research-synthesis.md`
- If every persona rests on `HYPOTHESIS-ONLY` data (the default), that is stated explicitly and carried as a named risk on any `[GO]`
- `project-context.md` carries the finalized product identity (name, core goal, target audience)
- `@memory-controller session-write` has run

## Prerequisites

Before starting, check for a validation brief:

**Path A — Has validation brief (recommended):**
- [ ] `artifacts/output/01-discovery/validation-brief.md` exists with a GO verdict
- Skip Phase 1 (Synthesize) entirely. Go straight to Phase 2 research. Downstream agents will use `validation-brief.md` directly.

**Path B — No validation brief (direct entry):**
- If the user skips `validate-idea` and comes here directly with a clear concept, run Phase 1 (founder synthesis) to produce `idea-brief.md` first.
- Consider suggesting `validate-idea` if the idea seems unvalidated.

**Path C — Has shaped brief:**
- [ ] `artifacts/output/01-discovery/shaped-brief.md` exists (from `shape-up`)
- The shaped brief's **unverified assumptions** and **open questions** become the focused research agenda. Research agents prioritize validating/invalidating these specific items rather than running a broad-spectrum sweep.
- Skip Phase 1 (Synthesize) entirely. Go straight to Phase 2 research.
- After research completes, recommend re-running `shape-up` to incorporate findings before proceeding to `design`.

**Path D — Has problem-space brief (problem-first entry):**
- [ ] `artifacts/output/02-research/problem-space-brief.md` exists (from `unpack-problem`)
- The problem brief's **selected solution concept** becomes the idea to research. The **root cause**, **JTBD**, and **HMW questions** become the focused research agenda — research agents validate whether the selected concept addresses the root cause and fulfills the identified jobs.
- Skip Phase 1 (Synthesize) entirely. Go straight to Phase 2 research.
- After research completes, recommend running `shape-up` to consolidate findings before proceeding to `design`.

## Workflow steps

**Step 0 — Scope Gate (non-skippable):** anchor scope first via `steps/step-00-scope-and-decision-anchoring.md`; `step_tracker.js` exits 1 if Step 1 begins without a locked track.
Intent triage at gate: Clear (C ≥ 0.85) runs the locked track; Ambiguous (0.50–0.85) halts to a 2–3 Track Fork; Trivial (C < 0.50) executes directly. Gate enforced in all `step_tracking` modes including `off` (DNA 4).

## Harness-Neutral Delegation (tiered dispatch)

Research agents (2a, 2b, 2c) produce independent evidence. When the harness supports it, dispatch them as real subagents — each receives only the validation/idea brief and its own research charter, never another agent's findings (2c is the exception: it consumes 2b's output by design). Fallbacks:

1. **Subagents available** → dispatch 2a and 2b as parallel independent subagents; 2c after 2b completes.
2. **No subagents, but multiple isolated LLM calls possible** → context-firewalled sequential dispatch with the same data contract.
3. **Single shared conversation context only** → run sequentially in-context, but label each artifact degraded: "researched in one context — cross-contamination possible; treat cross-references as weaker evidence."

### Context adaptation (single source of truth — steps 2a/2b/2c cite this, they do not restate it)

| Mode | 2a Market | 2b Competitive | 2c User |
|---|---|---|---|
| **Startup** | Full external market research | Full competitive landscape | Full personas, JTBD, journeys |
| **Company** | Internal market analysis — which teams benefit, what budget exists, what was tried | Internal alternatives — existing tools/teams/vendors, build vs buy | Stakeholder interviews, internal workflow, team pain |
| **Personal** | Lightweight — is anyone else building this? | Open source / free tools; what differs | Self-research — your own pain and use cases |

**Why this lives here and not in each step:** the three step files previously carried verbatim copies of their
row, so any edit had to be made four times and silently drifted when it was not. Steps cite this table.

**Personal mode still requires evidence discipline.** A lighter scope means fewer sections — same contract:
citations and the `MARKET VERDICT:` line are still required.

### Phase 1: Synthesize (skip if validation brief exists)

Step file: `steps/step-01-synthesize.md`

**grill-me offer (Path B only — no validation brief):** Before synthesizing, ask the user:
> "Would you like me to grill you on this concept first (Socratic Q&A, one question at a time) before I produce the idea brief? Or should I proceed with synthesis directly?"
- **"grill me"** → load `grill-me` skill first; return here after the interview is complete.
- **"proceed"** or no preference → continue below.

Invoke `@founder` to take the concept and produce a structured brief. Before starting, load context:
```
@memory-controller load founder [product exploration — synthesize concept]
```
- Synthesize into a clear, one-sentence concept
- Stress-test with Golden Circle (WHY / HOW / WHAT)
- Generate alternatives using SCAMPER, Crazy 8s, analogies
- Converge to ONE strongest direction with rationale
- Define the value proposition and target user
- Identify fatal assumptions for researchers to validate
- Decide which optional agents to summon (§5 of workflow.md)

**Output:** `artifacts/output/01-discovery/idea-brief.md`
- Run completion command: `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/idea-brief.md`

**Gate check:** Before proceeding to Phase 2, verify:
- [ ] Brief contains a one-sentence summary
- [ ] At least 3 assumptions are identified with assigned researchers
- [ ] Optional agent decisions are documented

### Phase 2: Research (parallelizable)

Research agents use the validation brief (or idea brief) as their primary input. If a validation brief exists, agents should focus on the **open questions** listed in it.

Steps 2a and 2b can run **in parallel**. Step 2c depends on 2b's output.

#### Step 2a: Market Research ⟨parallel⟩

Step file: `steps/step-02a-market-research.md`
Invoke `@researcher market` to validate market potential:
- Market size (TAM, SAM, SOM)
- Industry trends and growth rates
- Target customer segments
- Market risks and opportunities

**Context adaptation:** see the mode table in §Context adaptation above.

**Input:** validation brief or idea brief
**Output:** `artifacts/output/02-research/market-analysis.md`
**Completion:** Run immediately when complete:
```bash
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/market-analysis.md
```

#### Step 2b: Competitor Analysis ⟨parallel with 2a⟩

Step file: `steps/step-02b-competitor-analysis.md`
Invoke `@researcher competitive` to map the landscape:
- Direct and indirect competitors
- Competitive comparison matrix
- White-space opportunities
- Pricing and positioning

**Context adaptation:** see the mode table in §Context adaptation above.

**Input:** validation brief or idea brief
**Output:** `artifacts/output/02-research/competitive-analysis.md`
**Completion:** Run immediately when complete:
```bash
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/competitive-analysis.md
```

#### Step 2c: User Research ⟨after 2b⟩

Step file: `steps/step-02c-user-research.md`
Invoke `@user-researcher` to validate user needs:
- Target users and their goals
- Pain points and workarounds
- User personas and journeys
- "How might we" statements

**Context adaptation:** see the mode table in §Context adaptation above.

**Input:** validation brief or idea brief + `artifacts/output/02-research/competitive-analysis.md`
**Output:** `artifacts/output/02-research/user-personas.md`
**Completion:** Run immediately when complete:
```bash
node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/user-personas.md
```

### Phase 3: Founder Review (gate)

After all research completes, review findings against the brief:
- Does the market validate the opportunity? (Check the `MARKET VERDICT: [GO]|[NO-GO]` line at the end of market-analysis.md)
- Does user research confirm the target persona and pain points?
- Does competitive analysis reveal viable positioning?
- **Cross-reference against the validation brief's premises** — do the premises still hold after research?

**Anti-sycophancy gate (SPC):** if all three research artifacts are uniformly positive — no red flags, no disconfirming evidence, no competitive threat — the review has converged prematurely. Before issuing a verdict, run one adversarial pass: name the strongest reason this fails (from the research itself or first principles) and either refute it with evidence or record it as a documented risk. Uniformly rosy research is a red flag, not a green light.

**If research contradicts assumptions**, issue a Decision Gate verdict — **plain sentence first, then the bracketed card** (protocol and depth rules in `steps/step-03-founder-review.md`; format in `.agents/references/vespyr-dna.md` §Decision Gate):
- `[GO]` — **"Build this."** Premises hold; proceed. A qualified go ("proceed with documented risk") requires the risk named in the brief with its evidence and a revisit trigger — never a silent pass. If `When: GATED`, the sentence is **"Build this once \<checkable condition\> — not before."** — never "Build this." followed by a caveat.
- `[RESHAPE]` — **"Keep the why, replace the how."** Revise the brief and re-run Phase 2. A scope adjustment ("refine") is not a verdict — record it as an ADR entry, then re-issue the gate verdict with its plain sentence.
- `[NO-GO]` — **"Don't build this."** Research invalidates the concept; document why and stop (return to problem discovery via `/unpack-problem` if a better concept may exist).
- Maximum 1 pivot before committing to a direction

## Output artifacts

These are the **document** surface — the machine record lives here, and the gates read these files.

- `artifacts/output/01-discovery/idea-brief.md` (only if no validation brief existed)
- `artifacts/output/02-research/market-analysis.md` — ends with `MARKET VERDICT:` (2a's gate)
- `artifacts/output/02-research/competitive-analysis.md`
- `artifacts/output/02-research/user-personas.md`
- `artifacts/output/02-research/research-synthesis.md` — the evidence rollup and the skill-level
  `VERDICT:` gate (3c's gate). **This is the Decision Gate's canonical home** — never write the founder's
  verdict into another agent's research artifact.

**The chat reply is a different surface and carries human wording only.** Give the owner the finding in a
sentence, the decision's consequence, and the next action — then name the file. Never put `VERDICT:`,
`[GO]`/`[RESHAPE]`/`[NO-GO]`, `MARKET VERDICT:`, `When:`, or any card field in the chat. If the record is
worth keeping it belongs in a document; if it is not worth keeping it belongs nowhere
(`.agents/references/vespyr-dna.md` §Two surfaces).

## Handoff to design
When exploration is complete:
1. All research artifacts exist and are complete
2. The concept is validated by evidence
3. No unresolved Decision Gate blockers recorded in the research documents
4. Premises from the validation brief still hold (or have been revised)
5. Update project context with the finalized product identity:
   ```
   @memory-controller write project-context.md
   Update the "Project Name", "Core Goal / Problem", and "Target Audience" fields based on the validated findings.
   ```
6. Write session summary before handing off:
   ```
   @memory-controller session-write
   Worked on: Product exploration — {concept name}
   Decisions made:
   - {market verdict: GO/NO-GO and key finding}
   - {target user confirmed/revised}
   - {key competitive positioning}
   Next step: Load design to define requirements and create specs
   New blockers: {any research gaps or unresolved questions, or "none"}
   ```
7. Load `design` to define requirements and create specs — or load `shape-up` first if findings need consolidation before specs

---

## State Machine Integration

The pipeline state machine (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run:
```bash
node .agents/scripts/orchestrator_state.js status
```

If pipeline is uninitialized, initialize first:
```bash
node .agents/scripts/orchestrator_state.js init --name "<project>" --type <startup|company|personal>
```

Then run `next` to confirm the current phase expects exploration work.

### At End — Record Completion

Record each artifact produced, in this order. The first one transitions the project out of validation; the rest record research outputs.

```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 01-discovery/idea-brief.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/market-analysis.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 02-research/competitive-analysis.md
node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 02-research/user-personas.md
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 02-research/research-synthesis.md
```

`research-synthesis.md` is last because it consumes all three research artifacts; recording it before they
exist would put a gate on the state machine with no evidence behind it.

Skip any artifact that was not produced (e.g., if the user came in with a validation brief, `idea-brief.md` may be skipped).

Each `complete` call fires `agent_invoke` telemetry attributed to the producing agent.
