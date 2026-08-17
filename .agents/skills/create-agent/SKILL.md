---
name: create-agent
description: Guided authoring flow for creating new Vespyr agent personas — specify the role, goals, and guardrails, then scaffold the agent markdown file with valid frontmatter, identity block, persona voice, Socratic stance, delegation contracts, and memory wiring, and verify it resolves and passes validation. Use this skill whenever you want to create, add, scaffold, or author a new agent, persona, or role in Vespyr. Trigger on "create a new agent", "add an agent for X", "new persona", "scaffold an agent", "make an agent that does Y".
metadata:
  version: "1.0"
  last_updated: "2026-08-11"
---

# Create Agent — Agent Persona Authoring

## What this skill does

Guides you through creating a new Vespyr agent persona from intent to verified, registered agent file. You specify the role, responsibilities, and boundaries; the skill scaffolds `.agents/agents/<name>.md` following Vespyr conventions (frontmatter, identity block, persona voice, citation protocol, Socratic stance, workflow position, memory wiring), enriches it with the standard `add-*` scripts, registers it across the catalog files, and verifies it resolves.

## When to use

- "Create a new agent that reviews localization strings"
- "Add an agent persona for accessibility auditing"
- "Scaffold a support agent for handling user tickets"

## When NOT to use

- To customize an EXISTING agent's settings (model, temperature, capabilities — use `/customize-agent`)
- To create or modify a skill (use `/create-skill` or `/customize-skill`)
- For one-off role-play in a single prompt (just instruct the agent in your prompt)

## Prerequisites

- A clear role for the new agent (what it owns, what it does NOT own)
- The repo uses the Vespyr structure: `.agents/agents/<name>.md` per persona

---

## Anatomy of a Vespyr Agent

```
.agents/agents/<name>.md
├── Frontmatter (YAML): name, icon, capabilities, origin, model,
│   description, version, last_updated, human_name, mode, temperature,
│   permission, tools, upstream_dependencies, downstream_consumers
├── <!-- IDENTITY: do not edit --> block (persona voice, principles,
│   UTTERLY SATISFIED culture, See the Unseen, response prefix)
├── Citation Protocol (cite real sources with footnotes)
├── Socratic Stance (what it challenges, what changes its mind, escalation)
├── Response format (begin every response with <emoji> <Name>:
├── Workflow Position (upstream/downstream agent contracts)
└── Shared Memory (session-start / session-write orchestration calls)

.agents/references/socratic/<name>.md   # per-agent anti-sycophancy rules
```

---

## Workflow

### Step 1: Capture Intent (Socratic Probes)

Ask the user or extract from context:
1. **Role & name?** (e.g., `localization-reviewer`, `accessibility-auditor`)
2. **Primary responsibilities?** (what it owns — see `agent-contracts.md`)
3. **What does it explicitly NOT own?** (delegation boundaries)
4. **Core outputs & artifacts?** (where deliverables land)
5. **Upstream/downstream agents?** (who feeds it, who consumes its work)

### Step 2: Deduplication & Collision Check

- List `.agents/agents/` — ensure the role doesn't already exist under another name.
- Check `.agents/references/agent-contracts.md` — if an existing agent already owns the responsibility, extend that agent instead (or use `/customize-agent` for settings).
- Check `.agents/references/socratic/` for an existing per-agent socratic file.

### Step 3: Scaffold the Agent File

Write `.agents/agents/<name>.md` modeled on an existing agent (e.g., `developer.md` or `qa-engineer.md`):

````markdown
---
name: <name>
icon: 🤖
capabilities:
  - <capability-1>
origin: custom
channeled_mentor: <Channeled Mentor Name>
model: -
description: <one-line role summary>
version: "1.0"
last_updated: <YYYY-MM-DD>
human_name: <Human Name>
mode: subagent
temperature: 0.2
permission:
  read: allow
  glob: allow
  grep: allow
tools: {}
upstream_dependencies:
  - "@<feeder-agent>"
downstream_consumers:
  - "@<consumer-agent>"
---

<!-- IDENTITY: do not edit — hardcoded persona -->
# @<name> (<Human Name>)

## Persona voice
...

## Persona principles (non-negotiable)
- ...

## UTTERLY SATISFIED Culture (non-negotiable)
- Follow `.agents/references/utter-satisfaction.md`; never hand off with unresolved blocking concerns.

## See the Unseen (non-negotiable)
- Run `node .agents/scripts/query_graph.js summary` before producing output
- Begin every response with `<emoji> <Name>:` so agent transitions are never hidden
<!-- /IDENTITY -->

## Response format
Begin every response with `🤖 <Human Name>:` so the active persona is explicit.

## Citation Protocol
Follow `.agents/references/citation-format.md`; cite real sources inline with footnotes, never fabricate.

## Socratic Stance
**What I challenge:** {X}
**What "change my mind" looks like:** {evidence that would overturn}
**When to escalate vs. accept:** {boundary}

## Workflow Position
| Upstream | Downstream |
|---|---|
| @x | @y |

## Shared Memory
**Session Start (Mandatory):**
```
node .agents/scripts/orchestrator_state.js session-start --agent <name> --domain <domain> --goal "{goal}"
```
````

Keep it minimal and role-specific. Do not copy blocks the agent doesn't need. Replace every placeholder before continuing: `icon` must be a single emoji, `description` at least 10 characters, `version` semver, and `origin` must be `core`, `custom`, or `module:<name>` — these are enforced by `validate_frontmatter.js`.

### Step 4: Enrich with Standard Blocks

Run the standard enrichment scripts to inject canonical sections. They take no arguments, process all agents in `.agents/agents/`, and are idempotent (they only add missing sections):

```bash
node .agents/scripts/add-identity-block.js
node .agents/scripts/add-citation-protocol.js
node .agents/scripts/add-pipeline-bookkeeping.js
```

Role-scoped scripts (`add-socratic-stance.js`, `add-delegation-contract.js`) only apply to agents with a defined stance or contract entry and will skip a new custom agent — write the `## Socratic Stance` section manually if the role is reasoning-based.

### Step 5: Write the Per-Agent Socratic Reference

Create `.agents/references/socratic/<name>.md` modeled on an existing per-agent socratic file (see `socratic/developer.md`): anti-sycophancy rules ("never say…"), "always" behaviors, probing principles, and seed examples adapted to the role.

### Step 6: Register the Agent

Add the new agent to every catalog that lists personas:
- **AGENTS.md** — the Core Agent Personas table (name, focus area, core outputs)
- **`.agents/references/agent-contracts.md`** — owns / does NOT own responsibilities
- **`.agents/workflow.md`** — any workflow tables referencing the agent
- **`.agents/references/phase-table.md`** — if the agent owns a phase deliverable

### Step 7: Verify

1. Confirm the agent validates — after replacing all placeholders, run:
   ```bash
   node .agents/scripts/validate_frontmatter.js
   ```
   The agent file must appear in the pass list (required fields, identity block, response format).
2. Confirm the persona is present in the roster (`resolve_agents.js` lists all agents and ignores arguments):
   ```bash
   node .agents/scripts/resolve_agents.js
   ```
3. Load the persona in the harness (`@.agents/agents/<name>.md`) and smoke-test one invocation.
4. Confirm the identity block, socratic stance, and citation protocol are present.
5. Confirm the agent writes its deliverables to its designated path under `artifacts/output/<phase-or-topic>/`.

### Step 8: Log the Creation

Append to `artifacts/memory/active-decisions.md`:

```markdown
### [DECISION] Created Agent: @<name> [date: YYYY-MM-DD]
**Purpose:** {summary of role}
**Path:** .agents/agents/<name>.md
**Socratic file:** .agents/references/socratic/<name>.md
```

---

## Troubleshooting & Edge Cases

| Issue | Root Cause | Solution |
|---|---|---|
| `resolve_agents.js` fails to parse | Malformed YAML frontmatter (bad indentation, unquoted special chars) | Fix frontmatter; validate against an existing agent file |
| Agent doesn't load in harness | File not at `.agents/agents/<name>.md` or name mismatch with folder | File name MUST match `name` field (kebab-case) |
| Missing standard sections | Enrichment scripts not run | Run the `add-*` scripts from Step 4 |
| Role overlaps existing agent | No collision check performed | Re-check `agent-contracts.md`; extend the existing agent or narrow the new role's contract |

---

## Anti-patterns

- **Skipping the collision check.** Duplicate agents create ambiguous delegation and confused orchestrator routing.
- **Over-bloated personas.** Copying every block from a template agent adds noise the new role doesn't need — keep it to what the role actually owns.
- **Forgetting registration.** An unregistered agent runs fine in isolation but breaks squad routing, delegation audits, and the phase pipeline.
- **Skipping verification.** Always run `resolve_agents.js` and a smoke invocation before declaring the agent done.

---

## Output Artifacts

- `.agents/agents/<name>.md` (the agent persona)
- `.agents/references/socratic/<name>.md` (per-agent Socratic rules)
- Updated catalogs: `AGENTS.md`, `agent-contracts.md`, `workflow.md`, `phase-table.md` (as applicable)
- `artifacts/memory/active-decisions.md` (audit log entry)
