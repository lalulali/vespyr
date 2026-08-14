# Vespyr Glossary — Locked Terminology

**Rule:** One definition per term. No synonyms. No aliases. If you mean "user story," write "user story" — not "ticket," "issue," "feature," "spec," "story," or "requirement."

## Pipeline terms
- **Phase** — A numbered stage in the development pipeline (Phase -1 through Phase 9). See `phase-table.md`.
- **Step** — A sub-stage within a skill. Loaded sequentially in step-file architecture.
- **Skill** — A multi-step workflow defined in `.agents/skills/<name>/SKILL.md`.
- **Sub-agent** — A single-purpose persona (e.g., @memory-controller) invoked for a narrow task.

## Agent terms
- **Reasoning agent** — A persona that thinks and decides. Some reasoning agents (e.g. @founder, @architect, @product-manager) are denied `bash`/`edit` permissions in frontmatter and must delegate I/O; others (e.g. @developer, @tech-lead, @qa-engineer) keep full I/O access and delegate as a recommended pattern. See `skills.md` §Subagent Permissions.
- **Memory sub-agent** — A specialized sub-agent (@memory-controller) that handles state persistence, memory reads/writes, progressive context loading, and archival.
- **Channeled mentor** — A real-world expert whose principles inform the agent's persona. See agent frontmatter.
- **Persona** — The full character definition of an agent, including role, principles, voice, and decision tree.

## Artifact terms
- **PRD** — Product Requirements Document. The output of `/design` after PRD sign-off.
- **ADR** — Architecture Decision Record. The output of `@architect` for any non-trivial decision.
- **User story** — A small, testable feature description with ACs. Output of `@product-manager` during `/design`.
- **Acceptance criterion (AC)** — A testable condition that defines "done" for a user story.
- **Change request (CR)** — A formal request to revise an upstream artifact. Filed in `artifacts/output/05-planning/change-requests.md`.
- **Decision log** — A running record of resolved decisions, written to `artifacts/memory/active-decisions.md`.

## Process terms
- **Operating mode** — `autonomous`, `semi-autonomous` (default), or `manual`. Controls pause points.
- **Halt condition** — An explicit condition under which a skill stops and surfaces the issue.
- **Escalation ladder** — The named-decision-authority chain for resolving agent disputes.
- **Memory write-back** — The contract by which an agent commits patterns to shared memory.
- **Preflight check** — A check that runs before high-risk tasks to verify required context is loaded.
- **Citation Protocol** — The contract by which reasoning agents cite real sources inline with footnotes. See `references/citation-format.md`.
- **Footnote** — A markdown footnote (`[^N]:`) at the end of an artifact, providing source details for an inline citation `[N]`. The only permitted citation format.
- **Citation** — An inline `[N]` marker linking to a footnote. Required for every factual claim from a real source.
