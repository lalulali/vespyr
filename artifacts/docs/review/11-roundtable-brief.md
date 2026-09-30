# Round-Table Brief — Agent Capability & Teamwork Cross-Review (Track C / 02u)

**Mode:** native (each panelist is a real, context-isolated subagent). **Session:** logged 2026-09-30.
**Owner directive being executed:** "let all agents improve themselves and each other until satisfied with their own capability and their teamwork; remove unrelated capabilities if needed; true capabilities, not formatting."

## Why you are here

The 2026-09-29 capability audit found 110 declared capabilities, 28 wired to real artifacts, and dozens of labels with no wiring; the registry and consistency test now exist (Phase 2), and the eval suites were doubled (Phase 3). This round-table is the **cross-verification pass**: each agent audits its own claims, challenges a peer, and checks its handoffs against disk. No self-grading is accepted — claims without evidence are `PARTIAL` or `FALSIFIED`.

## Evidence you MUST read before answering

| Source | What it holds |
|---|---|
| `.agents/references/agent-contracts.md` | Contract table (owns / does-not-own) + **Capability Registry** (your row: capabilities + wiring paths) |
| `artifacts/docs/review/10-agent-capability-audit.md` | Mechanical audit per capability (verdict class, external refs, contract mention) |
| `evals/suites/agents/*.json` | Your capability benchmarks (Phase 3 expanded to 60) |
| `tests/agent-capability-contract.test.js` | The machine gate: registry ↔ frontmatter set equality, no duplicates, wiring paths exist |
| Your own persona file | `.agents/agents/<your-name>.md` — read it and speak in its voice |

## Rules (non-negotiable)

1. **Review Gate semantics** for claims about existing state: `[VERDICT: CONFIRMED | PARTIAL | FALSIFIED]` (`.agents/references/vespyr-dna.md`). A capability is CONFIRMED only with a path/section you actually verified.
2. **No flattery, no rubber-stamping.** A challenge must target an unstated assumption, boundary blindspot, or invalid invariant. Surface praise is a defect.
3. **Evidence over prose.** Cite `path:line` or `path#section`. "Unverified" is an acceptable finding; invention is not.
4. **Max 500 words** in your reply. Concrete change requests only (max 3 per agent).
5. `@memory-controller` is not seated (resolver: `reasoningParticipant: false`); `@technical-writer` verifies its registry row on the panel's behalf.

## Panel groups and challenge assignments

Each seat: (A) audit your own claims, (B) challenge your assigned peer, (C) check your handoff edges, (D) satisfaction verdict.

### Group 1 — Engineering core
`@architect` → challenges `@tech-lead` · `@tech-lead` → `@developer` · `@developer` → `@code-reviewer` · `@code-reviewer` → `@qa-engineer` · `@qa-engineer` → `@architect`

### Group 2 — Platform & trust
`@devops-engineer` → `@security-engineer` · `@security-engineer` → `@performance-engineer` · `@performance-engineer` → `@ml-ai-engineer` · `@ml-ai-engineer` → `@ml-ai-ops` · `@ml-ai-ops` → `@devops-engineer`

### Group 3 — Product & discovery
`@founder` → `@product-manager` · `@product-manager` → `@product-designer` · `@product-designer` → `@researcher` · `@researcher` → `@user-researcher` · `@user-researcher` → `@founder`

### Group 4 — Experience & meta
`@ux-researcher` → `@data-analyst` · `@data-analyst` → `@technical-writer` · `@technical-writer` → `@shifu` (+ verify `@memory-controller`'s registry row) · `@shifu` → `@ux-researcher`

## Required output format (exact)

```
### @<your-agent> (<HumanName>)
OWN: <2–4 bullets; each claim → the path/section that backs it, or "unverified">
CHALLENGE @<peer>: <one real attack on their claim/handoff> [VERDICT: CONFIRMED|PARTIAL|FALSIFIED]
HANDOFFS: <edge (artifact → consumer) → OK|BROKEN: reason>
CHANGES: <max 3 concrete, each actionable in one edit>
[VERDICT: CONFIRMED|PARTIAL|FALSIFIED]
SATISFACTION: SATISFIED|CHANGES REQUESTED|BLOCKED
```

`SATISFACTION: SATISFIED` requires: every one of your registry capabilities has verified backing; every handoff edge you own resolves on disk; no open challenge against you that you cannot answer. Otherwise `CHANGES REQUESTED` (fixable now) or `BLOCKED` (needs an owner decision — state it).
