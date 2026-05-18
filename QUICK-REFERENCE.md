# Quick Reference Card

```
PHASES
──────
Product:   Validation (Red) → Exploration (Indigo) → Design (Amber) → Development (Green)
Games:     Validation (Pink) → Exploration (Purple) → Design (Amber) → Development (Green)

PRIMARY AGENTS (by phase)
──────────────────────────────────────────────────
Validation     @founder              Socratic stress-test (idea or game concept)

Exploration    @founder              Synthesize → decide → commit
                @market-researcher    Validate market exists
                @competitor-analyzer  Map competition
                @user-researcher      Validate user needs

Design         @product-manager      PRD + User Stories
                @product-designer     Flows + UI specs + design tokens
                @architect            System architecture + ADRs

Development    @tech-lead            Task breakdown + execution plan
                @developer            Write code + tests
                @code-reviewer        Quality gate (read-only)
                @qa-engineer          Validate against acceptance criteria

Infrastructure @devops-engineer      CI/CD + infra + deployment
                @performance-engineer Profiling + load testing
                @security-engineer    OWASP + CVE audit

Optional       @ml-engineer          ML/AI models + pipelines
                @ux-researcher        Usability validation
                @data-analyst         Metrics + instrumentation
                @technical-writer     API docs + guides

──────────────────────────────────────────────────

SUBAGENTS — invoke by @mention
──────────────────────────────────────────────────
@architect       Full access  — System design, ADRs, tech stack
@code-reviewer   Read-only    — Code quality gate (no edits)
@competitor-an.  Read-only    — Competitive analysis
@data-analyst    Full access  — Measurement + analytics
@developer       Full access  — Production code
@devops-engineer Full access  — Infrastructure, CI/CD
@founder         Read-only    — Strategic ideation
@market-researcher Read-only  — Market sizing, trends
@ml-engineer     Full access  — ML models, pipelines, serving
@product-designer Full access — UX/UI specs, design tokens
@product-manager Full access  — PRD, user stories
@qa-engineer     Full access  — Testing, validation
@security-engineer Read-only  — Security audit (no edits)
@tech-lead       Full access  — Planning, task breakdown
@technical-writer Full access — Documentation
@user-researcher Read-only    — User research, personas
@performance-eng. Read-only   — Performance profiling
@ux-researcher   Read-only    — Usability evaluation

──────────────────────────────────────────────────

QUALITY GATES (in order)
──────────────────────────────────────────────────
1. UX research (optional)   — @ux-researcher
2. Code review              — @code-reviewer
3. QA validation            — @qa-engineer
4. PM sign-off              — @product-manager
5. Security audit           — @security-engineer (Critical/High = block)
6. Performance audit        — @performance-engineer
7. ML validation (optional) — @ml-engineer

──────────────────────────────────────────────────

SHARED MEMORY (artifacts/memory/)
──────────────────────────────────────────────────
project-context.md           Static: project basics, tech stack
active-decisions.md          Dynamic: current decisions, rationale
patterns-and-conventions.md  Dynamic: discovered patterns
lessons-learned.md           Dynamic: insights from each phase
blockers-and-risks.md        Dynamic: active blockers
agent-notes/*.md             Per-agent accumulated knowledge
session-summaries/latest.md  Most recent session context

Rule: Read before starting. Write after completing.

──────────────────────────────────────────────────

KEY FILES
──────────────────────────────────────────────────
Workflow              .opencode/workflow.md
Skills/tabs           .opencode/skills.md
Troubleshooting       .opencode/TROUBLESHOOTING.md
Agent library         .opencode/agents/
Agent templates       .opencode/agents/templates/

──────────────────────────────────────────────────
```

---

**Usage:** Keep this in your project root as `QUICK-REFERENCE.md` or paste into your team wiki. It summarizes the entire agent system in one view.

*Full documentation: [workflow.md](.opencode/workflow.md) · [skills.md](.opencode/skills.md) · [troubleshooting](.opencode/TROUBLESHOOTING.md)*