---
name: develop
description: Core MVP workflow — spec review, architecture, planning, implementation, QA, verification, and documentation
---

# Develop — Multi-Step Workflow

This skill runs in sequential steps. Each step is a self-contained file with its own halt conditions. Load one at a time.

## When to invoke
- Phase ≥ 4 (planning complete)
- `@tech-lead` has approved `artifacts/output/04-planning/execution-plan.md`
- Worktree allocated (multi-developer mode) OR on `main` (single-developer mode)

## Prerequisites
- Spec-kernel exists at `artifacts/output/02-strategy/` (see spec-kernel-template.md)
- User stories in `artifacts/output/02-strategy/user-stories.md`

## Mode detection
- Always "create" on first activation.
- Resume is automatic: read `stepsCompleted` from the output document's YAML frontmatter and jump to the first uncompleted step.

## Step loader
1. Read `stepsCompleted` array from `artifacts/output/05-execution/develop-state.md` (or start at []).
2. Compute next step = first step NOT in `stepsCompleted`.
3. Load `steps/step-{NN}-*.md`.
4. Execute. On completion, append NN to `stepsCompleted` and re-invoke loader.

## Harness adherence (non-negotiable)
- Follow the step sequence exactly. Do NOT skip steps or reorder them.
- Quality gates are not optional. QA runs automatically at step 7 — do NOT ask the user whether to run tests.
- Security and performance gates are auto-decided based on spec content — do NOT ask the user which gates apply.
- Each step file is a contract. Read it fully before executing. Step files override general guidelines.
- If a step halts (test failure, security finding, 2+ review cycles), stop and escalate to `@tech-lead`. Do NOT proceed past a halt condition.

## Step sequence
1. **Spec Alignment & Read Check** → `steps/step-01-spec-alignment.md`
2. **Architecture** (conditional: if ArchitectPhase: true) → `steps/step-02-architecture.md`
3a. **Arch Review** → `steps/step-03a-arch-review.md`
3b. **Backlog Prep** → `steps/step-03b-backlog-prep.md`
4. **Kanban Activation** → `steps/step-04-kanban-activation.md`
5. **Spike** (optional) → `steps/step-05-spike.md`
6. **Dev Loop** (multi-worktree OR single-developer) → `steps/step-06-dev-loop.md`
7. **Quality Gates** (QA hard gate → security conditional → performance conditional) → `steps/step-07-quality-gates.md`
8. **PM Verification** → `steps/step-08-pm-verification.md`
9. **Documentation** → `steps/step-09-documentation.md`
10. **Completion** → `steps/step-10-completion.md`

## Halt conditions (any one halts the entire flow)
- Spec gap unfilled after 2 CR cycles
- Test failure that doesn't reproduce locally
- Security finding rated Critical or High
- 2 review loops exceeded (escalate to `@tech-lead`)

## State machine integration
At start: `node .agents/scripts/orchestrator_state.js status`
At each step end: `node .agents/scripts/orchestrator_state.js step --name {step-name} --status {done/blocked}`
At end: `node .agents/scripts/orchestrator_state.js complete --agent developer --artifact 05-execution/{feature}.md`

## Done when
- All steps in `stepsCompleted`
- `qa-signoff.md` exists with GO/CONDITIONAL
- Phase advanced to quality
