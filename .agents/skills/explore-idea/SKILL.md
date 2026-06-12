---
name: explore-idea
description: Validates a concept through market, competitor, and user research — turns a validated idea into evidence-backed research
---

## What this skill does

Takes a validated idea (from `validate-idea`) and runs the research pipeline. Specialist agents validate market potential, competitive landscape, and user needs in parallel.

**Previous skill:** `validate-idea` (produces the validation brief with demand evidence and open questions)
**Next skill:** After research, load `design` to define requirements and create specs.

## Prerequisites

Before starting, check for a validation brief:

**Path A — Has validation brief (recommended):**
- [ ] `artifacts/output/00-discovery/validation-brief.md` exists with a GO verdict
- Skip Phase 1 (Synthesize) entirely. Go straight to Phase 2 research. Downstream agents will use `validation-brief.md` directly.

**Path B — No validation brief (direct entry):**
- If the user skips `validate-idea` and comes here directly with a clear concept, run Phase 1 (founder synthesis) to produce `idea-brief.md` first.
- Consider suggesting `validate-idea` if the idea seems unvalidated.

## Workflow steps

### Phase 1: Synthesize (skip if validation brief exists)

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

**Output:** `artifacts/output/00-discovery/idea-brief.md`

**Gate check:** Before proceeding to Phase 2, verify:
- [ ] Brief contains a one-sentence summary
- [ ] At least 3 assumptions are identified with assigned researchers
- [ ] Optional agent decisions are documented

### Phase 2: Research (parallelizable)

Research agents use the validation brief (or idea brief) as their primary input. If a validation brief exists, agents should focus on the **open questions** listed in it.

Steps 2a and 2b can run **in parallel**. Step 2c depends on 2b's output.

#### Step 2a: Market Research ⟨parallel⟩
Invoke `@researcher market` to validate market potential:
- Market size (TAM, SAM, SOM)
- Industry trends and growth rates
- Target customer segments
- Market risks and opportunities

**Context adaptation:**
- **Startup mode:** Full external market research
- **Company mode:** Internal market analysis — which teams/orgs benefit? What budget exists? What similar initiatives have been tried?
- **Personal mode:** Lightweight — is anyone else building this? What's the landscape?

**Input:** validation brief or idea brief
**Output:** `artifacts/output/01-research/market-analysis.md`

#### Step 2b: Competitor Analysis ⟨parallel with 2a⟩
Invoke `@researcher competitive` to map the landscape:
- Direct and indirect competitors
- Competitive comparison matrix
- White-space opportunities
- Pricing and positioning

**Context adaptation:**
- **Startup mode:** Full competitive landscape
- **Company mode:** Internal alternatives — what existing tools, teams, or vendors solve this partially? Build vs. buy analysis.
- **Personal mode:** What open source or free tools exist? What's different about your approach?

**Input:** validation brief or idea brief
**Output:** `artifacts/output/01-research/competitive-analysis.md`

#### Step 2c: User Research ⟨after 2b⟩
Invoke `@user-researcher` to validate user needs:
- Target users and their goals
- Pain points and workarounds
- User personas and journeys
- "How might we" statements

**Context adaptation:**
- **Startup mode:** Full persona development, jobs-to-be-done, user journeys
- **Company mode:** Stakeholder interviews, internal workflow analysis, team pain points
- **Personal mode:** Self-research — your own pain points and use cases

**Input:** validation brief or idea brief + `artifacts/output/01-research/competitive-analysis.md`
**Output:** `artifacts/output/01-research/user-personas.md`

### Phase 3: Founder Review (gate)

After all research completes, review findings against the brief:
- Does the market validate the opportunity? (Check GO/NO-GO in market analysis)
- Does user research confirm the target persona and pain points?
- Does competitive analysis reveal viable positioning?
- **Cross-reference against the validation brief's premises** — do the premises still hold after research?

**If research contradicts assumptions:**
- @founder decides: **pivot** (revise brief and re-run Phase 2), **refine** (adjust scope), or **proceed with documented risk**
- Maximum 1 pivot before committing to a direction

## Output artifacts
- `artifacts/output/00-discovery/idea-brief.md` (only if no validation brief existed)
- `artifacts/output/01-research/market-analysis.md`
- `artifacts/output/01-research/competitive-analysis.md`
- `artifacts/output/01-research/user-personas.md`

## Handoff to design
When exploration is complete:
1. All research artifacts exist and are complete
2. The concept is validated by evidence
3. No unresolved GO/NO-GO blockers from research
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
7. Load `design` to define requirements and create specs

---

## State Machine Integration

The pipeline state machine (`node .agents/scripts/orchestrator_state.js`) is the canonical record of project state. This skill must wire its work into it so other skills, the dashboard, and the code-graph see what happened.

### At Start

Run via `@executor`:
```bash
node .agents/scripts/orchestrator_state.js status
```

If pipeline is uninitialized, initialize first via `squad` or directly:
```bash
node .agents/scripts/orchestrator_state.js init --name "<project>" --type <startup|company|personal>
```

Then run `next` to confirm the current phase expects exploration work.

### At End — Record Completion

Record each artifact produced, in this order. The first one transitions the project out of validation; the rest record research outputs.

```bash
node .agents/scripts/orchestrator_state.js complete --agent founder --artifact 00-discovery/idea-brief.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 01-research/market-analysis.md
node .agents/scripts/orchestrator_state.js complete --agent researcher --artifact 01-research/competitive-analysis.md
node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 01-research/user-personas.md
```

Skip any artifact that was not produced (e.g., if the user came in with a validation brief, `idea-brief.md` may be skipped).

Each `complete` call fires `agent_invoke` telemetry attributed to the producing agent.
