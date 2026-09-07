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
5. **Protect the gate.** Any active agent may record `BLOCKED` on a handoff or release when
   it has a specific, evidence-backed reason.
6. **Keep the record honest.** Never claim satisfaction, approval, or shipping
   readiness while a `BLOCKED` concern is unresolved.

## Satisfaction states

Every active agent records one of these states in its handoff or release
readiness record:

| State | Meaning (plain) |
|---|---|
| `SATISFIED` | My area is good: criteria met, evidence filed, no `BLOCKED` concern remains. |
| `CHANGES REQUESTED` | Fix this gap, then I re-check: a correctable issue stops sign-off until addressed. |
| `BLOCKED` | I cannot sign off: a critical issue, missing decision, missing evidence, or unresolved dependency stops the handoff. Name the reason. |
| `NOT ACTIVATED` | Out of my scope: reason filed. Not approval. |

`SATISFIED` does not mean flawless or unanimous. It means the agent has
reviewed the available evidence, its `BLOCKED` concerns are resolved, and any
remaining non-blocking risk is explicitly recorded and accepted by the
authorized decision-maker. A `CONDITIONAL GO` (= `[GO] When:GATED`, see glossary) is not shippable until its
conditions are resolved and the affected agents re-confirm `SATISFIED`. Progress words (`complete`, `done`, `approved`, `verified`) never substitute for these states.

**Wording rule:** never write "blocking SATISFIED" / "blocking satisfied" (any capitalization).
Write per-agent `BLOCKED: <reason>`, or cross-agent `Open before SATISFIED: <list>`. Rule-definition lines quoting the banned form are exempt.

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
- State: SATISFIED | CHANGES REQUESTED | BLOCKED | NOT ACTIVATED (never [GO]/[NO-GO] here — those are idea gates, not handoff states)
- Evidence: artifact, test, benchmark, research result, or walkthrough
- Feedback resolved: what changed or why the concern is closed
- Residual risks: none, or risk with owner, mitigation, and acceptance
- Revalidation trigger: change that would invalidate this state
```

> [!IMPORTANT]
> **Where to write sign-off records** — This file is a static protocol reference. Never append execution sign-off records here. Write completed sign-off records to `artifacts/output/06-quality/sign-off-history.md`. Write in-progress review records inside the epic's own review report (e.g., `artifacts/docs/strategy/development-plan/<epic>.md`).

### Owner handoff (when the blocker is the human)

When `BLOCKED` resolves only by owner action, the record MUST ALSO include an owner card — written for a reader with zero session context:

```markdown
### OWNER CARD
- Decision needed: one plain sentence naming the choice (no acronyms without inline meaning)
- Why you: why agents cannot take it (permission lock, fork with no technical winner, human-gated baseline)
- Options: each with effort + recommendation marked (or single patch pointer if no fork)
- Exact patch/commands: repo-relative file paths (copy-pasteable from repo root) and commands — no archaeology required
- If not: concrete consequence of leaving it
- Decide by: date or next gate; if silent past it, default = <state exactly what happens: proceeds, stalls, or auto-escalates>
- Revalidation trigger: what applied change unblocks the re-review
```

Rules: decision first, context second. Max 6 items per card — split the rest into a follow-up. The card is satisfied by a decision, not by reading the whole thread.
