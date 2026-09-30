# 02s-T012 — Canvas Discovery Skills Audit

**Date:** 2026-09-30
**Auditor:** @default
**Scope (read-only):** do `empathy-map`, `journey-map`, `jtbd`, and `discovery-report` lose anything that a *shared discovery ledger* would recover? Should they be rebuilt into one?
**Verdict:** **[NO-GO] on the shared ledger.** Two smaller, provable defects found instead. Evidence below.

---

## Question 1 — Is there duplicate work to consolidate?

**No. Zero overlap.** Every one of the four owns a distinct artifact; no two write the same file.

| Skill | Artifact it writes | Lines |
|---|---|---|
| `empathy-map` | `artifacts/output/02-research/empathy-map.md` | 72 |
| `journey-map` | `artifacts/output/02-research/journey-map.md` | 80 |
| `jtbd` | `artifacts/output/02-research/jtbd-hmw.md` | 76 |
| `discovery-report` | `artifacts/output/02-research/{usability-report,user-research-report}.md` | 101 |

They are **parallel siblings**, not a chain. A shared ledger would not merge duplicated work; it would add a fifth place to record the same insight.

## Question 2 — Are the shapes already centralized?

**Mostly yes.** `.agents/templates/discovery/` holds 6 templates; 4 are referenced by at least one skill (`jtbd-hmw.md`, `problem-brief.md`, `research-plan.md`, `validation-brief-template.md`), and `idea-brief-template.md` is referenced from the persona layer (`.agents/agents/founder.md:201`). The centralization the ledger was supposed to bring **largely exists already**.

## Question 3 — Is anything actually being dropped?

**Yes. One real drop, and it is a filename typo, not a structural gap.**

`journey-map` writes `journey-map.md`. `design` requires `journey-maps.md` (plural).

```
.agents/skills/journey-map/SKILL.md:13,50  →  artifacts/output/02-research/journey-map.md
.agents/skills/design/SKILL.md:40          →  artifacts/output/02-research/journey-maps.md
.agents/skills/help-me/skills-catalog.json →  propagates both (compile_skills reads design's text)
```

`design` lists it as an optional prerequisite "consumed by screen specs". A producer that writes a name its consumer does not expect is a silent drop: the journey map never reaches screen specs, and nothing errors. `spec_check.js` did not catch it because the phantom-reference rule only inspects `Prev:`/`Next:` chain lines, not prerequisite bullets.

**Severity: P1.** One-line fix — `design/SKILL.md:40`, `journey-maps.md` → `journey-map.md`, then regenerate the catalog.

## Question 4 — Is there a real traceability asymmetry?

**Yes, and it is the strongest argument *against* rebuilding the canvas skills — because the fix belongs in `design`, not in them.**

| | Reverse mode (prototype-first) | Create mode (discovery-first) |
|---|---|---|
| Evidence recorded | PRD §14 Evidence Ledger, `L-NN` anchored rows | PRD §2 Research Foundation, §3.2 Evidence, §4 "Evidenced by" |
| Evidence **mechanically checked** | Yes — `spec_parity.js` reports ghost rows (cited anchor does not resolve) and orphan rows (anchor nothing cites) | **No** — no ghost/orphan check exists |

So discovery-mode evidence is *recorded but never verified*. A requirement citing `empathy-map.md#pains-2` where that anchor does not exist passes silently, while the identical error in reverse mode fails closed. That asymmetry is real.

It is **not** a canvas-skill defect. All four canvas skills emit their artifacts correctly. The gap is that `spec_parity.js` is scoped to the reverse-PRD workflow only (its own header: *"Mechanical parity checker for the reverse-PRD workflow (02n)"*). Closing it means extending `spec_parity.js` and the PRD §14 discipline to create mode — a `design` + script change.

## Question 5 — Second real defect: an orphaned canonical template

`discovery-report` never references its own canonical template, and inlines a divergent copy of it.

`.agents/templates/discovery/discovery-report.md` is referenced by **nothing** — no skill, no agent, no script. Meanwhile `discovery-report/SKILL.md` carries two inline templates and names the canonical file 0 times.

| Section | Canonical template | Skill: UT branch | Skill: no-UT branch |
|---|---|---|---|
| Executive Summary | yes | yes | yes |
| Research Methods Used | yes | **missing** | yes |
| Usability Testing Results | if available | yes | correctly absent |
| SUS Score | if available | yes | correctly absent |
| Key Insights | yes | yes | yes |
| Open Questions | yes | **missing** | yes |
| Recommendations | yes | yes | renamed "Recommendations for Next Phase" |

Three-way divergence. Concretely: a report produced through the UT branch ships with **no methods-used provenance and no open questions** — the two sections a stakeholder most needs to judge a usability claim. Fixing the canonical template changes nothing, because nothing reads it.

**Severity: P2.** Fix is to point the skill at the template and delete the inline copies.

---

## Method note — an over-reporting tool, and its correction

The producer/consumer scanner flagged **10** phantom prerequisites. **9 are false positives of my own detector**, and reporting them as findings would have been noise:

- `motion-{competitive,tech-landscape,usability,accessibility,patterns,research}.md` (6) — produced by `@researcher` / `@ux-researcher` personas *dispatched from* `motion` Phase 2, not by a skill's "Write X" line. My regex only matched `Write <path>` and `Outputs to <path>`.
- `usability-test-kit.md`, `ux-research-report.md` — likewise persona-produced.
- `validation-results.md` — conditionally written ("*If* the validation produces a structured output…"), which the regex cannot match.

Only `journey-maps.md` survived cross-checking against actual producer text. The near-miss detector is what promoted it from "possibly a delegated artifact" to a confirmed typo.

## Recommendation

| Item | Ruling | Why |
|---|---|---|
| Shared discovery ledger across the 4 canvas skills | **NO-GO** | Zero duplicate work; shapes already centralized; create-mode evidence slots already exist. Adds a 5th record, solves nothing. |
| Fix `journey-maps.md` → `journey-map.md` | **DO NOW** (P1) | A confirmed silent drop, one line. |
| Point `discovery-report` at its canonical template | **DO NOW** (P2) | Confirmed 3-way drift causing missing provenance sections. |
| Extend `spec_parity.js` ghost/orphan checking to create mode | **DEFER — needs its own plan** | Real asymmetry, but it is a script + `design` change with its own test surface. Not a 02s-sized edit. |

**Not adopted:** a shared discovery ledger. The evidence does not support it, and the two defects worth fixing are unrelated to it.
