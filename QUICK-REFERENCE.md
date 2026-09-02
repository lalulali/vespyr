# Quick Reference Card

```
VESPYR IDENTITY — 2 differentiators
────────────────────────────────────
1. Socratic methodology depth & "No Yes-Men" DNA — Verdict Gate ([NO-GO/RESHAPE/GO]), Zero Blueprint on No-Go, and zero functional sycophancy
2. 3-tier progressive memory — context loaded in tiers, not all-at-once or not-at-all

ENTRY POINTS & WORKFLOWS
────────────────────────
Entry points:   /unpack-problem      (problem-first exploration before solution ideation)
                /validate-idea       (stress-test raw product concepts with GO/RESHAPE/NO-GO)
                /shape-up            (structure semi-cooked ideas into design-ready briefs)
                /validate-game-idea  (stress-test game concepts before production)

Product flow:   Entry Point → /explore-idea → /shape-up → /design (/motion) → /plan → /develop → /launch → /iterate → /retro
Games flow:     /validate-game-idea → /explore-game-idea → /design → /plan → /develop → /launch → /iterate → /retro

Navigation:    /help-me [query]      (conversational navigator for project state)
Stress-test:   /grill-me             (Socratic alignment / Q&A pressure test)
Elicit/refine: /elicitation          (Interactive output critique and improvement loop)
Status:        /status               (Quick project state snapshot)
Sprint state:  /sprint-status        (Pipeline state CLI Kanban table)

PRIMARY AGENTS (by phase)
──────────────────────────────────────────────────
Validation &    @founder              Socratic stress-test (idea or game concept)
Entry           @product-manager      Problem space exploration (@user-researcher)

Exploration &   @founder              Synthesize → decide → commit
Research        @researcher           Validate market & competition
                @user-researcher      Validate user needs & personas

Design          @product-manager      PRD + User Stories
                @product-designer     Flows + UI specs + design tokens + motion specs
                @architect            System architecture + ADRs

Development     @tech-lead            Task breakdown + execution plan
                @developer            Write code + tests
                @code-reviewer        Quality gate (read-only)
                @qa-engineer          Validate against acceptance criteria

Infrastructure  @devops-engineer      CI/CD + infra + deployment
                @performance-engineer Profiling + load testing
                @security-engineer    OWASP + CVE audit

Optional        @ml-ai-engineer       AI & ML models, RAG, prompt engineering, evals
                @ml-ai-ops            Production AI serving, vector indexes, drift ops
                @ux-researcher        Usability validation
                @data-analyst         Metrics + instrumentation
                @shifu                Educational content + learning paths
                @technical-writer     API docs + guides

──────────────────────────────────────────────────

AGENT PERSONAS (20 roles) — invoke by @mention
──────────────────────────────────────────────────
@architect          Full access  — System design, ADRs, tech stack
@code-reviewer      Read-only    — Code quality gate (no edits)
@data-analyst       Full access  — Measurement + analytics
@developer          Full access  — Production code & tests
@devops-engineer    Full access  — Infrastructure, CI/CD
@founder            Read-only    — Strategic ideation & stress testing
@ml-ai-engineer     Full access  — AI & ML models, RAG, prompts, evals
@ml-ai-ops          Full access  — Production AI serving, drift ops, rollback
@product-designer   Full access  — UX/UI specs, design tokens
@product-manager    Full access  — PRD, user stories
@qa-engineer        Full access  — Testing, validation
@researcher         Read-only    — Market research, competitive analysis
@security-engineer  Read-only    — Security audit (no edits)
@shifu              Full access  — Learning paths, educational content
@tech-lead          Full access  — Planning, task breakdown
@technical-writer   Full access  — Documentation & guides
@user-researcher    Read-only    — User research, personas
@performance-eng.   Read-only    — Performance profiling
@ux-researcher      Read-only    — Usability evaluation
@memory-controller  Specialized  — 3-tier memory persistence & loading
───────────────────────────────────────────────────

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

CORE SKILL CATALOG
──────────────────────────────────────────────────
Entry Points:
  /unpack-problem      Problem-first exploration before solution ideation
  /validate-idea       Stress-test product concepts before research (GO/RESHAPE/NO-GO)
  /shape-up            Structure semi-cooked ideas into design-ready briefs (zero prereqs)
  /validate-game-idea  Stress-test game concepts before production

Lifecycle Workflows:
  /explore-idea        Market, competitor, and user research
  /explore-game-idea   Genre market and player research
  /design              PRD, user stories, product specs
  /motion              Motion research, motion spec, handoff to /develop
  /plan                Standalone task breakdown & worktree execution planning
  /develop             Core MVP cycle (architecture, implementation, QA)
  /review              Standalone read-only code review and security audit
  /test                Test execution, failure analysis, and QA reporting
  /launch              Release readiness, deployment, monitoring
  /iterate             Post-launch feature improvements from telemetry/data
  /retro               Post-cycle review & memory compaction
  /incident            Production incident triage and resolution

Discovery & Ideation:
  /brainstorming       60-method ideation catalog (SCAMPER, Six Hats, etc.)
  /validation-patterns 30-method validation catalog (smoke tests, concierge MVPs)
  /jtbd                Jobs-to-be-Done statements + How Might We questions
  /empathy-map         User empathy quadrant canvas (Says/Thinks/Does/Feels)
  /journey-map         User touchpoint & emotional state journey mapping
  /discovery-report    Unified research & usability report with dynamic scoring
  /research-plan       Research goals, methodology & 2-part interview guide
  /root-cause          Socratic 5-Whys and Fishbone root cause analysis

Socratic & Intelligence:
  /grill-me            Relentless eight-move Socratic stress-test (any domain)
  /elicitation         98 structured methods to critique & refine LLM output
  /round-table         Multi-agent roundtable discussions
  /humanize            AI-writing tell detector & style normalizer
  /analyze-data        EDA, dataset provision & PM metric co-piloting

Operations & Customization:
  /help-me             Conversational next-step navigator and co-pilot
  /status              Quick project state snapshot
  /sprint-status       Pipeline state interactive CLI Kanban table
  /phase               Show/switch active phase & list phase artifacts
  /kanban              Interactive Kanban board display & updates
  /memory              Search archived project context & compacted memory
  /teach-me            Personal learning partner (Quick, Explain, Deep Dive)
  /craft-lesson        Multi-format educational content generator
  /create-skill        Author new skills, modify workflows, create evals
  /customize-skill     Surgically customize existing skills (triggering, workflow, references)
  /create-agent        Author and register new agent personas
  /customize-agent     Guided TOML authoring for agent settings, permissions, and models

──────────────────────────────────────────────────

SHARED MEMORY (artifacts/memory/)
──────────────────────────────────────────────────
project-context.md           Static/Machine: project basics, tech stack, runtime fence
active-decisions.md          Dynamic: current decisions, rationale
patterns-and-conventions.md  Dynamic: discovered patterns
lessons-learned.md           Dynamic: insights from each phase
blockers-and-risks.md        Dynamic: active blockers
teaching-style.md            Dynamic: teaching preferences (for @shifu)
session-summaries/latest.md  Live authoritative cursor & last session summary (~100 tokens)
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

Hybrid scoring: keyword pre-filter (Stage 1) + semantic refinement (Stage 2)
Synonym expansion: auth≈login, db≈database, deploy≈release, etc.
Session continuity: ~100 tokens for last-session context
Auto-compaction: triggers when files exceed word thresholds
Archive: resolved/stale entries moved to archive/YYYY-QN/ with index
Deduplication: write validation rejects near-identical entries

──────────────────────────────────────────────────

CLI & INTEGRITY TOOLING
──────────────────────────────────────────────────
Install / Wizard:   npx vespyr [--yes] [--target <dir>] [--harness <list>]
Verify Manifest:    npx vespyr verify
Audit Supply-Chain: npx vespyr audit
Update Manifest:    npx vespyr manifest
Sync Documentation: node bin/cli.js --sync-docs

──────────────────────────────────────────────────

KEY FILES
──────────────────────────────────────────────────
Workflow              .agents/workflow.md
Workflows & Skills    .agents/skills.md
Troubleshooting       .agents/TROUBLESHOOTING.md
Agent library         .agents/agents/
Agent templates       .agents/templates/

──────────────────────────────────────────────────
```

---

**Usage:** Keep this in your project root as `QUICK-REFERENCE.md` or paste into your team wiki. It summarizes the entire agent system in one view.

*Full documentation: [workflow.md](.agents/workflow.md) · [skills.md](.agents/skills.md) · [troubleshooting](.agents/TROUBLESHOOTING.md)*