# Point-Coverage Contract — No Silent Drops Against a Confirmed Enumeration (shared)

Single source of truth for discussion-point coverage. Skills cite this file with their skill-specific machinery; they do not restate the primitive.

**The promise, stated honestly:** "100% covered" is unfalsifiable without an enumerated point set and closed terminal states. This contract defines coverage as **zero silent drops against a user-confirmed enumeration** — not omniscience. Points that were never enumerated are out of contract by definition; points that were enumerated may end `DEFERRED`/`REJECTED`/`OUT-OF-SCOPE`, but they may not end unspoken.

## The primitive

1. **Enumerate** — before the work starts, list the points: distinct user asks/tensions (`agenda`) and angles of the subject the session must sweep (`facet`). Group to at most 7 clusters when the raw list explodes. A genuinely single-point session declares one point — do not manufacture points for ceremony.
2. **Confirm** — present the list to the user in one compact block and take confirmation or edits. The confirmed list is the coverage contract. Later additions append new ids; existing ids are never renumbered or silently rewritten.
3. **Bound the focus, not the depth** — depth on one point is legitimate; silent abandonment of the others is not. When conversation holds one point for **2 consecutive exchange rounds**, the next round MUST open with a breadth checkpoint: disposition any quick items, state what remains pending, then continue.
4. **Close every point** — before synthesis/handoff, each point ends in exactly one terminal state from the closed vocabulary below. No third state exists: a point with no disposition is a blind spot that survives the session.

## Closed disposition vocabulary

| State | Meaning | Required payload |
|---|---|---|
| `COVERED` | Probed and settled in-session | The finding/outcome, one line (surface may name its local label, e.g. "resolved" on decision surfaces, "examined in move N" on interview surfaces — same state) |
| `DEFERRED` | Consciously postponed | `owner` + `reason` (+ revisit trigger when known) |
| `REJECTED` | Considered and declined | Reason |
| `OUT-OF-SCOPE` | Outside the confirmed boundary | The quoted boundary text it falls outside of |

## Closure semantics per surface

Not every surface gates the same way. Match the closure to the stakes:

| Surface class | Example | Closure semantics |
|---|---|---|
| Decision surface (debate → decision, high token cost) | `/round-table` | **Blocking gate** — synthesis cannot fire until every point is dispositioned; machine-validated (`.agents/scripts/roundtable_eval.js points`, exit 1 blocks) |
| Refinement surface (user-driven, exits anytime) | `/elicitation` | **Disclosure** — the user may always proceed; the close itemizes covered/unexamined points. Never block a refinement session |
| Interview surface (1-1, humane pace) | `/grill-me` | **Lock-time closure** — no mid-interview enforcement; the handoff summary dispositions every point |

Machine gates exist only where the ledger is parseable (round-table transcripts). Prose surfaces carry the same vocabulary without a fake gate.

## Anti-performative guard

`COVERED` requires a finding, not a vibe: "covered — discussed" fails the reason requirement at review time. The round-table validator warns on findings shorter than `MIN_POINT_FINDING_CHARS` (advisory — edge counts are necessary, not sufficient; calibrate against real transcripts before ever gating on thinness, per the `thinChallenges` precedent).
