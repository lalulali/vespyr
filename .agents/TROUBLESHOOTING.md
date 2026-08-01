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

**Fix:** The system now enforces a **maximum 2 feedback cycles** on the same issue between any two agents (see `GUARDRAILS.md` §Feedback Loop Limits). After 2 cycles, the issue automatically escalates to the next level in the escalation ladder (`workflow.md` §3.2). The mediator must choose within 24h: fix it, defer it as documented tech debt, or descope it.

**Prevention:** This is now a system-level rule. All agents should track cycle count when feeding back on the same issue.

---

## Context window overflows / agent misses important details

**Problem:** An agent produces low-quality output because it didn't read all the upstream artifacts, or it hallucinated details from an artifact it only partially read.

**Fix:** The system now defines a **context budget protocol** (see `GUARDRAILS.md` §Context Budget and `workflow.md` §9). Agents prioritize reading in three tiers: (1) current task + agent notes + primary upstream artifact in full, (2) other upstream summaries + memory, (3) templates and historical files only when needed.

**Prevention:** When writing artifacts, always include an **executive summary** at the top so downstream agents can triage before deep-reading. Keep artifacts under 3,000 words when possible.

---

## Memory files are too large / agents reading stale decisions

**Problem:** `active-decisions.md` or `lessons-learned.md` has grown to 5,000+ words with many resolved/historical items that waste context and confuse agents.

**Fix:** Run `@memory-controller compact [filename]` explicitly, or it triggers automatically when a write pushes a file past its threshold. Compaction moves `resolved` and `stale` entries to `artifacts/memory/archive/YYYY-QN/` and updates the searchable index at `artifacts/memory/archive/index.ndjson`.

**Prevention:** The retrospective skill (Step 5) calls `@memory-controller compact` on all files as a mandatory step. Track when the last compaction occurred in `artifacts/memory/session-summaries/latest.md`.

---

## What is `artifacts/memory/archive/`?

**Context:** After compaction runs for the first time, you'll see an `archive/` folder appear inside `artifacts/memory/`. This is created automatically by `@memory-controller` — you don't need to create it manually.

**Structure:**
```
artifacts/memory/archive/
├── index.ndjson        # Searchable index of all archived entries (auto-created)
└── YYYY-QN/            # Quarterly folders, e.g. 2026-Q2/
    ├── active-decisions.md
    ├── blockers-and-risks.md
    └── lessons-learned.md
```

**`index.ndjson`** is created automatically the first time compaction runs. It contains metadata (title, keywords, date, summary, file location) for every archived entry so agents can search without loading full archive files.

**Nothing is ever deleted.** Archived entries are always retrievable via `@memory-controller search [query]`.

**The full archive protocol** is documented in `.agents/agents/memory-controller.md`.

---

## Agent can't find historical context after compaction

**Problem:** An agent asks about a past decision (e.g., "why did we choose PostgreSQL?") but the entry was compacted out of `active-decisions.md`.

**Fix:** Use the archive search:
```
@memory-controller search why did we choose PostgreSQL
```
The controller uses hybrid scoring (keyword + semantic) and returns the top matches with summaries and file locations. It understands synonyms — "database choice" and "storage decision" will also find the PostgreSQL entry.

**Prevention:** Entries tagged `[CRITICAL]` are never archived. Tag decisions that are likely to be referenced long-term with `[CRITICAL]` when writing them.

---

## Tier 3 is loading irrelevant chunks

**Problem:** The memory controller is including chunks that don't seem related to the current task.

**Fix:** Re-run `@memory-controller load [agent-type]` with a more specific task description. Tier 3 chunks are selected by Stage 1 keyword matching followed by Stage 2 semantic scoring against your task description — vague descriptions (e.g. "work on auth") pull in broad, unrelated chunks. If the chunk came from a compacted entry, use `@memory-controller search [query]` to retrieve it from the archive instead.

**Prevention:** Write more specific task descriptions when calling `@memory-controller load`. "implement OAuth2 login with Google" gives much better Tier 3 results than "work on auth".

---

## Tier 3 is missing relevant chunks

**Problem:** The memory controller isn't loading a chunk you know is relevant.

**Fix:** Check if the chunk uses different vocabulary than your task description. The hybrid scorer handles common synonyms (auth≈login, deploy≈release, etc.) but domain-specific terms may not be covered. Try:
```
@memory-controller load developer "implement OAuth2 authentication token refresh"
```
Adding more specific terms improves Stage 1 keyword matching.

If the chunk is in the archive (was compacted), use search instead:
```
@memory-controller search OAuth2 token refresh
```

**Prevention:** Use domain tags consistently when writing entries (`[AUTH]`, `[CODE]`, etc.) — the domain tag match gives +2 points in Stage 1 scoring.

---

*Canonical source files:*
- *Workflow orchestration:* `workflow.md`
- *Guardrails:* `GUARDRAILS.md`
- *Skills orchestration:* `skills.md`
- *This troubleshooting guide supplements them with practical resolution steps.*