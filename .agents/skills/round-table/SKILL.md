---
name: round-table
description: 'Orchestrates group discussions between Vespyr agents, enabling natural multi-agent conversations where each agent is a real subagent with independent thinking. Use when the user requests a roundtable, wants multiple agent perspectives, group discussion, or stage-based alignment.'
compatibility: claude-code opencode kiro antigravity
allowed-tools: Read Write Edit Grep Glob Bash AskUserQuestion
---

# Roundtable Discussion

Facilitate roundtable discussions where Vespyr agents participate as **real subagents** — each spawned independently through the active harness's subagent capability so they think for themselves. You are the host and orchestrator: you determine the stage of development, pick the relevant voices, build context, spawn agents in parallel, and present their responses.

In default subagent mode, never generate agent responses yourself — that's the whole point. In `--solo` mode, you still never generate responses yourself: each persona is dispatched as its own context-firewalled LLM call (see Arguments). If the harness cannot make isolated calls, refuse the roundtable — never simulate a debate in one shared context.

## Why This Matters

Roundtable discussions yield genuinely independent perspectives. When one LLM roleplays multiple characters, their opinions tend to merge and feel performative. By spawning each agent as its own subagent process — or, on harnesses without subagents, as context-firewalled sequential LLM calls — you get real diversity of thought: agents that actually disagree, catch things others miss, and bring their authentic expertise to bear. The independence primitive is context isolation, not the process mechanism (see Harness-Neutral Delegation).

## Arguments

The roundtable skill accepts optional arguments:

- `--model <model>` — Force all spawned participants to use a specific model when the active harness supports model selection (e.g. `--model flash`, `--model premium`). When omitted, use the active harness's default model; do not infer a model tier from agent frontmatter unless the loaded configuration defines one.
- `--solo` — Run without spawning subagents, for harnesses that cannot spawn them but can issue multiple isolated LLM calls. Dispatch each persona as its own LLM call that receives only the user's topic, the loaded memory context, and that persona's file — never another agent's output. Phase 2+ cross-examination passes a targeted stance into the next agent's call, mirroring how subagent mode passes context between subagents. Announce solo mode on activation and disclose that its output is degraded relative to native mode. Speed alone is not a valid reason to collapse the panel into one shared context. Solo panels cap at 5 seats, same as native — the matcher enforces the cap and errors on overflow. Every solo transcript MUST open with a machine-readable marker line `[MODE: solo — isolated calls, {n} seats]` — marker-less solo transcripts fail verification (`roundtable_eval.js score` lists them under solo disclosure failures).

## Harness-Neutral Delegation

Delegation path: reasoning → selected persona roles | direct-fallback

Degraded-mode policy lives in the shared contract `.agents/references/degraded-mode-tiers.md` (tiers, `--simulated` exception rule, telemetry) — this skill does not restate it. Roundtable-specific additions: Phase 2+ cross-examination passes a targeted stance into the next agent's call, mirroring how subagent mode passes context between subagents; every solo transcript MUST open with `[MODE: solo — isolated calls, {n} seats]` (marker-less solo transcripts fail verification).

## On Activation

1. **Parse arguments** — check for `--model` and `--solo` flags.
2. **Resolve the agent roster** — read from `.agents/agents/` using the resolver. The resolver enumerates the available personas and marks `@memory-controller` with `reasoningParticipant: false` — never seat it as a reasoning participant. Then apply the Topic-Tag Router below against the user's topic — filter by table match, not by improvisation:
   ```bash
   node .agents/scripts/resolve_agents.js
   ```
3. **Determine current phase/stage** — read the pipeline state file as the source of truth (`pipeline-state.json`). Use the project context file only as a context mirror when the pipeline state is unavailable; if the two disagree, report the pipeline value and the drift.
4. **Load shared memory context** — before the discussion starts, load context so agents have project awareness:
   ```bash
   node .agents/scripts/memory_filter.js --agent founder --task "round table discussion: {user's topic}"
   ```
   Store the returned context to inject into each subagent prompt.
   **Brainstorm intake:** if the topic arrives with a `brainstorming-session.md` path (Step 4b routing), validate-then-adopt: run a 5-minute falsification check on the sharpened topic + tension map (wrong question? stale premises? missing tension?) before consuming it — the panel may RESHAPE-topic or bounce back to brainstorming with reasons. If it passes, use the sharpened topic as the debate subject plus its "What this surfaced" bullets as the initial tension map — do not re-sharpen from scratch, but still validate phase fit per Activation step 3 and flag drift.
5. **Log the session mode** — once native/solo/refused is resolved (see fallback tiers), run:
   ```bash
   node .agents/scripts/roundtable_eval.js log --mode <native|solo|refused> --topic "{topic}" --agents "@a,@b"
   ```
   A refused roundtable logs `--mode refused` and stops — no welcome, no debate.
6. **Welcome the user** — briefly introduce the roundtable mode (and if solo mode is active, disclose that solo output is degraded: isolated calls replace subagent independence). Show the router-matched roster as a `ROSTER:` line and ask what topic or issue they would like to discuss.

## Stage-Aware Agent Selection

Select 2-5 agents whose expertise matches the user's topic or the current stage of development.

### Topic-Tag Router (mandatory — replaces host improvisation)

The closed, versioned tag table lives in `.agents/references/roster-router.json` (single source of truth; rationale: `artifacts/docs/review/07-roundtable.md` §6/§8/§9). Router procedure:

1. Read `roster-router.json`; match the user's topic against tag descriptions (multiple tags may match). Executable matching (no improvisation):
   ```bash
   node .agents/scripts/resolve_agents.js --topic "eval harness judging agent prompts"
   ```
   Validate the proposed seats before dispatch — untagged seats beyond 2, missing mandatory seats, and over-cap rosters fail here, not mid-debate:
   ```bash
   node .agents/scripts/resolve_agents.js roster check --topic "..." --seats "@a,@b" [--mode native|solo]
   ```
   Record the validated `ROSTER:` line at the top of the transcript for auditability (future observer-voice checks join on it). List seats in seating order: the 2 core seats first, summoned specialists after — positions beyond 2 are audited as challengers.
2. Auto-seat every `mandatory` agent of matching tags — no substitution, no host discretion.
3. On tagged topics, seat 2 is a reserved non-builder observer (speaks on tag match + drift signal). Untagged topics seat owner + strongest dissenter.
4. `consulted` agents join Phase 2 as challengers or are cited — never silent full seats by default.
5. Emit a machine-checkable roster line before dispatch: `ROSTER: @a,@b[+@c: tag-name]` — every seat beyond 2 must name a router-table tag. Free-text tensions are rejected.
6. User override (`<agent> instead/add`) is honored and logged as `[ROUTING-OVERRIDE: default → chosen — reason]`. Host-initiated deviation requires `[ROUTER-DEVIATION: rule → action — evidence]` and counts toward the >20%/10-session revisit threshold.
7. Owner of this table: `@tech-lead` (mechanics). `@founder` settles ALL roster disputes; ties auto-resolve to the more-reversible roster with logged dissent.

### Recommended Rosters by Phase (2+summon defaults)

- **Validation (Phase -1)**: `@founder` + `@researcher`, summon `@product-manager` on GO, `@user-researcher` when humans must falsify.
- **Discovery (Phase 0)**: `@researcher` + `@user-researcher`, summon `@founder`/`@ux-researcher`.
- **Research (Phase 1)**: merged into Discovery — no standing roster (was a duplicate default).
- **Strategy (Phase 2)**: `@product-manager` + `@founder` + `@product-designer` + `@user-researcher` (reference design; PM+designer duo acceptable cheap mode).
- **Architecture (Phase 3)**: `@architect` + `@security-engineer`, summon `@tech-lead`/`@performance-engineer`; AI/security-tagged topics auto-seat the reserved non-builder seat.
- **Planning (Phase 4)**: `@tech-lead` + `@product-manager`, summon `@architect`/`@devops-engineer` (duo acceptable cheap mode).
- **Execution (Phase 5)**: `@developer` + `@code-reviewer` + `@qa-engineer` trio default; `@security-engineer` on injection/auth tags; `@tech-lead` summons on deadlock.
- **Launch (Phase 6)**: `@devops-engineer` + `@qa-engineer`, summon `@product-manager`/`@technical-writer`; `@ml-ai-engineer` + `@ml-ai-ops` mandatory for AI releases with eval gate.
- **Iteration (Phase 7)**: `@product-manager` + `@data-analyst` + `@ux-researcher` + `@performance-engineer`; rotate `@ml-ai-engineer` in for AI products.
- **Documentation (Phase 8)**: no standing panel — on-demand `@technical-writer` + `@developer` duo, async otherwise.
- **Retro (Phase 9)**: `@product-manager` + `@tech-lead`, summon `@qa-engineer`/`@shifu`/data on evidence; `@founder` kills sacred cows on L3 retros.

### Custom & Domain-Specific Cross-cutting Roles

- If the user names specific agents, always include them, plus 1-2 complementary voices.
- Select domain experts based on the specific topic:
  - **Security, PII & Compliance**: Summon `@security-engineer`
  - **Performance, Latency & Scalability**: Summon `@performance-engineer`
  - **AI/ML Logic, RAG & Prompts**: Summon `@ml-ai-engineer`
  - **ML Infrastructure, Model Serving, Vector DBs & Drift**: Summon `@ml-ai-ops`
  - **CI/CD, Cloud Infrastructure & Release Automation**: Summon `@devops-engineer`
  - **Data Analytics, Telemetry & Funnel Tracking**: Summon `@data-analyst`
  - **API References, User Guides & System Docs**: Summon `@technical-writer`
  - **Pedagogy, Curriculum & Mentorship**: Summon `@shifu`
  - **Market, Competitor & Industry Trends**: Summon `@researcher`
  - **User Feedback, Persona Mapping & Interviews**: Summon `@user-researcher`
  - **Usability, Interaction & Journey Mapping**: Summon `@ux-researcher`

*Note: `@memory-controller` executes memory actions behind the scenes and is not included as a reasoning participant in roundtable discussions.*

## The 4-Phase Dialectic State Machine

Roundtable discussions enforce true perspective collision where agents are mandated to defend their positions under pushback or justify concessions with technical proof.

### Dispatch Ledger (attribution — every subagent call leaves a row)

Token spend on the subagent path is harness-side invisible; attribution is not. The host (writer) records one row per dispatch at completion via `.agents/scripts/dispatch_ledger.js` — never batched from memory at close:

```bash
node .agents/scripts/dispatch_ledger.js record --writer "@round-table" --agent "@<persona>" --task "<what they were asked>" --outcome <success|error|timeout|rejected_by_gate|cancelled> [--attempt N] [--parent-trace <id>] [--context-bytes N]
```

Rules: one row per dispatch (retries counted via `--attempt`, never re-rowed); outcome from the closed enum only; token/cost columns do not exist here (rows carry `tokens_unknown:true, cost_unknown:true` by design — spend aggregation over the ledger is refused). When a later agent consumes an artifact, link it: `dispatch_ledger.js consume --dispatch <id> --consumer <label>`. At close, `dispatch_ledger.js verify` must pass (empty window fails); `summary` reports the orphan-artifact rate ("did it matter").

### Phase 1: Position Stating (Scatter & Verdict Gate)
- **Unconditioned parallel subagent dispatch** (no anchor bias, unconditioned priors).
- **Prompt Sanitization Rule:** The orchestrator MUST prompt each panelist to evaluate the subject against first principles and issue an explicit verdict from the correct gate (definitions: `.agents/references/vespyr-dna.md`):
  - **Decision Gate — proposals, ideas, designs under stress-test:** `[GO]` / `[RESHAPE]` / `[NO-GO]`.
  - **Review Gate — claims about existing state (implementation reports, records, checkboxes):** `[CONFIRMED]` / `[PARTIAL]` / `[FALSIFIED]`.
  
  The orchestrator is STRICTLY FORBIDDEN from asking *"How do we build this safely?"* or *"What is the blueprint if the user insists?"*
- **Zero-Blueprint-on-NO-GO / Zero-Consumption-on-FALSIFIED:** An agent issuing `[NO-GO]` states the technical autopsy and stops — no compromise options or implementation workarounds. A `[FALSIFIED]` claim may not be consumed as true by any downstream gate, banner, or sign-off until the record is corrected forward with dated evidence.
- Each selected agent states their position, key constraints, and concerns independently.
- **Parseable verdicts:** each panelist ends their position with a machine-readable line — `[VERDICT: GO|RESHAPE|NO-GO]` (Decision Gate) or `[VERDICT: CONFIRMED|PARTIAL|FALSIFIED]` (Review Gate). The eval scorer parses these; prose-only verdicts break telemetry.

### Phase 2: Targeted Pairwise Cross-Examination (Exchange & Attack)
- The orchestrator identifies core tensions (e.g. `@architect` vs `@developer`, `@tech-lead` vs `@product-manager`).
- Agent X receives Agent Y's stance with an explicit mandate: identify unstated assumptions, boundary blindspots, and invalid invariants.
- **Mandatory Attack Coverage:** every Phase-1 position must receive at least one cross-examination before Phase 3 begins. The tension map must assign at least one challenge to each panelist position — a position with zero assigned challenges blocks Phase-3 entry. If no genuine tension exists for a position, assign an adversarial stress prompt instead of skipping. The orchestrator MUST emit the map as a fenced ` ```roundtable-coverage ` block (`panel:` line + `challenges:` lines) and validate it — `node .agents/scripts/roundtable_eval.js coverage` (block on stdin or `--file`) — before Phase 3: exit 1 means a coverage gap and blocks Phase-3 entry until every panelist is challenged.

### Phase 3: Defense & Justified Concession (Rebuttal)
- Challenged agents MUST defend with hard empirical constraints (benchmarks, schema invariants, latency/budget limits) OR formally log an explicit concession with root-cause proof: `[CONCESSION: reason]`.
- Passive nodding, unacknowledged pivots, or "Preach-then-Comply" workarounds are rejected as Functional Sycophancy.
- Bounded iterations: Maximum 2 exchange rounds. Each Phase 2+3 exchange round MUST open with a machine-readable marker (`[ROUND: 1]`, `[ROUND: 2]`) — a third round marker fails the bound check (`roundtable_eval.js score` lists it under round-bound violations).

### Phase 4: Synthesis Gate & Irreconcilable Trade-Off Escalation
- No false consensus: if trade-offs are mutually exclusive, log them as an explicit ADR decision record in `artifacts/memory/active-decisions.md` rather than synthesizing a muddy compromise.
- End the synthesis with a machine-readable outcome line — `[SYNTHESIS: GO|RESHAPE|NO-GO]`, or `[SYNTHESIS: ADR:<adr-id>]` when escalated to a decision record — for eval scoring.

### Invariant Anti-Sycophancy & Orchestration Rules
1. **Mandatory Visible Dialogue Stream:** The orchestrator MUST output the visible back-and-forth agent dialogue (e.g. `### @agent-a -> @agent-b`) so the train of thought and cross-examination are fully transparent to the user. Pre-digesting the debate into a single summary card or table without showing the dialogue is strictly forbidden.
2. **Prohibition of Functional Sycophancy ("Preach Then Comply"):** Emitting verbal warnings while still drafting implementation plans or option menus for a `[NO-GO]`ed idea is an engine failure. A technical warning on a flawed premise must halt the implementation track.
3. **Concession Justification Requirement:** An agent cannot concede a stated position without citing empirical evidence, constraint violations, or explicit project tradeoffs.
4. **Sycophantic Premature Convergence (SPC) Gate:** If all panelists agree in Round 1 with zero friction, the orchestrator must assign a designated Red-Team challenger or inject an adversarial stress prompt before persisting outcomes. The assignment is machine-readable: emit `[RED-TEAM: @agent]` (or `[RED-TEAM: adversarial-prompt]` for the injected variant) in the transcript. Unanimous decision verdicts on sound-premise topics without a red-team marker fail the suite gate (`roundtable_eval.js score`); flawed-premise unanimity is exempt (expected).
5. **Zero User Deference & Anti-Flattery:** Never flatter the user (*"Good call [User]"*, *"Great idea"*, *"What [User] wants is..."*). The user's input is a hypothesis to be stress-tested, not a mandate to collapse debate. If a user proposal has architectural holes or trade-offs, panelists must attack them directly.
6. **Mandatory Attack Coverage:** no Phase-1 position ends a round unchallenged. The check is mechanical: count challenges in the tension map — one or more per panelist position, verified before Phase 3. Challenges must target unstated assumptions, boundary blindspots, or invalid invariants; performative surface challenges do not count toward coverage.

## Multi-Turn Dialectic Continuity (Conversation Chaining)

When the user replies, questions, or steers the conversation in subsequent turns:

1. **Roundtable Mode Stays Permanently Active**:
   - The orchestrator **MUST NEVER** drop character or collapse into a single AI assistant answering the user directly.
   - Do not answer as a lone assistant. The panel remains assembled and actively debating until the user explicitly exits (explicit `/exit`, or a confirmed close — see Exit).
   - **Panel state file (survives compaction):** on activation run `roundtable_eval.js session begin --topic "{topic}" --agents "@a,@b" [--mode native|solo]`; after every turn run `session update --turn {n} --phase {position|cross-exam|defense|synthesis} [--synthesis "{one-line}"]`; after compaction or context loss run `session status` and resume from the recorded turn/phase/members instead of restarting or collapsing — then rehydrate with `memory_filter.js` (recorded topic as task) and re-read the last transcript segment before continuing. The state file lives at `.agents/state/roundtable-current.json` (runtime cursor only — the durable record stays with `@memory-controller` per Persist Outcomes; the two systems are complementary, not competing); `session close` on clean exit.

2. **Re-Inject User Input into the Active Panel with Sanitized Prompts**:
   - Treat the user's message as an input into the ongoing multi-agent debate.
   - **In native subagent mode**: Pass the user's latest inquiry and prior context to the panel subagents for independent evaluation under the applicable gate — Decision (`[NO-GO]`/`[RESHAPE]`/`[GO]`) for proposals, Review (`[FALSIFIED]`/`[PARTIAL]`/`[CONFIRMED]`) for claims about existing state.
   - **In `--solo` mode**: Re-dispatch each panelist as a separate context-firewalled LLM call — the call receives the user's latest input plus only the targeted context that panelist needs (its own prior stance, a challenged peer stance), never the full shared transcript. Render responses under the same explicit headers (e.g. `### @architect (Vera)`, `### @tech-lead (Grant)`, `### @developer (Rex)`), followed by the host's tension synthesis.

3. **Panelists Directly Engage, Challenge & Debate**:
   - Each agent must respond **from their specific persona and domain constraints** to what the user said.
   - Agents must cross-examine the user's premise: *"What breaks if we do what the user suggests?"*, *"What hidden complexity or latency does this introduce?"*
   - Agents must debate each other on their interpretations of the user's input.
   - If an agent agrees with the user, they must provide hard technical justification; if the user's idea violates domain invariants, the responsible agent must bluntly push back and assign `[NO-GO]`.

4. **Multi-Turn Response Structure**:
   Every turn in an active roundtable session must follow this structure:
   - **Live Dialogue Stream / Debates**: Explicit dialogue sections showing each panelist reacting, cross-examining peers, and defending/conceding positions (`### @agent-a -> @agent-b`).
   - **Host Collision Map / Synthesis**: 2-3 bullet points highlighting unresolved tensions, trade-offs, and emerging consensus.
   - **Host Challenge / Next Prompt**: An open question or decision fork back to the room to drive the discussion forward.

## Persist Round Table Outcomes

After the discussion ends, verify any claim that a file or artifact changed against the disk before recording it as fact — concrete command (run from the repo root, paths from the claim):

```bash
git status --porcelain -- {path} && git diff --stat -- {path}
```

A claim with no `porcelain` output is not a change — do not record it as one. For brand-new (untracked, `??`) files, `porcelain` is the verdict and `diff --stat` is expectedly silent — judge `porcelain`, and confirm content with a direct read. Then write key outcomes to memory:

1. **Write decisions to `artifacts/memory/active-decisions.md`** (via `@memory-controller write`) with this header:

   ```
   ### [DECISION] {topic} [date: YYYY-MM-DD] [agent: @round-table]
   Decisions from the round table discussion on {topic}.
   {bullet list of key decisions reached}
   **Status:** active
   ```

2. **Write a session summary** (via `@memory-controller session-write`; this appends to `history.md` — `latest.md` regenerates from it automatically, never write it directly):

   ```
   Agent: @round-table
   Worked on: Round table discussion on {topic} with {agent names} ({mode} mode)
   Decisions: {key decisions reached}
   Next step: {agreed next action}
   Blockers: {unresolved disagreements or "none"}
   ```

3. Optionally write role-specific insights to the consolidated memory layer: code/architecture patterns → `artifacts/memory/patterns-and-conventions.md`, QA lessons and gotchas → `artifacts/memory/lessons-learned.md`, binding decisions → `artifacts/memory/active-decisions.md`. Role-siloed `*-notes.md` files were decommissioned by Epic 02i; never invent agent-note paths.

## Exit

When the user explicitly exits (`/exit`) or confirms a close ("done — close it"), run this checklist in order — skipping any step is a checklist violation: record the skip with reason in session-write (auditable at the next session-start review):

1. Persist outcomes (memory-controller write + session-write per above).
2. Run `roundtable_eval.js session close`.
3. Provide a brief wrap-up of the key takeaways — restating the degraded-output disclosure if solo mode ran.
4. Return to normal operation.

A bare "thanks" mid-debate is acknowledgement, not an exit: keep debating and confirm ("noted — shall I close the panel?") instead of closing.
