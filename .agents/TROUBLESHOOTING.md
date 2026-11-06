# Troubleshooting

Common issues and how to resolve them when running the agent system.

---

## The idea is too vague to research

**Problem:** You're asked to research a market or validate a concept, but the idea is fuzzy and undefined.

**Fix:** Invoke `@founder` first. Don't ask "is there a market for X?" when X isn't defined. The founder synthesizes raw ideas into a concrete concept with testable assumptions. Only after the idea brief exists should research begin.

**Prevention:** Always check that `artifacts/output/01-discovery/idea-brief.md` exists and contains a one-sentence Idea Summary before starting Phase 1 research.

---

## Market researcher returns generic data

**Problem:** The market analysis is full of vague TAM numbers with no source, or it reads like a Wikipedia article about the industry.

**Fix:** Check that `artifacts/output/01-discovery/idea-brief.md` was passed as input. The market researcher needs the founder's specific target user and assumptions to deliver focused research. If the idea brief is missing, go back to `@founder`.

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
2. Tech Lead / Product Manager arbitration (48h)
3. Founder decision (final)

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

## `vespyr verify` reports modified or tampered files

**Problem:** Running `npx vespyr verify` fails with checksum mismatches on files in `.agents/`.

**Fix:**
- If you made intentional customizations or added new skills/agents, regenerate the manifest:
  ```bash
  npx vespyr manifest
  ```
- If you did not make changes, re-sync entry points or re-install from clean source:
  ```bash
  node bin/cli.js --sync-docs
  ```

**Prevention:** Do not modify `.agents/agents/*.md` directly for configuration; use `.agents/custom/<agent>.toml` overrides and the `/customize-agent` workflow. Note: per `custom/README.md` known gap, no runtime component loads `*.toml` yet — overrides are declarations awaiting consumption, not live behavior.

---

## Content quarantined by memory admission control

**Problem:** A memory entry was automatically quarantined and excluded from Tier 3 loading, and an alert was logged in `artifacts/memory/quarantine/quarantine-log.json`.

**Fix:** Inspect `quarantine-log.json` to review the quarantined payload and matched rule pattern (e.g., prompt injection phrases like `ignore previous instructions`, fake role delimiters, or fake `<invoke>` calls). If the entry was a false positive from code documentation, sanitize or rephrase the entry in `active-decisions.md` or `lessons-learned.md`.

**Prevention:** Never include raw unsanitized prompt injection attack strings directly in persistent memory files without wrapping them in explanatory code blocks or using quarantine-exempt test corpus locations (`evals/security/corpus/`).

---

## Agents outputting ASCII tables instead of Markdown tables

**Problem:** An agent outputs tabular data using monospace ASCII text box grids (`+---+---+`) instead of clean Markdown tables (`| ... |`).

**Fix:** Remind the agent of DNA 6 and the Presentation Standards in `GUARDRAILS.md`. Tabular data must be formatted as standard GitHub Flavored Markdown tables. If a diagram or flow is needed, use Mermaid syntax. ASCII is strictly reserved for UI wireframes/mockups, CLI simulations, or complex non-Mermaid visuals.

**Prevention:** All reasoning personas inherit DNA 6 from `vespyr-dna.md` and `GUARDRAILS.md` automatically.

---

## A skill fails `spec_check.js` with an error you do not recognise

**Problem:** `node .agents/scripts/spec_check.js` reports a violation on a skill you just wrote or edited. The document has never had a skill-authoring section, so the newer checks are explained nowhere.

**Fix:** match the message to the cause.

| Message | Cause | Fix |
|---|---|---|
| `body names the harness tool "X"` | The instruction names a product's tool — `AskUserQuestion`, `present_files`, `TodoWrite`. That name resolves on one harness and points at nothing on another, where the same capability is called something else | Name the **capability**: "ask the user", "run the command". Frontmatter (`allowed-tools`) may carry the name — it is a declaration; the body must not depend on it. Rules: `.agents/skills/create-skill/references/harness-neutrality.md` |
| `command requires the product binary "claude -p"` | A command block starts with a product's CLI, so it runs nowhere else | Say what the call is **for** and let the harness supply it |
| `the body requires asking the user but \`allowed-tools\` … declares no question tool` | The skill instructs the agent to ask while declaring a toolset that forbids it. In the one harness that enforces the field, the rule is unenforceable | Add the question tool to `allowed-tools`, or drop the declaration entirely — most skills declare neither and work |
| `phantom step link — steps/X.md is cited but not on disk` | A citation names a filename that does not exist | Fix the citation to the real file. A phantom link makes the agent load nothing and report a false pass |
| `unreachable step file steps/X.md` | A file in `steps/` that no citation path reaches | Cite it from the router, or delete it. A contract nothing loads reads as coverage that does not exist |
| `non-standard top-level key "version"` | Only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` are allowed | Move it under `metadata:` |
| `phantom resource reference "references/x.md"` | A cited path does not exist — **including one written as an illustration**. The checker cannot tell an example from a citation | Write the example as a description ("an AWS file, a GCP file"), not as a path |
| `metadata.last_updated missing` | The metadata block needs it | Add `last_updated: "YYYY-MM-DD"` |

**Prevention:** run `spec_check.js` after every skill edit, not at the end — it takes a second and the messages name the file and line. `create-skill` Step 5 and `customize-skill` Step 5 both require 0 violations and 0 warnings.

---

## The maintenance lane rejects the state root

**Problem:** `maintenance_session.js` or `maintenance_state.js` exits with a `maintenance_session: --state-root ...` or `maintenance_state: External state root ...` message and the run never starts. The lane fails closed on the state root rather than falling back to product state.

**Fix:** The external state root must satisfy every rule below, and every command must pass it explicitly — the helper reads no environment variable (`VESPYR_MAINTENANCE_STATE_ROOT` is not consulted, and there is no environment fallback: a missing `--state-root` fails closed) and generates no run ID for you:
- an **absolute canonical path** that resolves to an existing **directory**;
- **not a symlink**, and `realpath` must equal the path you passed (on macOS, `/tmp/...` resolves to `/private/tmp/...` and is rejected);
- **owned by the current user**, with owner read/write/search set, and **not group- or world-writable**;
- **disjoint from the repository root** — neither directory may contain the other;
- the **same** `--state-root` on every `maintenance_session.js` and `maintenance_state.js` call of the run, with `--repo-root` resolving to this repository.

To recover, create a fresh directory outside the checkout, lock it down, and re-run with the corrected path:

```bash
mkdir -p "$TMPDIR/vespyr-maintenance-state" && chmod 700 "$TMPDIR/vespyr-maintenance-state"
node .agents/scripts/maintenance_session.js --scope maintenance --agent <agent> \
  --repo-root "$(pwd)" --state-root "$TMPDIR/vespyr-maintenance-state" \
  --run-id <run-id> --session-id <new-session-id>
```

Two adjacent failures have their own remedy. `Session ID already exists; refusing to reuse its directory` means a session directory is never reused — pass a **new** `--session-id`. `External state root must be disjoint from repository root` means the root sits inside the checkout; move it out, because that separation is what keeps maintenance state out of the product tree.

**Prevention:** Treat the state root as part of the run's identity — set it once, pass it explicitly on every command (no environment variable is read), and never point it inside the repository. If `maintenance_state.js status` reports `eventCount: 0` for a run you know has events, the `--run-id` does not match the run in that state root: a missing run directory is reported as an empty run, not as an error. Check `<state-root>/runs/<run-id>/` before concluding that the run has no history.

---

*Canonical source files:*
- *Workflow orchestration:* `workflow.md`
- *Guardrails:* `GUARDRAILS.md`
- *Skills orchestration:* `skills.md`
- *This troubleshooting guide supplements them with practical resolution steps.*