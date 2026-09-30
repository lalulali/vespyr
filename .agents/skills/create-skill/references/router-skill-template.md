# Router Skill Template

Use this template when a skill **routes** to step files rather than executing
inline. A router owns sequencing, halt conditions, and completion criteria; the
step files own the work.

**A skill is a router if and only if it owns a `steps/` directory.** That is a
mechanical test, not a judgement call — `spec_check.js` applies the same rule to
decide whether the "What this skill does" warning applies.

## The marker

Put this on the line directly after the H1:

```markdown
<!-- router-skill -->
```

The marker is not decoration. `spec_check.js` reads it to:

- **exempt** the skill from the "no `## What this skill does` section" warning —
  a router is defined by its routing, so a prose summary is optional;
- **require** `## Halt conditions` and `## Done when`, which are the two
  sections a router cannot delegate to a step file without losing its contract.

## Required sections, in order

```markdown
---
name: <skill-name>
description: <what it does>. Use when <explicit trigger phrases>.
metadata:
  version: "1.0"
  last_updated: "YYYY-MM-DD"
---

<!-- router-skill -->

# <Skill Name> — <One-line positioning>

<One or two sentences on what the skill owns. No step detail here.>

## When to invoke
- The concrete conditions under which this router should load
- The phase or prerequisite state it expects
- What the user is asking for, in their words

## When NOT to invoke
- The sibling skill that owns this case instead, by name
- The case that looks similar but belongs elsewhere

## Prerequisites
- Artifact paths that must exist before Step 0
- Gate scripts that must pass

## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps or reorder them.
- Each step file is a contract. Read it fully before executing.
- Mode detection is automatic. Do NOT ask the user which mode to use.

## Mode selection
How the router decides which track to lock. Name the detector (artifact
existence, user wording) and the lock.

## Step sequence
0. **<Step name>** (non-skippable gate) -> `steps/step-00-<name>.md` — <what it locks>
1. **<Step name>** -> `steps/step-01-<name>.md` — <what it produces>
2. **<Step name>** -> `steps/step-02-<name>.md` — <what it produces>

## Halt conditions
Any one of these halts the entire flow and escalates. Be specific about the
threshold and name the escalation target.
- <condition> -> escalate to @<agent>
- <condition>

## Done when
- Every step in `stepsCompleted`
- <named artifact> exists with <verifiable property>
- <state transition that has occurred>

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At each step end: `node .agents/scripts/orchestrator_state.js step --name {step} --status {done|blocked}`
At end: `node .agents/scripts/orchestrator_state.js complete --agent <agent> --artifact <path>`

## Output artifacts
- `<path>` — <what it holds>

## Memory integration
**At start:** `@memory-controller load <agent> [<task>]`
**At completion:** `@memory-controller session-write` — mandatory
```

## Rules that the linter enforces

| Rule | Channel | Why |
|---|---|---|
| Body opens with `# <Title>` | violation | A router without a title has no identity in the catalog. |
| Every `steps/*.md` cited exists on disk | violation | A phantom link sends the agent to a file that is not there. |
| Every file in `steps/` is reachable by citation | violation | An unreachable step file is a contract nothing loads. Cite it from the router, or from a step that the router cites. |
| `metadata.last_updated` present | violation | A date is a fact; a missing one is drift. |
| `## Halt conditions` and `## Done when` present | warning | Prose shape — a human may phrase the headings differently, so this warns rather than blocks. |
| No `## What this skill does` | exempt | The marker grants the exemption. |
| No box-drawing glyph outside a fence | violation | DNA 6: a Markdown table or Mermaid diagram, not an ASCII box. |

## Anti-patterns

- **A step file nothing cites.** A fully-written contract the router never
  reaches is worse than no file — it reads as coverage that does not exist.
- **A phantom step link.** `step-06-launch-log.md` cited when the file on disk
  is `step-05-launch-log.md`. The agent loads nothing and reports a false pass.
- **Routers that hide their own work.** Inline step bodies plus a `steps/`
  directory splits the contract in two places. Pick one.
- **Halt conditions with no threshold.** "If something goes wrong" is not a
  halt condition. Name the number and the escalation target.
