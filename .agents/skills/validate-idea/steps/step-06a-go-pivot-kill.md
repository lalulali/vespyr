---
step: 6a
name: GO/RESHAPE/NO-GO
mode: create
prerequisites:
  - step-05 completed
output_contract:
  citations: not-required
---

# Step 6 — GO/RESHAPE/NO-GO

Deliver the verdict. This is the decision point.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-create --step 6`

## Verdict contract

**Format and depth: `.agents/references/vespyr-dna.md` §Decision Gate.** Two rules govern every
verdict this step emits:

1. **The plain sentence comes first, and it is atomic.** The token is the machine companion, never
   the message. One clause must resolve **both** axes. Never lead with a bare "Build this." and
   hedge in a later clause — the reader takes the first clause and then meets `When: GATED` and
   reads a contradiction. `When: GATED` says **"Build this once \<condition\> — not before."**
   `[RESHAPE]` says **"Keep the why, replace the how."** `[NO-GO]` says **"Don't build this."**
2. **Depth scales with stakes.** Personal or hobby idea → plain sentence + `VERDICT:` line only.
   Shipping to real users → add `Survived:` and `Next`. Irreversible, org-wide, spend, or external
   commitment → the full 5-field card. Never drop the plain sentence or the bracket to save space.
3. **The card is machine output.** Present the owner-facing result as the plain sentence plus what
   the reader needs to act on. The card follows, visually separated and labelled as the machine
   record. Never let `VERDICT: [GO] — When: GATED` be the headline — on its own it reads as a
   contradiction, which is the exact confusion the two-axis split exists to remove.

The verdict is a **bracketed** parseable line. Unbracketed prose is a contract violation — the
repo's verdict parser (`tools/eval/lib/ast.js`) only recognizes `[GO]` / `[RESHAPE]` / `[NO-GO]`,
so an unbracketed verdict is invisible to telemetry, to the ZERO-BLUEPRINT-ON-NO-GO invariant,
and to the sycophancy metric (SRSR).

```
VERDICT: [GO|RESHAPE|NO-GO] — When: <NOW|GATED|NEXT-CYCLE>   ← When: on [GO] only
Audited : <the single thing being judged, one sentence>
Survived: everything | the need, not the mechanism | nothing
Because : <number / benchmark / command / file — never an adjective>
Next    : <one concrete action, owner, and date>
```

`[GO]` **must** carry a `When:` axis. A `[GO]` without `When:` is an illegal verdict and
`tools/eval/lib/ast.js` flags it (`goMissingWhenAxis`). Emit exactly one verdict.

**`[GO]` gate — all four required, no partial credit:**

- Demand evidence is behavioral (payment, expansion, panic-on-removal), not interest.
- Status-quo cost is quantified (hours or dollars per week).
- The narrowest wedge is shippable in days, not months.
- No unresolved cross-round contradiction from step 05's premise challenge.

Interest-not-behavior or unquantified cost makes `[GO]` unavailable — issue `[RESHAPE]`.

## Order of operations (binding)

**Decide the verdict class BEFORE generating alternatives.** The alternatives block is legal only
for `[GO]` and `[RESHAPE]`. Generating options and *then* declaring `[NO-GO]` is a
ZERO-BLUEPRINT-ON-NO-GO breach.

| Verdict | Alternatives block | Required body |
| :-- | :-- | :-- |
| `[GO]` | Allowed | Chosen approach + next action |
| `[RESHAPE]` | Allowed | Reframed direction + what was discarded + next action |
| `[NO-GO]` | **FORBIDDEN** | No-Go Autopsy only |

## Alternatives — `[GO]` and `[RESHAPE]` only

Skip this entire section on `[NO-GO]`. Generate 2-3 distinct approaches:

```
APPROACH A: [name] — minimal viable
  Summary:    [1-2 sentences]
  Effort:     S / M / L / XL
  Ships in:   [days / weeks / months]
  Risk:       Low / Med / High
  Why it wins:  [one reason]
  Why it fails: [one reason]

APPROACH B: [name] — ideal long-term
  ...

APPROACH C: [name] — creative/lateral (optional)
  ...
```

Rules:

- At least 2 approaches. 3 preferred for non-trivial ideas.
- One must be the smallest thing someone would use this week.
- One must be the ideal long-term direction.

## `[NO-GO]` — No-Go Autopsy (the only legal body)

A `[NO-GO]` emits the autopsy and stops. No option menus, no architecture, no compromise
workarounds, no "here's how we'd do a smaller version." The only permitted outputs are the
autopsy plus an optional list of surviving follow-ups (open questions and blockers, no gate tokens).

```
NO-GO AUTOPSY
  Survived:         nothing
  Wrong one:        <wrong problem | wrong solution | wrong timing | wrong customer |
                     wrong business model | execution risk | the need does not exist>
  Failure scenario: <12 months out — what concretely killed it>
  Empirical proof:  <the named observation that forces this verdict, with its source>
  Accepted risk:    n/a — nothing was accepted; the premise failed
```

- **Empirical proof is mandatory.** A `[NO-GO]` resting on intuition is not a verdict. Cite the
  specific answer, number, or observed behavior that forced it (`[^N]` per DNA 5). If no such
  evidence exists, the honest verdict is `[RESHAPE]` (need more evidence), not `[NO-GO]`.
- **Surviving follow-ups** (optional): open questions and blockers worth answering later. They
  carry no verdict token and imply no implementation path.

## Verdict

Based on the diagnostic, the premises, and — for `[GO]`/`[RESHAPE]` — the alternatives, give ONE
verdict. Plain sentence first, then the card at the depth the stakes require.

**`[GO]`** — **"Build this."** All four `[GO]`-gate criteria met. `When: NOW` if the wedge ships
immediately. If `When: GATED`, the sentence is **"Build this once \<checkable condition\> — not
before."** — never "Build this." followed by a caveat.

**`[RESHAPE]`** — **"Keep the why, replace the how."** `Survived: the need, not the mechanism`.
The problem is real; this approach is wrong. Name the zero-cost primitive the user can do *today*
without building anything, then re-run this skill with the revised framing.

**`[NO-GO]`** — **"Don't build this."** `Survived: nothing`. Doesn't survive scrutiny: no demand,
no urgency, premises don't hold. Emit the No-Go Autopsy. Don't soften it.

**Next action** — every verdict carries one concrete real-world step, not "go research this":

- `[GO]` → a step that de-risks the wedge (e.g. "Interview 5 ops managers at mid-size logistics
  firms about their current scheduling workflow before any market sizing") → then `/explore-idea`.
- `[RESHAPE]` → the zero-cost default the user runs now, plus the re-run.
- `[NO-GO]` → **route back to problem discovery.** The next action MUST be `/unpack-problem`
  (or a stated revisit trigger, e.g. "revisit if regulation X lands"). Never a build step.

## Output

**Two surfaces — write them separately.**

**Chat (what the user reads):** the plain sentence, the consequence, and the concrete next action.
**No token, no card, no marker.** Then point at the brief. If the verdict is `[GO]`/`[NO-GO]`,
"Build this." / "Don't build this." is the whole message.

**Document (`artifacts/output/01-discovery/validation-brief.md`):** the same plain sentence, followed by the
full machine card at the depth the stakes require — `VERDICT:`, `Audited:`, `Survived:`, `Because:`,
`Next`. This is where the gates read from; `tools/eval/lib/ast.js` never sees your chat reply.

For `[GO]`/`[RESHAPE]`, also record the alternatives assessment in the brief. For `[NO-GO]`, the
No-Go Autopsy and nothing else — and it goes in the document too, not as a wall of text in chat.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-create --step 6`

**Verdict ownership:** the `[GO]`/`[RESHAPE]`/`[NO-GO]` call is issued by `@founder` (Elena) — no other agent may close this step.