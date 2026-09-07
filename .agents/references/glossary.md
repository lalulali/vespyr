# Vespyr Glossary — Locked Terminology

**Rule:** One definition per term. No synonyms. No aliases. If you mean "user story," write "user story" — not "ticket," "issue," "feature," "spec," "story," or "requirement."

## Pipeline terms
- **Phase** — A numbered stage in the development pipeline (Phase -1 through Phase 9). See `phase-table.md`.
- **Step** — A sub-stage within a skill. Loaded sequentially in step-file architecture.
- **Skill** — A multi-step workflow defined in `.agents/skills/<name>/SKILL.md`.
- **Sub-agent** — A single-purpose persona (e.g., @memory-controller) invoked for a narrow task.

## Agent terms
- **Reasoning agent** — A persona that thinks and decides. Frontmatter is the authority on permissions: some agents are denied `edit` and must delegate writes, while `@developer`, `@tech-lead`, `@qa-engineer` keep full I/O as the recommended pattern. `bash` access is broadly allowed — never claim a denial without grepping frontmatter first. See `skills.md` §Subagent Permissions.
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

## Verdict terms
- **Decision Gate** — The verdict on an idea, proposal, design, or stack selection. Answers *what survived the audit*. Two axes: the verdict token and the `When:` axis. Never applied to a claim about existing state.
- **Review Gate** — The verdict on a claim about existing state (implementation report, record, checkbox, sign-off). Answers *does the evidence reproduce the claim*. Tokens: `[CONFIRMED]` / `[PARTIAL]` / `[FALSIFIED]`. Never applied to an idea.
- **`[GO]`** — Everything survived: build this proposal as written, with the named evidence. Plain: "build it as written." Requires a `When:` axis. Not "pass", not "approve", not "looks good".
- **`[RESHAPE]`** — Only the need survived: keep the why, replace the how. Plain: "keep the problem, change the plan." The mechanism is discarded; the user problem is retained. Not "pivot", not "iterate", not "refine".
- **`[NO-GO]`** — Nothing survived: this is not something to be done. Plain: "do not do this." No compromise blueprint, no slimmed variant. Not "kill", not "reject", not "defer".
- **`When:` axis** — When a verdict acts: `NOW`, `GATED` (a named, checkable condition with an owner and a number), `NEXT-CYCLE`, or `NEVER`. A `[GO]` without a `When:` axis is an illegal verdict.
- **Verdict Card** — The five-line block every gate emits: `VERDICT`, `Audited`, `Survived`, `Because`, `Next`. Each card must be readable without seeing the others.
- **No-Go Autopsy** — The empirical proof recorded when a premise is ruled `[NO-GO]`. No compromise blueprint or slimmed variant may accompany it. A `Surviving follow-ups` list (owned open questions and blockers, no gate tokens) may and should accompany it — killing a proposal must not delete work that outlives it. Home: the `Open before SATISFIED` list or the owning artifact.
- **One object, one verdict** — A Verdict Card rules on exactly one proposal as stated. Never emit `[GO]` + `[RESHAPE]` + `[NO-GO]` side-by-side on the same object. Fold conditions and scoped exceptions into a single token plus `When:GATED`. Questions and blockers that outlive the verdict survive as owned items with no token — they are follow-ups, not competing verdicts.
- **Satisfaction states (owner: `utter-satisfaction.md`)** — Per-agent handoff states, not idea verdicts. `SATISFIED` (plain: "my area is good, evidence filed"), `CHANGES REQUESTED` (plain: "fix this gap, then I re-check"), `BLOCKED` (plain: "I cannot sign off — named reason stops the handoff"), `NOT ACTIVATED` (plain: "out of my scope, reason filed — not approval"). Only these four stop or clear a handoff.
- **`CONDITIONAL GO`** — Not a Decision Gate token. A launch-team verdict meaning `[GO] When:GATED`: ship only after the named conditions resolve and affected agents re-confirm `SATISFIED`. Never shippable as written.
- **Bare forms (`GO` / `NO-GO` / `RESHAPE` in prose and tables)** — Shorthand for the gate family. Bracketed form is required in Verdict Cards and launch decisions; `When:` is required on `[GO]` only (`[RESHAPE]` implies `NOW`, `[NO-GO]` implies `NEVER` — never restate it).
- **Progress words are not verdicts** — `complete`, `done`, `approved`, `verified`, `executed` describe work progress. Only gate tokens (`[GO]`/`[RESHAPE]`/`[NO-GO]`, `[CONFIRMED]`/`[PARTIAL]`/`[FALSIFIED]`, `SATISFIED`/`BLOCKED`) decide handoffs and releases.
- **Lowercase `blocking` vs uppercase `BLOCKED`** — Lowercase "blocking issue/concern" is a descriptive adjective. Only the recorded `BLOCKED` state stops a handoff.
- **Verdict voice (DNA 7 §5)** — Plain human words on a blunt spine: the token once, no emoji, no ceremony, no form-speak. Name the concrete cost (whose time, how much rework), ask the smallest unblocking question, stance in first person. Demystify inline per DNA 7 §3.
- **When NOT to emit a verdict** — Clarifying questions, status updates, `Open before SATISFIED` lists, and satisfaction-state rows never take gate tokens. If the output is a question, write the question with no token. No gate object, no token.
- **Legacy vocabulary** — `PASS`/`PIVOT`/`KILL` and `ZERO-BLUEPRINT-ON-KILL`. Superseded 2026-09-02. Still resolved by tooling, still present in dated records, **never** used in new output. See `references/vespyr-dna.md`.

## Process terms
- **Operating mode** — `autonomous`, `semi-autonomous` (default), or `manual`. Controls pause points.
- **Open before SATISFIED** — The cross-agent list of items preventing the UTTERLY SATISFIED gate (missing promotion, evidence, or re-review). Distinct from per-agent `BLOCKED` state (one agent's verdict). Banned phrasing (any capitalization): never write "blocking SATISFIED" / "blocking satisfied" — write per-agent `BLOCKED: <reason>` or cross-agent `Open before SATISFIED: <list>`. Rule-definition lines quoting the banned form are exempt.
- **Owner-gated** — A `BLOCKED` item resolvable only by human action (permission lock, fork with no technical winner, human-gated baseline). Filed with an owner card per `utter-satisfaction.md`; max 6 items per card.
- **Halt condition** — An explicit condition under which a skill stops and surfaces the issue.
- **Escalation ladder** — The named-decision-authority chain for resolving agent disputes.
- **Memory write-back** — The contract by which an agent commits patterns to shared memory.
- **Preflight check** — A check that runs before high-risk tasks to verify required context is loaded.
- **Citation Protocol** — The contract by which reasoning agents cite real sources inline with footnotes. See `references/citation-format.md`. Execution spec for DNA 5.
- **Footnote** — A markdown footnote (`[^N]:`) at the end of an artifact, providing source details for an inline citation `[N]`. The only permitted citation format.
- **Citation** — An inline `[N]` marker linking to a footnote. Required for every factual claim from a real source.
- **DNA 5: No Source, No Fact** — The Vespyr Core DNA that makes verifiable facts mandatory: every factual claim from a real source MUST carry an inline citation + footnote so a human can verify it. See `references/vespyr-dna.md#dna-5`.
