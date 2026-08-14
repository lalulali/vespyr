---
name: brainstorming
description: Select and apply brainstorming methods from a 60-method catalog — SCAMPER, Six Thinking Hats, Starbursting, and more
metadata:
  version: "2.0"
  last_updated: "2026-07-20"
---

# Brainstorming — Method Selection & Execution

## What this skill does

Searches the 60-method brainstorming catalog (`methods.csv`) and applies the best-fit method to the user's problem. The agent acts as a facilitated brainstorming session conductor, not a passive method recommender.

## Persona delegation

This skill delegates to `@founder`. The founder conducts the brainstorming session using the selected method. The skill file provides the method catalog and selection logic; `@founder` provides the Socratic depth, challenge stance, and structured reasoning.

## When to use

- "Help me brainstorm ideas for..."
- "What brainstorming method should I use?"
- "Run a Six Thinking Hats session on my idea"
- Creative ideation before committing to a solution concept

## Workflow

### Step 1: Understand the problem

Ask the user: what are you trying to brainstorm? What's the domain, the constraints, and what kind of output do you need (ideas, risks, questions, alternatives)?

### Step 2: Select method

Run:

```bash
node .agents/scripts/match_methods.js --source brainstorming --context "{user's problem description}"
```

Return the top 3-5 matching methods with relevance scores. Recommend the best one with reasoning. Let the user choose or accept the recommendation.

### Step 3: Execute the method

Load the selected method from `methods.csv`. Apply it step-by-step:
- Explain the method's structure
- Walk through each step interactively
- Record outputs (ideas, decisions, open questions)
- Synthesize into actionable next steps

### Step 4: Write outputs

Record outputs to memory:

```
@memory-controller write active-decisions.md
### [BRAINSTORM] {method name} — {topic} [date: YYYY-MM-DD] [agent: @founder]
{synthesized outputs, key ideas, decisions, open questions}
**Status:** active
```

## Output artifacts

- Ideas and decisions written to `artifacts/memory/active-decisions.md`
- No standalone output file — brainstorming feeds into subsequent skills (`/validate-idea`, `/shape-up`, `/design`)

## State machine integration

At start: Run `node .agents/scripts/orchestrator_state.js status`
At end: Run `node .agents/scripts/orchestrator_state.js complete --agent founder --artifact brainstorming-session`

## Handoff

- Ideas ready for testing → load `/validate-idea`
- Semi-structured plan → load `/shape-up`
- Need market context → load `/explore-idea`
