---
step: 2
name: Architecture
prerequisites:
  - step-01 completed
conditional: ArchitectPhase
delegation:
  reads: "@reader (project context + existing artifacts; per delegation-policy.md ≥4 files)"
  writes: "@writer (ADR files in 04-architecture/; per delegation-policy.md multi-file output)"
  runs: none
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 2 — Architecture

Produce architectural decisions and trade-off documentation. This step is conditional — it only runs if `ArchitectPhase: true` in `project-context.md`.


> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill develop --step 2`
## Goal
Design system architecture, select the tech stack, define data models, and document decisions in ADRs.

## Pre-check
`@memory-controller load architect [architecture design for {feature}]`. If `ArchitectPhase: false` in the loaded context, skip this step and proceed to step 3a (arch-review will review strategy specs directly instead of ADRs).

## Agent invocation
`@architect` designs:
- System architecture and component interactions
- Tech stack with trade-off rationale
- Data models, schemas, and API contracts
- ADRs in `artifacts/output/04-architecture/`
- Technical risks and mitigation strategies

## Outputs
`artifacts/output/04-architecture/adr-NNN-*.md` — use template `.agents/templates/architecture/adr-template.md`

After each key decision, persist:
```
@memory-controller write active-decisions.md
### [ARCH] Decision: {decision summary} [date: YYYY-MM-DD] [agent: @architect]
{rationale, trade-offs, alternatives considered}
**Status:** active
```

## Halt condition
Architecture gap that breaks a user story's feasibility. Escalate to `@tech-lead`.

## Delegation
- **Reads:** @reader for project context and existing artifacts
- **Writes:** @writer for ADR files in 04-architecture/

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill develop --step 2`
