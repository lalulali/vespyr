# Troubleshooting

Common issues and how to resolve them when running the agent system.

---

## The idea is too vague to research

**Problem:** You're asked to research a market or validate a concept, but the idea is fuzzy and undefined.

**Fix:** Invoke `@founder` first. Don't ask "is there a market for X?" when X isn't defined. The founder synthesizes raw ideas into a concrete concept with testable assumptions. Only after the idea brief exists should research begin.

**Prevention:** Always check that `artifacts/output/00-discovery/idea-brief.md` exists and contains a one-sentence Idea Summary before starting Phase 1 research.

---

## Market researcher returns generic data

**Problem:** The market analysis is full of vague TAM numbers with no source, or it reads like a Wikipedia article about the industry.

**Fix:** Check that `artifacts/output/00-discovery/idea-brief.md` was passed as input. The market researcher needs the founder's specific target user and assumptions to deliver focused research. If the idea brief is missing, go back to `@founder`.

**Prevention:** The workflow handoff contract requires the idea brief before market research begins. Verify this in the orchestration step.

---

## Research contradicts the founder's vision

**Problem:** Market sizing shows the opportunity is tiny. User research reveals users don't actually have the pain. Competitive analysis shows a saturated market.

**Fix:** This is by design. The system surfaces bad news early. Present the evidence objectively to the founder. The founder has the final call: pivot, refine, or proceed with documented risk acceptance. Do not suppress findings.

**Escalation:** If the founder insists on proceeding despite strong contradictory evidence, document the risk acceptance in the idea brief and ensure the risk register in the execution plan reflects it.

---

## Quality gate finds too many issues

**Problem:** `@code-reviewer` finds >10 issues, `@qa-engineer` finds failing tests, or `@security-engineer` finds Critical/High vulnerabilities.

**Fix:**
- **Code review:** Send back to `@developer` with a summary of the top 3 systemic patterns. If the same mistake repeats across the codebase, it's a conventions problem — escalate to `@tech-lead` for a pattern update.
- **QA failures:** Prioritize by acceptance criteria coverage. If happy path tests fail, development isn't done. If edge cases fail, triage by user impact.
- **Security:** Critical/High findings are **blocking**. No exceptions. Medium findings need documented risk acceptance from `@product-manager`.

**Prevention:** Run linters and type-checkers before submitting for review. Write tests alongside code, not after.

---

## Specs are ambiguous

**Problem:** The developer can't implement because the product spec or user story is unclear.

**Fix:** Loop back to `@product-designer` (for UI/flow ambiguity) or `@product-manager` (for requirement ambiguity) with specific questions. Never let developers guess — ambiguity now costs 10x later.

**Prevention:** The cross-validation checklist in the PM agent should catch ambiguity before it reaches development. If the same spec is questioned multiple times, it needs rewriting, not clarification.

---

## Architecture doesn't support a requirement

**Problem:** During implementation, the developer discovers the architecture can't support what the spec requires.

**Fix:** File a concern against the relevant ADR. The architect reviews and either amends the ADR or explains the constraint. Do not silently work around architectural decisions — that creates tech debt.

**Escalation:** If the architect and developer disagree, `@tech-lead` mediates. If the issue threatens the delivery timeline, `@product-manager` decides on scope adjustment.

---

## Task estimates are too large

**Problem:** `@tech-lead` produces tasks that exceed 4 hours, making sprint planning unreliable.

**Fix:** Ask tech lead to break tasks down further. Small tasks parallelize better, reduce risk, and give clearer progress visibility. If a task is genuinely complex, split it into a spike + implementation.

**Prevention:** During execution plan creation, flag any task estimated at "Large" for potential splitting. Use the formula: if you can't describe the DoD in one sentence, the task is too big.

---

## Agent produces a finding that blocks progress

**Problem:** A downstream agent (e.g., security, UX research) flags a critical issue that wasn't anticipated, halting the pipeline.

**Fix:** This is the system working as intended. Quality gates exist to catch problems before they reach users. Address the finding, then resume.

**If the timeline impact is severe:** Escalate to `@tech-lead` for a scope/schedule trade-off decision. Present options: fix it (with revised timeline), defer it (with documented risk), or descope the feature.

---

## Conflicting outputs from two agents

**Problem:** Two agents produce contradictory findings (e.g., designer wants a feature, performance engineer says it's too slow).

**Fix:** Follow the conflict resolution ladder in `workflow.md`:
1. Direct resolution between agents (24h)
2. Tech Lead mediation (48h)
3. Product Manager arbitration (72h)
4. Founder decision (final)

**Never** let conflicting outputs pass silently. Unresolved conflicts compound downstream.

---

## Optional agent wasn't summoned but should have been

**Problem:** A feature ships without UX research, security audit, or performance testing because nobody remembered to summon the agent.

**Fix:** Add the agent retroactively. Their findings may require rework, but it's better late than never. Update the idea brief's optional agents checklist for future similar concepts.

**Prevention:** The founder must declare optional agents in §10 of the idea brief. The execution plan template includes a checklist for optional agent activation.

---

## Documentation drifts from implementation

**Problem:** The code does one thing but the docs say another.

**Fix:** `@technical-writer` updates docs when code changes. `@developer` should notify the writer of significant changes. Make documentation updates part of the Definition of Done for every task.

**Prevention:** The execution plan DoD includes "Documentation updated." Make it non-optional.

---

## Agents stuck in a feedback loop

**Problem:** Developer and architect keep bouncing the same issue back and forth. Or QA rejects, developer fixes, QA rejects again — endlessly.

**Fix:** The system now enforces a **maximum 2 feedback cycles** on the same issue between any two agents (see `workflow.md` §4.2). After 2 cycles, the issue automatically escalates to the next level in the escalation ladder (§3.2). The mediator must choose within 24h: fix it, defer it as documented tech debt, or descope it.

**Prevention:** This is now a system-level rule. All agents should track cycle count when feeding back on the same issue.

---

## Context window overflows / agent misses important details

**Problem:** An agent produces low-quality output because it didn't read all the upstream artifacts, or it hallucinated details from an artifact it only partially read.

**Fix:** The system now defines a **context budget protocol** (see `workflow.md` §11). Agents prioritize reading in three tiers: (1) current task + agent notes + primary upstream artifact in full, (2) other upstream summaries + memory, (3) templates and historical files only when needed.

**Prevention:** When writing artifacts, always include an **executive summary** at the top so downstream agents can triage before deep-reading. Keep artifacts under 3,000 words when possible.

---

## Memory files are too large / agents reading stale decisions

**Problem:** `active-decisions.md` or `lessons-learned.md` has grown to 5,000+ words with many resolved/historical items that waste context and confuse agents.

**Fix:** Run the **memory compaction protocol** (see `workflow.md` §12). This is built into the `retrospective` skill (Step 5) and should happen every 3 iteration cycles or monthly. It archives resolved items and keeps active memory under ~2,000 words.

**Prevention:** The retrospective skill now includes compaction as a mandatory step. Track when the last compaction occurred in `artifacts/memory/session-summaries/latest.md`.

---

*Canonical source files:*
- *Workflow orchestration:* `workflow.md`
- *Guardrails:* `GUARDRAILS.md`
- *Skills orchestration:* `skills.md`
- *This troubleshooting guide supplements them with practical resolution steps.*