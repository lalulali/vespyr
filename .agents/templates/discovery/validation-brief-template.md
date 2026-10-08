# Validation Brief: {one-sentence summary}

> **Produced by:** `validate-idea` (`@founder`)
> **Feeds into:** `explore-idea`
> **Save to:** `artifacts/output/01-discovery/validation-brief.md`

---

## Context

- **Mode:** {startup | company | personal}
- **Maturity:** {greenfield | brownfield}
- **Q1 source (if brownfield):** {usage data | support tickets | workaround traffic | sales objections | none instrumented}

---

## Value proposition

> "For [specific user], [product] replaces [status quo workaround] by [narrowest wedge], which matters because [future-fit thesis]."

{The refined value statement from `step-05a` — this is the anchor for all downstream agents. Do not use the original rough hypothesis here.}

---

## Demand evidence

{Specific behaviors, quotes, payments — or "not yet validated". Be precise: someone who'd be upset if this disappeared tomorrow, not someone who said "sounds interesting."}

---

## Status quo

{What people do today to solve this, even badly. Include time cost, dollar cost, or tools duct-taped together.}

---

## Target user

{Name, role, company, consequence — as specific as possible. "Marketing teams" is a filter, not a person.}

---

## Narrowest wedge

{The smallest version someone would use this week — not after the full platform is built. One workflow. One feature. Something shippable in days.}

---

## Observation

{What surprised you about user behavior during any direct observation — or "no direct observation yet". Something that contradicted your assumptions is the strongest signal.}

---

## Future-fit thesis

{Why this problem becomes more urgent in 3 years. A specific thesis about how the world changes — not "the market is growing."}

---

## Scope & team reality check

> *Optional — answer if relevant to avoid over-scoping early.*

- **Assumed team size:** {solo / small team / org}
- **Assumed timeline to narrowest wedge:** {days / weeks / months}
- **Budget or resource constraints:** {any known limits}
- **Does the scope match the team?** {yes / no — if no, note the gap}

---

## Diagnostic coverage (Q1–Q7)

Every question ends in exactly one terminal state — `COVERED` / `DEFERRED` / `REJECTED` /
`OUT-OF-SCOPE` (`.agents/references/point-coverage.md`). **No blanks.** A question that was
skipped or only partly answered is `DEFERRED` or `PARTIAL`, never `COVERED`, and it blocks `[GO]`.

| Q | Dimension | State | Answer / owner + reason |
|---|-----------|-------|-------------------------|
| Q1 | Demand evidence | {COVERED / DEFERRED / REJECTED / OUT-OF-SCOPE} | ... |
| Q2 | Status quo | ... | ... |
| Q3 | Specificity | ... | ... |
| Q4 | Narrowest wedge | ... | ... |
| Q5 | Observation | ... | ... |
| Q6 | Future-fit | ... | ... |
| Q7 | Scope & team | ... | ... |

---

## Premises

{3-5 statements that must be true for this to work, agreed during `step-05a`. Note any where the user disagreed — an unresolved premise blocks `[GO]`.}

1. [statement] — {agreed | disagreed: reason}
2. [statement] — {agreed | disagreed: reason}
3. [statement] — {agreed | disagreed: reason}

---

## Framework scores

Mandatory pair: Golden Circle + Pre-mortem (`.agents/references/founder-frameworks.md`). Add up
to 2 more only where the idea's actual risk calls for it.

| Framework | Score | Red flag fired / note |
|-----------|-------|-----------------------|
| Golden Circle (mandatory) | {🟢 / 🟡 / 🔴} | ... |
| Pre-mortem (mandatory) | {🟢 / 🟡 / 🔴} | ... |
| {optional framework} | {🟢 / 🟡 / 🔴} | ... |

Any 🔴 blocks `[GO]`.

---

## Alternatives considered

> **Omit this entire section on `[NO-GO]`.** An option menu under a `[NO-GO]` is a
> ZERO-BLUEPRINT-ON-NO-GO breach. Allowed for `[GO]` and `[RESHAPE]` only.

| Approach | Effort | Ships in | Risk | Why considered | Why rejected / chosen |
|----------|--------|----------|------|----------------|-----------------------|
| A: {name} | S/M/L/XL | {timeframe} | Low/Med/High | ... | ... |
| B: {name} | S/M/L/XL | {timeframe} | Low/Med/High | ... | ... |
| C: {name} (optional) | S/M/L/XL | {timeframe} | Low/Med/High | ... | ... |

**Chosen direction:** {which approach and why}

---

## Verdict

**Plain sentence first, then the card.** The token is the machine companion, never the message —
`[RESHAPE]` is internal vocabulary the reader cannot act on. Depth scales with the stakes
(`.agents/references/vespyr-dna.md` §Card depth scales with stakes): personal/hobby → plain
sentence + `VERDICT:` only; shipping to users → add `Survived:` + `Next`; irreversible/org-wide/
spend → full 5-field card.

**Verdict:** {one plain sentence — build this / keep the why, replace the how / don't build this — plus the specific reason}

```
VERDICT: [GO|RESHAPE|NO-GO] — When: <NOW|GATED|NEXT-CYCLE>   ← When: on [GO] only
Audited : <the single thing being judged, one sentence>
Survived: everything | the need, not the mechanism | nothing
Because : <number / benchmark / command / file — never an adjective>
Next    : <one concrete action, owner, and date>
```

Unbracketed prose is a contract violation — the repo's verdict parser only recognizes bracketed
tokens, so an unbracketed verdict is invisible to telemetry and to the ZERO-BLUEPRINT-ON-NO-GO
invariant. `[GO]` must carry `When:`; `[RESHAPE]` and `[NO-GO]` imply `NOW` and `NEVER` and never
restate it.

**`[GO]` gate — all four, no partial credit:**

- [ ] Demand evidence is behavioral (payment, expansion, panic-on-removal), not interest
- [ ] Status-quo cost is quantified (hours or dollars per week)
- [ ] Narrowest wedge ships in days, not months
- [ ] No unresolved contradiction or premise disagreement

### No-Go Autopsy — `[NO-GO]` only

Required on `[NO-GO]`, and the *only* legal body for it. No alternatives, no architecture,
no compromise workarounds.

| Field | Value |
|-------|-------|
| Survived | nothing |
| Wrong one | {wrong problem \| wrong solution \| wrong timing \| wrong customer \| wrong business model \| execution risk \| the need does not exist} |
| Failure scenario | {12 months out — what concretely killed it} |
| Empirical proof | {the named observation that forced this verdict, with its source `[^N]`} |
| Accepted risk | n/a — nothing was accepted; the premise failed |

**Surviving follow-ups** (optional): open questions and blockers worth answering later. No verdict
tokens, no implementation path.

---

## Socratic validation

> Appended by validate mode (`step-05c`). Omit in create mode.

| Branch | Score | Finding |
|--------|-------|---------|
| 1. Product requirements | {🟢 / 🟡 / 🔴} | ... |
| 2. Architecture trade-offs | {🟢 / 🟡 / 🔴} | ... |
| 3. Edge cases | {🟢 / 🟡 / 🔴} | ... |
| 4. Codebase logic | {🟢 / 🟡 / 🔴} | ... |
| 5. Cost & timeline | {🟢 / 🟡 / 🔴} | ... |
| 6. Risks | {🟢 / 🟡 / 🔴} | ... |
| 7. Success criteria | {🟢 / 🟡 / 🔴} | ... |

**Cross-branch contradictions:** {each one found + how it was resolved, or "none"}

**Verdict disposition:** {affirmed the original verdict — no new evidence contradicted it | revised — branch evidence: ...}

---

## Next action

{One concrete real-world step — not "go research this." Example: "Interview 5 ops managers at mid-size logistics companies about their current scheduling workflow before any market sizing."}

---

## Open questions for exploration

{What the research pipeline must answer. Each question should be specific enough that a researcher knows when they've answered it. These feed directly into `explore-idea`.}

| Question | Why it matters | Researcher |
|----------|---------------|------------|
| ... | ... | @researcher / @user-researcher |

---

**Document info:**
- Author: @founder
- Date: {date}
- Status: {Draft | GO for exploration | RESHAPE pending | NO-GO}
