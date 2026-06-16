---
name: round-table
description: 'Orchestrates group discussions between Vespyr agents, enabling natural multi-agent conversations where each agent is a real subagent with independent thinking. Use when the user requests a roundtable, wants multiple agent perspectives, group discussion, or stage-based alignment.'
compatibility: claude-code opencode kiro antigravity
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
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
4. **Welcome the user** — briefly introduce the roundtable mode (and if solo mode is active). Show the recommended stage-based agent roster. Ask what topic or issue they would like to discuss.

## Stage-Aware Agent Selection

Select 2-4 agents whose expertise matches the user's topic or the current stage of development. 

### Recommended Rosters by Phase

- **Validation Phase**: Summon `@founder`, `@product-manager`, and `@researcher`.
- **Exploration Phase**: Summon `@founder`, `@researcher`, `@user-researcher`, and `@ux-researcher`.
- **Design Phase**: Summon `@product-manager`, `@product-designer`, and `@architect`.
- **Development Phase**: Summon `@tech-lead`, `@developer`, `@qa-engineer`, and `@code-reviewer`.

### Custom & Cross-cutting Roles

- If the user names specific agents, always include them, plus 1-2 complementary voices.
- If the topic is cross-cutting, you can suggest relevant experts:
  - Security-critical / PII: Summon `@security-engineer`
  - High performance SLAs: Summon `@performance-engineer`
  - ML/AI heavy logic: Summon `@ml-engineer`
  - Telemetry and instrumentation: Summon `@data-analyst`
  - Public APIs or documentation: Summon `@technical-writer`

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

## Exit

When the user indicates they are finished (e.g., "thanks", "done", "exit"), provide a brief wrap-up of the key takeaways and return to normal operation.
