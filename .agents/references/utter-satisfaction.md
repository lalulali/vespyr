# UTTERLY SATISFIED Collaboration Protocol

This protocol defines the working culture for the product, design, research,
engineering, operations, and quality agents. It is intentionally evidence-based
so "UTTERLY SATISFIED" means the best defensible result available now, not an
unbounded search for perfection.

## Core commitment

Every participating agent owns the quality of the shared outcome, not only the
artifact in its own lane. Agents must collaborate, challenge constructively,
respond to feedback, and keep working until every active, relevant agent can
honestly mark its domain `SATISFIED`.

The protocol applies to these personas:

`@architect`, `@code-reviewer`, `@data-analyst`, `@developer`,
`@devops-engineer`, `@founder`, `@ml-ai-engineer`, `@ml-ai-ops`,
`@performance-engineer`, `@product-designer`, `@product-manager`,
`@qa-engineer`, `@researcher`, `@security-engineer`, `@shifu`, `@tech-lead`,
`@technical-writer`, `@user-researcher`, and `@ux-researcher`.

## Working behavior

1. **Think beyond the handoff.** Check how the work affects upstream intent,
   downstream execution, users, operations, and the release outcome.
2. **Invite the right challenge.** Ask the relevant agents to review the
   assumptions and risks that their domains can expose. Do not seek agreement
   by hiding uncertainty.
3. **Close the loop.** Address feedback with a change, evidence, or a clear
   escalation. A reply without resolution is not completion.
4. **Verify the result.** Use tests, research evidence, benchmarks,
   walkthroughs, evaluation results, or other artifact-appropriate evidence.
5. **Protect the gate.** Any active agent may block a handoff or release when
   it has a specific, evidence-backed blocking concern.
6. **Keep the record honest.** Never claim satisfaction, approval, or shipping
   readiness when a blocking concern is unresolved.

## Satisfaction states

Every active agent records one of these states in its handoff or release
readiness record:

| State | Meaning |
|---|---|
| `SATISFIED` | The agent's domain criteria are met, evidence is recorded, and no blocking concern remains. |
| `CHANGES REQUESTED` | The agent found a correctable gap that must be addressed before satisfaction. |
| `BLOCKED` | A critical issue, missing decision, missing evidence, or unresolved dependency prevents satisfaction. |
| `NOT ACTIVATED` | The agent's domain is genuinely out of scope; the reason is recorded and does not imply approval. |

`SATISFIED` does not mean flawless or unanimous. It means the agent has
reviewed the available evidence, its blocking concerns are resolved, and any
remaining non-blocking risk is explicitly recorded and accepted by the
authorized decision-maker. A `CONDITIONAL GO` is not shippable until its
conditions are resolved and the affected agents re-confirm `SATISFIED`.

## Collaboration loop

For each meaningful handoff:

1. The author performs a role-specific self-check.
2. The author identifies the active agents whose domains may be affected.
3. Those agents review the work and return a satisfaction state with evidence
   and actionable feedback.
4. The author and reviewers iterate until all active reviewers are `SATISFIED`
   or the issue is escalated to the binding decision authority.
5. After a material change, affected sign-offs are revalidated. Old approval
   does not survive a changed premise, scope, implementation, or risk profile.

The global two-cycle feedback limit still applies. After two unsuccessful
cycles on the same issue, escalate through the workflow ladder; do not stop
iterating by pretending the concern is resolved.

## Release gate

Before shipping to the user, `@product-manager` must include an **UTTERLY
SATISFIED team gate** in `release-readiness.md` and `go-nogo-decision.md`:

- Every participating agent has a `SATISFIED` row with evidence and date.
- Every `NOT ACTIVATED` row has a specific out-of-scope reason.
- No participating agent is `CHANGES REQUESTED` or `BLOCKED`.
- Residual risks, owners, mitigations, and authorized acceptance are recorded.
- A material post-sign-off change triggers re-review by affected agents.

The release is `NO-GO` when this gate is incomplete. The launch workflow must
not deploy merely because the code is complete or because time is short.

## Handoff record

Use this compact record in handoff artifacts and review reports:

```markdown
### UTTERLY SATISFIED CHECK
- Agent: @agent-name
- State: SATISFIED | CHANGES REQUESTED | BLOCKED | NOT ACTIVATED
- Evidence: artifact, test, benchmark, research result, or walkthrough
- Feedback resolved: what changed or why the concern is closed
- Residual risks: none, or risk with owner, mitigation, and acceptance
- Revalidation trigger: change that would invalidate this state
```

> [!IMPORTANT]
> **Where to write sign-off records** — This file is a static protocol reference. Never append execution sign-off records here. Write completed sign-off records to `artifacts/output/06-quality/sign-off-history.md`. Write in-progress review records inside the epic's own review report (e.g., `artifacts/docs/strategy/development-plan/<epic>.md`).
