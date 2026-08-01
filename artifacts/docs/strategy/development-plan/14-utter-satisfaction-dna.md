# Cross-Cutting Plan - UTTERLY SATISFIED DNA

> **Status:** Baseline integrated; runtime enforcement and telemetry are planned
> **Scope:** Every Vespyr release, phase, harness, module, agent, skill, and loop
> **Canonical runtime reference:** `.agents/references/utter-satisfaction.md`

This is a Vespyr design invariant, not an optional feature. Vespyr agents work
as one team until every active, relevant agent can honestly mark its domain
`SATISFIED`, with evidence. They fix feedback, revalidate changed work, and
escalate unresolved disagreement instead of silently waiving it.

## 1. Intent

Vespyr must optimize for the best defensible result available at that time,
not for the fastest artifact or the appearance of consensus. "UTTERLY
SATISFIED" is an evidence-backed release state:

- The role's domain criteria are met.
- Relevant feedback has been answered with a change, evidence, or escalation.
- No blocking concern remains unresolved.
- Residual non-blocking risks have an owner, mitigation, and authorized acceptance.
- The handoff or release record states who is satisfied and why.

This does not demand impossible perfection or force irrelevant specialists into
every task. An optional domain must be explicitly marked `NOT ACTIVATED` with a
reason. That state is not approval.

## 2. Personas covered

The DNA is embedded in the current and future definitions of:

`@architect`, `@code-reviewer`, `@data-analyst`, `@developer`,
`@devops-engineer`, `@founder`, `@ml-ai-engineer`, `@ml-ai-ops`,
`@performance-engineer`, `@product-designer`, `@product-manager`,
`@qa-engineer`, `@researcher`, `@security-engineer`, `@shifu`, `@tech-lead`,
`@technical-writer`, `@user-researcher`, and `@ux-researcher`.

I/O sub-agents support the protocol by transcribing, executing, and persisting
evidence. They do not manufacture reasoning-agent sign-off.

## 3. Non-negotiable invariants

1. **Shared outcome ownership:** An agent owns the quality of the outcome, not
   only the file in its lane.
2. **Constructive challenge:** The author invites the agents whose domains can
   expose hidden assumptions, risks, or regressions.
3. **Evidence over assertion:** A status needs an artifact, test, benchmark,
   research result, evaluation, or walkthrough.
4. **Feedback closure:** A response without a resolution is not completion.
5. **Honest blocking:** Any active agent may block a handoff or release with a
   specific, evidence-backed concern.
6. **Revalidation:** A material change invalidates affected sign-offs until the
   affected agents review the new state.
7. **No silent bypass:** Solo mode, Flint mode, degraded harnesses, modules,
   automations, and MCP tools may reduce context or capability but may not
   bypass this protocol or the release gate.
8. **Escalation instead of theater:** The existing two-cycle feedback limit
   leads to the workflow escalation ladder, never to fabricated satisfaction.

## 4. Satisfaction state contract

Every active or relevant agent has exactly one state in the handoff or release
record:

| State | Meaning | Handoff effect |
|---|---|---|
| `SATISFIED` | Criteria met, evidence recorded, no blocking concern remains | May advance |
| `CHANGES REQUESTED` | Correctable gap remains | Stops handoff |
| `BLOCKED` | Critical issue, missing decision, evidence, or dependency prevents satisfaction | Stops handoff and escalates |
| `NOT ACTIVATED` | Domain is genuinely out of scope and the reason is recorded | Does not imply approval |

`CONDITIONAL GO` is not a shippable state. Conditions must be resolved and
affected agents must re-confirm `SATISFIED` before deployment.

## 5. Collaboration lifecycle

Every meaningful handoff follows this loop:

1. Author performs a role-specific self-check.
2. Author identifies active agents affected by the work.
3. Relevant agents review and return a state, evidence, and actionable feedback.
4. Author changes the work or supplies evidence that closes the concern.
5. The loop repeats until all active reviewers are `SATISFIED`, or the issue is
   escalated to the binding decision authority.
6. The handoff records the state, evidence, residual risks, and revalidation
   trigger.

The release loop adds one final requirement: `@product-manager` cannot issue a
GO decision until the complete team matrix is satisfied.

## 6. Architecture surfaces

The behavior must exist in multiple layers so one stale prompt cannot disable
it:

| Layer | Required surface | Purpose |
|---|---|---|
| Canonical behavior | `.agents/references/utter-satisfaction.md` | Single source of truth for states, loop, evidence, and release rules |
| Persona DNA | `agents/*.md` | Makes the behavior visible when a persona is loaded |
| Global policy | `GUARDRAILS.md`, `AGENTS.md` | Applies the culture across skills and harnesses |
| Handoff contract | `workflow.md` | Stops unresolved states between agents |
| Artifact contract | Handoff reports and scorecards | Preserves evidence and revalidation history |
| Release gate | `release-readiness.md`, `go-nogo-decision.md` | Prevents shipping before satisfaction |
| Runtime enforcement | `validate_satisfaction.js`, orchestrator hooks | Converts the policy into a machine-checkable gate |
| Observability | `satisfaction` telemetry events and status output | Measures collaboration health without ranking personalities |

## 7. Phase integration

Every phase owns a part of the DNA. No later phase may remove an earlier
guarantee.

| Plan area | DNA responsibility | Required outcome |
|---|---|---|
| Phase 0 - Foundation | Define the protocol, states, persona section, guardrail, and canonical entry-point contract | New personas inherit the DNA by default |
| Phase 1 - Skills | Add satisfaction checks to step-file handoffs and launch templates | A skill cannot call an incomplete handoff complete |
| Phase 2 - Enablement | Add state validation to orchestration and the QA/release gate | Runtime rejects missing or dishonest sign-off |
| Phase 3 - Observability | Emit satisfaction, feedback, escalation, and revalidation events | Status shows where quality is blocked and why |
| Phase 4 - Modularity | Make the protocol part of the core module and builder output | Installed modules cannot weaken the core gate |
| Phase 5 - Deeper Bench | Require every new persona and skill to declare collaborators and evidence | New surface area strengthens, rather than fragments, the culture |
| Phase 6 - Loop Engineering | Require verifier approval plus satisfaction for release-affecting loops | Automation iterates toward quality, not just a passing command |
| Harness integration | Preserve state and release semantics in M1, M2, M3, and M4 modes | Degraded execution is honest and cannot silently ship |
| Flint / token-effective mode | Compress context and prose only | Savings never remove evidence, escalation, or release gates |

## 8. Runtime enforcement plan

Add a machine-readable companion to the human release record:

```json
{
  "schema": "vespyr/utter-satisfaction@1.0",
  "release": "feature-or-version",
  "updated_at": "YYYY-MM-DDTHH:mm:ssZ",
  "agents": [
    {
      "name": "product-manager",
      "scope": "active",
      "state": "SATISFIED",
      "evidence": ["artifacts/output/06-launch/release-readiness.md#6.1"],
      "feedback_resolved": ["CR-001"],
      "residual_risks": [],
      "updated_at": "YYYY-MM-DDTHH:mm:ssZ"
    }
  ],
  "gate": "GO",
  "revalidation_required": false
}
```

The future `validate_satisfaction.js` implementation must:

- Validate allowed states and required fields.
- Require evidence for `SATISFIED`.
- Require a reason for `NOT ACTIVATED`.
- Reject `CHANGES REQUESTED` and `BLOCKED` on release paths.
- Reject a stale sign-off when the artifact fingerprint or relevant scope changes.
- Return a non-zero exit code for an incomplete gate.
- Be called by `orchestrator_state.js next`, launch readiness, and supported
  harness adapters.

The validator should report the first blocking reason clearly, then list all
remaining failures so the swarm can resolve them in one cycle.

## 9. Evidence and telemetry

Measure the health of the collaboration loop, not an agent's personality or
subjective enthusiasm:

| Metric | Meaning | Guardrail |
|---|---|---|
| Satisfaction coverage | Active roles with a recorded state | Missing rows are a release failure |
| Evidence completeness | `SATISFIED` rows with valid evidence | Do not count empty assertions |
| Feedback resolution time | Time from `CHANGES REQUESTED` to closure | Use for process improvement, not punishment |
| Revalidation rate | Sign-offs refreshed after material changes | Low rate indicates stale approval risk |
| Escalation count | Issues sent to binding authority after two cycles | Escalation is healthier than silent waiver |
| Release blocks | Releases stopped by the gate | Review recurring causes in retro |

Do not optimize for zero blocks, zero dissent, or the fastest satisfaction
timestamp. Those targets incentivize rubber-stamping and undermine the DNA.

## 10. Extension checklists

### New persona

- Read and reference the canonical protocol.
- Declare the domain-specific satisfaction criteria.
- Declare upstream/downstream collaborators.
- Define evidence required for `SATISFIED`.
- Define blocking conditions and escalation authority.
- Add the persona to the release matrix if it can affect shipping.
- Pass frontmatter, persona-depth, and satisfaction-contract validation.

### New skill or workflow

- Define the handoff point and active reviewer set.
- Include a satisfaction state in the output contract.
- Define the feedback loop and two-cycle escalation behavior.
- Add revalidation behavior after material changes.
- Identify whether the skill can affect release readiness.
- Add an integration test for an incomplete gate.

### New module, harness, MCP tool, or automation

- Preserve the canonical protocol and state vocabulary.
- Return evidence references rather than opaque success messages.
- Never convert `BLOCKED` or `CHANGES REQUESTED` into success.
- Document degraded behavior and minimum safe mode.
- Prove that release gating still works through the new integration path.

## 11. Release gate

No future Vespyr release is complete until:

- The development-plan DNA contract and runtime reference agree.
- All active release participants are `SATISFIED` with evidence.
- Every inactive optional domain has an explicit reason.
- No unresolved blocking feedback or change request remains.
- The human-readable and machine-readable release records agree.
- A post-sign-off change triggers revalidation.
- The maintainer reviews the release record and confirms the gate is honest.

## 12. Verification criteria

- A new persona generated by a builder contains the DNA contract.
- A handoff with `CHANGES REQUESTED` cannot advance the state machine.
- A handoff with `BLOCKED` cannot reach launch.
- A release with a missing active agent row is `NO-GO`.
- A release with `NOT ACTIVATED` and no reason is `NO-GO`.
- A material artifact change invalidates the affected sign-off.
- Every supported harness preserves the same state vocabulary and gate result.
- Flint, solo, automation, and MCP paths cannot bypass the gate.
- Dogfood exercises at least one feedback loop, one escalation, one revalidation,
  and one successful all-satisfied release.

## 13. Non-goals

- Do not require every optional persona for every task.
- Do not build a universal consensus or voting system.
- Do not score agents by a subjective satisfaction number.
- Do not create endless iteration loops; use the existing feedback limit and
  escalation ladder.
- Do not replace role-specific quality standards with this protocol. The DNA
  coordinates them and protects the final handoff.
