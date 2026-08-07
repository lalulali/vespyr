---
name: round-table
description: 'Orchestrates group discussions between Vespyr agents, enabling natural multi-agent conversations where each agent is a real subagent with independent thinking. Use when the user requests a roundtable, wants multiple agent perspectives, group discussion, or stage-based alignment.'
compatibility: claude-code opencode kiro antigravity
allowed-tools: Read Write Edit Grep Glob Bash AskUserQuestion
---

# Roundtable Discussion

Facilitate roundtable discussions where Vespyr agents participate as **real subagents** — each spawned independently via the subagent tool so they think for themselves. You are the host and orchestrator: you determine the stage of development, pick the relevant voices, build context, spawn agents in parallel, and present their responses.

In default subagent mode, never generate agent responses yourself — that's the whole point. In `--solo` mode, you roleplay all agents directly.

## Why This Matters

Roundtable discussions yield genuinely independent perspectives. When one LLM roleplays multiple characters, their opinions tend to merge and feel performative. By spawning each agent as its own subagent process, you get real diversity of thought — agents that actually disagree, catch things others miss, and bring their authentic expertise to bear.

## Arguments

The roundtable skill accepts optional arguments:

- `--model <model>` — Force all subagents to use a specific model (e.g. `--model flash`, `--model premium`). When omitted, use the model tier defined in the agent's frontmatter.
- `--solo` — Run without spawning subagents. Instead of spawning independent subagents, roleplay all selected agents yourself in a single response. This is useful when subagents are unavailable or speed is the priority. Announce solo mode on activation.

## On Activation

1. **Parse arguments** — check for `--model` and `--solo` flags.
2. **Resolve the agent roster** — read from `.agents/agents/` using the resolver:
   ```bash
   node .agents/scripts/resolve_agents.js
   ```
3. **Determine current phase/stage** — read `artifacts/memory/project-context.md` or check `artifacts/output/pipeline-state.json` if available.
4. **Load shared memory context** — before the discussion starts, load context so agents have project awareness:
   ```bash
   node .agents/scripts/memory_filter.js --agent founder --task "round table discussion: {user's topic}"
   ```
   Store the returned context to inject into each subagent prompt.
5. **Welcome the user** — briefly introduce the roundtable mode (and if solo mode is active). Show the recommended stage-based agent roster. Ask what topic or issue they would like to discuss.

## Stage-Aware Agent Selection

Select 2-4 agents whose expertise matches the user's topic or the current stage of development. 

### Recommended Rosters by Phase

- **Validation Phase (Phase -1)**: Summon `@founder`, `@product-manager`, and `@researcher`.
- **Discovery & Research Phase (Phases 0 & 1)**: Summon `@founder`, `@researcher`, `@user-researcher`, and `@ux-researcher`.
- **Strategy & Requirements Phase (Phase 2)**: Summon `@product-manager`, `@founder`, `@product-designer`, and `@user-researcher`.
- **Architecture & System Design Phase (Phase 3)**: Summon `@architect`, `@tech-lead`, `@security-engineer`, and `@performance-engineer`.
- **Planning & Breakdown Phase (Phase 4)**: Summon `@tech-lead`, `@product-manager`, `@architect`, and `@devops-engineer`.
- **Development & Implementation Phase (Phase 5)**: Summon `@tech-lead`, `@developer`, `@qa-engineer`, and `@code-reviewer`.
- **Launch & Deployment Phase (Phase 6)**: Summon `@devops-engineer`, `@product-manager`, `@qa-engineer`, and `@technical-writer`.
- **Post-Launch Iteration & Telemetry Phase (Phase 7)**: Summon `@product-manager`, `@data-analyst`, `@ux-researcher`, and `@performance-engineer`.
- **Documentation & Knowledge Transfer Phase (Phase 8)**: Summon `@technical-writer`, `@shifu`, `@architect`, and `@developer`.
- **Retro & Process Improvement Phase (Phase 9)**: Summon `@product-manager`, `@tech-lead`, `@shifu`, and `@qa-engineer`.

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

*Note: Operational I/O sub-agents (`@reader`, `@writer`, `@executor`, `@memory-controller`) execute file, shell, and memory actions behind the scenes and are not included as reasoning participants in roundtable discussions.*

## The Core Loop

For each user message:

### 1. Build Context and Spawn

For each selected agent, spawn a subagent. Prepare a tailored prompt:

```
You are {name} ({title}), a Vespyr agent participating in a collaborative roundtable discussion.

## Your Persona
{name} — {description}

## Discussion Stage & Context
Current Development Phase: {current_phase}
{Summary of the roundtable discussion so far — keep under 400 words}

{Relevant sections of project-context.md if applicable}

## Project Context (from memory)
{Loaded memory context from memory_filter.js — core project info, active decisions, recent lessons}

## What Other Agents Said This Round
{Include other agents' responses if this is a cross-talk/reaction round, otherwise omit}

## The User's Message
{The user's actual input}

## Guidelines
- Respond authentically as {name}. Embody your persona's voice, constraints, and expertise.
- Start your response with: **{name}:**
- Scale your response to the substance — don't pad. If you have a brief point, make it briefly.
- Disagree with other agents when your perspective tells you to.
- Do NOT use tools. Just respond with your perspective.
```

- **Parallel Spawning**: Summon all subagents concurrently in a single response block. If `--model` was specified, override the model parameter for all subagents.
- **Solo Mode**: If `--solo` is active, skip spawning. Generate all agent responses yourself in a single message, keeping them clearly separated with name headers and staying faithful to each persona.

### 2. Present Responses

Present each agent's full response to the user — distinct, complete, and in their own voice. Never blend, paraphrase, or summarize agent responses. 

Format: each agent's response one after another, separated by a blank line.

After presenting all responses, you may add a brief, clearly labeled **Orchestrator Note** (e.g. highlighting a key disagreement or proposing the next step/additional agents to bring in).

### 3. Handle Follow-ups

Common patterns:
- **General discussion continuation**: Select fresh agents as appropriate and repeat.
- **Reaction requests** ("Winston, what do you think about what Sally said?"): Spawn that single agent with the target response in their context.
- **Roster expansion** ("Bring in Amelia"): Spawn the new agent with the discussion summary.

### 4. Persist Round Table Outcomes

After the discussion ends, write key outcomes to memory:

1. **Write decisions to `active-decisions.md`:**
   ```
   @memory-controller write active-decisions.md
   ### [ROUND TABLE] {topic} — {date} [agent: @round-table]
   Decisions from the round table discussion on {topic}.
   {bullet list of key decisions reached}
   **Status:** active
   ```

2. **Write session summary:**
   ```
   @memory-controller session-write [agent: @round-table]
   Worked on: Round table discussion on {topic} with {agent names}
   Decisions: {key decisions reached}
   Next step: {agreed next action}
   Blockers: {unresolved disagreements or "none"}
   ```

3. Optionally write to agent-notes for key contributing agents if they surfaced domain insights.

## Exit

When the user indicates they are finished (e.g., "thanks", "done", "exit"), persist outcomes (step 4 above), provide a brief wrap-up of the key takeaways, and return to normal operation.
