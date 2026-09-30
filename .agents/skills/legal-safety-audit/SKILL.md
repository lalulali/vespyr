---
name: legal-safety-audit
description: Legal and compliance safety audit for an app so it does not get sued. Generates privacy policy, terms of service, refund, cookie policy plus consent banner and email footer drafts, and audits the app for consent, data minimization, third-party SDKs, dark patterns, hidden fees, fake reviews, unsupported claims, accessibility (alt text, contrast, keyboard), kids-data consent, and data-deletion. Use whenever the user says compliance audit, legal review, "won't get sued", GDPR, CCPA, COPPA, privacy policy, terms of service, cookie consent, dark patterns, accessibility audit, or data deletion request.
metadata:
  version: "1.0"
  last_updated: "2026-09-30"
allowed-tools: Read Grep Glob
---

# Legal Safety Audit — compliance drafts + app audit

## What this skill does

Runs a two-phase legal-risk sweep for an app. **Phase A generates** the 7 legal documents an app needs (privacy policy, terms, refund, cookie policy, consent banner, business details, email footer). **Phase B audits** the existing app across 13 checks and proposes fixes (20 checks total across both phases). It resolves the user's region first, tests each check for applicability before running it, and produces one consolidated report.

It orchestrates existing agents rather than re-implementing their expertise: `@technical-writer` drafts documents, `@security-engineer` audits data/SDKs/deletion/kids-data, `@product-designer` and `@ux-researcher` audit dark patterns and accessibility, `@code-reviewer` enforces fixes.

## When to use

- "Audit my app so I don't get sued"
- "Draft my privacy policy / terms of service / cookie policy"
- "Check my app for GDPR / CCPA / COPPA compliance"
- "Find dark patterns / hidden fees / accessibility problems"
- "Do I need a cookie consent banner / data deletion flow?"

## When NOT to use

- For actual legal sign-off — this produces drafts and flags, never legal advice. Route final review to a lawyer.
- For building a persistent compliance advisor persona (that would be an agent, backlogged as `@legal-counsel`; see plan 02t).
- For general security review unrelated to legal risk (use `@security-engineer` directly).

## Prerequisites

- Access to the app's codebase (for Phase B code inspection).
- The user available to answer the Step-0 app-profile intake.

## References

- `references/jurisdiction-map.md` — which legal regime drives each check, by region.
- `references/applicability-map.md` — the applies-when / skip-when test per check, with interview + code signals.
- `references/checklist.md` — the 20 checks in Phase A/B, owning agents, output shapes, guardrail semantics.

---

## Guardrails (non-negotiable)

| # | Guardrail |
|---|---|
| G1 | Every generated legal document carries a `DRAFT — requires human/lawyer review` header. Never mark a legal doc "done". |
| G2 | Fake reviews, hidden fees, and unsupported claims are FLAGGED with evidence, never deleted or asserted as fact. The owner confirms. |
| G3 | Resolve the user's region(s) in Step 0 before any check runs. No hardcoded jurisdiction default. |
| G4 | Never echo captured PII. Reference form fields by name, not by value. |
| G5 | Test each check for applicability before running it. Skip checks that do not apply. |
| G6 | Every skipped check is disclosed in the report with its reason and the evidence behind the decision. Never skip silently. |

---

## Workflow

### Step 0 — Region + app-profile gate (non-skippable)

1. Resolve **region(s)** — ask the user where their users are. Load the matching regime(s) from `references/jurisdiction-map.md`. Multi-region loads the union. Do not assume a default (G3).
2. Capture the **app profile** via the intake in `references/applicability-map.md` (platform, monetization, audience, email, SDKs, reviews, sector, size).
3. Corroborate the profile with **code inspection** — grep dependency manifests for analytics/ad SDKs, look for payment integrations, forms, age gates, deletion endpoints. Where code and interview disagree, trust code and flag it (D6).

Halt if region is unresolved. Everything downstream depends on it.

### Step 1 — Build the applicability plan

For each of the 20 checks, run its applies-when / skip-when test (`applicability-map.md`) against the Step-0 profile + code signals. Produce two lists:
- **Will run** — checks that apply, with the evidence.
- **Will skip** — checks that do not apply, each with a reason + evidence (held for the G6 report section).

When inspection is inconclusive (e.g. a possibly dynamically-loaded SDK), do NOT skip — mark "possibly applies, unconfirmed" and surface it.

### Step 2 — Phase B first (audit), then Phase A (generate)

Run Phase B before Phase A because the documents depend on audit findings (A1 privacy policy needs the B2 data inventory + B3 SDK inventory).

**Phase B — Audit & Remediate** (checks B1–B13 in `references/checklist.md`):
- Delegate each check to its owning agent's expertise.
- Produce findings with evidence + a proposed fix.
- For B7/B8/B9 (hidden fees / fake reviews / unsupported claims) and B13 (licensing), FLAG ONLY (G2) — never delete, never assert falsity.
- **G4 enforcement — redaction rule (mandatory).** When a finding references a form field, database column, or captured input, record only the **field/column name and its type** (e.g. "field `email` — collected without consent checkbox"). Never copy a captured value, sample row, log line, or user record into the finding. Before Step 3 writes the report, scan every finding and replace any concrete personal-data value with its field name. If a value cannot be safely abstracted, drop it and note "value withheld (G4)".

**Phase A — Generate** (documents A1–A7 in `references/checklist.md`):
- Draft each applicable document with `@technical-writer`, feeding in the Phase-B inventories.
- Stamp every document with the `DRAFT — requires human/lawyer review` header (G1).

### Step 3 — Consolidated report

Before writing, run the **G4 redaction pass**: scan all findings and ensure no captured personal-data value appears — field names only. Then emit one report using the shape in `references/checklist.md`:
- **Ran** — applicable checks with findings + proposed fixes/drafts.
- **Skipped (with reason + evidence)** — the G6 table.
- **Flagged for owner decision** — G2 suspects (not acted on).
- **Legal review required** — every generated DRAFT document.

Open the report with one plain sentence stating overall risk posture and how many checks ran vs skipped vs flagged (DNA 8).

---

## Output Artifacts

- `artifacts/output/legal-safety-audit/audit-report.md` — the consolidated report.
- `artifacts/output/legal-safety-audit/drafts/` — the Phase-A DRAFT documents.

---

## Anti-patterns

- **Running all 20 checks blind.** Generating a cookie policy for a cookieless native app or a refund policy for a free app is noise that misleads. Always run the applicability gate (G5).
- **Marking a legal document "done".** It is always a DRAFT for human/lawyer review (G1).
- **Deleting a "fake" review or "unsupported" claim.** The skill lacks ground truth; it flags with evidence and the owner decides (G2).
- **Silent skips.** Every skipped check is disclosed with reason + evidence (G6).
- **Re-implementing domain expertise inline.** Delegate to the owning agent; keep this skill an orchestrator (D3).
