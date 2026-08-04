# Quick Reference Card

```
VESPYR IDENTITY — 3 differentiators
────────────────────────────────────
1. Permission-denial I/O split — reasoning agents delegate all I/O to sub-agents
2. Socratic methodology depth — every reasoning agent challenges assumptions
3. 3-tier progressive memory — context loaded in tiers, not all-at-once or not-at-all

PHASES
──────
Product:   Validation → Exploration → Design → Development
Games:     Validation → Exploration → Design → Development

SQUADS (curated presets)
────────────────────────
full-team    All 21 agents (default)
startup      founder, researcher, competitor, user-researcher, PM, designer, architect, tech-lead, developer, reviewer, QA, devops (Idea to MVP)
build        architect, tech-lead, developer, reviewer, QA, devops, technical-writer (Build from spec)
research     founder, researcher, competitor, user-researcher, PM (Validation only, no code)
design       PM, designer, ux-researcher, data-analyst (Strategy & sprint)
ship         developer, reviewer, QA, security, performance, devops (Quality & delivery)
game-studio  founder (game), researcher, user-researcher, PM, designer, architect, tech-lead, developer, QA (Game variant)

Switch squad:  /squad [squadName]
Show squads:   /squad show
Next step:     /help-me [query]      (conversational navigator for project state)
Stress-test:   /grill-me             (Socratic alignment / Q&A pressure test)
Elicit/refine: /elicitation          (Interactive output critique and improvement loop)



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

Optional       @ml-ai-engineer       AI & ML models, RAG, prompt engineering, evals
                @ml-ai-ops            Production AI serving, vector indexes, drift ops
                @ux-researcher        Usability validation
                @data-analyst         Metrics + instrumentation
                @shifu                Educational content + learning paths
                @technical-writer     API docs + guides

──────────────────────────────────────────────────

SUBAGENTS — invoke by @mention
──────────────────────────────────────────────────
@architect       Full access  — System design, ADRs, tech stack
@code-reviewer   Read-only    — Code quality gate (no edits)
@data-analyst    Full access  — Measurement + analytics
@developer       Full access  — Production code
@devops-engineer Full access  — Infrastructure, CI/CD
@founder         Read-only    — Strategic ideation
@ml-ai-engineer  Full access  — AI & ML models, RAG, prompts, evals
@ml-ai-ops       Full access  — Production AI serving, drift ops, rollback
@product-designer Full access — UX/UI specs, design tokens
@product-manager Full access  — PRD, user stories
@qa-engineer     Full access  — Testing, validation
@researcher      Read-only    — Market research, competitive analysis
@security-engineer Read-only  — Security audit (no edits)
@shifu           Full access  — Learning paths, educational content
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
7. ML/AI validation (opt)   — @ml-ai-engineer / @ml-ai-ops

──────────────────────────────────────────────────

SHARED MEMORY (artifacts/memory/)
──────────────────────────────────────────────────
project-context.md           Static: project basics, tech stack
session-checkpoints/checkpoint.md  LIVE rolling cursor (in-progress loop state) — auto-emitted by orchestrator_state.js
active-decisions.md          Dynamic: current decisions, rationale
patterns-and-conventions.md  Dynamic: discovered patterns
lessons-learned.md           Dynamic: insights from each phase
blockers-and-risks.md        Dynamic: active blockers
agent-notes/*.md             Per-agent accumulated knowledge
session-summaries/latest.md  Most recent ENDED session context (~100 tokens)
session-summaries/history.md Full session log (never loaded directly)
archive/                     Compacted historical entries (searchable)

Rule: Never read memory files directly. Use @memory-controller.

LOAD:    @memory-controller load [agent-type] [task-description]
WRITE:   @memory-controller write [file] [entry]
SESSION: node .agents/scripts/orchestrator_state.js session-start --agent {agent} --domain {domain} --goal "..."   ← run on entry, refreshes project-context
FIND:    @memory-controller search [query]
ARCHIVE: node .agents/scripts/memory_filter.js --search "<distinct phrase>"
FULL:    @memory-controller load-full [filename]
BLOCKERS:@memory-controller load blockers
SESSION: @memory-controller session-write [content]
STATUS:  @memory-controller status

Progressive loading: ~1,000 tokens vs ~15,000 tokens raw (85-95% savings)
Hybrid scoring: keyword pre-filter (Stage 1) + semantic refinement (Stage 2)
Synonym expansion: auth≈login, db≈database, deploy≈release, etc.
Session continuity: ~100 tokens for last-session context
Auto-compaction: triggers when files exceed word thresholds
Archive: resolved/stale entries moved to archive/YYYY-QN/ with index
Deduplication: write validation rejects near-identical entries

──────────────────────────────────────────────────

KEY FILES
──────────────────────────────────────────────────
Workflow              .agents/workflow.md
Workflows & Skills   .agents/skills.md
Troubleshooting       .agents/TROUBLESHOOTING.md
Agent library         .agents/agents/
Agent templates       .agents/agents/templates/

──────────────────────────────────────────────────
```

---

**Usage:** Keep this in your project root as `QUICK-REFERENCE.md` or paste into your team wiki. It summarizes the entire agent system in one view.

*Full documentation: [workflow.md](.agents/workflow.md) · [skills.md](.agents/skills.md) · [troubleshooting](.agents/TROUBLESHOOTING.md)*