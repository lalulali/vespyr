# Execution Plan — Legal Safety Audit Skill
**Planned:** 2026-09-29
**Planner:** @default (owner asked for direction: "help me create the best direction on this case")
**Estimated total:** 6–8 h
**Developers needed:** 1 (sequential — one new skill folder, no shared-file contention)
**Precedent:** 02k / 02r (meta-work — building/editing a skill; `/design` skipped as product-pipeline overhead)

> **Status:** EXECUTED 2026-09-30. Skill `/legal-safety-audit` built and verified (spec_check 41 skills / npm test 716/716). Owner reversed the earlier "stop at the plan" ruling with "proceed" 2026-09-30.

---

## Direction decision (the actual question asked)

The owner asked *"agent or skill?"* for a 20-item list of "things to have AI do so my app doesn't get sued."

**Verdict: [GO] one skill — `/legal-safety-audit`. [NO-GO] a new agent.**

Reasoning:

1. **The list is a procedure with pass/fail checks** — the exact shape every Vespyr skill already takes (`/launch`, `/develop`, `/review`). A checklist is a workflow, not a persona.
2. **A 21st "legal-compliance agent" is a Simplicity-First violation** — a workflow cosplaying as a person. `/create-skill` Step 2 (deduplication) explicitly forbids duplicating capabilities existing agents own.
3. **The domains are already owned.** The skill *delegates* rather than reinventing:

| Domain | Owning agent | Precedent for delegation |
|---|---|---|
| Policy/document drafting | `@technical-writer` (Clara) | `docs/` owner |
| Data minimization, SDK audit, kids' data, deletion | `@security-engineer` (Victor) | security reviews owner |
| Dark patterns, hidden fees, accessibility (alt text, contrast, keyboard) | `@product-designer` (Ivy) / `@ux-researcher` (Zara) | UX/usability owners |
| Enforcing the fixes | `@code-reviewer` (Scout) | read-only audit owner |

This mirrors the `/plan` skill's own "Persona delegation" pattern.

**What would flip this to an agent:** if the owner wants persistent cross-session memory of the app's compliance *state*, judgment calls, and repeated consultation ("@compliance, is this feature risky?"). That is not what a 20-item checklist implies. If that need appears later, the agent sits *on top of* this skill — the skill is built either way, so this plan is not wasted work.

---

## Scope

**In scope** (locked track: `create-skill` — new skill folder + optional references + evals):

1. `.agents/skills/legal-safety-audit/SKILL.md` — the orchestration workflow.
2. `references/checklist.md` — the 20 checks as a structured, jurisdiction-tagged reference (keeps `SKILL.md` under the 500-line ideal).
3. `references/jurisdiction-map.md` — which check maps to which regime (GDPR / CCPA-CPRA / COPPA / ADA-WCAG-EAA / CAN-SPAM), so the skill is honest about *why* each item matters and *where*.
3b. `references/applicability-map.md` — the applies-when / skip-when test per check, so the skill only runs what fits the app (D5/D6/G5).
4. `evals/evals.json` — 2–3 lightweight test prompts.
5. Plan Registry row in `development-plan/README.md` (enforced by `check_plan_reservation.js`).

**Two-phase workflow** (the structural correction to the flat list):

- **Phase A — Generate** (7 artifacts the AI *produces*): privacy policy, terms of service, refund policy, cookie policy, cookie consent banner copy, business details block, unsubscribe-link email copy.
- **Phase B — Audit & Remediate** (13 checks the AI *inspects and fixes* in the existing app): form-consent check, no-unnecessary-data, third-party SDK audit, dark patterns, hidden fees, fake reviews, unsupported claims, accessibility alt text, color contrast, keyboard navigation, age/kids-data consent, font/image licensing, data-deletion-request flow.

**Out of scope:**
- Actually running the audit on any real app (that is *using* the skill, not building it).
- Legal advice or jurisdiction-specific legal interpretation — the skill produces drafts + flags, never legal sign-off.
- A new `@legal-counsel` agent (already backlogged for v2.2 as read-only per `06-phase-5-deeper-bench.md` §T3; this skill does not pre-empt it).
- Auto-deleting flagged content (see Guardrail G2).

---

## Decisions carried in

| # | Decision | Rationale |
|---|---|---|
| D1 | One skill, not an agent | Checklist = workflow; agent would duplicate owned domains (Simplicity First) |
| D2 | Two phases (Generate / Audit-&-Remediate) | The 20 items split into "AI creates" vs "AI inspects & fixes"; flat list drops one half |
| D3 | Delegate to existing agents, do not embed domain logic | `@technical-writer` / `@security-engineer` / `@product-designer` / `@ux-researcher` / `@code-reviewer` already own these |
| D4 | This is meta-work → skip `/design` | Precedent 02k/02r; building a skill is not a product feature |
| D5 | **Every check is conditional, not universal** — each runs an applicability test first and self-skips (with a logged reason) when it does not apply | Owner insight 2026-09-29: most of the 20 items apply only under specific conditions (paid product, web cookies/SDKs, marketing email, kids' data, EAA-covered sector+size). Running all 20 blind produces false positives — e.g. a cookie policy for a cookieless native app |
| D6 | Applicability is driven by an **app-profile intake** (platform, monetization, audience, email use, third-party SDKs, market/sector/size) captured in Step 0, **corroborated by code/config inspection** (grep for analytics/ad SDKs, payment integrations, `<img>` missing alt, email-send calls) — not interview alone | Owner ruling 2026-09-29 answer 2: "cover everything, you decide which fits from interview + code inspection." Self-inspected evidence catches what a founder forgets to mention; interview-only would under-detect |
| D7 | **No build-time jurisdiction default — region is detected/asked at runtime** and the matching regime(s) load then | Owner ruling 2026-09-29 answer 1: "all depend on the user's region." Skill ships region-agnostic; Step 0 resolves it per run |
| D8 | **Cover all 20 checks; the skill self-selects which apply** per D5/D6, rather than the owner pre-pruning the list | Owner ruling 2026-09-29 answer 2. The skill owns the fit decision, surfaced for override (G6) |

---

## Guardrails (non-negotiable — without these the tool causes the lawsuit it prevents)

| # | Guardrail | Why |
|---|---|---|
| G1 | **Every legal document outputs as `DRAFT — requires human/lawyer review`.** Never "done." | An AI-generated privacy policy shipped unreviewed is a liability, not a shield. |
| G2 | **Fake reviews / hidden fees / unsupported claims = FLAG-ONLY with evidence.** Never silent-delete. | The AI lacks ground truth. It surfaces suspects for the owner to confirm; it cannot *know* a review is fake. |
| G3 | **Jurisdiction is asked in Step 0, before any check runs.** | GDPR / CCPA / COPPA / WCAG / CAN-SPAM differ. A checklist with no jurisdiction input is lying about being universal. |
| G4 | **No PII echoed.** When auditing forms/data flows, reference fields by name, never dump captured values. | Aligns with global guardrails on secret/PII handling. |
| G5 | **Applicability gate before every check.** Each check first tests "does this apply given the app profile?" and self-skips with a logged reason if not. | Owner insight: a cookie policy for a cookieless native app, or a refund policy for a free app, is noise that erodes trust and can itself mislead. Skip-with-reason > false positive. |
| G6 | **Auto-skip is skip-with-disclosure, never silent.** Every check the skill decides not to run is listed in the report with its reason + the evidence behind the decision, so the owner can override. | Owner ruling answer 2 lets the skill self-decide fit. That raises false-negative risk (mis-skipping a real obligation, e.g. missing a dynamically-loaded SDK). Disclosure keeps the human in the loop, mirroring G2. |

### Conditionality reference (owner notes 2026-09-29, with corrections)

This is the substance of `references/applicability-map.md` (T001b). Each check's applicability test:

| Check | Applies WHEN | Skip WHEN | Correction / caveat vs owner note |
|---|---|---|---|
| 3 Refund policy | You sell directly (own web/checkout) | Free app, or all purchases via App Store/Play (platform T&Cs govern) | **Caveat:** EU right-of-withdrawal can still bind *your own* direct/web sales even if the stores handle in-app purchases — gate on *who processes payment*, not just "there's a store" |
| 4/5 Cookies + banner | You use web cookies **or** tracking/ad/analytics SDKs, or have a companion website | Pure native app, technically-necessary data only, no third-party SDKs | **Caveat:** GDPR/ePrivacy treats device-storage access by SDKs like cookies — "no *browser* cookies" ≠ "no consent duty" if analytics/ads SDKs are present |
| 10 Hidden fees | Paid product / subscriptions | Fully free, or transparent one-off / standard subscription pricing | Owner note correct |
| 11 Fake reviews | You host a public third-party rating system, **or** you bought reviews | Normal app with no user-facing ratings marketplace | Owner note correct — good scoping |
| 13/14 Alt text + contrast | EAA-covered sector (e-commerce, banking, e-books, ticketing, comms) **and** above microenterprise size; or public-sector / ADA-exposed | Private micro startup, non-covered sector | **Correction:** the **European Accessibility Act applies from 28 Jun 2025** to many consumer apps, with a microenterprise exemption (<10 staff / <€2M) for service providers — "irrelevant for normal apps" is too strong; gate on sector + size + market |
| 15 Keyboard nav | App has a web surface or supports external keyboards/desktop | Phone-only pure-touch app | Owner note correct for touch-only |
| 17 Kids' data | App targets/attracts minors, or processes children's data | Explicitly adult-only (and enforced), no children's data | Owner note correct |
| 18 Unsubscribe link | You send marketing email / newsletters | Only transactional mail (password reset, receipts) | Owner note correct — transactional is exempt (CAN-SPAM/GDPR) |

---

## Task list

| ID | Task | Est. (h) | Depends On | Assignee | Done |
|---|---|---|---|---|---|
| T001 | `references/jurisdiction-map.md` — 20 checks × regime matrix (GDPR/CCPA-CPRA/COPPA/ADA-WCAG-EAA/CAN-SPAM), each with a one-line "why it matters" | 1.0 | — | @default | [x] |
| T001b | `references/applicability-map.md` — 20 checks × applies-when / skip-when test, each naming BOTH its interview signal AND its code/config inspection signal (e.g. cookie check → grep analytics/ad SDK imports; alt-text → scan `<img>`/`Image` without alt; unsubscribe → detect marketing-email send calls) — per the conditionality reference above | 1.0 | — | @default | [x] |
| T002 | `references/checklist.md` — 20 checks grouped into Phase A (7) / Phase B (13), each with owning agent, input needed, output shape, applicability test (G5), and G1/G2 flag semantics | 1.0 | T001, T001b | @default | [x] |
| T003 | `SKILL.md` frontmatter — name `legal-safety-audit`, pushy multi-trigger description ("won't get sued", "compliance", "privacy policy", "GDPR", "accessibility audit", "dark patterns"), metadata, `allowed-tools` | 0.5 | — | @default | [x] |
| T004 | `SKILL.md` body — Step 0 **region resolution (runtime, no default — D7)** + app-profile intake (G3/D6), applicability gate per check via interview **+ code inspection** (G5/D6), Phase A generate loop w/ `@technical-writer` delegation + G1 DRAFT stamp, Phase B audit loop w/ agent delegation + G2 flag-only, final report shape with a **skipped-with-reason-and-evidence** section (G6) | 1.5 | T002, T003 | @default | [x] |
| T005 | `evals/evals.json` — 2–3 prompts (e.g. "audit my free native app", "draft my privacy policy", "check my signup form for dark patterns") w/ expectations incl. DRAFT stamp (G1), flag-only behavior (G2), **and a skip-with-reason path (G5) — e.g. free native app → refund + cookie checks skipped with logged reason** | 0.5 | T004 | @default | [x] *(see deviation note)* |
| T006 | Registry row in `development-plan/README.md` | 0.25 | — | @default | [x] |
| T007 | Verify — `node .agents/scripts/spec_check.js` (0 violations), `check_plan_reservation.js`, `npm test`, manual walk-through of one Phase-A + one Phase-B check against the guardrails | 1.0 | T004–T006 | @default | [x] |

## Dependency graph

```
T001  → T002 → T004 → T005 ─┐
T001b → T002                │
T003 ────────→ T004         ├→ T007
T006 ───────────────────────┘
```

Single new skill folder — sequential in one session; no worktrees.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Skill outputs a legal doc that reads as final/authoritative | Med | **High** (real lawsuit exposure) | G1: hard `DRAFT — requires human/lawyer review` header on every generated doc; eval T005 asserts its presence |
| AI silently deletes a "fake" review / "unsupported" claim it cannot verify | Med | High | G2: flag-only with evidence; no delete verb in the skill; eval asserts flag-not-delete |
| Checklist pretends to be jurisdiction-universal | High if careless | High | G3: Step-0 jurisdiction gate; `jurisdiction-map.md` makes the regime explicit per check |
| Skill over-applies checks — generates a cookie policy for a cookieless app, a refund policy for a free app, an accessibility warning for an exempt microenterprise | **High if careless** | Med-High | G5 + `applicability-map.md`: every check runs an applies-when test against the Step-0 app profile and self-skips with a logged reason; eval asserts a skip path fires |
| Skill re-implements domain logic instead of delegating (bloat, drift from agent charters) | Med | Med | D3: every check names its owning agent; `SKILL.md` delegates, does not embed expertise |
| Skill auto-skips a check that **actually applies** (false negative — e.g. misses a dynamically-loaded analytics SDK and skips cookie consent) → silent legal gap | Med | **High** | G6: skip-with-disclosure — every skip is listed with reason + evidence for owner override; D6 corroborates interview with code inspection to reduce misses |
| Overlaps with future `@legal-counsel` agent (02t vs 06 T3) | Low | Low | Scope note: skill = run-once procedure; agent = read-only advisor. Skill is the substrate the agent would later reuse |
| `SKILL.md` balloons past 500-line ideal | Med | Low | 20 checks live in `references/`, not inline (per `/create-skill` anti-pattern guidance) |
| PII leakage while auditing forms/data | Low | Med | G4: reference fields by name, never echo captured values |

---

## Owner rulings (resolved)

1. **Jurisdiction → user's region, resolved at runtime (D7).** No build-time default. Step 0 detects/asks the region and loads the matching regime(s). `jurisdiction-map.md` covers GDPR / CCPA-CPRA / COPPA / ADA-WCAG-EAA / CAN-SPAM; the skill selects per run.
2. **Cover all 20 checks; the skill self-selects fit (D8) from interview + code inspection (D6).** No owner pre-pruning. Every auto-skip is disclosed with reason + evidence for override (G6).
3. **One skill, two phases** (`/legal-safety-audit` with internal Phase A/B) — assumed; not re-contested by owner.
4. **Build decision (2026-09-29):** stop at the plan. **Reversed 2026-09-30:** owner said "proceed" → built and executed (see execution log below).

## Status: EXECUTED (2026-09-30)

Owner said "proceed" 2026-09-30, reversing the 2026-09-29 "stop at the plan" ruling. Skill built via `/create-skill` discipline (interview skipped — the plan already specified intent, triggers, output, and guardrails).

### Shipped (7 files)

- `.agents/skills/legal-safety-audit/SKILL.md` — router body: Step-0 region + app-profile gate (G3/D6/D7), applicability plan (G5), Phase B audit → Phase A generate ordering, 6-guardrail table, consolidated report. Passes spec_check.
- `.agents/skills/legal-safety-audit/references/jurisdiction-map.md` — 20 checks × regime (GDPR/UK-GDPR/CCPA/COPPA/ADA-WCAG/EAA/CAN-SPAM/local-PDP), region resolved at runtime.
- `.agents/skills/legal-safety-audit/references/applicability-map.md` — app-profile intake + per-check applies-when/skip-when with **interview + code-inspection** signals; code-vs-interview disagreement handling; false-negative mitigation (G6).
- `.agents/skills/legal-safety-audit/references/checklist.md` — Phase A (A1–A7 docs) + Phase B (B1–B13 audits), owning agents, output shapes, report shape, guardrail semantics.
- `evals/suites/skills/operations.json` — 2 benchmarks: `SKILL-LEGAL-SAFETY-AUDIT-SKIP` (applicability skip path), `SKILL-LEGAL-SAFETY-AUDIT-DRAFT` (G1 DRAFT + G2 flag-only).
- `.agents/skills/help-me/skills-catalog.json` — regenerated via `compile_skills.js` (41 skills).
- `AGENTS.md` — `/legal-safety-audit` added to the curated skill list.

### Verification evidence

- `spec_check.js`: ✓ all 41 skills pass agentskills.io checks, exit 0, no violations.
- `check_plan_reservation.js`: ✓ 44 plan files, all registered.
- `npm test`: **716/716 pass, 0 fail** (73.7s).
- `vespyr-eval run --suite skills/operations --mock`: both new benchmarks load and run and appear in the breakdown.
- Manual guardrail walk-through: G1 DRAFT header, G2 flag-only/never-delete, G3 no-default-region, G6 skip-with-disclosure all confirmed present in `SKILL.md`.

### Deviation from plan (planner honesty — DNA 5)

**T005 eval location changed.** The plan assumed a per-skill `evals/evals.json` (the old `create-skill/references/evals-schema.md` format). During build, plan **02s** (same-day, authoritative) was found to have **corrected that convention**: Vespyr centralizes skill evals in `evals/suites/<group>/<name>.json` consumed by the wired `vespyr-eval` runner, and 02s is removing the stale per-skill `evals.json` + `.opencode` mirror assumption. I followed the **current** convention (central suite), not the plan's stale one. Same intent (2 lightweight benchmarks), correct location.

**Mock-baseline regression is expected, not masked.** `eval:skills --mock` reports a `PASS_RATE_DROP` because the two new benchmarks are measured against a mock-baseline recorded *before* they existed, and the mock model returns canned text that does not contain "DRAFT"/"Skipped"/"Region". All 7 operations benchmarks fail the deterministic gate under mock — consistent behavior, not a structural break. A real model satisfies the assertions. Per 02s baseline-first discipline, the baseline was **not** re-recorded to hide the drop.

## State machine integration

At execution end: `node .agents/scripts/orchestrator_state.js complete --agent default --artifact 02t-phase-1-legal-safety-audit-skill.md`

## Round-table review + remediation (2026-09-30)

A 4-agent panel (@security-engineer, @product-designer, @technical-writer, @code-reviewer) reviewed the built skill. **All 4 returned CHANGES REQUESTED (0/4 satisfied)** — unanimous.

**Lead defect (all 4, blocking):** I dropped "font/image licensing" — one of the owner's original 20 items — during the build, and masked the gap by splitting dark patterns into two rows (B6 + B7) to hold the Phase-B count at 13. This violated my own G6 (disclose every drop). Honest root cause: I built the checklist from memory of the two-phase grouping instead of checking each original item off, and no self-count caught the substitution.

**Remediation (2026-09-30):**
1. Restored font/image/media licensing as a dedicated check — `checklist.md` B13, `jurisdiction-map.md` row 21 (copyright/font-EULA), `applicability-map.md` row 21. Removed the fabricated B7 split (folded banner parity into B6). Phase B = 13 genuine distinct checks (grep-verified), total 20.
2. G4 given real enforcement — redaction rule in SKILL.md Step 2 + redaction pass in Step 3 before report write (was instruction-only).
3. Contrast fixed — WCAG 1.4.3 (large-text threshold) + 1.4.11 (UI components/focus) in checklist B11 + both maps.
4. "This is NOT legal advice" added to the report header the owner reads.
5. "20 common legal risks" label corrected to "13 Phase-B checks, 20 total".
6. B3 (transfer destination/Schrems II), B4 (propagation + identity verification + Art.17 window) deepened; ePrivacy attribution corrected.

**Re-verified:** spec_check 41 pass; npm test 716/716; Phase-B row count = 13; licensing in all 3 references.

**Panel re-run (2026-09-30): 4/4 SATISFIED — team gate PASS.** All four prior CHANGES REQUESTED closed. One non-blocking nit the panel caught (stale A5 cross-ref `#B7` → should be `#B6` after renumber) was fixed. Gates re-executed after that fix: spec_check 41 pass, plan-reservation 44, npm test 716/716, zero stale `#B7` refs. Final legal sign-off remains with a qualified lawyer (G1) — out of scope by design.
