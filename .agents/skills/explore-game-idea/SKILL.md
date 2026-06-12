---
name: explore-game-idea
description: Validates a game concept through genre market, competitive landscape, and player research — turns a validated game idea into evidence-backed research
---

## What this skill does

Takes a validated game concept (from `validate-game-idea`) and runs the research pipeline. Specialist agents validate genre market potential, competitive landscape, and player needs in parallel.

**Previous skill:** `validate-game-idea` (produces the validation brief with demand evidence and open questions)
**Next skill:** After research, load `design` to define requirements and create specs.

## Prerequisites

Before starting, check for a validation brief:

**Path A — Has validation brief (recommended):**
- [ ] `artifacts/output/00-discovery/validation-brief.md` exists with a GO verdict
- Skip Phase 1 (Synthesize) entirely. Go straight to Phase 2 research. Downstream agents will use `validation-brief.md` directly.

**Path B — No validation brief (direct entry):**
- If the user skips `validate-game-idea` and comes here directly with a clear concept, run Phase 1 (founder synthesis) to produce `idea-brief.md` first.
- Consider suggesting `validate-game-idea` if the idea seems unvalidated.

## Workflow steps

### Phase 1: Synthesize (skip if validation brief exists)

**Template:** Use `.agents/templates/game-idea-brief-template.md` for the founder memo.

**grill-me offer (Path B only — no validation brief):** Before synthesizing, ask the user:
> "Would you like me to grill you on this game concept first (Socratic Q&A, one question at a time) before I produce the idea brief? Or should I proceed with synthesis directly?"
- **"grill me"** → load `grill-me` skill first; return here after the interview is complete.
- **"proceed"** or no preference → continue below.

Invoke `@founder` to take the concept and produce a structured brief. Before starting, load context:
```
@memory-controller load founder [game product exploration — synthesize concept]
```
- Synthesize into a clear, one-sentence concept (the "pitch sentence")
- Stress-test with Golden Circle (WHY this experience matters / HOW it's different / WHAT the player actually does)
- Generate alternatives using genre remixing, mechanic mashups, lateral analogies
- Converge to ONE strongest direction with rationale
- Define the value proposition and target player
- Identify fatal assumptions for researchers to validate
- Decide which optional agents to summon (§5 of workflow.md)

**Output:** `artifacts/output/00-discovery/idea-brief.md`

**Gate check:** Before proceeding to Phase 2, verify:
- [ ] Brief contains a one-sentence pitch
- [ ] At least 3 assumptions are identified with assigned researchers
- [ ] Optional agent decisions are documented

### Phase 2: Research (parallelizable)

Research agents use the validation brief (or idea brief) as their primary input. If a validation brief exists, agents should focus on the **open questions** listed in it.

Steps 2a and 2b can run **in parallel**. Step 2c depends on 2b's output.

#### Step 2a: Market Research ⟨parallel⟩
**Template:** `.agents/templates/game-market-analysis-template.md`

Invoke `@researcher market` to validate genre market potential:
- Genre market size and growth (Steam Spy, platform data, genre reports)
- Target platform dynamics (Steam, console, mobile, web — where does this player live?)
- Pricing models and revenue benchmarks for the genre (premium, F2P, subscription, DLC)
- Platform risks and opportunities (algorithm changes, discovery, saturation)

**Context adaptation:**
- **Startup mode:** Full external genre market research, Steam/platform data, revenue benchmarks
- **Company mode:** Internal market analysis — which player segments does the publisher/studio already reach? What budget exists? What similar titles have been shipped?
- **Personal mode:** Lightweight — what's the genre landscape? Is anyone else building this? What's the typical scope?

**Input:** validation brief or idea brief
**Output:** `artifacts/output/01-research/market-analysis.md`

#### Step 2b: Competitor Analysis ⟨parallel with 2a⟩
**Template:** `.agents/templates/game-competitive-analysis-template.md`

Invoke `@researcher competitive` to map the genre landscape:
- Direct competitors (same genre + similar experience loop)
- Indirect competitors (different genre, same player itch — e.g., a cozy game vs. a farming sim)
- Feature comparison matrix (mechanics, art style, monetization, session design)
- Player sentiment analysis (Steam reviews, Reddit, Discord — what do players love and hate?)
- White-space opportunities (gaps in the genre no one is filling)
- Positioning and pricing comparison

**Context adaptation:**
- **Startup mode:** Full competitive landscape — every game in the space, player sentiment, feature gaps
- **Company mode:** Internal portfolio comparison — what has the studio shipped? What's the cannibalization risk? Build vs. buy (acquire IP?)
- **Personal mode:** What free or low-cost alternatives exist? What's genuinely different about your approach?

**Input:** validation brief or idea brief
**Output:** `artifacts/output/01-research/competitive-analysis.md`

#### Step 2c: Player Research ⟨after 2b⟩
**Template:** `.agents/templates/game-user-personas-template.md`

Invoke `@user-researcher` to validate player needs:
- Target player personas (play style, library, session habits, what makes them evangelize)
- Player motivations and "itches" (what brings them back? What makes them quit?)
- Player journeys (first 5 minutes → first hour → first 10 hours → 100 hours)
- Engagement hooks and retention mechanics (what do they grind? What do they talk about?)
- "How might we" statements framed for player experience

**Player motivation frameworks to apply:**
- **Bartle Taxonomy** — classify the target player as Killer, Achiever, Socializer, or Explorer. Most players blend types; identify the primary and secondary. The core loop should serve the primary type explicitly.
- **Quantic Foundry Gamer Motivation Profile** — map motivations across Action, Social, Mastery, Achievement, Immersion, and Creativity axes. Use this to validate whether the proposed mechanics match the stated target player's actual motivation profile.
- **Session design lens** — what does the player feel at minute 1, minute 10, minute 60? Where is the natural quit point, and is it intentional?

**Context adaptation:**
- **Startup mode:** Full persona development, play-style segmentation, session analysis, community research
- **Company mode:** Existing player base analysis — who plays the studio's other titles? What do they want next?
- **Personal mode:** Self-research — your own play habits, what games you bounce off and why

**Input:** validation brief or idea brief + `artifacts/output/01-research/competitive-analysis.md`
**Output:** `artifacts/output/01-research/user-personas.md`

### Phase 3: Founder Review (gate)

After all research completes, review findings against the brief:
- Does the genre market validate the opportunity? (Check GO/NO-GO in market analysis)
- Does player research confirm the target persona and experience itch?
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
5. Write session summary before handing off:
   ```
   @memory-controller session-write
   Worked on: Game product exploration — {concept name}
   Decisions made:
   - {genre market verdict: GO/NO-GO and key finding}
   - {target player confirmed/revised}
   - {key competitive positioning in genre}
   Next step: Load design to define requirements and create specs
   New blockers: {any research gaps or unresolved questions, or "none"}
   ```
6. Load `design` to define requirements and create specs

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
