# Agent Contracts — Owns vs. Does NOT Own

Each agent has a clear scope. Use this table to decide who to invoke. If a task falls outside an agent's "owns" column, escalate per the escalation ladder in `GUARDRAILS.md`.

| Agent | Owns (does this) | Does NOT own (delegate up) |
|---|---|---|
| `@founder` | Strategic concept stress-testing, GO/RESHAPE/NO-GO, scope disputes between PM and tech-lead | Tactical execution, code review, design |
| `@product-manager` | PRD, user stories, kanban, success metrics, AI-PM artifacts (AC-AI criteria, AI UX standards in spec, AI eval specs, token economics, AI safety/governance rules), scope vs. business disputes | Architecture, code quality, design fidelity, in-product UI microcopy |
| `@product-designer` | UX/UI specs, screen states, design system tokens, in-product microcopy/UX writing, **motion spec** (`motion-spec.md`), accessibility-aware design proposals | Backend logic, marketing/landing copy, market research, final accessibility decisions |
| `@architect` | ADRs, system components, DDL/types, API contracts, AI architecture (AI-ADRs, vector DB, AI security boundary, AI cost scaling model), tech debt catalog | Business logic, UI implementation, deployment |
| `@tech-lead` | Execution plans, task breakdown, estimation, dependency management, parallel coordination, spec vs. implementation disputes | Strategic direction, product priorities, design |
| `@developer` | Code implementation, unit tests, bug fixes, refactoring, **motion framework & `MO-###` implementation**, security-fix implementation from audit specs | Architecture, design fidelity, product priorities |
| `@code-reviewer` | PR reviews, false-positive filtering, pattern violations, systemic issue escalation, first-pass dependency/risk flagging | Implementation, design feedback, security deep audit, supply-chain verdict |
| `@qa-engineer` | Test plans, regression runs, release certification, QA process, **AI eval harness + blocking baseline gate**, adversarial/red-team datasets | Code review, security audit, performance tuning |
| `@researcher` | Market analysis, competitive landscape, **motion market/technology research** | User research, UX, product strategy |
| `@user-researcher` | Interview guides/screeners/plans for the human to run, personas, JTBD analysis from human-gathered data | Market research, UX evaluation, product metrics, running participant sessions |
| `@ux-researcher` | Usability evaluation, **binding design-versus-accessibility decisions**, **motion usability/accessibility research**, test kits for human-run sessions | Visual design, code, market research |
| `@data-analyst` | Telemetry instrumentation, dashboards, funnel analysis, experiment results, synthetic/mock datasets, insight translation | Product strategy, user research, code |
| `@security-engineer` | Threat models, vulnerability scans, security findings, **AI application security** (prompt injection, jailbreak, tool-call exfiltration, RAG poisoning), **dependency/supply-chain audit**, security vs. timeline disputes | Implementation, performance, product priorities |
| `@performance-engineer` | Engine cost/performance profiling, optimization, performance benchmarks (product-latency/load testing retired until a harness exists) | Architecture, code quality, security, cost arbitration |
| `@ml-ai-engineer` | Model/prompt/RAG/eval, fine-tuning/distillation, agentic orchestration, model integrations, AI architecture | Data analysis, infrastructure, production serving |
| `@ml-ai-ops` | Production serving, monitoring, rollback, LLM infrastructure, drift/token-cost telemetry | Model/prompt development, AI architecture |
| `@devops-engineer` | CI/CD, cloud provisioning, monitoring, deployment, **cloud cost / FinOps** (monitoring, budgets, rightsizing arbitration) | Application code, security policy, product |
| `@technical-writer` | User manuals, API specs, release notes, documentation site, Diátaxis-structured docs | Code, design, in-product UI microcopy (`@product-designer`), marketing copy |
| `@shifu` | Learning paths/curriculum design, content synthesis, tutorials, syllabi, assessments & exercises, cheatsheets, video scripts, teaching sessions | Product strategy, code, design decisions |
| `@memory-controller` | Memory reads/writes, context loading, compaction, archival, session summaries, owner preferences | Domain reasoning, task execution, quality judgments |

## Prototype collaboration ownership

When a prototype is in scope, `@product-designer` owns visual fidelity, interaction states, tokens, and the track/runtime decision. `@tech-lead` owns implementability, task feasibility, and the handoff into engineering. Neither can unilaterally clear the handoff: both must provide separate `SATISFIED` sign-offs in `prototype-collaboration.md`, and `prototype_collab_gate.js` must pass. `@architect` owns any system/data-boundary decision that emerges from the review.

## Motion ownership

Motion is a **capability**, not a separate agent. Ownership (per the row entries above):

- **`@product-designer`** owns the motion *spec* — `motion-spec.md`, motion tokens in `design.md`, and the complete motion prompts (`MO-###`) for `@developer`. Loads `.agents/references/motion/motion-design-guidelines.md` on demand.
- **`@developer`** owns the motion *framework and code* — implements every `MO-###` prompt verbatim, loads `.agents/references/motion/motion-implementation-guidelines.md` on demand. Under-specified prompts are flagged back to `@product-designer`, never improvised.
- **`@tech-lead`** owns the motion *implementation handoff* — records `motion-handoff.md`, adds motion tasks to the approved execution plan, and routes the work into `/develop`.
- **`@researcher`** owns motion *market/tech research* — competitive motion language + animation library landscape.
- **`@ux-researcher`** owns motion *usability/accessibility research and final accessibility decisions* — perceived performance, cognitive load, vestibular/reduced-motion evidence, platform patterns.
- Entry point: the `/motion` skill orchestrates research → spec → implementation handoff. `/develop` owns motion code and `/test` owns runtime certification. Knowledge lives in `.agents/references/motion/`, loaded on demand only — never inline, to keep context loading efficient.

## Capability Registry (machine-checked)

Every frontmatter capability has exactly one row below with its own wiring. `tests/agent-capability-contract.test.js` enforces: set equality with frontmatter, no duplicate labels across agents, every wiring path exists, every eval-suite wiring contains benchmarks for the owning agent, and at least one wiring path names the agent or the capability (decorative wiring fails).

| Agent | Capability | Wiring (evidence on disk) |
|---|---|---|
| `@founder` | `strategic-analysis` | `.agents/skills/validate-idea/SKILL.md`, `.agents/references/founder-frameworks.md` |
| `@founder` | `decision-making` | `.agents/skills/validate-idea/steps/step-06a-go-pivot-kill.md`, `.agents/references/founder-frameworks.md` |
| `@founder` | `opportunity-assessment` | `.agents/skills/validate-idea/SKILL.md`, `.agents/references/founder-frameworks.md` |
| `@product-manager` | `requirements-scoping` | `.agents/skills/design/steps/step-01a-load-prd-brief.md`, `.agents/templates/product/prd-template.md` |
| `@product-manager` | `prd-generation` | `.agents/templates/product/prd-template.md`, `.agents/skills/design/steps/step-03d-prd-synthesis.md` |
| `@product-manager` | `backlog-management` | `.agents/skills/kanban/SKILL.md`, `.agents/templates/planning/kanban-template.md` |
| `@product-manager` | `user-story-mapping` | `.agents/templates/product/user-story-template.md`, `.agents/skills/design/steps/step-03a-user-stories.md` |
| `@product-manager` | `ai-acceptance-criteria` | `.agents/templates/product/user-story-template.md` |
| `@product-manager` | `ai-eval-specification` | `.agents/templates/product/user-story-template.md`, `artifacts/docs/strategy/development-plan/02d-phase-1-ai-ready-team.md` |
| `@product-manager` | `ai-ux-design` | `.agents/templates/product/product-spec-template.md` |
| `@product-manager` | `ai-cost-modeling` | `.agents/templates/product/prd-template.md` |
| `@product-manager` | `ai-safety-governance` | `.agents/templates/product/prd-template.md`, `artifacts/docs/strategy/development-plan/02d-phase-1-ai-ready-team.md` |
| `@product-designer` | `ui-design` | `.agents/skills/design/steps/step-04a-screen-states.md`, `.agents/templates/product/design.md` |
| `@product-designer` | `ux-specification` | `.agents/templates/product/product-spec-template.md`, `.agents/skills/design/SKILL.md` |
| `@product-designer` | `design-system` | `.agents/templates/product/design.md`, `.agents/skills/design/steps/step-05a-design-tokens.md` |
| `@product-designer` | `motion-design` | `.agents/references/motion/motion-design-guidelines.md`, `.agents/templates/product/motion-spec-template.md` |
| `@product-designer` | `microcopy-ux-writing` | `.agents/templates/product/product-spec-template.md`, `.agents/templates/product/design.md` |
| `@architect` | `system-design` | `.agents/skills/develop/steps/step-02-architecture.md` |
| `@architect` | `adr-writing` | `.agents/templates/architecture/adr-template.md` |
| `@architect` | `api-contracts` | `.agents/skills/develop/steps/step-02-architecture.md` |
| `@architect` | `data-modeling` | `.agents/skills/develop/steps/step-02-architecture.md` |
| `@architect` | `ai-architecture-design` | `.agents/skills/develop/steps/step-02-architecture.md`, `.agents/templates/architecture/adr-template.md` |
| `@architect` | `vector-db-design` | `.agents/templates/architecture/adr-template.md`, `.agents/agents/architect.md` |
| `@architect` | `ai-security-boundary` | `.agents/templates/architecture/adr-template.md`, `.agents/agents/architect.md` |
| `@architect` | `ai-cost-scaling` | `.agents/templates/architecture/adr-template.md`, `.agents/agents/architect.md` |
| `@tech-lead` | `task-breakdown` | `.agents/skills/plan/SKILL.md`, `.agents/skills/develop/steps/step-03b-backlog-prep.md` |
| `@tech-lead` | `estimation` | `.agents/skills/plan/SKILL.md`, `.agents/templates/planning/execution-plan-template.md` |
| `@tech-lead` | `execution-planning` | `.agents/skills/plan/SKILL.md` |
| `@tech-lead` | `dependency-management` | `.agents/skills/plan/SKILL.md`, `.agents/templates/planning/execution-plan-template.md` |
| `@developer` | `code-generation` | `.agents/skills/develop/steps/step-06-dev-loop.md`, `.agents/references/developer-guidelines.md` |
| `@developer` | `refactoring` | `.agents/references/developer-guidelines.md`, `.agents/skills/develop/steps/step-06-dev-loop.md` |
| `@developer` | `test-writing` | `.agents/references/developer-guidelines.md`, `evals/suites/agents/core-swarm.json` |
| `@developer` | `motion-implementation` | `.agents/references/motion/motion-implementation-guidelines.md` |
| `@code-reviewer` | `code-review` | `.agents/skills/review/SKILL.md`, `.agents/references/socratic/code-reviewer.md` |
| `@code-reviewer` | `security-triage` | `.agents/agents/code-reviewer.md`, `.agents/references/socratic/code-reviewer.md` |
| `@qa-engineer` | `test-planning` | `.agents/skills/test/SKILL.md` |
| `@qa-engineer` | `regression-testing` | `.agents/skills/test/SKILL.md`, `.agents/skills/test/steps/step-02b-fullcycle-test.md` |
| `@qa-engineer` | `integration-testing` | `.agents/skills/test/steps/step-02b-fullcycle-test.md` |
| `@qa-engineer` | `release-certification` | `.agents/skills/launch/steps/step-01-readiness-check.md` |
| `@qa-engineer` | `acceptance-criteria-enrichment` | `.agents/skills/test/steps/step-01-exploratory-enrichment.md` |
| `@qa-engineer` | `exploratory-testing` | `.agents/skills/test/steps/step-01-exploratory-enrichment.md` |
| `@qa-engineer` | `ai-eval-harness` | `tools/eval/baseline.js`, `evals/suites/agents/core-swarm.json` |
| `@qa-engineer` | `ai-regression-monitoring` | `tools/eval/baseline.js` |
| `@qa-engineer` | `ai-release-certification` | `.agents/skills/launch/steps/step-01-readiness-check.md` |
| `@qa-engineer` | `adversarial-testing` | `.agents/skills/test/SKILL.md`, `evals/suites/invariants/grill-me-spcp.json` |
| `@researcher` | `market-analysis` | `.agents/skills/explore-idea/steps/step-02a-market-research.md` |
| `@researcher` | `competitor-research` | `.agents/skills/explore-idea/steps/step-02b-competitor-analysis.md` |
| `@researcher` | `motion-market-research` | `.agents/references/motion/motion-research-guide.md`, `.agents/skills/motion/SKILL.md` |
| `@user-researcher` | `interview-preparation` | `.agents/skills/research-plan/SKILL.md`, `.agents/templates/discovery/research-plan.md` |
| `@user-researcher` | `persona-mapping` | `.agents/templates/research/user-personas-template.md`, `.agents/skills/explore-idea/steps/step-02c-user-research.md` |
| `@user-researcher` | `jobs-to-be-done` | `.agents/skills/jtbd/SKILL.md` |
| `@user-researcher` | `research-synthesis` | `.agents/skills/research-plan/SKILL.md`, `.agents/agents/user-researcher.md` |
| `@ux-researcher` | `usability-evaluation` | `.agents/skills/design/steps/step-01c-heuristic-eval.md`, `.agents/skills/design/steps/step-03c-a11y-check.md` |
| `@ux-researcher` | `usability-test-preparation` | `.agents/templates/research/usability-test-kit-template.md`, `.agents/skills/design/SKILL.md` |
| `@ux-researcher` | `motion-usability-research` | `.agents/references/motion/motion-research-guide.md` |
| `@data-analyst` | `telemetry` | `.agents/skills/analyze-data/SKILL.md`, `.agents/templates/quality/measurement-plan-template.md` |
| `@data-analyst` | `dashboards` | `.agents/templates/quality/measurement-plan-template.md`, `.agents/templates/quality/analytics-insights-template.md` |
| `@data-analyst` | `funnel-analysis` | `.agents/skills/analyze-data/SKILL.md`, `.agents/templates/quality/analytics-insights-template.md` |
| `@data-analyst` | `experiment-design` | `.agents/skills/analyze-data/SKILL.md` |
| `@data-analyst` | `data-analysis` | `.agents/skills/analyze-data/SKILL.md` |
| `@data-analyst` | `data-visualization` | `.agents/skills/analyze-data/SKILL.md` |
| `@data-analyst` | `insight-translation` | `.agents/skills/analyze-data/SKILL.md`, `.agents/templates/quality/analytics-insights-template.md` |
| `@data-analyst` | `pm-metric-collaboration` | `.agents/skills/analyze-data/SKILL.md`, `.agents/references/pm-metrics.md` |
| `@data-analyst` | `synthetic-data` | `.agents/skills/analyze-data/SKILL.md` |
| `@security-engineer` | `threat-modeling` | `.agents/templates/security/threat-model-template.md`, `.agents/agents/security-engineer.md` |
| `@security-engineer` | `vulnerability-scanning` | `.agents/scripts/security-scan.js`, `.agents/skills/develop/steps/step-07-quality-gates.md` |
| `@security-engineer` | `security-review` | `.agents/skills/develop/steps/step-07-quality-gates.md`, `.agents/agents/security-engineer.md` |
| `@security-engineer` | `ai-application-security` | `.agents/scripts/security-scan.js`, `evals/suites/agents/engineering-ops.json` |
| `@security-engineer` | `supply-chain-audit` | `.agents/scripts/security-scan.js`, `evals/security/corpus/README.md` |
| `@performance-engineer` | `profiling` | `.agents/scripts/hot_path_analyzer.js`, `.agents/scripts/token_profiler.js`, `.agents/agents/performance-engineer.md` |
| `@performance-engineer` | `optimization` | `.agents/scripts/hot_path_analyzer.js`, `.agents/skills/retro/steps/step-01-hot-paths.md` |
| `@ml-ai-engineer` | `ml-integration` | `.agents/templates/architecture/model-approved-for-production.md` |
| `@ml-ai-engineer` | `prompt-engineering` | `.agents/agents/ml-ai-engineer.md`, `.agents/references/socratic/ml-ai-engineer.md`, `evals/suites/agents/engineering-ops.json` |
| `@ml-ai-engineer` | `model-evaluation` | `evals/suites/agents/engineering-ops.json`, `.agents/templates/architecture/model-approved-for-production.md` |
| `@ml-ai-engineer` | `rag-system-design` | `.agents/agents/ml-ai-engineer.md`, `evals/suites/agents/engineering-ops.json` |
| `@ml-ai-engineer` | `fine-tuning-distillation` | `.agents/agents/ml-ai-engineer.md`, `evals/suites/agents/engineering-ops.json` |
| `@ml-ai-engineer` | `eval-harness-design` | `tools/eval/baseline.js`, `evals/suites/agents/engineering-ops.json` |
| `@ml-ai-engineer` | `agentic-orchestration` | `.agents/skills/develop/steps/step-02-architecture.md`, `.agents/skills/test/SKILL.md` |
| `@ml-ai-ops` | `llm-serving-infrastructure` | `.agents/references/ml-ops-runbook.md` |
| `@ml-ai-ops` | `vector-index-maintenance` | `.agents/references/ml-ops-runbook.md` |
| `@ml-ai-ops` | `prompt-cache-management` | `.agents/references/ml-ops-runbook.md` |
| `@ml-ai-ops` | `model-registry-ops` | `.agents/templates/architecture/model-approved-for-production.md` |
| `@ml-ai-ops` | `drift-monitoring` | `.agents/references/ml-ops-runbook.md` |
| `@ml-ai-ops` | `token-cost-telemetry` | `.agents/references/ml-ops-runbook.md`, `.agents/references/finops-guidelines.md` |
| `@ml-ai-ops` | `rollback-procedures` | `.agents/references/ml-ops-runbook.md`, `.agents/templates/architecture/model-approved-for-production.md` |
| `@devops-engineer` | `ci-cd` | `.github/workflows/swarm-tests.yml`, `.github/workflows/security.yml` |
| `@devops-engineer` | `infrastructure` | `.agents/skills/launch/steps/step-02-deploy.md` |
| `@devops-engineer` | `deployment` | `.agents/skills/launch/steps/step-02-deploy.md`, `.agents/skills/incident/SKILL.md` |
| `@devops-engineer` | `monitoring` | `.agents/skills/incident/SKILL.md` |
| `@devops-engineer` | `finops-cost-management` | `.agents/references/finops-guidelines.md` |
| `@technical-writer` | `documentation` | `.agents/skills/develop/steps/step-09-documentation.md` |
| `@technical-writer` | `api-reference` | `.agents/templates/documentation/api-reference-template.md`, `.agents/agents/technical-writer.md` |
| `@technical-writer` | `release-notes` | `.agents/templates/launch/release-notes-template.md`, `.agents/skills/launch/steps/step-02-deploy.md` |
| `@technical-writer` | `diataxis-structure` | `.agents/skills/develop/steps/step-09-documentation.md`, `.agents/agents/technical-writer.md` |
| `@shifu` | `curriculum-design` | `.agents/skills/teach-me/SKILL.md`, `.agents/skills/craft-lesson/steps/step-04a-syllabus.md` |
| `@shifu` | `content-synthesis` | `.agents/skills/craft-lesson/steps/step-02b-synthesize.md`, `.agents/skills/teach-me/SKILL.md` |
| `@shifu` | `assessment-creation` | `.agents/skills/craft-lesson/steps/step-04e-class.md` |
| `@shifu` | `pedagogical-structuring` | `.agents/skills/craft-lesson/steps/step-03-structure.md` |
| `@memory-controller` | `context-loading` | `.agents/scripts/memory_filter.js`, `.agents/agents/memory-controller.md` |
| `@memory-controller` | `memory-validation` | `.agents/scripts/memory_write.js`, `.agents/agents/memory-controller.md` |
| `@memory-controller` | `history-compaction` | `.agents/scripts/archive_manager.js`, `.agents/agents/memory-controller.md` |

## Cross-cutting principles

1. **When in doubt, escalate.** If a task falls between two agents, the lower-numbered one (in the workflow position table) gets first refusal. The other can be consulted but does not own the decision.

2. **The "owns" column is non-negotiable.** An agent that tries to do work outside their column is overstepping. File a CR or escalate to `@founder`.

3. **The "does NOT own" column lists who to delegate TO.** Use the table to find the right agent, not to find reasons to refuse work.
