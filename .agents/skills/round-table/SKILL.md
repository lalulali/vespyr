---
name: round-table
description: 'Orchestrates group discussions between Vespyr agents, enabling natural multi-agent conversations where each agent is a real subagent with independent thinking. Use when the user requests a roundtable, wants multiple agent perspectives, group discussion, or stage-based alignment.'
compatibility: claude-code opencode kiro antigravity
allowed-tools: Read Write Edit Grep Glob Bash AskUserQuestion
---

# Roundtable Discussion

Facilitate roundtable discussions where Vespyr agents participate as **real subagents** — each spawned independently through the active harness's subagent capability so they think for themselves. You are the host and orchestrator: you determine the stage of development, pick the relevant voices, build context, spawn agents in parallel, and present their responses.

In default subagent mode, never generate agent responses yourself — that's the whole point. In `--solo` mode, you roleplay all agents directly.

## Why This Matters

Roundtable discussions yield genuinely independent perspectives. When one LLM roleplays multiple characters, their opinions tend to merge and feel performative. By spawning each agent as its own subagent process, you get real diversity of thought — agents that actually disagree, catch things others miss, and bring their authentic expertise to bear.

## Arguments

The roundtable skill accepts optional arguments:

- `--model <model>` — Force all spawned participants to use a specific model when the active harness supports model selection (e.g. `--model flash`, `--model premium`). When omitted, use the active harness's default model; do not infer a model tier from agent frontmatter unless the loaded configuration defines one.
- `--solo` — Run without spawning subagents. Instead of spawning independent subagents, roleplay all selected agents yourself in a single response. This is useful when subagents are unavailable or speed is the priority. Announce solo mode on activation.

## Harness-Neutral Delegation

Delegation path: reasoning → selected persona roles | direct-fallback

Use the active harness's native subagent capability when it supports independent participants. Do not assume a particular command, API, or `@`-invocation syntax.

No-Subagent Harness Fallback: when the active harness cannot spawn subagents, perform the I/O directly and note it in the session summary; run the discussion in `--solo` mode instead of claiming that independent subagents were spawned.

## On Activation

1. **Parse arguments** — check for `--model` and `--solo` flags.
2. **Resolve the agent roster** — read from `.agents/agents/` using the resolver. The resolver enumerates the available personas; filter the returned roster against the selected phase and topic yourself:
   ```bash
   node .agents/scripts/resolve_agents.js
   ```
3. **Determine current phase/stage** — read the pipeline state file as the source of truth (`pipeline-state.json`). Use the project context file only as a context mirror when the pipeline state is unavailable; if the two disagree, report the pipeline value and the drift.
4. **Load shared memory context** — before the discussion starts, load context so agents have project awareness:
   ```bash
   node .agents/scripts/memory_filter.js --agent founder --task "round table discussion: {user's topic}"
   ```
   Store the returned context to inject into each subagent prompt.
5. **Welcome the user** — briefly introduce the roundtable mode (and if solo mode is active). Show the recommended stage-based agent roster. Ask what topic or issue they would like to discuss.

## Stage-Aware Agent Selection

Select 2-5 agents whose expertise matches the user's topic or the current stage of development. 

### Recommended Rosters by Phase

- **Validation (Phase -1)**: Summon `@founder`, `@product-manager`, and `@researcher`.
- **Discovery (Phase 0)**: Summon `@founder`, `@researcher`, `@user-researcher`, and `@ux-researcher`.
- **Research (Phase 1)**: Summon `@researcher`, `@user-researcher`, `@ux-researcher`, and `@founder`.
- **Strategy (Phase 2)**: Summon `@product-manager`, `@founder`, `@product-designer`, and `@user-researcher`.
- **Architecture (Phase 3)**: Summon `@architect`, `@tech-lead`, `@security-engineer`, and `@performance-engineer`.
- **Planning (Phase 4)**: Summon `@tech-lead`, `@product-manager`, `@architect`, and `@devops-engineer`.
- **Execution (Phase 5)**: Summon `@tech-lead`, `@developer`, `@qa-engineer`, and `@code-reviewer`.
- **Launch (Phase 6)**: Summon `@devops-engineer`, `@product-manager`, `@qa-engineer`, and `@technical-writer`.
- **Iteration (Phase 7)**: Summon `@product-manager`, `@data-analyst`, `@ux-researcher`, and `@performance-engineer`.
- **Documentation (Phase 8)**: Summon `@technical-writer`, `@shifu`, `@architect`, and `@developer`.
- **Retro (Phase 9)**: Summon `@product-manager`, `@tech-lead`, `@shifu`, and `@qa-engineer`.

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

### Phase 1: Position Stating (Scatter & Verdict Gate)
- **Unconditioned parallel subagent dispatch** (no anchor bias, unconditioned priors).
- **Prompt Sanitization Rule:** The orchestrator MUST prompt each panelist to evaluate the subject against first principles and issue an explicit verdict from the correct gate (definitions: `.agents/references/vespyr-dna.md`):
  - **Decision Gate — proposals, ideas, designs under stress-test:** `[PASS]` / `[PIVOT]` / `[KILL]`.
  - **Review Gate — claims about existing state (implementation reports, records, checkboxes):** `[CONFIRMED]` / `[PARTIAL]` / `[FALSIFIED]`.
  
  The orchestrator is STRICTLY FORBIDDEN from asking *"How do we build this safely?"* or *"What is the blueprint if the user insists?"*
- **Zero-Blueprint-on-KILL / Zero-Consumption-on-FALSIFIED:** An agent issuing `[KILL]` states the technical autopsy and stops — no compromise options or implementation workarounds. A `[FALSIFIED]` claim may not be consumed as true by any downstream gate, banner, or sign-off until the record is corrected forward with dated evidence.
- Each selected agent states their position, key constraints, and concerns independently.

### Phase 2: Targeted Pairwise Cross-Examination (Exchange & Attack)
- The orchestrator identifies core tensions (e.g. `@architect` vs `@developer`, `@tech-lead` vs `@product-manager`).
- Agent X receives Agent Y's stance with an explicit mandate: identify unstated assumptions, boundary blindspots, and invalid invariants.

### Phase 3: Defense & Justified Concession (Rebuttal)
- Challenged agents MUST defend with hard empirical constraints (token budgets, benchmarks, schema invariants) OR formally log an explicit concession with root-cause proof: `[CONCESSION: reason]`.
- Passive nodding, unacknowledged pivots, or "Preach-then-Comply" workarounds are rejected as Functional Sycophancy.
- Bounded iterations: Maximum 2 exchange rounds.

### Phase 4: Synthesis Gate & Irreconcilable Trade-Off Escalation
- No false consensus: if trade-offs are mutually exclusive, log them as an explicit ADR decision record in `artifacts/memory/active-decisions.md` rather than synthesizing a muddy compromise.

### Invariant Anti-Sycophancy & Orchestration Rules
1. **Mandatory Visible Dialogue Stream:** The orchestrator MUST output the visible back-and-forth agent dialogue (e.g. `### @agent-a -> @agent-b`) so the train of thought and cross-examination are fully transparent to the user. Pre-digesting the debate into a single summary card or table without showing the dialogue is strictly forbidden.
2. **Prohibition of Functional Sycophancy ("Preach Then Comply"):** Emitting verbal warnings while still drafting implementation plans or option menus for a killed idea is an engine failure. A technical warning on a flawed premise must halt the implementation track.
3. **Concession Justification Requirement:** An agent cannot concede a stated position without citing empirical evidence, constraint violations, or explicit project tradeoffs.
4. **Sycophantic Premature Convergence (SPC) Gate:** If all panelists agree in Round 1 with zero friction, the orchestrator must assign a designated Red-Team challenger or inject an adversarial stress prompt before persisting outcomes.
5. **Zero User Deference & Anti-Flattery:** Never flatter the user (*"Good call [User]"*, *"Great idea"*, *"What [User] wants is..."*). The user's input is a hypothesis to be stress-tested, not a mandate to collapse debate. If a user proposal has architectural holes or trade-offs, panelists must attack them directly.

## Multi-Turn Dialectic Continuity (Conversation Chaining)

When the user replies, questions, or steers the conversation in subsequent turns:

1. **Roundtable Mode Stays Permanently Active**:
   - The orchestrator **MUST NEVER** drop character or collapse into a single AI assistant answering the user directly.
   - Do not answer as a lone assistant. The panel remains assembled and actively debating until the user explicitly exits (`/exit`, `thanks`, `done`).

2. **Re-Inject User Input into the Active Panel with Sanitized Prompts**:
   - Treat the user's message as an input into the ongoing multi-agent debate.
   - **In native subagent mode**: Pass the user's latest inquiry and prior context to the panel subagents for independent evaluation under the applicable gate — Decision (`[KILL]`/`[PIVOT]`/`[PASS]`) for proposals, Review (`[FALSIFIED]`/`[PARTIAL]`/`[CONFIRMED]`) for claims about existing state.
   - **In `--solo` mode**: Continue roleplaying each panelist sequentially under their explicit headers (e.g. `### @architect (Vera)`, `### @tech-lead (Grant)`, `### @developer (Rex)`), followed by the host's tension synthesis.

3. **Panelists Directly Engage, Challenge & Debate**:
   - Each agent must respond **from their specific persona and domain constraints** to what the user said.
   - Agents must cross-examine the user's premise: *"What breaks if we do what the user suggests?"*, *"What hidden complexity or latency does this introduce?"*
   - Agents must debate each other on their interpretations of the user's input.
   - If an agent agrees with the user, they must provide hard technical justification; if the user's idea violates domain invariants, the responsible agent must bluntly push back and assign `[KILL]`.

4. **Multi-Turn Response Structure**:
   Every turn in an active roundtable session must follow this structure:
   - **Live Dialogue Stream / Debates**: Explicit dialogue sections showing each panelist reacting, cross-examining peers, and defending/conceding positions (`### @agent-a -> @agent-b`).
   - **Host Collision Map / Synthesis**: 2-3 bullet points highlighting unresolved tensions, trade-offs, and emerging consensus.
   - **Host Challenge / Next Prompt**: An open question or decision fork back to the room to drive the discussion forward.

## Persist Round Table Outcomes

After the discussion ends, verify any claim that a file or artifact changed against the disk before recording it as fact. Then write key outcomes to memory:

1. **Write decisions to `artifacts/memory/active-decisions.md`** (via `@memory-controller write`) with this header:

   ```
   ### [DECISION] {topic} [date: YYYY-MM-DD] [agent: @round-table]
   Decisions from the round table discussion on {topic}.
   {bullet list of key decisions reached}
   **Status:** active
   ```

2. **Write a session summary to `artifacts/memory/session-summaries/latest.md`** (via `@memory-controller session-write`):

   ```
   Agent: @round-table
   Worked on: Round table discussion on {topic} with {agent names}
   Decisions: {key decisions reached}
   Next step: {agreed next action}
   Blockers: {unresolved disagreements or "none"}
   ```

3. Optionally write role-specific insights to the consolidated memory layer: code/architecture patterns → `artifacts/memory/patterns-and-conventions.md`, QA lessons and gotchas → `artifacts/memory/lessons-learned.md`, binding decisions → `artifacts/memory/active-decisions.md`. Role-siloed `*-notes.md` files were decommissioned by Epic 02i; never invent agent-note paths.

## Exit

When the user indicates they are finished (e.g., "thanks", "done", "exit"), persist outcomes, provide a brief wrap-up of the key takeaways, and return to normal operation.
